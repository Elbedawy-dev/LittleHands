import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Plus,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { CommissionInfoCard, OrderDetailsDrawer, SalesChart } from '../../features/seller'
import { useFormat } from '../../hooks/useFormat'
import { earningsService } from '../../services/earningsService'
import { orderService } from '../../services/orderService'
import { calcCommission, getDisplayName, getFriendlyError } from '../../utils'

/**
 * لوحة التحكم الرئيسية للبائعة الحرفية
 * Seller Overview Dashboard with StatCards, SalesChart, Recent Orders, and Commission Info.
 * The seller only ever sees HER OWN data.
 */
export default function SellerOverviewPage() {
  const { t, i18n } = useTranslation('seller')
  const { user } = useAuth()
  const sellerId = user?.id || ''
  const sellerName = getDisplayName(user, i18n.language) || (i18n.language === 'en' ? 'First Seller' : 'البائعة الأولى')
  const { formatMoney, formatNumber } = useFormat()

  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, ords] = await Promise.all([
        earningsService.getSellerOverview(sellerId),
        orderService.getSellerOrders(),
      ])

      // تصفية الطلبات الخاصة بهذه البائعة فقط
      const myOrders = ords.filter((o) =>
        (o.items || []).some((item) => !item.sellerId || item.sellerId === sellerId)
      )

      setOverview(ov)
      setOrders(myOrders)
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [sellerId, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  // احتساب الإحصائيات عبر دالة calcCommission
  const grossSales = overview?.grossSales || 0
  const { commission: platformCommission, net: netEarnings } = calcCommission(grossSales)
  const newOrdersCount = orders.filter(
    (o) => o.status === 'pending_payment' || o.status === 'payment_confirmed' || o.status === 'preparing'
  ).length

  // تحديث حالة الطلب من الدرج
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderService.setSellerOrderStatus(orderId, newStatus)
      await loadData()
      // تحديث الطلب المفتوح
      const updated = await orderService.getOrder(orderId)
      setSelectedOrder(updated)
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    }
  }

  // حالة التحميل الهيكلي (Skeleton)
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-72 rounded-2xl" />
          <Skeleton className="h-12 w-44 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  // حالة الخطأ
  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-surface border border-rose-200 dark:border-rose-900/50 text-center space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-heading font-black text-lg text-text-main">حدث خطأ أثناء تحميل البيانات</h3>
        <p className="text-sm text-text-muted">{error}</p>
        <Button variant="primary" onClick={loadData}>
          إعادة المحاولة
        </Button>
      </div>
    )
  }

  const recentOrders = orders.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* ترويسة الصفحة والترحيب */}
      <PageHeader
        title={t('overview.welcome', { name: sellerName })}
        description={t('overview.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <Link to="/seller/products/new">
              <Button
                variant="primary"
                className="whitespace-nowrap px-6 h-12 rounded-full shadow-soft"
                startIcon={<Plus className="w-4 h-4" />}
              >
                {t('overview.add_aid')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* بطاقة الشفافية والعمولة 20% */}
      <CommissionInfoCard />

      {/* بطاقات المؤشرات الأربعة الرئيسية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* إجمالي المبيعات */}
        <StatCard
          title={t('overview.stats.total_sales')}
          value={<PriceTag amount={grossSales} size="lg" />}
          icon={<TrendingUp className="w-6 h-6" />}
          subtitle={t('overview.stats.total_sales_sub')}
        />

        {/* الطلبات الجديدة */}
        <StatCard
          title={t('overview.stats.new_orders')}
          value={<span className="font-mono font-bold">{newOrdersCount}</span>}
          icon={<ShoppingBag className="w-6 h-6 text-brand-sky" />}
          subtitle={t('overview.stats.new_orders_sub')}
        />

        {/* عمولة المنصة 20% */}
        <StatCard
          title={t('overview.stats.platform_cut')}
          value={<PriceTag amount={platformCommission} size="lg" />}
          icon={<Wallet className="w-6 h-6 text-brand-orange" />}
          subtitle={t('overview.stats.platform_cut_sub')}
        />

        {/* صافي الأرباح 80% */}
        <StatCard
          title={t('overview.stats.net_earnings')}
          value={
            <span className="text-emerald-600 dark:text-emerald-400 font-black">
              <PriceTag amount={netEarnings} size="lg" />
            </span>
          }
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          subtitle={t('overview.stats.net_earnings_sub')}
          className="border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10"
        />
      </div>

      {/* الرسم البياني التفاعلي للمبيعات */}
      <SalesChart orders={orders} />

      {/* جدول أحدث الطلبات */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div>
            <h3 className="font-heading font-black text-lg text-text-main">
              {t('overview.recent_orders.title')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {t('overview.recent_orders.subtitle')}
            </p>
          </div>

          <Link
            to="/seller/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange hover:underline select-none"
          >
            <span>{t('overview.recent_orders.view_all')}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            title={t('overview.recent_orders.empty')}
            description={t('overview.recent_orders.empty_desc')}
            icon={<ShoppingBag className="w-8 h-8 text-brand-orange" />}
          />
        ) : (
          <div className="overflow-x-auto overscroll-contain modal-scrollbar">
            <table className="w-full text-start align-middle text-xs">
              <thead>
                <tr className="bg-surface-subtle text-text-muted font-bold border-b border-surface-border">
                  <th className="py-3 px-4 rounded-s-xl text-start whitespace-nowrap">
                    {t('overview.recent_orders.col_order')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('overview.recent_orders.col_product')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('overview.recent_orders.col_customer')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('overview.recent_orders.col_price')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('overview.recent_orders.col_commission')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('overview.recent_orders.col_net')}
                  </th>
                  <th className="py-3 px-4 rounded-e-xl text-start whitespace-nowrap">
                    {t('overview.recent_orders.col_status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {recentOrders.map((ord) => {
                  const myItems = (ord.items || []).filter(
                    (it) => !it.sellerId || it.sellerId === sellerId
                  )
                  const myGross = myItems.reduce(
                    (acc, it) => acc + (it.unitPrice || 0) * (it.qty || 1),
                    0
                  )
                  const { commission: ordCommission, net: ordNet } = calcCommission(myGross)
                  const firstItem = myItems[0]

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      className="hover:bg-surface-subtle/50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                        <bdi dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                          {ord.number}
                        </bdi>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0">
                            <ProductImage
                              src={firstItem?.image}
                              alt={firstItem?.name || ''}
                              aspectRatio="1/1"
                              className="rounded-lg"
                            />
                          </div>
                          <div className="max-w-[200px]">
                            <span className="font-bold text-text-main block truncate">
                              {firstItem?.name || t('overview.recent_orders.default_aid')}
                            </span>
                            {myItems.length > 1 && (
                              <span className="text-[10px] text-text-muted">
                                {t('overview.recent_orders.extra_items', {
                                  count: formatNumber(myItems.length - 1),
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-text-main block truncate max-w-[160px]">
                          {ord.delivery?.nurseryName || ord.delivery?.name || '—'}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {ord.delivery?.governorate || ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                        {formatMoney(myGross)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-brand-orange-text dark:text-brand-orange whitespace-nowrap">
                        {formatMoney(ordCommission)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatMoney(ordNet)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={ord.status} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* درج تفاصيل الطلب */}
      <OrderDetailsDrawer
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        sellerId={sellerId}
        onStatusUpdate={handleStatusUpdate}
      />
    </div>
  )
}
