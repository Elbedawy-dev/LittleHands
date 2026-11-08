import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ORDER_STATUS } from '../../config/constants'
import { useFormat } from '../../hooks/useFormat'
import { StatusBadge } from '../ui/StatusBadge'

// Translation helper for standard reason codes
const REASON_CODES = {
  amount_mismatch: { ar: 'المبلغ المحول غير مطابق لقيمة الطلب', en: 'Transferred amount does not match total' },
  invalid_reference: { ar: 'الرقم المرجعي غير صحيح أو غير موجود', en: 'Invalid or missing reference number' },
  duplicate_receipt: { ar: 'صورة الإيصال مستخدمة في طلب سابق', en: 'Receipt image already used in a previous order' },
  unclear_receipt: { ar: 'صورة الإيصال غير واضحة', en: 'Unclear or unreadable receipt image' },
  customer_cancelled: { ar: 'تم الإلغاء بواسطة العميل', en: 'Cancelled by customer' },
  out_of_stock: { ar: 'الكمية المطلوبة غير متوفرة', en: 'Item out of stock' },
  delayed_payment: { ar: 'تأخر سداد قيمة الطلب', en: 'Payment deadline expired' },
  other: { ar: 'أسباب أخرى', en: 'Other reason' },
}

export function translateReason(code, fallback, isEn) {
  if (!code && !fallback) return ''
  if (code && REASON_CODES[code]) {
    return isEn ? REASON_CODES[code].en : REASON_CODES[code].ar
  }
  return fallback || code
}

export function OrderTimeline({ timeline = [] }) {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const { formatDateTime } = useFormat()

  if (!timeline || timeline.length === 0) {
    return null
  }

  return (
    <div className="py-2">
      <div className="relative ps-6 border-s-2 border-brand-orange/30 space-y-6">
        {timeline.map((entry, index) => {
          const isLatest = index === timeline.length - 1
          const statusConfig = ORDER_STATUS[entry.status] || {
            label: entry.status,
            labelEn: entry.status,
          }
          const localizedTitle = isEn
            ? (statusConfig.labelEn || statusConfig.label)
            : statusConfig.label

          const note = translateReason(
            entry.reasonCode || entry.rejectReasonCode || entry.cancelReasonCode,
            entry.note || entry.description || '',
            isEn
          )

          const timeVal = entry.at || entry.timestamp

          return (
            <div key={index} className="relative group">
              {/* أيقونة النقطة على الخط الزمني */}
              <div className="absolute -start-[31px] top-0.5 w-6 h-6 rounded-full bg-surface border-2 border-brand-orange flex items-center justify-center">
                {entry.status === 'cancelled' || entry.status === 'payment_rejected' ? (
                  <XCircle className="w-4 h-4 text-rose-500 stroke-[2.5]" />
                ) : isLatest ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-orange stroke-[3]" />
                ) : (
                  <Circle className="w-2.5 h-2.5 fill-brand-orange text-brand-orange" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-text-main">
                    {localizedTitle}
                  </span>
                  {entry.status && (
                    <StatusBadge status={entry.status} size="sm" />
                  )}
                </div>

                {note && (
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed bg-surface-subtle/50 px-2.5 py-1 rounded-lg border border-surface-border/50 inline-block">
                    {note}
                  </p>
                )}

                {timeVal && (
                  <time className="text-[11px] text-text-muted font-medium block mt-1">
                    {formatDateTime(timeVal)}
                  </time>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default OrderTimeline
