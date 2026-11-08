import { AlertCircle, CheckCircle2, Lock, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { authService } from '../../services/authService'

export function ForcedChangePasswordModal({ isOpen, onSuccess, onLogout }) {
  const { i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!current) {
      setError(isEn ? 'Please enter your current/temporary password' : 'يرجى إدخال كلمة المرور المؤقتة الحالية')
      return
    }

    if (next.length < 8) {
      setError(isEn ? 'New password must be at least 8 characters' : 'كلمة المرور الجديدة يجب ألا تقل عن 8 خانات')
      return
    }

    if (next !== confirm) {
      setError(isEn ? 'Passwords do not match' : 'كلمتا المرور غير متطابقتين')
      return
    }

    setLoading(true)
    try {
      await authService.changePassword({ current, next })
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err) {
      setError(err.message || (isEn ? 'Failed to change password' : 'فشل تغيير كلمة المرور، تأكدي من كلمة المرور المؤقتة'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Non-closable modal
      showClose={false}
      maxWidth="max-w-md"
    >
      <div className="p-2">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-main">
              {isEn ? 'Password Change Required' : 'تغيير كلمة المرور مطلوب'}
            </h2>
            <p className="text-xs text-text-muted">
              {isEn
                ? 'Your account was created with a temporary password. Please set a new password to continue.'
                : 'تم إنشاء حسابك بكلمة مرور مؤقتة، يرجى تعيين كلمة مرور جديدة وخاصة بك للمتابعة.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isEn ? 'Password changed successfully! Loading...' : 'تم تحديث كلمة المرور بنجاح! جاري المتابعة...'}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              id="forced-current-password"
              type="password"
              label={isEn ? 'Temporary / Current Password' : 'كلمة المرور المؤقتة الحالية'}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={loading}
              required
            />

            <Input
              id="forced-next-password"
              type="password"
              label={isEn ? 'New Password' : 'كلمة المرور الجديدة'}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={loading}
              required
              minLength={8}
            />

            <Input
              id="forced-confirm-password"
              type="password"
              label={isEn ? 'Confirm New Password' : 'تأكيد كلمة المرور الجديدة'}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              required
              minLength={8}
            />

            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary" className="flex-1" loading={loading}>
                {isEn ? 'Save Password' : 'حفظ كلمة المرور'}
              </Button>
              {onLogout && (
                <Button type="button" variant="outline" onClick={onLogout} disabled={loading}>
                  {isEn ? 'Logout' : 'تسجيل الخروج'}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

