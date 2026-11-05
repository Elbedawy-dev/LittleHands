import { Edit2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ProductImage } from '../../../components/ui/ProductImage'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Switch } from '../../../components/ui/Switch'
import { CATEGORIES } from '../../../config/constants'
import { useLanguage } from '../../../context/LanguageContext'
import { useFormat } from '../../../hooks/useFormat'
import { calcCommission, cn, getDisplayName, pickLocale } from '../../../utils'

/**
 * جدول وبطاقات عرض الوسائل التعليمية للإدارة
 */
export function ProductListTable({
  products = [],
  loading = false,
  onTogglePublish,
  onDelete,
  commissionRate = 0.2,
}) {
  const { t, i18n } = useTranslation('admin-manage')
  const { isRtl } = useLanguage()
  const { formatMoney, formatNumber } = useFormat()

  // خريطة أسماء التصنيفات
  const categoryMap = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = isRtl ? cat.name : cat.nameEn
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[20px]" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={t('products.emptyTitle')}
        description={t('products.emptyMessage')}
      />
    )
  }

  return (
    <div className="w-full">
      {/* عرض الشاشات المتوسطة والكبيرة (جدول منظم) */}
      <div className="hidden lg:block overflow-x-auto rounded-[24px] border border-surface-border bg-surface shadow-soft">
        <table className="w-full text-start border-collapse text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-subtle/60 text-text-muted text-xs font-bold">
              <th className="py-3.5 px-3 text-start">{t('products.table.aid')}</th>
              <th className="py-3.5 px-2.5 text-start">{t('products.table.seller')}</th>
              <th className="py-3.5 px-2.5 text-start">{t('products.table.category')}</th>
              <th className="py-3.5 px-2.5 text-start">{t('products.table.price')}</th>
              <th className="py-3.5 px-2.5 text-start">{t('products.table.commission')}</th>
              <th className="py-3.5 px-2.5 text-start">{t('products.table.sellerNet')}</th>
              <th className="py-3.5 px-2 text-center">{t('products.table.stock')}</th>
              <th className="py-3.5 px-2 text-center">{t('products.table.status')}</th>
              <th className="py-3.5 px-3 text-end">{t('products.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {products.map((product) => {
              const { commission, net } = calcCommission(product.price, commissionRate)
              const categoryTitle = categoryMap[product.categoryId] || product.categoryId
              const isLowStock = (product.stockCount ?? 10) < 5

              return (
                <tr
                  key={product.id}
                  className="hover:bg-surface-subtle/30 transition-colors"
                >
                  {/* الوسيلة مع الصورة والاسم */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-surface-border/60">
                        <ProductImage
                          src={product.images?.[0]}
                          alt={typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}
                          aspectRatio="1/1"
                          containerClassName="rounded-xl w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 max-w-[190px]">
                        <span
                          className="font-bold text-text-main block truncate text-xs sm:text-sm"
                          data-user-content="true"
                        >
                          {pickLocale(product.name, isRtl ? 'ar' : 'en').text}
                        </span>
                        {!product.name?.en && !product.nameEn ? (
                          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            {isRtl ? 'الترجمة الإنجليزية ناقصة' : 'English translation missing'}
                          </span>
                        ) : (
                          <span
                            className="text-[11px] text-text-muted block truncate font-medium"
                            data-user-content="true"
                          >
                            {typeof product.name === 'object' ? product.name.en : product.nameEn}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* البائعة المسؤولة */}
                  <td className="py-3 px-2.5 whitespace-nowrap">
                    <span className="text-xs font-semibold text-text-main">
                      {getDisplayName({ id: product.sellerId, sellerId: product.sellerId, name: product.sellerName, nameEn: product.sellerNameEn }, i18n.language)}
                    </span>
                  </td>

                  {/* التصنيف */}
                  <td className="py-3 px-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-subtle text-text-main border border-surface-border/50">
                      {categoryTitle}
                    </span>
                  </td>

                  {/* السعر */}
                  <td className="py-3 px-2.5 whitespace-nowrap font-bold text-xs sm:text-sm text-text-main">
                    {formatMoney(product.price)}
                  </td>

                  {/* العمولة (20%) */}
                  <td className="py-3 px-2.5 whitespace-nowrap text-xs font-bold text-brand-orange-text dark:text-brand-orange">
                    {formatMoney(commission)}
                  </td>

                  {/* صافي البائعة */}
                  <td className="py-3 px-2.5 whitespace-nowrap text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(net)}
                  </td>

                  {/* المخزون */}
                  <td className="py-3 px-2 whitespace-nowrap text-center">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono',
                        isLowStock
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-surface-subtle text-text-main'
                      )}
                    >
                      {formatNumber(product.stockCount ?? 10)}
                    </span>
                  </td>

                  {/* مفتاح النشر Switch */}
                  <td className="py-3 px-2 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center">
                      <Switch
                        id={`switch-prod-${product.id}`}
                        checked={product.isPublished}
                        onChange={() => onTogglePublish(product)}
                        aria-label={`${t('products.table.status')}: ${typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}`}
                      />
                    </div>
                  </td>

                  {/* إجراءات: تعديل وحذف */}
                  <td className="py-3 px-3 whitespace-nowrap text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        aria-label={`${t('products.edit')}: ${typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-brand-orange hover:bg-brand-orange/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => onDelete(product)}
                        aria-label={`${t('products.delete')}: ${typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* عرض الشاشات الصغيرة (بطاقات مكدسة تمنع الانزلاق العرضي تماماً) */}
      <div className="block lg:hidden space-y-3.5">
        {products.map((product) => {
          const { commission, net } = calcCommission(product.price, commissionRate)
          const categoryTitle = categoryMap[product.categoryId] || product.categoryId
          const isLowStock = (product.stockCount ?? 10) < 5

          return (
            <div
              key={product.id}
              className="p-4 rounded-[20px] bg-surface border border-surface-border shadow-soft space-y-3"
            >
              {/* ترويسة البطاقة: الصورة والاسم والتصنيف */}
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-surface-border/60">
                  <ProductImage
                    src={product.images?.[0]}
                    alt={typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}
                    aspectRatio="1/1"
                    containerClassName="rounded-2xl w-full h-full"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className="font-bold text-text-main block text-sm leading-snug"
                    data-user-content="true"
                  >
                    {pickLocale(product.name, isRtl ? 'ar' : 'en').text}
                  </span>
                  {!product.name?.en && !product.nameEn && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      {isRtl ? 'الترجمة الإنجليزية ناقصة' : 'English translation missing'}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[11px] font-semibold text-text-muted">
                      {getDisplayName({ id: product.sellerId, sellerId: product.sellerId, name: product.sellerName, nameEn: product.sellerNameEn }, i18n.language)}
                    </span>
                    <span className="text-text-muted text-[10px]">•</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-subtle text-text-main border border-surface-border/40">
                      {categoryTitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* تفاصيل الأسعار والعمولة والمخزون في شبكة صغيرة */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/60 text-xs">
                <div>
                  <span className="text-text-muted text-[11px] block">{t('products.table.price')}</span>
                  <span className="font-bold text-text-main text-sm">{formatMoney(product.price)}</span>
                </div>
                <div>
                  <span className="text-text-muted text-[11px] block">{t('products.table.stock')}</span>
                  <span
                    className={cn(
                      'font-bold font-mono',
                      isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-text-main'
                    )}
                  >
                    {formatNumber(product.stockCount ?? 10)} {t('products.pieces')}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-[11px] block">{t('products.table.commission')}</span>
                  <span className="font-bold text-brand-orange-text dark:text-brand-orange">
                    {formatMoney(commission)}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted text-[11px] block">{t('products.table.sellerNet')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(net)}
                  </span>
                </div>
              </div>

              {/* شريط الإجراءات والتحكم في النشر */}
              <div className="flex items-center justify-between pt-2.5 border-t border-surface-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-muted">
                    {product.isPublished ? t('products.published') : t('products.draft')}
                  </span>
                  <Switch
                    id={`mob-switch-prod-${product.id}`}
                    checked={product.isPublished}
                    onChange={() => onTogglePublish(product)}
                    aria-label={`${t('products.table.status')}: ${typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/admin/products/${product.id}/edit`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-subtle text-text-main hover:bg-brand-orange/15 hover:text-brand-orange transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('products.edit')}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('products.delete')}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
