import {
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  Phone,
  Receipt,
  RotateCcw,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { OrderTimeline } from '../../../components/order/OrderTimeline'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Drawer } from '../../../components/ui/Drawer'
import { Input } from '../../../components/ui/Input'
import { Lightbox } from '../../../components/ui/Lightbox'
import { Modal } from '../../../components/ui/Modal'
import { PriceTag } from '../../../components/ui/PriceTag'
import { ProductImage } from '../../../components/ui/ProductImage'
import { Select } from '../../../components/ui/Select'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Tooltip } from '../../../components/ui/Tooltip'
import { ORDER_STATUS } from '../../../config/constants'
import { useFormat } from '../../../hooks/useFormat'
import { usePrivateReceipt } from '../../../hooks/usePrivateReceipt'
import { orderService } from '../../../services/orderService'
import { calcCommission, getDisplayName, getFriendlyError } from '../../../utils'

const ADMIN_DELETABLE_STATUSES = ['pending_payment', 'payment_rejected', 'cancelled']

/**
 * درج التفاصيل المتقدم للطلب (Admin Order Details Drawer)
 * يعرض بيانات العميلة، والوسائل مجمعة بحسب البائعة، وجدول توزيع العمولة (20٪) وصافي البائعة (80٪)
 * ومعاينة إيصال فودافون كاش ومسار الطلب الزمني وإجراءات رد المبالغ وحذف الطلبات غير المدفوعة
 */
