import { AlertCircle, Info, Mail, Phone, School, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Select } from '../../components/ui/Select'
import { GOVERNORATES } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'

export default function RegisterPage() {
  const { i18n, t } = useTranslation('auth')
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    accountType: 'kindergarten', // 'parent' | 'teacher' | 'kindergarten'
    nurseryName: '',
    governorate: 'القاهرة',
    password: '',
    confirmPassword: '',
  })
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  // خيارات نوع الحساب للعملاء فقط (معلمات، حضانات، وأولياء أمور)
  const accountTypeOptions = [
    { value: 'kindergarten', label: t('accountTypeNursery', 'حضانة أو مدرسة رياض أطفال') },
    { value: 'teacher', label: t('accountTypeTeacher', 'معلمة رياض أطفال وتأسيس') },
    { value: 'parent', label: t('accountTypeParent', 'ولي أمر (أم / أب)') },
  ]

  // خيارات المحافظات المصرية
  const isEn = i18n.language === 'en'
  const governorateOptions = GOVERNORATES.map((g) => ({
    value: g.name,
    label: isEn
      ? `${g.nameEn || g.name} (Shipping EGP ${g.shippingRate})`
      : `${g.name} (الشحن ${g.shippingRate} ج.م)`,
  }))

  // التحقق الموضعي من كافة الحقول
  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = t('errors.nameRequired', 'يرجى إدخال الاسم بالكامل')
    }

    if (!formData.email.trim()) {
      errors.email = t('errors.emailInvalid', 'يرجى إدخال بريد إلكتروني صحيح')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = t('errors.emailInvalid', 'صيغة البريد الإلكتروني غير صحيحة')
    }

    const cleanPhone = formData.phone.trim()
    if (!cleanPhone) {
      errors.phone = 'يرجى إدخال رقم الهاتف المحمول'
    } else if (!/^01[0-2,5]{1}[0-9]{8}$/.test(cleanPhone)) {
      errors.phone = t('errors.phoneInvalid', 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقماً')
    }

    if (!formData.password) {
      errors.password = t('errors.passwordRequired', 'يرجى إدخال كلمة المرور')
    } else if (formData.password.length < 6) {
      errors.password = t('errors.passwordShort', 'يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام')
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'يرجى تأكيد كلمة المرور'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('errors.passwordMismatch', 'كلمتا المرور غير متطابقتين')
    }

    if (!agreeTerms) {
      errors.terms = t('errors.termsRequired', 'يجب الموافقة على شروط الاستخدام للمتابعة')
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      // تسجيل العميل حصراً بصلاحية 'customer'
      await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: 'customer',
        accountType: formData.accountType,
        nurseryName: formData.nurseryName.trim(),
        governorate: formData.governorate,
      })

      // الانتقال المباشر لصفحة تأكيد البريد الإلكتروني
      navigate('/verify-email', { replace: true })
    } catch (err) {
      setFormError(err.message || 'فشل إنشاء الحساب، يرجى المحاولة لاحقاً')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* الترويسة */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
          <UserPlus className="w-3.5 h-3.5" />
          <span>{t('registerTitle', 'إنشاء حساب جديد ')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
          {t('registerTitle', 'إنشاء حساب جديد ')}
        </h1>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {t('registerSubtitle', 'انضمي إلى مجتمع معلمات ومشرفات رياض الأطفال للحصول على وسائل تعليمية يدوية مميزة')}
        </p>
      </div>

      {formError && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* الاسم الكامل والهاتف */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="reg-name"
            name="name"
            label={t('fullNameLabel', 'الاسم الكامل / اسم المسؤولة')}
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value })
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: null })
            }}
            placeholder={t('fullNamePlaceholder', 'الاسم الكامل')}
            error={fieldErrors.name}
            startIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            id="reg-phone"
            name="phone"
            type="tel"
            label={t('phoneLabel', 'رقم الهاتف المحمول (مصر)')}
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value })
              if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: null })
            }}
            placeholder={t('phonePlaceholder', '010XXXXXXXX')}
            error={fieldErrors.phone}
            startIcon={<Phone className="w-4 h-4" />}
            dir="ltr"
            className="[unicode-bidi:isolate] text-start"
            required
          />
        </div>

        {/* البريد الإلكتروني ونوع الحساب */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="reg-email"
            name="email"
            type="email"
            label={t('emailLabel', 'البريد الإلكتروني')}
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value })
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: null })
            }}
            placeholder={t('emailPlaceholder', 'name@nursery.edu.eg')}
            error={fieldErrors.email}
            startIcon={<Mail className="w-4 h-4" />}
            dir="ltr"
            className="[unicode-bidi:isolate] text-start"
            required
          />

          <Select
            id="reg-account-type"
            name="accountType"
            label={t('accountTypeLabel', 'نوع الحساب')}
            value={formData.accountType}
            onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
            options={accountTypeOptions}
            required
          />
        </div>

        {/* اسم الحضانة والمحافظة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="reg-nursery-name"
            name="nurseryName"
            label={t('nurseryNameLabel', 'اسم الروضة أو الحضانة')}
            value={formData.nurseryName}
            onChange={(e) => setFormData({ ...formData, nurseryName: e.target.value })}
            placeholder={t('nurseryNamePlaceholder', 'مثال: روضة براعم المستقبل')}
            startIcon={<School className="w-4 h-4" />}
            helperText={formData.accountType === 'parent' ? t('optionalForParents', 'اختياري لأولياء الأمور') : ''}
          />

          <Select
            id="reg-governorate"
            name="governorate"
            label={t('governorateLabel', 'المحافظة (لتحديد تسعيرة الشحن)')}
            value={formData.governorate}
            onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
            options={governorateOptions}
            required
          />
        </div>

        {/* كلمة المرور وتأكيدها مع مؤشر القوة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PasswordInput
            id="reg-password"
            name="password"
            label={t('passwordLabel', 'كلمة المرور')}
            showStrength
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value })
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null })
            }}
            placeholder={t('passwordPlaceholder', '6 أحرف على الأقل')}
            error={fieldErrors.password}
            required
          />

          <PasswordInput
            id="reg-confirm-password"
            name="confirmPassword"
            label={t('confirmPasswordLabel', 'تأكيد كلمة المرور')}
            value={formData.confirmPassword}
            onChange={(e) => {
              setFormData({ ...formData, confirmPassword: e.target.value })
              if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: null })
            }}
            placeholder={t('confirmPasswordPlaceholder', 'كرري كلمة المرور')}
            error={fieldErrors.confirmPassword}
            required
          />
        </div>

        {/* الموافقة على الشروط */}
        <div className="pt-2">
          <Checkbox
            id="reg-terms"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked)
              if (fieldErrors.terms) setFieldErrors({ ...fieldErrors, terms: null })
            }}
            error={fieldErrors.terms}
            label={
              <span className="text-xs text-text-muted leading-relaxed">
                {t('termsAgree', 'أوافق على شروط الاستخدام وسياسة الخصوصية لمنصة أيدي صغيرة، وأقر بمعرفتي بأن السداد يتم حصرياً عبر التحويل لمحفظة فودافون كاش الرسمية للمنصة.')}
              </span>
            }
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full text-base font-bold shadow-soft mt-2"
          loading={loading}
          startIcon={<UserPlus className="w-4 h-4" />}
        >
          {t('registerButton', 'إنشاء الحساب ومتابعة التحقق')}
        </Button>
      </form>

      {/* رابط تسجيل الدخول للمستخدمين المسجلين */}
      <div className="mt-6 text-center text-xs text-text-muted">
        <span>{t('haveAccount', 'لديكِ حساب بالفعل؟')} </span>
        <Link
          to="/login"
          className="font-bold text-brand-orange-text dark:text-brand-orange hover:underline ms-1"
        >
          {t('loginHere', 'تسجيل الدخول هنا')}
        </Link>
      </div>

      {/* تنويه حسابات البائعات: لا عمولة مذكورة */}
      <div className="mt-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          {t('sellerNotice', 'تنويه: حسابات البائعات تُنشأ من إدارة المنصة.')}
        </span>
      </div>
    </div>
  )
}
