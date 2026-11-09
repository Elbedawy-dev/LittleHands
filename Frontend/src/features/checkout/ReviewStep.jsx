import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  MapPin,
  Send,
  Smartphone,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PriceTag } from '../../components/ui/PriceTag'
import { ProductImage } from '../../components/ui/ProductImage'
import { Spinner } from '../../components/ui/Spinner'
import { useLanguage } from '../../context/LanguageContext'

/**
 * الخطوة 3: مراجعة وتأكيد الطلب
 * مراجعة شاملة لبيانات الحضانة وإيصال فودافون كاش قبل الإرسال النهائي
 */
export function ReviewStep({
  deliveryData = {},
  paymentData = {},
  items = [],
  subtotal = 0,
  shippingRate = 0,
  grandTotal = 0,
  onSubmitOrder,
  onBack,
  isSubmitting = false,
  error = '',
}) {
  const { t } = useTranslation(['checkout', 'common'])
  const { isRtl } = useLanguage()

  return (
    <Card padding="lg" className="shadow-soft space-y-6">
      {/* عنوان الخطوة */}
      <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
        <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
          <FileCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-heading font-black text-lg sm:text-xl text-text-main">
            {t('checkout:review.title')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('checkout:review.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[18px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* قسم ملخص بيانات الاستلام والتوصيل */}
      <div className="rounded-[22px] bg-surface-subtle border border-surface-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-surface-border text-xs font-bold text-text-main">
          <MapPin className="w-4 h-4 text-brand-orange" />
          <span>{t('checkout:review.deliverySummary')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
          <div>
            <span className="text-text-muted block text-[11px]">المستلمة:</span>
            <span className="font-bold text-text-main">{deliveryData.name}</span>
          </div>

          <div>
            <span className="text-text-muted block text-[11px]">رقم هاتف التواصل:</span>
            <span
              className="font-mono font-bold text-text-main"
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {deliveryData.phone}
            </span>
          </div>

          <div>
            <span className="text-text-muted block text-[11px]">المحافظة والمركز:</span>
            <span className="font-bold text-text-main">
              {deliveryData.governorate} - {deliveryData.city}
            </span>
          </div>

          {deliveryData.nurseryName && (
            <div>
              <span className="text-text-muted block text-[11px]">اسم الحضانة / الروضة:</span>
              <span className="font-bold text-text-main">{deliveryData.nurseryName}</span>
            </div>
          )}

          <div className="sm:col-span-2">
            <span className="text-text-muted block text-[11px]">العنوان التفصيلي:</span>
            <span className="font-medium text-text-main">{deliveryData.address}</span>
          </div>

          {deliveryData.notes && (
            <div className="sm:col-span-2 pt-1 border-t border-surface-border/50">
              <span className="text-text-muted block text-[11px]">ملاحظات التوصيل:</span>
              <span className="text-text-main">{deliveryData.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* قسم ملخص سداد فودافون كاش */}
      <div className="rounded-[22px] bg-surface-subtle border border-surface-border p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-surface-border text-xs font-bold text-text-main">
          <Smartphone className="w-4 h-4 text-[#E60000]" />
          <span>{t('checkout:review.paymentSummary')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-text-muted block text-[11px]">
              {t('checkout:review.senderPhone')}
            </span>
            <span
              className="font-mono font-bold text-text-main text-sm"
              dir="ltr"
              style={{ unicodeBidi: 'isolate' }}
            >
              {paymentData.senderPhone}
            </span>
          </div>

          <div>
            <span className="text-text-muted block text-[11px]">
              {t('checkout:review.transferredAmount')}
            </span>
            <PriceTag amount={paymentData.transferredAmount || grandTotal} size="sm" />
          </div>

          {paymentData.reference && (
            <div>
              <span className="text-text-muted block text-[11px]">
                {t('checkout:review.reference')}
              </span>
              <span
                className="font-mono font-bold text-text-main"
                dir="ltr"
                style={{ unicodeBidi: 'isolate' }}
              >
                {paymentData.reference}
              </span>
            </div>
          )}

          {/* معاينة صورة الإيصال المرفقة */}
          <div className="sm:col-span-2 pt-2 border-t border-surface-border flex items-center gap-3">
            {paymentData.screenshotPreview && (
              <div className="w-14 h-14 rounded-[12px] overflow-hidden shrink-0 border border-surface-border bg-surface">
                <img
                  src={paymentData.screenshotPreview}
                  alt="إيصال فودافون كاش"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="text-start">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('checkout:review.receiptAttached')}</span>
              </span>
              <span className="text-[11px] text-text-muted block mt-0.5">
                {paymentData.screenshotFile?.name || 'receipt_screenshot.jpg'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* قسم الوسائل التعليمية المطلوبة والحسابات */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-text-muted">
          {t('checkout:review.itemsSummary')} ({items.length})
        </h4>

        <div className="divide-y divide-surface-border border border-surface-border rounded-[20px] p-3 sm:p-4 bg-surface max-h-[220px] overflow-y-auto overscroll-contain modal-scrollbar">
          {items.map((it) => (
            <div key={it.productId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[10px] overflow-hidden shrink-0 border border-surface-border">
                  <ProductImage src={it.image} alt={it.name} aspectRatio="1/1" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-text-main truncate">{it.name}</p>
                  <span className="text-[11px] text-text-muted">الكمية: {it.qty}</span>
                </div>
              </div>

              <PriceTag amount={it.price * it.qty} size="sm" />
            </div>
          ))}
        </div>

        {/* المجموع الفرعي وتكلفة الشحن والإجمالي */}
        <div className="p-3.5 rounded-[18px] bg-surface-subtle border border-surface-border space-y-2 text-xs sm:text-sm">
          <div className="flex items-center justify-between text-text-muted">
            <span>{t('checkout:orderSummary.subtotal')}</span>
            <PriceTag amount={subtotal} size="sm" />
          </div>
          <div className="flex items-center justify-between text-text-muted">
            <span>{t('checkout:orderSummary.shipping')}</span>
            <PriceTag amount={shippingRate} size="sm" />
          </div>
          <div className="pt-2 border-t border-surface-border flex items-baseline justify-between font-bold text-text-main">
            <span>{t('checkout:orderSummary.total')}</span>
            <PriceTag amount={grandTotal} size="md" />
          </div>
        </div>
      </div>

      {/* تنويه المراجعة والإرسال */}
      <p className="text-xs text-text-muted leading-relaxed">
        {t('checkout:review.notice')}
      </p>

      {/* أزرار التنقل والتأكيد النهائي */}
      <div className="pt-4 border-t border-surface-border flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          onClick={onBack}
          className="w-full sm:w-auto font-bold whitespace-nowrap"
          startIcon={
            isRtl ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <ArrowLeft className="w-4 h-4" />
            )
          }
        >
          {t('checkout:review.backStep')}
        </Button>

        <Button
          type="button"
          onClick={onSubmitOrder}
          disabled={isSubmitting}
          size="lg"
          className="w-full sm:w-auto font-bold whitespace-nowrap shadow-soft px-8"
          startIcon={isSubmitting ? <Spinner size="sm" /> : <Send className="w-4 h-4" />}
        >
          {isSubmitting ? t('checkout:review.submitting') : t('checkout:review.submitOrder')}
        </Button>
      </div>
    </Card>
  )
}
