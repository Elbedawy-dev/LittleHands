import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Select } from '../../../components/ui/Select'
import { CATEGORIES } from '../../../config/constants'
import { useLanguage } from '../../../context/LanguageContext'
import { cn, getDisplayName } from '../../../utils'

/**
 * شريط تصفية وبحث الوسائل التعليمية للإدارة
 */
export function ProductFilters({
  sellers = [],
  selectedSeller,
  onSelectSeller,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
  counts = { all: 0 },
}) {
  const { t, i18n } = useTranslation('admin-manage')
  const { isRtl } = useLanguage()

  const sellerTabs = [
    { id: 'all', label: t('products.allSellers'), count: counts.all || 0 },
    ...sellers.map((s) => ({
      id: s.id || s._id,
      label: getDisplayName(s, i18n.language),
      count: counts[s.id || s._id] ?? (s.productsCount || 0),
    })),
  ]

  return (
    <div className="space-y-4">
      {/* 1. ألسنة تصفية البائعات */}
      <div className="flex items-center gap-2 p-1.5 rounded-full bg-surface-subtle/80 border border-surface-border w-fit max-w-full overflow-x-auto">
        {sellerTabs.map((tab) => {
          const isActive = selectedSeller === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectSeller(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange',
                isActive
                  ? 'bg-brand-orange text-white shadow-soft'
                  : 'text-text-muted hover:text-text-main hover:bg-surface'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold',
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-surface border border-surface-border text-text-muted'
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 2. حقول البحث والتصنيف والحالة */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* حقل البحث */}
        <div className="sm:col-span-6 lg:col-span-6 relative">
          <label htmlFor="admin-product-search" className="sr-only">
            {t('products.searchPlaceholder')}
          </label>
          <div className="absolute top-1/2 -translate-y-1/2 start-4 pointer-events-none text-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="admin-product-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className="w-full h-[52px] ps-11 pe-4 rounded-[16px] bg-surface border-[1.5px] border-surface-border text-text-main text-sm placeholder:text-text-muted/70 outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
          />
        </div>

        {/* تصفية التصنيف */}
        <div className="sm:col-span-3 lg:col-span-3">
          <Select
            aria-label={t('products.allCategories')}
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value)}
            placeholder={t('products.allCategories')}
            containerClassName="mb-0"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {isRtl ? cat.name : cat.nameEn}
              </option>
            ))}
          </Select>
        </div>

        {/* تصفية حالة النشر */}
        <div className="sm:col-span-3 lg:col-span-3">
          <Select
            aria-label={t('products.filterByStatus')}
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value)}
            placeholder=""
            containerClassName="mb-0"
          >
            <option value="all">{t('products.statusAll')}</option>
            <option value="published">{t('products.statusPublished')}</option>
            <option value="draft">{t('products.statusDraft')}</option>
          </Select>
        </div>
      </div>
    </div>
  )
}
