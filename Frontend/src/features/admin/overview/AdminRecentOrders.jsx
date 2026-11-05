import { ArrowLeft, ArrowRight, Eye, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { PriceTag } from '../../../components/ui/PriceTag'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useLanguage } from '../../../context/LanguageContext'
import { useFormat } from '../../../hooks/useFormat'

/**
 * قائمة مصغرة بأحدث الطلبيات الواردة من دور الحضانة في لوحة تحكم الإدارة
 */
export function AdminRecentOrders({ orders = [], loading = false }) {
  const { t } = useTranslation('admin-core')
  const { formatDate } = useFormat()
  const { isRtl } = useLanguage()

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
        <div>
          <h3 className="font-heading font-black text-lg text-text-main">
            {t('overview.recentOrders.title')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('overview.recentOrders.description')}
          </p>
        </div>

        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline"
        >
          <span>{t('overview.recentOrders.viewAll')}</span>
          <ArrowIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-2xl bg-surface-subtle animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-8 text-center text-text-muted">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-xs">{t('overview.recentOrders.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-border">
          {orders.slice(0, 5).map((order) => (
            <div
              key={order.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-surface-subtle/30 -mx-2 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-subtle flex items-center justify-center shrink-0 text-text-muted">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      dir="ltr"
                      className="font-mono font-bold text-text-main text-xs sm:text-sm [unicode-bidi:isolate]"
                    >
                      {order.number}
                    </span>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    <span className="font-medium text-text-main">{order.delivery.name}</span>
                    {order.delivery.nurseryName && (
                      <span className="ms-1 opacity-80">• {order.delivery.nurseryName}</span>
                    )}
                    <span className="ms-1 opacity-60">({formatDate(order.createdAt)})</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 ps-12 sm:ps-0">
                <PriceTag amount={order.total} size="sm" />
                <Link
                  to="/admin/orders"
                  className="p-1.5 rounded-full hover:bg-surface-subtle text-text-muted hover:text-text-main transition-colors"
                  aria-label={t('overview.recentOrders.viewAll')}
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
