import { User } from 'lucide-react'
import { cn } from '../../utils'

/**
 * الصورة الرمزية للمستخدم أو البائعة
 * Shows uploaded profile picture (circle, object-cover), else the first letter of the name,
 * else a generic user icon for guests.
 */
export function Avatar({
  src,
  name = '',
  role,
  size = 'md',
  className,
}) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-20 h-20 text-xl font-bold',
  }

  const roleColors = {
    customer: 'bg-[#4DB6FF]/20 text-[#0B72B9] border-[#4DB6FF]/40',
    seller: 'bg-[#FF8A3D]/20 text-[#9A4600] dark:text-[#FFB68D] border-[#FF8A3D]/40',
    admin: 'bg-[#44BE8E]/20 text-[#1D7753] border-[#44BE8E]/40',
  }

  const cleanName = typeof name === 'string' ? name.trim() : ''
  const initial = cleanName ? cleanName.charAt(0).toUpperCase() : ''

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
      {src ? (
        <img
          src={src}
          alt={cleanName || 'Avatar'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : initial ? (
        <span>{initial}</span>
      ) : (
        <User className="w-4 h-4 text-text-muted" />
      )}
    </div>
  )
}
