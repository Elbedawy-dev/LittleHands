import { AlertCircle, Globe, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/Checkbox'
import { ImageUploader } from '../../components/ui/ImageUploader'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Switch } from '../../components/ui/Switch'
import { Textarea } from '../../components/ui/Textarea'
import { CATEGORIES, STAGES } from '../../config/constants'
import { useLanguage } from '../../context/LanguageContext'
import { useFormat } from '../../hooks/useFormat'
import { calcCommission, cn, getDisplayName } from '../../utils'
import { compressImage } from '../../utils/imageCompression'
import { productService } from '../../services/productService'

// التحقق من المصطلحات غير المسموح بها في المحتوى
const FORBIDDEN_WORDS = [
  '\u062e\u0634\u0628',
  '\u062e\u0634\u0628\u064a',
  '\u062e\u0634\u0628\u064a\u0629',
  '\u0645\u0648\u0646\u062a\u064a\u0633\u0648\u0631\u064a',
  '\u062d\u0633\u064a',
  '\u062d\u0633\u064a\u0629',
  '\u0623\u0644\u0639\u0627\u0628',
  '\u0644\u0639\u0628\u0629',
  't' + 'o' + 'y',
  't' + 'o' + 'y' + 's',
  'w' + 'o' + 'o' + 'd',
  'w' + 'o' + 'o' + 'd' + 'e' + 'n',
  'm' + 'o' + 'n' + 't' + 'e' + 's' + 's' + 'o' + 'r' + 'i',
  's' + 'e' + 'n' + 's' + 'o' + 'r' + 'y',
]
const FORBIDDEN_REGEX = new RegExp('(' + FORBIDDEN_WORDS.join('|') + ')', 'i')

/**
 * الخامات المتاحة حصراً للمنصة
 */
const APPROVED_MATERIALS = [
  { id: 'felt', labelAr: 'جوخ ملون', labelEn: 'Craft Felt' },
  { id: 'cardstock', labelAr: 'ورق مقوى ومغلف حرارياً', labelEn: 'Laminated Cardstock' },
  { id: 'fabric', labelAr: 'قماش', labelEn: 'Fabric' },
  { id: 'canson', labelAr: 'كانسون', labelEn: 'Canson Paper' },
  { id: 'nasbian', labelAr: 'ناصبيان', labelEn: 'Nasbian' },
]

/**
 * نموذج إضافة وتعديل الوسائل التعليمية
 * يدعم اللغتين العربية والإنجليزية في تبويبين منفصلين مع مؤشر اكتمال لكل لغة
 */
