import { forwardRef } from 'react'
import { cn } from '../../utils'
import { Spinner } from './Spinner'

export const Button = forwardRef(function Button(
  {
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    startIcon = null,
    endIcon = null,
    className,
    ...props
  },
  ref
) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer whitespace-nowrap rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none'

  const variants = {
    primary:
      'bg-brand-orange text-white hover:bg-[#e07528] active:bg-[#c9631b] shadow-soft hover:shadow-soft-lg',
    secondary:
      'bg-surface text-brand-orange-text dark:text-brand-orange border-2 border-brand-orange hover:bg-brand-orange/10 dark:hover:bg-brand-orange/20',
    outline:
      'bg-transparent text-text-main border-1.5 border-surface-border hover:bg-surface-subtle',
    ghost:
      'bg-transparent text-text-main hover:bg-surface-subtle active:bg-surface-subtle/80',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm',
    mint:
      'bg-brand-mint text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-soft',
  }

  const sizes = {
    sm: 'h-9 px-4 text-xs gap-1.5',
    md: 'h-12 px-6 text-sm gap-2', // القياس الافتراضي المحدد 48px
    lg: 'h-14 px-8 text-base gap-2.5',
    icon: 'h-11 w-11 p-0',
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <Spinner
          size="sm"
          variant={variant === 'primary' || variant === 'danger' || variant === 'mint' ? 'white' : 'primary'}
        />
      ) : (
        <>
          {startIcon && <span className="inline-flex shrink-0">{startIcon}</span>}
          <span>{children}</span>
          {endIcon && <span className="inline-flex shrink-0 rtl:rotate-180">{endIcon}</span>}
        </>
      )}
    </button>
  )
})

