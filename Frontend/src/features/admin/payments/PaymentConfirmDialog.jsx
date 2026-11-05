import { AlertCircle, CheckCircle2, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { PriceTag } from '../../../components/ui/PriceTag'

/**
 * نافذة تأكيد واعتماد إيصال تحويل فودافون كاش
 * تعرض ملخصاً شاملاً لبيانات التحويل، المبلغ الفعلي والمطلوب، ورقم المحفظة
 */
export function PaymentConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  payment,
  loading = false,
}) {
  const { t } = useTranslation('admin-core')

  if (!payment) return null

  // رصد أي اختلاف بين المبلغ المحول وإجمالي الطلب
  const hasMismatch =
    payment.total !== undefined &&
    payment.transferredAmount !== undefined &&
    Number(payment.transferredAmount) !== Number(payment.total)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showClose={!loading}
    >
      <div className="space-y-5 pt-1">
        {/* أيقونة وترويسة النافذة */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black text-lg text-text-main">
              {t('payments.confirmDialog.title')}
            </h3>
            <span
              dir="ltr"
              className="font-mono font-bold text-xs text-brand-orange-text dark:text-brand-orange [unicode-bidi:isolate]"
            >
              {payment.orderNumber}
            </span>
          </div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          {t('payments.confirmDialog.message')}
        </p>

        {/* تنبيه في حال وجود عدم تطابق بالمبلغ */}
        {hasMismatch && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-bold">{t('payments.mismatch.badge')}</p>
              <p className="mt-0.5 opacity-90">
                {t('payments.mismatch.tooltip', {
                  transferred: payment.transferredAmount,
                  expected: payment.total,
                })}
              </p>
            </div>
          </div>
        )}

        {/* بطاقة ملخص التحويل */}
        <div className="rounded-2xl bg-surface-subtle border border-surface-border p-4 text-xs space-y-2.5">
          <div className="flex justify-between items-center py-1 border-b border-surface-border/60">
            <span className="text-text-muted">{t('payments.confirmDialog.customer')}:</span>
            <span className="font-bold text-text-main">{payment.customerName}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-surface-border/60">
            <span className="text-text-muted">{t('payments.confirmDialog.senderPhone')}:</span>
            <span className="font-mono font-bold text-text-main inline-flex items-center gap-1" dir="ltr">
              <Phone className="w-3 h-3 text-brand-orange" />
              <span className="[unicode-bidi:isolate]">{payment.senderPhone}</span>
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-surface-border/60">
            <span className="text-text-muted">{t('payments.confirmDialog.reference')}:</span>
            <span className="font-mono font-bold text-text-main" dir="ltr">
              {payment.reference || '—'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-surface-border/60">
            <span className="text-text-muted">{t('payments.confirmDialog.expectedAmount')}:</span>
            <PriceTag amount={payment.total} size="sm" />
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-text-muted font-bold">{t('payments.confirmDialog.transferredAmount')}:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              <PriceTag amount={payment.transferredAmount} size="sm" />
            </span>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            {t('payments.confirmDialog.cancelButton')}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            className="flex-1 sm:flex-initial"
          >
            {t('payments.confirmDialog.confirmButton')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
