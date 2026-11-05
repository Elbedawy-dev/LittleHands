import { AlertCircle, Info, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { useAuth } from '../../context/AuthContext'
import { formatErrorMessage } from '../../utils'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextUrl = searchParams.get('next') || '/'

  const { login } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  // التحقق الموضعي من صحة المدخلات قبل الإرسال
  const validateForm = () => {
    const errors = {}
    const cleanId = identifier.trim()

    if (!cleanId) {
      errors.identifier = t('errors.identifierRequired')
    } else {
      // فحص إن كان بريداً أو هاتفاً مصرياً مكوناً من 11 رقماً
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId)
      const isEgyptianPhone = /^01[0-2,5]{1}[0-9]{8}$/.test(cleanId)
      if (!isEmail && !isEgyptianPhone) {
        errors.identifier = t('errors.invalidIdentifier')
      }
    }

    if (!password) {
      errors.password = t('errors.passwordRequired')
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // معالجة تسجيل الدخول وإعادة التوجيه حسب الدور
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      const res = await login({ identifier, password })
      // توجيه المستخدم حسب دوره المصرح به
      if (res.user.role === 'admin') {
        navigate('/admin', { replace: true })
      } else if (res.user.role === 'seller') {
        navigate('/seller', { replace: true })
      } else {
        navigate(nextUrl, { replace: true })
      }
    } catch (err) {
      setFormError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* العنوان والترحيب */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/15 text-brand-orange-text dark:text-brand-orange text-xs font-bold mb-2">
          <LogIn className="w-3.5 h-3.5" />
          <span>{t('loginButton', 'تسجيل الدخول للمنصة')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
          {t('loginTitle', 'تسجيل الدخول')}
        </h1>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {t('loginSubtitle', 'سجّلي دخولكِ لمتابعة طلبيات الوسائل التعليمية اليدوية وعناوين التوصيل للحضانة')}
        </p>
      </div>

      {/* رسالة الخطأ العامة */}
      {formError && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* نموذج تسجيل الدخول */}
      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="login-identifier"
          name="identifier"
          label={t('identifierLabel', 'البريد الإلكتروني أو رقم الهاتف المحمول')}
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value)
            if (fieldErrors.identifier) setFieldErrors({ ...fieldErrors, identifier: null })
          }}
          placeholder={t('identifierPlaceholder', 'name@nursery.com أو 010XXXXXXXX')}
          error={fieldErrors.identifier}
          startIcon={<Mail className="w-4 h-4" />}
          required
        />

        <div>
          <PasswordInput
            id="login-password"
            name="password"
            label={t('passwordLabel', 'كلمة المرور')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: null })
            }}
            placeholder={t('passwordPlaceholder', 'أدخلي كلمة المرور')}
            error={fieldErrors.password}
            required
          />

          <div className="flex items-center justify-between -mt-2 mb-5">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              label={t('rememberMe', 'تذكرني على هذا الجهاز')}
            />

            <Link
              to="/forgot-password"
              className="text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline focus:outline-none"
            >
              {t('forgotPasswordLink', 'نسيتِ كلمة المرور؟')}
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full text-base font-bold shadow-soft"
          loading={loading}
          startIcon={<LogIn className="w-4 h-4" />}
        >
          {t('loginButton', 'تسجيل الدخول للمنصة')}
        </Button>
      </form>

      {/* رابط التسجيل للعملاء الجدد */}
      <div className="mt-6 text-center text-xs text-text-muted">
        <span>{t('noAccount', 'ليس لديكِ حساب حتى الآن؟')} </span>
        <Link
          to="/register"
          className="font-bold text-brand-orange-text dark:text-brand-orange hover:underline ms-1"
        >
          {t('registerLink', 'إنشاء حساب جديد ')}
        </Link>
      </div>

      {/* تنويه خاص بالبائعات: يُحظر تماماً ذكر نسبة العمولة في صفحات المصادقة العامة */}
      <div className="mt-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>{t('notice', 'تنويه')}:</strong> {t('sellerNotice', 'حسابات البائعات تُنشأ من إدارة المنصة.')}
        </span>
      </div>
    </div>
  )
}
