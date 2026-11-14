import { AlertCircle, CheckCircle2, Save, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { GOVERNORATES } from '../../config/constants'
import { useAuth } from '../../context/AuthContext'
import { getFriendlyError, isValidEgyptianPhone } from '../../utils'

/**
 * نموذج البيانات الشخصية المشترك (PersonalInfoForm)
 * يقرأ من AuthContext (مصدر واحد) ويحدّث عبر PATCH /users/me ثم refreshUser()
 * بحيث تتزامن التعديلات فوراً بين شريط التنقل وصفحات الملف الشخصي المختلفة.
 *
 * Variants:
 * - 'customer': النموذج الكامل للعميل (الاسم، الهاتف، البريد، الحضانة، المحافظة، المدينة، العنوان)
 * - 'basic': النموذج الأساسي المشترك للبائعة في /account والأدمن في /account و /admin/account (الاسم، الهاتف، البريد للقراءة فقط)
 * - 'sellerWorkshop': بيانات البائعة والورشة في /seller/profile (الاسم، البريد للقراءة فقط، الهاتف، المحافظة، عنوان الورشة)
 */
export function PersonalInfoForm({
  variant = 'basic',
  title,
  subtitle,
  submitLabel,
  emailHelperText,
  phoneRequired,
  showCardHeader = true,
  formClassName = 'space-y-4',
  onExtraSave,
  className = '',
}) {
  const { t, i18n } = useTranslation('profile')
  const isEn = i18n.language === 'en'
  const { user, updateProfile } = useAuth()

  const isCustomer = variant === 'customer'
  const isSellerWorkshop = variant === 'sellerWorkshop'
  const isPhoneRequired = phoneRequired !== undefined ? phoneRequired : isCustomer || isSellerWorkshop

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nurseryName: user?.nurseryName || '',
    governorate: user?.governorate || 'القاهرة',
    city: user?.city || '',
    address: user?.address || '',
  })

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // مزامنة الحقول تلقائياً عند تغيّر بيانات المستخدم في AuthContext
  useEffect(() => {
    if (!user) return
    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      nurseryName: user.nurseryName || '',
      governorate: user.governorate || 'القاهرة',
      city: user.city || '',
      address: user.address || '',
    })
  }, [user])

  const governorateOptions = GOVERNORATES.map((g) => ({
    value: g.name,
    label: isCustomer
      ? isEn
        ? `${g.nameEn || g.name} (Shipping EGP ${g.shippingRate})`
        : `${g.name} (الشحن ${g.shippingRate} ج.م)`
      : isEn
        ? g.nameEn || g.name
        : g.name,
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmedName = formData.name.trim()
    const trimmedPhone = formData.phone.trim()

    if (!trimmedName) {
      setError(t('info.nameRequired'))
      return
    }

    if (trimmedPhone && !isValidEgyptianPhone(trimmedPhone)) {
      setError(t('info.phoneInvalid'))
      return
    }

    if (isPhoneRequired && !trimmedPhone) {
      setError(t('info.phoneInvalid'))
      return
    }

    setSaving(true)
    try {
      const payload = { name: trimmedName }
      if (trimmedPhone) payload.phone = trimmedPhone

      if (isCustomer) {
        payload.nurseryName = formData.nurseryName.trim()
        payload.governorate = formData.governorate
        payload.city = formData.city.trim()
        payload.address = formData.address.trim()
      } else if (isSellerWorkshop) {
        payload.governorate = formData.governorate
        payload.address = formData.address.trim()
      }

      if (onExtraSave) {
        await onExtraSave({ ...formData, name: trimmedName, phone: trimmedPhone })
      }
      await updateProfile(payload)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err) {
      setError(getFriendlyError(err, t) || t('info.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const resolvedTitle =
    title ||
    (isCustomer
      ? t('info.title', 'الملف الشخصي وبيانات الحضانة')
      : isSellerWorkshop
        ? t('seller.infoSectionTitle')
        : t('info.basicInfoTitle'))

  const resolvedSubtitle =
    subtitle ||
    (isCustomer
      ? t('info.subtitle', 'إدارة بيانات التواصل واسم الحضانة ومقر العمل')
      : isSellerWorkshop
        ? t('seller.infoSectionDesc')
        : t('info.basicInfoSubtitle'))

  const resolvedSubmitLabel =
    submitLabel || (isSellerWorkshop ? t('seller.saveInfoBtn') : t('info.saveBtn', 'حفظ التعديلات'))

  return (
    <Card padding="lg" className={className}>
      {showCardHeader && (
        <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-black text-text-main">
                {resolvedTitle}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {resolvedSubtitle}
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-[16px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{t('info.saveSuccess', 'تم حفظ التعديلات بنجاح')}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={formClassName}>
        {isSellerWorkshop ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="seller-name"
                label={t('seller.nameLabel')}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <Input
                id="seller-email"
                type="email"
                label={t('seller.emailLabel')}
                value={formData.email}
                disabled
                readOnly
                dir="ltr"
                className="[unicode-bidi:isolate] text-start"
                helperText={emailHelperText || t('info.sellerInfoEmailHelper')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="seller-phone"
                type="tel"
                label={t('seller.phoneLabel')}
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="010XXXXXXXX"
                dir="ltr"
                className="[unicode-bidi:isolate] text-start"
                required
              />

              <Select
                id="seller-gov"
                label={t('seller.govLabel')}
                value={formData.governorate}
                onChange={(e) => setFormData((prev) => ({ ...prev, governorate: e.target.value }))}
                options={governorateOptions}
                required
              />
            </div>

            <Textarea
              id="seller-address"
              label={t('seller.addressLabel')}
              value={formData.address}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              rows={3}
              placeholder={t('seller.addressPlaceholder')}
            />
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="profile-name"
                label={t('info.fullName', 'الاسم الكامل')}
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />

              <Input
                id="profile-phone"
                type="tel"
                label={t('info.phone', 'رقم الهاتف')}
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="010XXXXXXXX"
                dir="ltr"
                className="[unicode-bidi:isolate] text-start"
                required={isPhoneRequired}
              />
            </div>

            {isCustomer ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id="profile-email"
                    type="email"
                    label={t('info.email', 'البريد الإلكتروني')}
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    dir="ltr"
                    className="[unicode-bidi:isolate] text-start"
                    required
                  />

                  <Input
                    id="profile-nursery"
                    label={t('info.nurseryName', 'اسم الحضانة أو الروضة')}
                    value={formData.nurseryName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nurseryName: e.target.value }))}
                    placeholder={t('info.nurseryPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    id="profile-governorate"
                    label={t('info.governorate', 'المحافظة')}
                    value={formData.governorate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, governorate: e.target.value }))}
                    options={governorateOptions}
                    required
                  />

                  <Input
                    id="profile-city"
                    label={t('info.city', 'المدينة أو المركز')}
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder={t('info.cityPlaceholder')}
                  />
                </div>

                <Textarea
                  id="profile-address"
                  label={t('info.address', 'العنوان بالتفصيل')}
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder={t('info.addressPlaceholder')}
                  rows={3}
                />
              </>
            ) : (
              <div>
                <Input
                  id="profile-email"
                  type="email"
                  label={t('info.email', 'البريد الإلكتروني')}
                  value={formData.email}
                  disabled
                  readOnly
                  dir="ltr"
                  className="[unicode-bidi:isolate] text-start"
                  helperText={emailHelperText || t('info.emailReadOnlyHelper')}
                />
              </div>
            )}
          </>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            size="md"
            loading={saving}
            startIcon={<Save className="w-4 h-4" />}
          >
            {resolvedSubmitLabel}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default PersonalInfoForm
