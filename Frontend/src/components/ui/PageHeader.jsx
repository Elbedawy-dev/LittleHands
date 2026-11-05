import { cn } from '../../utils'

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}) {
  return (
    <div className={cn('mb-8 pb-6 border-b border-surface-border', className)}>
      {breadcrumbs && <div className="mb-3">{breadcrumbs}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-text-muted mt-1.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

