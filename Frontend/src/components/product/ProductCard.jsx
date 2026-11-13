import { Heart, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../config/constants'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { userService } from '../../services/userService'
import { getDisplayName, pickLocale } from '../../utils'
import { Badge } from '../ui/Badge'
import { PriceTag } from '../ui/PriceTag'
import { ProductImage } from '../ui/ProductImage'

export function ProductCard({
  product,
  isFavorite: initialIsFavorite = false,
  onFavoriteToggle = null,
}) {
  const { t } = useTranslation(['common', 'storefront'])
  const { language } = useLanguage()
  const { addItem } = useCart()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)

  // العثور على معلومات التصنيف
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
    addItem(product, 1)
  }

  const productName = pickLocale(product.name, language).text

  return (
    <div className="group relative flex flex-col rounded-[24px] bg-surface border border-surface-border shadow-soft hover-lift overflow-hidden transition-all duration-300">
      {/* حاوية الصورة وعناصر التفاعل العلوية */}
      <div className="relative overflow-hidden p-3 pb-0">
        <Link to={`/products/${product.id}`} className="block overflow-hidden rounded-[20px]">
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
          className="absolute top-5 end-5 w-9 h-9 rounded-full bg-white/90 dark:bg-surface/90 shadow-md flex items-center justify-center text-text-muted hover:text-rose-500 transition-colors z-10"
          aria-label={
            isFavorite
              ? t('storefront:favorites.remove', { defaultValue: 'إزالة من المفضلة' })
              : t('storefront:favorites.add', { defaultValue: 'إضافة للمفضلة' })
          }
        >
          <Heart
            className={`w-5 h-5 transition-transform duration-200 ${
              isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
            }`}
          />
        </button>

        {/* شارة التصنيف المبهجة */}
        <div className="absolute bottom-3 start-5 z-10">
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
      <div className="flex flex-col flex-1 p-4">
        {/* اسم البائعة الحرفية */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-text-muted" data-user-content="true">
            {getDisplayName({ id: product.sellerId, sellerId: product.sellerId, name: product.sellerName, nameEn: product.sellerNameEn }, language) || t('common:roles.seller')}
          </span>
          {product.inStock ? (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {t('common:status.inStock')}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
              {t('common:status.outOfStock')}
            </span>
          )}
        </div>

        {/* اسم الوسيلة */}
        <Link
          to={`/products/${product.id}`}
          className="block group-hover:text-brand-orange-text transition-colors"
        >
          <h3
            className="font-heading font-bold text-base text-text-main line-clamp-2 min-h-[44px]"
            data-user-content="true"
          >
            {productName}
          </h3>
        </Link>

        {/* السعر وزر الإضافة للسلة */}
        <div className="mt-4 pt-3 border-t border-surface-border flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 whitespace-nowrap">
            <PriceTag amount={product.price} size="md" />
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-brand-orange text-white text-xs font-bold shadow-soft hover:bg-[#e07528] active:scale-95 transition-all select-none cursor-pointer flex-1 sm:flex-initial min-w-[120px] whitespace-nowrap"
            aria-label={t('common:actions.addToCart')}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>{t('common:actions.addToCart')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
