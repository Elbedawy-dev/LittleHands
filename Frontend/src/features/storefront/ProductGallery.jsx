import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lightbox } from '../../components/ui/Lightbox'
import { ProductImage } from '../../components/ui/ProductImage'
import { useLanguage } from '../../context/LanguageContext'
import { pickLocale } from '../../utils'

/**
 * معرض صور الوسيلة التعليمية مع مصغرات ونافذة تكبير Lightbox
 * يعمل بسلاسة حتى في حال وجود صورة واحدة فقط أو عدم وجود صور
 */
export function ProductGallery({ images = [], name = 'وسيلة تعليمية' }) {
  const { t } = useTranslation('storefront')
  const { language } = useLanguage()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const displayName = pickLocale(name, language).text

  // قائمة الصور أو مصفوفة تحتوي على مسار افتراضي
  const safeImages = images && images.length > 0 ? images : ['/products/placeholder.jpg']
  const activeImage = safeImages[selectedIndex] || safeImages[0]

  return (
    <div className="flex flex-col gap-4">
      {/* الصورة الرئيسية الكبيرة */}
      <div className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden bg-surface border border-surface-border shadow-soft group">
        <ProductImage
          src={activeImage}
          alt={displayName}
          aspectRatio="4/3"
          className="group-hover:scale-105 transition-transform duration-500 ease-out cursor-zoom-in"
        />

        {/* زر التكبير */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute bottom-4 end-4 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-surface/90 text-text-main shadow-md flex items-center gap-1.5 text-xs font-bold backdrop-blur-xs hover:bg-white dark:hover:bg-surface transition-all select-none cursor-pointer"
          aria-label={t('productDetails.zoomHint')}
        >
          <ZoomIn className="w-4 h-4 text-brand-orange" />
          <span>{t('productDetails.zoomHint')}</span>
        </button>
      </div>

      {/* شريط المصغرات (Thumbnails) إذا كان هناك أكثر من صورة */}
      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {safeImages.map((img, idx) => {
            const isSelected = idx === selectedIndex
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative aspect-square rounded-[18px] overflow-hidden border-2 transition-all p-0 cursor-pointer ${
                  isSelected
                    ? 'border-brand-orange ring-2 ring-brand-orange/20 scale-102 shadow-sm'
                    : 'border-surface-border hover:border-brand-orange/50 opacity-80 hover:opacity-100'
                }`}
              >
                <ProductImage
                  src={img}
                  alt={`${displayName} - ${idx + 1}`}
                  aspectRatio="1/1"
                  className="w-full h-full object-cover"
                />
              </button>
            )
          })}
        </div>
      )}

      {/* نافذة التكبير الكامل Lightbox */}
      <Lightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={safeImages}
        index={selectedIndex}
        onIndexChange={(newIdx) => setSelectedIndex(newIdx)}
        alt={displayName}
      />
    </div>
  )
}
