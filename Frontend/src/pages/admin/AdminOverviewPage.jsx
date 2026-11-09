import {
  AlertTriangle,
  Calendar,
  CreditCard,
  DollarSign,
  PackageCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { PriceTag } from '../../components/ui/PriceTag'
import { Skeleton } from '../../components/ui/Skeleton'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useSettings } from '../../context/SettingsContext'
import { AdminPendingPaymentsWidget } from '../../features/admin/overview/AdminPendingPaymentsWidget'
import { AdminRecentOrders } from '../../features/admin/overview/AdminRecentOrders'
import { AdminRevenueChart } from '../../features/admin/overview/AdminRevenueChart'
import { useFormat } from '../../hooks/useFormat'
import { earningsService } from '../../services/earningsService'
import { orderService } from '../../services/orderService'
import { paymentService } from '../../services/paymentService'
import { getFriendlyError } from '../../utils'

/**
 * صفحة لوحة تحكم إدارة المنصة الشاملة (Admin Overview)
 * تعرض مؤشرات الأداء الحيوية، عمولة المنصة الثابتة (20٪)، طابور فودافون كاش المعلق، وحركة الطلبات
 */
export default function AdminOverviewPage() {
  const { t } = useTranslation('admin-core')
  const { user } = useAuth()
  const { settings } = useSettings()
  const { isRtl } = useLanguage()
  const { formatNumber } = useFormat()

  const [overviewData, setOverviewData] = useState(null)
  const [pendingPayments, setPendingPayments] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overview, pending, orders] = await Promise.all([
        earningsService.getAdminOverview('month'),
        paymentService.getPayments({ status: 'pending' }),
        orderService.getAllOrders(),
      ])

      setOverviewData(overview)
      setPendingPayments(pending)
      setRecentOrders(orders)
    } catch (err) {
      console.error('Failed to load admin overview:', err)
      setError(err || true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-[24px]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-[20px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96 rounded-[24px]" />
          <Skeleton className="h-96 rounded-[24px]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center rounded-[24px] bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300">
        <p className="font-bold text-sm mb-3">{getFriendlyError(error, t)}</p>
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
        >
          {t('common:actions.retry', isRtl ? 'إعادة المحاولة' : 'Try Again')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ترويسة لوحة تحكم الإدارة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title={user?.name ? `${t('overview.title')} (${user.name})` : t('overview.title')}
          description={t('overview.description')}
        />

        {/* مؤشر الدورة المالية الحالية */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-surface border border-surface-border text-xs shadow-xs self-start md:self-center">
          <Calendar className="w-4 h-4 text-brand-orange" />
          <div className="text-start">
            <span className="text-text-muted text-[11px] block">{t('overview.cycleBadge')}</span>
            <span className="font-bold text-text-main">
              {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* تحذير رقم المحفظة غير المُعدّ للإدارة */}
      {!settings?.platformWallet && (
        <div className="p-4 rounded-[20px] bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{t('overview.walletWarning', 'تنبيه: رقم محفظة المنصة (فودافون كاش) غير مُعدّ بعد. لن يتمكن العملاء من إتمام الطلبات حتى يتم ضبطه.')}</span>
          </div>
          <Link
            to="/admin/settings"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shrink-0"
          >
            {t('overview.setupWallet', 'ضبط رقم المحفظة')}
          </Link>
        </div>
      )}

      {/* بطاقات الإحصائيات الخمس الرئيسية (StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. إجمالي مبيعات المنصة */}
        <StatCard
          title={t('overview.stats.grossSales')}
          value={<PriceTag amount={overviewData?.grossSales || 0} size="md" />}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle={t('overview.stats.grossSalesSubtitle')}
        />

        {/* 2. عمولة المنصة (20%) */}
        <StatCard
          title={t('overview.stats.platformCommission')}
          value={<PriceTag amount={overviewData?.platformCommission || 0} size="md" />}
          icon={<DollarSign className="w-5 h-5 text-brand-orange" />}
          subtitle={t('overview.stats.platformCommissionSubtitle')}
          className="ring-1 ring-brand-orange/30"
        />

        {/* 3. مستحقات البائعات (80%) */}
        <StatCard
          title={t('overview.stats.sellersNet')}
          value={<PriceTag amount={overviewData?.sellersNet || 0} size="md" />}
          icon={<Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          subtitle={t('overview.stats.sellersNetSubtitle')}
        />

        {/* 4. دفعات بانتظار المراجعة */}
        <StatCard
          title={t('overview.stats.pendingPayments')}
          value={
            <span className="font-mono font-black text-rose-600 dark:text-rose-400">
              {formatNumber(pendingPayments.length)}
            </span>
          }
          icon={<CreditCard className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          subtitle={t('overview.stats.pendingPaymentsSubtitle')}
        />

        {/* 5. إجمالي الطلبات */}
        <StatCard
          title={t('overview.stats.totalOrders')}
          value={
            <span className="font-mono font-black text-text-main">
              {formatNumber(overviewData?.totalOrders || recentOrders.length)}
            </span>
          }
          icon={<PackageCheck className="w-5 h-5 text-brand-mint-text dark:text-brand-mint" />}
          subtitle={t('overview.stats.totalOrdersSubtitle')}
        />
      </div>

      {/* صف الرسم البياني المالي + ودجت إيصالات فودافون كاش المعلقة */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* الرسم البياني (7 أعمدة) */}
        <div className="lg:col-span-7">
          <AdminRevenueChart orders={recentOrders} />
        </div>

        {/* ودجت الإيصالات المعلقة (5 أعمدة) */}
        <div className="lg:col-span-5">
          <AdminPendingPaymentsWidget
            pendingPayments={pendingPayments}
            loading={loading}
          />
        </div>
      </div>

      {/* قائمة أحدث الطلبيات الواردة */}
      <div>
        <AdminRecentOrders orders={recentOrders} loading={loading} />
      </div>
    </div>
  )
}
