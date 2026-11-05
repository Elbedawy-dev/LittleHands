import { RotateCcw, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { ORDER_STATUS, PLATFORM_CONFIG } from '../../../config/constants'
import { getDisplayName } from '../../../utils'

/**
 * شريط تصفية وبحث الطلبات في لوحة تحكم الإدارة
 * يدعم التصفية حسب الحالة، البائعة الحرفية، النطاق الزمني، والبحث النصي
 */
export function AdminOrderFilters({
  filters,
  onChange,
  onReset,
}) {
  const { t, i18n } = useTranslation('admin-core')
  const isEn = i18n.language === 'en'

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.seller !== 'all' ||
    filters.dateRange !== 'all' ||
    Boolean(filters.q)

  return (
    <Card padding="md">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* البحث برقم الطلب أو اسم العميلة */}
        <div>
          <Input
            id="admin-orders-search"
            value={filters.q}
            onChange={(e) => onChange('q', e.target.value)}
            placeholder={t('orders.filters.search')}
            startIcon={<Search className="w-4 h-4 text-text-muted" />}
            clearable
            onClear={() => onChange('q', '')}
          />
        </div>

        {/* تصفية حالة الطلب */}
        <div>
          <Select
            id="admin-orders-status-filter"
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
          >
            <option value="all">{t('orders.filters.allStatuses')}</option>
            {Object.entries(ORDER_STATUS).map(([key, item]) => (
              <option key={key} value={key}>
                {isEn ? (item.labelEn || item.label) : item.label}
              </option>
            ))}
          </Select>
        </div>

        {/* تصفية البائعة الحرفية */}
        <div>
          <Select
            id="admin-orders-seller-filter"
            value={filters.seller}
            onChange={(e) => onChange('seller', e.target.value)}
          >
            <option value="all">{t('orders.filters.allSellers')}</option>
            {PLATFORM_CONFIG.SELLERS.map((s) => (
              <option key={s.id} value={s.id}>
                {getDisplayName(s, i18n.language)}
              </option>
            ))}
          </Select>
        </div>

        {/* تصفية النطاق الزمني + زر إعادة التعيين */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              id="admin-orders-date-filter"
              value={filters.dateRange}
              onChange={(e) => onChange('dateRange', e.target.value)}
            >
              <option value="all">{t('orders.filters.allDates')}</option>
              <option value="today">{t('orders.filters.today')}</option>
              <option value="this_week">{t('orders.filters.thisWeek')}</option>
              <option value="this_month">{t('orders.filters.thisMonth')}</option>
            </Select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="p-3 rounded-2xl border border-surface-border hover:bg-surface-subtle text-text-muted hover:text-text-main transition-colors shrink-0"
              title={isEn ? 'Reset filters' : 'إعادة تعيين المرشحات'}
              aria-label={isEn ? 'Reset filters' : 'إعادة تعيين المرشحات'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
