import { AlertCircle, ArrowRight, KeyRound, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { authService } from '../../services/authService'
import { getFriendlyError } from '../../utils'

const RESET_EMAIL_STORAGE_KEY = 'lh_reset_email'
const RESET_TOKEN_STORAGE_KEY = 'lh_reset_token'

function getInitialEmail(state) {
  if (state?.email) return state.email
  try {
    return sessionStorage.getItem(RESET_EMAIL_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const location = useLocation()
  const navigate = useNavigate()

  const [email, setEmail] = useState(() => getInitialEmail(location.state))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError(t('errors.emailRequired'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t('errors.emailInvalid'))
      return
    }

    setLoading(true)
    try {
      await authService.forgotPassword(cleanEmail)
      try {
        sessionStorage.setItem(RESET_EMAIL_STORAGE_KEY, cleanEmail)
        sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY)
      } catch {
        // Session storage unavailable
      }
      navigate('/forgot-password/verify', { state: { email: cleanEmail } })
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
          <span>{t('forgotTitle')}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
          {t('forgotTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {t('forgotSubtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          id="forgot-email"
          name="email"
          type="email"
          label={t('emailLabel')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError('')
          }}
          placeholder={t('emailPlaceholder')}
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
          {t('sendResetLink')}
        </Button>
      </form>
    </div>
  )
}
