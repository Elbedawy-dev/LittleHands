import { CreditCard, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'

/**
 * بطاقة بوابة الدفع التلقائي المعطلة (قيد التطوير المستقبلي)
 * متوافقة تماماً مع معجم المحتوى والكلمات المحظورة (دون أي ذكر لبطاقات أو بنوك)
 */
export function PaymentGatewayCard() {
  const { t } = useTranslation('admin-manage')

  return (
    <Card
      variant="subtle"
      padding="lg"
      className="relative overflow-hidden border-dashed border-2 border-surface-border/80 bg-surface-subtle/40 opacity-75 select-none"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-surface-border/50 text-text-muted flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-base text-text-main">
                {t('settings.gatewaySection.disabledCardTitle')}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Lock className="w-3 h-3" />
                <span>{t('settings.gatewaySection.soonBadge')}</span>
              </span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed max-w-xl">
              {t('settings.gatewaySection.disabledCardDesc')}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
