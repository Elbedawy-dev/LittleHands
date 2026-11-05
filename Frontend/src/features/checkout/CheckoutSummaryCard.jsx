import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { CATEGORIES } from '../../config/constants'
import { useLanguage } from '../../context/LanguageContext'
import { pickLocale } from '../../utils'

/**
 * بطاقة ملخص الوسائل التعليمية والشحن لشاشات إتمام الطلب
 * شاشة مخصصة للعميلات: عرض واضح لأسعار الوسائل وتكلفة التوصيل
 */
export function CheckoutSummaryCard({
  items = [],
  subtotal = 0,
  shippingRate = 0,
  grandTotal = 0,
  governorate = '',
  className,
}) {
  const { t } = useTranslation(['checkout', 'common'])
  const { isRtl } = useLanguage()

  const getCategoryName = (categoryId) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId || c.slug === categoryId)
    if (!cat) return null
    return isRtl ? cat.name : cat.nameEn
  }

  return (
    <Card padding="lg" className={className}>
      <div className="flex items-center justify-between pb-3.5 border-b border-surface-border">
        <h3 className="font-heading font-black text-lg text-text-main">
          {t('checkout:orderSummary.title')}
        </h3>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange">
          {t('checkout:orderSummary.itemsCount', { count: items.length })}
        </span>
      </div>

      {/* قائمة الوسائل المصغرة */}
      <div className="divide-y divide-surface-border max-h-[280px] overflow-y-auto py-2 pe-1">
        {items.map((item) => {
          const categoryName = getCategoryName(item.categoryId)
          return (
            <div key={item.productId} className="py-3 first:pt-1 last:pb-1 flex items-center gap-3">
              <div className="w-14 h-14 rounded-[14px] overflow-hidden shrink-0 border border-surface-border">
                <ProductImage
                  src={item.image}
                  alt={pickLocale(item.name, isRtl ? 'ar' : 'en').text}
                  aspectRatio="1/1"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4
                  className="text-xs font-bold text-text-main truncate"
                  data-user-content="true"
                >
                  {pickLocale(item.name, isRtl ? 'ar' : 'en').text}
                </h4>
                {categoryName && (
                  <span className="text-[10px] text-text-muted font-medium block mt-0.5">
                    {categoryName}
                  </span>
                )}
                <div className="flex items-center justify-between mt-1 text-xs">
                  <span className="text-text-muted">× {item.qty}</span>
                  <PriceTag amount={item.price * item.qty} size="sm" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* تفصيل المبالغ المالية */}
      <div className="space-y-2.5 pt-3.5 border-t border-surface-border text-xs sm:text-sm">
        <div className="flex items-center justify-between text-text-muted">
          <span>{t('checkout:orderSummary.subtotal')}</span>
          <PriceTag amount={subtotal} size="sm" />
        </div>

        <div className="flex items-center justify-between text-text-muted">
          <span>
            {t('checkout:orderSummary.shipping')}
            {governorate && <span className="ms-1 font-bold text-text-main">({governorate})</span>}
          </span>
          <PriceTag amount={shippingRate} size="sm" />
        </div>

        <div className="pt-3 border-t border-surface-border flex items-baseline justify-between">
          <span className="font-heading font-black text-sm sm:text-base text-text-main">
            {t('checkout:orderSummary.total')}
          </span>
          <PriceTag amount={grandTotal} size="lg" />
        </div>
      </div>
    </Card>
  )
}
