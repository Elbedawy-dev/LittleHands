import { Send, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { Textarea } from '../../../components/ui/Textarea'
import { getDisplayName } from '../../../utils'

/**
 * نافذة تسجيل تحويل مالي لصالح البائعة الحرفية عبر فودافون كاش
 * تلزم بالتحقق من أن المبلغ لا يتجاوز الرصيد المستحق فعلياً
 */
export function AdminPayoutModal({
  isOpen,
  onClose,
  onSubmit,
  seller,
  loading = false,
}) {
  const { t, i18n } = useTranslation('admin-core')

  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  // إعادة ضبط النموذج عند فتح النافذة
  useEffect(() => {
    if (seller && isOpen) {
      setAmount(seller.pendingBalance ? String(seller.pendingBalance) : '')
      setReference('')
      setDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setError('')
    }
  }, [seller, isOpen])

  if (!seller) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(t('sellers.payoutModal.errorMin'))
      return
    }

    if (numAmount > seller.pendingBalance) {
      setError(t('sellers.payoutModal.errorMax'))
      return
    }

    onSubmit({
      sellerId: seller.sellerId,
      amount: numAmount,
      reference: reference.trim(),
      date,
      notes: notes.trim(),
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
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-heading font-black text-lg text-text-main">
              {t('sellers.payoutModal.title', {
                name: getDisplayName({ id: seller.sellerId, sellerId: seller.sellerId, name: seller.sellerName, nameEn: seller.nameEn }, i18n.language),
              })}
            </h3>
            <span
              dir="ltr"
              className="font-mono font-bold text-xs text-text-muted [unicode-bidi:isolate]"
            >
              {seller.walletNumber || seller.phone}
            </span>
          </div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          {t('sellers.payoutModal.description')}
        </p>

        {/* حقل إدخال المبلغ */}
        <div>
          <Input
            id="admin-payout-amount"
            label={t('sellers.payoutModal.amount')}
            type="number"
            min="1"
            max={seller.pendingBalance}
            step="1"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError('')
            }}
            hint={t('sellers.payoutModal.maxAmountHint', {
              amount: seller.pendingBalance,
            })}
            error={error}
            required
            disabled={loading}
          />
        </div>

        {/* حقل الرقم المرجعي لفودافون كاش */}
        <div>
          <Input
            id="admin-payout-reference"
            label={t('sellers.payoutModal.reference')}
            placeholder={t('sellers.payoutModal.referencePlaceholder')}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* حقل تاريخ التحويل */}
        <div>
          <Input
            id="admin-payout-date"
            label={t('sellers.payoutModal.date')}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* حقل الملاحظات */}
        <div>
          <Textarea
            id="admin-payout-notes"
            label={t('sellers.payoutModal.notes')}
            placeholder={t('sellers.payoutModal.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
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
            {t('sellers.payoutModal.cancel')}
          </Button>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="flex-1 sm:flex-initial gap-1.5"
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
            <span>{t('sellers.payoutModal.submit')}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
