import { Heart, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CATEGORIES, STAGES } from '../../config/constants'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { userService } from '../../services/userService'
import { getDisplayName, getImageUrl, pickLocale } from '../../utils'
import { getProductStockMeta } from '../../utils/productStock'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { PriceTag } from '../ui/PriceTag'
import { ProductImage } from '../ui/ProductImage'

function translateMaterial(materialId, t) {
  switch (materialId) {
    case 'felt':
      return t('common:materials.felt')
    case 'cardstock':
      return t('common:materials.cardstock')
    case 'fabric':
      return t('common:materials.fabric')
    case 'canson':
      return t('common:materials.canson')
    case 'nasbian':
      return t('common:materials.nasbian')
    default:
      return materialId
  }
}

export function ProductCard({
  product,
  isFavorite: initialIsFavorite = false,
  onFavoriteToggle = null,
}) {
  const { t } = useTranslation(['common', 'storefront'])
  const { language } = useLanguage()
  const { addItem } = useCart()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)

  const category = CATEGORIES.find(
    (c) => c.id === product.categoryId || c.slug === product.categoryId
  )
  const categoryName = category
    ? language === 'ar'
      ? category.name
      : category.nameEn
    : language === 'ar'
    ? 'وسيلة تعليمية'
    : 'Educational Aid'

  const sellerId =
    product.seller?.id ||
    (typeof product.sellerId === 'string' && product.sellerId !== '[object Object]' ? product.sellerId : '')
  const sellerName =
    getDisplayName(
      product.seller || {
        id: sellerId,
        sellerId,
        name: product.sellerName,
        nameEn: product.sellerNameEn,
      },
      language
    ) || t('common:roles.seller')
  const sellerAvatar = getImageUrl(
    product.seller?.avatar || product.sellerAvatar || product.sellerId?.avatar
  )

  const productName = pickLocale(product.name, language).text
  const productDescription = pickLocale(product.description, language).text

  const stageIds = Array.isArray(product.stages) && product.stages.length > 0
    ? product.stages
    : product.stage
      ? [product.stage]
      : []
  const visibleStages = stageIds.slice(0, 2).map((stageId) => {
    const match = STAGES.find((st) => st.id === stageId)
    return {
      id: stageId,
      label: match ? (language === 'ar' ? match.label : match.labelEn) : stageId,
    }
  })
  const extraStages = Math.max(0, stageIds.length - visibleStages.length)

  const materialIds = Array.isArray(product.materials) ? product.materials.filter(Boolean) : []
  const visibleMaterials = materialIds.slice(0, 2).map((matId) => ({
    id: matId,
    label: translateMaterial(matId, t),
  }))
  const extraMaterials = Math.max(0, materialIds.length - visibleMaterials.length)

  const { stockCount, isOutOfStock, status } = getProductStockMeta(product)

  const handleFavoriteClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !isFavorite
    setIsFavorite(next)
    try {
      await userService.toggleFavorite(product.id)
      if (onFavoriteToggle) onFavoriteToggle(product.id, next)
    } catch {
      setIsFavorite(!next)
    }
  }

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return
    addItem(product, 1)
  }

  const stockPillClass =
    status === 'out'
      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
      : status === 'low'
        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'

  const stockDotClass =
    status === 'out' ? 'bg-rose-500' : status === 'low' ? 'bg-amber-500' : 'bg-emerald-500'

  const stockLabel =
    status === 'out'
      ? t('storefront:productDetails.stock.outOfStock')
      : status === 'low'
        ? t('storefront:productDetails.stock.lowStock', { count: stockCount })
        : stockCount !== null
          ? t('storefront:productDetails.stock.inStockCount', { count: stockCount })
          : t('storefront:productDetails.stock.inStock')

  return (
    <article className="group relative h-full flex flex-col rounded-[22px] bg-surface border border-surface-border shadow-soft hover-lift overflow-hidden transition-all duration-300">
      {/* حاوية الصورة وعناصر التفاعل العلوية */}
      <div className="relative overflow-hidden p-2.5 pb-0">
        <Link to={`/products/${product.id}`} className="block overflow-hidden rounded-[18px]">
          <ProductImage
            src={product.images && product.images[0]}
            alt={productName}
            aspectRatio="4/3"
            className="group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        </Link>

        {/* زر المفضلة */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className="absolute top-4 end-4 w-9 h-9 rounded-full bg-white/90 dark:bg-surface/90 shadow-md flex items-center justify-center text-text-muted hover:text-rose-500 transition-colors z-10 cursor-pointer"
          aria-label={
            isFavorite
              ? t('storefront:favorites.remove')
              : t('storefront:favorites.add')
          }
        >
          <Heart
            className={`w-4 h-4 transition-transform duration-200 ${
              isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
            }`}
          />
        </button>

        {/* شارة التصنيف المبهجة */}
        <div className="absolute bottom-2.5 start-4 z-10">
          <Badge
            variant="default"
            size="sm"
            className="bg-white/95 dark:bg-surface/95 shadow-xs font-bold text-text-main"
          >
            {categoryName}
          </Badge>
        </div>
      </div>

      {/* تفاصيل الوسيلة التعليمية */}
      <div className="flex flex-col flex-1 p-3.5 pt-3 gap-1.5 min-w-0">
        {/* صف البائعة ومؤشر التوفر مدمجان لتقليل الارتفاع */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <Link
            to={sellerId ? `/sellers/${sellerId}` : '/sellers'}
            className="inline-flex items-center gap-1.5 min-w-0 hover:text-brand-orange-text transition-colors"
          >
            <Avatar
              src={sellerAvatar}
              name={sellerName}
              role="seller"
              size="sm"
              className="w-6 h-6 text-[10px] shrink-0"
            />
            <span className="text-[11px] font-semibold text-text-muted truncate" data-user-content="true">
              {sellerName}
            </span>
          </Link>

          <span
            data-testid="product-stock-pill"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 whitespace-nowrap ${stockPillClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stockDotClass}`} />
            <span>{stockLabel}</span>
          </span>
        </div>

        {/* عنوان الوسيلة (سطران بحد أقصى) */}
        <Link
          to={`/products/${product.id}`}
          className="block group-hover:text-brand-orange-text transition-colors"
        >
          <h3
            className="font-heading font-bold text-[15px] leading-snug text-text-main line-clamp-2 min-h-[2.6rem]"
            data-user-content="true"
          >
            {productName}
          </h3>
        </Link>

        {/* وصف مختصر (سطران بحد أقصى) */}
        <p
          className="text-xs text-text-muted leading-snug line-clamp-2 min-h-[2.1rem]"
          data-user-content="true"
        >
          {productDescription}
        </p>

        {/* شارات المراحل العمرية والخامات: سطر واحد بحد أقصى لكل نوع + شارة +N للباقي */}
        {(visibleStages.length > 0 || visibleMaterials.length > 0) && (
          <div className="space-y-1 pt-0.5 min-w-0">
            {visibleStages.length > 0 && (
              <div
                data-testid="product-stages-row"
                className="flex flex-nowrap items-center gap-1 min-w-0 overflow-hidden"
              >
                {visibleStages.map((stage) => (
                  <span
                    key={stage.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/50 truncate min-w-0"
                  >
                    {stage.label}
                  </span>
                ))}
                {extraStages > 0 && (
                  <span
                    dir="ltr"
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100/80 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200 shrink-0"
                  >
                    +{extraStages}
                  </span>
                )}
              </div>
            )}

            {visibleMaterials.length > 0 && (
              <div
                data-testid="product-materials-row"
                className="flex flex-nowrap items-center gap-1 min-w-0 overflow-hidden"
              >
                {visibleMaterials.map((mat) => (
                  <span
                    key={mat.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-subtle text-text-muted border border-surface-border max-w-[120px] truncate min-w-0"
                  >
                    {mat.label}
                  </span>
                ))}
                {extraMaterials > 0 && (
                  <span
                    dir="ltr"
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-subtle text-text-main border border-surface-border shrink-0"
                  >
                    +{extraMaterials}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ذيل الكارت المثبت للأسفل لتساوي ارتفاع كل الكروت في الصف */}
        <footer className="mt-auto pt-2 border-t border-surface-border flex items-center justify-between gap-2">
          <div className="min-w-0 whitespace-nowrap">
            <PriceTag amount={product.price} size="md" />
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full bg-brand-orange text-white text-xs font-bold shadow-soft hover:bg-[#e07528] active:scale-95 transition-all select-none cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-orange disabled:active:scale-100"
            aria-label={
              isOutOfStock
                ? t('storefront:productDetails.stock.outOfStock')
                : t('common:actions.addToCart')
            }
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isOutOfStock ? t('common:status.outOfStock') : t('common:actions.addToCart')}
            </span>
          </button>
        </footer>
      </div>
    </article>
  )
}
