import { Edit, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Switch } from '../../components/ui/Switch'
import { CATEGORIES } from '../../config/constants'
import { cn, pickLocale } from '../../utils'

/**
 * بطاقة عرض الوسيلة التعليمية للشاشات الصغيرة
 * Mobile card representation of a teaching aid in SellerProductsPage
 */
export function ProductCardSeller({
  product,
  onTogglePublish,
  onDeleteClick,
  className,
}) {
  const { t, i18n } = useTranslation('seller')
  const isRtl = i18n.language === 'ar'

  // جلب اسم التصنيف المحدد
  const category = CATEGORIES.find((c) => c.id === product.categoryId)
  const categoryName = category ? (isRtl ? category.name : category.nameEn) : product.categoryId

  return (
    <Card padding="md" className={cn('relative flex flex-col justify-between gap-4', className)}>
      <div className="flex items-start gap-3.5">
        <div className="w-20 h-20 shrink-0">
          <ProductImage
            src={product.images && product.images[0]}
            alt={typeof product.name === 'object' ? (product.name?.ar || product.name?.en || '') : product.name}
            aspectRatio="1/1"
            className="rounded-2xl"
          />
        </div>

        <div className="flex-1 min-w-0">
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange mb-1">
            {categoryName}
          </span>
          <h4
            className="font-heading font-black text-sm text-text-main line-clamp-1"
            data-user-content="true"
          >
            {pickLocale(product.name, isRtl ? 'ar' : 'en').text}
          </h4>
          {!product.name?.en && !product.nameEn && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              {t('products.missing_en')}
            </span>
          )}

          <div className="mt-1 flex items-baseline gap-2">
            <PriceTag amount={product.price} size="sm" />
          </div>

          <div className="mt-1 text-[11px] font-medium text-text-muted">
            {product.stockCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {t('products.in_stock', { count: product.stockCount })}
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-bold">
                {t('products.out_of_stock')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
        {/* مفتاح التبديل للنشر الفوري */}
        <div className="flex items-center gap-2">
          <Switch
            id={`pub_mob_${product.id}`}
            checked={Boolean(product.isPublished)}
            onChange={(e) => onTogglePublish(product.id, e.target.checked)}
            label={product.isPublished ? t('products.published') : t('products.draft')}
            containerClassName="gap-2"
          />
        </div>

        {/* أزرار الإجراءات: تعديل وحذف */}
        <div className="flex items-center gap-1.5">
          <Link
            to={`/seller/products/${product.id}/edit`}
            className="p-2 rounded-full text-text-muted hover:text-brand-orange hover:bg-surface-subtle transition-colors"
            aria-label={t('products.edit')}
          >
            <Edit className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => onDeleteClick(product)}
            className="p-2 rounded-full text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            aria-label={t('products.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}
