import { forwardRef } from 'react'
import { cn } from '../../utils'

export const Card = forwardRef(function Card(
  {
    children,
    hoverLift = false,
    variant = 'default',
    padding = 'md',
    className,
    ...props
  },
  ref
) {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const variants = {
    default: 'bg-surface border border-surface-border shadow-soft',
    raised: 'bg-surface-raised border border-surface-border shadow-soft-lg',
    subtle: 'bg-surface-subtle border border-surface-border/60',
    flat: 'bg-surface border border-surface-border',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-[24px] text-text-main transition-all duration-200 overflow-hidden',
        variants[variant] || variants.default,
        paddings[padding],
        hoverLift && 'hover-lift cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

