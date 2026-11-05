import { AlertCircle, Check, ChevronDown } from 'lucide-react'
import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../context/LanguageContext'
import { cn } from '../../utils'

/**
 * Select component
 * Provides identical props API as standard HTML Select.
 * - On touch devices (@media (pointer: coarse)): Renders the OS-native select picker.
 * - On desktop: Renders an accessible custom listbox popup panel via portal with 52px/16px radius trigger,
 *   soft shadow, check icon, max-height scrolling, and full keyboard navigation (Arrows, Enter, Esc, Home/End, Type-ahead).
 * - Underlying native select is kept synchronized so React Hook Form and standard forms work transparently.
 */
export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    id,
    name,
    children,
    options: optionsProp,
    placeholder,
    className,
    containerClassName,
    noScroll = false,
    disabled = false,
    required = false,
    value: controlledValue,
    defaultValue,
    onChange,
    onBlur,
    ...props
  },
  forwardedRef
) {
  const { i18n } = useTranslation('common')
  const { isRtl } = useLanguage()
  const generatedId = useId()
  const selectId = id || name || `sel_${generatedId}`

  const isEn = i18n.language === 'en'
  const defaultPlaceholder = isEn ? 'Select from list...' : 'اختر من القائمة...'
  const finalPlaceholder = placeholder !== undefined ? placeholder : defaultPlaceholder

  // Parse options from either `options` prop or `children` (<option>)
  const parsedOptions = useMemo(() => {
    if (optionsProp && Array.isArray(optionsProp)) {
      return optionsProp.map((opt) => ({
        value: String(opt.value ?? ''),
        label: opt.label !== undefined ? String(opt.label) : String(opt.value ?? ''),
        disabled: Boolean(opt.disabled),
      }))
    }

    const items = []
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.props) {
        items.push({
          value: String(child.props.value ?? ''),
          label:
            child.props.children !== undefined
              ? String(child.props.children)
              : String(child.props.value ?? ''),
          disabled: Boolean(child.props.disabled),
        })
      }
    })
    return items
  }, [optionsProp, children])

  // Internal value tracking (works in controlled & uncontrolled modes)
  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState(() => {
    if (isControlled) return String(controlledValue ?? '')
    if (defaultValue !== undefined) return String(defaultValue ?? '')
    return ''
  })

  const currentValue = isControlled ? String(controlledValue ?? '') : internalValue

  // Touch device detection (touch gets native picker, desktop gets custom listbox)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isTouch =
        window.matchMedia('(pointer: coarse)').matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0
      setIsTouchDevice(isTouch)
    }
  }, [])

  // Custom listbox open state & positioning
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [panelStyle, setPanelStyle] = useState({
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999,
  })

  const triggerRef = useRef(null)
  const nativeSelectRef = useRef(null)
  const panelRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const searchQueryRef = useRef('')

  // Sync native select ref with forwarded ref
  const setSelectRefs = useCallback(
    (node) => {
      nativeSelectRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef && typeof forwardedRef === 'object') {
        forwardedRef.current = node
      }
    },
    [forwardedRef]
  )

  // Calculate dropdown panel position on open, scroll, or resize
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropdownHeight = noScroll ? Math.max(120, parsedOptions.length * 44 + 40) : 240
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight

    setPanelStyle({
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      top: openUp ? 'auto' : `${rect.bottom + 6}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + 6}px` : 'auto',
      zIndex: 9999,
    })
  }, [noScroll, parsedOptions.length])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    const handleScrollOrResize = () => updatePosition()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true })

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true })
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, updatePosition])

  // Select an option value
  const handleSelectValue = useCallback(
    (val) => {
      if (!isControlled) {
        setInternalValue(val)
      }

      if (nativeSelectRef.current) {
        nativeSelectRef.current.value = val
        const event = new Event('change', { bubbles: true })
        nativeSelectRef.current.dispatchEvent(event)
      }

      if (onChange) {
        onChange({
          target: { value: val, name: name || selectId, id: selectId },
        })
      }

      setIsOpen(false)
      triggerRef.current?.focus({ preventScroll: true })
    },
    [isControlled, name, onChange, selectId]
  )

  // Current selected option label
  const selectedOption = useMemo(() => {
    return parsedOptions.find((opt) => opt.value === currentValue)
  }, [parsedOptions, currentValue])

  // Keyboard navigation for custom listbox
  const handleKeyDown = (e) => {
    if (disabled) return

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        updatePosition()
        setIsOpen(true)
        const idx = parsedOptions.findIndex((opt) => opt.value === currentValue)
        setFocusedIndex(idx >= 0 ? idx : 0)
      }
      return
    }

    if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => {
        let next = prev + 1
        while (next < parsedOptions.length && parsedOptions[next].disabled) next++
        return next < parsedOptions.length ? next : prev
      })
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => {
        let next = prev - 1
        while (next >= 0 && parsedOptions[next].disabled) next--
        return next >= 0 ? next : prev
      })
      return
    }

    if (e.key === 'Home') {
      e.preventDefault()
      const firstValid = parsedOptions.findIndex((o) => !o.disabled)
      if (firstValid >= 0) setFocusedIndex(firstValid)
      return
    }

    if (e.key === 'End') {
      e.preventDefault()
      for (let i = parsedOptions.length - 1; i >= 0; i--) {
        if (!parsedOptions[i].disabled) {
          setFocusedIndex(i)
          break
        }
      }
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < parsedOptions.length) {
        const target = parsedOptions[focusedIndex]
        if (!target.disabled) {
          handleSelectValue(target.value)
        }
      }
      return
    }

    // Type-ahead search
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      clearTimeout(searchTimeoutRef.current)
      searchQueryRef.current += e.key.toLowerCase()
      searchTimeoutRef.current = setTimeout(() => {
        searchQueryRef.current = ''
      }, 500)

      const matchIdx = parsedOptions.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(searchQueryRef.current)
      )
      if (matchIdx >= 0) {
        setFocusedIndex(matchIdx)
      }
    }
  }

  // Scroll focused option into view inside panel ONLY without scrolling the page
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && panelRef.current && !noScroll) {
      const panel = panelRef.current
      const items = panel.querySelectorAll('[role="option"]')
      const item = items[focusedIndex]
      if (item) {
        const itemTop = item.offsetTop
        const itemBottom = itemTop + item.offsetHeight
        if (itemTop < panel.scrollTop) {
          panel.scrollTop = itemTop
        } else if (itemBottom > panel.scrollTop + panel.clientHeight) {
          panel.scrollTop = itemBottom - panel.clientHeight
        }
      }
    }
  }, [isOpen, focusedIndex, noScroll])

  return (
    <div className={cn('flex flex-col mb-5', containerClassName)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-sm font-semibold text-text-main mb-2 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-brand-orange ms-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {/* On touch devices, native select is visible and interactable */}
        {isTouchDevice ? (
          <select
            ref={setSelectRefs}
            id={selectId}
            name={name}
            disabled={disabled}
            required={required}
            value={currentValue}
            onChange={(e) => {
              if (!isControlled) setInternalValue(e.target.value)
              onChange?.(e)
            }}
            onBlur={onBlur}
            className={cn(
              'w-full h-[52px] ps-4 pe-11 rounded-[16px] text-sm text-text-main bg-surface border-[1.5px] transition-colors duration-200 outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:bg-surface-subtle',
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20'
                : 'border-surface-border hover:border-brand-orange/50 focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/20',
              className
            )}
            {...props}
          >
            {finalPlaceholder && (
              <option value="" disabled>
                {finalPlaceholder}
              </option>
            )}
            {parsedOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            {/* Desktop custom listbox trigger button */}
            <button
              ref={triggerRef}
              type="button"
              id={selectId}
              disabled={disabled}
              onClick={(e) => {
                if (disabled) return
                e.preventDefault()
                if (!isOpen) {
                  updatePosition()
                  const idx = parsedOptions.findIndex((opt) => opt.value === currentValue)
                  setFocusedIndex(idx >= 0 ? idx : 0)
                  setIsOpen(true)
                } else {
                  setIsOpen(false)
                }
              }}
              onKeyDown={handleKeyDown}
              onBlur={onBlur}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              className={cn(
                'w-full h-[52px] ps-4 pe-11 rounded-[16px] text-sm text-text-main bg-surface border-[1.5px] transition-colors duration-200 outline-none flex items-center justify-between text-start cursor-pointer select-none disabled:opacity-50 disabled:bg-surface-subtle',
                error
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20'
                  : isOpen
                  ? 'border-brand-orange ring-3 ring-brand-orange/20'
                  : 'border-surface-border hover:border-brand-orange/50 focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/20',
                className
              )}
              {...props}
            >
              <span
                className={cn(
                  'truncate',
                  !selectedOption || selectedOption.value === ''
                    ? 'text-text-muted/70'
                    : 'text-text-main font-medium'
                )}
              >
                {selectedOption && selectedOption.value !== ''
                  ? selectedOption.label
                  : finalPlaceholder || ''}
              </span>
            </button>

            {/* Hidden native select keeps form submission & React Hook Form intact */}
            <select
              ref={setSelectRefs}
              name={name}
              value={currentValue}
              onChange={(e) => {
                if (!isControlled) setInternalValue(e.target.value)
                onChange?.(e)
              }}
              disabled={disabled}
              required={required}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only pointer-events-none"
            >
              {finalPlaceholder && (
                <option value="" disabled>
                  {finalPlaceholder}
                </option>
              )}
              {parsedOptions.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </select>
          </>
        )}

        {/* End-side Chevron indicator */}
        <div
          className={cn(
            'absolute end-4 pointer-events-none text-text-muted flex items-center justify-center transition-transform duration-200',
            isOpen && !isTouchDevice && 'rotate-180 text-brand-orange'
          )}
        >
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>

      {/* Desktop Custom Dropdown Panel Rendered via Portal to document.body */}
      {!isTouchDevice &&
        isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            role="listbox"
            tabIndex={-1}
            dir={isRtl ? 'rtl' : 'ltr'}
            aria-activedescendant={
              focusedIndex >= 0 ? `${selectId}-opt-${focusedIndex}` : undefined
            }
            className={cn(
              'rounded-[18px] border border-surface-border bg-surface text-text-main shadow-float py-1.5 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-150',
              noScroll ? 'max-h-none overflow-visible' : 'max-h-60 overflow-y-auto overscroll-contain'
            )}
          >
            {finalPlaceholder && (
              <div className="px-4 py-2 text-xs font-semibold text-text-muted/60 border-b border-surface-border/50 select-none">
                {finalPlaceholder}
              </div>
            )}

            {parsedOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-text-muted text-center select-none">
                {isEn ? 'No options available' : 'لا توجد خيارات متاحة'}
              </div>
            ) : (
              parsedOptions.map((opt, idx) => {
                const isSelected = opt.value === currentValue
                const isFocused = idx === focusedIndex

                return (
                  <div
                    key={opt.value}
                    id={`${selectId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => {
                      if (!opt.disabled) handleSelectValue(opt.value)
                    }}
                    onMouseEnter={() => {
                      if (!opt.disabled) setFocusedIndex(idx)
                    }}
                    className={cn(
                      'px-4 py-2.5 text-xs sm:text-sm transition-colors flex items-center justify-between cursor-pointer select-none',
                      opt.disabled && 'opacity-40 cursor-not-allowed bg-transparent',
                      isSelected
                        ? 'bg-brand-orange/15 font-bold text-brand-orange-text dark:text-brand-orange'
                        : isFocused
                        ? 'bg-surface-subtle text-text-main'
                        : 'text-text-main hover:bg-surface-subtle'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-orange shrink-0 ms-2" />
                    )}
                  </div>
                )
              })
            )}
          </div>,
          document.body
        )}

      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 mt-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-muted mt-1.5">{helperText}</p>
      ) : null}
    </div>
  )
})
