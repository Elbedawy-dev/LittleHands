import { ArrowLeft, ArrowRight, Phone, ShoppingBag, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { QuantityStepper } from '../../components/ui/QuantityStepper'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { CATEGORIES, GOVERNORATES } from '../../config/constants'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { settingsService } from '../../services/settingsService'
import { getDisplayName, pickLocale } from '../../utils'

export default function CartPage() {
  const { t } = useTranslation(['cart', 'common'])
  const { isRtl } = useLanguage()
  const navigate = useNavigate()
  const { items, itemsBySeller, subtotal, updateQty, removeItem, clearCart } = useCart()

  // المحافظة المختارة لحساب تكلفة الشحن
  const [selectedGovName, setSelectedGovName] = useState(() => {
    try {
      const saved = sessionStorage.getItem('lh_selected_gov')
      return saved || 'القاهرة'
    } catch {
      return 'القاهرة'
    }
  })

  // ملاحظات الحضانة والتخصيص
  const [cartNotes, setCartNotes] = useState(() => {
    try {
      return sessionStorage.getItem('lh_cart_notes') || ''
    } catch {
      return ''
    }
  })

  // أسعار الشحن الديناميكية من خدمة الإعدادات
  const [shippingRates, setShippingRates] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // جلب أسعار الشحن من طبقة الخدمات
  useEffect(() => {
    let isMounted = true
    async function loadRates() {
      try {
        const rates = await settingsService.getShippingRates()
        if (isMounted && rates) {
          setShippingRates(rates)
        }
      } catch (err) {
        console.warn('Could not load shipping rates from service:', err)
      }
    }
    loadRates()
    return () => {
      isMounted = false
    }
  }, [])

  // حفظ المحافظة والملاحظات في sessionStorage للربط السلس مع شاشة الدفع
  useEffect(() => {
    try {
      if (selectedGovName) sessionStorage.setItem('lh_selected_gov', selectedGovName)
      if (cartNotes !== undefined) sessionStorage.setItem('lh_cart_notes', cartNotes)
    } catch {
      // ignore storage errors
    }
  }, [selectedGovName, cartNotes])

  // حساب تكلفة الشحن بدقة بناءً على المحافظة وإعدادات النظام
  const currentGov = GOVERNORATES.find((g) => g.name === selectedGovName)
  const shippingRate = (() => {
    if (!currentGov) return 40
    if (shippingRates && shippingRates[currentGov.zoneId] !== undefined) {
      return shippingRates[currentGov.zoneId]
    }
    return currentGov.shippingRate || 40
  })()

  const grandTotal = subtotal + shippingRate

  // استخراج تفاصيل التصنيف للعرض بالشارة المخصصة
  const getCategoryDetails = (categoryId) => {
    const cat = CATEGORIES.find((c) => c.id === categoryId || c.slug === categoryId)
    if (!cat) return null
    return {
      name: isRtl ? cat.name : cat.nameEn,
      color: cat.color,
      bgColor: cat.bgColor,
      textColor: cat.textColor,
    }
  }

  // الانتقال إلى شاشة إتمام الطلب مع تمرير بيانات الشحن والملاحظات
  const handleProceedToCheckout = () => {
    navigate('/checkout', {
      state: {
        governorate: selectedGovName,
        notes: cartNotes,
      },
    })
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title={t('cart:empty.title')}
          description={t('cart:empty.description')}
          icon={<ShoppingBag className="w-10 h-10 text-brand-orange" />}
          action={
            <Link to="/products">
              <Button size="lg" className="rounded-full px-8">
                {t('cart:empty.action')}
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-36 lg:pb-12">
      {/* رأس الصفحة مع زر تفريغ السلة */}
      <PageHeader
        title={t('cart:title')}
        description={t('cart:subtitle')}
        actions={
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1.5 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('cart:clearCart')}</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* الطرف الأيمن: قائمة الوسائل مجمعة حسب البائعة (8 أعمدة) */}
        <div className="lg:col-span-8 space-y-6">
          {Object.values(itemsBySeller).map((group) => (
            <Card key={group.sellerId} padding="none" className="overflow-hidden shadow-soft">
              {/* ترويسة مجموعة البائعة */}
              <div className="px-5 sm:px-6 py-4 bg-surface-subtle border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-orange" />
                  <h3
                    className="text-sm sm:text-base font-bold font-heading text-text-main"
                    data-user-content="true"
                  >
                    {t('cart:itemsFrom', {
                      seller: getDisplayName(group, isRtl ? 'ar' : 'en'),
                    })}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="text-text-muted">{t('cart:sellerSubtotal')}:</span>
                  <PriceTag amount={group.subtotal} size="sm" />
                </div>
              </div>

              {/* عناصر الوسائل التعليمية للبائعة */}
              <div className="divide-y divide-surface-border p-4 sm:p-6">
                {group.items.map((item) => {
                  const cat = getCategoryDetails(item.categoryId)
                  const lineTotal = item.price * item.qty

                  return (
                    <div
                      key={item.productId}
                      className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* تفاصيل الوسيلة والصورة */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[18px] overflow-hidden shrink-0 border border-surface-border shadow-xs">
                          <ProductImage
                            src={item.image}
                            alt={typeof item.name === 'object' ? (item.name?.ar || item.name?.en || '') : item.name}
                            aspectRatio="1/1"
                          />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          {cat && (
                            <span
                              className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                backgroundColor: cat.bgColor,
                                color: cat.textColor,
                              }}
                            >
                              {cat.name}
                            </span>
                          )}

                          <h4
                            className="text-sm sm:text-base font-bold text-text-main leading-snug line-clamp-2"
                            data-user-content="true"
                          >
                            {pickLocale(item.name, isRtl ? 'ar' : 'en').text}
                          </h4>

                          <div className="flex items-center gap-2 text-xs text-text-muted">
                            <span>{t('cart:unitPrice')}:</span>
                            <PriceTag amount={item.price} size="sm" />
                          </div>
                        </div>
                      </div>

                      {/* عداد الكمية والإجمالي وزر الحذف */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-surface-border">
                        <QuantityStepper
                          value={item.qty}
                          onChange={(q) => updateQty(item.productId, q)}
                          size="md"
                        />

                        <div className="text-end min-w-[75px] sm:min-w-[90px]">
                          <span className="text-[10px] text-text-muted block sm:hidden">
                            {t('cart:totalPrice')}
                          </span>
                          <PriceTag amount={lineTotal} size="sm" />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="p-2 rounded-full text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          aria-label={t('cart:deleteItem')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}

          {/* زر العودة لاستعراض المزيد من الوسائل التعليمية */}
          <div className="pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-orange-text dark:text-brand-orange hover:underline transition-colors"
            >
              {isRtl ? (
                <ArrowRight className="w-4 h-4" />
              ) : (
                <ArrowLeft className="w-4 h-4" />
              )}
              <span>{t('cart:continueShopping')}</span>
            </Link>
          </div>
        </div>

        {/* الطرف الأيسر: بطاقة ملخص الطلب والتوصيل وملاحظات الحضانة (4 أعمدة ديسكتوب) */}
        <div className="lg:col-span-4 space-y-5">
          <Card padding="lg" className="space-y-5 shadow-soft lg:sticky lg:top-24">
            <h3 className="font-heading font-black text-lg sm:text-xl text-text-main pb-3 border-b border-surface-border">
              {t('cart:summary.title')}
            </h3>

            {/* اختيار المحافظة لحساب تكلفة الشحن المباشر */}
            <div>
              <Select
                id="cart-governorate"
                label={t('cart:summary.shippingSelect')}
                value={selectedGovName}
                onChange={(e) => setSelectedGovName(e.target.value)}
              >
                {GOVERNORATES.map((g) => {
                  const rate =
                    shippingRates && shippingRates[g.zoneId] !== undefined
                      ? shippingRates[g.zoneId]
                      : g.shippingRate
                  return (
                    <option key={g.name} value={g.name}>
                      {isRtl ? g.name : (g.nameEn || g.name)} ({rate} {t('common:currency')})
                    </option>
                  )
                })}
              </Select>
            </div>

            {/* حقل اسم الحضانة وملاحظات التخصيص */}
            <div>
              <Textarea
                id="cart-nursery-notes"
                label={t('cart:summary.notesLabel')}
                placeholder={t('cart:summary.notesPlaceholder')}
                value={cartNotes}
                onChange={(e) => setCartNotes(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            {/* تفصيل الحسابات والأسعار */}
            <div className="space-y-3 pt-2 border-t border-surface-border text-sm">
              <div className="flex items-center justify-between text-text-muted">
                <span>{t('cart:summary.subtotal')}</span>
                <PriceTag amount={subtotal} size="sm" />
              </div>

              <div className="flex items-center justify-between text-text-muted">
                <span>{t('cart:summary.shipping')}</span>
                <PriceTag amount={shippingRate} size="sm" />
              </div>

              <div className="pt-3 border-t border-surface-border flex items-baseline justify-between">
                <span className="font-heading font-bold text-base text-text-main">
                  {t('cart:summary.total')}
                </span>
                <PriceTag amount={grandTotal} size="lg" />
              </div>
            </div>

            {/* تنويه الدفع عبر فودافون كاش فقط */}
            <div className="p-3.5 rounded-[18px] bg-brand-orange/10 border border-brand-orange/20 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#E60000] text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                <Phone className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-start">
                <p className="text-xs font-bold text-text-main">
                  {t('cart:summary.vodafoneCashNotice')}
                </p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {t('cart:summary.vodafoneCashDesc')}
                </p>
              </div>
            </div>

            {/* زر إتمام الطلب الرئيسي في الديسكتوب */}
            <Button
              type="button"
              onClick={handleProceedToCheckout}
              size="lg"
              className="w-full font-bold whitespace-nowrap shadow-soft"
              endIcon={
                isRtl ? (
                  <ArrowLeft className="w-5 h-5" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )
              }
            >
              {t('cart:summary.checkoutButton')}
            </Button>
          </Card>
        </div>
      </div>

      {/* شريط الإجراءات الثابت للموبايل (يعلو شريط التنقل السفلي) */}
      <div className="lg:hidden fixed bottom-16 start-0 end-0 z-30 bg-surface/95 backdrop-blur-md border-t border-surface-border p-3 sm:p-4 shadow-float transition-colors">
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col text-start">
            <span className="text-[11px] text-text-muted font-medium">
              {t('cart:summary.total')}
            </span>
            <PriceTag amount={grandTotal} size="md" />
          </div>

          <Button
            type="button"
            onClick={handleProceedToCheckout}
            size="md"
            className="font-bold whitespace-nowrap px-6 shrink-0 shadow-soft"
            endIcon={
              isRtl ? (
                <ArrowLeft className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )
            }
          >
            {t('cart:summary.checkoutButton')}
          </Button>
        </div>
      </div>

      {/* مربع حوار تأكيد تفريغ السلة */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          clearCart()
          setShowClearConfirm(false)
        }}
        title={t('cart:clearCart')}
        message={t('cart:clearConfirm')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
      />
    </div>
  )
}
