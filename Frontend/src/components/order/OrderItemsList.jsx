import { useFormat } from '../../hooks/useFormat'
import { ProductImage } from '../ui/ProductImage'

export function OrderItemsList({ items = [] }) {
  const { formatMoney } = useFormat()

  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className="divide-y divide-surface-border">
      {items.map((item, idx) => (
        <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-[14px] overflow-hidden shrink-0 border border-surface-border">
              <ProductImage
                src={item.image}
                alt={typeof item.name === 'object' ? (item.name?.ar || item.name?.en || '') : item.name}
                aspectRatio="1/1"
              />
            </div>

            <div>
              <h4 className="text-sm font-bold text-text-main line-clamp-1">
                {typeof item.name === 'object' ? (item.name?.ar || item.name?.en || '') : item.name}
              </h4>
              <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                <span>الكمية: {item.qty}</span>
                <span>•</span>
                <span>سعر القطعة: {formatMoney(item.unitPrice)}</span>
              </div>
            </div>
          </div>

          <div className="text-end shrink-0">
            <span className="text-sm font-bold font-heading text-brand-orange-text dark:text-brand-orange">
              {formatMoney(item.unitPrice * item.qty)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

