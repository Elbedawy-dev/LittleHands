import { Check, Copy, Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'

/**
 * قسم محفظة فودافون كاش الرسمية للمنصة
 */
export function WalletSettingsSection({
  walletNumber,
  onChangeWalletNumber,
  error,
}) {
  const { t } = useTranslation('admin-manage')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!walletNumber) return
    navigator.clipboard.writeText(walletNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card variant="default" padding="lg" className="shadow-soft space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-surface-border">
        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
          <Phone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-heading font-black text-base text-text-main">
            {t('settings.walletSection.title')}
          </h3>
          <p className="text-xs text-text-muted">
            {t('settings.walletSection.description')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                id="admin-platform-wallet"
                label={t('settings.walletSection.walletLabel')}
                type="text"
                value={walletNumber}
                onChange={(e) => onChangeWalletNumber(e.target.value)}
                helperText={t('settings.walletSection.walletHelper')}
                error={error}
                placeholder="01XXXXXXXXX"
                dir="ltr"
                required
              />
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-7 h-[52px] px-4 rounded-[16px] bg-surface-subtle hover:bg-surface-border border border-surface-border text-text-main text-xs font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange shrink-0 select-none"
              title={t('settings.walletSection.copyWallet')}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">{t('settings.walletSection.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-text-muted" />
                  <span>{t('settings.walletSection.copyWallet')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 rounded-[20px] bg-surface-subtle/80 border border-surface-border text-xs text-text-muted leading-relaxed">
          <span className="font-bold text-text-main block mb-1">
            {t('settings.walletSection.noteTitle')}
          </span>
          {t('settings.walletSection.noteText')}
        </div>
      </div>
    </Card>
  )
}
