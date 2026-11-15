import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { Stepper } from '../../components/ui/Stepper'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useLanguage } from '../../context/LanguageContext'
import { CheckoutErrorBoundary } from '../../features/checkout/CheckoutErrorBoundary'
import { CheckoutSummaryCard } from '../../features/checkout/CheckoutSummaryCard'
import { DeliveryStep } from '../../features/checkout/DeliveryStep'
import { PaymentStep } from '../../features/checkout/PaymentStep'
import { ReviewStep } from '../../features/checkout/ReviewStep'
import { getGovernorateOptions, useShippingRates } from '../../hooks/useShippingRates'
import { orderService } from '../../services/orderService'
import { getFriendlyError } from '../../utils'

const CHECKOUT_STORAGE_KEY = 'lh_checkout_flow_state'

export default function CheckoutPage() {
  const { t } = useTranslation(['checkout', 'common', 'cart'])
  const { isRtl } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { items, subtotal, clearCart } = useCart()

  // حالة الخطوة الحالية والبيانات المسترجعة من sessionStorage
  const [savedFlow] = useState(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [step, setStep] = useState(() => savedFlow?.step || 0)
  const [deliveryData, setDeliveryData] = useState(() => {
    const locState = location.state || {}
    return {
      name: savedFlow?.delivery?.name || user?.name || '',
      phone: savedFlow?.delivery?.phone || user?.phone || '',
      governorate: locState.governorate || savedFlow?.delivery?.governorate || user?.governorate || 'القاهرة',
      city: savedFlow?.delivery?.city || user?.city || '',
      address: savedFlow?.delivery?.address || user?.address || '',
      nurseryName: savedFlow?.delivery?.nurseryName || user?.nurseryName || '',
      notes: locState.notes || savedFlow?.delivery?.notes || '',
    }
  })

  const [paymentData, setPaymentData] = useState(() => ({
    senderPhone: savedFlow?.payment?.senderPhone || user?.phone || '',
    transferredAmount: savedFlow?.payment?.transferredAmount || 0,
    reference: savedFlow?.payment?.reference || '',
    screenshotFile: null,
    screenshotPreview: savedFlow?.payment?.screenshotPreview || null,
  }))

  const shipping = useShippingRates({ revalidate: true })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // توجيه الزوار غير المسجلين إلى صفحة تسجيل الدخول مع حفظ مسار الرجوع
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent('/checkout')}`, { replace: true })
    }
  }, [isAuthLoading, isAuthenticated, navigate])

  // مزامنة حالة الخطوة والبيانات مع sessionStorage للاستمرار عند التحديث
  useEffect(() => {
    if (user && !savedFlow) {
      setDeliveryData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        phone: prev.phone || user.phone || '',
        governorate: prev.governorate || user.governorate || 'القاهرة',
        city: prev.city || user.city || '',
        address: prev.address || user.address || '',
        nurseryName: prev.nurseryName || user.nurseryName || '',
      }))
    }
  }, [user, savedFlow])

  useEffect(() => {
    try {
      const flowState = {
        step,
        delivery: deliveryData,
        payment: {
          senderPhone: paymentData.senderPhone,
          transferredAmount: paymentData.transferredAmount,
          reference: paymentData.reference,
          screenshotPreview: paymentData.screenshotPreview,
        },
      }
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(flowState))
    } catch (e) {
      console.warn('Failed to persist checkout state:', e)
    }
  }, [step, deliveryData, paymentData])

  // حساب تكلفة الشحن والإجمالي النهائي ديناميكياً من أسعار الباك
  const isShippingReady = shipping.isLoaded && !shipping.isLoading && !shipping.error
  const governorateOptions = isShippingReady
    ? getGovernorateOptions(shipping, isRtl ? 'ar' : 'en', { currencyLabel: t('common:currency') })
    : []
  const shippingRate = isShippingReady ? shipping.getRateForGov(deliveryData.governorate) : null
  const grandTotal = shippingRate !== null ? subtotal + shippingRate : subtotal

  // التعامل مع إكمال الخطوة 1
  const stepsConfig = [
    { label: t('checkout:steps.delivery') },
    { label: t('checkout:steps.payment') },
    { label: t('checkout:steps.review') },
  ]

  const handleGovernorateChange = (gov) => {
    setDeliveryData((prev) => ({ ...prev, governorate: gov }))
  }

  // التعامل مع إكمال الخطوة 1
  const handleDeliveryComplete = (data) => {
    setDeliveryData(data)
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // التعامل مع إكمال الخطوة 2
  const handlePaymentComplete = (data) => {
    setPaymentData(data)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // إنشاء الطلب واعتماد تحويل فودافون كاش في الخطوة 3
  const handleFinalSubmit = async () => {
    setSubmitError('')
    setIsSubmitting(true)

    try {
      // 1. إنشاء الطلب الأساسي عبر orderService
      const createdOrder = await orderService.createOrder({
        items,
        delivery: {
          name: deliveryData.name,
          phone: deliveryData.phone,
          governorate: deliveryData.governorate,
          city: deliveryData.city,
          address: deliveryData.address,
          nurseryName: deliveryData.nurseryName,
        },
        notes: deliveryData.notes,
        governorate: deliveryData.governorate,
      })

      // 2. إرفاق إيصال تحويل فودافون كاش
      await orderService.submitPayment(createdOrder.id, {
        senderPhone: paymentData.senderPhone,
        reference: paymentData.reference,
        transferredAmount: paymentData.transferredAmount || grandTotal,
        screenshotFile: paymentData.screenshotFile || paymentData.screenshotPreview,
      })

      // 3. تفريغ السلة وحذف حالة التخزين المؤقت
      clearCart()
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
      sessionStorage.removeItem('lh_cart_notes')

      // 5. الانتقال لصفحة نجاح الطلب
      navigate(`/order-success/${createdOrder.number}`)
    } catch (err) {
      console.error('Order creation error:', err)
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email?next=/checkout')
        return
      }
      setSubmitError(getFriendlyError(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  // في حالة الانتظار لتحقق المصادقة
  if (isAuthLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-16">
        <Spinner size="lg" />
        <span className="text-xs text-text-muted font-bold mt-3">
          جاري التحقق من بيانات الدخول...
        </span>
      </div>
    )
  }

  // إذا كانت السلة فارغة
  if (items.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <EmptyState
          title={t('cart:empty.title')}
          description="لا يمكن إتمام الطلب لأن سلة الوسائل التعليمية فارغة حالياً."
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
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeader
        title={t('checkout:title')}
        description={t('checkout:subtitle')}
      />

      {/* معالج الخطوات الثلاث */}
      <div className="max-w-2xl mx-auto mb-8 sm:mb-10">
        <Stepper steps={stepsConfig} currentStep={step} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* منطقة الخطوة الحالية (7 أعمدة في الديسكتوب) */}
        <div className="lg:col-span-7">
          <CheckoutErrorBoundary onReset={() => setStep(0)}>
            {step === 0 && (
              <DeliveryStep
                initialData={deliveryData}
                governorateOptions={governorateOptions}
                isShippingLoading={shipping.isLoading}
                shippingError={shipping.error}
                onRetryShipping={shipping.refresh}
                onGovernorateChange={handleGovernorateChange}
                onComplete={handleDeliveryComplete}
              />
            )}

            {step === 1 && (
              <PaymentStep
                grandTotal={grandTotal}
                initialData={paymentData}
                onComplete={handlePaymentComplete}
                onBack={() => {
                  setStep(0)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              />
            )}

            {step === 2 && (
              <ReviewStep
                deliveryData={deliveryData}
                paymentData={paymentData}
                items={items}
                subtotal={subtotal}
                shippingRate={shippingRate}
                grandTotal={grandTotal}
                isShippingLoading={shipping.isLoading}
                shippingError={shipping.error}
                isShippingReady={isShippingReady}
                onSubmitOrder={handleFinalSubmit}
                onBack={() => {
                  setStep(1)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                isSubmitting={isSubmitting}
                error={submitError}
              />
            )}
          </CheckoutErrorBoundary>
        </div>

        {/* بطاقة ملخص الوسائل والشحن الثابتة جانبياً (5 أعمدة في الديسكتوب) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <CheckoutSummaryCard
            items={items}
            subtotal={subtotal}
            shippingRate={shippingRate}
            isShippingLoading={shipping.isLoading}
            shippingError={shipping.error}
            grandTotal={grandTotal}
            governorate={deliveryData.governorate}
            className="shadow-soft"
          />
        </div>
      </div>
    </div>
  )
}
