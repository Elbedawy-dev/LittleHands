import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PLATFORM_CONFIG } from '../config/constants'

/**
 * دمج أسماء الفئات الشرطية مع إزالة التكرارات
 * Merge Tailwind class names safely
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * حساب العمولة وصافي أرباح البائعة
 * المكان المخصص والوحيد لحساب النسبة في كامل المنصة
 * Example: 100 EGP sale => commission = 20 EGP, net = 80 EGP
 *
 * @param {number} amount - المبلغ الإجمالي للمبيعات
 * @param {number} [rate] - نسبة العمولة (الافتراضي 0.20 أي 20%)
 * @returns {{ commission: number, net: number, rate: number }}
 */
export function calcCommission(amount = 0, rate = PLATFORM_CONFIG.COMMISSION_RATE) {
  const safeAmount = Number(amount) || 0
  const safeRate = typeof rate === 'number' && !isNaN(rate) ? rate : PLATFORM_CONFIG.COMMISSION_RATE
  const commission = Math.round(safeAmount * safeRate * 100) / 100
  const net = Math.round((safeAmount - commission) * 100) / 100
  return {
    commission,
    net,
    rate: safeRate,
  }
}

/**
 * التحقق من صيغة الهاتف المصري: 01XXXXXXXXX
 */
export function isValidEgyptianPhone(phone) {
  if (!phone) return false
  const clean = String(phone).replace(/\s+/g, '')
  return /^01[0125][0-9]{8}$/.test(clean)
}

/**
 * توليد معرّف تسلسلي للطلبات بصيغة LH-2026-###
 */
export function generateOrderNumber(sequence = Math.floor(Math.random() * 900) + 100) {
  return `LH-2026-${String(sequence).padStart(3, '0')}`
}

/**
 * @typedef {Object} LocalizedResult
 * @property {string} text - النص المستخرج المترجم
 * @property {boolean} isFallback - ما إذا كان النص المستخرج هو لغة التراجع البديلة
 * @property {'ar'|'en'} lang - لغة النص المستخرج الفعلية
 * @property {'rtl'|'ltr'} dir - اتجاه قراءة النص المستخرج
 * @property {() => string} toString - تمثيل النص كسلسلة نصية
 */

/**
 * دالة استخراج النص المترجم حسب اللغة مع التراجع الآمن للغة البديلة
 * Pick localized user content with safe fallback to the alternate language
 * NOTE: Returns an OBJECT. Do NOT render directly as a React child! Use <LocalizedText /> in JSX.
 * When only a plain string is needed (alt, title, placeholder, aria-label, toasts), use pickLocaleText().
 *
 * @param {string|{ ar?: string, en?: string }|null|undefined} field
 * @param {'ar'|'en'} [lang='ar']
 * @returns {LocalizedResult}
 */
export function pickLocale(field, lang = 'ar') {
  if (!field) {
    const res = { text: '', isFallback: false, lang, dir: lang === 'ar' ? 'rtl' : 'ltr' }
    res.toString = () => ''
    return res
  }

  if (typeof field === 'string') {
    const res = { text: field, isFallback: false, lang, dir: lang === 'ar' ? 'rtl' : 'ltr' }
    res.toString = () => field
    return res
  }

  const primary = (field[lang] || '').trim()
  if (primary) {
    const res = { text: primary, isFallback: false, lang, dir: lang === 'ar' ? 'rtl' : 'ltr' }
    res.toString = () => primary
    return res
  }

  const otherLang = lang === 'ar' ? 'en' : 'ar'
  const fallback = (field[otherLang] || '').trim()
  if (fallback) {
    const res = { text: fallback, isFallback: true, lang: otherLang, dir: otherLang === 'ar' ? 'rtl' : 'ltr' }
    res.toString = () => fallback
    return res
  }

  const res = { text: '', isFallback: false, lang, dir: lang === 'ar' ? 'rtl' : 'ltr' }
  res.toString = () => ''
  return res
}

