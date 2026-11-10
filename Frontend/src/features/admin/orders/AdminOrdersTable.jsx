import { Eye, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { DataTable } from '../../../components/ui/DataTable'
import { PriceTag } from '../../../components/ui/PriceTag'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Tooltip } from '../../../components/ui/Tooltip'
import { getGovernorateName } from '../../../config/constants'
import { useFormat } from '../../../hooks/useFormat'
import { pickLocaleText } from '../../../utils'

const ADMIN_DELETABLE_STATUSES = ['pending_payment', 'payment_rejected', 'cancelled']

/**
 * جدول طلبات المنصة الشامل للإدارة
 * يعرض تفاصيل الطلبات والوسائل، ويدعم التحويل التلقائي لبطاقات مكدسة على الشاشات الصغيرة
 */
export function AdminOrdersTable({
  orders = [],
  loading = false,
  onViewOrder,
  onDeleteOrder,
}) {
  const { t, i18n } = useTranslation('admin-core')
  const isEn = i18n.language === 'en'
  const { formatDate } = useFormat()
  const safeOrders = Array.isArray(orders) ? orders : []

  const columns = [
    {
      header: t('orders.table.orderNumber'),
      key: 'number',
      render: (o) => (
        <span
          dir="ltr"
          className="font-mono font-bold text-xs sm:text-sm text-text-main [unicode-bidi:isolate] whitespace-nowrap"
        >
          {o.number}
        </span>
      ),
    },
    {
      header: t('orders.table.customer'),
      key: 'customer',
      render: (o) => (
        <div data-user-content="true">
          <span className="font-bold text-text-main block">{o.delivery?.name}</span>
          <span className="text-[11px] text-text-muted block mt-0.5">
            {o.delivery?.nurseryName ? `${o.delivery.nurseryName} • ` : ''}
            {getGovernorateName(o.delivery?.governorate, i18n.language) || o.delivery?.governorate}
          </span>
        </div>
      ),
    },
    {
      header: t('orders.table.itemsSummary'),
      key: 'items',
      sortable: false,
      render: (o) => {
        const itemsList = Array.isArray(o.items) ? o.items : []
        const firstTwoNames = itemsList
          .slice(0, 2)
          .map((i) => (typeof i.name === 'object' ? pickLocaleText(i.name, i18n.language) : i.name))
          .join(isEn ? ', ' : '، ')
        const remaining = itemsList.length - 2
        return (
          <div className="max-w-xs text-xs" data-user-content="true">
            <span className="text-text-main line-clamp-1">{firstTwoNames}</span>
            {remaining > 0 && (
              <span className="text-[10px] text-text-muted">
                {t('orders.moreAids', { count: remaining })}
              </span>
            )}
          </div>
        )
      },
    },
    {
      header: t('orders.table.total'),
      key: 'total',
      render: (o) => <PriceTag amount={o.total} size="sm" />,
    },
    {
      header: t('orders.table.status'),
      key: 'status',
      render: (o) => <StatusBadge status={o.status} size="sm" />,
    },
    {
      header: t('orders.table.date'),
      key: 'createdAt',
      render: (o) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatDate(o.createdAt)}
        </span>
      ),
    },
    {
      header: t('orders.table.actions'),
      key: 'actions',
      sortable: false,
      align: 'end',
      render: (o) => {
        const canDelete = ADMIN_DELETABLE_STATUSES.includes(o.status)
        return (
          <div className="inline-flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onViewOrder(o)}
              startIcon={<Eye className="w-3.5 h-3.5" />}
            >
              {t('orders.table.viewDetails')}
            </Button>

            {onDeleteOrder && (
              canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteOrder(o)}
                  className="px-2.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title={t('orders.delete.action')}
                  aria-label={t('orders.delete.action')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              ) : (
                <Tooltip content={t('orders.delete.disabledTooltip')} position="top">
                  <span tabIndex={0} className="inline-flex">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled
                      className="px-2.5 text-rose-400 dark:text-rose-500/50 border-surface-border"
                      aria-label={t('orders.delete.disabledTooltip')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </span>
                </Tooltip>
              )
            )}
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={safeOrders}
      loading={loading}
      emptyTitle={t('orders.emptyTitle')}
      emptyDescription={t('orders.emptyDescription')}
      mobileCardRenderer={(o) => (
        <AdminOrderMobileCard
          order={o}
          onViewOrder={onViewOrder}
          onDeleteOrder={onDeleteOrder}
          formatDate={formatDate}
          t={t}
          isEn={isEn}
          lang={i18n.language}
        />
      )}
    />
  )
}

/**
 * بطاقة عرض الطلب المخصصة للشاشات الصغيرة
 */
function AdminOrderMobileCard({ order: o, onViewOrder, onDeleteOrder, formatDate, t, isEn, lang }) {
  const itemsList = Array.isArray(o.items) ? o.items : []
  const itemsText = itemsList
    .map((i) => (typeof i.name === 'object' ? pickLocaleText(i.name, lang) : i.name))
    .join(isEn ? ', ' : '، ')
  const canDelete = ADMIN_DELETABLE_STATUSES.includes(o.status)

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <span
            dir="ltr"
            className="font-mono font-bold text-sm text-text-main [unicode-bidi:isolate] block"
          >
            {o.number}
          </span>
          <StatusBadge status={o.status} size="sm" className="mt-1" />
        </div>
        <div className="text-end" data-user-content="true">
          <span className="font-bold text-text-main block">{o.delivery?.name}</span>
          <span className="text-[11px] text-text-muted">
            {o.delivery?.nurseryName ? `${o.delivery.nurseryName} • ` : ''}
            {getGovernorateName(o.delivery?.governorate, lang) || o.delivery?.governorate}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">{t('orders.table.itemsSummary')}:</span>
        <span className="font-medium text-text-main text-end max-w-[200px] truncate" data-user-content="true">
          {itemsText}
        </span>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">{t('orders.table.total')}:</span>
        <PriceTag amount={o.total} size="sm" />
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">{t('orders.table.date')}:</span>
        <span className="text-text-muted">{formatDate(o.createdAt)}</span>
      </div>

      <div className="pt-2 border-t border-surface-border flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onViewOrder(o)}
          startIcon={<Eye className="w-3.5 h-3.5" />}
          className="flex-1 justify-center"
        >
          {t('orders.table.viewDetails')}
        </Button>

        {onDeleteOrder && (
          canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDeleteOrder(o)}
              className="px-3 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title={t('orders.delete.action')}
              aria-label={t('orders.delete.action')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : (
            <Tooltip content={t('orders.delete.disabledTooltip')} position="top">
              <span tabIndex={0} className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="px-3 text-rose-400 dark:text-rose-500/50 border-surface-border"
                  aria-label={t('orders.delete.disabledTooltip')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </span>
            </Tooltip>
          )
        )}
      </div>
    </div>
  )
}
