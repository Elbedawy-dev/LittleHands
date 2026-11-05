import { AlertCircle, Camera, CheckCircle2, KeyRound, Lock, Save, User } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { GOVERNORATES } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'
import { authService } from '../../services/authService'
import { processAvatarImage } from '../../utils/avatar'

export default function ProfilePage() {
  const { t, i18n } = useTranslation('profile')
  const isEn = i18n.language === 'en'
  const { user, updateProfile } = useAuth()
  const avatarInputRef = useRef(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  // بيانات الملف الشخصي
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nurseryName: user?.nurseryName || '',
    governorate: user?.governorate || 'القاهرة',
    city: user?.city || '',
    address: user?.address || '',
  })

  // بيانات تغيير كلمة المرور
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

  const governorateOptions = GOVERNORATES.map((g) => ({
    value: g.name,
    label: isEn
      ? `${g.nameEn || g.name} (Shipping EGP ${g.shippingRate})`
      : `${g.name} (الشحن ${g.shippingRate} ج.م)`,
  }))

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
      setProfileError(err.message || (isEn ? 'Failed to update photo' : 'فشل تحديث الصورة الشخصية'))
    } finally {
      setAvatarLoading(false)
    }
  }

  // حفظ بيانات الملف الشخصي
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess(false)

    if (!formData.name.trim()) {
      setProfileError(isEn ? 'Please enter full name' : 'يرجى إدخال الاسم بالكامل')
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile(formData)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err) {
      setProfileError(err.message || (isEn ? 'Failed to save changes' : 'فشل حفظ التعديلات'))
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
      setPasswordError(isEn ? 'Please enter current password' : 'يرجى إدخال كلمة المرور الحالية')
      return
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setPasswordError(isEn ? 'New password must be at least 6 characters' : 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف')
      return
    }
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError(isEn ? 'Passwords do not match' : 'كلمتا المرور الجديدتان غير متطابقتين')
      return
    }

    setSavingPassword(true)
    try {
      await authService.changePassword({
        current: passwordData.currentPassword,
        next: passwordData.newPassword,
      })
      setPasswordSuccess(true)
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      setTimeout(() => setPasswordSuccess(false), 4000)
    } catch (err) {
      setPasswordError(err.message || (isEn ? 'Failed to update password' : 'فشل تحديث كلمة المرور'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* بطاقة الصورة الشخصية للحساب */}
      <Card padding="md" className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <Avatar
              src={user?.avatar}
              name={user?.name || (isEn ? 'Account' : 'حساب العميلة')}
              size="lg"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-1 -end-1 p-2 rounded-full bg-brand-orange text-white shadow-soft hover:bg-brand-orange-hover active:scale-95 transition-all select-none cursor-pointer"
              aria-label={t('header.updateAvatar', 'تحديث الصورة الشخصية')}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFile}
              className="hidden"
            />
          </div>
          <div>
            <h3 className="font-heading font-black text-base text-text-main" data-user-content="true">
              {user?.name || (isEn ? 'Account' : 'حساب العميلة')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5" data-user-content="true">
              {user?.email || ''}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={avatarLoading}
          onClick={() => avatarInputRef.current?.click()}
          startIcon={<Camera className="w-4 h-4" />}
        >
          {isEn ? 'Change Photo' : 'تغيير الصورة'}
        </Button>
      </Card>

      {/* النموذج الأول: البيانات الشخصية ومقر الحضانة */}
      <Card padding="lg">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-black text-text-main">
                {t('info.title', 'الملف الشخصي وبيانات الحضانة')}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {t('info.subtitle', 'إدارة بيانات التواصل واسم الحضانة ومقر العمل')}
              </p>
            </div>
          </div>
        </div>

        {profileSuccess && (
          <div className="mb-6 p-4 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t('info.saveSuccess', 'تم حفظ التعديلات بنجاح')}</span>
          </div>
        )}

        {profileError && (
          <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="profile-name"
              label={t('info.fullName', 'الاسم الكامل')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              id="profile-phone"
              type="tel"
              label={t('info.phone', 'رقم الهاتف')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              dir="ltr"
              className="[unicode-bidi:isolate] text-start"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="profile-email"
              type="email"
              label={t('info.email', 'البريد الإلكتروني')}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              dir="ltr"
              className="[unicode-bidi:isolate] text-start"
              required
            />

            <Input
              id="profile-nursery"
              label={t('info.nurseryName', 'اسم الحضانة أو الروضة')}
              value={formData.nurseryName}
              onChange={(e) => setFormData({ ...formData, nurseryName: e.target.value })}
              placeholder={isEn ? 'e.g. Future Sprouts Nursery' : 'مثال: روضة براعم المستقبل'}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="profile-governorate"
              label={t('info.governorate', 'المحافظة')}
              value={formData.governorate}
              onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
              options={governorateOptions}
              required
            />

            <Input
              id="profile-city"
              label={t('info.city', 'المدينة أو المركز')}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder={isEn ? 'e.g. Nasr City / Dokki' : 'مثال: مدينة نصر / الدقي'}
            />
          </div>

          <Textarea
            id="profile-address"
            label={t('info.address', 'العنوان بالتفصيل')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder={isEn ? 'Street, building number, floor, landmark' : 'الشارع، رقم المبنى، الدور، علامة مميزة لتسهيل وصول مندوب الشحن'}
            rows={3}
          />

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              size="md"
              loading={savingProfile}
              startIcon={<Save className="w-4 h-4" />}
            >
              {t('info.saveBtn', 'حفظ التعديلات')}
            </Button>
          </div>
        </form>
      </Card>

      {/* النموذج الثاني: تغيير كلمة المرور */}
      <Card padding="lg">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-black text-text-main">
                {t('info.changePasswordTitle', 'تغيير كلمة المرور')}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {t('info.changePasswordSubtitle', 'تحديث كلمة المرور لحماية حسابك')}
              </p>
            </div>
          </div>
        </div>

        {passwordSuccess && (
          <div className="mb-6 p-4 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{isEn ? 'Password updated successfully!' : 'تم تحديث كلمة المرور بنجاح!'}</span>
          </div>
        )}

        {passwordError && (
          <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
          <PasswordInput
            id="current-password"
            label={t('info.currentPassword', 'كلمة المرور الحالية')}
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, currentPassword: e.target.value })
            }
            placeholder={isEn ? 'Enter current password' : 'أدخلي كلمة المرور الحالية'}
            required
          />

          <PasswordInput
            id="new-password"
            label={t('info.newPassword', 'كلمة المرور الجديدة')}
            showStrength
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
            placeholder={isEn ? 'At least 6 characters' : '6 أحرف أو أرقام على الأقل'}
            required
          />

          <PasswordInput
            id="confirm-new-password"
            label={t('info.confirmNewPassword', 'تأكيد كلمة المرور الجديدة')}
            value={passwordData.confirmNewPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })
            }
            placeholder={isEn ? 'Repeat new password' : 'كرري كلمة المرور الجديدة'}
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
              {t('info.updatePasswordBtn', 'تحديث كلمة المرور')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