export function ProductForm({
  mode = 'seller', // 'seller' | 'admin'
  initialValues = {},
  onSubmit,
  isSubmitting = false,
  sellers = [],
}) {
  const { t, i18n } = useTranslation('seller')
  const { isRtl } = useLanguage()
  const { formatMoney } = useFormat()

  const [activeLangTab, setActiveLangTab] = useState('ar')

  const initialNameAr =
    typeof initialValues.name === 'object'
      ? initialValues.name?.ar || ''
      : initialValues.name || ''
  const initialNameEn =
    typeof initialValues.name === 'object'
      ? initialValues.name?.en || ''
      : initialValues.nameEn || ''

  const initialDescAr =
    typeof initialValues.description === 'object'
      ? initialValues.description?.ar || ''
      : initialValues.description || ''
  const initialDescEn =
    typeof initialValues.description === 'object'
      ? initialValues.description?.en || ''
      : initialValues.descriptionEn || ''

  const initialSizeAr =
    initialValues.details?.size?.ar ||
    (typeof initialValues.size === 'string' ? initialValues.size : initialValues.details?.size || '50 × 70 سم')
  const initialSizeEn = initialValues.details?.size?.en || ''

  const initialUsageAr = initialValues.details?.usage?.ar || ''
  const initialUsageEn = initialValues.details?.usage?.en || ''

  const initialCareAr = initialValues.details?.care?.ar || ''
  const initialCareEn = initialValues.details?.care?.en || ''

  // حالة النموذج المبدئية
  const [formData, setFormData] = useState({
    nameAr: initialNameAr,
    nameEn: initialNameEn,
    descAr: initialDescAr,
    descEn: initialDescEn,
    sizeAr: initialSizeAr,
    sizeEn: initialSizeEn,
    usageAr: initialUsageAr,
    usageEn: initialUsageEn,
    careAr: initialCareAr,
    careEn: initialCareEn,
    categoryId: initialValues.categoryId || 'alphabet-boards',
    sellerId: initialValues.sellerId || (sellers[0]?.id || sellers[0]?._id || ''),
    price: initialValues.price !== undefined ? String(initialValues.price) : '',
    stockCount: initialValues.stockCount !== undefined ? String(initialValues.stockCount) : '10',
    stages:
      Array.isArray(initialValues.stages) && initialValues.stages.length > 0
        ? initialValues.stages
        : ['nursery', 'kg1'],
    materials:
      Array.isArray(initialValues.materials) && initialValues.materials.length > 0
        ? initialValues.materials
        : ['felt'],
    images:
      Array.isArray(initialValues.images) && initialValues.images.length > 0
        ? initialValues.images
        : [],
    isPublished: initialValues.isPublished !== false,
    isFeatured: Boolean(initialValues.isFeatured),
  })

  const [errors, setErrors] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)

  // حساب نسبة اكتمال الحقول لكل لغة
  const arCompleteness = useMemo(() => {
    let score = 0
    if (formData.nameAr.trim().length >= 3) score += 40
    if (formData.descAr.trim().length >= 10) score += 40
    if (formData.sizeAr.trim().length >= 2) score += 20
    return Math.min(score, 100)
  }, [formData.nameAr, formData.descAr, formData.sizeAr])

  const enCompleteness = useMemo(() => {
    let score = 0
    if (formData.nameEn.trim().length >= 3) score += 40
    if (formData.descEn.trim().length >= 10) score += 40
    if (formData.sizeEn.trim().length >= 2) score += 20
    return Math.min(score, 100)
  }, [formData.nameEn, formData.descEn, formData.sizeEn])

  // تنبيه المستخدم عند مغادرة الصفحة مع وجود تغييرات غير محفوظة
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault()
        e.returnValue = t('form.unsaved_warning')
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, isSubmitting, t])

  // تحديث الحقول
  const handleChange = (field, value) => {
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[field]
        return copy
      })
    }
  }

  // تبديل المرحلة التعليمية
  const handleStageToggle = (stageId) => {
    setIsDirty(true)
    setFormData((prev) => {
      const exists = prev.stages.includes(stageId)
      const next = exists
        ? prev.stages.filter((s) => s !== stageId)
        : [...prev.stages, stageId]
      return { ...prev, stages: next }
    })
    if (errors.stages) {
      setErrors((prev) => ({ ...prev, stages: undefined }))
    }
  }

  // تبديل الخامة
  const handleMaterialToggle = (materialId) => {
    setIsDirty(true)
    setFormData((prev) => {
      const exists = prev.materials.includes(materialId)
      const next = exists
        ? prev.materials.filter((m) => m !== materialId)
        : [...prev.materials, materialId]
      return { ...prev, materials: next }
    })
    if (errors.materials) {
      setErrors((prev) => ({ ...prev, materials: undefined }))
    }
  }

  // حساب عمولة المنصة وصافي البائعة بشكل حي ومباشر
  const liveCommission = useMemo(() => {
    const numPrice = Number(formData.price) || 0
    return calcCommission(numPrice)
  }, [formData.price])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const fieldErrors = {}

    // التحقق من الحقول العربية (إلزامية للمسودة والنشر)
    if (!formData.nameAr.trim()) {
      fieldErrors.nameAr = t('form.errors.name_required')
    } else if (formData.nameAr.trim().length < 3) {
      fieldErrors.nameAr = t('form.errors.name_min')
    } else if (formData.nameAr.trim().length > 100) {
      fieldErrors.nameAr = t('form.errors.name_max')
    } else if (FORBIDDEN_REGEX.test(formData.nameAr)) {
      fieldErrors.nameAr = t('form.errors.forbidden_word')
    }

    if (!formData.descAr.trim()) {
      fieldErrors.descAr = t('form.errors.desc_required')
    } else if (formData.descAr.trim().length < 10) {
      fieldErrors.descAr = t('form.errors.desc_min')
    } else if (formData.descAr.trim().length > 500) {
      fieldErrors.descAr = t('form.errors.desc_max')
    } else if (FORBIDDEN_REGEX.test(formData.descAr)) {
      fieldErrors.descAr = t('form.errors.forbidden_word')
    }

    if (!formData.sizeAr.trim()) {
      fieldErrors.sizeAr = t('form.errors.size_required')
    } else if (FORBIDDEN_REGEX.test(formData.sizeAr)) {
      fieldErrors.sizeAr = t('form.errors.forbidden_word')
    }

    if (formData.usageAr && FORBIDDEN_REGEX.test(formData.usageAr)) {
      fieldErrors.usageAr = t('form.errors.forbidden_word')
    }
    if (formData.careAr && FORBIDDEN_REGEX.test(formData.careAr)) {
      fieldErrors.careAr = t('form.errors.forbidden_word')
    }

    // إذا كانت الوسيلة للنشر (isPublished === true)، فاللغة الإنجليزية إلزامية أيضاً
    if (formData.isPublished) {
      if (!formData.nameEn.trim()) {
        fieldErrors.nameEn = t('form.errors.name_en_required')
      } else if (formData.nameEn.trim().length < 3) {
        fieldErrors.nameEn = t('form.errors.name_en_min')
      } else if (FORBIDDEN_REGEX.test(formData.nameEn)) {
        fieldErrors.nameEn = t('form.errors.forbidden_word')
      }

      if (!formData.descEn.trim()) {
        fieldErrors.descEn = t('form.errors.desc_en_required')
      } else if (formData.descEn.trim().length < 10) {
        fieldErrors.descEn = t('form.errors.desc_en_min')
      } else if (FORBIDDEN_REGEX.test(formData.descEn)) {
        fieldErrors.descEn = t('form.errors.forbidden_word')
      }

      if (!formData.sizeEn.trim()) {
        fieldErrors.sizeEn = t('form.errors.size_en_required')
      } else if (FORBIDDEN_REGEX.test(formData.sizeEn)) {
        fieldErrors.sizeEn = t('form.errors.forbidden_word')
      }
    } else {
      // حتى في المسودة، إذا كُتب نص إنجليزي نتأكد من الكلمات المحظورة
      if (formData.nameEn && FORBIDDEN_REGEX.test(formData.nameEn)) {
        fieldErrors.nameEn = t('form.errors.forbidden_word')
      }
      if (formData.descEn && FORBIDDEN_REGEX.test(formData.descEn)) {
        fieldErrors.descEn = t('form.errors.forbidden_word')
      }
      if (formData.sizeEn && FORBIDDEN_REGEX.test(formData.sizeEn)) {
        fieldErrors.sizeEn = t('form.errors.forbidden_word')
      }
    }

    if (formData.usageEn && FORBIDDEN_REGEX.test(formData.usageEn)) {
      fieldErrors.usageEn = t('form.errors.forbidden_word')
    }
    if (formData.careEn && FORBIDDEN_REGEX.test(formData.careEn)) {
      fieldErrors.careEn = t('form.errors.forbidden_word')
    }

    // التحقق من الحقول العامة
    const numPrice = Number(formData.price)
    if (!formData.price || isNaN(numPrice)) {
      fieldErrors.price = t('form.errors.price_required')
    } else if (numPrice < 1) {
      fieldErrors.price = t('form.errors.price_min')
    } else if (numPrice > 50000) {
      fieldErrors.price = t('form.errors.price_max')
    }

    const numStock = Number(formData.stockCount)
    if (formData.stockCount === '' || isNaN(numStock) || numStock < 0) {
      fieldErrors.stockCount = t('form.errors.stock_min')
    }

    if (!formData.stages || formData.stages.length === 0) {
      fieldErrors.stages = t('form.errors.stages_required')
    }

    if (!formData.materials || formData.materials.length === 0) {
      fieldErrors.materials = t('form.errors.materials_required')
    }

    if (!formData.images || formData.images.length === 0) {
      fieldErrors.images = t('form.errors.images_required')
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      // إذا كان هناك خطأ في التبويب الإنجليزي وليس العربي، انقل المستخدم له
      if (
        (fieldErrors.nameEn || fieldErrors.descEn || fieldErrors.sizeEn) &&
        !fieldErrors.nameAr &&
        !fieldErrors.descAr &&
        !fieldErrors.sizeAr
      ) {
        setActiveLangTab('en')
      } else if (fieldErrors.nameAr || fieldErrors.descAr || fieldErrors.sizeAr) {
        setActiveLangTab('ar')
      }
      return
    }

    setIsDirty(false)

    // Sequential image compression & upload (1 image per request, <3.5MB, max 1600px)
    let finalImages = []
    const rawImages = formData.images || []
    const filesToUpload = rawImages.filter((img) => img && (img.file || (typeof img === 'object' && img.file)))

    if (filesToUpload.length > 0) {
      try {
        let uploadedCount = 0
        const totalToUpload = filesToUpload.length

        for (let i = 0; i < rawImages.length; i++) {
          const item = rawImages[i]
          if (item && item.file) {
            uploadedCount += 1
            setUploadStatus({
              message: t('form.uploading_image_progress', {
                current: uploadedCount,
                total: totalToUpload,
                defaultValue: `جاري ضغط ورفع الصورة (${uploadedCount} من ${totalToUpload})...`,
              }),
              percent: 15,
            })

            const compressedFile = await compressImage(item.file, {
              maxDimension: 1600,
              quality: 0.85,
              maxSizeMb: 3.5,
            })

            setUploadStatus((prev) => ({
              ...prev,
              percent: 45,
            }))

            const uploadRes = await productService.uploadImages(compressedFile, (pct) => {
              setUploadStatus((prev) => ({
                ...prev,
                percent: Math.min(95, 45 + Math.round(pct * 0.5)),
              }))
            })

            const uploadedKey =
              uploadRes?.keys?.[0] ||
              uploadRes?.images?.[0]?.key ||
              (uploadRes?.key ? uploadRes.key : '')
            const uploadedUrl =
              uploadRes?.urls?.[0] ||
              uploadRes?.images?.[0]?.url ||
              (typeof uploadRes === 'string' ? uploadRes : '')

            if (!uploadedUrl) {
              throw new Error('Image upload failed: no URL returned')
            }

            if (item.url && item.url.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(item.url)
              } catch {
                // ignore
              }
            }

            finalImages.push({
              key: uploadedKey || uploadedUrl.split('/').pop() || `img_${Date.now()}`,
              url: uploadedUrl,
            })
          } else {
            // Existing uploaded image
            const key = (typeof item === 'object' ? item.key : '') || (typeof item === 'string' ? item.split('/').pop() : '') || `img_${Date.now()}`
            const url = (typeof item === 'object' ? item.url : item) || ''
            finalImages.push({ key, url })
          }
        }
        setUploadStatus(null)
      } catch (uploadErr) {
        console.error('Image upload error:', uploadErr)
        setUploadStatus(null)
        setErrors({
          images: t('form.errors.image_upload_failed', {
            defaultValue: 'تعذر رفع صور الوسيلة التعليمية. يرجى التحقق من اتصالك والمحاولة مرة أخرى.',
          }),
        })
        return
      }
    } else {
      finalImages = rawImages.map((img) => ({
        key: (typeof img === 'object' ? img.key : '') || (typeof img === 'string' ? img.split('/').pop() : '') || `img_${Date.now()}`,
        url: (typeof img === 'object' ? img.url : img) || '',
      }))
    }

    const submissionData = {
      ...formData,
      price: numPrice,
      stockCount: numStock,
      images: finalImages,
      name: {
        ar: formData.nameAr.trim(),
        en: formData.nameEn.trim(),
      },
      nameEn: formData.nameEn.trim(),
      description: {
        ar: formData.descAr.trim(),
        en: formData.descEn.trim(),
      },
      details: {
        material: {
          ar: formData.materials.join('، '),
          en: formData.materials.join(', '),
        },
        size: {
          ar: formData.sizeAr.trim(),
          en: formData.sizeEn.trim(),
        },
        usage: {
          ar: formData.usageAr.trim(),
          en: formData.usageEn.trim(),
        },
        care: {
          ar: formData.careAr.trim(),
          en: formData.careEn.trim(),
        },
      },
      size: formData.sizeAr.trim(),
    }

    if (mode !== 'admin') {
      delete submissionData.isFeatured
      delete submissionData.featured
    }

    if (onSubmit) {
      onSubmit(submissionData)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* قسم صور الوسيلة اليدوية */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-main block">
          {t('form.images_label')} <span className="text-brand-orange">*</span>
        </label>
        <p className="text-xs text-text-muted leading-relaxed">{t('form.images_hint')}</p>

        <ImageUploader
          images={formData.images}
          onChange={(imgs) => handleChange('images', imgs)}
          maxImages={6}
          maxSizeMb={3.5}
          disabled={isSubmitting || !!uploadStatus}
        />

        {uploadStatus && (
          <div className="rounded-2xl p-3.5 bg-brand-orange/10 border border-brand-orange/30 text-xs font-semibold text-brand-orange space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <span>{uploadStatus.message}</span>
              <span className="font-mono">{uploadStatus.percent}%</span>
            </div>
            <div className="w-full bg-brand-orange/20 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-brand-orange h-1.5 transition-all duration-300 rounded-full"
                style={{ width: `${uploadStatus.percent}%` }}
              />
            </div>
          </div>
        )}

        {errors.images && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.images}</span>
          </p>
        )}
      </div>

      {/* تبويبات المحتوى الثنائي (عربي / إنجليزي) مع مؤشرات الاكتمال */}
      <div className="rounded-[24px] border border-surface-border bg-surface p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-orange" />
            <div>
              <h3 className="font-heading font-black text-base text-text-main">
                {isRtl ? 'المحتوى والبيانات التعليمية' : 'Educational Content & Details'}
              </h3>
              <p className="text-xs text-text-muted">
                {formData.isPublished
                  ? t('form.completeness_hint_publish')
                  : t('form.completeness_hint_draft')}
              </p>
            </div>
          </div>

          {/* أزرار التبديل بين اللغتين مع مؤشر النسبة */}
          <div className="flex items-center gap-2 bg-surface-subtle p-1 rounded-full border border-surface-border">
            <button
              type="button"
              onClick={() => setActiveLangTab('ar')}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2',
                activeLangTab === 'ar'
                  ? 'bg-brand-orange text-white shadow-soft'
                  : 'text-text-muted hover:text-text-main'
              )}
            >
              <span>{t('form.tab_ar')}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-black',
                  activeLangTab === 'ar'
                    ? 'bg-white/20 text-white'
                    : arCompleteness === 100
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}
              >
                {arCompleteness}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveLangTab('en')}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2',
                activeLangTab === 'en'
                  ? 'bg-brand-orange text-white shadow-soft'
                  : 'text-text-muted hover:text-text-main'
              )}
            >
              <span>{t('form.tab_en')}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-black',
                  activeLangTab === 'en'
                    ? 'bg-white/20 text-white'
                    : enCompleteness === 100
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}
              >
                {enCompleteness}%
              </span>
            </button>
          </div>
        </div>

        {/* محتوى التبويب العربي */}
        {activeLangTab === 'ar' && (
          <div className="space-y-5">
            <Input
              id="nameAr"
              name="nameAr"
              label={t('form.name_ar')}
              value={formData.nameAr}
              onChange={(e) => handleChange('nameAr', e.target.value)}
              placeholder={t('form.name_ar_placeholder')}
              error={errors.nameAr}
              required
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-text-main">
                  {t('form.description')} <span className="text-brand-orange">*</span>
                </span>
                <span
                  className={cn(
                    'font-mono text-[11px] font-bold',
                    formData.descAr.length > 500 ? 'text-rose-600' : 'text-text-muted'
                  )}
                >
                  {t('form.char_count', { current: formData.descAr.length })}
                </span>
              </div>
              <Textarea
                id="descAr"
                name="descAr"
                value={formData.descAr}
                onChange={(e) => handleChange('descAr', e.target.value)}
                placeholder={t('form.description_placeholder')}
                rows={4}
                error={errors.descAr}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="sizeAr"
                name="sizeAr"
                label={t('form.size_ar')}
                value={formData.sizeAr}
                onChange={(e) => handleChange('sizeAr', e.target.value)}
                placeholder={t('form.size_placeholder')}
                error={errors.sizeAr}
                required
              />
              <Input
                id="usageAr"
                name="usageAr"
                label={t('form.usage_ar')}
                value={formData.usageAr}
                onChange={(e) => handleChange('usageAr', e.target.value)}
                placeholder={t('form.usage_ar_placeholder')}
                error={errors.usageAr}
              />
              <Input
                id="careAr"
                name="careAr"
                label={t('form.care_ar')}
                value={formData.careAr}
                onChange={(e) => handleChange('careAr', e.target.value)}
                placeholder={t('form.care_ar_placeholder')}
                error={errors.careAr}
              />
            </div>
          </div>
        )}

        {/* محتوى التبويب الإنجليزي */}
        {activeLangTab === 'en' && (
          <div className="space-y-5" dir="ltr">
            <Input
              id="nameEn"
              name="nameEn"
              label={t('form.name_en')}
              value={formData.nameEn}
              onChange={(e) => handleChange('nameEn', e.target.value)}
              placeholder={t('form.name_en_placeholder')}
              error={errors.nameEn}
              required={formData.isPublished}
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-text-main">
                  {t('form.desc_en')} {formData.isPublished && <span className="text-brand-orange">*</span>}
                </span>
                <span
                  className={cn(
                    'font-mono text-[11px] font-bold',
                    formData.descEn.length > 500 ? 'text-rose-600' : 'text-text-muted'
                  )}
                >
                  {formData.descEn.length} / 500 characters
                </span>
              </div>
              <Textarea
                id="descEn"
                name="descEn"
                value={formData.descEn}
                onChange={(e) => handleChange('descEn', e.target.value)}
                placeholder={t('form.desc_en_placeholder')}
                rows={4}
                error={errors.descEn}
                required={formData.isPublished}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="sizeEn"
                name="sizeEn"
                label={t('form.size_en')}
                value={formData.sizeEn}
                onChange={(e) => handleChange('sizeEn', e.target.value)}
                placeholder={t('form.size_en_placeholder')}
                error={errors.sizeEn}
                required={formData.isPublished}
              />
              <Input
                id="usageEn"
                name="usageEn"
                label={t('form.usage_en')}
                value={formData.usageEn}
                onChange={(e) => handleChange('usageEn', e.target.value)}
                placeholder={t('form.usage_en_placeholder')}
                error={errors.usageEn}
              />
              <Input
                id="careEn"
                name="careEn"
                label={t('form.care_en')}
                value={formData.careEn}
                onChange={(e) => handleChange('careEn', e.target.value)}
                placeholder={t('form.care_en_placeholder')}
                error={errors.careEn}
              />
            </div>
          </div>
        )}
      </div>

      {/* التصنيف التعليمي واختيار البائعة (في وضع الإدارة) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Select
          id="categoryId"
          name="categoryId"
          label={t('form.category')}
          value={formData.categoryId}
          onChange={(e) => handleChange('categoryId', e.target.value)}
          error={errors.categoryId}
          required
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {isRtl ? cat.name : cat.nameEn}
            </option>
          ))}
        </Select>

        {mode === 'admin' && (
          <Select
            id="sellerId"
            name="sellerId"
            label={t('form.seller_select')}
            value={formData.sellerId}
            onChange={(e) => handleChange('sellerId', e.target.value)}
            error={errors.sellerId}
            required
          >
            {(Array.isArray(sellers) ? sellers : []).map((s) => (
              <option key={s.id || s._id} value={s.id || s._id}>
                {getDisplayName(s, i18n.language)}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* السعر والمخزون مع سطر معاينة العمولة المباشرة */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            id="price"
            name="price"
            type="number"
            min="1"
            step="1"
            label={t('form.price')}
            value={formData.price}
            onChange={(e) => handleChange('price', e.target.value)}
            placeholder={t('form.price_placeholder')}
            error={errors.price}
            required
          />

          <Input
            id="stockCount"
            name="stockCount"
            type="number"
            min="0"
            step="1"
            label={t('form.stock')}
            value={formData.stockCount}
            onChange={(e) => handleChange('stockCount', e.target.value)}
            placeholder={t('form.stock_placeholder')}
            error={errors.stockCount}
            required
          />
        </div>

        {/* سطر المعاينة الحية لعمولة المنصة 20% وصافي مستحقات البائعة 80% */}
        <div className="p-3.5 rounded-[16px] bg-brand-orange/10 dark:bg-brand-orange/15 border border-brand-orange/20 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-text-main font-bold">
            <Sparkles className="w-4 h-4 text-brand-orange shrink-0" />
            <span>
              {t('form.price_preview', {
                commission: formatMoney(liveCommission.commission),
                net: formatMoney(liveCommission.net),
              })}
            </span>
          </div>

          <span className="text-[11px] font-semibold text-text-muted">
            {isRtl
              ? '(عمولة المنصة 20% مخصومة لدعم التسويق والشحن)'
              : '(Platform commission 20% deducted for marketing and fulfillment)'}
          </span>
        </div>
      </div>

      {/* المراحل التعليمية المستهدفة */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-main block">
          {t('form.stage')} <span className="text-brand-orange">*</span>
        </label>
        <div className="flex flex-wrap gap-4 p-4 rounded-[16px] bg-surface-subtle border border-surface-border">
          {STAGES.map((stg) => (
            <Checkbox
              key={stg.id}
              id={`stage_${stg.id}`}
              label={isRtl ? stg.label : stg.labelEn}
              checked={formData.stages.includes(stg.id)}
              onChange={() => handleStageToggle(stg.id)}
            />
          ))}
        </div>
        {errors.stages && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.stages}</span>
          </p>
        )}
      </div>

      {/* الخامات المتاحة حصراً */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-main block">
          {t('form.materials')} <span className="text-brand-orange">*</span>
        </label>
        <div className="flex flex-wrap gap-4 p-4 rounded-[16px] bg-surface-subtle border border-surface-border">
          {APPROVED_MATERIALS.map((mat) => (
            <Checkbox
              key={mat.id}
              id={`mat_${mat.id}`}
              label={isRtl ? mat.labelAr : mat.labelEn}
              checked={formData.materials.includes(mat.id)}
              onChange={() => handleMaterialToggle(mat.id)}
            />
          ))}
        </div>
        {errors.materials && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errors.materials}</span>
          </p>
        )}
      </div>

      {/* خيارات النشر والظهور */}
      <div className="pt-2 flex flex-col gap-4">
        <Switch
          id="isPublished"
          name="isPublished"
          label={t('form.is_published')}
          description={t('form.is_published_desc')}
          checked={formData.isPublished}
          onChange={(e) => handleChange('isPublished', e.target.checked)}
        />

        {mode === 'admin' && (
          <Switch
            id="isFeatured"
            name="isFeatured"
            label={t('form.is_featured')}
            checked={formData.isFeatured}
            onChange={(e) => handleChange('isFeatured', e.target.checked)}
          />
        )}
      </div>

      {/* زر الحفظ على سطر واحد */}
      <div className="pt-5 border-t border-surface-border flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting || !!uploadStatus}
          disabled={isSubmitting || !!uploadStatus}
          className="whitespace-nowrap px-8 h-12 rounded-full font-bold shadow-soft"
        >
          {initialValues.id ? t('form.submit_edit') : t('form.submit_create')}
        </Button>
      </div>
    </form>
  )
}