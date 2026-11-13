import { User } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn, getImageUrl } from '../../utils'

/**
 * استخراج أول حرف من أول كلمة + أول حرف من آخر كلمة في الاسم
 * كلمة واحدة = حرف واحد (يدعم العربية والإنجليزية)
 */
function getInitials(rawName) {
  const cleanName = typeof rawName === 'string' ? rawName.trim() : ''
  if (!cleanName) return ''
  const words = cleanName.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const firstChar = Array.from(words[0])[0] || ''
  if (words.length === 1) {
    return firstChar.toUpperCase()
  }
  const lastChar = Array.from(words[words.length - 1])[0] || ''
  return `${firstChar}${lastChar}`.toUpperCase()
}

/**
 * الصورة الرمزية للمستخدم أو البائعة
 * Shows uploaded profile picture (circle, object-cover), else the initials of the name
 * (first letter of first word + first letter of last word), else a generic user icon for guests.
 */
export function Avatar({
  src,
  name = '',
  role,
  size = 'md',
  className,
}) {
  const [failedSrc, setFailedSrc] = useState(null)
  const [loadedSrc, setLoadedSrc] = useState(null)
  const imgRef = useRef(null)

  const resolvedSrc = getImageUrl(src)

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoadedSrc(resolvedSrc)
    }
  }, [resolvedSrc])

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
    '2xl': 'w-24 h-24 sm:w-28 sm:h-28 text-2xl font-bold',
  }

  const roleColors = {
    customer: 'bg-[#4DB6FF]/20 text-[#0B72B9] border-[#4DB6FF]/40',
    seller: 'bg-[#FF8A3D]/20 text-[#9A4600] dark:text-[#FFB68D] border-[#FF8A3D]/40',
    admin: 'bg-[#44BE8E]/20 text-[#1D7753] border-[#44BE8E]/40',
  }

  const initials = getInitials(name)
  const showImage = Boolean(resolvedSrc) && failedSrc !== resolvedSrc
  const isImageReady = showImage && loadedSrc === resolvedSrc

  return (
    <div
      data-user-content="true"
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center font-bold border shrink-0 select-none shadow-xs',
        role ? roleColors[role] : 'bg-brand-orange/15 text-brand-orange border-brand-orange/30',
        sizes[size] || sizes.md,
        className
      )}
    >
      {showImage && (
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt=""
          onLoad={() => setLoadedSrc(resolvedSrc)}
          onError={() => setFailedSrc(resolvedSrc)}
          className={cn(
            'w-full h-full object-cover',
            isImageReady ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
          )}
        />
      )}
      {!isImageReady && (
        initials ? (
          <span className="leading-none tracking-tight">{initials}</span>
        ) : (
          <User className="w-4 h-4 text-text-muted" />
        )
      )}
    </div>
  )
}
