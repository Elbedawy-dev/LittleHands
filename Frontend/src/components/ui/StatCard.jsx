import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '../../utils'
import { Card } from './Card'

export function StatCard({
  title,
  value,
  icon,
  change,
  changeType = 'increase',
  subtitle,
  variant = 'default',
  className,
}) {
  return (
    <Card variant={variant} padding="md" className={cn('relative', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-text-muted mb-1.5">{title}</p>
          <h3 className="text-2xl font-black text-text-main font-heading tracking-tight">
            {value}
          </h3>
        </div>

        {icon && (
          <div className="w-12 h-12 rounded-[16px] bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(change !== undefined || subtitle) && (
        <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
          {change !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 font-bold',
                changeType === 'increase'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {changeType === 'increase' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{change}</span>
            </div>
          )}

          {subtitle && <span className="text-text-muted">{subtitle}</span>}
        </div>
      )}
    </Card>
  )
}

