import {
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { PriceTag } from '../../components/ui/PriceTag'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { CommissionInfoCard } from '../../features/seller'
import { useFormat } from '../../hooks/useFormat'
import { earningsService } from '../../services/earningsService'
import { orderService } from '../../services/orderService'
import { calcCommission, getFriendlyError } from '../../utils'

/**
 * صفحة الأرباح والمستحقات والتحويلات المالية للبائعة
 * Displays financial stat cards (Total Sales, Commission 20%, Net Earnings, Paid, Due),
 * Per-Order Financial Breakdown table, and Vodafone Cash payouts history table.
 * Strictly ensures mathematical reconciliation:
 * net = total - commission; due = net - paid.
 */
export default function SellerEarningsPage() {
  const { t } = useTranslation('seller')
  const { user } = useAuth()
  const { settings } = useSettings()
  const sellerId = user?.id || ''
  const { formatMoney, formatDate, formatNumber } = useFormat()

  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadFinancialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, ords, pays] = await Promise.all([
        earningsService.getSellerOverview(sellerId),
        orderService.getSellerOrders(),
        earningsService.getPayouts({ sellerId }),
      ])

      const safeOrders = Array.isArray(ords) ? ords : []
      // تصفية الطلبات الخاصة بهذه البائعة
      const myOrders = safeOrders.filter((o) =>
        (Array.isArray(o.items) ? o.items : []).some((item) => !item.sellerId || item.sellerId === sellerId)
      )

      setOverview(ov)
      setOrders(myOrders)
      setPayouts(Array.isArray(pays) ? pays : [])
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }, [sellerId, t])

  useEffect(() => {
    loadFinancialData()
  }, [loadFinancialData])

  // الحسابات المالية الدقيقة والمطابقة
  const totalSales = overview?.grossSales || 0
  const { commission: platformCommission, net: netEarnings } = calcCommission(totalSales)
  const totalPaid = (payouts || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  const dueAmount = Math.max(0, Math.round((netEarnings - totalPaid) * 100) / 100)

  // حالة التحميل الهيكلي (Skeleton)
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ترويسة الصفحة */}
      <PageHeader
        title={t('earnings.title')}
        description={t('earnings.subtitle')}
        actions={
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/20 select-none">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('earnings.reconciliation_badge')}</span>
          </div>
        }
      />

      {/* بطاقة الشفافية ونسبة العمولة 20% */}
      <CommissionInfoCard />

      {/* تنبيه مواعيد التحويل - يظهر للبائعة فقط عند ضبطه بالإعدادات */}
      {settings?.payoutScheduleText && (
        <div className="flex items-start gap-3 p-4 rounded-[20px] bg-amber-500/10 border border-amber-500/20 text-text-main text-xs leading-relaxed">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-800 dark:text-amber-300 font-bold block mb-0.5">
              مواعيد تحويل الأرباح المستحقة:
            </strong>
            <span>{settings.payoutScheduleText}</span>
          </div>
        </div>
      )}

      {/* بطاقات الحسابات المالية الخمسة المؤكدة مع التطابق الرياضي التام */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1) إجمالي المبيعات */}
        <StatCard
          title={t('earnings.cards.total_sales')}
          value={<PriceTag amount={totalSales} size="md" />}
          icon={<TrendingUp className="w-5 h-5 text-brand-orange" />}
          subtitle={t('earnings.cards.total_sales_sub')}
        />

        {/* 2) عمولة المنصة (20%) */}
        <StatCard
          title={t('earnings.cards.platform_cut')}
          value={<PriceTag amount={platformCommission} size="md" />}
          icon={<Wallet className="w-5 h-5 text-brand-orange-text dark:text-brand-orange" />}
          subtitle={t('earnings.cards.platform_cut_sub')}
        />

        {/* 3) صافي الأرباح (80%) */}
        <StatCard
          title={t('earnings.cards.net_earnings')}
          value={<PriceTag amount={netEarnings} size="md" />}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          subtitle={t('earnings.cards.net_earnings_sub')}
          className="border-emerald-500/20 bg-emerald-500/5"
        />

        {/* 4) تم تحويله (فودافون كاش) */}
        <StatCard
          title={t('earnings.cards.total_paid')}
          value={<PriceTag amount={totalPaid} size="md" />}
          icon={<CreditCard className="w-5 h-5 text-brand-sky" />}
          subtitle={t('earnings.cards.total_paid_sub')}
        />

        {/* 5) المستحق للتحويل القادم */}
        <StatCard
          title={t('earnings.cards.pending_balance')}
          value={<PriceTag amount={dueAmount} size="md" />}
          icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          subtitle={t('earnings.cards.pending_balance_sub')}
          className="border-amber-500/20 bg-amber-500/5"
        />
      </div>

      {/* رسالة الخطأ إن وجد */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadFinancialData}
            className="text-xs font-bold underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* جدول التفصيل المالي لكل طلب */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div>
            <h3 className="font-heading font-black text-lg text-text-main">
              {t('earnings.breakdown.title')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {t('earnings.breakdown.subtitle')}
            </p>
          </div>

          <div className="text-xs font-bold text-text-muted">
            إجمالي الطلبات المسجلة: {formatNumber(orders.length)}
          </div>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            title={t('earnings.breakdown.empty')}
            description={t('earnings.breakdown.empty_desc')}
            icon={<Receipt className="w-8 h-8 text-brand-orange" />}
          />
        ) : (
          <div className="overflow-x-auto overscroll-contain modal-scrollbar">
            <table className="w-full text-start align-middle text-xs">
              <thead>
                <tr className="bg-surface-subtle text-text-muted font-bold border-b border-surface-border">
                  <th className="py-3 px-4 rounded-s-xl text-start whitespace-nowrap">
                    {t('earnings.breakdown.col_order')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('earnings.breakdown.col_date')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('earnings.breakdown.col_items')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('earnings.breakdown.col_gross')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('earnings.breakdown.col_commission')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('earnings.breakdown.col_net')}
                  </th>
                  <th className="py-3 px-4 rounded-e-xl text-start whitespace-nowrap">
                    {t('earnings.breakdown.col_status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {orders.map((ord) => {
                  const myItems = (ord.items || []).filter(
                    (it) => !it.sellerId || it.sellerId === sellerId
                  )
                  const myQty = myItems.reduce((acc, it) => acc + (it.qty || 1), 0)
                  const myGross = myItems.reduce(
                    (acc, it) => acc + (it.unitPrice || 0) * (it.qty || 1),
                    0
                  )
                  const { commission: ordCommission, net: ordNet } = calcCommission(myGross)
                  const firstItem = myItems[0]

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-surface-subtle/50 transition-colors"
                    >
                      {/* رقم الطلب */}
                      <td className="py-3.5 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                        <bdi dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                          {ord.number}
                        </bdi>
                      </td>

                      {/* التاريخ */}
                      <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                        {formatDate(ord.createdAt)}
                      </td>

                      {/* اسم الوسيلة والكمية */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-text-main block truncate max-w-[220px]">
                          {firstItem?.name || t('earnings.breakdown.default_aid')}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {myItems.length > 1
                            ? t('earnings.breakdown.items_count', {
                                qty: formatNumber(myQty),
                                count: formatNumber(myItems.length),
                              })
                            : t('earnings.breakdown.single_item_count', {
                                qty: formatNumber(myQty),
                              })}
                        </span>
                      </td>

                      {/* سعر البيع الإجمالي */}
                      <td className="py-3.5 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                        {formatMoney(myGross)}
                      </td>

                      {/* عمولة المنصة 20% */}
                      <td className="py-3.5 px-4 font-mono text-brand-orange-text dark:text-brand-orange whitespace-nowrap">
                        {formatMoney(ordCommission)}
                      </td>

                      {/* صافي المستحق للبائعة 80% */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatMoney(ordNet)}
                      </td>

                      {/* حالة الطلب */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={ord.status} size="sm" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* جدول سجل تحويلات المستحقات السابقة (فودافون كاش) */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div>
            <h3 className="font-heading font-black text-lg text-text-main">
              {t('earnings.payouts.title')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {t('earnings.payouts.subtitle')}
            </p>
          </div>

          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {t('earnings.payouts.total_paid_label', { amount: formatMoney(totalPaid) })}
          </div>
        </div>

        {payouts.length === 0 ? (
          <EmptyState
            title={t('earnings.payouts.empty')}
            description={t('earnings.payouts.empty_desc')}
            icon={<Wallet className="w-8 h-8 text-brand-orange" />}
          />
        ) : (
          <div className="overflow-x-auto overscroll-contain modal-scrollbar">
            <table className="w-full text-start align-middle text-xs">
              <thead>
                <tr className="bg-surface-subtle text-text-muted font-bold border-b border-surface-border">
                  <th className="py-3 px-4 rounded-s-xl text-start whitespace-nowrap">
                    {t('earnings.payouts.col_date')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('earnings.payouts.col_amount')}
                  </th>
                  <th className="py-3 px-4 text-start whitespace-nowrap">
                    {t('earnings.payouts.col_reference')}
                  </th>
                  <th className="py-3 px-4 rounded-e-xl text-start whitespace-nowrap">
                    {t('earnings.payouts.col_notes')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {payouts.map((pay) => (
                  <tr
                    key={pay.id}
                    className="hover:bg-surface-subtle/50 transition-colors"
                  >
                    {/* التاريخ */}
                    <td className="py-3.5 px-4 text-text-muted whitespace-nowrap">
                      {formatDate(pay.date)}
                    </td>

                    {/* المبلغ المحول */}
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0 rtl:rotate-90" />
                        <span>{formatMoney(pay.amount)}</span>
                      </div>
                    </td>

                    {/* الرقم المرجعي لفودافون كاش */}
                    <td className="py-3.5 px-4 font-mono font-bold text-text-main whitespace-nowrap">
                      <bdi
                        dir="ltr"
                        className="px-2.5 py-1 rounded-full bg-surface-subtle border border-surface-border inline-block"
                        style={{ unicodeBidi: 'isolate' }}
                      >
                        {pay.reference || '—'}
                      </bdi>
                    </td>

                    {/* البيان / ملاحظات */}
                    <td className="py-3.5 px-4 text-text-muted">
                      {pay.notes || t('earnings.payouts.default_notes')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
