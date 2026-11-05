import { Heart, Layers, Mail, MessageCircle, PhoneCall, Sparkles, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { useSettings } from '../../context/SettingsContext'

/**
 * صفحة "عن المنصة" (AboutPage)
 * تقدم قصة منصة أيدي صغيرة، الخامات اليدوية، تمكين المرأة الحرفية،
 * وطريقة الدفع عبر فودافون كاش ومعلومات التواصل الحقيقية عند توفرها
 */
export default function AboutPage() {
  const { t } = useTranslation('storefront')
  const { settings } = useSettings()

  const features = [
    {
      icon: Sparkles,
      iconBg: 'bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange',
      title: t('about.features.handmadeTitle'),
      desc: t('about.features.handmadeDesc'),
    },
    {
      icon: Layers,
      iconBg: 'bg-brand-sky/15 text-sky-700 dark:text-sky-300',
      title: t('about.features.materialsTitle'),
      desc: t('about.features.materialsDesc'),
    },
    {
      icon: Heart,
      iconBg: 'bg-brand-pink/15 text-pink-700 dark:text-pink-300',
      title: t('about.features.womenTitle'),
      desc: t('about.features.womenDesc'),
    },
    {
      icon: Truck,
      iconBg: 'bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint',
      title: t('about.features.shippingTitle'),
      desc: t('about.features.shippingDesc'),
    },
  ]

  const hasSupportInfo = Boolean(
    settings?.supportPhone || settings?.supportEmail || settings?.whatsappNumber
  )

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12 sm:space-y-16 text-start">
      {/* ترويسة الصفحة */}
      <PageHeader
        title={t('about.pageTitle')}
        description={t('about.pageSubtitle')}
      />

      {/* قسم القصة والرسالة */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('about.badge')}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black font-heading text-text-main leading-tight">
            {t('about.storyTitle')}
          </h2>

          <div className="space-y-3 text-xs sm:text-sm text-text-muted leading-relaxed">
            <p>{t('about.storyP1')}</p>
            <p>{t('about.storyP2')}</p>
            <p>{t('about.storyP3')}</p>
          </div>
        </div>

        {/* شبكة المزايا الأربع */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feat, idx) => {
            const IconComp = feat.icon
            return (
              <Card
                key={idx}
                padding="md"
                hoverLift
                className="bg-surface border-surface-border space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 ${feat.iconBg}`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-sm text-text-main mb-1">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* قسم آلية الدفع بفودافون كاش وكيفية العمل */}
      <section className="rounded-[28px] bg-surface border border-surface-border p-6 sm:p-10 shadow-soft space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#e60000]/10 text-[#e60000] flex items-center justify-center shrink-0">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-heading text-text-main">
              {t('about.paymentNoteTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              {t('about.paymentSub')}
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-3xl">
          {t('about.paymentNoteDesc')}
        </p>

        {settings?.platformWallet && (
          <div className="p-4 rounded-[18px] bg-surface-subtle border border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-text-main">
                {t('about.walletNumberTitle')}
              </span>
              <p className="text-sm font-bold text-text-muted">
                {t('about.walletNumberSub')}
              </p>
            </div>

            <div
              dir="ltr"
              className="px-4 py-2 rounded-xl bg-surface border border-surface-border font-mono font-bold text-base text-[#e60000]"
            >
              {settings.platformWallet}
            </div>
          </div>
        )}
      </section>

      {/* صندوق التواصل وخدمة الحضانات - يظهر فقط عند ضبط بيانات التواصل */}
      {hasSupportInfo && (
        <section className="rounded-[28px] bg-gradient-to-br from-brand-orange/15 via-surface to-brand-sky/15 border border-surface-border p-6 sm:p-10 shadow-soft text-start space-y-4">
          <h3 className="text-xl sm:text-2xl font-black font-heading text-text-main">
            {t('about.contactBoxTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl">
            {t('about.contactBoxDesc')}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm font-semibold text-text-main">
            {settings?.supportPhone && (
              <div className="flex items-center gap-2 p-2.5 px-4 rounded-full bg-surface border border-surface-border">
                <PhoneCall className="w-4 h-4 text-brand-orange" />
                <span dir="ltr" className="font-mono">{settings.supportPhone}</span>
              </div>
            )}

            {settings?.supportEmail && (
              <div className="flex items-center gap-2 p-2.5 px-4 rounded-full bg-surface border border-surface-border">
                <Mail className="w-4 h-4 text-brand-sky" />
                <span dir="ltr">{settings.supportEmail}</span>
              </div>
            )}

            {settings?.whatsappNumber && (
              <div className="flex items-center gap-2 p-2.5 px-4 rounded-full bg-surface border border-surface-border">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span dir="ltr" className="font-mono">{settings.whatsappNumber}</span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
