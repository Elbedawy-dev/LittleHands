import { AlertCircle } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '../../utils'

export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    id,
    name,
    rows = 4,
    className,
    containerClassName,
    disabled,
    required,
    ...props
  },
  ref
) {
  const inputId = id || name || `textarea_${Math.random().toString(36).slice(2, 7)}`

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

      <textarea
        ref={ref}
        id={inputId}
        name={name}
        rows={rows}
        disabled={disabled}
        required={required}
        className={cn(
          'w-full p-4 rounded-[16px] text-sm text-text-main bg-surface border-[1.5px] transition-colors duration-200 outline-none placeholder:text-text-muted/60 disabled:opacity-50 disabled:bg-surface-subtle resize-y min-h-[100px]',
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/20'
            : 'border-surface-border hover:border-brand-orange/50 focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/20',
          className
        )}
        {...props}
      />

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

