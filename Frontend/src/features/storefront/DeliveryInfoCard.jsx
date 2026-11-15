import { Clock, PhoneCall, RefreshCw, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../context/LanguageContext'
import { useFormat } from '../../hooks/useFormat'
import { useShippingRates } from '../../hooks/useShippingRates'

/**
 * بطاقة معلومات الشحن والتوصيل والدفع بفودافون كاش
 * ملاحظة هامة: خالية تماماً من أي تفاصيل إدارية خاصة بالمنصة
 */
export function DeliveryInfoCard() {
  const { t } = useTranslation(['storefront', 'common'])
  const { isRtl } = useLanguage()
  const { formatMoney } = useFormat()
  const { zones, isLoading, error, refresh } = useShippingRates()

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

      {/* أسعار الشحن المحددة حسب المنطقة */}
      <div className="p-3 rounded-[16px] bg-surface border border-surface-border/60 space-y-2">
        <span className="text-[11px] font-bold text-text-muted block">
          {t('productDetails.deliveryCard.ratesTitle')}
        </span>
        {zones.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {zones.map((zone) => (
              <div
                key={zone.zone}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-subtle"
              >
                <span className="text-text-muted font-medium">
                  {isRtl ? zone.name || zone.zone : zone.nameEn || zone.name || zone.zone}
                </span>
                <span className="font-bold text-brand-orange shrink-0">
                  {formatMoney(zone.price)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 text-xs text-text-muted py-1">
            <span>
              {error && !isLoading
                ? t('common:shipping.loadFailed')
                : t('common:shipping.loadingRates')}
            </span>
            {error && !isLoading && (
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-1 font-bold text-brand-orange-text dark:text-brand-orange hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('common:actions.retry')}</span>
              </button>
            )}
          </div>
        )}
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
