import { useFormat } from '../../hooks/useFormat'
import { cn } from '../../utils'

export function PriceTag({
  amount,
  size = 'md',
  originalAmount,
  className,
}) {
  const { formatMoney } = useFormat()

  const sizes = {
    sm: 'text-sm font-bold',
    md: 'text-lg font-black',
    lg: 'text-2xl sm:text-3xl font-black',
  }

  return (
    <div className={cn('inline-flex items-baseline gap-2 select-none', className)}>
      <bdi className={cn('font-heading text-brand-orange-text dark:text-brand-orange', sizes[size] || sizes.md)}>
        {formatMoney(amount)}
      </bdi>

      {originalAmount && originalAmount > amount && (
        <bdi className="text-xs text-text-muted line-through font-medium">
          {formatMoney(originalAmount)}
        </bdi>
      )}
    </div>
  )
}
