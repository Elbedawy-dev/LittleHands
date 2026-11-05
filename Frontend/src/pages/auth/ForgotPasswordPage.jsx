import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Mail, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { authService } from '../../services/authService'

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)

  // عداد تنازلي لإعادة إرسال رمز الاستعادة
  useEffect(() => {
    let timer
    if (submitted && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [submitted, countdown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('يرجى إدخال البريد الإلكتروني')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('صيغة البريد الإلكتروني غير صحيحة')
      return
    }

    setLoading(true)
    try {
      await authService.forgotPassword(cleanEmail)
      setSubmitted(true)
      setCountdown(60)
    } catch (err) {
      setError(err.message || 'البريد الإلكتروني غير مسجل في قاعدة البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    setError('')
    try {
      await authService.forgotPassword(email.trim())
      setCountdown(60)
    } catch (err) {
      setError(err.message || 'فشلت إعادة الإرسال')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full">
      {/* رابط العودة لتسجيل الدخول */}
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-orange-text dark:hover:text-brand-orange mb-6 transition-colors"
      >
        <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
        <span>{t('backToLogin', 'العودة لصفحة تسجيل الدخول')}</span>
      </Link>

      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          <span>{t('forgotTitle', 'استعادة وتعيين كلمة المرور')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
          {t('forgotTitle', 'نسيتِ كلمة المرور؟')}
        </h1>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {t('forgotSubtitle', 'أدخلي بريدكِ الإلكتروني المسجل وسنرسل لكِ رمز التحقق لإعادة تعيين كلمة المرور فوراً')}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        /* حالة النجاح بعد إرسال الرابط */
        <div className="p-6 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-heading font-black text-lg text-text-main mb-1">
              {t('resetSuccessTitle', 'تم إرسال رمز الاستعادة بنجاح!')}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
              {t('resetSuccessDesc', 'تفقدّي صندوق الوارد أو الرسائل غير المرغوبة (Spam) للبريد المسجل:')}
            </p>
            <div className="mt-2 text-xs font-bold font-mono text-brand-orange-text dark:text-brand-orange" dir="ltr">
              {email}
            </div>
          </div>

          {/* صندوق إعادة الإرسال مع المؤقت */}
          <div className="p-3 rounded-2xl bg-surface border border-surface-border text-xs flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-text-muted">
              {countdown > 0 ? (
                <>{t('resendCountdown', 'إعادة الإرسال متاحة خلال:')} <strong className="font-mono text-text-main font-bold">{countdown}</strong> ثانية</>
              ) : (
                'لم يصلكِ الرمز بعد؟'
              )}
            </span>

            <button
              type="button"
              disabled={countdown > 0 || resending}
              onClick={handleResend}
              className="text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resending ? '...' : t('resendButton', 'إعادة الإرسال الآن')}</span>
            </button>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link to="/verify-email" className="w-full sm:w-auto">
              <Button size="md" className="w-full">
                {t('goToVerify', 'الانتقال لإدخال رمز التحقق')}
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full">
                {t('backToLogin', 'العودة لتسجيل الدخول')}
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* نموذج إدخال البريد الإلكتروني */
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="forgot-email"
            name="email"
            type="email"
            label={t('emailLabel', 'البريد الإلكتروني المسجل')}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError('')
            }}
            placeholder={t('emailPlaceholder', 'name@nursery.com')}
            startIcon={<Mail className="w-4 h-4" />}
            dir="ltr"
            className="[unicode-bidi:isolate] text-start"
            required
          />

          <Button
            type="submit"
            size="lg"
            className="w-full text-base font-bold shadow-soft"
            loading={loading}
          >
            {t('sendResetLink', 'إرسال رمز إعادة التعيين')}
          </Button>
        </form>
      )}
    </div>
  )
}
