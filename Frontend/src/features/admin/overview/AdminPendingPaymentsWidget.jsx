import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Eye, Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { Lightbox } from '../../../components/ui/Lightbox'
import { PriceTag } from '../../../components/ui/PriceTag'
import { useLanguage } from '../../../context/LanguageContext'

/**
 * ودجت إيصالات فودافون كاش المعلقة في لوحة التحكم الإدارية
 * يتيح معاينة فورية للإيصال، ورصد أي عدم تطابق بين المبلغ المحول ومجموع الطلب
 */
export function AdminPendingPaymentsWidget({ pendingPayments = [], loading = false }) {
  const { t } = useTranslation('admin-core')
  const { isRtl } = useLanguage()
  const [activeLightboxImg, setActiveLightboxImg] = useState(null)

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  return (
    <Card padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <h3 className="font-heading font-black text-lg text-text-main">
            {t('overview.pendingWidget.title')}
          </h3>
          {pendingPayments.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
              {t('overview.pendingWidget.urgentCount', { count: pendingPayments.length })}
            </span>
          )}
        </div>

        <Link
          to="/admin/payments"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange-text dark:text-brand-orange hover:underline self-start sm:self-auto"
        >
          <span>{t('overview.pendingWidget.viewAll')}</span>
          <ArrowIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-subtle animate-pulse" />
          ))}
        </div>
      ) : pendingPayments.length === 0 ? (
        <div className="py-8 text-center text-text-muted">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-80" />
          <p className="text-xs max-w-sm mx-auto">{t('overview.pendingWidget.empty')}</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-border">
          {pendingPayments.slice(0, 4).map((payment) => {
            // رصد عدم تطابق المبلغ المحول مع إجمالي الطلب المطلوب
            const hasMismatch =
              payment.total !== undefined &&
              payment.transferredAmount !== undefined &&
              Number(payment.transferredAmount) !== Number(payment.total)

            return (
              <div
                key={payment.orderId}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-subtle/30 -mx-2 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* مصغرة الإيصال مع إمكانية التكبير */}
                  {payment.screenshotUrl ? (
                    <button
                      type="button"
                      onClick={() => setActiveLightboxImg(payment.screenshotUrl)}
                      className="relative w-12 h-12 rounded-xl overflow-hidden border border-surface-border bg-surface-subtle shrink-0 group cursor-zoom-in"
                      title={t('payments.table.viewReceipt')}
                    >
                      <img
                        src={payment.screenshotUrl}
                        alt="إيصال فودافون كاش"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-surface-subtle flex items-center justify-center shrink-0 text-text-muted text-[10px]">
                      {t('payments.table.noReceipt')}
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        dir="ltr"
                        className="font-mono font-bold text-text-main text-xs sm:text-sm [unicode-bidi:isolate]"
                      >
                        {payment.orderNumber}
                      </span>
                      {hasMismatch && (
                        <Badge variant="danger" size="sm" className="gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{t('overview.pendingWidget.mismatchWarning')}</span>
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      <span className="font-semibold text-text-main">{payment.customerName}</span>
                      <span className="ms-2 inline-flex items-center gap-1 font-mono text-[11px]" dir="ltr">
                        <Phone className="w-3 h-3 text-brand-orange inline" />
                        <span className="[unicode-bidi:isolate]">{payment.senderPhone}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 ps-14 sm:ps-0">
                  <div className="text-end">
                    <PriceTag amount={payment.transferredAmount} size="sm" />
                    {hasMismatch && (
                      <span className="block text-[10px] text-rose-600 dark:text-rose-400">
                        {t('payments.table.expectedTotal')}: <PriceTag amount={payment.total} size="sm" />
                      </span>
                    )}
                  </div>

                  <Link
                    to="/admin/payments"
                    className="px-3.5 py-1.5 rounded-full bg-brand-orange text-white text-xs font-bold hover:bg-[#e07528] shadow-xs transition-colors shrink-0 whitespace-nowrap"
                  >
                    {t('overview.pendingWidget.reviewAction')}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* نافذة عرض صورة الإيصال مكبرة */}
      <Lightbox
        isOpen={Boolean(activeLightboxImg)}
        onClose={() => setActiveLightboxImg(null)}
        src={activeLightboxImg}
        alt="إيصال فودافون كاش"
      />
    </Card>
  )
}
