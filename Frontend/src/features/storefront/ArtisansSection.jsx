import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '../../components/ui/Skeleton'
import { SellerCard } from './SellerCard'

/**
 * قسم "تعرفي على صانعتينا" (عرض بطاقتي البائعتين دون تقييمات أو إحصائيات وهمية)
 */
export function ArtisansSection({ sellers = [], loading = false }) {
  const { t } = useTranslation(['storefront', 'common'])

  return (
    <section className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('storefront:home.artisansBadge')}</span>
        </span>
        <h2 className="text-2xl sm:text-3xl font-black font-heading text-text-main">
          {t('storefront:home.artisansTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {t('storefront:home.artisansSubtitle')}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-[28px]" />
          <Skeleton className="h-64 rounded-[28px]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sellers.slice(0, 2).map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </section>
  )
}
