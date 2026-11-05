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
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import { useFormat } from '../../hooks/useFormat'
import { calcCommission, cn } from '../../utils'

/**
 * نافذة التلميح المخصصة للرسم البياني معرّفة خارج المكوّن لتجنب إعادة الإنشاء
 */
function ChartTooltip({ active, payload, isRtl, formatMoney, t }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="p-3.5 rounded-2xl bg-surface border border-surface-border shadow-lg space-y-1.5 text-xs font-sans min-w-[170px]"
      >
        <p className="font-bold text-text-muted pb-1 border-b border-surface-border">
          {data.date}
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-brand-orange font-bold">
            <span className="w-2 h-2 rounded-full bg-brand-orange" />
            {t('overview.chart.gross_sales')}:
          </span>
          <span className="font-mono font-bold text-text-main">
            {formatMoney(data.gross)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            {t('overview.chart.net_earnings')}:
          </span>
          <span className="font-mono font-bold text-text-main">
            {formatMoney(data.net)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] text-text-muted pt-1 border-t border-surface-border/50">
          <span>{t('overview.chart.platform_cut')}:</span>
          <span className="font-mono">{formatMoney(data.commission)}</span>
        </div>
      </div>
    )
  }
  return null
}

/**
 * مكوّن الرسم البياني للمبيعات وصافي الأرباح
 * Recharts sales chart with 7/30 days toggle, dark mode support, and RTL-safe axes
 */
export function SalesChart({ orders = [], className }) {
  const { t } = useTranslation('seller')
  const { isRtl } = useLanguage()
  const { theme } = useTheme()
  const { formatMoney } = useFormat()
  const [period, setPeriod] = useState('7') // '7' | '30'

  const isDark = theme === 'dark'

  // توليد بيانات الرسم البياني وفق الفترة المحددة
  const chartData = useMemo(() => {
    const days = period === '7' ? 7 : 30
    const points = []
    const now = new Date()

    // تجميع المبيعات الفعلية من الطلبات المؤكدة
    const salesByDate = {}
    orders.forEach((ord) => {
      if (ord.status !== 'pending_payment' && ord.status !== 'payment_rejected') {
        const dateKey = (ord.createdAt || '').split('T')[0]
        if (dateKey) {
          salesByDate[dateKey] = (salesByDate[dateKey] || 0) + (ord.subtotal || ord.total || 0)
        }
      }
    })

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const label = new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
      }).format(d)

      // استخدام المبيعات الفعلية فقط من الطلبات المؤكدة
      const gross = salesByDate[dateStr] || 0
      const { commission, net } = calcCommission(gross)

      points.push({
        date: dateStr,
        label,
        gross: Math.round(gross),
        commission: Math.round(commission),
        net: Math.round(net),
      })
    }

    return points
  }, [orders, period, isRtl])

  const totalGross = useMemo(() => chartData.reduce((acc, p) => acc + p.gross, 0), [chartData])

  // ألوان الرسم البياني للوضعين
  const colors = {
    grid: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(138, 114, 102, 0.12)',
    text: isDark ? '#a8988d' : '#8a7266',
    salesStroke: '#ff8a3d',
    salesFill: '#ff8a3d',
    netStroke: '#006c4b',
    netFill: '#006c4b',
  }

  return (
    <Card padding="lg" className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border">
        <div>
          <h3 className="font-heading font-black text-base text-text-main">
            {t('overview.chart.title')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('overview.chart.subtitle')}
          </p>
        </div>

        {/* أزرار التبديل 7 أيام / 30 يوماً */}
        <div className="inline-flex items-center p-1 rounded-full bg-surface-subtle border border-surface-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriod('7')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 select-none',
              period === '7'
                ? 'bg-brand-orange text-white shadow-xs'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            {t('overview.chart.days_7')}
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 select-none',
              period === '30'
                ? 'bg-brand-orange text-white shadow-xs'
                : 'text-text-muted hover:text-text-main'
            )}
          >
            {t('overview.chart.days_30')}
          </button>
        </div>
      </div>

      {totalGross === 0 ? (
        <EmptyState
          title={t('overview.chart.empty_title')}
          description={t('overview.chart.empty_desc')}
          className="py-10 my-0 bg-transparent border-none"
        />
      ) : (
        <>
          {/* المؤشرات التوضيحية أسفل الترويسة */}
          <div className="flex flex-wrap items-center gap-5 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff8a3d]" />
              <span className="text-text-muted">{t('overview.chart.gross_sales')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#006c4b]" />
              <span className="text-text-muted">{t('overview.chart.net_earnings')}</span>
            </div>
          </div>

          {/* مساحة الرسم البياني */}
          <div className="h-72 w-full pt-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: isRtl ? 10 : 25,
                  left: isRtl ? 25 : 10,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.salesFill} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={colors.salesFill} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.netFill} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={colors.netFill} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />

                <XAxis
                  dataKey="label"
                  stroke={colors.text}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: colors.grid }}
                />

                <YAxis
                  stroke={colors.text}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: colors.grid }}
                  orientation={isRtl ? 'right' : 'left'}
                  tickFormatter={(v) => `${v}`}
                />

                <Tooltip
                  content={
                    <ChartTooltip
                      isRtl={isRtl}
                      formatMoney={formatMoney}
                      t={t}
                    />
                  }
                />

                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke={colors.salesStroke}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />

                <Area
                  type="monotone"
                  dataKey="net"
                  stroke={colors.netStroke}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#netGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  )
}
