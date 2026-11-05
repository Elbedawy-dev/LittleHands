import { cn } from '../../utils'

/**
 * عنصر هيكل التحميل النابض
 */
export function Skeleton({ className, rounded = 'rounded-[16px]', ...props }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-subtle dark:bg-surface-raised',
        rounded,
        className
      )}
      {...props}
    />
  )
}

