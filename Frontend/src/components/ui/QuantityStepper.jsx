import { Minus, Plus } from 'lucide-react'
import { cn } from '../../utils'

export function QuantityStepper({
  value = 1,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  disabled = false,
  className,
}) {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1)
    }
  }

  const sizes = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-11 px-3 text-sm',
    lg: 'h-12 px-4 text-base',
  }

  const btnSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-between rounded-full border border-surface-border bg-surface shadow-xs',
        sizes[size] || sizes.md,
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min || disabled}
        className={cn(
          'rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer',
          btnSizes[size] || btnSizes.md
        )}
        aria-label="تقليل الكمية"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <span className="font-bold text-text-main min-w-[2.5rem] text-center select-none font-body">
        {value}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max || disabled}
        className={cn(
          'rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface-subtle transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer',
          btnSizes[size] || btnSizes.md
        )}
        aria-label="زيادة الكمية"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

