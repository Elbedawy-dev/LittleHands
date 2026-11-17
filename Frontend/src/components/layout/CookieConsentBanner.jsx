import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import {
  CONSENT_GRANTED,
  getAnalyticsConsent,
  initGA,
  isAnalyticsEnabled,
  isTrackablePath,
  setAnalyticsConsent,
  trackPageView,
} from '../../utils/analytics'
import { Button } from '../ui/Button'

/**
 * شريط موافقة الكوكيز التحليلية (GA4).
 * - لا يظهر إلا لو التحليلات مفعّلة (VITE_GA_ID + بيئة إنتاج) ولم يُتخذ قرار بعد.
 * - على الموبايل يستقر فوق شريط التبويبات السفلي دون أن يغطيه.
 */
export function CookieConsentBanner() {
  const { t } = useTranslation('common')
  const { pathname, search } = useLocation()
  const [decision, setDecision] = useState(() => getAnalyticsConsent())

  if (!isAnalyticsEnabled() || decision || !isTrackablePath(pathname)) return null

  const handleAccept = () => {
    setAnalyticsConsent(true)
    setDecision(CONSENT_GRANTED)
    initGA()
    trackPageView(`${pathname}${search}`)
  }

  const handleDecline = () => {
    setAnalyticsConsent(false)
    setDecision('denied')
  }

  return (
    <div
      role="region"
      aria-label={t('consent.ariaLabel')}
      data-testid="cookie-consent"
      className="fixed z-50 start-3 end-3 bottom-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom)+0.5rem)] md:start-auto md:end-4 md:bottom-4 md:max-w-md rounded-[20px] bg-surface border border-surface-border shadow-float p-4 text-start transition-colors"
    >
      <p className="text-xs sm:text-sm text-text-main leading-relaxed">{t('consent.message')}</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleDecline}>
          {t('consent.decline')}
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={handleAccept}>
          {t('consent.accept')}
        </Button>
      </div>
    </div>
  )
}
