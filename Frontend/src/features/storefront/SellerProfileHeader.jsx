import { MapPin, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { getDisplayName } from '../../utils'

/**
 * ترويسة الصفحة العامة للبائعة (SellerProfileHeader)
 * تتضمن غلافاً مرحاً والصورة الرمزية والنبذة التعريفية دون أي إحصائيات وهمية
 */
export function SellerProfileHeader({ seller, productsCount = 0 }) {
  const { t, i18n } = useTranslation('storefront')
  const displayName = getDisplayName(seller, i18n.language)

  return (
    <div className="relative rounded-[32px] sm:rounded-[40px] bg-surface border border-surface-border overflow-hidden shadow-soft text-start">
      {/* غلاف مزين بنمط لوني ناعم */}
      <div className="h-36 sm:h-48 w-full bg-gradient-to-r from-brand-orange/25 via-brand-sky/20 to-brand-mint/25 relative overflow-hidden">
        <div className="blob-decor w-56 h-56 bg-brand-orange/20 -top-10 -start-10" />
        <div className="blob-decor w-48 h-48 bg-brand-sky/20 -bottom-10 -end-10" />
      </div>

      {/* محتوى بيانات البائعة والصورة الرمزية المتداخلة */}
      <div className="px-6 sm:px-10 pb-8 pt-0 relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 sm:-mt-20 text-center sm:text-start">
        <div className="p-2 rounded-full bg-surface border-4 border-surface shadow-md shrink-0">
          <Avatar name={displayName} role="seller" size="2xl" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <span className="inline-block px-3 py-1 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange text-xs font-black">
              {displayName}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-mint/15 text-brand-mint-text dark:text-brand-mint text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('sellers.localHandmade')}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main">
            {t('sellers.publicProfile.storeSubtitle')}
          </h1>

          <div className="flex items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-text-muted font-medium">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-brand-orange" />
              <span>{seller.governorate || 'القاهرة'}</span>
            </span>
            <span>•</span>
            <span>{t('sellers.publishedCount', { count: productsCount })}</span>
          </div>

          <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl pt-2">
            {typeof seller.bio === 'object' ? (seller.bio?.ar || seller.bio?.en || '') : seller.bio}
          </p>
        </div>
      </div>
    </div>
  )
}
