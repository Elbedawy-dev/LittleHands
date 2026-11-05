import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { DataTable } from '../../../components/ui/DataTable'
import { PriceTag } from '../../../components/ui/PriceTag'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { Tabs } from '../../../components/ui/Tabs'
import { useFormat } from '../../../hooks/useFormat'
import { calcCommission, getDisplayName } from '../../../utils'

const SELLER_MAP = {
  seller_1: 'البائعة الأولى',
  seller_2: 'البائعة الثانية',
}

/**
 * جدول تدقيق مبيعات وعمولات البائعات بالتفصيل (Per-Seller Orders Drilldown)
 * يفصل كل وسيلة تم بيعها، ويحسب عمولة المنصة (20٪) وصافي البائعة (80٪) ولتحقيق مطابقة الحسابات تماماً
 */
export function AdminSellerOrdersDrilldown({
  orders = [],
  loading = false,
}) {
  const { t, i18n } = useTranslation(['admin-core', 'common'])
  const { formatDate } = useFormat()
  const [selectedSellerTab, setSelectedSellerTab] = useState('all')

  // استخراج بنود الوسائل المرتبطة بالبائعات من كافة الطلبات المؤكدة والمسلمة
  const drilldownRows = useMemo(() => {
    const rows = []

    orders.forEach((order) => {
      // استبعاد الطلبات المرفوضة من حسابات الأرباح
      if (order.status === 'payment_rejected') return

      order.items.forEach((item, index) => {
        const sId = item.sellerId || 'seller_1'
        if (selectedSellerTab !== 'all' && sId !== selectedSellerTab) return

        const salePrice = item.unitPrice * item.qty
        const { commission, net } = calcCommission(salePrice)

        rows.push({
          rowId: `${order.id}_${index}`,
          orderNumber: order.number,
          orderId: order.id,
          customerName: order.delivery.name,
          nurseryName: order.delivery.nurseryName,
          itemName: item.name,
          qty: item.qty,
          sellerId: sId,
          sellerName: getDisplayName({ id: sId, name: item.sellerName }, i18n.language) || sId,
          salePrice,
          commission,
          net,
          status: order.status,
          date: order.createdAt,
        })
      })
    })

    return rows
  }, [orders, selectedSellerTab, i18n.language])

  const tabs = [
    { id: 'all', label: t('sellers.drilldown.allSellers') },
    { id: 'seller_1', label: getDisplayName({ id: 'seller_1', name: 'البائعة الأولى', nameEn: 'First Seller' }, i18n.language) },
    { id: 'seller_2', label: getDisplayName({ id: 'seller_2', name: 'البائعة الثانية', nameEn: 'Second Seller' }, i18n.language) },
  ]

  const columns = [
    {
      header: t('sellers.drilldown.orderNumber'),
      key: 'orderNumber',
      render: (r) => (
        <span
          dir="ltr"
          className="font-mono font-bold text-xs sm:text-sm text-text-main [unicode-bidi:isolate]"
        >
          {r.orderNumber}
        </span>
      ),
    },
    {
      header: t('sellers.drilldown.customer'),
      key: 'customerName',
      render: (r) => (
        <div>
          <span className="font-bold text-text-main block">{r.customerName}</span>
          {r.nurseryName && (
            <span className="text-[11px] text-text-muted block mt-0.5">{r.nurseryName}</span>
          )}
        </div>
      ),
    },
    {
      header: t('sellers.drilldown.item'),
      key: 'itemName',
      render: (r) => (
        <div>
          <span className="text-text-main font-medium">{r.itemName}</span>
          <span className="text-[11px] text-text-muted block mt-0.5">
            ({r.qty}×) • {r.sellerName}
          </span>
        </div>
      ),
    },
    {
      header: t('sellers.drilldown.salePrice'),
      key: 'salePrice',
      render: (r) => <PriceTag amount={r.salePrice} size="sm" />,
    },
    {
      header: t('sellers.drilldown.commission'),
      key: 'commission',
      render: (r) => (
        <span className="font-bold text-brand-orange-text dark:text-brand-orange">
          <PriceTag amount={r.commission} size="sm" />
        </span>
      ),
    },
    {
      header: t('sellers.drilldown.sellerNet'),
      key: 'net',
      render: (r) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400">
          <PriceTag amount={r.net} size="sm" />
        </span>
      ),
    },
    {
      header: t('sellers.drilldown.status'),
      key: 'status',
      render: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      header: t('sellers.drilldown.date'),
      key: 'date',
      render: (r) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatDate(r.date)}
        </span>
      ),
    },
  ]

  const renderMobileCard = (r) => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-surface-border">
        <span
          dir="ltr"
          className="font-mono font-bold text-sm text-text-main [unicode-bidi:isolate]"
        >
          {r.orderNumber}
        </span>
        <StatusBadge status={r.status} size="sm" />
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">{t('sellers.drilldown.customer')}:</span>
        <span className="font-bold text-text-main">{r.customerName}</span>
      </div>

      <div className="flex justify-between items-center text-xs">
        <span className="text-text-muted">{t('sellers.drilldown.item')}:</span>
        <span className="font-medium text-text-main text-end max-w-[200px] truncate">
          {r.itemName} ({r.qty}×)
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border/60 text-xs">
        <div>
          <span className="text-text-muted block text-[10px]">{t('sellers.drilldown.salePrice')}</span>
          <PriceTag amount={r.salePrice} size="sm" />
        </div>
        <div>
          <span className="text-brand-orange-text dark:text-brand-orange block text-[10px]">
            {t('sellers.drilldown.commission')}
          </span>
          <PriceTag amount={r.commission} size="sm" />
        </div>
        <div>
          <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">
            {t('sellers.drilldown.sellerNet')}
          </span>
          <PriceTag amount={r.net} size="sm" />
        </div>
      </div>
    </div>
  )

  return (
    <Card padding="lg" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div>
          <h3 className="font-heading font-black text-lg text-text-main">
            {t('sellers.drilldown.title')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('sellers.drilldown.description')}
          </p>
        </div>

        <div className="overflow-x-auto min-w-0 pb-1 sm:pb-0">
          <Tabs
            tabs={tabs}
            activeTab={selectedSellerTab}
            onChange={(id) => setSelectedSellerTab(id)}
            variant="pills"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={drilldownRows}
        loading={loading}
        keyExtractor={(r) => r.rowId}
        renderMobileCard={renderMobileCard}
        emptyTitle={t('sellers.drilldown.empty')}
      />
    </Card>
  )
}
