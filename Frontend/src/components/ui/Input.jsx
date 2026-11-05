import { AlertCircle } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '../../utils'

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    id,
    name,
    type = 'text',
    startIcon,
    endIcon,
    className,
    containerClassName,
    disabled,
    required,
    ...props
  },
  ref
) {
  const inputId = id || name || `input_${Math.random().toString(36).slice(2, 7)}`

  return (
    <div className={cn('flex flex-col mb-5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-text-main mb-2 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-brand-orange ms-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {startIcon && (
          <div className="absolute start-4 pointer-events-none text-text-muted flex items-center justify-center">
            {startIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full h-[52px] px-4 rounded-[16px] text-sm text-text-main bg-surface border-[1.5px] transition-colors duration-200 outline-none placeholder:text-text-muted/60 disabled:opacity-50 disabled:bg-surface-subtle',
            error
              ? 'border-rose-500 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20'
              : 'border-surface-border hover:border-brand-orange/50 focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/20',
            startIcon && 'ps-11',
            endIcon && 'pe-11',
            className
          )}
          {...props}
        />

        {endIcon && (
          <div className="absolute end-4 pointer-events-none text-text-muted flex items-center justify-center">
            {endIcon}
          </div>
        )}
      </div>

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

