import { AlertCircle, CheckCircle2, KeyRound, Lock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { getFriendlyError } from '../../utils'

export function ChangePasswordCard({ className = '' }) {
  const { t } = useTranslation(['profile', 'common'])
  const { refreshUser } = useAuth()

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    // 1. Check all fields required
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmNewPassword) {
      setPasswordError(t('profile:info.passwordRequiredFields'))
      return
    }

    // 2. Check min length 8
    if (passwordData.newPassword.length < 8) {
      setPasswordError(t('profile:info.passwordTooShort'))
      return
    }

    // 3. Check new !== current
    if (passwordData.newPassword === passwordData.currentPassword) {
      setPasswordError(t('profile:info.passwordSameAsCurrent'))
      return
    }

    // 4. Check confirm matches new
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError(t('profile:info.passwordMismatch'))
      return
    }

    setSavingPassword(true)
    try {
      await authService.changePassword({
        current: passwordData.currentPassword,
        next: passwordData.newPassword,
      })
      if (typeof refreshUser === 'function') {
        await refreshUser().catch(() => {})
      }
      setPasswordSuccess(true)
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err) {
      console.error('Failed to change password:', err)
      setPasswordError(getFriendlyError(err, t) || t('profile:info.passwordUpdateError'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Card padding="lg" className={className}>
      <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-black text-text-main">
              {t('profile:info.changePasswordTitle')}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {t('profile:info.changePasswordSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {passwordSuccess && (
        <div className="mb-6 p-4 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t('profile:info.passwordUpdateSuccess')}</span>
        </div>
      )}

      {passwordError && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{passwordError}</span>
        </div>
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl text-start">
        <PasswordInput
          id="change-pwd-current"
          label={t('profile:info.currentPassword')}
          value={passwordData.currentPassword}
          onChange={(e) =>
            setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
          }
          placeholder="••••••••"
          required
        />

        <PasswordInput
          id="change-pwd-new"
          label={t('profile:info.newPassword')}
          showStrength
          value={passwordData.newPassword}
          onChange={(e) =>
            setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
          }
          placeholder={t('profile:info.passwordHelper')}
          required
        />

        <PasswordInput
          id="change-pwd-confirm"
          label={t('profile:info.confirmNewPassword')}
          value={passwordData.confirmNewPassword}
          onChange={(e) =>
            setPasswordData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))
          }
          placeholder="••••••••"
          required
        />

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="outline"
            size="md"
            loading={savingPassword}
            startIcon={<Lock className="w-4 h-4" />}
          >
            {t('profile:info.updatePasswordBtn')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default ChangePasswordCard

