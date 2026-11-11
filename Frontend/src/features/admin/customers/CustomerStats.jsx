import { Building2, FileText, ShoppingBag, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { useFormat } from '../../../hooks/useFormat'

/**
 * بطاقات الإحصائيات لشبكة الحضانات والعملاء
 */
export function CustomerStats({ customers = [] }) {
  const { t, i18n } = useTranslation('admin-manage')
  const isEn = i18n.language === 'en'
  const { formatNumber } = useFormat()

  // إجمالي العميلات
  const totalCount = customers.length

  // عدد الحضانات والروضات النشطة
  const nurseriesCount = customers.filter(
    (c) => c.nurseryName && c.nurseryName.trim().length > 0
  ).length

  // إجمالي الطلبات التي تم إنشاؤها من كافة العميلات
  const totalOrders = customers.reduce((sum, c) => sum + (c.ordersCount || 0), 0)

  // إجمالي طلبات التفصيل الخاصة
  const totalCustomRequests = customers.reduce((sum, c) => sum + (c.customRequestsCount || 0), 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. إجمالي المعلمات والحضانات */}
      <Card variant="default" padding="md" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {t('customers.stats.totalCustomers')}
          </span>
          <span className="text-2xl font-black font-heading text-text-main mt-0.5 block">
            {formatNumber(totalCount)}
          </span>
        </div>
      </Card>

      {/* 2. دور الحضانة والروضات */}
      <Card variant="default" padding="md" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-mint/15 text-brand-mint flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {t('customers.stats.activeNurseries')}
          </span>
          <span className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {formatNumber(nurseriesCount)}
          </span>
        </div>
      </Card>

      {/* 3. إجمالي الطلبيات المسجلة */}
      <Card variant="default" padding="md" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {t('customers.stats.totalOrders')}
          </span>
          <span className="text-2xl font-black font-heading text-sky-600 dark:text-sky-400 mt-0.5 block">
            {formatNumber(totalOrders)}
          </span>
        </div>
      </Card>

      {/* 4. إجمالي طلبات التفصيل الخاصة */}
      <Card variant="default" padding="md" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {isEn ? 'Custom Requests' : 'طلبات خاصة'}
          </span>
          <span className="text-2xl font-black font-heading text-amber-600 dark:text-amber-400 mt-0.5 block">
            {formatNumber(totalCustomRequests)}
          </span>
        </div>
      </Card>
    </div>
  )
}