/**
 * دالة استخراج النص المترجم كنص بسيط فقط
 * Pick localized user content as a plain string (safe for alt, title, placeholder, toasts, aria-label)
 *
 * @param {string|{ ar?: string, en?: string }|null|undefined} field
 * @param {'ar'|'en'} [lang='ar']
 * @returns {string}
 */
export function pickLocaleText(field, lang = 'ar') {
  return pickLocale(field, lang).text
}

/**
 * Helper to get display name for entities (sellers, users, products, etc.)
 * Returns nameEn when the language is "en" and nameEn exists, otherwise the normal name.
 *
 * @param {Object|string|null|undefined} entity
 * @param {string} [language='ar']
 * @returns {string}
 */
export function getDisplayName(entity, language = 'ar') {
  if (!entity) return ''

  const isEn = language === 'en'

  // If passed a string
  if (typeof entity === 'string') {
    return entity
  }

  // Check localized displayName { ar, en }
  if (entity.displayName) {
    if (typeof entity.displayName === 'object') {
      return isEn
        ? (entity.displayName.en || entity.displayName.ar || entity.name || '')
        : (entity.displayName.ar || entity.displayName.en || entity.name || '')
    }
    return entity.displayName
  }

  // If language is 'en' and entity has nameEn
  if (isEn && entity.nameEn) {
    return entity.nameEn
  }

  // If entity has sellerNameEn
  if (isEn && entity.sellerNameEn) {
    return entity.sellerNameEn
  }

  // If entity has name as an object { ar, en }
  if (entity.name && typeof entity.name === 'object') {
    return isEn
      ? (entity.name.en || entity.name.ar || '')
      : (entity.name.ar || entity.name.en || '')
  }

  // If entity has sellerName as an object { ar, en }
  if (entity.sellerName && typeof entity.sellerName === 'object') {
    return isEn
      ? (entity.sellerName.en || entity.sellerName.ar || '')
      : (entity.sellerName.ar || entity.sellerName.en || '')
  }

  // Normal name (or fallback)
  const normal = entity.name || entity.sellerName || entity.title || ''
  if (typeof normal === 'object') {
    return isEn ? (normal.en || normal.ar || '') : (normal.ar || normal.en || '')
  }
  return normal
}

/**
 * استخراج رابط الصورة بأمان سواء كانت نصاً مباشراً أو كائناً { url, key }
 * Safely extract image URL from either a string or an object { url, key }
 *
 * @param {string|{ url?: string, key?: string }|null|undefined} img
 * @returns {string}
 */
export function getImageUrl(img) {
  if (!img) return ''
  if (typeof img === 'string') return img.trim()
  if (typeof img === 'object') {
    if (typeof img.url === 'string') return img.url.trim()
    if (typeof img.src === 'string') return img.src.trim()
  }
  return ''
}

/**
 * التحقق مما إذا كان المسار يطابق قسماً معيناً كمقطع كامل
 * Checks if a pathname matches a root section exactly or as a sub-path segment (e.g. '/seller' or '/seller/*')
 * Prevents false-positive prefix matches like '/sellers' matching '/seller'.
 *
 * @param {string} pathname
 * @param {string} section
 * @returns {boolean}
 */
export function isInSection(pathname, section) {
  if (!pathname || !section) return false
  const cleanPath = pathname.split('?')[0].split('#')[0]
  const cleanSection = section.replace(/\/+$/, '')
  return cleanPath === cleanSection || cleanPath.startsWith(`${cleanSection}/`)
}

/**
 * محاكاة تأخير زمني لمعاملات Mock API
 */
export function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * قراءة أو كتابة الذاكرة المحلية بأمان
 */
export { getFriendlyError, formatErrorMessage } from './errors'
export { processAvatarImage } from './avatar'

export const storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore storage quota issues
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

