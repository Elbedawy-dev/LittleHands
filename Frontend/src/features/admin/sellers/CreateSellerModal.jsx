import { AlertCircle, CheckCircle2, KeyRound, Mail, Phone, ShieldAlert, User } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { CopyButton } from '../../../components/ui/CopyButton'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { adminService } from '../../../services/adminService'

/**
 * نافذة إنشاء حساب بائعة حرفية جديدة وتوليد بيانات الدخول المؤقتة
 */
export function CreateSellerModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation('admin-core')

  const [step, setStep] = useState('form') // 'form' | 'success'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [errors, setErrors] = useState({})
  const [formAlert, setFormAlert] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // بيانات البائعة وكلمة المرور المؤقتة (تُمسح تماماً عند إغلاق النافذة)
  const [createdSeller, setCreatedSeller] = useState(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')

  const handleClose = () => {
    // تصفير آمن لكلمة المرور والبيانات لضمان عدم حفظها في الذاكرة بعد الإغلاق
    setStep('form')
    setFormData({ name: '', email: '', phone: '' })
    setErrors({})
    setFormAlert('')
    setCreatedSeller(null)
    setTemporaryPassword('')
    onClose()
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
    if (formAlert) {
      setFormAlert('')
    }
  }

  const validateForm = () => {
    const newErrors = {}
    const trimmedName = formData.name.trim()
    const trimmedEmail = formData.email.trim()
    const trimmedPhone = formData.phone.trim()

    if (!trimmedName) {
      newErrors.name = t('sellers.createAccount.errors.nameRequired')
    }

    if (!trimmedEmail) {
      newErrors.email = t('sellers.createAccount.errors.emailRequired')
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        newErrors.email = t('sellers.createAccount.errors.emailInvalid')
      }
    }

    if (!trimmedPhone) {
      newErrors.phone = t('sellers.createAccount.errors.phoneRequired')
    } else {
      // رقم هاتف مصري معتمد: 01[0125] متبوعاً بـ 8 أرقام (11 خانة)
      const egyptianPhoneRegex = /^01[0125]\d{8}$/
      if (!egyptianPhoneRegex.test(trimmedPhone)) {
        newErrors.phone = t('sellers.createAccount.errors.phoneInvalid')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormAlert('')

    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const result = await adminService.createSellerAccount({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      })

      setCreatedSeller(result.seller)
      setTemporaryPassword(result.temporaryPassword)
      setStep('success')

      if (onSuccess) {
        await onSuccess(result.seller)
      }
    } catch (err) {
      if (err.code === 'EMAIL_TAKEN') {
        setErrors((prev) => ({
          ...prev,
          email: t('sellers.createAccount.errors.emailTaken'),
        }))
      } else if (err.code === 'PHONE_TAKEN') {
        setErrors((prev) => ({
          ...prev,
          phone: t('sellers.createAccount.errors.phoneTaken'),
        }))
      } else if (err.code === 'VALIDATION_ERROR') {
        setFormAlert(t('sellers.createAccount.errors.generic'))
      } else {
        setFormAlert(err.message || t('sellers.createAccount.errors.generic'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordCopied = () => {
    toast.success(t('sellers.createAccount.passwordCopiedToast'))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'form' ? t('sellers.createAccount.modalTitle') : null}
      maxWidth="max-w-lg"
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit} noValidate>
          {formAlert && (
            <div className="mb-5 p-3.5 rounded-[16px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formAlert}</span>
            </div>
          )}

          {/* الاسم الكامل */}
          <Input
            id="seller-create-name"
            label={t('sellers.createAccount.fields.name')}
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('sellers.createAccount.fields.namePlaceholder')}
            error={errors.name}
            required
            disabled={isSubmitting}
            startIcon={<User className="w-4 h-4 text-text-muted" />}
          />

          {/* البريد الإلكتروني */}
          <Input
            id="seller-create-email"
            type="email"
            dir="ltr"
            label={t('sellers.createAccount.fields.email')}
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={t('sellers.createAccount.fields.emailPlaceholder')}
            error={errors.email}
            required
            disabled={isSubmitting}
            startIcon={<Mail className="w-4 h-4 text-text-muted" />}
          />

          {/* رقم الهاتف المصري */}
          <Input
            id="seller-create-phone"
            type="tel"
            dir="ltr"
            label={t('sellers.createAccount.fields.phone')}
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('sellers.createAccount.fields.phonePlaceholder')}
            error={errors.phone}
            required
            disabled={isSubmitting}
            startIcon={<Phone className="w-4 h-4 text-text-muted" />}
          />

          {/* نص إرشادي بخصوص كلمة المرور المؤقتة */}
          <div className="mb-6 p-3 rounded-[16px] bg-surface-subtle border border-surface-border flex items-start gap-2.5 text-xs text-text-muted">
            <KeyRound className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t('sellers.createAccount.helperNotice')}</p>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="whitespace-nowrap"
            >
              {t('sellers.createAccount.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="whitespace-nowrap"
            >
              {t('sellers.createAccount.submit')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6 pt-2">
          {/* ترويسة خطوة النجاح */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-soft">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-black text-xl text-text-main">
              {t('sellers.createAccount.successTitle')}
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
              {t('sellers.createAccount.successDescription')}
            </p>
          </div>

          {/* بيانات الحساب المولد */}
          <div className="p-4 rounded-[16px] bg-surface-subtle border border-surface-border space-y-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted text-xs font-semibold">
                {t('sellers.createAccount.sellerName')}:
              </span>
              <span className="font-bold text-text-main truncate">
                {createdSeller?.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-muted text-xs font-semibold">
                {t('sellers.createAccount.sellerEmail')}:
              </span>
              <span dir="ltr" className="font-mono text-xs font-bold text-text-main">
                {createdSeller?.email}
              </span>
            </div>
          </div>

          {/* صندوق إبراز كلمة المرور المؤقتة */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-text-muted block">
              {t('sellers.createAccount.temporaryPassword')}
            </span>
            <div className="p-4 rounded-[16px] bg-brand-orange/10 dark:bg-brand-orange/20 border-2 border-dashed border-brand-orange/50 flex items-center justify-between gap-3">
              <span
                dir="ltr"
                className="font-mono font-black text-xl tracking-wider text-brand-orange-text dark:text-brand-orange select-all"
              >
                {temporaryPassword}
              </span>
              <CopyButton
                text={temporaryPassword}
                label={t('sellers.createAccount.copy')}
                copiedLabel={t('sellers.createAccount.copied')}
                onCopy={handlePasswordCopied}
                size="md"
              />
            </div>
          </div>

          {/* تحذير واضح: انسخي كلمة المرور الآن، لن تظهر مرة أخرى */}
          <div className="p-3.5 rounded-[16px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">
              {t('sellers.createAccount.warning')}
            </p>
          </div>

          {/* زر الإغلاق والإنهاء */}
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleClose}
              className="w-full whitespace-nowrap"
            >
              {t('sellers.createAccount.done')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
