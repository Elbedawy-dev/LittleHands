import { PLATFORM_CONFIG } from '../config/constants'
import { useLanguage } from '../context/LanguageContext'

export const ARABIC_DIGITS = PLATFORM_CONFIG.ARABIC_DIGITS !== undefined ? PLATFORM_CONFIG.ARABIC_DIGITS : false

/**
 * دالة مساعدة لتنسيق العملات والأرقام والتواريخ حسب لغة الواجهة
 * Localization formatting hook with Intl and Latin numerals flag
 */
export function useFormat() {
  const { language, isRtl } = useLanguage()

  // استخدام نظام الأرقام اللاتينية (latn) حتى في العربية لمنع ظهور الصفر كنقطة
  const locale = isRtl
    ? ARABIC_DIGITS ? 'ar-EG' : 'ar-EG-u-nu-latn'
    : 'en-US'

  /**
   * تنسيق المبلغ المالي مع رمز العملة الرسمي
   * في العربية: "465 ج.م"
   * في الإنجليزية: "EGP 465"
   * @param {number} amount
   * @param {Object} [options]
   */
  const formatMoney = (amount, options = {}) => {
    const safeAmount = Number(amount) || 0
    const currencyLabel = isRtl ? 'ج.م' : 'EGP'

    try {
      const formattedNumber = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        ...options,
      }).format(safeAmount)

      return isRtl ? `${formattedNumber} ${currencyLabel}` : `${currencyLabel} ${formattedNumber}`
    } catch {
      return isRtl ? `${safeAmount} ${currencyLabel}` : `${currencyLabel} ${safeAmount}`
    }
  }

  /**
   * تنسيق الأرقام القياسية (مثل الكميات وعدد الطلبات) بأرقام لاتينية (0-9)
   */
  const formatNumber = (num, options = {}) => {
    const safeNum = Number(num) || 0
    try {
      return new Intl.NumberFormat(locale, options).format(safeNum)
    } catch {
      return String(safeNum)
    }
  }

  /**
   * تنسيق التاريخ الميلادي الكامل
   * مثال: "2 نوفمبر 2026" في العربية، و "Nov 2, 2026" في الإنجليزية
   */
  const formatDate = (dateValue, options = {}) => {
    if (!dateValue) return ''
    try {
      const d = typeof dateValue === 'string' || typeof dateValue === 'number' ? new Date(dateValue) : dateValue
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
      }).format(d)
    } catch {
      return String(dateValue)
    }
  }

  /**
   * تنسيق الوقت والتاريخ معاً
   */
  const formatDateTime = (dateValue, options = {}) => {
    if (!dateValue) return ''
    try {
      const d = typeof dateValue === 'string' || typeof dateValue === 'number' ? new Date(dateValue) : dateValue
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        ...options,
      }).format(d)
    } catch {
      return String(dateValue)
    }
  }

  /**
   * تنسيق الوقت النسبي (منذ كذا دقيقة/ساعة/يوم)
   */
  const formatRelativeTime = (dateValue) => {
    if (!dateValue) return ''
    try {
      const d = typeof dateValue === 'string' || typeof dateValue === 'number' ? new Date(dateValue) : dateValue
      const now = new Date()
      const diffMs = d.getTime() - now.getTime()
      const diffSec = Math.round(diffMs / 1000)
      const diffMin = Math.round(diffSec / 60)
      const diffHour = Math.round(diffMin / 60)
      const diffDay = Math.round(diffHour / 24)

      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

      if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second')
      if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
      if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')
      if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day')
      return formatDate(d)
    } catch {
      return formatDate(dateValue)
    }
  }

  return {
    locale,
    language,
    isRtl,
    formatMoney,
    formatNumber,
    formatDate,
    formatDateTime,
    formatRelativeTime,
  }
}
