import { ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { QuantityStepper } from '../../components/ui/QuantityStepper'
import { CATEGORIES } from '../../config/constants'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { getDisplayName, pickLocale } from '../../utils'

/**
 * درج السلة الجانبي السريع
 * ينزلق بسلاسة من طرف النهاية (اليسار في العربية RTL، واليمين في الإنجليزية LTR)
 * يتيح لمسؤولة الحضانة مراجعة الوسائل التعليمية والكميات دون مغادرة الصفحة
 */
export function MiniCartDrawer({ open, onClose }) {
  const { t } = useTranslation(['cart', 'common'])
  const { isRtl } = useLanguage()
  const { items, itemsBySeller, totalCount, subtotal, updateQty, removeItem } = useCart()
  const navigate = useNavigate()

  const handleCheckout = () => {
    onClose()
    navigate('/checkout')
  }

  // البحث عن اسم التصنيف باللغة الحالية
  const getCategoryName = (categoryId) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId || c.slug === categoryId)
    if (!cat) return null
    return isRtl ? cat.name : cat.nameEn
  }

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      side="end"
      size="md"
      title={`${t('cart:miniCart.title')} (${totalCount})`}
    >
      <div className="flex flex-col h-full justify-between">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 my-auto">
            <div className="w-20 h-20 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center mb-4 shadow-xs">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold font-heading text-text-main mb-1.5">
              {t('cart:miniCart.empty')}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed max-w-xs mb-6">
              {t('cart:miniCart.emptyDesc')}
            </p>
            <Button
              type="button"
              onClick={() => {
                onClose()
                navigate('/products')
              }}
              size="sm"
              className="rounded-full px-6"
            >
              {t('cart:empty.action')}
            </Button>
          </div>
        ) : (
          <>
            {/* قائمة الوسائل مجمعة حسب البائعة */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollbar p-4 sm:p-5 space-y-5">
              {Object.values(itemsBySeller).map((group) => (
                <div
                  key={group.sellerId}
                  className="rounded-[20px] bg-surface-subtle border border-surface-border p-3.5 space-y-3"
                >
                  {/* رأس مجموعة البائعة */}
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border text-xs">
                    <span className="font-bold text-text-main" data-user-content="true">
                      {t('cart:itemsFrom', {
                        seller: getDisplayName(group, isRtl ? 'ar' : 'en'),
                      })}
                    </span>
                    <span className="text-text-muted font-medium">
                      <PriceTag amount={group.subtotal} size="sm" />
                    </span>
                  </div>

                  {/* بنود الوسائل الخاصة بالبائعة */}
                  <div className="space-y-3">
                    {group.items.map((item) => {
                      const categoryLabel = getCategoryName(item.categoryId)

                      return (
                        <div
                          key={item.productId}
                          className="flex gap-3 bg-surface p-2.5 rounded-[16px] border border-surface-border/50 shadow-xs"
                        >
                          <div className="w-16 h-16 rounded-[14px] overflow-hidden shrink-0 border border-surface-border/60">
                            <ProductImage
                              src={item.image}
                              alt={pickLocale(item.name, isRtl ? 'ar' : 'en').text}
                              aspectRatio="1/1"
                            />
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <h4
                                  className="text-xs font-bold text-text-main truncate"
                                  data-user-content="true"
                                >
                                  {pickLocale(item.name, isRtl ? 'ar' : 'en').text}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.productId)}
                                  className="text-text-muted hover:text-rose-600 transition-colors p-1 shrink-0 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  aria-label={t('cart:deleteItem')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {categoryLabel && (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-brand-orange-text dark:text-brand-orange">
                                  {categoryLabel}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-1">
                              <PriceTag amount={item.price * item.qty} size="sm" />
                              <QuantityStepper
                                value={item.qty}
                                onChange={(q) => updateQty(item.productId, q)}
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* شريط الإجمالي والأزرار الثابت بالأسفل */}
            <div className="p-4 sm:p-5 border-t border-surface-border bg-surface shrink-0 space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-text-muted">
                  {t('cart:miniCart.subtotal')}
                </span>
                <PriceTag amount={subtotal} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/cart"
                  onClick={onClose}
                  className="h-12 rounded-full border border-surface-border flex items-center justify-center text-xs font-bold text-text-main hover:bg-surface-subtle transition-colors whitespace-nowrap px-3 text-center"
                >
                  {t('cart:miniCart.viewCart')}
                </Link>

                <Button
                  type="button"
                  onClick={handleCheckout}
                  size="md"
                  className="w-full text-xs font-bold whitespace-nowrap"
                  endIcon={
                    isRtl ? (
                      <ArrowLeft className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )
                  }
                >
                  {t('cart:miniCart.checkout')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
