import { Check } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '../../utils'

export const RadioCard = forwardRef(function RadioCard(
  {
    label,
    description,
    badge,
    id,
    name,
    value,
    checked,
    onChange,
    disabled = false,
    className,
    icon,
    children,
    ...props
  },
  ref
) {
  const radioId = id || `rc_${name}_${value}`

  return (
    <label
      htmlFor={radioId}
      className={cn(
        'relative flex flex-col p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-200 select-none bg-surface',
        checked
          ? 'border-brand-orange bg-brand-orange/5 shadow-soft ring-1 ring-brand-orange/20'
          : 'border-surface-border hover:border-brand-orange/40 hover:bg-surface-subtle/50',
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      <input
        ref={ref}
        id={radioId}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
        {...props}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && <div className="text-brand-orange shrink-0">{icon}</div>}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-text-main">{label}</span>
              {badge && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange-text">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
            )}
          </div>
        </div>

        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
            checked ? 'border-brand-orange bg-brand-orange' : 'border-surface-border'
          )}
        >
          {checked && <Check className="w-3 h-3 text-white stroke-[3]" />}
        </div>
      </div>

      {children && <div className="mt-3 pt-3 border-t border-surface-border">{children}</div>}
    </label>
  )
})

