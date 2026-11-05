import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'

/**
 * قسم بانر طلبات الحضانات والكميات المخصصة
 * Factual only: Ask for custom/bulk order, send form, we contact you.
 */
export function NurseryBannerSection({ onOpenModal }) {
  const { t } = useTranslation('storefront')

  return (
    <section id="bulk-nursery" className="w-full">
      <div className="relative rounded-[32px] sm:rounded-[40px] bg-gradient-to-r from-brand-orange via-[#ff7a28] to-brand-orange text-white p-8 sm:p-12 lg:p-14 shadow-soft-lg overflow-hidden">
        {/* بقع لونية تزيينية بالخلفية */}
        <div className="absolute -top-12 -start-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -end-10 w-72 h-72 rounded-full bg-black/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 text-start space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs sm:text-sm font-bold shadow-xs">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{t('home.nurseryBanner.badge')}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-heading leading-tight text-white">
              {t('home.nurseryBanner.title')}
            </h2>

            <p className="text-sm sm:text-base text-white/95 leading-relaxed max-w-2xl">
              {t('home.nurseryBanner.subtitle')}
            </p>
          </div>

          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <Button
              onClick={onOpenModal}
              size="lg"
              className="bg-white text-brand-orange-text hover:bg-white/95 text-sm sm:text-base font-black px-8 py-3.5 shadow-md active:scale-95"
            >
              {t('home.nurseryBanner.orderCustom')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
