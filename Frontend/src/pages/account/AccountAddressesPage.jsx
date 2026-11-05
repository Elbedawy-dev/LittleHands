import {
  Check,
  Edit2,
  MapPin,
  Phone,
  Plus,
  School,
  Trash2,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Checkbox } from '../../components/ui/Checkbox'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { Skeleton } from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/Textarea'
import { GOVERNORATES, getGovernorateName } from '../../config/constants'
import { useFormat } from '../../hooks/useFormat'
import { userService } from '../../services/userService'

export default function AccountAddressesPage() {
  const { t, i18n } = useTranslation('profile')
  const isEn = i18n.language === 'en'
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const { formatNumber } = useFormat()

  // حالة النافذة المنبثقة للإضافة والتعديل
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nurseryName: '',
    governorate: 'القاهرة',
    city: '',
    address: '',
    isDefault: false,
  })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // حالة نافذة تأكيد الحذف
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [targetDeleteId, setTargetDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const governorateOptions = GOVERNORATES.map((g) => ({
    value: g.name,
    label: isEn
      ? `${g.nameEn || g.name} (Shipping EGP ${g.shippingRate})`
      : `${g.name} (الشحن ${g.shippingRate} ج.م)`,
  }))

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const data = await userService.getAddresses()
      setAddresses(data || [])
    } catch (err) {
      console.warn('Failed to load addresses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  // فتح نافذة الإضافة
  const handleOpenAdd = () => {
    setEditingAddress(null)
    setFormData({
      name: '',
      phone: '',
      nurseryName: '',
      governorate: 'القاهرة',
      city: '',
      address: '',
      isDefault: addresses.length === 0,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  // فتح نافذة التعديل
  const handleOpenEdit = (addr) => {
    setEditingAddress(addr)
    setFormData({
      id: addr.id,
      name: addr.name || '',
      phone: addr.phone || '',
      nurseryName: addr.nurseryName || '',
      governorate: addr.governorate || 'القاهرة',
      city: addr.city || '',
      address: addr.address || '',
      isDefault: !!addr.isDefault,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  // التحقق من صحة النموذج
  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim()) {
      errors.name = isEn ? 'Please enter the recipient name' : 'يرجى إدخال اسم المسؤولة عن الاستلام'
    }

    const cleanPhone = formData.phone.trim()
    if (!cleanPhone) {
      errors.phone = isEn ? 'Please enter contact phone number' : 'يرجى إدخال رقم هاتف التواصل'
    } else if (!/^01[0-2,5]{1}[0-9]{8}$/.test(cleanPhone)) {
      errors.phone = isEn ? 'Phone number must start with 01 and contain 11 digits' : 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقماً'
    }

    if (!formData.address.trim()) {
      errors.address = isEn ? 'Please write the detailed address' : 'يرجى كتابة العنوان التفصيلي'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // حفظ العنوان (إضافة أو تعديل)
  const handleSaveAddress = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setSaving(true)
    try {
      await userService.saveAddress({
        ...formData,
        id: editingAddress?.id,
      })
      setModalOpen(false)
      await fetchAddresses()
    } catch (err) {
      console.error('Failed to save address:', err)
    } finally {
      setSaving(false)
    }
  }

  // بدء طلب الحذف
  const handleRequestDelete = (id) => {
    setTargetDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  // تأكيد الحذف
  const handleConfirmDelete = async () => {
    if (!targetDeleteId) return
    setDeleting(true)
    try {
      await userService.deleteAddress(targetDeleteId)
      setDeleteConfirmOpen(false)
      setTargetDeleteId(null)
      await fetchAddresses()
    } catch (err) {
      console.error('Failed to delete address:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-44 rounded-[24px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* الترويسة وزر الإضافة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-black text-text-main">
            {t('addresses.title', 'عناوين التوصيل للحضانة')} ({formatNumber(addresses.length)})
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {t('addresses.subtitle', 'إدارة مقار الحضانات والفصول لتسهيل الشحن السريع')}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenAdd}
          size="md"
          startIcon={<Plus className="w-4 h-4" />}
          className="self-start sm:self-auto shadow-soft"
        >
          {t('addresses.addBtn', 'إضافة عنوان جديد')}
        </Button>
      </div>

      {/* قائمة العناوين */}
      {addresses.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title={t('addresses.emptyTitle', 'لا توجد عناوين مسجلة')}
            description={t('addresses.emptyDesc', 'أضيفي عنوان الحضانة أو مقر الفصول لتسريع عمليات الشحن القادمة.')}
            icon={<MapPin className="w-10 h-10 text-brand-orange/40" />}
            action={
              <Button type="button" onClick={handleOpenAdd} size="sm">
                {isEn ? 'Add First Address' : 'إضافة العنوان الأول'}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              padding="lg"
              className="relative flex flex-col justify-between gap-4 border border-surface-border hover:border-brand-orange/40 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-black text-base text-text-main">
                      {addr.name}
                    </h3>
                    {addr.isDefault && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-orange text-white">
                        {t('addresses.defaultBadge', 'افتراضي')}
                      </span>
                    )}
                  </div>
                </div>

                {addr.nurseryName && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-orange-text dark:text-brand-orange">
                    <School className="w-3.5 h-3.5" />
                    <span>{addr.nurseryName}</span>
                  </div>
                )}

                <div className="text-xs text-text-muted space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    <span className="font-mono text-text-main" dir="ltr">{addr.phone}</span>
                  </div>

                  <div className="flex items-start gap-1.5 leading-relaxed pt-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0 mt-0.5" />
                    <span className="text-text-main font-medium">
                      {getGovernorateName(addr.governorate, i18n.language)} — {addr.city ? `${addr.city} — ` : ''}{addr.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* أزرار التعديل والحذف */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(addr)}
                  className="px-3 py-1.5 rounded-full border border-surface-border hover:bg-surface-subtle text-xs font-bold text-text-main flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-text-muted" />
                  <span>{t('addresses.editBtn', 'تعديل')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestDelete(addr.id)}
                  className="px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('addresses.deleteBtn', 'حذف')}</span>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* نافذة منبثقة لإضافة / تعديل العنوان (Modal) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAddress ? t('addresses.modalEditTitle', 'تعديل عنوان الحضانة') : t('addresses.modalAddTitle', 'إضافة عنوان حضانة جديد')}
        description={isEn ? 'Enter delivery details to determine shipping rate and direct dispatch.' : 'أدخلي بيانات الاستلام لتحديد تسعيرة الشحن وتوجيه مندوب التوصيل.'}
      >
        <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
          <Input
            id="addr-name"
            label={`${t('addresses.nameLabel', 'اسم المسؤولة عن الاستلام')} *`}
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value })
              if (formErrors.name) setFormErrors({ ...formErrors, name: null })
            }}
            placeholder={isEn ? 'Full recipient name' : 'اسم المستلمة الكامل'}
            error={formErrors.name}
            startIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            id="addr-phone"
            type="tel"
            label={`${t('addresses.phoneLabel', 'رقم الهاتف للتواصل')} *`}
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value })
              if (formErrors.phone) setFormErrors({ ...formErrors, phone: null })
            }}
            placeholder="010XXXXXXXX"
            error={formErrors.phone}
            startIcon={<Phone className="w-4 h-4" />}
            dir="ltr"
            className="[unicode-bidi:isolate] text-start"
            required
          />

          <Input
            id="addr-nursery"
            label={t('addresses.nurseryLabel', 'اسم الحضانة أو المدرسة')}
            value={formData.nurseryName}
            onChange={(e) => setFormData({ ...formData, nurseryName: e.target.value })}
            placeholder={isEn ? 'e.g. Al-Eman Preschool' : 'مثال: حضانة براعم الإيمان'}
            startIcon={<School className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="addr-gov"
              label={`${t('addresses.govLabel', 'المحافظة')} *`}
              value={formData.governorate}
              onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
              options={governorateOptions}
              required
            />

            <Input
              id="addr-city"
              label={t('addresses.cityLabel', 'المدينة أو المركز')}
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder={isEn ? 'e.g. Nasr City' : 'مثال: مدينة نصر'}
            />
          </div>

          <Textarea
            id="addr-details"
            label={`${t('addresses.addressDetailsLabel', 'العنوان التفصيلي (الشارع، رقم المبنى، علامة مميزة)')} *`}
            value={formData.address}
            onChange={(e) => {
              setFormData({ ...formData, address: e.target.value })
              if (formErrors.address) setFormErrors({ ...formErrors, address: null })
            }}
            placeholder={isEn ? 'Street, building number, floor, landmark' : 'الشارع، رقم المبنى، الدور، علامة مميزة لتسهيل الوصول'}
            error={formErrors.address}
            rows={3}
            required
          />

          <Checkbox
            id="addr-default"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            label={t('addresses.isDefaultCheckbox', 'تعيين كعنوان افتراضي لطلبات الوسائل')}
          />

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setModalOpen(false)}
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </Button>
            <Button
              type="submit"
              size="md"
              loading={saving}
              startIcon={<Check className="w-4 h-4" />}
            >
              {editingAddress ? (isEn ? 'Save Changes' : 'حفظ التعديلات') : t('addresses.saveAddressBtn', 'حفظ العنوان')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* نافذة تأكيد الحذف */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('addresses.deleteConfirmTitle', 'تأكيد حذف العنوان')}
        message={t('addresses.deleteConfirmDesc', 'هل أنتِ متأكدة من رغبتك في حذف هذا العنوان من قائمة العناوين المحفوظة؟')}
        confirmText={isEn ? 'Yes, delete address' : 'نعم، حذف العنوان'}
        cancelText={isEn ? 'Cancel' : 'تراجع'}
        danger
        loading={deleting}
      />
    </div>
  )
}
