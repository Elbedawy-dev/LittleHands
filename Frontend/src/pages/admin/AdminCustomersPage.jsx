import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { CustomerListTable, CustomerStats } from '../../features/admin/customers'
import { adminService } from '../../services/adminService'
import { orderService } from '../../services/orderService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة قاعدة بيانات العملاء والحضانات المشتركة (للقراءة فقط)
 */
export default function AdminCustomersPage() {
  const { t } = useTranslation('admin-manage')

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  // حالات البحث والتصفية
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGovernorate, setSelectedGovernorate] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadCustomersData() {
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

        if (isMounted) {
          setCustomers(enriched)
        }
      } catch (err) {
        toast.error(getFriendlyError(err, t))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadCustomersData()

    return () => {
      isMounted = false
    }
  }, [t])

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
      />
    </div>
  )
}
