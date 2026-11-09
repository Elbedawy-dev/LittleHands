import { AlertTriangle, CheckCircle2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { useSettings } from '../../context/SettingsContext'
import {
  ContactSettingsSection,
  FinancialSettingsSection,
  NotificationSettingsSection,
  PaymentGatewayCard,
  ShippingSettingsSection,
  WalletSettingsSection,
} from '../../features/admin/settings'
import { getFriendlyError, isValidEgyptianPhone } from '../../utils'

/**
 * صفحة إعدادات المنصة الموحدة مع زر حفظ رئيسي واحد
 */
export default function AdminSettingsPage() {
  const { t } = useTranslation('admin-manage')
  const { settings, isLoading, updateSettings } = useSettings()

  const [form, setForm] = useState({
    commissionRate: 20,
    platformWallet: '',
    supportPhone: '',
    supportEmail: '',
    whatsappNumber: '',
    payoutScheduleText: '',
    shippingRates: {
      greater_cairo: 40,
      giza: 45,
      alexandria: 50,
      delta_canal: 55,
      upper_egypt: 65,
    },
    deliveryTime: '2 - 4 أيام عمل حسب المحافظة وورشة البائعة',
    emailNotifications: true,
    inSiteNotifications: true,
  })

  const [errors, setErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // مزامنة النموذج مع الإعدادات المحفوظة
  useEffect(() => {
    if (settings) {
      setForm({
        commissionRate:
          settings.commissionRate !== undefined
            ? Math.round(settings.commissionRate * 100)
            : 20,
        platformWallet: settings.platformWallet || '',
        supportPhone: settings.supportPhone || '',
        supportEmail: settings.supportEmail || '',
        whatsappNumber: settings.whatsappNumber || '',
        payoutScheduleText: settings.payoutScheduleText || '',
        shippingRates: {
          greater_cairo: settings.shippingRates?.greater_cairo ?? 40,
          giza: settings.shippingRates?.giza ?? 45,
          alexandria: settings.shippingRates?.alexandria ?? 50,
          delta_canal: settings.shippingRates?.delta_canal ?? 55,
          upper_egypt: settings.shippingRates?.upper_egypt ?? 65,
        },
        deliveryTime:
          settings.deliveryTime || '2 - 4 أيام عمل حسب المحافظة وورشة البائعة',
        emailNotifications: settings.emailNotifications !== false,
        inSiteNotifications: settings.inSiteNotifications !== false,
      })
    }
  }, [settings])

  // التحقق من صحة المدخلات
  const validateForm = () => {
    const newErrors = {}

    const rate = Number(form.commissionRate)
    if (isNaN(rate) || rate < 0 || rate > 50) {
      newErrors.commissionRate = t('settings.financialSection.commissionRateError')
    }

    if (form.platformWallet && !isValidEgyptianPhone(form.platformWallet)) {
      newErrors.platformWallet = t('settings.walletSection.walletError')
    }

    if (form.supportPhone && !isValidEgyptianPhone(form.supportPhone)) {
      newErrors.supportPhone = t('settings.contactSection.phoneError', 'رقم الهاتف غير صحيح (01XXXXXXXXX)')
    }

    if (form.whatsappNumber && !isValidEgyptianPhone(form.whatsappNumber)) {
      newErrors.whatsappNumber = t('settings.contactSection.whatsappError', 'رقم الواتساب غير صحيح (01XXXXXXXXX)')
    }

    if (form.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail)) {
      newErrors.supportEmail = t('settings.contactSection.emailError', 'البريد الإلكتروني غير صحيح')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // حفظ كافة الإعدادات دفعة واحدة
  const handleSaveAll = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error(t('settings.validationError'))
      return
    }

    setIsSaving(true)
    try {
      await updateSettings({
        commissionRate: Number(form.commissionRate) / 100,
        platformWallet: form.platformWallet.trim(),
        supportPhone: form.supportPhone.trim(),
        supportEmail: form.supportEmail.trim(),
        whatsappNumber: form.whatsappNumber.trim(),
        payoutScheduleText: form.payoutScheduleText.trim(),
        shippingRates: {
          greater_cairo: Number(form.shippingRates.greater_cairo) || 40,
          giza: Number(form.shippingRates.giza) || 45,
          alexandria: Number(form.shippingRates.alexandria) || 50,
          delta_canal: Number(form.shippingRates.delta_canal) || 55,
          upper_egypt: Number(form.shippingRates.upper_egypt) || 65,
        },
        deliveryTime: form.deliveryTime.trim(),
        emailNotifications: form.emailNotifications,
        inSiteNotifications: form.inSiteNotifications,
      })

      setSavedSuccess(true)
      toast.success(t('settings.saveSuccess'))
      setTimeout(() => setSavedSuccess(false), 4000)
    } catch (err) {
      toast.error(getFriendlyError(err, t))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-64 rounded-[16px]" />
        <Skeleton className="h-44 w-full rounded-[24px]" />
        <Skeleton className="h-44 w-full rounded-[24px]" />
        <Skeleton className="h-64 w-full rounded-[24px]" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSaveAll} className="space-y-6 max-w-4xl pb-12">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
      />

      {/* تحذير رقم المحفظة غير المُعدّ */}
      {!settings?.platformWallet && (
        <div className="p-4 rounded-[20px] bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{t('settings.walletWarningBanner', 'تنبيه: رقم محفظة المنصة (فودافون كاش) غير مُعدّ بعد. لن يتمكن العملاء من إتمام الطلبات حتى يتم إدخاله وحفظه.')}</span>
        </div>
      )}

      {/* رسالة نجاح حفظ الإعدادات */}
      {savedSuccess && (
        <div className="p-4 rounded-[20px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-soft">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{t('settings.saveSuccess')}</span>
        </div>
      )}

      {/* 1. الإعدادات المالية ونسبة العمولة */}
      <FinancialSettingsSection
        commissionRate={form.commissionRate}
        onChangeCommissionRate={(val) => {
          setForm((prev) => ({ ...prev, commissionRate: val }))
          if (errors.commissionRate) {
            setErrors((prev) => ({ ...prev, commissionRate: null }))
          }
        }}
        error={errors.commissionRate}
      />

      {/* 2. محفظة فودافون كاش الرسمية */}
      <WalletSettingsSection
        walletNumber={form.platformWallet}
        onChangeWalletNumber={(val) => {
          setForm((prev) => ({ ...prev, platformWallet: val }))
          if (errors.platformWallet) {
            setErrors((prev) => ({ ...prev, platformWallet: null }))
          }
        }}
        error={errors.platformWallet}
      />

      {/* 3. بيانات التواصل ومواعيد التحويل */}
      <ContactSettingsSection
        supportPhone={form.supportPhone}
        onChangeSupportPhone={(val) => {
          setForm((prev) => ({ ...prev, supportPhone: val }))
          if (errors.supportPhone) {
            setErrors((prev) => ({ ...prev, supportPhone: null }))
          }
        }}
        supportPhoneError={errors.supportPhone}
        supportEmail={form.supportEmail}
        onChangeSupportEmail={(val) => {
          setForm((prev) => ({ ...prev, supportEmail: val }))
          if (errors.supportEmail) {
            setErrors((prev) => ({ ...prev, supportEmail: null }))
          }
        }}
        supportEmailError={errors.supportEmail}
        whatsappNumber={form.whatsappNumber}
        onChangeWhatsappNumber={(val) => {
          setForm((prev) => ({ ...prev, whatsappNumber: val }))
          if (errors.whatsappNumber) {
            setErrors((prev) => ({ ...prev, whatsappNumber: null }))
          }
        }}
        whatsappNumberError={errors.whatsappNumber}
        payoutScheduleText={form.payoutScheduleText}
        onChangePayoutScheduleText={(val) =>
          setForm((prev) => ({ ...prev, payoutScheduleText: val }))
        }
      />

      {/* 3. تسعيرة الشحن حسب مناطق التوصيل */}
      <ShippingSettingsSection
        shippingRates={form.shippingRates}
        onChangeZoneRate={(zoneId, val) =>
          setForm((prev) => ({
            ...prev,
            shippingRates: { ...prev.shippingRates, [zoneId]: val },
          }))
        }
        deliveryTime={form.deliveryTime}
        onChangeDeliveryTime={(val) =>
          setForm((prev) => ({ ...prev, deliveryTime: val }))
        }
      />

      {/* 4. إعدادات الإشعارات والتنبيهات */}
      <NotificationSettingsSection
        emailNotifications={form.emailNotifications}
        onChangeEmailNotifications={(checked) =>
          setForm((prev) => ({ ...prev, emailNotifications: checked }))
        }
        inSiteNotifications={form.inSiteNotifications}
        onChangeInSiteNotifications={(checked) =>
          setForm((prev) => ({ ...prev, inSiteNotifications: checked }))
        }
      />

      {/* 5. بطاقة بوابة الدفع الإلكتروني المعطلة */}
      <PaymentGatewayCard />

      {/* 6. شريط زر الحفظ الموحد (زر وحيد لا يلتف نصه أبداً) */}
      <div className="pt-4 border-t border-surface-border flex items-center justify-end">
        <Button
          type="submit"
          size="lg"
          loading={isSaving}
          startIcon={<Save className="w-5 h-5 rtl:rotate-0" />}
          className="whitespace-nowrap px-8"
        >
          {isSaving ? t('settings.saving') : t('settings.saveAllBtn')}
        </Button>
      </div>
    </form>
  )
}
