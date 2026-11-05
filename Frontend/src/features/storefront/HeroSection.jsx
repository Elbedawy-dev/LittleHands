import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, ClipboardList, Phone, ShoppingBag, Sparkles, Truck, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'

/**
 * قسم البانر الرئيسي الترحيبي (Hero Section)
 * يعرض الرسالة الترحيبية الأساسية مع كولاج مرح من 4 وسائل تعليمية بأشكال عائلية جذابة
 */
export function HeroSection({ onOpenCustomModal }) {
  const { t } = useTranslation(['storefront', 'common'])

  const infoCards = [
    {
      icon: Sparkles,
      title: t('storefront:home.heroCards.handmadeTitle'),
      desc: t('storefront:home.heroCards.handmadeDesc'),
    },
    {
      icon: ClipboardList,
      title: t('storefront:home.heroCards.customTitle'),
      desc: t('storefront:home.heroCards.customDesc'),
    },
    {
      icon: Truck,
      title: t('storefront:home.heroCards.shippingTitle'),
      desc: t('storefront:home.heroCards.shippingDesc'),
    },
    {
      icon: Wallet,
      title: t('storefront:home.heroCards.paymentTitle'),
      desc: t('storefront:home.heroCards.paymentDesc'),
    },
  ]

  return (
    <section className="relative w-full overflow-hidden rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-brand-orange/15 via-surface to-brand-sky/10 border border-surface-border p-6 sm:p-10 lg:p-14 shadow-soft">
      {/* خلفيات بقع لونية عضوية تزيينية */}
      <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-brand-orange/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -end-24 w-72 h-72 rounded-full bg-brand-sky/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 start-1/3 w-64 h-64 rounded-full bg-brand-mint/15 blur-2xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* العمود النصي والمعلومات الترحيبية */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="lg:col-span-7 flex flex-col items-start text-start"
        >
          {/* شارة الهوية الرسمية */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-surface-border text-brand-orange-text dark:text-brand-orange font-bold text-xs sm:text-sm mb-5 shadow-xs">
            <Sparkles className="w-4 h-4 text-brand-orange shrink-0" />
            <span>{t('storefront:home.heroBadge')}</span>
          </div>

          {/* العنوان الرئيسي المبهر */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading text-text-main leading-[1.2] mb-4">
            {t('storefront:home.heroTitle')}
            <span className="block text-brand-orange mt-1">
              {t('storefront:home.heroTitleHighlight')}
            </span>
          </h1>

          {/* الوصف التعريفي */}
          <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl mb-8">
            {t('storefront:home.heroSubtitle')}
          </p>

          {/* أزرار الإجراءات الرئيسية */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Link to="/products" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-7"
                startIcon={<ShoppingBag className="w-4 h-4" />}
                endIcon={<ArrowLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />}
              >
                {t('storefront:home.browseProducts')}
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto px-6 bg-surface hover:bg-surface-subtle border-surface-border text-text-main"
              onClick={onOpenCustomModal}
              startIcon={<Sparkles className="w-4 h-4 text-brand-orange" />}
            >
              {t('storefront:home.customRequest')}
            </Button>
          </div>

          {/* شريط مميزات سريع أسفل الأزرار */}
          <div className="mt-8 pt-6 border-t border-surface-border/80 w-full flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm font-semibold text-text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-mint-text dark:text-brand-mint shrink-0" />
              <span>{t('storefront:home.heroPills.handmade')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#e60000] shrink-0" />
              <span>{t('storefront:home.heroPills.payment')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-sky shrink-0" />
              <span>{t('storefront:home.heroPills.shipping')}</span>
            </div>
          </div>
        </motion.div>

        {/* شبكة البطاقات التعريفية الأربعة المتطابقة */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="lg:col-span-5 relative"
        >
          {/* عنصر ملصق تزييني عائم - الشريط الأصفر */}
          <div className="absolute -top-3 start-1 sm:-top-4 sm:-start-3 z-20 px-3 py-1 rounded-full bg-brand-yellow text-amber-950 text-xs font-black shadow-md rotate-[-6deg] select-none pointer-events-none whitespace-nowrap">
            {t('storefront:home.heroYellowBadge')}
          </div>

          <div className="relative w-full max-w-md mx-auto grid grid-cols-2 auto-rows-fr gap-3 sm:gap-4 p-2">
            {infoCards.map((card, idx) => {
              const Icon = card.icon
              return (
                <div
                  key={idx}
                  className="h-full flex flex-col justify-start p-3.5 sm:p-4 rounded-[24px] bg-surface border border-surface-border shadow-soft"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0 mb-2.5 sm:mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm text-text-main leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-text-muted leading-relaxed mt-1">
                    {card.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}