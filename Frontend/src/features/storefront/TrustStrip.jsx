import { Building2, HeartHandshake, PhoneCall, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * شريط الثقة (Trust Strip)
 * يوضح الركائز الأربع لمنصة أيدي صغيرة (صناعة يدوية، توصيل لكل المحافظات، دفع فودافون كاش، كميات للحضانات)
 */
export function TrustStrip() {
  const { t } = useTranslation('storefront')

  const items = [
    {
      icon: HeartHandshake,
      iconBg: 'bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange',
      title: t('home.trustStrip.handmadeTitle'),
      desc: t('home.trustStrip.handmadeDesc'),
    },
    {
      icon: Truck,
      iconBg: 'bg-brand-sky/15 text-sky-700 dark:text-sky-300',
      title: t('home.trustStrip.shippingTitle'),
      desc: t('home.trustStrip.shippingDesc'),
    },
    {
      icon: PhoneCall,
      iconBg: 'bg-[#e60000]/10 text-[#e60000]',
      title: t('home.trustStrip.vodafoneTitle'),
      desc: t('home.trustStrip.vodafoneDesc'),
    },
    {
      icon: Building2,
      iconBg: 'bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint',
      title: t('home.trustStrip.bulkTitle'),
      desc: t('home.trustStrip.bulkDesc'),
    },
  ]

  return (
    <section className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map((item, index) => {
          const IconComponent = item.icon
          return (
            <div
              key={index}
              className="p-5 sm:p-6 rounded-[24px] bg-surface border border-surface-border shadow-soft flex items-start gap-4 hover-lift transition-all"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg}`}
              >
                <IconComponent className="w-6 h-6" />
              </div>
              <div className="text-start">
                <h3 className="font-heading font-bold text-base text-text-main mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
