import { Check } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '../../utils'

export const Checkbox = forwardRef(function Checkbox(
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
  const checkId = id || name || `chk_${Math.random().toString(36).slice(2, 7)}`

  return (
    <label
      htmlFor={checkId}
      className={cn(
        'inline-flex items-start gap-3 cursor-pointer select-none group',
        disabled && 'cursor-not-allowed opacity-50',
        containerClassName
      )}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          ref={ref}
          id={checkId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            'w-6 h-6 rounded-[8px] border-2 transition-all duration-200 flex items-center justify-center bg-surface',
            'border-surface-border group-hover:border-brand-orange/60',
            'peer-checked:bg-brand-orange peer-checked:border-brand-orange peer-checked:shadow-sm',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange peer-focus-visible:ring-offset-2',
            className
          )}
        >
          <Check className="w-4 h-4 text-white stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-semibold text-text-main group-hover:text-brand-orange-text transition-colors">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-text-muted mt-0.5">{description}</span>
          )}
        </div>
      )}
    </label>
  )
})

