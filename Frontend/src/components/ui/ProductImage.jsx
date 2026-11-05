import { useState } from 'react'
import { cn } from '../../utils'
import { Logo } from './Logo'

/**
 * المكون الموحد والأساسي حصراً لعرض صور الوسائل التعليمية
 * يعرض الصورة الحقيقية إن وجدت، أو نموذجاً رمزياً محايداً بهوية المنصة
 * لا يحتوي على صور مخزنة أو روابط خارجية أو صور ذكاء اصطناعي
 */
export function ProductImage({
  src,
  alt = 'وسيلة تعليمية يدوية',
  aspectRatio = '4/3', // '4/3' | '1/1' | '16/9'
  className,
  containerClassName,
}) {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // نسبة الأبعاد
  const ratios = {
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '16/9': 'aspect-[16/9]',
  }

  const isValidUrl = src && !hasError && (src.startsWith('/') || src.startsWith('blob:') || src.startsWith('data:'))

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-orange/5 via-surface-subtle to-brand-mint/5 flex items-center justify-center select-none border border-surface-border/40',
        ratios[aspectRatio] || ratios['4/3'],
        containerClassName
      )}
    >
      {isValidUrl ? (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              className
            )}
          />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-surface-subtle" />
          )}
        </>
      ) : (
        /* العنصر الرمزي المحايد بهوية المنصة - علامة الشعار فقط بدون أي نصوص */
        <div className="flex items-center justify-center p-4">
          <Logo variant="mark" size="md" />
        </div>
      )}
    </div>
  )
}

