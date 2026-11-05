import { AlertCircle, Building2, CheckCircle2, Phone, User } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { contactService } from '../../services/contactService'

/**
 * نافذة منبثقة لطلب تفصيل وتجهيز وسائل تعليمية بكميات للحضانات والروضات
 */
export function NurseryOrderModal({ isOpen, onClose }) {
  const { t } = useTranslation('storefront')

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nurseryName: '',
    details: '',
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const nextErrors = {}
    if (!formData.name.trim()) {
      nextErrors.name = 'يرجى إدخال اسم المشرفة أو المعلمة'
    }

    // التحقق من رقم الهاتف المصري 01xxxxxxxxx
    const phoneRegex = /^01[0125][0-9]{8}$/
    if (!formData.phone.trim()) {
      nextErrors.phone = 'يرجى إدخال رقم الهاتف للتواصل'
    } else if (!phoneRegex.test(formData.phone.trim())) {
      nextErrors.phone = 'رقم الهاتف غير صالح، يجب أن يبدأ بـ 01 ويتكون من 11 رقماً'
    }

    if (!formData.details.trim()) {
      nextErrors.details = 'يرجى كتابة تفاصيل الوسائل والكميات المطلوبة'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await contactService.sendCustomRequest({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        nurseryName: formData.nurseryName.trim(),
        details: formData.details.trim(),
      })

      toast.success(t('home.nurseryBanner.successToast'), {
        duration: 4000,
        position: 'top-center',
      })

      // إعادة ضبط النموذج والإغلاق
      setFormData({ name: '', phone: '', nurseryName: '', details: '' })
      onClose()
    } catch {
      toast.error('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('home.nurseryBanner.modalTitle')}
      description={t('home.nurseryBanner.modalDesc')}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* اسم المعلمة أو المشرفة */}
        <Input
          label={t('home.nurseryBanner.nameLabel')}
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder={t('home.nurseryBanner.namePlaceholder')}
          error={errors.name}
          startIcon={<User className="w-5 h-5" />}
          required
        />

        {/* رقم الهاتف للتواصل */}
        <div>
          <label className="block text-xs font-bold text-text-muted mb-2 text-start">
            {t('home.nurseryBanner.phoneLabel')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none text-text-muted">
              <Phone className="w-5 h-5" />
            </div>
            <input
              type="tel"
              name="phone"
              dir="ltr"
              value={formData.phone}
              onChange={handleChange}
              placeholder="01XXXXXXXXX"
              className={`w-full h-[52px] rounded-[16px] ps-12 pe-4 bg-surface text-text-main border text-start font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-orange ${
                errors.phone ? 'border-rose-500' : 'border-surface-border'
              }`}
            />
          </div>
          {errors.phone && (
            <p className="mt-1.5 text-xs text-rose-500 font-medium flex items-center gap-1 text-start">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.phone}</span>
            </p>
          )}
        </div>

        {/* اسم الروضة أو الحضانة */}
        <Input
          label={t('home.nurseryBanner.nurseryNameLabel')}
          name="nurseryName"
          value={formData.nurseryName}
          onChange={handleChange}
          placeholder={t('home.nurseryBanner.nurseryNamePlaceholder')}
          startIcon={<Building2 className="w-5 h-5" />}
        />

        {/* تفاصيل الوسائل والكميات */}
        <Textarea
          label={t('home.nurseryBanner.detailsLabel')}
          name="details"
          value={formData.details}
          onChange={handleChange}
          placeholder={t('home.nurseryBanner.detailsPlaceholder')}
          error={errors.details}
          rows={3}
          required
        />

        {/* أزرار الإجراءات */}
        <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="px-6"
            startIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isSubmitting ? t('home.nurseryBanner.submitting') : t('home.nurseryBanner.submitButton')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
