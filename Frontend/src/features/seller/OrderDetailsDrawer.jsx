import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  Trash2,
  Truck,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OrderTimeline } from '../../components/order/OrderTimeline'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Drawer } from '../../components/ui/Drawer'
import { ProductImage } from '../../components/ui/ProductImage'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Tooltip } from '../../components/ui/Tooltip'
import { useFormat } from '../../hooks/useFormat'
import { calcCommission } from '../../utils'

const SELLER_HIDEABLE_STATUSES = ['cancelled', 'payment_rejected', 'delivered', 'pending_payment']

/**
 * درج عرض تفاصيل الطلب للبائعة وإجراءات دورة الحياة
 * Drawer showing order delivery details, seller's aids breakdown, timeline, and actions.
 * Strictly hides payment screenshot and Vodafone transfer proof (Admin only).
 */
export function OrderDetailsDrawer({
  isOpen,
  onClose,
  order,
  sellerId = '',
  onStatusUpdate,
  onHideOrder,
}) {
  const { t } = useTranslation('seller')
  const { formatMoney } = useFormat()
  const [updating, setUpdating] = useState(false)

  if (!order) return null

  const orderItems = Array.isArray(order.items) ? order.items : []
  const canHide = SELLER_HIDEABLE_STATUSES.includes(order.status)

  // تصفية المنتجات التابعة لورشة هذه البائعة فقط
  const sellerItems = orderItems.filter(
    (item) => !item.sellerId || item.sellerId === sellerId
  )

  // حساب الإجمالي المالي لمنتجات هذه البائعة فقط
  const sellerGross = sellerItems.reduce(
    (acc, it) => acc + (Number(it.unitPrice) || 0) * (Number(it.qty) || 1),
    0
  )
  const { commission, net } = calcCommission(sellerGross)

  const handleAction = async (newStatus) => {
    if (!onStatusUpdate) return
    setUpdating(true)
    try {
      await onStatusUpdate(order.id, newStatus)
    } finally {
      setUpdating(false)
    }
  }

  // التحقق من صلاحية الإجراء بناءً على تأكيد الإدارة للدفع
  const isPaymentConfirmed =
    order.status === 'payment_confirmed' ||
    order.status === 'preparing' ||
    order.status === 'shipped' ||
    order.status === 'delivered'

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="end"
      size="lg"
      title={
        <div className="flex items-center gap-2.5">
          <span className="font-heading font-black text-base text-text-main">
            {t('orders.drawer.title')}
          </span>
          <bdi
            dir="ltr"
            className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange"
            style={{ unicodeBidi: 'isolate' }}
          >
            {order.number}
          </bdi>
        </div>
      }
    >
      <div className="space-y-6 p-1">
        {/* شريط حالة الطلب الحالية */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-subtle border border-surface-border">
          <span className="text-xs font-bold text-text-muted">{t('orders.col_status')}:</span>
          <StatusBadge status={order.status} size="md" />
        </div>

        {/* أزرار الإجراءات الخاصة بالبائعة */}
        <div className="p-4 rounded-2xl bg-surface border border-surface-border shadow-xs space-y-3">
          <h4 className="font-heading font-black text-xs text-text-main">
            {t('orders.col_actions')}
          </h4>

          {order.status === 'payment_confirmed' && (
            <Button
              type="button"
              variant="primary"
              className="w-full justify-center whitespace-nowrap"
              loading={updating}
              onClick={() => handleAction('preparing')}
              startIcon={<Clock className="w-4 h-4" />}
            >
              {t('orders.action_preparing')}
            </Button>
          )}

          {order.status === 'preparing' && (
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-center whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white"
              loading={updating}
              onClick={() => handleAction('shipped')}
              startIcon={<Truck className="w-4 h-4 rtl:rotate-180" />}
            >
              {t('orders.action_shipped')}
            </Button>
          )}

          {!isPaymentConfirmed && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">
                  {t('orders.waiting_payment_hint')}
                </span>
                <span className="text-[11px] opacity-80">
                  {t('orders.waiting_payment_desc')}
                </span>
              </div>
            </div>
          )}

          {(order.status === 'shipped' || order.status === 'delivered') && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {order.status === 'delivered'
                  ? t('orders.status_delivered_notice')
                  : t('orders.status_shipped_notice')}
              </span>
            </div>
          )}

          {onHideOrder && (
            <div className="pt-2 border-t border-surface-border">
              {canHide ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => onHideOrder(order)}
                  startIcon={<Trash2 className="w-4 h-4" />}
                  className="w-full justify-center"
                >
                  {t('orders.hide.action')}
                </Button>
              ) : (
                <Tooltip content={t('orders.hide.disabledTooltip')} position="top">
                  <span tabIndex={0} className="inline-flex w-full">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      startIcon={<Trash2 className="w-4 h-4" />}
                      className="w-full justify-center text-rose-400 dark:text-rose-500/50 border-surface-border"
                      aria-label={t('orders.hide.disabledTooltip')}
                    >
                      {t('orders.hide.action')}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {/* بيانات التسليم والشحن للحضانة */}
        <Card padding="md" className="space-y-3">
          <h4 className="font-heading font-black text-sm text-text-main flex items-center gap-2 pb-2 border-b border-surface-border">
            <MapPin className="w-4 h-4 text-brand-orange" />
            <span>{t('orders.drawer.delivery_title')}</span>
          </h4>

          {order.delivery?.masked ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('orders.delivery_masked_notice')}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {order.delivery?.nurseryName && (
                  <div className="flex items-start gap-2">
                    <Building className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div>
                      <span className="text-text-muted block text-[11px]">{t('orders.drawer.nursery')}</span>
                      <span className="font-bold text-text-main">{order.delivery.nurseryName}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="text-text-muted block text-[11px]">{t('orders.drawer.recipient')}</span>
                    <span className="font-bold text-text-main">{order.delivery?.name || '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="text-text-muted block text-[11px]">{t('orders.drawer.phone')}</span>
                    <bdi
                      dir="ltr"
                      className="font-mono font-bold text-text-main block"
                      style={{ unicodeBidi: 'isolate' }}
                    >
                      {order.delivery?.phone || '—'}
                    </bdi>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                  <div>
                    <span className="text-text-muted block text-[11px]">{t('orders.drawer.governorate')}</span>
                    <span className="font-bold text-text-main">
                      {order.delivery?.governorate || ''} {order.delivery?.city ? `(${order.delivery.city})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {order.delivery?.address && (
                <div className="pt-2 border-t border-surface-border text-xs">
                  <span className="text-text-muted block text-[11px]">{t('orders.drawer.address')}</span>
                  <p className="text-text-main mt-0.5 leading-relaxed font-medium">
                    {order.delivery.address}
                  </p>
                </div>
              )}
            </>
          )}
        </Card>

        {/* قائمة الوسائل التعليمية التابعة لورشة هذه البائعة */}
        <Card padding="md" className="space-y-3">
          <h4 className="font-heading font-black text-sm text-text-main flex items-center gap-2 pb-2 border-b border-surface-border">
            <Package className="w-4 h-4 text-brand-orange" />
            <span>{t('orders.drawer.items_title')}</span>
          </h4>

          <div className="divide-y divide-surface-border">
            {sellerItems.map((item, idx) => {
              const itemTotal = (item.unitPrice || 0) * (item.qty || 1)
              const itemCommission = calcCommission(itemTotal)

              return (
                <div key={idx} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
                  <div className="w-14 h-14 shrink-0">
                    <ProductImage
                      src={item.image}
                      alt={typeof item.name === 'object' ? (item.name?.ar || item.name?.en || '') : item.name}
                      aspectRatio="1/1"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-text-main truncate">
                      {typeof item.name === 'object' ? (item.name?.ar || item.name?.en || '') : item.name}
                    </h5>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted mt-1">
                      <span>{t('orders.qty_label', { qty: item.qty })}</span>
                      <span>•</span>
                      <span>{t('orders.unit_price_label', { price: formatMoney(item.unitPrice) })}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-surface-border/50 text-[11px]">
                      <span className="text-text-muted">
                        {t('orders.col_commission')}: <span className="font-mono">{formatMoney(itemCommission.commission)}</span>
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {t('orders.col_net')}: <span className="font-mono">{formatMoney(itemCommission.net)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ملخص المستحقات المالية الصافية للطلب */}
        <div className="p-4 rounded-2xl bg-surface-subtle border border-surface-border space-y-2 text-xs">
          <h4 className="font-heading font-black text-xs text-text-main pb-2 border-b border-surface-border">
            {t('orders.drawer.financial_summary')}
          </h4>

          <div className="flex items-center justify-between text-text-muted">
            <span>{t('orders.drawer.gross_total')}</span>
            <span className="font-mono font-bold text-text-main">{formatMoney(sellerGross)}</span>
          </div>

          <div className="flex items-center justify-between text-text-muted">
            <span>{t('orders.drawer.commission_deduction')}</span>
            <span className="font-mono text-brand-orange-text dark:text-brand-orange">
              - {formatMoney(commission)}
            </span>
          </div>

          <div className="flex items-center justify-between font-bold pt-2 border-t border-surface-border text-sm">
            <span className="text-text-main">{t('orders.drawer.net_payout')}</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {formatMoney(net)}
            </span>
          </div>
        </div>

        {/* تنبيه حماية الخصوصية: البائعة لا ترى إيصالات فودافون كاش الخاصة بالعميلة */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-subtle/50 text-[11px] text-text-muted">
          <ShieldAlert className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
          <span>{t('orders.drawer.confidential_note')}</span>
        </div>

        {/* المخطط الزمني للطلب */}
        <Card padding="md" className="space-y-3">
          <h4 className="font-heading font-black text-sm text-text-main pb-2 border-b border-surface-border">
            {t('orders.drawer.timeline_title')}
          </h4>
          <OrderTimeline timeline={Array.isArray(order.timeline) ? order.timeline : []} />
        </Card>
      </div>
    </Drawer>
  )
}
