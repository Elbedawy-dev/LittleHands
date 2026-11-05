import { AlertTriangle, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Modal } from '../../../components/ui/Modal'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { REJECT_REASONS } from '../../../config/constants'

/**
 * نافذة رفض إيصال تحويل فودافون كاش
 * تتيح تحديد سبب الرفض، كتابة ملاحظات تفصيلية للعميلة، وخيار إرسال إشعار فوري
 */
export function PaymentRejectModal({
  isOpen,
  onClose,
  onReject,
  payment,
  loading = false,
}) {
  const { t } = useTranslation('admin-core')
  const [reason, setReason] = useState(REJECT_REASONS[0])
  const [notes, setNotes] = useState('')
  const [notifyClient, setNotifyClient] = useState(true)

  if (!payment) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onReject({
      reason,
      notes,
      notify: notifyClient,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showClose={!loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* أيقونة وترويسة النافذة */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black text-lg text-text-main">
              {t('payments.rejectModal.title')}
            </h3>
            <span
              dir="ltr"
              className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400 [unicode-bidi:isolate]"
            >
              {payment.orderNumber}
            </span>
          </div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          {t('payments.rejectModal.subtitle')}
        </p>

        {/* حقل اختيار سبب الرفض */}
        <Select
          id="admin-reject-reason"
          label={t('payments.rejectModal.reasonLabel')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          required
        >
          {REJECT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>

        {/* حقل الملاحظات التفصيلية للعميلة */}
        <Textarea
          id="admin-reject-notes"
          label={t('payments.rejectModal.notesLabel')}
          placeholder={t('payments.rejectModal.notesPlaceholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={loading}
        />

        {/* مربع اختيار إرسال إشعار للعميلة */}
        <div className="pt-1">
          <Checkbox
            id="admin-reject-notify"
            checked={notifyClient}
            onChange={(e) => setNotifyClient(e.target.checked)}
            label={t('payments.rejectModal.notifyCheckbox')}
            disabled={loading}
          />
        </div>

        {/* أزرار الإجراءات */}
        <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 sm:flex-initial"
          >
            {t('payments.rejectModal.cancelButton')}
          </Button>

          <Button
            type="submit"
            variant="danger"
            loading={loading}
            className="flex-1 sm:flex-initial gap-1.5"
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
            <span>{t('payments.rejectModal.rejectButton')}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
