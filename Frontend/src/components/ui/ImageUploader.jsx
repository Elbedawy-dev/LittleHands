import { AlertCircle, ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils'

export function ImageUploader({
  images = [],
  onChange,
  maxImages = 5,
  maxSizeMb = 3.5,
  disabled = false,
  className,
}) {
  const { t } = useTranslation('common')
  const fileInputRef = useRef(null)
  const [error, setError] = useState('')

  // Normalize images to uniform { id, url, key?, file? } objects
  const normalizedImages = (images || []).map((img, i) => {
    if (typeof img === 'string') {
      return { id: `existing_${i}_${img}`, url: img, key: img.split('/').pop() }
    }
    return {
      id: img.id || img.key || img.url || `img_${i}`,
      url: img.url,
      key: img.key,
      file: img.file,
    }
  })

  const handleFiles = (files) => {
    setError('')
    if (!files || files.length === 0) return

    const newImages = [...normalizedImages]
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (!allowedTypes.includes(file.type)) {
        setError(t('ui.imageFormatError'))
        return
      }

      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(t('ui.imageMaxSizeSimple', { max: maxSizeMb }))
        return
      }

      if (newImages.length >= maxImages) {
        setError(t('ui.imageMaxCountError', { max: maxImages }))
        break
      }

      const blobUrl = URL.createObjectURL(file)
      newImages.push({
        id: `new_${file.lastModified}_${file.size}_${i}`,
        url: blobUrl,
        file,
      })
    }

    onChange(newImages)
  }

  const handleRemove = (index) => {
    const item = normalizedImages[index]
    if (item?.file && item.url?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.url)
      } catch {
        // ignore
      }
    }
    const updated = normalizedImages.filter((_, idx) => idx !== index)
    onChange(updated)
  }

  const handleMove = (index, direction) => {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= normalizedImages.length) return
    const updated = [...normalizedImages]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    onChange(updated)
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {/* معاينة الصور المرفوعة */}
        {normalizedImages.map((img, idx) => (
          <div
            key={img.id || idx}
            className="group relative aspect-square rounded-[18px] overflow-hidden border-2 border-surface-border bg-surface-subtle"
          >
            <img
              src={img.url}
              alt={t('ui.imageAlt', { index: idx + 1 })}
              className="w-full h-full object-cover"
            />

            {/* شارة الصورة الرئيسية */}
            {idx === 0 && (
              <span className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-orange text-white shadow-xs">
                {t('ui.primaryImage')}
              </span>
            )}

            {/* أدوات التحكم بالصورة */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-text-main transition-colors"
                  aria-label={t('ui.moveImageForward')}
                >
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-1.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white transition-colors"
                aria-label={t('ui.removeImage')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {idx < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white text-white hover:text-text-main transition-colors"
                  aria-label={t('ui.moveImageBackward')}
                >
                  <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* زر إضافة صور جديدة */}
        {images.length < maxImages && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-[18px] border-2 border-dashed border-surface-border hover:border-brand-orange bg-surface hover:bg-brand-orange/5 transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-surface-subtle group-hover:bg-brand-orange/15 text-text-muted group-hover:text-brand-orange flex items-center justify-center mb-2 transition-colors">
              <ImagePlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-text-main group-hover:text-brand-orange transition-colors">
              {t('ui.addImage')}
            </span>
            <span className="text-[10px] text-text-muted mt-0.5">
              ({images.length}/{maxImages})
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 mt-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
