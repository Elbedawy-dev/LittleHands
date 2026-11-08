import { ArrowLeft, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CATEGORIES } from '../../config/constants'
import { getDisplayName, pickLocaleText } from '../../utils'

/**
 * بطاقة البائعة الحرفية (SellerCard)
 * تعرض معلومات البائعة الحقيقية فقط دون أي تقييمات أو ألقاب مبتكرة
 */
export function SellerCard({ seller }) {
  const { i18n, t } = useTranslation('storefront')
  const lang = i18n.language === 'en' ? 'en' : 'ar'

  const sellerName = getDisplayName(seller, lang) || (lang === 'en' ? 'Seller' : 'بائعة')
  const sellerCity = pickLocaleText(seller.city || seller.governorate, lang) || ''
  const productsCount = seller.productsCount || 0
  const completedOrdersCount = seller.completedOrdersCount || 0

  // استخراج تصنيفات الوسائل الفعلية المنشورة من قاعدة البيانات
  const categoryIds = seller.categoryIds || []
  const sellerCategories = (
    seller.categories || categoryIds.map((cid) => CATEGORIES.find((c) => c.id === cid))
  ).filter(Boolean)

  return (
    <Card
      hoverLift
      padding="lg"
      className="relative overflow-hidden flex flex-col justify-between border-surface-border bg-surface text-start"
    >
      <div>
        {/* ترويسة البطاقة والصورة الرمزية والبيانات الواقعية فقط */}
        <div className="flex items-center gap-4 mb-4">
          <Avatar name={sellerName} role="seller" size="xl" />
          <div>
            <h3 className="font-heading font-black text-xl text-text-main">
              {sellerName}
            </h3>
            <p className="text-xs text-text-muted font-medium mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{sellerCity}</span>
              <span aria-hidden="true">•</span>
              <span>{t('sellers.publishedCount', { count: productsCount })}</span>
              <span aria-hidden="true">•</span>
              <span>{t('sellers.completedOrdersCount', { count: completedOrdersCount })}</span>
            </p>
          </div>
        </div>

        {/* النبذة التعريفية إن وجدت بدون ألقاب أو مبالغات */}
        {seller.bio && (
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
            {pickLocaleText(seller.bio, lang)}
          </p>
        )}

        {/* تصنيفات الوسائل الفعلية للبائعة (لا تظهر في حال عدم وجود وسائل) */}
        {sellerCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {sellerCategories.map((cat) => (
              <span
                key={cat.id}
                className="px-3 py-1 rounded-full bg-surface-subtle text-text-muted text-xs font-semibold"
              >
                {lang === 'en' ? (cat.nameEn || cat.name) : (cat.name || cat.nameEn)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* الشريط السفلي وزر الانتقال للمتجر */}
      <div className="pt-4 border-t border-surface-border flex items-center justify-between">
        <span className="text-xs font-bold text-brand-mint-text dark:text-brand-mint flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('sellers.localHandmade')}</span>
        </span>

        <Link to={`/sellers/${seller.id}`}>
          <Button
            variant="secondary"
            size="sm"
            endIcon={<ArrowLeft className="w-4 h-4 rtl:rotate-0 rotate-180" />}
          >
            {t('sellers.browseWorks')}
          </Button>
        </Link>
      </div>
    </Card>
  )
}
