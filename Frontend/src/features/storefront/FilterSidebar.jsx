import { Filter, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Select } from '../../components/ui/Select'
import { Switch } from '../../components/ui/Switch'
import { CATEGORIES } from '../../config/constants'
import { getDisplayName } from '../../utils'

/**
 * شريط التصفية والفلاتر لصفحة المنتجات (FilterSidebar)
 * يدعم التصفية حسب التصنيف، نطاق السعر بسلايدر ومدخلات رقمية، المرحلة التعليمية، البائعة وتوفر المخزون
 */
export function FilterSidebar({
  filters,
  onFilterChange,
  onReset,
  onApply,
  isMobileDrawer = false,
}) {
  const { t, i18n } = useTranslation(['storefront', 'common'])
  const isEn = i18n.language === 'en'

  // خيارات مراحل رياض الأطفال
  const stageOptions = [
    { value: '', label: t('storefront:products.allStages') },
    { value: 'nursery', label: t('storefront:products.stageNursery') },
    { value: 'kg1', label: t('storefront:products.stageKg1') },
    { value: 'kg2', label: t('storefront:products.stageKg2') },
    { value: 'primary', label: t('storefront:products.stagePrimary') },
  ]

  // البائعتان الحرفيتان
  const sellerOptions = [
    { value: '', label: t('storefront:products.allSellers') },
    { value: 'seller_1', label: getDisplayName({ id: 'seller_1', name: 'البائعة الأولى', nameEn: 'First Seller' }, i18n.language) },
    { value: 'seller_2', label: getDisplayName({ id: 'seller_2', name: 'البائعة الثانية', nameEn: 'Second Seller' }, i18n.language) },
  ]

  const handleCategoryToggle = (categorySlug) => {
    // إذا كان نفس التصنيف محدداً يتم إلغاؤه (العودة للكل) وإلا يتم تحديده
    const nextCategory = filters.category === categorySlug ? '' : categorySlug
    onFilterChange('category', nextCategory)
  }

  const handlePriceChange = (field, val) => {
    const num = val === '' ? '' : Math.max(0, Number(val))
    onFilterChange(field, num)
  }

  return (
    <div className="space-y-6 text-start">
      {/* عنوان الفلترة مع زر إعادة الضبط */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-brand-orange" />
          <h2 className="font-heading font-bold text-lg text-text-main">
            {t('storefront:products.filterTitle')}
          </h2>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-bold text-text-muted hover:text-brand-orange transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('storefront:products.resetFilters')}</span>
        </button>
      </div>

      {/* 1. التصنيفات التعليمية الستة */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-orange" />
          <span>{t('storefront:products.categories')}</span>
        </h3>

        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const isChecked = filters.category === cat.slug
            const catName = isEn ? cat.nameEn : cat.name

            return (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-subtle transition-colors group select-none"
              >
                <Checkbox
                  checked={isChecked}
                  onChange={() => handleCategoryToggle(cat.slug)}
                  label={catName}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. نطاق السعر (سلايدر مزدوج ومدخلات رقمية) */}
      <div className="space-y-3 pt-3 border-t border-surface-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-sky" />
            <span>{t('storefront:products.priceRange')}</span>
          </h3>
          <span className="text-xs font-bold text-brand-orange">
            {filters.minPrice || 0} - {filters.maxPrice || 1000} {t('common:currency')}
          </span>
        </div>

        {/* سلايدر سريع للسعر الأقصى */}
        <input
          type="range"
          aria-label={t('storefront:products.priceRange')}
          min="50"
          max="1000"
          step="25"
          value={filters.maxPrice || 1000}
          onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
          className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-brand-orange"
        />

        {/* مدخلان رقميان للحد الأدنى والحد الأقصى */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-text-muted mb-1">
              {t('storefront:products.minPrice')}
            </label>
            <input
              type="number"
              min="0"
              max={filters.maxPrice || 1000}
              value={filters.minPrice ?? ''}
              onChange={(e) => handlePriceChange('minPrice', e.target.value)}
              placeholder="0"
              className="w-full h-11 px-3 rounded-[12px] bg-surface text-text-main border border-surface-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-text-muted mb-1">
              {t('storefront:products.maxPrice')}
            </label>
            <input
              type="number"
              min={filters.minPrice || 0}
              max="2000"
              value={filters.maxPrice ?? ''}
              onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
              placeholder="1000"
              className="w-full h-11 px-3 rounded-[12px] bg-surface text-text-main border border-surface-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
        </div>
      </div>

      {/* 3. المرحلة التعليمية */}
      <div className="pt-3 border-t border-surface-border">
        <Select
          label={t('storefront:products.stage')}
          value={filters.stage || ''}
          onChange={(e) => onFilterChange('stage', e.target.value)}
          options={stageOptions}
          containerClassName="mb-0"
          noScroll
        />
      </div>

      {/* 4. البائعة المصممة */}
      <div className="pt-3 border-t border-surface-border">
        <Select
          label={t('storefront:products.seller')}
          value={filters.seller || ''}
          onChange={(e) => onFilterChange('seller', e.target.value)}
          options={sellerOptions}
          containerClassName="mb-0"
        />
      </div>

      {/* 5. المنتجات المتوفرة فقط */}
      <div className="pt-4 border-t border-surface-border">
        <Switch
          id="in-stock-filter"
          label={t('storefront:products.inStockOnly')}
          checked={!!filters.inStock}
          onChange={(e) => onFilterChange('inStock', e.target.checked)}
        />
      </div>

      {/* زر التطبيق للموبايل عند فتح الدرج السفلي */}
      {isMobileDrawer && (
        <div className="pt-6 border-t border-surface-border">
          <Button
            type="button"
            onClick={onApply}
            size="lg"
            className="w-full font-bold"
          >
            {t('storefront:products.applyFilters')}
          </Button>
        </div>
      )}
    </div>
  )
}
