import { AlertCircle, RefreshCw, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
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
import { getFriendlyError } from '../../utils'

const extractItems = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []

function SectionErrorCard({ title, description, message, retryLabel, onRetry }) {
  return (
    <Card padding="lg" className="space-y-4">
      {title && (
        <div>
          <h3 className="font-heading font-black text-lg text-text-main">{title}</h3>
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{message}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          startIcon={<RefreshCw className="w-4 h-4" />}
          className="shrink-0"
        >
          {retryLabel}
        </Button>
      </div>
    </Card>
  )
}

/**
 * صفحة البائعات وأرباح المنصة (Admin Sellers & Earnings)
 * إدارة المستحقات المالية للبائعتين، حساب عمولة الوساطة (20٪)، وتسجيل حوالات فودافون كاش
 */
export default function AdminSellersPage() {
  const { t, i18n } = useTranslation(['admin-core', 'common'])
  const isEn = i18n.language === 'en'
  const { fetchNotifications } = useNotifications()

  const [sellers, setSellers] = useState([])
  const [sellersLoading, setSellersLoading] = useState(true)
  const [sellersError, setSellersError] = useState(null)

  const [payouts, setPayouts] = useState([])
  const [payoutsLoading, setPayoutsLoading] = useState(true)
  const [payoutsError, setPayoutsError] = useState(null)

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState(null)

  // حالة نافذة تسجيل التحويل
  const [payoutModalOpen, setPayoutModalOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false)

  // حالة نافذة إنشاء حساب بائعة جديدة
  const [createSellerModalOpen, setCreateSellerModalOpen] = useState(false)

  // حالة حذف حساب بائعة
  const [sellerToDelete, setSellerToDelete] = useState(null)
  const [isDeletingSeller, setIsDeletingSeller] = useState(false)

  const loadSection = useCallback(
    async ({ fetcher, setData, setLoading, setError, fallbackKey }) => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetcher()
        setData(extractItems(data))
      } catch (err) {
        setError(getFriendlyError(err, t) || t(fallbackKey))
      } finally {
        setLoading(false)
      }
    },
    [t]
  )

  const fetchSellers = useCallback(
    () =>
      loadSection({
        fetcher: () => earningsService.getSellersEarnings(),
        setData: setSellers,
        setLoading: setSellersLoading,
        setError: setSellersError,
        fallbackKey: 'sellers.cards.loadError',
      }),
    [loadSection]
  )

  const fetchPayouts = useCallback(
    () =>
      loadSection({
        fetcher: () => earningsService.getPayouts({ page: 1, pageSize: 50 }),
        setData: setPayouts,
        setLoading: setPayoutsLoading,
        setError: setPayoutsError,
        fallbackKey: 'sellers.history.loadError',
      }),
    [loadSection]
  )

  const fetchOrders = useCallback(
    () =>
      loadSection({
        fetcher: () => orderService.getAllOrders({ page: 1, pageSize: 50 }),
        setData: setOrders,
        setLoading: setOrdersLoading,
        setError: setOrdersError,
        fallbackKey: 'sellers.drilldown.loadError',
      }),
    [loadSection]
  )

  const fetchData = useCallback(async () => {
    await Promise.allSettled([fetchSellers(), fetchPayouts(), fetchOrders()])
  }, [fetchSellers, fetchPayouts, fetchOrders])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsSubmittingPayout(false)
    }
  }

  const handleToggleStatus = async (userId, newStatus) => {
    try {
      await adminService.updateUserStatus(userId, newStatus)
      toast.success(newStatus === 'active' ? t('sellers.statusActiveToast') : t('sellers.statusSuspendedToast'))
      await fetchData()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    }
  }

  const handleConfirmDeleteSeller = async () => {
    if (!sellerToDelete) return
    setIsDeletingSeller(true)
    try {
      const id = sellerToDelete.userId || sellerToDelete.sellerId || sellerToDelete.id
      await adminService.deleteUser(id)
      toast.success(t('sellers.deleteSuccess'))
      setSellerToDelete(null)
      await fetchData()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsDeletingSeller(false)
    }
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
        {sellersLoading ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-[24px]" />
            <Skeleton className="h-80 rounded-[24px]" />
          </div>
        ) : sellersError ? (
          <div className="mt-6">
            <SectionErrorCard
              message={sellersError}
              retryLabel={t('common:actions.retry')}
              onRetry={fetchSellers}
            />
          </div>
        ) : sellers.length === 0 ? (
          <div className="mt-6">
            <Card padding="lg">
              <p className="text-sm text-text-muted text-center">{t('sellers.cards.empty')}</p>
            </Card>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sellers.map((seller) => (
              <AdminSellerCard
                key={seller.sellerId || seller.id}
                seller={seller}
                onRecordPayout={handleOpenPayoutModal}
                onToggleStatus={handleToggleStatus}
                onDeleteSeller={(s) => setSellerToDelete(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* جدول تدقيق مبيعات وعمولات البائعات بالتفصيل (Orders Drilldown) */}
      {ordersError ? (
        <SectionErrorCard
          title={t('sellers.drilldown.title')}
          description={t('sellers.drilldown.description')}
          message={ordersError}
          retryLabel={t('common:actions.retry')}
          onRetry={fetchOrders}
        />
      ) : (
        <AdminSellerOrdersDrilldown orders={orders} sellers={sellers} loading={ordersLoading} />
      )}

      {/* سجل التحويلات الصادرة السابقة */}
      {payoutsError ? (
        <SectionErrorCard
          title={t('sellers.history.title')}
          description={t('sellers.history.description')}
          message={payoutsError}
          retryLabel={t('common:actions.retry')}
          onRetry={fetchPayouts}
        />
      ) : (
        <AdminPayoutsHistoryTable payouts={payouts} loading={payoutsLoading} />
      )}

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

      {/* نافذة تأكيد حذف حساب البائعة */}
      <ConfirmDialog
        isOpen={Boolean(sellerToDelete)}
        onClose={() => !isDeletingSeller && setSellerToDelete(null)}
        onConfirm={handleConfirmDeleteSeller}
        title={t('sellers.deleteConfirmTitle')}
        message={t('sellers.deleteConfirmMessage')}
        confirmText={t('sellers.deleteConfirmBtn')}
        cancelText={t('sellers.cancel', 'إلغاء')}
        variant="danger"
        loading={isDeletingSeller}
        requireWord={isEn ? 'DELETE' : 'حذف'}
      />
    </div>
  )
}
