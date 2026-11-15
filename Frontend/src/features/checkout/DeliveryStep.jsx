import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowLeft, ArrowRight, MapPin, RefreshCw, School, User } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { useLanguage } from '../../context/LanguageContext'
import { getGovernorateOptions, useShippingRates } from '../../hooks/useShippingRates'

/**
 * الخطوة 1: نموذج بيانات الاستلام والحضانة
 * التحقق من صحة رقم الهاتف والمحافظة والعنوان باستخدام zod
 */
export function DeliveryStep({
  initialData = {},
  governorateOptions: externalGovOptions,
  isShippingLoading: externalLoading,
  shippingError: externalError,
  onRetryShipping,
  onGovernorateChange,
  onComplete,
}) {
  const { t } = useTranslation(['checkout', 'common'])
  const { isRtl } = useLanguage()
  const internalShipping = useShippingRates()

  const usingExternalRates = externalGovOptions !== undefined
  const isShippingLoading = usingExternalRates ? Boolean(externalLoading) : internalShipping.isLoading
  const shippingError = usingExternalRates ? externalError : internalShipping.error
  const retryShipping = onRetryShipping || internalShipping.refresh
  const governorateOptions = usingExternalRates
    ? externalGovOptions
    : getGovernorateOptions(internalShipping, isRtl ? 'ar' : 'en', {
        currencyLabel: t('common:currency'),
      })
  const ratesReady = !isShippingLoading && !shippingError && governorateOptions.length > 0

  // مخطط التحقق Zod الصارم لرقم الهاتف والعنوان
  const deliverySchema = z.object({
    name: z.string().min(2, t('checkout:errors.nameRequired')),
    phone: z
      .string()
      .regex(/^01[0125]\d{8}$/, t('checkout:errors.phoneInvalid')),
    governorate: z.string().min(1, t('checkout:errors.govRequired')),
    city: z.string().min(2, t('checkout:errors.cityRequired')),
    address: z.string().min(5, t('checkout:errors.addressRequired')),
    nurseryName: z.string().optional(),
    notes: z.string().optional(),
  })

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      name: initialData.name || '',
      phone: initialData.phone || '',
      governorate: initialData.governorate || '',
      city: initialData.city || '',
      address: initialData.address || '',
      nurseryName: initialData.nurseryName || '',
      notes: initialData.notes || '',
    },
  })

  // تحديث قيم الحقول عند وصول بيانات المستخدم مع الحفاظ على ما عدّلته المستخدمة
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset(
        {
          name: initialData.name || '',
          phone: initialData.phone || '',
          governorate: initialData.governorate || '',
          city: initialData.city || '',
          address: initialData.address || '',
          nurseryName: initialData.nurseryName || '',
          notes: initialData.notes || '',
        },
        { keepDirtyValues: true }
      )
    }
  }, [initialData, reset])

  // مزامنة القيمة الظاهرة في قائمة المحافظة بعد اكتمال تحميل الخيارات من الباك
  useEffect(() => {
    if (ratesReady && initialData?.governorate !== undefined) {
      setValue('governorate', initialData.governorate || '', { shouldDirty: false })
    }
  }, [ratesReady, initialData?.governorate, setValue])

  const onSubmit = (data) => {
    if (!ratesReady) return
    onComplete(data)
  }

  const govRegister = register('governorate')

  return (
    <Card padding="lg" className="shadow-soft">
      <div className="flex items-center gap-3 pb-4 mb-6 border-b border-surface-border">
        <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-heading font-black text-lg sm:text-xl text-text-main">
            {t('checkout:delivery.title')}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('checkout:subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* صف الاسم ورقم الهاتف */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <Input
            id="delivery-name"
            label={t('checkout:delivery.name')}
            placeholder={t('checkout:delivery.namePlaceholder')}
            startIcon={<User className="w-4 h-4" />}
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <Input
              id="delivery-phone"
              label={t('checkout:delivery.phone')}
              placeholder={t('checkout:delivery.phonePlaceholder')}
              dir="ltr"
              required
              helperText={isRtl ? 'رقم مصري يبدأ بـ 01 (11 رقماً)' : 'Egyptian number starting with 01 (11 digits)'}
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
        </div>

        {/* صف اسم الحضانة والمحافظة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <Input
            id="delivery-nursery"
            label={t('checkout:delivery.nurseryName')}
            placeholder={t('checkout:delivery.nurseryNamePlaceholder')}
            startIcon={<School className="w-4 h-4" />}
            error={errors.nurseryName?.message}
            {...register('nurseryName')}
          />

          <Select
            id="delivery-governorate"
            label={t('checkout:delivery.governorate')}
            placeholder={t('common:shipping.chooseFromList')}
            required
            disabled={!ratesReady}
            error={errors.governorate?.message}
            {...govRegister}
            onChange={(e) => {
              govRegister.onChange(e)
              onGovernorateChange?.(e.target.value)
            }}
          >
            {!ratesReady ? (
              <option value="">{t('common:shipping.loadingRates')}</option>
            ) : (
              governorateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
          </Select>
        </div>

        {/* صف المدينة والعنوان التفصيلي */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <Input
            id="delivery-city"
            label={t('checkout:delivery.city')}
            placeholder={t('checkout:delivery.cityPlaceholder')}
            required
            error={errors.city?.message}
            {...register('city')}
          />

          <Input
            id="delivery-address"
            label={t('checkout:delivery.address')}
            placeholder={t('checkout:delivery.addressPlaceholder')}
            required
            error={errors.address?.message}
            {...register('address')}
          />
        </div>

        {/* ملاحظات التوصيل */}
        <div>
          <Textarea
            id="delivery-notes"
            label={t('checkout:delivery.notes')}
            placeholder={t('checkout:delivery.notesPlaceholder')}
            rows={2}
            className="text-xs"
            {...register('notes')}
          />
        </div>

        {!ratesReady && (
          <div className="p-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{t('common:shipping.loadingRates')}</span>
            </div>
            {shippingError && !isShippingLoading && (
              <button
                type="button"
                onClick={retryShipping}
                className="inline-flex items-center gap-1 font-bold text-brand-orange-text dark:text-brand-orange hover:underline shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('common:actions.retry')}</span>
              </button>
            )}
          </div>
        )}

        {/* زر المتابعة للخطوة التالية */}
        <div className="pt-4 border-t border-surface-border flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={!ratesReady}
            className="w-full sm:w-auto font-bold whitespace-nowrap shadow-soft px-8"
            endIcon={
              isRtl ? (
                <ArrowLeft className="w-5 h-5" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )
            }
          >
            {t('checkout:delivery.nextStep')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
