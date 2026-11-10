import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Modal } from '../../../components/ui/Modal'
import { cn } from '../../../utils'

// ألوان مقترحة بهوية المنصة التربوية
const PRESET_COLORS = [
  '#4DB6FF', // أزرق سماوي
  '#FF8A3D', // برتقالي أيدي صغيرة
  '#FF7EB6', // وردي ناعم
  '#44BE8E', // أخضر نعناعي
  '#FFD23F', // أصفر دافئ
  '#9C27B0', // بنفسجي هادئ
  '#FF5722', // قرميدي دافئ
  '#00BCD4', // فيروزي
]

/**
 * نافذة منبثقة لتعديل بيانات التصنيف التعليمي المحدد
 */
export function CategoryEditModal({
  isOpen,
  onClose,
  category,
  onSave,
  isSaving = false,
}) {
  const { t } = useTranslation('admin-manage')

  const [form, setForm] = useState({
    name: '',
    nameEn: '',
    color: '#FF8A3D',
  })

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        nameEn: category.nameEn || '',
        color: category.color || '#FF8A3D',
      })
    }
  }, [category])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      name: form.name.trim(),
      nameEn: form.nameEn.trim(),
      color: form.color,
    })
  }

  if (!category) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('categories.editModalTitle')}
      description={t('categories.editModalDescription')}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        {/* الاسم بالعربية */}
        <Input
          label={t('categories.table.nameAr')}
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />

        {/* الاسم بالإنجليزية */}
        <Input
          label={t('categories.table.nameEn')}
          value={form.nameEn}
          onChange={(e) => setForm((prev) => ({ ...prev, nameEn: e.target.value }))}
          placeholder={t('categories.nameEnPlaceholder')}
          dir="ltr"
        />

        {/* المعرف الثابت للقراءة فقط */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-text-muted">
            {t('categories.table.slug')}
          </label>
          <div
            dir="ltr"
            style={{ unicodeBidi: 'isolate' }}
            className="w-full h-[52px] px-4 rounded-[16px] bg-surface-subtle border border-surface-border text-text-muted font-mono text-sm flex items-center select-none"
          >
            {category.slug || category.id}
          </div>
        </div>

        {/* اختيار اللون المميز */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-text-main">
            {t('categories.colorLabel')}
          </label>

          <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-[16px] bg-surface-subtle border border-surface-border">
            {PRESET_COLORS.map((clr) => {
              const isSelected = form.color.toLowerCase() === clr.toLowerCase()
              return (
                <button
                  key={clr}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color: clr }))}
                  style={{ backgroundColor: clr }}
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    isSelected && 'ring-2 ring-offset-2 ring-brand-orange scale-105 shadow-soft'
                  )}
                  aria-label={t('categories.selectColorAria', { color: clr })}
                >
                  {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              )
            })}

            {/* إدخال كود لون مخصص */}
            <div className="flex items-center gap-2 ms-auto">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                aria-label={t('categories.customColorPickerAria')}
              />
              <span
                dir="ltr"
                style={{ unicodeBidi: 'isolate' }}
                className="text-xs font-mono font-bold text-text-muted"
              >
                {form.color.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* أزرار الإجراء */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('categories.cancel')}
          </Button>
          <Button type="submit" loading={isSaving}>
            {t('categories.saveChanges')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
