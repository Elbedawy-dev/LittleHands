import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Lock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { authService } from '../../services/authService'

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation(['auth', 'common'])
  const isEn = i18n.language === 'en'
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError(isEn ? 'Invalid or missing reset token' : 'رمز إعادة التعيين مفقود أو غير صالح')
      return
    }

    if (password.length < 8) {
      setError(isEn ? 'Password must be at least 8 characters' : 'يجب ألا تقل كلمة المرور عن 8 خانات')
      return
    }

    if (password !== confirmPassword) {
      setError(isEn ? 'Passwords do not match' : 'كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({ token, password })
      setSuccess(true)
    } catch (err) {
      setError(err.message || (isEn ? 'Failed to reset password' : 'فشلت عملية إعادة تعيين كلمة المرور'))
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
        <span>{t('backToLogin', 'العودة لصفحة تسجيل الدخول')}</span>
      </Link>

      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          <span>{isEn ? 'Reset Password' : 'إعادة تعيين كلمة المرور'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-heading text-text-main mb-2">
          {isEn ? 'Set New Password' : 'تعيين كلمة مرور جديدة'}
        </h1>
        <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
          {isEn
            ? 'Enter your new password below to secure your account.'
            : 'أدخلي كلمة المرور الجديدة لتأمين حسابك والتمكن من الدخول مجدداً.'}
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
            {isEn ? 'Password Reset Successfully' : 'تم تغيير كلمة المرور بنجاح!'}
          </h2>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 mb-6">
            {isEn
              ? 'You can now sign in using your new password.'
              : 'يمكنك الآن تسجيل الدخول إلى حسابك باستخدام كلمة المرور الجديدة.'}
          </p>
          <Link to="/login">
            <Button variant="primary" className="w-full">
              {t('backToLogin', 'تسجيل الدخول')}
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="new-password"
            type="password"
            label={isEn ? 'New Password' : 'كلمة المرور الجديدة'}
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            minLength={8}
          />

          <Input
            id="confirm-new-password"
            type="password"
            label={isEn ? 'Confirm New Password' : 'تأكيد كلمة المرور الجديدة'}
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
            minLength={8}
          />

          <Button type="submit" variant="primary" className="w-full mt-2" loading={loading}>
            {isEn ? 'Update Password' : 'تحديث كلمة المرور'}
          </Button>
        </form>
      )}
    </div>
  )
}

