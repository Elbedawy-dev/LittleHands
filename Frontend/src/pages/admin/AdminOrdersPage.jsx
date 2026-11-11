import { Archive } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { AdminOrderDrawer } from '../../features/admin/orders/AdminOrderDrawer'
import { AdminOrderFilters } from '../../features/admin/orders/AdminOrderFilters'
import { AdminOrdersTable } from '../../features/admin/orders/AdminOrdersTable'
import { useDebounce } from '../../hooks/useDebounce'
import { orderService } from '../../services/orderService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة إدارة وتدقيق كافة طلبات المنصة
 * تتيح تصفية الطلبات، استعراض تفاصيل كل طلب، تدقيق نسب العمولات، تحديث الحالات، وحذف الطلبات غير المدفوعة
 */
export default function AdminOrdersPage() {
  const { t } = useTranslation('admin-core')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState(null)
  const [deletingOrder, setDeletingOrder] = useState(false)

  // التبويب: الطلبات النشطة مقابل الأرشيف
  const [archivedTab, setArchivedTab] = useState('active')
  const [isBulkArchiving, setIsBulkArchiving] = useState(false)

  // المرشحات
  const [filters, setFilters] = useState({
    status: 'all',
    seller: 'all',
    dateRange: 'all',
    q: '',
  })

  const debouncedSearch = useDebounce(filters.q, 300)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orderService.getAllOrders({
        archived: archivedTab === 'archived' ? 'true' : 'false',
      })
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getFriendlyError(err, t) || t('orders.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t, archivedTab])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleResetFilters = () => {
    setFilters({
      status: 'all',
      seller: 'all',
      dateRange: 'all',
      q: '',
    })
  }

  // تصفية الطلبات بناءً على المعايير المحددة
  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : []
    return safeOrders.filter((order) => {
      // 1. تصفية الحالة
      if (filters.status !== 'all' && order.status !== filters.status) {
        return false
      }

      // 2. تصفية البائعة
      if (filters.seller !== 'all') {
        const items = Array.isArray(order.items) ? order.items : []
        const hasSellerItem = items.some((it) => it.sellerId === filters.seller)
        if (!hasSellerItem) return false
      }

      // 3. تصفية النطاق الزمني
      if (filters.dateRange !== 'all') {
        const orderDate = new Date(order.createdAt)
        const now = new Date()
        const diffMs = now - orderDate
        const diffDays = diffMs / (1000 * 60 * 60 * 24)

        if (filters.dateRange === 'today' && diffDays > 1) return false
        if (filters.dateRange === 'this_week' && diffDays > 7) return false
        if (filters.dateRange === 'this_month' && diffDays > 30) return false
      }

      // 4. تصفية البحث النصي
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.trim().toLowerCase()
        const matchNumber = (order.number || '').toLowerCase().includes(query)
        const matchCustomer = (order.delivery?.name || '').toLowerCase().includes(query)
        const matchPhone = (order.delivery?.phone || '').includes(query)
        const matchNursery =
          order.delivery?.nurseryName &&
          order.delivery.nurseryName.toLowerCase().includes(query)

        if (!matchNumber && !matchCustomer && !matchPhone && !matchNursery) {
          return false
        }
      }

      return true
    })
  }, [orders, filters.status, filters.seller, filters.dateRange, debouncedSearch])

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setDrawerOpen(true)
  }

  const handleStatusUpdated = async () => {
    await fetchOrders()
    if (selectedOrder) {
      try {
        const updated = await orderService.getOrder(selectedOrder.id)
        setSelectedOrder(updated)
      } catch {
        // ignore
      }
    }
  }

  const unarchivedDeliveredCount = useMemo(() => {
    return orders.filter((o) => o.status === 'delivered' && !o.archivedAt).length
  }, [orders])

  const handleArchiveOrder = async (order) => {
    try {
      await orderService.archiveOrder(order.id)
      toast.success(t('orders.archive.successToast', { number: order.number }))
      await fetchOrders()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    }
  }

  const handleUnarchiveOrder = async (order) => {
    try {
      await orderService.unarchiveOrder(order.id)
      toast.success(t('orders.archive.unarchiveSuccessToast', { number: order.number }))
      await fetchOrders()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    }
  }

  const handleBulkArchive = async () => {
    const toArchive = orders.filter((o) => o.status === 'delivered' && !o.archivedAt)
    if (toArchive.length === 0) return
    setIsBulkArchiving(true)
    try {
      await Promise.all(toArchive.map((o) => orderService.archiveOrder(o.id)))
      toast.success(t('orders.archive.bulkArchiveSuccess'))
      await fetchOrders()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsBulkArchiving(false)
    }
  }

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return
    setDeletingOrder(true)
    try {
      await orderService.deleteOrder(orderToDelete.id)
      toast.success(t('orders.delete.successToast', { number: orderToDelete.number }))
      if (selectedOrder?.id === orderToDelete.id) {
        setDrawerOpen(false)
        setSelectedOrder(null)
      }
      setOrderToDelete(null)
      await fetchOrders()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setDeletingOrder(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('orders.title')}
        description={t('orders.description')}
      />

      {/* تبويبات الأرشفة وأزرار الإجراءات السريعة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-2xl bg-surface-subtle border border-surface-border">
          <button
            type="button"
            onClick={() => setArchivedTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              archivedTab === 'active'
                ? 'bg-surface text-brand-orange shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('orders.tabs.active')}
          </button>
          <button
            type="button"
            onClick={() => setArchivedTab('archived')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              archivedTab === 'archived'
                ? 'bg-surface text-brand-orange shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('orders.tabs.archived')}
          </button>
        </div>

        {archivedTab === 'active' && unarchivedDeliveredCount > 0 && (
          <button
            type="button"
            onClick={handleBulkArchive}
            disabled={isBulkArchiving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-surface border border-surface-border hover:border-brand-orange/40 text-text-main transition-colors cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5 text-brand-orange" />
            <span>{t('orders.archive.bulkArchiveBtn')} ({unarchivedDeliveredCount})</span>
          </button>
        )}
      </div>

      {/* مرشحات البحث والتصفية */}
      <AdminOrderFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* جدول الطلبات */}
      <AdminOrdersTable
        orders={filteredOrders}
        loading={loading}
        onViewOrder={handleViewOrder}
        onDeleteOrder={(order) => setOrderToDelete(order)}
        onArchiveOrder={handleArchiveOrder}
        onUnarchiveOrder={handleUnarchiveOrder}
      />

      {/* درج التفاصيل الشامل للطلب */}
      <AdminOrderDrawer
        order={selectedOrder}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusUpdated={handleStatusUpdated}
        onDeleteOrder={(order) => setOrderToDelete(order)}
      />

      {/* نافذة تأكيد الحذف النهائي */}
      <ConfirmDialog
        isOpen={Boolean(orderToDelete)}
        onClose={() => !deletingOrder && setOrderToDelete(null)}
        onConfirm={handleConfirmDeleteOrder}
        title={t('orders.delete.confirmTitle')}
        message={t('orders.delete.confirmMessage', { number: orderToDelete?.number || '' })}
        confirmText={t('orders.delete.confirmBtn')}
        cancelText={t('orders.delete.cancelBtn')}
        variant="danger"
        loading={deletingOrder}
      />
    </div>
  )
}
