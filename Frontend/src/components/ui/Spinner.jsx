import { useTranslation } from 'react-i18next'
import { cn } from '../../utils'

/**
 * مؤشر التحميل المتناسق مع هوية المنصة
 */
export function Spinner({ size = 'md', className, variant = 'primary', label }) {
  const { i18n } = useTranslation('common')
  const isEn = i18n.language === 'en'

  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2.5',
    lg: 'w-8 h-8 border-3',
  }

  const variants = {
    primary: 'border-brand-orange border-t-transparent',
    white: 'border-white border-t-transparent',
    muted: 'border-surface-subtle border-t-brand-orange',
  }

  const loadingText = label || (isEn ? 'Loading...' : 'جاري التحميل...')

  return (
    <div
      role="status"
      aria-label={loadingText}
      className={cn(
        'inline-block animate-spin rounded-full',
        sizes[size] || sizes.md,
        variants[variant] || variants.primary,
        className
      )}
    >
      <span className="sr-only">{loadingText}</span>
    </div>
  )
}
