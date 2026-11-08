import {
  Eye,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { OrderDetailsDrawer } from '../../features/seller'
import { useFormat } from '../../hooks/useFormat'
import { orderService } from '../../services/orderService'
import { calcCommission } from '../../utils'

/**
 * صفحة إدارة ومتابعة طلبات الوسائل التعليمية للبائعة
 * Displays orders list with filters, search, drawer details, timeline,
 * and preparation/shipping lifecycle actions.
 * Strictly scoped to the authenticated seller and hides customer payment screenshots.
 */
export default function SellerOrdersPage() {
  const { t } = useTranslation('seller')
  const { user } = useAuth()
  const sellerId = user?.id || ''
  const { formatMoney, formatDate, formatNumber } = useFormat()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // التصفية والبحث
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // الطلب المختار لعرض تفاصيله بالدرج
  const [selectedOrder, setSelectedOrder] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await orderService.getSellerOrders({
        status: statusFilter,
        q: searchQuery,
      })

      // فلترة المنتجات الخاصة بهذه البائعة فقط
      const myOrders = data.filter((o) =>
        (o.items || []).some((item) => !item.sellerId || item.sellerId === sellerId)
      )
      setOrders(myOrders)
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }, [sellerId, statusFilter, searchQuery])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // التصفية الفورية بالبحث السريع
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders
    const q = searchQuery.toLowerCase().trim()
    return orders.filter(
      (o) =>
        o.number.toLowerCase().includes(q) ||
        (o.delivery?.name && o.delivery.name.toLowerCase().includes(q)) ||
        (o.delivery?.nurseryName && o.delivery.nurseryName.toLowerCase().includes(q)) ||
        (o.delivery?.phone && o.delivery.phone.includes(q))
    )
  }, [orders, searchQuery])

  // تحديث حالة الطلب
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderService.setSellerOrderStatus(orderId, newStatus)
      await fetchOrders()
      const updated = await orderService.getOrder(orderId)
      setSelectedOrder(updated)
    } catch (err) {
      alert(err.message || 'لا يمكن تحديث حالة الطلب')
    }
  }

  // حالة التحميل الهيكلي (Skeleton)
  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-2xl" />
        <div className="flex gap-4">
          <Skeleton className="h-12 flex-1 rounded-2xl" />
          <Skeleton className="h-12 w-48 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ترويسة الصفحة */}
      <PageHeader
        title={t('orders.title')}
        description={t('orders.subtitle')}
      />

      {/* شريط البحث وتصفية الحالات */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* حقل البحث */}
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('orders.search_placeholder')}
              startIcon={<Search className="w-4 h-4" />}
              containerClassName="mb-0"
            />
          </div>

          {/* تصفية الحالة */}
          <div className="w-full sm:w-60 shrink-0">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              containerClassName="mb-0"
            >
              <option value="all">{t('orders.filter_all')}</option>
              <option value="pending_payment">{t('orders.filter_pending_payment')}</option>
              <option value="payment_confirmed">{t('orders.filter_payment_confirmed')}</option>
              <option value="preparing">{t('orders.filter_preparing')}</option>
              <option value="shipped">{t('orders.filter_shipped')}</option>
              <option value="delivered">{t('orders.filter_delivered')}</option>
            </Select>
          </div>
        </div>

        {/* عدد الطلبات المطابقة */}
        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-surface-border">
          <span className="font-bold">
            {t('orders.matching_count', { count: formatNumber(filteredOrders.length) })}
          </span>
        </div>
      </Card>

      {/* عرض الخطأ إن وجد */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* في حال عدم وجود طلبات */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          title={t('orders.empty_title')}
          description={t('orders.empty_desc')}
          icon={<ShoppingBag className="w-10 h-10 text-brand-orange" />}
        />
      ) : (
        <>
          {/* عرض الجدول للشاشات الكبيرة (Desktop Table) */}
          <div className="hidden md:block">
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-start align-middle text-xs">
                  <thead>
                    <tr className="bg-surface-subtle text-text-muted font-bold border-b border-surface-border">
                      <th className="py-3.5 px-4 rounded-s-xl text-start whitespace-nowrap">{t('orders.col_order')}</th>
                      <th className="py-3.5 px-4 text-start whitespace-nowrap">{t('orders.col_product')}</th>
                      <th className="py-3.5 px-4 text-start whitespace-nowrap">{t('orders.col_qty')}</th>
                      <th className="py-3.5 px-4 text-start whitespace-nowrap">{t('orders.col_price')}</th>
                      <th className="py-3.5 px-4 text-start whitespace-nowrap">{t('orders.col_commission')}</th>
                      <th className="py-3.5 px-4 text-start whitespace-nowrap">{t('orders.col_net')}</th>
                      <th className="py-3.5 px-4 text-start whitespace-nowrap">{t('orders.col_status')}</th>
                      <th className="py-3.5 px-4 rounded-e-xl text-end whitespace-nowrap">{t('orders.col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {filteredOrders.map((ord) => {
                      const myItems = (ord.items || []).filter(
                        (it) => !it.sellerId || it.sellerId === sellerId
                      )
                      const myQty = myItems.reduce((acc, it) => acc + (it.qty || 1), 0)
                      const myGross = myItems.reduce(
                        (acc, it) => acc + (it.unitPrice || 0) * (it.qty || 1),
                        0
                      )
                      const { commission: ordCommission, net: ordNet } = calcCommission(myGross)
                      const firstItem = myItems[0]

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-surface-subtle/50 transition-colors"
                        >
                          {/* رقم الطلب */}
                          <td className="py-4 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                            <bdi dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                              {ord.number}
                            </bdi>
                            <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                              {formatDate(ord.createdAt)}
                            </span>
                          </td>

                          {/* المنتج / الوسيلة */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 shrink-0">
                                <ProductImage
                                  src={firstItem?.image}
                                  alt={firstItem?.name || ''}
                                  aspectRatio="1/1"
                                  className="rounded-xl"
                                />
                              </div>
                              <div className="max-w-[200px]">
                                <span className="font-bold text-text-main block truncate">
                                  {firstItem?.name || t('orders.default_aid')}
                                </span>
                                <span className="text-[11px] text-text-muted block truncate mt-0.5">
                                  {ord.delivery?.nurseryName || ord.delivery?.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* الكمية */}
                          <td className="py-4 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                            {formatNumber(myQty)}
                          </td>

                          {/* سعر البيع */}
                          <td className="py-4 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                            <PriceTag amount={myGross} size="sm" />
                          </td>

                          {/* عمولة المنصة 20% */}
                          <td className="py-4 px-4 font-mono text-brand-orange-text dark:text-brand-orange whitespace-nowrap">
                            {formatMoney(ordCommission)}
                          </td>

                          {/* صافي لكِ */}
                          <td className="py-4 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatMoney(ordNet)}
                          </td>

                          {/* الحالة */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <StatusBadge status={ord.status} size="sm" />
                          </td>

                          {/* الإجراءات */}
                          <td className="py-4 px-4 text-end whitespace-nowrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedOrder(ord)}
                              className="whitespace-nowrap px-3 py-1.5 h-auto text-xs"
                              startIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              {t('orders.view_details')}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* العرض في الشاشات الصغيرة (Mobile Cards) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredOrders.map((ord) => {
              const myItems = (ord.items || []).filter(
                (it) => !it.sellerId || it.sellerId === sellerId
              )
              const myQty = myItems.reduce((acc, it) => acc + (it.qty || 1), 0)
              const myGross = myItems.reduce(
                (acc, it) => acc + (it.unitPrice || 0) * (it.qty || 1),
                0
              )
              const { commission: ordCommission, net: ordNet } = calcCommission(myGross)
              const firstItem = myItems[0]

              return (
                <Card key={ord.id} padding="md" className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <bdi
                      dir="ltr"
                      className="font-mono font-bold text-xs text-text-main"
                      style={{ unicodeBidi: 'isolate' }}
                    >
                      {ord.number}
                    </bdi>
                    <StatusBadge status={ord.status} size="sm" />
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 shrink-0">
                      <ProductImage
                        src={firstItem?.image}
                        alt={firstItem?.name || ''}
                        aspectRatio="1/1"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-text-main truncate">
                        {firstItem?.name || 'وسيلة تعليمية'}
                      </h4>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {ord.delivery?.nurseryName || ord.delivery?.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted mt-1">
                        <span>الكمية: {myQty}</span>
                        <span>•</span>
                        <span>{formatDate(ord.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted block">سعر البيع</span>
                      <span className="font-mono font-bold text-text-main">
                        {formatMoney(myGross)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-text-muted block">عمولة 20%</span>
                      <span className="font-mono text-brand-orange-text dark:text-brand-orange">
                        {formatMoney(ordCommission)}
                      </span>
                    </div>

                    <div className="text-end">
                      <span className="text-[10px] text-text-muted block">صافي لكِ</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(ordNet)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center text-xs h-10"
                      onClick={() => setSelectedOrder(ord)}
                      startIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      {t('orders.view_details')}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* درج التفاصيل الكامل للطلب */}
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
