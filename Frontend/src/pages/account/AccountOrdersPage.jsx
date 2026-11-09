import { ArrowLeft, Eye, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getGovernorateName } from '../../config/constants'
import { useLanguage } from '../../context/LanguageContext'
import { useFormat } from '../../hooks/useFormat'
import { orderService } from '../../services/orderService'
import { getFriendlyError, pickLocale } from '../../utils'

export default function AccountOrdersPage() {
  const { t } = useTranslation(['profile', 'common'])
  const { language } = useLanguage()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { formatDate, formatNumber } = useFormat()

  useEffect(() => {
    let mounted = true
    orderService
      .getMyOrders()
      .then((data) => {
        if (mounted) setOrders(data || [])
      })
      .catch((err) => {
        if (mounted) setError(getFriendlyError(err, t))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [t])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-36 rounded-[24px]" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card padding="lg">
        <EmptyState
          title={t('common:status.error')}
          description={error}
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-brand-orange text-white text-xs font-bold"
            >
              {t('common:status.retry')}
            </button>
          }
        />
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card padding="lg">
        <EmptyState
          title={t('profile:orders.emptyTitle')}
          description={t('profile:orders.emptyDesc')}
          icon={<ShoppingBag className="w-10 h-10 text-brand-orange/40" />}
          action={
            <Link to="/products">
              <button
                type="button"
                className="px-6 py-3 rounded-full bg-brand-orange text-white text-xs font-bold shadow-soft hover:bg-[#e07528] transition-colors cursor-pointer"
              >
                {t('profile:orders.browseProducts')}
              </button>
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-black text-text-main">
          {t('profile:orders.title')} ({formatNumber(orders.length)})
        </h2>
        <span className="text-xs text-text-muted">
          {t('profile:header.vodafonePaymentOnly')}
        </span>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const itemsCount =
            order.items?.reduce((sum, it) => sum + (it.qty || 1), 0) || 0
          return (
            <Card
              key={order.id}
              padding="lg"
              hoverLift
              className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5"
            >
              <div className="space-y-3 flex-1 min-w-0">
                {/* ترويسة البطاقة: رقم الطلب والحالة والتاريخ */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className="font-mono font-black text-base sm:text-lg text-text-main [unicode-bidi:isolate]"
                    dir="ltr"
                    data-user-content="true"
                  >
                    {order.number}
                  </span>
                  <StatusBadge status={order.status} size="sm" />
                  <span className="text-xs text-text-muted">
                    • {formatDate(order.createdAt)}
                  </span>
                </div>

                {/* مصغرات صور المنتجات في الطلب */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {order.items?.slice(0, 4).map((item, idx) => {
                    const itemName = pickLocale(item.name, language).text
                    return (
                      <div
                        key={idx}
                        className="w-12 h-12 rounded-xl overflow-hidden bg-surface-subtle border border-surface-border shrink-0 shadow-xs"
                        title={itemName}
                      >
                        <ProductImage
                          src={item.image}
                          alt={itemName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  })}

                  {order.items?.length > 4 && (
                    <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-surface-border flex items-center justify-center text-xs font-bold text-text-muted shrink-0">
                      +{order.items.length - 4}
                    </div>
                  )}

                  <span className="text-xs text-text-muted font-medium ms-2">
                    {formatNumber(itemsCount)} {t('profile:orders.itemsCount')}
                  </span>
                </div>

                {/* تفاصيل التوصيل المختصرة */}
                <div className="text-xs text-text-muted" data-user-content="true">
                  {getGovernorateName(order.delivery?.governorate, language)} — {order.delivery?.nurseryName || ''}
                </div>
              </div>

              {/* السعر وزر الانتقال للتفاصيل */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-surface-border shrink-0">
                <div className="text-start sm:text-end">
                  <span className="text-[11px] text-text-muted block">
                    {t('profile:orders.total')}:
                  </span>
                  <PriceTag amount={order.total} size="lg" />
                </div>

                <Link
                  to={`/account/orders/${order.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange-text dark:text-brand-orange font-bold text-xs transition-colors shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('profile:orders.viewDetails')}</span>
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
                </Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
