import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Phone,
  RefreshCw,
  Smartphone,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { Input } from '../../components/ui/Input'
import { PriceTag } from '../../components/ui/PriceTag'
import { useLanguage } from '../../context/LanguageContext'
import { settingsService } from '../../services/settingsService'

/**
 * الخطوة 2: الدفع اليدوي الرسمي عبر محفظة فودافون كاش
 * رفع لقطة شاشة الإيصال ومطابقة رقم المحفظة المحول منها
 */
export function PaymentStep({
  grandTotal = 0,
  initialData = {},
  onComplete,
  onBack,
}) {
  const { t } = useTranslation(['checkout', 'common'])
  const { isRtl } = useLanguage()
  const fileInputRef = useRef(null)

  const [platformWallet, setPlatformWallet] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(
    initialData.screenshotFile || null
  )
  const [screenshotPreview, setScreenshotPreview] = useState(
    initialData.screenshotPreview || null
  )
  const [fileError, setFileError] = useState('')

  // جلب رقم المحفظة الرسمي المحدث من خدمة الإعدادات
  useEffect(() => {
    let isMounted = true
    async function fetchPlatformSettings() {
      try {
        const settings = await settingsService.getSettings()
        if (isMounted) {
          setPlatformWallet(settings?.platformWallet || '')
        }
      } catch (err) {
        console.warn('Failed to fetch platform wallet:', err)
      }
    }
    fetchPlatformSettings()
    return () => {
      isMounted = false
    }
  }, [])

  // مخطط التحقق Zod لبيانات الدفع بفودافون كاش
  const paymentSchema = z.object({
    senderPhone: z
      .string()
      .regex(/^01[0125]\d{8}$/, t('checkout:errors.senderPhoneInvalid')),
    transferredAmount: z.coerce
      .number({ invalid_type_error: t('checkout:errors.amountInvalid') })
      .positive(t('checkout:errors.amountInvalid')),
    reference: z.string().optional(),
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      senderPhone: initialData.senderPhone || '',
      transferredAmount: initialData.transferredAmount || grandTotal,
      reference: initialData.reference || '',
    },
  })

  // ضبط المبلغ ورقم المحفظة تلقائياً
  useEffect(() => {
    if (initialData.senderPhone) setValue('senderPhone', initialData.senderPhone)
    if (initialData.reference) setValue('reference', initialData.reference)
    if (grandTotal && !initialData.transferredAmount) {
      setValue('transferredAmount', grandTotal)
    }
  }, [initialData, grandTotal, setValue])

  // معالجة اختيار ملف الإيصال
  const handleFileChange = (e) => {
    setFileError('')
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setFileError('يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError(t('checkout:errors.screenshotSize'))
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setScreenshotFile(file)
    setScreenshotPreview(previewUrl)
  }

  // حذف الإيصال لإعادة الرفع
  const handleRemoveFile = () => {
    setScreenshotFile(null)
    setScreenshotPreview(null)
    setFileError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = (data) => {
    if (!screenshotFile && !screenshotPreview) {
      setFileError(t('checkout:errors.screenshotRequired'))
      return
    }

    onComplete({
      ...data,
      screenshotFile,
      screenshotPreview,
      platformWallet,
    })
  }

  return (
    <Card padding="lg" className="shadow-soft space-y-6">
      {/* رأس قسم فودافون كاش */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E60000] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-lg sm:text-xl text-text-main">
              {t('checkout:payment.title')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              الدفع حصراً عبر تحويل فودافون كاش المباشر
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>تحويل يدوي مباشر</span>
        </span>
      </div>

      {/* لوحة رقم المحفظة والمبلغ المطلوب بدقة */}
      {!platformWallet && (
        <div className="p-4 rounded-[20px] bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{t('checkout:payment.walletNotConfigured', 'رقم محفظة المنصة غير مُعدّ بعد')}</span>
        </div>
      )}

      <div className="p-4 sm:p-5 rounded-[22px] bg-brand-orange/5 border border-brand-orange/20 space-y-4">
        {/* رقم محفظة المنصة مع زر النسخ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-[18px] border border-surface-border shadow-xs">
          <div>
            <span className="text-xs font-semibold text-text-muted block">
              {t('checkout:payment.walletLabel')}
            </span>
            {platformWallet ? (
              <span
                className="text-xl sm:text-2xl font-mono font-black text-text-main tracking-wider mt-1 block"
                dir="ltr"
                style={{ unicodeBidi: 'isolate' }}
              >
                {platformWallet}
              </span>
            ) : (
              <span className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-1 block">
                {t('checkout:payment.walletNotConfigured', 'رقم محفظة المنصة غير مُعدّ بعد')}
              </span>
            )}
          </div>

          {platformWallet && (
            <CopyButton
              text={platformWallet}
              label={t('checkout:payment.copyNumber')}
              copiedLabel={t('checkout:payment.numberCopied')}
              size="md"
            />
          )}
        </div>

        {/* المبلغ المطلوب تحويله بالكامل */}
        <div className="flex items-center justify-between p-4 rounded-[18px] bg-surface border border-surface-border shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-text-main">
              {t('checkout:payment.amountLabel')}
            </span>
          </div>
          <PriceTag amount={grandTotal} size="lg" />
        </div>
      </div>

      {/* 3 خطوات إرشادية واضحة للتحويل */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-text-main">
          {t('checkout:payment.stepsTitle')}
        </h4>

        <div className="grid grid-cols-1 gap-2.5 text-xs sm:text-sm">
          <div className="flex items-start gap-3 p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border">
            <span className="w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <p className="text-text-main leading-relaxed">
              {t('checkout:payment.step1')}
              {platformWallet ? (
                <span className="inline-block mx-1 font-mono font-bold text-brand-orange" dir="ltr">
                  *9*7*{platformWallet}*{grandTotal}#
                </span>
              ) : (
                <span className="inline-block mx-1 text-amber-700 dark:text-amber-400 font-bold">
                  ({t('checkout:payment.walletNotConfigured', 'رقم محفظة المنصة غير مُعدّ بعد')})
                </span>
              )}
            </p>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border">
            <span className="w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <p className="text-text-main leading-relaxed">
              {t('checkout:payment.step2')}
            </p>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-[16px] bg-surface-subtle border border-surface-border">
            <span className="w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <p className="text-text-main leading-relaxed">
              {t('checkout:payment.step3')}
            </p>
          </div>
        </div>
      </div>

      {/* نموذج بيانات التحويل والإيصال */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {/* رقم الهاتف المحول منه */}
          <div>
            <Input
              id="payment-sender-phone"
              label={t('checkout:payment.senderPhone')}
              placeholder={t('checkout:payment.senderPhonePlaceholder')}
              dir="ltr"
              required
              helperText={t('checkout:payment.senderPhoneHint')}
              error={errors.senderPhone?.message}
              {...register('senderPhone')}
            />
          </div>

          {/* المبلغ المحول فعلياً */}
          <div>
            <Input
              id="payment-transferred-amount"
              type="number"
              label={t('checkout:payment.transferredAmount')}
              placeholder={t('checkout:payment.transferredAmountPlaceholder')}
              required
              helperText="يجب أن يطابق إجمالي الطلب شاملاً الشحن"
              error={errors.transferredAmount?.message}
              {...register('transferredAmount')}
            />
          </div>
        </div>

        {/* الرقم المرجعي */}
        <div>
          <Input
            id="payment-reference"
            label={t('checkout:payment.reference')}
            placeholder={t('checkout:payment.referencePlaceholder')}
            dir="ltr"
            helperText={t('checkout:payment.referenceHint')}
            error={errors.reference?.message}
            {...register('reference')}
          />
        </div>

        {/* حقل رفع صورة لقطة شاشة الإيصال */}
        <div>
          <label className="text-sm font-semibold text-text-main mb-2 flex items-center justify-between">
            <span>
              {t('checkout:payment.receiptUpload')}
              <span className="text-brand-orange ms-1">*</span>
            </span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {screenshotPreview ? (
            /* معاينة الإيصال المرفوع مع خيارات التبديل والحذف */
            <div className="p-4 rounded-[20px] bg-surface-subtle border-2 border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-16 h-16 rounded-[14px] overflow-hidden shrink-0 border border-surface-border bg-surface flex items-center justify-center">
                  <img
                    src={screenshotPreview}
                    alt="معاينة إيصال التحويل"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-start min-w-0">
                  <p className="text-xs font-bold text-text-main truncate max-w-[200px] sm:max-w-[300px]">
                    {screenshotFile?.name || 'receipt_screenshot.jpg'}
                  </p>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span>تم إرفاق صورة الإيصال بنجاح</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-full border border-surface-border bg-surface text-xs font-bold text-text-main hover:bg-surface-subtle transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('checkout:payment.changeReceipt')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-2 rounded-full text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  aria-label={t('checkout:payment.removeReceipt')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* صندوق رفع الإيصال الفارغ */
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              tabIndex={0}
              role="button"
              className="p-6 rounded-[20px] border-2 border-dashed border-surface-border hover:border-brand-orange bg-surface-subtle/50 text-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-orange group"
            >
              <div className="w-12 h-12 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-text-main">
                {t('checkout:payment.receiptDrop')}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {t('checkout:payment.receiptHint')}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-3 pointer-events-none rounded-full"
              >
                اختيار صورة الإيصال
              </Button>
            </div>
          )}

          {fileError && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 mt-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fileError}</span>
            </p>
          )}
        </div>

        {/* بطاقة واحدة معطلة للدفع التلقائي المستقبلي: دون أي أسماء بنوك أو بطاقات */}
        <div className="p-4 rounded-[20px] bg-surface-subtle/70 border border-surface-border flex items-center justify-between gap-3 opacity-70 cursor-not-allowed select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-surface border border-surface-border text-text-muted flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-text-main">
                {t('checkout:payment.futureGateway')}
              </p>
              <span className="text-[11px] text-text-muted">
                {t('checkout:payment.futureGatewayNote')}
              </span>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full bg-surface border border-surface-border text-text-muted text-[11px] font-bold shrink-0">
            قريباً
          </span>
        </div>

        {/* أزرار التنقل بين الخطوات */}
        <div className="pt-4 border-t border-surface-border flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
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
            {t('checkout:payment.backStep')}
          </Button>

          <Button
            type="submit"
            size="lg"
            disabled={!platformWallet}
            className="w-full sm:w-auto font-bold whitespace-nowrap shadow-soft px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            endIcon={
              isRtl ? (
                <ArrowLeft className="w-5 h-5" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )
            }
          >
            {t('checkout:payment.nextStep')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
