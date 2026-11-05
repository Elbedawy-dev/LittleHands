import { MapPin, PackageCheck, PhoneCall, Sparkles, Touchpad } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * قسم خطوات الطلب الأربع (How Ordering Works)
 * متصل بمسار منقط على الشاشات الكبيرة وينتهي بالدفع عبر فودافون كاش ثم التجهيز والشحن
 */
export function HowOrderingWorksSection() {
  const { t } = useTranslation('storefront')

  const steps = [
    {
      num: '1',
      numEn: '1',
      title: t('home.step1Title'),
      desc: t('home.step1Desc'),
      actionText: t('home.step1Action'),
      actionIcon: Touchpad,
      badgeColor: 'bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange',
    },
    {
      num: '2',
      numEn: '2',
      title: t('home.step2Title'),
      desc: t('home.step2Desc'),
      actionText: t('home.step2Action'),
      actionIcon: MapPin,
      badgeColor: 'bg-brand-sky/15 text-sky-700 dark:text-sky-300',
    },
    {
      num: '3',
      numEn: '3',
      title: t('home.step3Title'),
      desc: t('home.step3Desc'),
      actionText: t('home.step3Action'),
      actionIcon: PhoneCall,
      badgeColor: 'bg-[#e60000]/10 text-[#e60000]',
    },
    {
      num: '4',
      numEn: '4',
      title: t('home.step4Title'),
      desc: t('home.step4Desc'),
      actionText: t('home.step4Action'),
      actionIcon: PackageCheck,
      badgeColor: 'bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint',
    },
  ]

  return (
    <section className="space-y-10 py-6 sm:py-8">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-sky/15 text-sky-700 dark:text-sky-300 text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('home.howOrderingBadge')}</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-black font-heading text-text-main">
          {t('home.howOrderingTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {t('home.howOrderingSubtitle')}
        </p>
      </div>

      <div className="relative">
        {/* خط المسار المنقط المتصل بين الخطوات على الشاشات الكبيرة */}
        <div className="hidden lg:block absolute top-10 start-12 end-12 h-0.5 border-t-2 border-dashed border-surface-border z-0" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {steps.map((step, idx) => {
            const ActionIcon = step.actionIcon
            return (
              <div
                key={idx}
                className="bg-surface p-6 rounded-[24px] border border-surface-border shadow-soft flex flex-col justify-between text-start hover-lift transition-all"
              >
                <div>
                  {/* رقم الخطوة الدائري البارز */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-black text-xl mb-4 shadow-xs ${step.badgeColor}`}
                  >
                    {step.num}
                  </div>

                  <h3 className="font-heading font-bold text-base text-text-main mb-2">
                    {step.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
                    {step.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-surface-border flex items-center gap-2 text-xs font-semibold text-text-muted">
                  <ActionIcon className="w-4 h-4 text-brand-orange shrink-0" />
                  <span>{step.actionText}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
