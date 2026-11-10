import { AlertCircle, ArrowRight, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { OTPInput } from '../../components/ui/OTPInput'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { getFriendlyError } from '../../utils'

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next') || '/account'
  const { user, refreshUser } = useAuth()

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const targetEmail = user?.email || searchParams.get('email') || ''

  // عداد تنازلي لإعادة إرسال الرمز
  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')

    if (code.length < 4) {
      setError(t('errors.otpIncomplete'))
      return
    }

    setLoading(true)
    try {
    await authService.verifyEmail({ email: targetEmail, code })
      if (refreshUser) await refreshUser()
      navigate(next, { replace: true })
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0 || resending) return
    setResending(true)
    setError('')
    try {
      await authService.resendCode({ email: targetEmail })
      setResendSuccess(true)
      setCountdown(60)
      setTimeout(() => setResendSuccess(false), 3000)
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full text-center">
      {/* رابط العودة للتعديل */}
      <div className="text-start mb-4">
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-orange-text dark:hover:text-brand-orange transition-colors"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
          <span>{t('editEmail', 'تعديل بيانات الحساب')}</span>
        </Link>
      </div>

      <div className="w-16 h-16 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center mx-auto mb-4 shadow-soft">
        <ShieldCheck className="w-9 h-9" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
        {t('verifyTitle', 'تأكيد البريد الإلكتروني')}
      </h1>
      <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto mb-2 leading-relaxed">
        {t('verifySubtitle', 'أرسلنا رمز تحقق مكوّن من 6 أرقام إلى بريدكِ الإلكتروني:')}
      </p>
      <div className="font-mono text-xs font-bold text-brand-orange-text dark:text-brand-orange mb-6" dir="ltr">
        {targetEmail}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resendSuccess && (
        <div className="mb-6 p-3 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>تم إعادة إرسال الرمز بنجاح! تفقد بريدك الوارد.</span>
        </div>
      )}

      {/* نموذج إدخال الرمز المكون من 6 أرقام (Ltr حتى في الواجهة العربية لترتيب الأرقام السليم) */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-text-main mb-3">
            {t('otpLabel', 'أدخلي الرمز المكوّن من 6 أرقام (من اليسار لليمين):')}
          </label>

          <OTPInput
            length={6}
            value={code}
            onChange={(val) => {
              setCode(val)
              if (error) setError('')
            }}
            disabled={loading}
          />
        </div>

        {/* المؤقت التنازلي لإعادة الإرسال */}
        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border flex items-center justify-between text-xs max-w-sm mx-auto shadow-xs">
          <span className="text-text-muted">
            {countdown > 0 ? (
              <>{t('resendAvailableIn', 'إعادة الإرسال متاحة خلال:')} <strong className="font-mono text-text-main font-bold">{countdown}</strong> ث</>
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
            <span>{resending ? '...' : t('resendButton', 'إعادة الإرسال')}</span>
          </button>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full text-base font-bold shadow-soft"
          loading={loading}
        >
          {t('verifyButton', 'تأكيد الرمز وبدء التصفح')}
        </Button>
      </form>
    </div>
  )
}
