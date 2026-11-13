import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../context/LanguageContext'
import { useFormat } from '../../hooks/useFormat'
import { pickLocaleText } from '../../utils'
import { LocalizedText } from '../ui/LocalizedText'
import { ProductImage } from '../ui/ProductImage'

export function OrderItemsList({ items = [] }) {
  const { t } = useTranslation(['common', 'cart'])
  const { language } = useLanguage()
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
                alt={pickLocaleText(item.name, language)}
                aspectRatio="1/1"
              />
            </div>

            <div>
              <LocalizedText
                as="h4"
                value={item.name}
                className="text-sm font-bold text-text-main line-clamp-1"
              />
              <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                <span>{t('common:ui.quantity', { defaultValue: 'الكمية' })}: {item.qty}</span>
                <span>•</span>
                <span>{t('cart:unitPrice', { defaultValue: 'سعر القطعة' })}: {formatMoney(item.unitPrice)}</span>
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

