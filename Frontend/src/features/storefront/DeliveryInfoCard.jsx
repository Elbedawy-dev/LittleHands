import { Clock, PhoneCall, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../hooks/useFormat'
import { settingsService } from '../../services/settingsService'

/**
 * بطاقة معلومات الشحن والتوصيل والدفع بفودافون كاش
 * ملاحظة هامة: خالية تماماً من أي تفاصيل إدارية خاصة بالمنصة
 */
export function DeliveryInfoCard() {
  const { t } = useTranslation('storefront')
  const { formatMoney } = useFormat()
  const [shippingRates, setShippingRates] = useState({
    cairoGiza: 35,
    alexDelta: 45,
    upperEgypt: 55,
  })

  useEffect(() => {
    settingsService
      .getShippingRates()
      .then((rates) => {
        if (rates) setShippingRates(rates)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="p-5 sm:p-6 rounded-[24px] bg-surface-subtle border border-surface-border space-y-4 text-start">
      <h3 className="font-heading font-bold text-base text-text-main flex items-center gap-2">
        <Truck className="w-5 h-5 text-brand-orange" />
        <span>{t('productDetails.deliveryCard.title')}</span>
      </h3>

      {/* تفاصيل الشحن والتغطية */}
      <div className="space-y-1">
        <p className="text-xs sm:text-sm font-bold text-text-main">
          {t('productDetails.deliveryCard.shippingDesc')}
        </p>
        <p className="text-xs text-text-muted leading-relaxed">
          {t('productDetails.deliveryCard.shippingScope')}
        </p>
      </div>

      {/* أسعار الشحن المحددة حسب المحافظة */}
      <div className="p-3 rounded-[16px] bg-surface border border-surface-border/60 space-y-2">
        <span className="text-[11px] font-bold text-text-muted block">
          {t('productDetails.deliveryCard.ratesTitle')}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="flex items-center justify-between sm:flex-col sm:items-start p-2 rounded-xl bg-surface-subtle">
            <span className="text-text-muted font-medium">
              {t('productDetails.deliveryCard.cairoGiza')}
            </span>
            <span className="font-bold text-brand-orange">
              {formatMoney(shippingRates.cairoGiza || 35)}
            </span>
          </div>

          <div className="flex items-center justify-between sm:flex-col sm:items-start p-2 rounded-xl bg-surface-subtle">
            <span className="text-text-muted font-medium">
              {t('productDetails.deliveryCard.alexDelta')}
            </span>
            <span className="font-bold text-brand-orange">
              {formatMoney(shippingRates.alexDelta || 45)}
            </span>
          </div>

          <div className="flex items-center justify-between sm:flex-col sm:items-start p-2 rounded-xl bg-surface-subtle">
            <span className="text-text-muted font-medium">
              {t('productDetails.deliveryCard.upperEgypt')}
            </span>
            <span className="font-bold text-brand-orange">
              {formatMoney(shippingRates.upperEgypt || 55)}
            </span>
          </div>
        </div>
      </div>

      {/* الدفع عبر فودافون كاش */}
      <div className="flex items-start gap-3 pt-2 border-t border-surface-border/60">
        <div className="w-8 h-8 rounded-full bg-[#e60000]/10 text-[#e60000] flex items-center justify-center shrink-0">
          <PhoneCall className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-text-main">
            {t('productDetails.deliveryCard.paymentTitle')}
          </p>
          <p className="text-xs text-text-muted leading-relaxed mt-0.5">
            {t('productDetails.deliveryCard.paymentDesc')}
          </p>
        </div>
      </div>

      {/* التجهيز اليدوي */}
      <div className="flex items-start gap-3 pt-2 border-t border-surface-border/60">
        <div className="w-8 h-8 rounded-full bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-bold text-text-main">
            {t('productDetails.deliveryCard.prepTitle')}
          </p>
          <p className="text-xs text-text-muted leading-relaxed mt-0.5">
            {t('productDetails.deliveryCard.prepDesc')}
          </p>
        </div>
      </div>
    </div>
  )
}
