import { AlertCircle, CheckCircle2, Phone, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { CopyButton } from '../../../components/ui/CopyButton'
import { PriceTag } from '../../../components/ui/PriceTag'
import { getDisplayName } from '../../../utils'

/**
 * بطاقة المستحقات المالية للبائعة الحرفية
 * تعرض تفصيل المبيعات، عمولة المنصة (20٪)، صافي المستحقات (80٪)، والمتبقي للتحويل عبر محفظة فودافون كاش
 */
export function AdminSellerCard({
  seller,
  onRecordPayout,
  onToggleStatus,
}) {
  const { t, i18n } = useTranslation('admin-core')

  const grossSales = seller.grossSales || 0
  const platformCut = seller.platformCut || 0
  const netEarnings = seller.netEarnings || 0
  const totalPaidOut = seller.totalPaidOut || 0
  const pendingBalance = seller.pendingBalance || 0
  const isSuspended = seller.status === 'suspended'

  // نسبة ما تم سداده من صافي مستحقات البائعة
  const payoutPercentage =
    netEarnings > 0 ? Math.min(100, Math.round((totalPaidOut / netEarnings) * 100)) : 0

  const avatarInitial = seller.sellerName?.[0] || seller.name?.[0] || 'ب'
  const sellerBio = (typeof seller.bio === 'object' ? (seller.bio?.ar || seller.bio?.en || '') : seller.bio) || ''

  return (
    <Card padding="lg" className="flex flex-col justify-between space-y-6">
      <div className="space-y-5">
        {/* ترويسة البائعة ورقم الورشة */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange flex items-center justify-center font-heading font-black text-xl shrink-0">
              {avatarInitial}
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-text-main">
                {getDisplayName({ id: seller.sellerId || seller.id, sellerId: seller.sellerId || seller.id, name: seller.sellerName || seller.name, nameEn: seller.nameEn }, i18n.language)}
              </h3>
              <span className="text-xs text-text-muted">
                {sellerBio}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs shrink-0 ${
              isSuspended
                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSuspended ? (i18n.language === 'en' ? 'Suspended' : 'معطل') : (i18n.language === 'en' ? 'Active' : 'نشط')}</span>
            </span>

            {onToggleStatus && (
              <button
                type="button"
                onClick={() => onToggleStatus(seller.userId || seller.id || seller.sellerId, isSuspended ? 'active' : 'suspended')}
                className={`text-[11px] font-bold underline cursor-pointer transition-colors ${
                  isSuspended ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700' : 'text-rose-600 dark:text-rose-400 hover:text-rose-700'
                }`}
              >
                {isSuspended
                  ? (i18n.language === 'en' ? 'Activate Account' : 'تفعيل الحساب')
                  : (i18n.language === 'en' ? 'Suspend Account' : 'إيقاف الحساب')}
              </button>
            )}
          </div>
        </div>

        {/* شبكة الأرقام المالية والحسابات (Reconciled Numbers: 100 = 20 + 80) */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-surface-subtle p-3 rounded-2xl text-start">
            <span className="text-[11px] font-semibold text-text-muted block mb-1">
              {t('sellers.cards.grossSales')}
            </span>
            <PriceTag amount={grossSales} size="sm" />
          </div>

          <div className="bg-surface-subtle p-3 rounded-2xl text-start border border-brand-orange/20">
            <span className="text-[11px] font-semibold text-brand-orange-text dark:text-brand-orange block mb-1">
              {t('sellers.cards.platformCommission')}
            </span>
            <PriceTag amount={platformCut} size="sm" />
          </div>

          <div className="bg-surface-subtle p-3 rounded-2xl text-start border border-emerald-500/20">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
              {t('sellers.cards.sellerNet')}
            </span>
            <PriceTag amount={netEarnings} size="sm" />
          </div>
        </div>

        {/* سطر محفظة فودافون كاش الرسمية للبائعة */}
        {seller.walletNumber ? (
          <div className="p-3.5 rounded-2xl bg-surface-subtle border border-surface-border flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-text-muted">
              <Phone className="w-4 h-4 text-brand-orange shrink-0" />
              <span className="font-medium">{t('sellers.cards.walletNumber')}</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                dir="ltr"
                className="font-mono font-bold text-text-main text-sm [unicode-bidi:isolate]"
              >
                {seller.walletNumber}
              </span>
              <CopyButton text={seller.walletNumber} />
            </div>
          </div>
        ) : null}

        {/* شريط نسبة السداد والتحويلات */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">{t('sellers.cards.totalPaidOut')}:</span>
            <span className="font-bold text-text-main">
              <PriceTag amount={totalPaidOut} size="sm" /> ({payoutPercentage}%)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${payoutPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* الحالة الحالية وزر تسجيل التحويل */}
      <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-text-muted block">
            {t('sellers.cards.pendingDue')}:
          </span>
          {pendingBalance > 0 ? (
            <div className="font-heading font-black text-lg text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-0.5">
              <AlertCircle className="w-4 h-4" />
              <PriceTag amount={pendingBalance} size="md" />
            </div>
          ) : (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {t('sellers.cards.noPendingBalance')}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => onRecordPayout(seller)}
          disabled={pendingBalance <= 0}
          className="gap-2 text-xs"
        >
          <Send className="w-3.5 h-3.5 rtl:rotate-180" />
          <span>{t('sellers.cards.recordPayoutAction')}</span>
        </Button>
      </div>
    </Card>
  )
}
