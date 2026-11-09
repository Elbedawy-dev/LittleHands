import {
  AlertCircle,
  Camera,
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
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
import { PageHeader } from '../../components/ui/PageHeader'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { authService } from '../../services/authService'
import { getFriendlyError } from '../../utils'
import { processAvatarImage } from '../../utils/avatar'

export default function AdminAccountPage() {
  const { t } = useTranslation(['profile', 'common', 'auth', 'admin-core'])
  const { isRtl } = useLanguage()
  const navigate = useNavigate()
  const { user, updateProfile, logout } = useAuth()
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

  // معالجة رفع الصورة الشخصية وتصغيرها إلى 256px
  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarLoading(true)
    setProfileError('')
    try {
      const dataUrl = await processAvatarImage(file)
      await updateProfile({ avatar: dataUrl })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err) {
      const msg =
        err.message === 'ERR_INVALID_IMAGE_TYPE'
          ? isRtl
            ? 'صيغة الصورة غير مدعومة (يرجى اختيار JPG أو PNG أو WebP)'
            : 'Unsupported image format (choose JPG, PNG, or WebP)'
          : err.message === 'ERR_FILE_TOO_LARGE'
            ? isRtl
              ? 'حجم الصورة يتجاوز الحد المسموح به (5 ميجابايت)'
              : 'File size exceeds limit (5MB)'
            : isRtl
              ? 'فشل تحديث الصورة الشخصية'
              : 'Failed to update profile photo'
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
      setProfileError(isRtl ? 'يرجى إدخال الاسم بالكامل' : 'Please enter full name')
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
      setProfileError(getFriendlyError(err, t))
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
      setPasswordError(isRtl ? 'يرجى إدخال كلمة المرور الحالية' : 'Please enter current password')
      return
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setPasswordError(
        isRtl
          ? 'يجب ألا تقل كلمة المرور الجديدة عن 6 أحرف أو أرقام'
          : 'New password must be at least 6 characters'
      )
      return
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError(isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }

    setSavingPassword(true)
    try {
      await authService.changePassword({
        current: passwordData.currentPassword,
        next: passwordData.newPassword,
      })
      setPasswordSuccess(true)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      })
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err) {
      setPasswordError(getFriendlyError(err, t))
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const pageTitle = isRtl ? 'حساب إدارة المنصة' : 'Platform Admin Account'
  const pageSubtitle = isRtl
    ? 'إدارة البيانات الشخصية والصورة الرمزية وكلمة المرور'
    : 'Manage personal profile, avatar photo, and account security'

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <PageHeader title={pageTitle} description={pageSubtitle} />

      {/* قسم الصورة الشخصية والبيانات العامة */}
      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-surface-border">
          {/* الصورة الرمزية مع زر الرفع */}
          <div className="relative group shrink-0">
            <Avatar
              src={user?.avatar}
              name={user?.name || (isRtl ? 'إدارة المنصة' : 'Platform Admin')}
              role="admin"
              size="xl"
            />
            <label
              htmlFor="admin-avatar-upload"
              className="absolute -bottom-1 -end-1 p-2 rounded-full bg-brand-orange text-white shadow-soft hover:bg-[#e07528] active:scale-95 transition-all cursor-pointer"
              title={t('profile:header.avatarUpdate', 'تحديث الصورة الشخصية')}
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

          <div className="flex-1 text-center sm:text-start space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-heading font-black text-text-main" data-user-content="true">
                {user?.name || (isRtl ? 'إدارة المنصة' : 'Platform Admin')}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isRtl ? 'صلاحيات الإدارة' : 'Admin Privileges'}</span>
              </span>
            </div>
            <p className="text-xs text-text-muted" dir="ltr">
              {user?.email}
            </p>
            <p className="text-[11px] text-text-muted">
              {isRtl
                ? 'الصيغ المسموحة: JPG، PNG، WebP بحد أقصى 5 ميجابايت (تُصغر تلقائياً إلى 256 بكسل).'
                : 'Allowed formats: JPG, PNG, WebP up to 5MB (automatically resized to 256px).'}
            </p>
          </div>
        </div>

        {/* تنبيهات النجاح والخطأ لبيانات الملف الشخصي */}
        {profileSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('profile:info.saveSuccess', 'تم حفظ التعديلات بنجاح')}</span>
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
              label={t('profile:info.fullName', 'الاسم الكامل')}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />

            <Input
              label={t('profile:info.phone', 'رقم الهاتف')}
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="010XXXXXXXX"
              dir="ltr"
            />
          </div>

          <div>
            <Input
              label={t('profile:info.email', 'البريد الإلكتروني')}
              value={formData.email}
              disabled
              readOnly
              dir="ltr"
              hint={isRtl ? 'البريد الإلكتروني لحساب الإدارة للقراءة فقط' : 'Admin email is read-only'}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={savingProfile}
              icon={<Save className="w-4 h-4" />}
            >
              {t('profile:info.saveBtn', 'حفظ التعديلات')}
            </Button>
          </div>
        </form>
      </Card>

      {/* قسم تغيير كلمة المرور */}
      <Card padding="lg" className="space-y-6">
        <div className="pb-4 border-b border-surface-border">
          <h3 className="text-base font-heading font-black text-text-main flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-orange" />
            <span>{t('profile:info.changePasswordTitle', 'تغيير كلمة المرور')}</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {t('profile:info.changePasswordSubtitle', 'تحديث كلمة المرور لحماية حسابك')}
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{isRtl ? 'تم تحديث كلمة المرور بنجاح' : 'Password updated successfully'}</span>
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
            label={t('profile:info.currentPassword', 'كلمة المرور الحالية')}
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
            required
          />

          <PasswordInput
            label={t('profile:info.newPassword', 'كلمة المرور الجديدة')}
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
            required
            hint={isRtl ? '6 خانات على الأقل' : 'At least 6 characters'}
          />

          <PasswordInput
            label={t('profile:info.confirmNewPassword', 'تأكيد كلمة المرور الجديدة')}
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
              icon={<Lock className="w-4 h-4" />}
            >
              {t('profile:info.updatePasswordBtn', 'تحديث كلمة المرور')}
            </Button>
          </div>
        </form>
      </Card>

      {/* قسم تسجيل الخروج */}
      <Card padding="md" className="border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-rose-700 dark:text-rose-300">
              {t('common:actions.logout', 'تسجيل الخروج')}
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              {isRtl
                ? 'إنهاء جلسة إدارة المنصة والعودة لصفحة تسجيل الدخول'
                : 'End your administrative session and return to login page'}
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleLogout}
            icon={<LogOut className="w-4 h-4 rtl:rotate-180" />}
            data-testid="admin-account-logout-btn"
          >
            {t('common:actions.logout', 'تسجيل الخروج')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
