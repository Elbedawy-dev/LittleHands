import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { CustomerListTable, CustomerStats } from '../../features/admin/customers'
import { adminService } from '../../services/adminService'
import { orderService } from '../../services/orderService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة قاعدة بيانات العملاء والحضانات المشتركة
 */
export default function AdminCustomersPage() {
  const { t, i18n } = useTranslation('admin-manage')
  const isEn = i18n.language === 'en'

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // حالات البحث والتصفية
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGovernorate, setSelectedGovernorate] = useState('')

  // حالة حذف عميلة
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)

  const loadCustomersData = useCallback(async () => {
    try {
      setLoading(true)
      const [customerList, allOrders] = await Promise.all([
        adminService.getCustomers(),
        orderService.getAllOrders().catch(() => []),
      ])

      const safeCustomers = Array.isArray(customerList)
        ? customerList
        : Array.isArray(customerList?.items)
        ? customerList.items
        : []
      const safeOrders = Array.isArray(allOrders) ? allOrders : []

      // إثراء بيانات كل عميلة بتاريخ آخر طلب
      const enriched = safeCustomers.map((c) => {
        const userOrders = safeOrders
          .filter((o) => o.customerId === c.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        const lastOrderDate = userOrders[0]?.createdAt || null

        return {
          ...c,
          lastOrderDate,
        }
      })

      setCustomers(enriched)
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadCustomersData()
  }, [loadCustomersData])

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return
    setIsDeletingCustomer(true)
    try {
      await adminService.deleteUser(customerToDelete.id)
      toast.success(t('customers.deleteSuccess'))
      setCustomerToDelete(null)
      await loadCustomersData()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsDeletingCustomer(false)
    }
  }

  // تصفية العميلات حسب البحث والمحافظة
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // تصفية المحافظة
      if (selectedGovernorate && c.governorate !== selectedGovernorate) {
        return false
      }

      // تصفية البحث النصي
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const matchesName = c.name?.toLowerCase().includes(query)
        const matchesNursery = c.nurseryName?.toLowerCase().includes(query)
        const matchesPhone = c.phone?.includes(query)
        const matchesEmail = c.email?.toLowerCase().includes(query)
        const matchesGov = c.governorate?.toLowerCase().includes(query)
        if (!matchesName && !matchesNursery && !matchesPhone && !matchesEmail && !matchesGov) {
          return false
        }
      }

      return true
    })
  }, [customers, selectedGovernorate, searchQuery])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers.title')}
        description={t('customers.description')}
      />

      {/* بطاقات الإحصائيات العامة للحضانات */}
      <CustomerStats customers={customers} />

      {/* جدول وبطاقات العميلات */}
      <CustomerListTable
        customers={filteredCustomers}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGovernorate={selectedGovernorate}
        onSelectGovernorate={setSelectedGovernorate}
        onDeleteCustomer={(c) => setCustomerToDelete(c)}
      />

      {/* نافذة تأكيد حذف حساب العميلة */}
      <ConfirmDialog
        isOpen={Boolean(customerToDelete)}
        onClose={() => !isDeletingCustomer && setCustomerToDelete(null)}
        onConfirm={handleConfirmDeleteCustomer}
        title={t('customers.deleteTitle')}
        message={t('customers.deleteMessage', { name: customerToDelete?.name || '' })}
        confirmText={t('customers.deleteConfirmBtn')}
        cancelText={t('customers.cancel', 'إلغاء')}
        variant="danger"
        loading={isDeletingCustomer}
        requireWord={isEn ? 'DELETE' : 'حذف'}
      />
    </div>
  )
}
