/**
 * Google Analytics 4 (gtag.js) — تحميل ديناميكي بدون مكتبات خارجية.
 * - يقرأ المعرّف من VITE_GA_ID فقط (لا يوجد أي ID مكتوب في الكود).
 * - في وضع التطوير أو عند غياب المعرّف: كل الدوال لا تعمل شيئًا.
 * - لا تُرسل أي أحداث قبل استدعاء initGA() بنجاح.
 */

const GA_ID = String(import.meta.env.VITE_GA_ID || '').trim()
const ENABLED = Boolean(GA_ID) && !import.meta.env.DEV
const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id='

let initialized = false

export function isAnalyticsEnabled() {
  return ENABLED
}

// مسارات لا تُتبع إطلاقًا (لوحات الأدمن/البائعات وصفحات الحسابات)
const EXCLUDED_PATH_PREFIXES = [
  '/admin',
  '/seller',
  '/login',
  '/register',
  '/verify-email',
  '/reset-password',
  '/forgot-password',
]

export function isTrackablePath(pathname = '') {
  return !EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function initGA() {
  if (!ENABLED || initialized || typeof window === 'undefined') return
  initialized = true

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // gtag.js يتطلب تمرير كائن arguments كما هو
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true })

  const script = document.createElement('script')
  script.async = true
  script.src = `${GTAG_SRC}${encodeURIComponent(GA_ID)}`
  document.head.appendChild(script)
}

export function trackPageView(path) {
  if (!ENABLED || !initialized || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title,
  })
}

export function trackEvent(name, params = {}) {
  if (!ENABLED || !initialized || typeof window.gtag !== 'function' || !name) return
  window.gtag('event', name, params)
}
