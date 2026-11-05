import { Calculator, Percent } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { useFormat } from '../../../hooks/useFormat'
import { calcCommission } from '../../../utils'

/**
 * قسم الإعدادات المالية ونسبة عمولة المنصة
 */
export function FinancialSettingsSection({
  commissionRate,
  onChangeCommissionRate,
  error,
}) {
  const { t } = useTranslation('admin-manage')
  const { formatMoney } = useFormat()

  const numRate = Number(commissionRate) || 0
  const rateFraction = numRate / 100
  const sampleMath = calcCommission(100, rateFraction)

  return (
    <Card variant="default" padding="lg" className="shadow-soft space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
        <div className="w-10 h-10 rounded-2xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shrink-0">
          <Percent className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-heading font-black text-base text-text-main">
            {t('settings.financialSection.title')}
          </h3>
          <p className="text-xs text-text-muted">
            {t('settings.financialSection.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* حقل نسبة العمولة */}
        <div>
          <Input
            id="admin-commission-rate"
            label={t('settings.financialSection.commissionRateLabel')}
            type="number"
            min="0"
            max="50"
            step="1"
            value={commissionRate}
            onChange={(e) => onChangeCommissionRate(e.target.value)}
            helperText={t('settings.financialSection.commissionRateHelper')}
            error={error}
            required
          />
        </div>

        {/* بطاقة المعاينة الرياضية الفورية */}
        <div className="p-4 rounded-[20px] bg-surface-subtle/80 border border-surface-border space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-text-main">
            <Calculator className="w-4 h-4 text-brand-orange" />
            <span>{t('settings.financialSection.mathPreviewTitle')}</span>
          </div>

          <p className="text-xs text-text-muted leading-relaxed">
            {t('settings.financialSection.mathPreview', {
              commission: sampleMath.commission,
              net: sampleMath.net,
            })}
          </p>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-border/60">
            <span className="text-text-muted">{t('settings.financialSection.platformCommission')}</span>
            <span className="font-bold text-brand-orange-text dark:text-brand-orange">
              {formatMoney(sampleMath.commission)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">{t('settings.financialSection.sellerNet')}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(sampleMath.net)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
