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
import { getDisplayName, getFriendlyError, pickLocale } from '../../utils'

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

  const sellerDisplayName =
    getDisplayName(
      {
        id: product.sellerId,
        sellerId: product.sellerId,
        name: product.sellerName,
        nameEn: product.sellerNameEn,
      },
      language
    ) || t('common:roles.seller')

  // إضافة للسلة
  const handleAddToCart = () => {
    addItem(product, quantity)
    toast.success(t('storefront:productDetails.addedToCart'), {
      position: 'top-center',
    })
  }

  // اطلب الآن: إضافة للسلة ثم التوجه الفوري لصفحة إتمام الطلب / السلة
  const handleOrderNow = () => {
    addItem(product, quantity)
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
          to={`/sellers/${product.sellerId || ''}`}
          className="inline-flex items-center gap-2 p-1.5 pe-3.5 rounded-full bg-surface-subtle border border-surface-border hover:border-brand-orange/50 transition-colors group"
        >
          <Avatar
            src={product.sellerAvatar}
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
          <Badge variant="warning" size="sm">
            {product.inStock !== false
              ? t('storefront:productDetails.inStock')
              : t('storefront:productDetails.outOfStock')}
          </Badge>
          <Badge variant="outline" size="sm">
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

      {/* الوصف المختصر */}
      <p
        className="text-sm text-text-muted leading-relaxed"
        data-user-content="true"
      >
        {pickLocale(product.description, language).text}
      </p>

      {/* تحديد الكمية وملاحظة توريد الحضانات */}
      <div className="space-y-3 pt-4 border-t border-surface-border">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-bold text-text-main">
            {t('storefront:productDetails.quantityLabel')}
          </label>
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={50}
          />
        </div>
        <p className="text-xs font-semibold text-brand-orange-text dark:text-brand-orange">
          {t('storefront:productDetails.nurseryNote')}
        </p>
      </div>

      {/* أزرار الإجراءات والشراء المباشر */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {/* زر إضافة للسلة */}
        <Button
          onClick={handleAddToCart}
          size="lg"
          className="flex-1 font-bold whitespace-nowrap"
          startIcon={<ShoppingBag className="w-4 h-4" />}
        >
          {t('storefront:productDetails.addToCart')}
        </Button>

        {/* زر اطلب الآن مع الدفع السريع بفودافون كاش */}
        <Button
          onClick={handleOrderNow}
          variant="secondary"
          size="lg"
          className="flex-1 font-bold whitespace-nowrap bg-surface hover:bg-surface-subtle border-surface-border text-text-main"
          startIcon={<PhoneCall className="w-4 h-4 text-[#e60000]" />}
        >
          {t('storefront:productDetails.orderNow')}
        </Button>
      </div>
    </div>
  )
}