export function AdminOrderDrawer({
  order,
  isOpen,
  onClose,
  onStatusUpdated,
  onDeleteOrder,
}) {
  const { t, i18n } = useTranslation(['admin-core', 'common'])
  const isEn = i18n.language === 'en'
  const { formatDateTime } = useFormat()
  const [activeReceiptTarget, setActiveReceiptTarget] = useState(null)
  const { imageUrl: privateReceiptUrl } = usePrivateReceipt(activeReceiptTarget)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // حالة نافذة رد المبلغ
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundRef, setRefundRef] = useState('')
  const [refundNote, setRefundNote] = useState('')
  const [isRefunding, setIsRefunding] = useState(false)

  if (!order) return null

  const orderItems = Array.isArray(order.items) ? order.items : []
  const canDelete = ADMIN_DELETABLE_STATUSES.includes(order.status)

  // بناء خريطة أسماء البائعات المترجمة
  const sellerNamesMap = orderItems.reduce((acc, it) => {
    if (it.sellerId) {
      acc[it.sellerId] =
        getDisplayName(
          {
            id: it.sellerId,
            sellerId: it.sellerId,
            name: it.sellerName,
            nameEn: it.sellerNameEn,
            displayName: it.sellerDisplayName,
          },
          i18n.language
        ) || it.sellerId
    }
    return acc
  }, {})

  // تجميع المنتجات حسب البائعة
  const itemsBySeller = orderItems.reduce((acc, item) => {
    const sId = item.sellerId || ''
    if (!acc[sId]) acc[sId] = []
    acc[sId].push(item)
    return acc
  }, {})

  // حساب مجاميع جدول العمولات لجميع عناصر الطلب
  const breakdownRows = orderItems.map((item) => {
    const salePrice = item.unitPrice * item.qty
    const { commission, net } = calcCommission(salePrice)
    const sellerTitle =
      sellerNamesMap[item.sellerId] || item.sellerId || ''

    return {
      ...item,
      salePrice,
      commission,
      net,
      sellerTitle,
    }
  })

  const totalBreakdown = breakdownRows.reduce(
    (acc, row) => ({
      salePrice: acc.salePrice + row.salePrice,
      commission: acc.commission + row.commission,
      net: acc.net + row.net,
    }),
    { salePrice: 0, commission: 0, net: 0 }
  )

  // معالجة تغيير حالة الطلب من الإدارة
  const handleStatusChange = async (newStatus) => {
    if (newStatus === order.status) return
    setIsUpdatingStatus(true)
    try {
      await orderService.updateOrderStatus(order.id, newStatus)
      toast.success(t('orders.drawer.statusUpdateSuccess'))
      if (onStatusUpdated) onStatusUpdated()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // معالجة تسجيل رد المبلغ للعميل
  const handleRefundSubmit = async (e) => {
    e.preventDefault()
    if (!refundRef.trim()) {
      toast.error(t('orders.drawer.refundReferenceRequired'))
      return
    }

    setIsRefunding(true)
    try {
      await orderService.adminRefundOrder(order.id, {
        reference: refundRef.trim(),
        note: refundNote.trim(),
      })
      toast.success(t('orders.drawer.refundSuccessToast'))
      setRefundModalOpen(false)
      setRefundRef('')
      setRefundNote('')
      if (onStatusUpdated) onStatusUpdated()
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsRefunding(false)
    }
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        side="end"
        size="lg"
        title={
          <div className="flex items-center gap-3">
            <span className="font-heading font-black text-lg text-text-main">
              {t('orders.drawer.title')}
            </span>
            <span
              dir="ltr"
              className="font-mono font-bold text-sm text-brand-orange-text dark:text-brand-orange [unicode-bidi:isolate]"
            >
              {order.number}
            </span>
          </div>
        }
      >
        <div className="p-6 space-y-6 overflow-y-auto overscroll-contain modal-scrollbar max-h-[calc(100vh-140px)]">
          {/* شريط الحالة والتحكم السريع بالحالة وحذف الطلب */}
          <div className="p-4 rounded-2xl bg-surface-subtle border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-text-muted block mb-1">
                {t('orders.drawer.statusUpdate')}
              </span>
              <StatusBadge status={order.status} size="md" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:w-52">
                <Select
                  id="admin-order-status-selector"
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
                >
                  {Object.entries(ORDER_STATUS).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {isEn ? (cfg.labelEn || cfg.label) : cfg.label}
                    </option>
                  ))}
                </Select>
              </div>

              {onDeleteOrder && (
                canDelete ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteOrder(order)}
                    startIcon={<Trash2 className="w-4 h-4" />}
                    className="shrink-0"
                  >
                    {t('orders.delete.action')}
                  </Button>
                ) : (
                  <Tooltip content={t('orders.delete.disabledTooltip')} position="bottom">
                    <span tabIndex={0} className="inline-flex shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled
                        startIcon={<Trash2 className="w-4 h-4" />}
                        className="text-rose-400 dark:text-rose-500/50 border-surface-border"
                        aria-label={t('orders.delete.disabledTooltip')}
                      >
                        {t('orders.delete.action')}
                      </Button>
                    </span>
                  </Tooltip>
                )
              )}
            </div>
          </div>

          {/* بطاقة بيانات العميلة ومقر الحضانة */}
          <div className="p-4 rounded-2xl bg-surface-subtle border border-surface-border space-y-3">
            <h4 className="font-bold text-xs text-text-muted flex items-center gap-1.5">
              <User className="w-4 h-4 text-brand-orange" />
              <span>{t('orders.drawer.customerInfo')}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-muted block">{t('orders.drawer.name')}:</span>
                <span className="font-bold text-text-main text-sm">{order.delivery?.name}</span>
              </div>

              <div>
                <span className="text-text-muted block">{t('orders.drawer.phone')}:</span>
                <span dir="ltr" className="font-mono font-bold text-text-main inline-flex items-center gap-1 [unicode-bidi:isolate]">
                  <Phone className="w-3 h-3 text-brand-orange" />
                  <span>{order.delivery?.phone}</span>
                </span>
              </div>

              {order.delivery?.nurseryName && (
                <div>
                  <span className="text-text-muted block">{t('orders.drawer.nursery')}:</span>
                  <span className="font-medium text-text-main">{order.delivery.nurseryName}</span>
                </div>
              )}

              <div>
                <span className="text-text-muted block">{t('orders.drawer.address')}:</span>
                <span className="font-medium text-text-main flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>
                    {order.delivery?.governorate}
                    {order.delivery?.city ? `، ${order.delivery.city}` : ''}
                    {order.delivery?.address ? ` — ${order.delivery.address}` : ''}
                  </span>
                </span>
              </div>
            </div>

            {order.notes && (
              <div className="pt-2 border-t border-surface-border/60 text-xs">
                <span className="text-text-muted block mb-0.5">{t('orders.drawer.notes')}:</span>
                <p className="text-text-main bg-surface p-2.5 rounded-xl border border-surface-border/40">
                  {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* قائمة الوسائل التعليمية مجمعة حسب البائعة */}
          <div className="space-y-4">
            <h4 className="font-heading font-black text-base text-text-main flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-orange" />
              <span>{t('orders.drawer.items')}</span>
            </h4>

            {Object.entries(itemsBySeller).map(([sellerId, items]) => (
              <div
                key={sellerId}
                className="rounded-2xl border border-surface-border bg-surface overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-surface-subtle border-b border-surface-border flex items-center justify-between text-xs font-bold text-text-main">
                  <span>{sellerNamesMap[sellerId] || sellerId}</span>
                  <span className="text-text-muted">
                    {t('orders.table.itemCount', { count: items.length })}
                  </span>
                </div>

                <div className="divide-y divide-surface-border">
                  {(Array.isArray(items) ? items : []).map((it, idx) => (
                    <div key={idx} className="p-3.5 flex items-center gap-3">
                      <div className="w-14 h-14 shrink-0">
                        <ProductImage
                          src={it.image}
                          alt={it.name}
                          aspectRatio="1/1"
                          containerClassName="rounded-xl"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs sm:text-sm text-text-main truncate">
                          {it.name}
                        </h5>
                        <p className="text-xs text-text-muted mt-0.5">
                          {it.qty} × <PriceTag amount={it.unitPrice} size="sm" />
                        </p>
                      </div>
                      <div className="text-end">
                        <PriceTag amount={it.unitPrice * it.qty} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* جدول توزيع العمولة 20% وصافي مستحقات البائعة 80% (Commission Breakdown) */}
          <div className="rounded-2xl border border-surface-border bg-surface p-4 space-y-3">
            <div>
              <h4 className="font-heading font-black text-sm text-text-main">
                {t('orders.drawer.commissionTable.title')}
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                {t('orders.drawer.commissionTable.description')}
              </p>
            </div>

            <div className="overflow-x-auto overscroll-contain modal-scrollbar">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-subtle/50 text-text-muted">
                    <th className="py-2.5 px-3 text-start font-bold">{t('orders.drawer.commissionTable.item')}</th>
                    <th className="py-2.5 px-3 text-start font-bold">{t('orders.drawer.commissionTable.seller')}</th>
                    <th className="py-2.5 px-3 text-end font-bold">{t('orders.drawer.commissionTable.salePrice')}</th>
                    <th className="py-2.5 px-3 text-end font-bold text-brand-orange-text dark:text-brand-orange">
                      {t('orders.drawer.commissionTable.commission')}
                    </th>
                    <th className="py-2.5 px-3 text-end font-bold text-emerald-600 dark:text-emerald-400">
                      {t('orders.drawer.commissionTable.sellerNet')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {breakdownRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-subtle/30">
                      <td className="py-2.5 px-3 font-medium text-text-main">
                        {row.name} ({row.qty}×)
                      </td>
                      <td className="py-2.5 px-3 text-text-muted">{row.sellerTitle}</td>
                      <td className="py-2.5 px-3 text-end font-bold">
                        <PriceTag amount={row.salePrice} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-end font-bold text-brand-orange-text dark:text-brand-orange">
                        <PriceTag amount={row.commission} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-end font-bold text-emerald-600 dark:text-emerald-400">
                        <PriceTag amount={row.net} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-border bg-surface-subtle font-black text-text-main">
                    <td colSpan={2} className="py-3 px-3">
                      {t('orders.drawer.commissionTable.totals')}
                    </td>
                    <td className="py-3 px-3 text-end">
                      <PriceTag amount={totalBreakdown.salePrice} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-end text-brand-orange-text dark:text-brand-orange">
                      <PriceTag amount={totalBreakdown.commission} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-end text-emerald-600 dark:text-emerald-400">
                      <PriceTag amount={totalBreakdown.net} size="sm" />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-[11px] text-text-muted italic">
              {t('orders.drawer.commissionTable.shippingNote', { amount: order.shipping || 40 })}
            </p>
          </div>

          {/* قسم استرداد المبلغ (Refund Status & Action) */}
          {order.refund && order.refund.required && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                      {t('orders.drawer.refundTitle')}
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      {t('orders.drawer.refundAmountLabel')}{' '}
                      <span className="font-black text-amber-950 dark:text-amber-100">
                        <PriceTag amount={order.refund.amount} size="sm" />
                      </span>
                    </p>
                  </div>
                </div>

                {order.refund.status === 'completed' ? (
                  <Badge variant="success" size="sm" className="gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('orders.drawer.refundCompletedBadge')}</span>
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setRefundModalOpen(true)}
                    className="text-xs gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('orders.drawer.processRefundBtn')}</span>
                  </Button>
                )}
              </div>

              {order.refund.status === 'completed' && (
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-black/30 text-xs text-text-muted space-y-0.5">
                  <div>
                    <span className="font-bold">{t('orders.drawer.refundReferenceLabel')}</span>{' '}
                    <span className="font-mono">{order.refund.reference}</span>
                  </div>
                  {order.refund.refundedAt && (
                    <div>
                      <span className="font-bold">{t('orders.drawer.refundDateLabel')}</span>{' '}
                      <span>{formatDateTime(order.refund.refundedAt)}</span>
                    </div>
                  )}
                  {order.refund.note && (
                    <div>
                      <span className="font-bold">{t('orders.drawer.refundNoteLabel')}</span>{' '}
                      <span>{order.refund.note}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* بيانات تحويل فودافون كاش والإيصال */}
          <div className="p-4 rounded-2xl bg-surface-subtle border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-text-muted flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-brand-orange" />
                <span>{t('orders.drawer.paymentSection.title')}</span>
              </h4>

              {/* شارات التحذير الأمنية للدفع إن وجدت */}
              {Array.isArray(order.payment?.flags) && order.payment.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {order.payment.flags.map((flag) => (
                    <Badge key={flag} variant="danger" size="sm" className="gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>{t(`orders.drawer.flags.${flag}`, { defaultValue: flag })}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {order.payment ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-text-muted block">
                      {t('orders.drawer.paymentSection.senderPhone')}:
                    </span>
                    <span dir="ltr" className="font-mono font-bold text-text-main [unicode-bidi:isolate]">
                      {order.payment.senderPhone}
                    </span>
                  </div>

                  <div>
                    <span className="text-text-muted block">
                      {t('orders.drawer.paymentSection.reference')}:
                    </span>
                    <span dir="ltr" className="font-mono font-bold text-text-main [unicode-bidi:isolate]">
                      {order.payment.reference || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-text-muted block">
                      {t('orders.drawer.paymentSection.amount')}:
                    </span>
                    <PriceTag amount={order.payment.transferredAmount} size="sm" />
                  </div>

                  <div>
                    <span className="text-text-muted block">
                      {t('orders.drawer.paymentSection.date')}:
                    </span>
                    <span className="text-text-main">
                      {order.payment.submittedAt ? formatDateTime(order.payment.submittedAt) : '—'}
                    </span>
                  </div>
                </div>

                {(order.payment.screenshotUrl || order.payment.id || order.id) && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveReceiptTarget(order.payment.id || order.id)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface border border-surface-border text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:bg-surface-border transition-colors cursor-zoom-in"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{t('orders.drawer.paymentSection.viewReceipt')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted">
                {t('orders.drawer.paymentSection.noPayment')}
              </p>
            )}
          </div>

          {/* مسار حالات الطلب (OrderTimeline) */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-text-muted flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-orange" />
              <span>{t('orders.drawer.timelineTitle')}</span>
            </h4>
            <OrderTimeline timeline={Array.isArray(order.timeline) ? order.timeline : []} />
          </div>
        </div>
      </Drawer>

      {/* معاينة صورة الإيصال المكبرة عبر البث الموثق */}
      <Lightbox
        isOpen={Boolean(activeReceiptTarget)}
        onClose={() => setActiveReceiptTarget(null)}
        src={privateReceiptUrl}
        alt={t('orders.drawer.receiptAlt')}
      />

      {/* نافذة تسجيل رد المبلغ للعميل */}
      <Modal
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        title={t('orders.drawer.refundModalTitle')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRefundSubmit} className="space-y-4 p-2">
          <p className="text-xs text-text-muted">
            {t('orders.drawer.refundModalDesc')}
          </p>

          <Input
            id="refund-reference"
            label={t('orders.drawer.refundReferenceInputLabel')}
            placeholder={t('orders.drawer.refundReferencePlaceholder')}
            value={refundRef}
            onChange={(e) => setRefundRef(e.target.value)}
            required
            disabled={isRefunding}
          />

          <Input
            id="refund-note"
            label={t('orders.drawer.refundNoteInputLabel')}
            placeholder={t('orders.drawer.refundNotePlaceholder')}
            value={refundNote}
            onChange={(e) => setRefundNote(e.target.value)}
            disabled={isRefunding}
          />

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefundModalOpen(false)}
              disabled={isRefunding}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isRefunding}
            >
              {t('orders.drawer.refundConfirmBtn')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
