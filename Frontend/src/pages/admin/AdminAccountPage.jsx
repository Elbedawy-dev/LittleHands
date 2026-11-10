import {
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  Lock,
  Save,
  ShieldCheck,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { LogoutCard } from '../../components/ui/LogoutCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { userService } from '../../services/userService'
import { getFriendlyError } from '../../utils'
import { processAvatarImage } from '../../utils/avatar'

export default function AdminAccountPage() {
  const { t } = useTranslation(['profile', 'common', 'auth', 'admin-core', 'errors'])
  const navigate = useNavigate()
  const { user, updateProfile, refreshUser, logout } = useAuth()
  const avatarInputRef = useRef(null)

  const [avatarLoading, setAvatarLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // معالجة رفع الصورة الشخصية عبر مسار الرفع الرسمي وعدم إرسال data URL لأي مسار
  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarLoading(true)
    setProfileError('')
    try {
      const dataUrl = await processAvatarImage(file)
      const blob = await fetch(dataUrl).then((r) => r.blob())
      const avatarFile = new File([blob], file.name || 'avatar.webp', {
        type: blob.type || 'image/webp',
      })
      await userService.uploadAvatar(avatarFile)
      await refreshUser()
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err) {
      const msg =
        err.message === 'ERR_INVALID_IMAGE_TYPE'
          ? t('errors:ERR_INVALID_IMAGE_TYPE')
          : err.message === 'ERR_FILE_TOO_LARGE'
            ? t('errors:ERR_FILE_TOO_LARGE')
            : getFriendlyError(err, t) || t('profile:info.avatarError')
      setProfileError(msg)
    } finally {
      setAvatarLoading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  // حفظ بيانات الحساب الأساسية
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess(false)

    if (!formData.name.trim()) {
      setProfileError(t('profile:info.nameRequired'))
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
      })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err) {
      setProfileError(getFriendlyError(err, t) || t('profile:info.saveError'))
    } finally {
      setSavingProfile(false)
    }
  }

  // تغيير كلمة المرور
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (!passwordData.currentPassword) {
      setPasswordError(t('profile:info.passwordRequiredFields'))
      return
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      setPasswordError(t('profile:info.passwordTooShort'))
      return
    }

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
      await refreshUser()
      setPasswordSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      })
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err) {
      setPasswordError(getFriendlyError(err, t) || t('profile:info.passwordUpdateError'))
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader
        title={t('profile:admin.pageTitle')}
        description={t('profile:admin.pageSubtitle')}
      />

      {/* قسم الصورة الشخصية والبيانات العامة */}
      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-surface-border">
          {/* الصورة الرمزية مع زر الرفع */}
          <div className="relative group shrink-0">
            <Avatar
              src={user?.avatar}
              name={user?.name || t('common:roles.admin')}
              role="admin"
              size="xl"
            />
            <label
              htmlFor="admin-avatar-upload"
              className="absolute -bottom-1 -end-1 p-2 rounded-full bg-brand-orange text-white shadow-soft hover:bg-[#e07528] active:scale-95 transition-all cursor-pointer"
              title={t('profile:admin.avatarUpdateTitle')}
              aria-label={t('profile:admin.avatarUpdateTitle')}
            >
              <Camera className="w-4 h-4" />
              <input
                ref={avatarInputRef}
                id="admin-avatar-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFile}
                disabled={avatarLoading}
                className="sr-only"
              />
            </label>
          </div>

          <div className="flex flex-col items-start gap-1 text-start flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-heading font-black text-text-main" data-user-content="true">
                {user?.name || t('common:roles.admin')}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('profile:admin.roleBadge')}</span>
              </span>
            </div>
            <p className="text-xs text-text-muted font-mono" dir="ltr">
              {user?.email}
            </p>
            <p className="text-[11px] text-text-muted">
              {t('profile:admin.avatarFormatsHint')}
            </p>
          </div>
        </div>

        {/* تنبيهات النجاح والخطأ لبيانات الملف الشخصي */}
        {profileSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('profile:info.saveSuccess')}</span>
          </div>
        )}

        {profileError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        {/* نموذج البيانات الأساسية */}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('profile:info.fullName')}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />

            <Input
              label={t('profile:info.phone')}
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="010XXXXXXXX"
              dir="ltr"
              className="[unicode-bidi:isolate] text-start"
            />
          </div>

          <div>
            <Input
              label={t('profile:info.email')}
              value={formData.email}
              disabled
              readOnly
              dir="ltr"
              className="[unicode-bidi:isolate] text-start"
              helperText={t('profile:admin.emailHelper')}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={savingProfile}
              startIcon={<Save className="w-4 h-4" />}
            >
              {t('profile:info.saveBtn')}
            </Button>
          </div>
        </form>
      </Card>

      {/* قسم تغيير كلمة المرور */}
      <Card padding="lg" className="space-y-6">
        <div className="pb-4 border-b border-surface-border">
          <h3 className="text-base font-heading font-black text-text-main flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-orange" />
            <span>{t('profile:info.changePasswordTitle')}</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('profile:info.changePasswordSubtitle')}
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('profile:info.passwordUpdateSuccess')}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <PasswordInput
            label={t('profile:info.currentPassword')}
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
            required
          />

          <PasswordInput
            label={t('profile:info.newPassword')}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
            required
            helperText={t('profile:info.passwordHelper')}
          />

          <PasswordInput
            label={t('profile:info.confirmNewPassword')}
            value={passwordData.confirmNewPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
            required
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="secondary"
              size="md"
              loading={savingPassword}
              startIcon={<Lock className="w-4 h-4" />}
            >
              {t('profile:info.updatePasswordBtn')}
            </Button>
          </div>
        </form>
      </Card>

      {/* بطاقة تسجيل الخروج المشتركة */}
      <LogoutCard onLogout={handleLogout} />
    </div>
  )
}
