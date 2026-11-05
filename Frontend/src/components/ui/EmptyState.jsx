import { PackageOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils'

export function EmptyState({
  title,
  description,
  icon = null,
  action = null,
  className,
}) {
  const { t } = useTranslation('common')

  const finalTitle = title !== undefined ? title : t('emptyState.defaultTitle', 'لا توجد عناصر')
  const finalDescription = description !== undefined ? description : t('emptyState.defaultDescription', 'لم يتم العثور على أي عناصر لعرضها')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[24px] bg-surface/60 border border-dashed border-surface-border my-4',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange flex items-center justify-center mb-4 shrink-0 shadow-xs">
        {icon || <PackageOpen className="w-8 h-8 stroke-[1.5]" />}
      </div>

      {finalTitle && (
        <h4 className="text-lg font-bold font-heading text-text-main mb-2">
          {finalTitle}
        </h4>
      )}

      {finalDescription && (
        <p className="text-xs sm:text-sm text-text-muted max-w-sm mx-auto leading-relaxed mb-6">
          {finalDescription}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  )
}
