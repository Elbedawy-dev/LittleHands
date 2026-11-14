import { Heart, PhoneCall, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PriceTag } from '../../components/ui/PriceTag'
import { QuantityStepper } from '../../components/ui/QuantityStepper'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { userService } from '../../services/userService'
import { getDisplayName, getFriendlyError, getImageUrl, pickLocale } from '../../utils'
import { getProductStockMeta } from '../../utils/productStock'

/**
 * قسم معلومات الوسيلة التعليمية وإجراءات الشراء والمفضلة
 */
export function ProductInfo({ product }) {
  const { t } = useTranslation(['storefront', 'common'])
  const { language } = useLanguage()
  const { addItem } = useCart()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isFavLoading, setIsFavLoading] = useState(false)

  const sellerId =
    product.seller?.id ||
    (typeof product.sellerId === 'string' && product.sellerId !== '[object Object]' ? product.sellerId : '')
  const sellerAvatar = getImageUrl(
    product.seller?.avatar || product.sellerAvatar || product.sellerId?.avatar
  )
  const sellerDisplayName =
    getDisplayName(
      product.seller || {
        id: sellerId,
        sellerId,
        name: product.sellerName,
        nameEn: product.sellerNameEn,
      },
      language
    ) || t('common:roles.seller')

  const { stockCount, isOutOfStock, isLowStock, maxOrderQty, status } = getProductStockMeta(product)

  // إضافة للسلة
  const handleAddToCart = () => {
    if (isOutOfStock) return
    addItem(product, Math.min(quantity, maxOrderQty))
    toast.success(t('storefront:productDetails.addedToCart'), {
      position: 'top-center',
    })
  }

  // اطلب الآن: إضافة للسلة ثم التوجه الفوري لصفحة إتمام الطلب / السلة
  const handleOrderNow = () => {
    if (isOutOfStock) return
    addItem(product, Math.min(quantity, maxOrderQty))
    navigate('/cart')
  }

  // التبديل في المفضلة مع حارس تسجيل الدخول
  const handleToggleFavorite = async () => {
    if (!isAuthenticated || !user) {
      toast.error(t('storefront:productDetails.loginRequired'))
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    setIsFavLoading(true)
    const nextState = !isFavorite
    setIsFavorite(nextState)

    try {
      await userService.toggleFavorite(product.id)
    } catch (err) {
      setIsFavorite(!nextState)
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsFavLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-start">
      {/* شريحة البائعة الحرفية وشارة التوفر والمفضلة */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to={sellerId ? `/sellers/${sellerId}` : '/sellers'}
          className="inline-flex items-center gap-2 p-1.5 pe-3.5 rounded-full bg-surface-subtle border border-surface-border hover:border-brand-orange/50 transition-colors group"
        >
          <Avatar
            src={sellerAvatar}
            name={sellerDisplayName}
            role="seller"
            size="sm"
          />
          <div className="text-start">
            <span
              className="text-xs font-bold text-text-main group-hover:text-brand-orange-text transition-colors"
              data-user-content="true"
            >
              {t('storefront:productDetails.madeBy', { name: sellerDisplayName })}
            </span>
          </div>
        </Link>

        {/* زر المفضلة */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          disabled={isFavLoading}
          className="w-10 h-10 rounded-full bg-surface border border-surface-border shadow-xs flex items-center justify-center text-text-muted hover:text-rose-500 transition-colors cursor-pointer"
          aria-label={
            isFavorite
              ? t('storefront:favorites.remove', { defaultValue: 'إزالة من المفضلة' })
              : t('storefront:favorites.add', { defaultValue: 'إضافة للمفضلة' })
          }
        >
          <Heart
            className={`w-5 h-5 transition-transform ${
              isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
            }`}
          />
        </button>
      </div>

      {/* عنوان الوسيلة وشارة المرحلة */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant={isOutOfStock ? 'red' : isLowStock ? 'yellow' : 'mint'} size="sm">
            {!isOutOfStock
              ? t('storefront:productDetails.inStock')
              : t('storefront:productDetails.outOfStock')}
          </Badge>
          <Badge variant="orange" size="sm">
            {t('storefront:productDetails.handmadeBadge')}
          </Badge>
        </div>

        <h1
          className="text-2xl sm:text-3xl font-black font-heading text-text-main leading-tight"
          data-user-content="true"
        >
          {pickLocale(product.name, language).text}
        </h1>
      </div>

      {/* السعر للمستهلك */}
      <div className="pt-2">
        <PriceTag amount={product.price} size="lg" />
      </div>

      {/* تحديد الكمية وحالة المخزون وملاحظة توريد الحضانات */}
      <div className="space-y-3 pt-4 border-t border-surface-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold text-text-main">
              {t('storefront:productDetails.quantityLabel')}
            </label>
            <QuantityStepper
              value={Math.min(quantity, maxOrderQty)}
              onChange={(val) => setQuantity(Math.min(Math.max(1, val), maxOrderQty))}
              min={1}
              max={maxOrderQty}
              disabled={isOutOfStock}
            />
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${
              status === 'out'
                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                : status === 'low'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                status === 'out' ? 'bg-rose-500' : status === 'low' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <span>
              {status === 'out'
                ? t('storefront:productDetails.stock.outOfStock')
                : status === 'low'
                  ? t('storefront:productDetails.stock.lowStock', { count: stockCount })
                  : stockCount !== null
                    ? t('storefront:productDetails.stock.inStockCount', { count: stockCount })
                    : t('storefront:productDetails.stock.inStock')}
            </span>
          </span>
        </div>

        <p className="text-xs font-semibold text-brand-orange-text dark:text-brand-orange">
          {t('storefront:productDetails.nurseryNote')}
        </p>
      </div>

      {/* أزرار الإجراءات والشراء المباشر */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2 items-stretch">
        {/* زر إضافة للسلة */}
        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          size="lg"
          className="flex-1 min-h-[52px] h-auto py-2.5 px-5 text-base gap-3 font-bold leading-snug text-center whitespace-normal"
          startIcon={<ShoppingBag className="w-5 h-5" />}
        >
          {isOutOfStock
            ? t('storefront:productDetails.stock.outOfStock')
            : t('storefront:productDetails.addToCart')}
        </Button>

        {/* زر اطلب الآن مع الدفع السريع بفودافون كاش */}
        <Button
          onClick={handleOrderNow}
          disabled={isOutOfStock}
          variant="secondary"
          size="lg"
          className="flex-1 min-h-[52px] h-auto py-2.5 px-5 text-base gap-3 font-bold leading-snug text-center whitespace-normal bg-surface hover:bg-surface-subtle border-surface-border text-text-main"
          startIcon={<PhoneCall className="w-5 h-5 text-[#e60000]" />}
        >
          {t('storefront:productDetails.orderNow')}
        </Button>
      </div>
    </div>
  )
}
