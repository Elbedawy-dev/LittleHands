import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../utils'

/**
 * بطاقة إرشادية توضح آلية احتساب عمولة المنصة (20%) بشفافية تامة
 * Info card explaining the 20% platform commission and math breakdown
 */
export function CommissionInfoCard({ className }) {
  const { t } = useTranslation('seller')

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start gap-4 p-5 rounded-[24px] bg-brand-sky/10 dark:bg-brand-sky/15 border border-brand-sky/20 text-text-main shadow-xs transition-colors',
        className
      )}
    >
      <div className="w-10 h-10 rounded-2xl bg-brand-sky/20 text-brand-sky flex items-center justify-center shrink-0 shadow-xs">
        <Info className="w-5 h-5 stroke-[2.5]" />
      </div>

      <div className="space-y-1.5 flex-1">
        <h4 className="font-heading font-black text-sm text-text-main">
          {t('overview.commission_notice.title')}
        </h4>
        <p className="text-xs text-text-muted leading-relaxed">
          {t('overview.commission_notice.text')}
        </p>
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-sky bg-brand-sky/15 dark:bg-brand-sky/25 px-3 py-1 rounded-full">
            {t('overview.commission_notice.example')}
          </span>
        </div>
      </div>
    </div>
  )
}
