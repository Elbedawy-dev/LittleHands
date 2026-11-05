import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { DataTable } from '../../../components/ui/DataTable'
import { PriceTag } from '../../../components/ui/PriceTag'
import { useFormat } from '../../../hooks/useFormat'
import { getDisplayName } from '../../../utils'

/**
 * جدول سجل التحويلات المالية الصادرة للبائعات عبر فودافون كاش
 */
export function AdminPayoutsHistoryTable({
  payouts = [],
  loading = false,
}) {
  const { t, i18n } = useTranslation('admin-core')
  const { formatDate } = useFormat()

  const columns = [
    {
      header: t('sellers.history.date'),
      key: 'date',
      render: (p) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatDate(p.date)}
        </span>
      ),
    },
    {
      header: t('sellers.history.seller'),
      key: 'sellerName',
      render: (p) => (
        <span className="font-bold text-text-main text-xs sm:text-sm">
          {getDisplayName({ id: p.sellerId, sellerId: p.sellerId, name: p.sellerName }, i18n.language)}
        </span>
      ),
    },
    {
      header: t('sellers.history.amount'),
      key: 'amount',
      render: (p) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          <PriceTag amount={p.amount} size="sm" />
        </span>
      ),
    },
    {
      header: t('sellers.history.reference'),
      key: 'reference',
      render: (p) => (
        <span
          dir="ltr"
          className="font-mono text-xs font-bold text-text-main [unicode-bidi:isolate]"
        >
          {p.reference}
        </span>
      ),
    },
    {
      header: t('sellers.history.notes'),
      key: 'notes',
      sortable: false,
      render: (p) => (
        <span className="text-xs text-text-muted line-clamp-1 max-w-xs">
          {p.notes || '—'}
        </span>
      ),
    },
  ]

  const renderMobileCard = (p) => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-surface-border">
        <span className="font-bold text-text-main text-xs">{getDisplayName({ id: p.sellerId, sellerId: p.sellerId, name: p.sellerName }, i18n.language)}</span>
        <span className="text-[11px] text-text-muted">{formatDate(p.date)}</span>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">{t('sellers.history.amount')}:</span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          <PriceTag amount={p.amount} size="sm" />
        </span>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">{t('sellers.history.reference')}:</span>
        <span dir="ltr" className="font-mono font-medium text-text-main [unicode-bidi:isolate]">
          {p.reference}
        </span>
      </div>

      {p.notes && (
        <div className="pt-1 text-xs text-text-muted border-t border-surface-border/60">
          <span className="font-medium">{p.notes}</span>
        </div>
      )}
    </div>
  )

  return (
    <Card padding="lg" className="space-y-4">
      <div>
        <h3 className="font-heading font-black text-lg text-text-main">
          {t('sellers.history.title')}
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {t('sellers.history.description')}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={payouts}
        loading={loading}
        keyExtractor={(p) => p.id}
        renderMobileCard={renderMobileCard}
        emptyTitle={t('sellers.history.empty')}
      />
    </Card>
  )
}
