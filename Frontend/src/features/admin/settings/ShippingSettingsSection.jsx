import { Clock, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { SHIPPING_ZONES, getGovernorateName } from '../../../config/constants'
import { useLanguage } from '../../../context/LanguageContext'

/**
 * قسم تسعيرة الشحن حسب مناطق التوصيل ومدة التسليم
 */
export function ShippingSettingsSection({
  shippingRates = {},
  onChangeZoneRate,
  deliveryTime = '',
  onChangeDeliveryTime,
}) {
  const { t } = useTranslation('admin-manage')
  const { isRtl } = useLanguage()

  return (
    <Card variant="default" padding="lg" className="shadow-soft space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
        <div className="w-10 h-10 rounded-2xl bg-brand-mint/15 text-brand-mint flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-heading font-black text-base text-text-main">
            {t('settings.shippingSection.title')}
          </h3>
          <p className="text-xs text-text-muted">
            {t('settings.shippingSection.description')}
          </p>
        </div>
      </div>

      {/* جدول تسعيرة المناطق */}
      <div className="overflow-x-auto overscroll-contain modal-scrollbar rounded-[20px] border border-surface-border bg-surface">
        <table className="w-full text-start border-collapse text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-subtle/60 text-text-muted text-xs font-bold">
              <th className="py-3.5 px-4 text-start">{t('settings.shippingSection.zoneCol')}</th>
              <th className="py-3.5 px-4 text-start w-48">{t('settings.shippingSection.rateCol')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {SHIPPING_ZONES.map((zone) => {
              const currentRate = shippingRates[zone.id] ?? zone.rate

              return (
                <tr key={zone.id} className="hover:bg-surface-subtle/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-text-main block text-sm">
                      {isRtl ? zone.name : (zone.nameEn || zone.name)}
                    </span>
                    <span className="text-xs text-text-muted block mt-0.5 line-clamp-1">
                      {zone.governorates
                        .map((g) => getGovernorateName(g, isRtl ? 'ar' : 'en'))
                        .join(isRtl ? '، ' : ', ')}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="relative max-w-[140px]">
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={currentRate}
                        onChange={(e) => onChangeZoneRate(zone.id, e.target.value)}
                        className="w-full h-11 ps-3 pe-9 rounded-[14px] bg-surface-subtle/60 border border-surface-border text-sm font-bold text-text-main text-start outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
                        required
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted pointer-events-none">
                        {isRtl ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* حقل مدة التوصيل المتوقعة */}
      <div className="pt-2">
        <div className="relative">
          <Input
            id="admin-delivery-time"
            label={t('settings.shippingSection.deliveryTimeLabel')}
            type="text"
            value={deliveryTime}
            onChange={(e) => onChangeDeliveryTime(e.target.value)}
            placeholder={t('settings.shippingSection.deliveryTimePlaceholder')}
            startIcon={<Clock className="w-4 h-4 text-text-muted" />}
          />
        </div>
      </div>
    </Card>
  )
}
