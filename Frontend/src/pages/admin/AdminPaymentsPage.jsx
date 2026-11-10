import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Tabs } from '../../components/ui/Tabs'
import { useNotifications } from '../../context/NotificationContext'
import { PaymentConfirmDialog } from '../../features/admin/payments/PaymentConfirmDialog'
import { PaymentRejectModal } from '../../features/admin/payments/PaymentRejectModal'
import { PaymentsTable } from '../../features/admin/payments/PaymentsTable'
import { useDebounce } from '../../hooks/useDebounce'
import { paymentService } from '../../services/paymentService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة إدارة ومراجعة مدفوعات فودافون كاش
 * تتيح لمالك المنصة تدقيق الإيصالات، التحقق من تطابق المبالغ، وتأكيد أو رفض التحويلات
 */
export default function AdminPaymentsPage() {
  const { t } = useTranslation('admin-core')
  const { fetchNotifications } = useNotifications()

  const [allPayments, setAllPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'confirmed' | 'rejected' | 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  // حالة النوافذ المنبثقة
  const [confirmDialogPayment, setConfirmDialogPayment] = useState(null)
  const [rejectModalPayment, setRejectModalPayment] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await paymentService.getPayments({ status: 'all' })
      setAllPayments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load payments:', err)
      toast.error(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // حساب الأعداد لكل تبويب
  const counts = useMemo(() => {
    return {
      all: allPayments.length,
      pending: allPayments.filter((p) => p.status === 'pending').length,
      confirmed: allPayments.filter((p) => p.status === 'confirmed').length,
      rejected: allPayments.filter((p) => p.status === 'rejected').length,
    }
  }, [allPayments])

  // التصفية بحسب التبويب النشط ومصطلح البحث
  const filteredPayments = useMemo(() => {
    let list = [...allPayments]

    if (activeTab !== 'all') {
      list = list.filter((p) => p.status === activeTab)
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.orderNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          (p.senderPhone && p.senderPhone.includes(q)) ||
          (p.reference && p.reference.toLowerCase().includes(q))
      )
    }

    return list
  }, [allPayments, activeTab, debouncedSearch])

  // تنفيذ تأكيد الدفع
  const handleConfirmPayment = async () => {
    if (!confirmDialogPayment) return
    setIsProcessing(true)
    try {
      await paymentService.confirmPayment(confirmDialogPayment.orderId)
      toast.success(
        t('payments.confirmDialog.successToast', {
          number: confirmDialogPayment.orderNumber,
        })
      )
      setConfirmDialogPayment(null)
      await fetchPayments()
      fetchNotifications()
    } catch (err) {
      console.error('Failed to confirm payment:', err)
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsProcessing(false)
    }
  }

  // تنفيذ رفض الدفع
  const handleRejectPayment = async ({ reason, notes, notify }) => {
    if (!rejectModalPayment) return
    setIsProcessing(true)
    try {
      await paymentService.rejectPayment(rejectModalPayment.orderId, {
        reason,
        notes,
        notify,
      })
      toast.success(
        t('payments.rejectModal.successToast', {
          number: rejectModalPayment.orderNumber,
        })
      )
      setRejectModalPayment(null)
      await fetchPayments()
      fetchNotifications()
    } catch (err) {
      console.error('Failed to reject payment:', err)
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsProcessing(false)
    }
  }

  const tabs = [
    {
      id: 'pending',
      label: t('payments.tabs.pending'),
      badge: counts.pending,
    },
    {
      id: 'confirmed',
      label: t('payments.tabs.confirmed'),
      badge: counts.confirmed,
    },
    {
      id: 'rejected',
      label: t('payments.tabs.rejected'),
      badge: counts.rejected,
    },
    {
      id: 'all',
      label: t('payments.tabs.all'),
      badge: counts.all,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('payments.title')}
        description={t('payments.description')}
      />

      {/* عناصر التحكم والتصفية: التبويبات والبحث */}
      <Card padding="md" className="space-y-4 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-w-0">
          <div className="w-full lg:w-auto overflow-x-auto min-w-0 pb-1 lg:pb-0">
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id)}
              variant="pills"
            />
          </div>

          <div className="w-full lg:w-80 shrink-0">
            <Input
              id="search-payments-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('payments.searchPlaceholder')}
              startIcon={<Search className="w-4 h-4 text-text-muted" />}
              clearable
              onClear={() => setSearchQuery('')}
            />
          </div>
        </div>
      </Card>

      {/* جدول البيانات */}
      <PaymentsTable
        payments={filteredPayments}
        loading={loading}
        onApprove={(p) => setConfirmDialogPayment(p)}
        onReject={(p) => setRejectModalPayment(p)}
      />

      {/* نافذة تأكيد الإيصال */}
      <PaymentConfirmDialog
        isOpen={Boolean(confirmDialogPayment)}
        onClose={() => setConfirmDialogPayment(null)}
        onConfirm={handleConfirmPayment}
        payment={confirmDialogPayment}
        loading={isProcessing}
      />

      {/* نافذة رفض الإيصال وتحديد السبب */}
      <PaymentRejectModal
        isOpen={Boolean(rejectModalPayment)}
        onClose={() => setRejectModalPayment(null)}
        onReject={handleRejectPayment}
        payment={rejectModalPayment}
        loading={isProcessing}
      />
    </div>
  )
}
