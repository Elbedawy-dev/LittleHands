import { useEffect, useState } from 'react'
import { ArtisansSection } from '../../features/storefront/ArtisansSection'
import { CategoriesSection } from '../../features/storefront/CategoriesSection'
import { HeroSection } from '../../features/storefront/HeroSection'
import { HowOrderingWorksSection } from '../../features/storefront/HowOrderingWorksSection'
import { LatestProductsSection } from '../../features/storefront/LatestProductsSection'
import { NurseryBannerSection } from '../../features/storefront/NurseryBannerSection'
import { NurseryOrderModal } from '../../features/storefront/NurseryOrderModal'
import { TrustStrip } from '../../features/storefront/TrustStrip'
import { catalogService } from '../../services/catalogService'
import { sellerService } from '../../services/sellerService'

/**
 * الصفحة الرئيسية لمنصة أيدي صغيرة (HomePage)
 * تتبع ترتيب الأقسام المطلوب بدقة وتلتزم بمعجم المحتوى والكلمات المحظورة
 */
export default function HomePage() {
  const [latestProducts, setLatestProducts] = useState([])
  const [sellers, setSellers] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingSellers, setLoadingSellers] = useState(true)
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false)

  useEffect(() => {
    // جلب أحدث 12 وسيلة تعليمية منشورة
    catalogService
      .getProducts({ sort: 'newest', pageSize: 12 })
      .then((res) => setLatestProducts(res?.items || []))
      .catch(() => setLatestProducts([]))
      .finally(() => setLoadingProducts(false))

    // جلب بيانات البائعتين الحرفيتين
    sellerService
      .getSellers()
      .then((data) => setSellers(data))
      .catch(() => setSellers([]))
      .finally(() => setLoadingSellers(false))
  }, [])

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12 sm:space-y-16">
      {/* 1. قسم البانر الرئيسي Hero */}
      <HeroSection
        onOpenCustomModal={() => setIsCustomModalOpen(true)}
      />

      {/* 2. قسم أحدث 12 وسيلة تعليمية (بعد الـ Hero وقبل باقي الأقسام) */}
      <LatestProductsSection
        products={latestProducts}
        loading={loadingProducts}
      />

      {/* 3. شريط الثقة (صناعة يدوية، توصيل لكل المحافظات، دفع فودافون كاش، كميات للحضانات) */}
      <TrustStrip />

      {/* 4. تصنيفات المنصة الستة الأساسية (بدون أعداد) */}
      <CategoriesSection />

      {/* 5. قسم "تعرفي على صانعتينا" (بطاقتي البائعتين دون تقييمات) */}
      <ArtisansSection
        sellers={sellers}
        loading={loadingSellers}
      />

      {/* 6. كيف تطلبين وسيلتك التعليمية؟ (4 خطوات تنتهي بفودافون كاش ثم الشحن) */}
      <HowOrderingWorksSection />

      {/* 7. بانر طلبات الحضانات والكميات المخصصة */}
      <NurseryBannerSection
        onOpenModal={() => setIsCustomModalOpen(true)}
      />

      {/* نافذة طلب التفصيل المخصص للحضانات */}
      <NurseryOrderModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
      />
    </div>
  )
}
