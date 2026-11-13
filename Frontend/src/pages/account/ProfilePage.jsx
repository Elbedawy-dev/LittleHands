import { AlertCircle, CheckCircle2, Save, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { ChangePasswordCard } from '../../features/profile'
import { GOVERNORATES } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'
import { getFriendlyError } from '../../utils'

export default function ProfilePage() {
  const { t, i18n } = useTranslation('profile')
  const isEn = i18n.language === 'en'
  const { user, updateProfile } = useAuth()

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

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  const governorateOptions = GOVERNORATES.map((g) => ({
    value: g.name,
    label: isEn
      ? `${g.nameEn || g.name} (Shipping EGP ${g.shippingRate})`
      : `${g.name} (الشحن ${g.shippingRate} ج.م)`,
  }))

  // حفظ بيانات الملف الشخصي
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess(false)

    if (!formData.name.trim()) {
      setProfileError(t('info.nameRequired'))
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile(formData)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err) {
      setProfileError(getFriendlyError(err, t))
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="space-y-8">
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
              placeholder={t('info.nurseryPlaceholder')}
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
              placeholder={t('info.cityPlaceholder')}
            />
          </div>

          <Textarea
            id="profile-address"
            label={t('info.address', 'العنوان بالتفصيل')}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder={t('info.addressPlaceholder')}
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

      {/* النموذج الثاني: تغيير كلمة المرور المشترك */}
      <ChangePasswordCard />
    </div>
  )
}
