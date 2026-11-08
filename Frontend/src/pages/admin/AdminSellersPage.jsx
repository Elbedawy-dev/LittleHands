import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { useNotifications } from '../../context/NotificationContext'
import { AdminPayoutModal } from '../../features/admin/sellers/AdminPayoutModal'
import { AdminPayoutsHistoryTable } from '../../features/admin/sellers/AdminPayoutsHistoryTable'
import { AdminSellerCard } from '../../features/admin/sellers/AdminSellerCard'
import { AdminSellerOrdersDrilldown } from '../../features/admin/sellers/AdminSellerOrdersDrilldown'
import { CreateSellerModal } from '../../features/admin/sellers/CreateSellerModal'
import { earningsService } from '../../services/earningsService'
import { orderService } from '../../services/orderService'

import { adminService } from '../../services/adminService'

/**
 * صفحة البائعات وأرباح المنصة (Admin Sellers & Earnings)
 * إدارة المستحقات المالية للبائعتين، حساب عمولة الوساطة (20٪)، وتسجيل حوالات فودافون كاش
 */
export default function AdminSellersPage() {
  const { t } = useTranslation('admin-core')
  const { fetchNotifications } = useNotifications()

  const [sellers, setSellers] = useState([])
  const [payouts, setPayouts] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // حالة نافذة تسجيل التحويل
  const [payoutModalOpen, setPayoutModalOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false)

  // حالة نافذة إنشاء حساب بائعة جديدة
  const [createSellerModalOpen, setCreateSellerModalOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sellersData, payoutsData, ordersData] = await Promise.all([
        earningsService.getSellersEarnings(),
        earningsService.getPayouts(),
        orderService.getAllOrders(),
      ])
      setSellers(sellersData)
      setPayouts(payoutsData)
      setOrders(ordersData)
    } catch (err) {
      console.error('Failed to load sellers earnings:', err)
      toast.error('حدث خطأ أثناء تحميل بيانات البائعات والأرباح')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenPayoutModal = (seller) => {
    setSelectedSeller(seller)
    setPayoutModalOpen(true)
  }

  const handleRecordPayout = async ({ sellerId, amount, reference, date, notes }) => {
    setIsSubmittingPayout(true)
    try {
      await earningsService.recordPayout({
        sellerId,
        amount,
        reference,
        date,
        notes,
      })

      toast.success(
        t('sellers.payoutModal.successToast', {
          amount,
        })
      )

      setPayoutModalOpen(false)
      setSelectedSeller(null)
      await fetchData()
      fetchNotifications()
    } catch (err) {
      console.error('Failed to record payout:', err)
      toast.error(err.message || 'تعذر تسجيل التحويل')
    } finally {
      setIsSubmittingPayout(false)
    }
  }

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      await adminService.updateUserStatus(userId, newStatus)
      toast.success(newStatus === 'active' ? 'تم تفعيل حساب البائعة بنجاح' : 'تم إيقاف حساب البائعة')
      await fetchData()
    } catch (err) {
      toast.error(err.message || 'فشل تحديث حالة الحساب')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-[24px]" />
        <Skeleton className="h-[52px] rounded-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-[24px]" />
          <Skeleton className="h-80 rounded-[24px]" />
        </div>
        <Skeleton className="h-72 rounded-[24px]" />
        <Skeleton className="h-72 rounded-[24px]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title={t('sellers.title')}
          description={t('sellers.description')}
        />

        {/* زر إنشاء حساب بائعة جديدة بكامل العرض */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setCreateSellerModalOpen(true)}
            aria-label={t('sellers.createAccount.button')}
            className="w-full h-[52px] px-6 rounded-full bg-gradient-to-r from-brand-orange to-[#ff9e59] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-soft hover-lift cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface transition-all select-none"
          >
            <UserPlus className="w-5 h-5 shrink-0" />
            <span className="whitespace-nowrap">{t('sellers.createAccount.button')}</span>
          </button>
        </div>

        {/* بطاقات البائعات الحرفيات */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sellers.map((seller) => (
            <AdminSellerCard
              key={seller.sellerId || seller.id}
              seller={seller}
              onRecordPayout={handleOpenPayoutModal}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      </div>

      {/* جدول تدقيق مبيعات وعمولات البائعات بالتفصيل (Orders Drilldown) */}
      <AdminSellerOrdersDrilldown orders={orders} loading={loading} />

      {/* سجل التحويلات الصادرة السابقة */}
      <AdminPayoutsHistoryTable payouts={payouts} loading={loading} />

      {/* نافذة تسجيل تحويل أرباح جديدة */}
      <AdminPayoutModal
        isOpen={payoutModalOpen}
        onClose={() => {
          setPayoutModalOpen(false)
          setSelectedSeller(null)
        }}
        onSubmit={handleRecordPayout}
        seller={selectedSeller}
        loading={isSubmittingPayout}
      />

      {/* نافذة إنشاء حساب بائعة جديدة */}
      <CreateSellerModal
        isOpen={createSellerModalOpen}
        onClose={() => setCreateSellerModalOpen(false)}
        onSuccess={async () => {
          await fetchData()
          fetchNotifications()
        }}
      />
    </div>
  )
}
