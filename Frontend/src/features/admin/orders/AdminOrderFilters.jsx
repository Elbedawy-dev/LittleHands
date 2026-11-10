import { RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { ORDER_STATUS } from '../../../config/constants'
import { adminService } from '../../../services/adminService'
import { getDisplayName } from '../../../utils'

/**
 * شريط تصفية وبحث الطلبات في لوحة تحكم الإدارة
 * يدعم التصفية حسب الحالة، البائعة الحرفية (ديناميكياً من API)، النطاق الزمني، والبحث النصي
 */
export function AdminOrderFilters({
  filters,
  onChange,
  onReset,
  sellers: sellersProp,
}) {
  const { t, i18n } = useTranslation(['admin-core', 'common'])
  const isEn = i18n.language === 'en'
  const [sellers, setSellers] = useState([])

  useEffect(() => {
    if (Array.isArray(sellersProp)) {
      setSellers(sellersProp)
      return
    }
    let mounted = true
    adminService
      .getSellerAccounts()
      .then((list) => {
        if (mounted) {
          setSellers(Array.isArray(list) ? list : [])
        }
      })
      .catch(() => {
        if (mounted) setSellers([])
      })
    return () => {
      mounted = false
    }
  }, [sellersProp])

  const safeSellers = Array.isArray(sellersProp)
    ? sellersProp
    : Array.isArray(sellers)
      ? sellers
      : []

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
            {safeSellers.map((s) => {
              const sid = s.id || s._id
              const sLabel = getDisplayName(s, i18n.language) || s.name || sid
              return (
                <option key={sid} value={sid}>
                  {sLabel}
                </option>
              )
            })}
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
              title={t('common:actions.reset')}
              aria-label={t('common:actions.reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
