import { cn } from '../../utils'

export function SectionTitle({
  title,
  subtitle,
  badge,
  action,
  centered = false,
  className,
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4',
        centered && 'text-center items-center justify-center',
        className
      )}
    >
      <div>
        {badge && (
          <div className="mb-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange inline-flex items-center gap-1.5 sticker-tilt-left shadow-xs">
              {badge}
            </span>
          </div>
        )}

        <h2 className="text-2xl sm:text-3xl font-black font-heading text-text-main tracking-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

