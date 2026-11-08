import { CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ORDER_STATUS } from '../../config/constants'
import { cn } from '../../utils'

/**
 * شارة حالة الطلب الرسمية
 */
export function StatusBadge({ status, size = 'md', className }) {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const statusConfig = ORDER_STATUS[status] || {
    label: status,
    labelEn: status,
    bgLight: 'bg-surface-subtle text-text-muted border-surface-border',
  }

  const icons = {
    pending_payment: <Clock className="w-3.5 h-3.5" />,
    payment_confirmed: <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />,
    preparing: <Package className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />,
    shipped: <Truck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
    delivered: <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />,
    payment_rejected: <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
    cancelled: <XCircle className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />,
  }

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
    lg: 'text-sm px-4 py-1.5 gap-2',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold border whitespace-nowrap shadow-xs',
        statusConfig.bgLight,
        sizes[size] || sizes.md,
        className
      )}
    >
      {icons[status] || null}
      <span>{isEn ? (statusConfig.labelEn || statusConfig.label) : statusConfig.label}</span>
    </span>
  )
}
