import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useLanguage } from '../../../context/LanguageContext'
import { useFormat } from '../../../hooks/useFormat'

/**
 * نافذة التلميح المنبثقة للرسم البياني معرّفة خارج المكون لمنع إعادة الإنشاء أثناء التصيير
 */
function RevenueTooltip({ active, payload, label, formatMoney, t }) {
  if (active && payload && payload.length) {
    const grossVal = payload[0]?.value || 0
    const commVal = payload[1]?.value || 0
    const netVal = grossVal - commVal

    return (
      <div className="rounded-2xl bg-surface border border-surface-border p-3.5 shadow-xl text-xs space-y-1.5 min-w-[190px]">
        <p className="font-bold text-text-main pb-1 border-b border-surface-border text-center">
          {label}
        </p>
        <div className="flex items-center justify-between gap-3 text-brand-orange-text dark:text-brand-orange">
          <span>{t('overview.chart.grossLabel')}:</span>
          <span className="font-mono font-bold" dir="ltr">{formatMoney(grossVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-text-muted">
          <span>{t('overview.chart.commissionLabel')}:</span>
          <span className="font-mono font-bold" dir="ltr">{formatMoney(commVal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400 font-bold pt-1 border-t border-surface-border">
          <span>{t('overview.chart.sellerNetLabel')}:</span>
          <span className="font-mono" dir="ltr">{formatMoney(netVal)}</span>
        </div>
      </div>
    )
  }
  return null
}

/**
 * رسم بياني تفاعلي لعرض حركة مبيعات الوسائل التعليمية وعمولة المنصة (20٪)
 * يدعم التبديل بين العرض الأسبوعي والشهري مع مراعاة الوضع الداكن والاتجاه (RTL/LTR)
 */
export function AdminRevenueChart({ orders = [], className }) {
  const { t } = useTranslation('admin-core')
  const { formatMoney, formatNumber } = useFormat()
  const { isRtl } = useLanguage()
  const [period, setPeriod] = useState('month') // 'week' | 'month'

  const confirmedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status !== 'pending_payment' && o.status !== 'payment_rejected'
    )
  }, [orders])

  // بيانات الأسبوع الحالي محسوبة من الطلبات المؤكدة
  const weeklyData = useMemo(() => {
    const result = []
    const now = new Date()
    const salesByDate = {}
    confirmedOrders.forEach((o) => {
      const d = (o.createdAt || '').split('T')[0]
      if (d) {
        salesByDate[d] = (salesByDate[d] || 0) + (o.subtotal || o.total || 0)
      }
    })

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { weekday: 'short' })
      const gross = salesByDate[dateStr] || 0
      const commission = Math.round(gross * 0.2)
      const net = gross - commission
      result.push({
        name: dayName,
        gross,
        commission,
        net,
      })
    }
    return result
  }, [confirmedOrders, isRtl])

  // بيانات الأشهر الستة الأخيرة محسوبة من الطلبات المؤكدة
  const monthlyData = useMemo(() => {
    const result = []
    const now = new Date()
    const salesByMonth = {}
    confirmedOrders.forEach((o) => {
      const d = (o.createdAt || '').substring(0, 7)
      if (d) {
        salesByMonth[d] = (salesByMonth[d] || 0) + (o.subtotal || o.total || 0)
      }
    })

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthName = d.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'short' })
      const gross = salesByMonth[monthKey] || 0
      const commission = Math.round(gross * 0.2)
      const net = gross - commission
      result.push({
        name: monthName,
        gross,
        commission,
        net,
      })
    }
    return result
  }, [confirmedOrders, isRtl])

  const chartData = period === 'week' ? weeklyData : monthlyData
  const totalGross = useMemo(() => chartData.reduce((acc, p) => acc + p.gross, 0), [chartData])

  return (
    <Card padding="lg" className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-heading font-black text-lg text-text-main">
            {t('overview.chart.title')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('overview.chart.description')}
          </p>
        </div>

        {/* أزرار التبديل الزمني (أسبوعي / شهري) */}
        <div className="inline-flex items-center p-1 rounded-full bg-surface-subtle border border-surface-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              period === 'week'
                ? 'bg-brand-orange text-white shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('overview.chart.weekly')}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              period === 'month'
                ? 'bg-brand-orange text-white shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            {t('overview.chart.monthly')}
          </button>
        </div>
      </div>

      {totalGross === 0 ? (
        <EmptyState
          title={t('overview.chart.emptyTitle')}
          description={t('overview.chart.emptyDescription')}
          className="py-12 my-0 bg-transparent border-none"
        />
      ) : (
        <>
          {/* منطقة الرسم البياني المتجاوبة */}
          <div className="w-full h-72 sm:h-80 -ms-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="grossSalesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF8A3D" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF8A3D" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006C4B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#006C4B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-text-muted"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  orientation={isRtl ? 'right' : 'left'}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  tickFormatter={(v) => formatNumber(v)}
                  className="text-text-muted"
                />
                <Tooltip
                  content={(props) => (
                    <RevenueTooltip
                      {...props}
                      formatMoney={formatMoney}
                      t={t}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke="#FF8A3D"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#grossSalesGrad)"
                  name={t('overview.chart.grossLabel')}
                />
                <Area
                  type="monotone"
                  dataKey="commission"
                  stroke="#006C4B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#commGrad)"
                  name={t('overview.chart.commissionLabel')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* مفتاح الرسم البياني */}
          <div className="mt-4 pt-3 border-t border-surface-border flex flex-wrap items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-brand-orange" />
              <span className="text-text-main font-medium">{t('overview.chart.grossLabel')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#006C4B]" />
              <span className="text-text-main font-medium">{t('overview.chart.commissionLabel')}</span>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
