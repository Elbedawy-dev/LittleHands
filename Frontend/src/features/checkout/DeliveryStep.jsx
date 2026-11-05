import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Bookmark, MapPin, School, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { GOVERNORATES, getGovernorateName } from '../../config/constants'
import { useLanguage } from '../../context/LanguageContext'
import { userService } from '../../services/userService'

/**
 * الخطوة 1: نموذج بيانات الاستلام والحضانة
 * التحقق من صحة رقم الهاتف والمحافظة والعنوان باستخدام zod
 */
export function DeliveryStep({ initialData = {}, onComplete }) {
  const { t } = useTranslation(['checkout', 'common'])
  const { isRtl } = useLanguage()
  const [savedAddresses, setSavedAddresses] = useState([])

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
    saveAddress: z.boolean().optional(),
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
      governorate: initialData.governorate || 'القاهرة',
      city: initialData.city || '',
      address: initialData.address || '',
      nurseryName: initialData.nurseryName || '',
      notes: initialData.notes || '',
      saveAddress: initialData.saveAddress !== undefined ? initialData.saveAddress : true,
    },
  })

  // تحديث قيم الحقول عند وصول بيانات المستخدم
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      reset({
        name: initialData.name || '',
        phone: initialData.phone || '',
        governorate: initialData.governorate || 'القاهرة',
        city: initialData.city || '',
        address: initialData.address || '',
        nurseryName: initialData.nurseryName || '',
        notes: initialData.notes || '',
        saveAddress: initialData.saveAddress !== undefined ? initialData.saveAddress : true,
      })
    }
  }, [initialData, reset])

  // تحميل العناوين المحفوظة من حساب العميل إن وجدت
  useEffect(() => {
    let isMounted = true
    async function fetchSavedAddresses() {
      try {
        const addresses = await userService.getAddresses()
        if (isMounted && Array.isArray(addresses)) {
          setSavedAddresses(addresses)
        }
      } catch (err) {
        console.warn('Failed to load saved addresses:', err)
      }
    }
    fetchSavedAddresses()
    return () => {
      isMounted = false
    }
  }, [])

  // تطبيق بيانات عنوان محفوظ على الحقول
  const handleSelectSavedAddress = (addr) => {
    if (!addr) return
    if (addr.name) setValue('name', addr.name)
    if (addr.phone) setValue('phone', addr.phone)
    if (addr.governorate) setValue('governorate', addr.governorate)
    if (addr.city) setValue('city', addr.city)
    if (addr.address) setValue('address', addr.address)
    if (addr.nurseryName) setValue('nurseryName', addr.nurseryName)
  }

  const onSubmit = (data) => {
    onComplete(data)
  }

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

      {/* شريط اختيار عنوان سابق مسجل */}
      {savedAddresses.length > 0 && (
        <div className="mb-6 p-4 rounded-[20px] bg-surface-subtle border border-surface-border space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-text-main">
            <Bookmark className="w-4 h-4 text-brand-orange" />
            <span>{t('checkout:delivery.savedAddresses')}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {savedAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                onClick={() => handleSelectSavedAddress(addr)}
                className="px-3.5 py-1.5 rounded-full border border-surface-border bg-surface text-xs font-semibold text-text-main hover:border-brand-orange hover:text-brand-orange-text transition-all cursor-pointer shadow-xs"
              >
                {addr.nurseryName || addr.name} - {getGovernorateName(addr.governorate, isRtl ? 'ar' : 'en')}
              </button>
            ))}
          </div>
        </div>
      )}

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
            required
            error={errors.governorate?.message}
            {...register('governorate')}
          >
            {GOVERNORATES.map((g) => (
              <option key={g.name} value={g.name}>
                {isRtl ? g.name : (g.nameEn || g.name)} ({g.shippingRate} {t('common:currency')})
              </option>
            ))}
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

        {/* خيار حفظ العنوان */}
        <div className="pt-1">
          <Checkbox
            id="save-address-chk"
            label={t('checkout:delivery.saveAddress')}
            {...register('saveAddress')}
          />
        </div>

        {/* زر المتابعة للخطوة التالية */}
        <div className="pt-4 border-t border-surface-border flex justify-end">
          <Button
            type="submit"
            size="lg"
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
