import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { AdminOrderDrawer } from '../../features/admin/orders/AdminOrderDrawer'
import { AdminOrderFilters } from '../../features/admin/orders/AdminOrderFilters'
import { AdminOrdersTable } from '../../features/admin/orders/AdminOrdersTable'
import { useDebounce } from '../../hooks/useDebounce'
import { orderService } from '../../services/orderService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة إدارة وتدقيق كافة طلبات المنصة
 * تتيح تصفية الطلبات، استعراض تفاصيل كل طلب، تدقيق نسب العمولات، وتحديث الحالات
 */
export default function AdminOrdersPage() {
  const { t } = useTranslation('admin-core')

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      const data = await orderService.getAllOrders()
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders:', err)
      toast.error(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

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
    return orders.filter((order) => {
      // 1. تصفية الحالة
      if (filters.status !== 'all' && order.status !== filters.status) {
        return false
      }

      // 2. تصفية البائعة
      if (filters.seller !== 'all') {
        const hasSellerItem = order.items.some((it) => it.sellerId === filters.seller)
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
        const matchNumber = order.number.toLowerCase().includes(query)
        const matchCustomer = order.delivery.name.toLowerCase().includes(query)
        const matchPhone = order.delivery.phone.includes(query)
        const matchNursery =
          order.delivery.nurseryName &&
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
    // تحديث بيانات الطلب المعروض في الدرج
    if (selectedOrder) {
      try {
        const updated = await orderService.getOrder(selectedOrder.id)
        setSelectedOrder(updated)
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('orders.title')}
        description={t('orders.description')}
      />

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
      />

      {/* درج التفاصيل الشامل للطلب */}
      <AdminOrderDrawer
        order={selectedOrder}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusUpdated={handleStatusUpdated}
      />
    </div>
  )
}
