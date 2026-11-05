import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import { CATEGORIES } from '../../config/constants'
import { SellerProfileHeader } from '../../features/storefront/SellerProfileHeader'
import { sellerService } from '../../services/sellerService'
import { getDisplayName } from '../../utils'

/**
 * صفحة المتجر العام للبائعة (SellerPublicPage)
 * تعرض غلاف وملف البائعة ومنتجاتها المنشورة مع تصفية سريعة بالتصنيف
 */
export default function SellerPublicPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['storefront', 'common'])
  const isEn = i18n.language === 'en'

  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    Promise.all([
      sellerService.getSeller(id),
      sellerService.getSellerProducts(id),
    ])
      .then(([sData, pData]) => {
        setSeller(sData)
        setProducts(pData || [])
      })
      .catch(() => {
        setSeller(null)
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [id])

  // تصفية الوسائل حسب التصنيف المختار
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return products
    return products.filter((p) => p.categoryId === selectedCategory)
  }, [products, selectedCategory])

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        <Skeleton className="h-64 rounded-[32px]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-[24px]" />
          ))}
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title="البائعة غير موجودة"
          description="ربما تم تعديل الرابط أو لم يتم العثور على البائعة المطلوبة"
          action={
            <Link to="/sellers">
              <Button>العودة لقائمة البائعات</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* رابط العودة لقائمة البائعات */}
      <nav aria-label="الرجوع">
        <Link
          to="/sellers"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-text-muted hover:text-brand-orange-text dark:hover:text-brand-orange transition-colors"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
          <span>الرجوع إلى قائمة البائعات الحرفيات</span>
        </Link>
      </nav>

      {/* ترويسة وغلاف البائعة */}
      <SellerProfileHeader seller={seller} productsCount={products.length} />

      {/* قسم وسائل البائعة وفلترة التصنيفات */}
      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-heading text-text-main">
              {t('storefront:sellers.publicProfile.artisanAids', { name: getDisplayName(seller, i18n.language) })}
            </h2>
            <span className="text-xs text-text-muted font-medium">
              {filteredProducts.length} وسيلة تعليمية معروضة
            </span>
          </div>

          {/* شرائح تصنيف سريعة لأعمال البائعة */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`h-9 px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === ''
                  ? 'bg-brand-orange text-white shadow-xs'
                  : 'bg-surface border border-surface-border text-text-muted hover:text-text-main'
              }`}
            >
              {t('storefront:sellers.publicProfile.all')}
            </button>

            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.slug
              const catName = isEn ? cat.nameEn : cat.name
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`h-9 px-4 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-orange text-white shadow-xs'
                      : 'bg-surface border border-surface-border text-text-muted hover:text-text-main'
                  }`}
                >
                  {catName}
                </button>
              )
            })}
          </div>
        </div>

        {/* شبكة وسائل البائعة */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            title={t('storefront:sellers.publicProfile.noProducts')}
            action={
              selectedCategory && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCategory('')}
                >
                  عرض كافة وسائل البائعة
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
