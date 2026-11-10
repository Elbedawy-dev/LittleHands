import { ArrowRight, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'
import { useCart } from '../../context/CartContext'
import { DeliveryInfoCard } from '../../features/storefront/DeliveryInfoCard'
import { NurseryOrderModal } from '../../features/storefront/NurseryOrderModal'
import { ProductGallery } from '../../features/storefront/ProductGallery'
import { ProductInfo } from '../../features/storefront/ProductInfo'
import { ProductTabs } from '../../features/storefront/ProductTabs'
import { StickyMobileBar } from '../../features/storefront/StickyMobileBar'
import { catalogService } from '../../services/catalogService'

/**
 * صفحة تفاصيل الوسيلة التعليمية (ProductDetailsPage)
 * تتضمن معرض الصور مع Lightbox، شريحة البائعة، تفاصيل الخامات، بطاقة الشحن بفودافون كاش،
 * تبويبات الوصف والمواصفات، الوسائل المشابهة، وشريط شراء عائم للموبايل
 */
export default function ProductDetailsPage() {
  const { id } = useParams()
  const { t } = useTranslation(['storefront', 'common'])
  const { addItem } = useCart()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    catalogService
      .getProduct(id)
      .then(async (data) => {
        setProduct(data)
        // جلب الوسائل التعليمية المشابهة
        try {
          const related = await catalogService.getRelatedProducts(data.id, 4)
          setRelatedProducts(related)
        } catch {
          setRelatedProducts([])
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        <Skeleton className="h-6 w-32 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <Skeleton className="lg:col-span-6 aspect-[4/3] rounded-[28px]" />
          <div className="lg:col-span-6 space-y-4">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-10 w-3/4 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title={t('storefront:productDetails.notFoundTitle')}
          description={t('storefront:productDetails.notFoundDesc')}
          action={
            <Link to="/products">
              <Button>{t('storefront:productDetails.backToProducts')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 sm:space-y-12 pb-24 md:pb-12">
      {/* رابط العودة إلى قائمة الوسائل */}
      <nav aria-label={t('common:actions.back')}>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-text-muted hover:text-brand-orange-text dark:hover:text-brand-orange transition-colors"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
          <span>{t('storefront:productDetails.backToProducts')}</span>
        </Link>
      </nav>

      {/* العرض الرئيسي: المعرض والتفاصيل */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* عمود المعرض والوسائط (6 أعمدة) */}
        <div className="lg:col-span-6">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        {/* عمود معلومات الوسيلة وإجراءات الشراء وبطاقة الشحن (6 أعمدة) */}
        <div className="lg:col-span-6 space-y-8">
          <ProductInfo product={product} />
          <DeliveryInfoCard />
        </div>
      </div>

      {/* بانر التخصيص وطلب تطريز اسم الحضانة */}
      <section className="rounded-[28px] bg-gradient-to-r from-brand-orange/15 via-surface to-brand-mint/15 border border-surface-border p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-start shadow-soft">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface text-brand-orange-text dark:text-brand-orange text-xs font-bold border border-surface-border">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('storefront:productDetails.customBanner.badge')}</span>
          </div>
          <h2 className="font-heading font-black text-lg sm:text-xl text-text-main">
            {t('storefront:productDetails.customBanner.title')}
          </h2>
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
            {t('storefront:productDetails.customBanner.subtitle')}
          </p>
        </div>

        <Button
          onClick={() => setIsCustomModalOpen(true)}
          className="shrink-0 font-bold whitespace-nowrap px-6"
        >
          {t('storefront:productDetails.customBanner.action')}
        </Button>
      </section>

      {/* التبويبات التفصيلية: الوصف والمواصفات */}
      <ProductTabs product={product} />

      {/* الوسائل التعليمية المشابهة للفصل */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-text-main">
                {t('storefront:productDetails.relatedTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                {t('storefront:productDetails.relatedSubtitle')}
              </p>
            </div>

            <Link
              to="/products"
              className="text-xs sm:text-sm font-bold text-brand-orange-text dark:text-brand-orange hover:underline"
            >
              {t('storefront:productDetails.viewAll')}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((relProd) => (
              <ProductCard key={relProd.id} product={relProd} />
            ))}
          </div>
        </section>
      )}

      {/* شريط الشراء العائم للموبايل فوق شريط التبويب */}
      <StickyMobileBar
        product={product}
        onAddToCart={() => {
          addItem(product, 1)
          toast.success(t('storefront:productDetails.addedToCart'), {
            position: 'top-center',
          })
        }}
      />

      {/* نافذة طلب التعديل والتفصيل للحضانة */}
      <NurseryOrderModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />
    </div>
  )
}
