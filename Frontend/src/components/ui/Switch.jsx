import { forwardRef } from 'react'
import { cn } from '../../utils'

export const Switch = forwardRef(function Switch(
  {
    label,
    description,
    id,
    name,
    checked,
    onChange,
    disabled = false,
    className,
    containerClassName,
    ...props
  },
  ref
) {
  const switchId = id || name || `sw_${Math.random().toString(36).slice(2, 7)}`

  return (
    <label
      htmlFor={switchId}
      className={cn(
        'inline-flex items-center justify-between gap-4 cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50',
        containerClassName
      )}
    >
      {(label || description) && (
        <div className="flex flex-col flex-1">
          {label && <span className="text-sm font-semibold text-text-main">{label}</span>}
          {description && <span className="text-xs text-text-muted mt-0.5">{description}</span>}
        </div>
      )}

      <div className="relative inline-flex items-center shrink-0">
        <input
          ref={ref}
          id={switchId}
          name={name}
          type="checkbox"
          role="switch"
          aria-checked={!!checked}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            'w-12 h-6 bg-surface-subtle border border-surface-border rounded-full peer peer-checked:bg-brand-orange peer-checked:border-brand-orange transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange peer-focus-visible:ring-offset-2',
            className
          )}
        />
        <div
          className={cn(
            'absolute start-0.5 top-0.5 w-5 h-5 bg-white dark:bg-zinc-100 rounded-full shadow-sm transition-transform duration-200 peer-checked:translate-x-6 rtl:peer-checked:-translate-x-6 pointer-events-none'
          )}
        />
      </div>
    </label>
  )
})

