import { AlertTriangle, CheckCircle2, Layers, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { useFormat } from '../../../hooks/useFormat'

/**
 * بطاقات المؤشرات السريعة لكتالوج الوسائل التعليمية
 */
export function ProductStats({ products = [], orders = [], commissionRate = 0.20 }) {
  const { t } = useTranslation('admin-manage')
  const { formatNumber, formatMoney } = useFormat()

  // إجمالي الوسائل
  const totalCount = products.length

  // الوسائل المنشورة
  const publishedCount = products.filter((p) => p.isPublished).length

  // تنبيهات المخزون المنخفض (أقل من 5 قطع)
  const lowStockCount = products.filter((p) => (p.stockCount ?? 10) < 5 || !p.inStock).length

  // مبيعات الشهر وعمولة الإدارة
  const totalSales = orders
    .filter((o) => o.status !== 'payment_rejected')
    .reduce((sum, o) => sum + (o.subtotal || 0), 0)

  const adminCommission = Math.round(totalSales * commissionRate)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. إجمالي الوسائل */}
      <Card variant="default" padding="md" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
          <Layers className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {t('products.stats.totalAids')}
          </span>
          <span className="text-2xl font-black font-heading text-text-main mt-0.5 block">
            {formatNumber(totalCount)}
          </span>
        </div>
      </Card>

      {/* 2. الوسائل المنشورة */}
      <Card variant="default" padding="md" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-mint/15 text-brand-mint flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {t('products.stats.activeAids')}
          </span>
          <span className="text-2xl font-black font-heading text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {formatNumber(publishedCount)}
          </span>
        </div>
      </Card>

      {/* 3. تنبيه المخزون */}
      <Card variant="default" padding="md" className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {t('products.stats.lowStock')}
          </span>
          <span className="text-2xl font-black font-heading text-amber-600 dark:text-amber-400 mt-0.5 block">
            {formatNumber(lowStockCount)}
          </span>
        </div>
      </Card>

      {/* 4. مبيعات الشهر وعمولة الإدارة 20% */}
      <Card variant="default" padding="md" className="flex items-center gap-4 bg-gradient-to-br from-brand-orange/5 to-surface">
        <div className="w-12 h-12 rounded-2xl bg-brand-yellow/20 text-brand-orange-text dark:text-brand-yellow flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-xs text-text-muted font-medium block truncate">
            {t('products.stats.platformCommission')}
          </span>
          <span className="text-xl font-black font-heading text-brand-orange-text dark:text-brand-orange mt-0.5 block truncate">
            {formatMoney(adminCommission)}
          </span>
        </div>
      </Card>
    </div>
  )
}
