import { AlertCircle, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { authService } from '../../services/authService'
import { getFriendlyError } from '../../utils'

const RESET_EMAIL_STORAGE_KEY = 'lh_reset_email'
const RESET_TOKEN_STORAGE_KEY = 'lh_reset_token'

function getResetToken(state) {
  if (state?.resetToken) return state.resetToken
  try {
    return sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export default function ResetPasswordPage() {
  const { t } = useTranslation(['auth', 'common'])
  const location = useLocation()
  const [token] = useState(() => getResetToken(location.state))

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!token && !success) {
    return <Navigate to="/forgot-password" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError(t('errors.resetTokenInvalid'))
      return
    }

    if (password.length < 8) {
      setError(t('errors.passwordMin8'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({ token, password })
      try {
        sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY)
        sessionStorage.removeItem(RESET_EMAIL_STORAGE_KEY)
      } catch {
        // Session storage unavailable
      }
      setSuccess(true)
    } catch (err) {
      setError(getFriendlyError(err, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-brand-orange-text dark:hover:text-brand-orange mb-6 transition-colors"
      >
        <ArrowRight className="w-4 h-4 rtl:rotate-0 rotate-180" />
        <span>{t('backToLogin')}</span>
      </Link>

      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          <span>{t('resetPage.badge')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
          {t('resetPage.title')}
        </h1>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {t('resetPage.subtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="p-6 rounded-[24px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-200 mb-1">
            {t('resetPage.successTitle')}
          </h2>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-6">
            {t('resetPage.successDesc')}
          </p>
          <Link to="/login">
            <Button variant="primary" className="w-full">
              {t('resetPage.loginButton')}
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="new-password"
            name="password"
            label={t('resetPage.newPasswordLabel')}
            placeholder={t('common:ui.passwordMaskPlaceholder')}
            showStrength
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError('')
            }}
            disabled={loading}
            required
            minLength={8}
            containerClassName="mb-0"
          />

          <PasswordInput
            id="confirm-new-password"
            name="confirmPassword"
            label={t('resetPage.confirmPasswordLabel')}
            placeholder={t('common:ui.passwordMaskPlaceholder')}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (error) setError('')
            }}
            disabled={loading}
            required
            minLength={8}
            containerClassName="mb-0"
          />

          <Button type="submit" variant="primary" size="lg" className="w-full mt-2" loading={loading}>
            {t('resetPage.submitButton')}
          </Button>
        </form>
      )}
    </div>
  )
}
