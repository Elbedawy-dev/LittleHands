import { cn } from '../../utils'

/**
 * شارة التصنيف أو العلامة التوضيحية بتصميم الملصقات المبهجة
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  tilt = 'none',
  className,
  icon = null,
}) {
  const variants = {
    default: 'bg-surface-subtle text-text-main border border-surface-border',
    orange: 'bg-[#FF8A3D]/15 text-[#9A4600] dark:text-[#FFB68D] border border-[#FF8A3D]/30',
    sky: 'bg-[#4DB6FF]/15 text-[#0B72B9] dark:text-[#91CCFF] border border-[#4DB6FF]/30',
    pink: 'bg-[#FF7EB6]/15 text-[#B81B60] dark:text-[#FFB1CE] border border-[#FF7EB6]/30',
    mint: 'bg-[#44BE8E]/15 text-[#1D7753] dark:text-[#82F9C4] border border-[#44BE8E]/30',
    yellow: 'bg-[#FFD23F]/20 text-[#8C6C00] dark:text-[#FFE082] border border-[#FFD23F]/40',
    red: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
  }

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-4 py-1.5 gap-2 font-bold',
  }

  const tilts = {
    none: '',
    left: 'sticker-tilt-left',
    right: 'sticker-tilt-right',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full whitespace-nowrap shadow-xs transition-transform duration-200 select-none',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        tilts[tilt] || '',
        className
      )}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

