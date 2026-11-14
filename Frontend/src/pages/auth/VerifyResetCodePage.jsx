import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { OTPInput } from '../../components/ui/OTPInput'
import { authService } from '../../services/authService'
import { getFriendlyError } from '../../utils'

const RESET_EMAIL_STORAGE_KEY = 'lh_reset_email'
const RESET_TOKEN_STORAGE_KEY = 'lh_reset_token'

function getTargetEmail(state) {
  if (state?.email) return state.email
  try {
    return sessionStorage.getItem(RESET_EMAIL_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export default function VerifyResetCodePage() {
  const { t } = useTranslation('auth')
  const location = useLocation()
  const navigate = useNavigate()

  const targetEmail = getTargetEmail(location.state)

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    let timer
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  if (!targetEmail) {
    return <Navigate to="/forgot-password" replace />
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')

    if (code.length < 6) {
      setError(t('errors.otpIncomplete'))
      return
    }

    setLoading(true)
    try {
      const res = await authService.verifyResetCode({ email: targetEmail, code })
      const resetToken = res?.resetToken
      if (!resetToken) {
        setError(t('errors.resetTokenInvalid'))
        return
      }
      try {
        sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, resetToken)
      } catch {
        // Session storage unavailable
      }
      navigate('/reset-password', {
        replace: true,
        state: { resetToken, email: targetEmail },
      })
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
      await authService.forgotPassword(targetEmail)
      setCode('')
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
      <div className="text-start mb-4">
        <Link
          to="/forgot-password"
          state={{ email: targetEmail }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-orange-text dark:hover:text-brand-orange transition-colors"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
          <span>{t('verifyReset.editEmail')}</span>
        </Link>
      </div>

      <div className="w-16 h-16 rounded-full bg-brand-orange/15 text-brand-orange flex items-center justify-center mx-auto mb-4 shadow-soft">
        <KeyRound className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
        <span>{t('verifyReset.badge')}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
        {t('verifyReset.title')}
      </h1>
      <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto mb-2 leading-relaxed">
        {t('verifyReset.subtitle')}
      </p>
      <div className="font-mono text-xs font-bold text-brand-orange-text dark:text-brand-orange mb-1 [unicode-bidi:isolate]" dir="ltr">
        {targetEmail}
      </div>
      <p className="text-[11px] text-text-muted mb-6">
        {t('verifyReset.expiryNote')}
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resendSuccess && (
        <div className="mb-6 p-3 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t('verifyReset.resendSuccess')}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-text-main mb-3">
            {t('verifyReset.otpLabel')}
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

        <div className="p-3.5 rounded-2xl bg-surface border border-surface-border flex items-center justify-between text-xs max-w-sm mx-auto shadow-xs gap-2">
          <span className="text-text-muted text-start">
            {countdown > 0 ? (
              <>
                {t('verifyReset.resendAvailableIn')}{' '}
                <strong className="font-mono text-text-main font-bold">{countdown}</strong>{' '}
                {t('verifyReset.secondsUnit')}
              </>
            ) : (
              t('verifyReset.didNotReceive')
            )}
          </span>

          <button
            type="button"
            disabled={countdown > 0 || resending}
            onClick={handleResend}
            className="text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resending ? '...' : t('verifyReset.resendButton')}</span>
          </button>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full text-base font-bold shadow-soft"
          loading={loading}
        >
          {t('verifyReset.verifyButton')}
        </Button>
      </form>
    </div>
  )
}
