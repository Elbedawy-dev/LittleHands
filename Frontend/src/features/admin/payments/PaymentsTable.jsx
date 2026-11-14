import {
  AlertCircle,
  Check,
  Eye,
  Phone,
  ShieldAlert,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { DataTable } from '../../../components/ui/DataTable'
import { Lightbox } from '../../../components/ui/Lightbox'
import { PriceTag } from '../../../components/ui/PriceTag'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useFormat } from '../../../hooks/useFormat'
import { usePrivateReceipt } from '../../../hooks/usePrivateReceipt'

/**
 * جدول فودافون كاش المتجاوب لإدارة وتدقيق الإيصالات
 * يدعم عرض تنبيه عدم تطابق المبلغ، شارات التحذير الأمنية، معاينة الإيصال عبر Lightbox مع الدعم للبث الموثق
 */
export function PaymentsTable({
  payments = [],
  loading = false,
  onApprove,
  onReject,
}) {
  const { t, i18n } = useTranslation('admin-core')
  const isEn = i18n.language === 'en'
  const { formatDate } = useFormat()
  const [activeReceiptTarget, setActiveReceiptTarget] = useState(null)
  const { imageUrl: privateReceiptUrl } = usePrivateReceipt(activeReceiptTarget)

  const columns = [
    {
      header: t('payments.table.orderNumber'),
      key: 'orderNumber',
      render: (p) => (
        <span
          dir="ltr"
          className="font-mono font-bold text-xs sm:text-sm text-text-main [unicode-bidi:isolate] whitespace-nowrap"
        >
          {p.orderNumber}
        </span>
      ),
    },
    {
      header: t('payments.table.customer'),
      key: 'customerName',
      render: (p) => (
        <div>
          <span className="font-bold text-text-main block">{p.customerName}</span>
          <span
            dir="ltr"
            className="text-[11px] text-text-muted font-mono mt-0.5 inline-flex items-center gap-1 [unicode-bidi:isolate]"
          >
            <Phone className="w-3 h-3 text-brand-orange inline shrink-0" />
            <span>{p.senderPhone}</span>
          </span>
        </div>
      ),
    },
    {
      header: t('payments.table.expectedTotal'),
      key: 'total',
      render: (p) => <PriceTag amount={p.total} size="sm" />,
    },
    {
      header: t('payments.table.transferredAmount'),
      key: 'transferredAmount',
      render: (p) => {
        const hasMismatch =
          p.total !== undefined &&
          p.transferredAmount !== undefined &&
          Number(p.transferredAmount) !== Number(p.total)

        const flags = p.flags || []
        const flagLabels = {
          amount_mismatch: isEn ? 'Amount Mismatch' : 'المبلغ غير مطابق',
          duplicate_reference: isEn ? 'Duplicate Reference' : 'الرقم المرجعي مكرر',
          duplicate_screenshot: isEn ? 'Duplicate Receipt' : 'صورة الإيصال مكررة',
        }

        return (
          <div className="space-y-1">
            <span
              className={
                hasMismatch
                  ? 'font-bold text-rose-600 dark:text-rose-400'
                  : 'font-semibold text-text-main'
              }
            >
              <PriceTag amount={p.transferredAmount} size="sm" />
            </span>

            {hasMismatch && !flags.includes('amount_mismatch') && (
              <Badge variant="danger" size="sm" className="gap-1 flex items-center">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{t('payments.mismatch.badge')}</span>
              </Badge>
            )}

            {flags.map((flag) => (
              <Badge key={flag} variant="danger" size="sm" className="gap-1 flex items-center">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                <span>{flagLabels[flag] || flag}</span>
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      header: t('payments.table.reference'),
      key: 'reference',
      render: (p) => (
        <span dir="ltr" className="font-mono text-xs text-text-muted [unicode-bidi:isolate]">
          {p.reference || '—'}
        </span>
      ),
    },
    {
      header: t('payments.table.receipt'),
      key: 'screenshotUrl',
      render: (p) =>
        p.screenshotUrl || p.id || p.orderId ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setActiveReceiptTarget(p.id || p.orderId)}
            startIcon={<Eye className="w-3.5 h-3.5" />}
            className="cursor-zoom-in"
          >
            {t('payments.table.viewReceipt')}
          </Button>
        ) : (
          <span className="text-text-muted text-xs">{t('payments.table.noReceipt')}</span>
        ),
    },
    {
      header: t('payments.table.submittedAt'),
      key: 'submittedAt',
      render: (p) => (
        <span className="text-xs text-text-muted block whitespace-nowrap">
          {p.submittedAt ? formatDate(p.submittedAt) : '—'}
        </span>
      ),
    },
    {
      header: t('payments.table.status'),
      key: 'status',
      render: (p) => {
        const statusMap = {
          confirmed: 'payment_confirmed',
          rejected: 'payment_rejected',
          pending: 'pending_payment',
        }
        return <StatusBadge status={statusMap[p.status] || p.status} size="sm" />
      },
    },
    {
      header: t('payments.table.actions'),
      key: 'actions',
      sortable: false,
      render: (p) => {
        if (p.status !== 'pending') {
          return (
            <div className="text-xs text-text-muted">
              <span>{t('payments.table.reviewed')}</span>
              {p.rejectReason && (
                <span className="block text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                  ({p.rejectReason})
                </span>
              )}
            </div>
          )
        }

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onApprove(p)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
              title={t('payments.table.approve')}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{t('payments.table.approve')}</span>
            </button>

            <button
              type="button"
              onClick={() => onReject(p)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
              title={t('payments.table.reject')}
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
              <span>{t('payments.table.reject')}</span>
            </button>
          </div>
        )
      },
    },
  ]

  // تصميم بطاقات الموبايل المكدسة (تمنع التمرير الأفقي تماماً على الهواتف)
  const renderMobileCard = (p) => {
    const hasMismatch =
      p.total !== undefined &&
      p.transferredAmount !== undefined &&
      Number(p.transferredAmount) !== Number(p.total)

    const statusMap = {
      confirmed: 'payment_confirmed',
      rejected: 'payment_rejected',
      pending: 'pending_payment',
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-surface-border">
          <span
            dir="ltr"
            className="font-mono font-bold text-sm text-text-main [unicode-bidi:isolate]"
          >
            {p.orderNumber}
          </span>
          <StatusBadge status={statusMap[p.status] || p.status} size="sm" />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">{t('payments.table.customer')}:</span>
          <span className="font-bold text-text-main">{p.customerName}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">{t('payments.table.senderPhone')}:</span>
          <span dir="ltr" className="font-mono font-medium text-text-main [unicode-bidi:isolate]">
            {p.senderPhone}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted">{t('payments.table.expectedTotal')}:</span>
          <PriceTag amount={p.total} size="sm" />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-text-muted font-bold">{t('payments.table.transferredAmount')}:</span>
          <div className="text-end">
            <span
              className={
                hasMismatch
                  ? 'font-bold text-rose-600 dark:text-rose-400'
                  : 'font-semibold text-text-main'
              }
            >
              <PriceTag amount={p.transferredAmount} size="sm" />
            </span>
            {hasMismatch && (
              <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                {t('payments.mismatch.badge')}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center text-xs pt-1">
          <span className="text-text-muted">{t('payments.table.reference')}:</span>
          <span dir="ltr" className="font-mono text-text-main [unicode-bidi:isolate]">
            {p.reference || '—'}
          </span>
        </div>

        {p.screenshotUrl && (
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveReceiptTarget(p.id || p.orderId)}
              startIcon={<Eye className="w-3.5 h-3.5" />}
              className="w-full cursor-zoom-in"
            >
              {t('payments.table.viewReceipt')}
            </Button>
          </div>
        )}

        {p.status === 'pending' && (
          <div className="pt-3 border-t border-surface-border flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onApprove(p)}
              startIcon={<Check className="w-3.5 h-3.5" />}
              className="flex-1 gap-1 text-xs"
            >
              {t('payments.table.approve')}
            </Button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onReject(p)}
              startIcon={<X className="w-3.5 h-3.5" />}
              className="flex-1 gap-1 text-xs"
            >
              {t('payments.table.reject')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        renderMobileCard={renderMobileCard}
        keyExtractor={(p) => p.orderId}
        emptyTitle={t('payments.empty')}
      />

      {/* معاينة صورة الإيصال مكبرة مع دعم البث الموثق */}
      <Lightbox
        isOpen={Boolean(activeReceiptTarget)}
        onClose={() => setActiveReceiptTarget(null)}
        src={privateReceiptUrl}
        alt="إيصال فودافون كاش"
      />
    </>
  )
}
