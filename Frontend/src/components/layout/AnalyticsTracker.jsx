import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { isTrackablePath, trackPageView } from '../../utils/analytics'

/**
 * يرسل page_view عند كل تغيير مسار في الـ SPA (pathname + search).
 * لا يرسل شيئًا للمسارات المستثناة، ولا قبل تهيئة GA.
 */
export function AnalyticsTracker() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    if (!isTrackablePath(pathname)) return
    trackPageView(`${pathname}${search}`)
  }, [pathname, search])

  return null
}
