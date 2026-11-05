import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '../../utils'

/**
 * Built-in fallback mark when SVG and PNG image files fail to load
 */
function BuiltInMark({ className }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('rounded-2xl shrink-0 select-none', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lhLogoBuiltInGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9E42" />
          <stop offset="100%" stopColor="#FF6B00" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#lhLogoBuiltInGrad)" />
      <g fill="#FFFFFF" transform="translate(14, 14) scale(0.72)">
        <path d="M48 50 C48 66 36 78 26 76 C16 74 12 60 14 48 C16 38 28 42 36 44 C44 46 48 44 48 50 Z" />
        <path d="M15 48 C12 48 4 41 7 35 C10 29 17 34 20 40 C21 43 19 48 15 48 Z" />
        <rect x="23" y="14" width="7" height="26" rx="3.5" transform="rotate(-7 26.5 27)" />
        <rect x="33" y="10" width="7.5" height="30" rx="3.75" />
        <rect x="43" y="13" width="7" height="27" rx="3.5" transform="rotate(7 46.5 26.5)" />
        <rect x="52" y="22" width="6.5" height="20" rx="3.25" transform="rotate(15 55.25 32)" />
      </g>
    </svg>
  )
}

/**
 * Unified Logo Component for Little Hands
 * Variants:
 *  - 'mark': Logo icon only (orange square with child hand-print)
 *  - 'full': Logo mark + Brand name on a SINGLE line
 */
export function Logo({
  variant = 'full', // 'mark' | 'full'
  size = 'md', // 'sm' | 'md' | 'lg'
  className,
  nameClassName,
  asLink = false,
  to = '/',
}) {
  const { t } = useTranslation('common')
  const [imgStage, setImgStage] = useState('svg') // 'svg' -> 'png' -> 'fallback'

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  const markSize = sizeClasses[size] || sizeClasses.md
  const textSize = textSizes[size] || textSizes.md

  const handleImgError = () => {
    if (imgStage === 'svg') {
      setImgStage('png')
    } else if (imgStage === 'png') {
      setImgStage('fallback')
    }
  }

  const renderMark = () => {
    if (imgStage === 'fallback') {
      return <BuiltInMark className={markSize} />
    }

    const src = imgStage === 'svg' ? '/brand/logo.svg' : '/brand/logo.png'

    return (
      <img
        src={src}
        alt={t('brand', 'أيدي صغيرة')}
        onError={handleImgError}
        className={cn('rounded-2xl object-contain shrink-0 select-none shadow-soft', markSize)}
      />
    )
  }

  const content = (
    <div className={cn('inline-flex items-center gap-2.5 select-none leading-none', className)}>
      {renderMark()}
      {variant === 'full' && (
        <span
          className={cn(
            'font-heading font-black text-text-main whitespace-nowrap tracking-tight leading-none',
            textSize,
            nameClassName
          )}
        >
          {t('brand', 'أيدي صغيرة')}
        </span>
      )}
    </div>
  )

  if (asLink) {
    return (
      <Link to={to} className="inline-flex items-center group focus:outline-none">
        {content}
      </Link>
    )
  }

  return content
}

