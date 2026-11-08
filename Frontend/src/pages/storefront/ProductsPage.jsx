import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/product/ProductCard'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { FilterSidebar } from '../../features/storefront/FilterSidebar'
import { useDebounce } from '../../hooks/useDebounce'
import { useScrollLock } from '../../hooks/useScrollLock'
import { catalogService } from '../../services/catalogService'
import { sellerService } from '../../services/sellerService'

/**
 * صفحة استعراض وبحث وتصفية الوسائل التعليمية (ProductsPage)
 * تدعم البحث المتزامن مع الرابط والدرج السفلي للشاشات الصغيرة والترتيب والترقيم
 */
export default function ProductsPage() {
  const { t } = useTranslation(['storefront', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()

  // قراءة الحالة الابتدائية من معلمات الرابط URL
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const debouncedSearch = useDebounce(searchTerm, 350)

  const [products, setProducts] = useState([])
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    sellerService.getSellers().then((res) => {
      setSellers(res.items || res || [])
    }).catch(() => {})
  }, [])
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  useScrollLock(Boolean(isMobileDrawerOpen))

  // قراءة الفلاتر الحالية من URL
  const currentCategory = searchParams.get('category') || ''
  const currentStage = searchParams.get('stage') || ''
  const currentSeller = searchParams.get('seller') || ''
  const currentMinPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
  const currentMaxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  const currentInStock = searchParams.get('inStock') === 'true'
  const currentSort = searchParams.get('sort') || 'newest'
  const currentPage = Number(searchParams.get('page')) || 1

  // حساب عدد الفلاتر النشطة لشارة الموبايل
  const activeFiltersCount = [
    Boolean(currentCategory),
    Boolean(currentStage),
    Boolean(currentSeller),
    Boolean(currentMinPrice !== undefined && currentMinPrice > 0),
    Boolean(currentMaxPrice !== undefined && currentMaxPrice < 1000),
    Boolean(currentInStock),
  ].filter(Boolean).length

  // تحديث معلمات الرابط عند تغيير أي فلتر
  const updateQueryParam = useCallback(
    (key, value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (
            value === '' ||
            value === undefined ||
            value === null ||
            (key === 'page' && value === 1) ||
            (key === 'inStock' && !value)
          ) {
            next.delete(key)
          } else {
            next.set(key, String(value))
          }
          // إذا تم تعديل أي فلتر غير رقم الصفحة، نعود للصفحة الأولى
          if (key !== 'page') {
            next.delete('page')
          }
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  // مزامنة حقل البحث المؤجل مع معلمات الرابط
  useEffect(() => {
    updateQueryParam('q', debouncedSearch.trim())
  }, [debouncedSearch, updateQueryParam])

  // جلب البيانات من خدمة الكتالوج
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await catalogService.getProducts({
        q: debouncedSearch.trim(),
        category: currentCategory,
        sellerId: currentSeller,
        stage: currentStage,
        minPrice: currentMinPrice,
        maxPrice: currentMaxPrice,
        inStock: currentInStock ? true : undefined,
        sort: currentSort,
        page: currentPage,
        pageSize: 12,
      })
      setProducts(res.items || [])
      setTotalCount(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } catch {
      setError('تعذر تحميل الوسائل التعليمية، يرجى المحاولة لاحقاً')
    } finally {
      setLoading(false)
    }
  }, [
    debouncedSearch,
    currentCategory,
    currentSeller,
    currentStage,
    currentMinPrice,
    currentMaxPrice,
    currentInStock,
    currentSort,
    currentPage,
  ])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // إعادة ضبط كافة الفلاتر والبحث
  const handleResetFilters = () => {
    setSearchTerm('')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  // خيارات الترتيب
  const sortOptions = [
    { value: 'newest', label: t('storefront:products.sortNewest') },
    { value: 'price_asc', label: t('storefront:products.sortPriceAsc') },
    { value: 'price_desc', label: t('storefront:products.sortPriceDesc') },
    { value: 'oldest', label: t('storefront:products.sortOldest') },
  ]

  const filtersState = {
    category: currentCategory,
    stage: currentStage,
    seller: currentSeller,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    inStock: currentInStock,
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* ترويسة الصفحة */}
      <PageHeader
        title={t('storefront:products.pageTitle')}
        description={t('storefront:products.pageSubtitle')}
      />

      {/* شريط البحث والفرز والتحكم للشاشات الصغيرة والكبيرة */}
      <div className="bg-surface p-4 sm:p-5 rounded-[24px] border border-surface-border shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        {/* حقل البحث */}
        <div className="relative w-full md:w-80 lg:w-96">
          <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-text-muted">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('storefront:products.searchPlaceholder')}
            className="w-full h-[52px] ps-11 pe-4 rounded-[16px] bg-surface-subtle border border-surface-border text-sm text-text-main font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all"
          />
        </div>

        {/* أدوات التحكم: زر الفلاتر للموبايل + قائمة الترتيب */}
        <div className="w-full md:w-auto flex flex-wrap sm:flex-nowrap items-center justify-between md:justify-end gap-2.5">
          {/* زر الفلترة على الموبايل */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 h-11 px-3.5 rounded-full bg-surface-subtle hover:bg-surface border border-surface-border text-xs sm:text-sm font-bold text-text-main transition-all cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
            <span>{t('storefront:products.filterTitle')}</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-orange text-white text-[11px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* قائمة الترتيب */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <span className="text-xs font-bold text-text-muted hidden sm:inline-block">
              {t('storefront:products.sortBy')}
            </span>
            <div className="w-full sm:w-48">
              <Select
                aria-label={t('storefront:products.sortBy')}
                value={currentSort}
                onChange={(e) => updateQueryParam('sort', e.target.value)}
                options={sortOptions}
                containerClassName="mb-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي: الشريط الجانبي وشبكة المنتجات */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* الشريط الجانبي للشاشات الكبيرة (Desktop Sidebar) */}
        <aside className="hidden lg:block lg:col-span-3 bg-surface p-6 rounded-[28px] border border-surface-border shadow-soft sticky top-24">
          <FilterSidebar
            sellers={sellers}
            filters={filtersState}
            onFilterChange={updateQueryParam}
            onReset={handleResetFilters}
          />
        </aside>

        {/* شبكة الوسائل التعليمية ومحتوى النتائج */}
        <main className="lg:col-span-9 space-y-8">
          {loading ? (
            /* شبكة التحميل الهيكلي Skeleton */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div
                  key={i}
                  className="p-3 bg-surface rounded-[24px] border border-surface-border shadow-soft space-y-3"
                >
                  <Skeleton className="aspect-[4/3] w-full rounded-[20px]" />
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-1/2 rounded-md" />
                  <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                    <Skeleton className="h-6 w-16 rounded-md" />
                    <Skeleton className="h-9 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* حالة الخطأ */
            <EmptyState
              title="حدث خطأ أثناء تحميل الوسائل"
              description={error}
              action={
                <Button onClick={fetchProducts} variant="secondary">
                  إعادة المحاولة
                </Button>
              }
            />
          ) : products.length === 0 ? (
            /* حالة عدم وجود نتائج */
            <EmptyState
              title={t('storefront:products.noProductsFound')}
              description={t('storefront:products.noProductsFoundDesc')}
              action={
                <Button
                  onClick={handleResetFilters}
                  startIcon={<RotateCcw className="w-4 h-4" />}
                >
                  {t('storefront:products.clearFilters')}
                </Button>
              }
            />
          ) : (
            /* شبكة المنتجات (4/3/2 أعمدة حسب العرض) */
            <>
              <div className="flex items-center justify-between text-xs font-semibold text-text-muted px-1">
                <span>
                  {t('storefront:products.showingResults', { count: totalCount })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              {/* الترقيم والتنقل بين الصفحات */}
              <div className="pt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(nextPage) => updateQueryParam('page', nextPage)}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* درج الفلاتر للموبايل (Bottom Sheet Drawer) */}
      <Drawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        title={t('storefront:products.filterTitle')}
        side="bottom"
      >
        <FilterSidebar
          sellers={sellers}
          filters={filtersState}
          onFilterChange={updateQueryParam}
          onReset={handleResetFilters}
          onApply={() => setIsMobileDrawerOpen(false)}
          isMobileDrawer
        />
      </Drawer>
    </div>
  )
}
