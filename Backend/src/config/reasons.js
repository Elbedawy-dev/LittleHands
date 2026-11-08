/**
 * Canonical dictionary mapping internal reason codes to localized human-readable sentences.
 * Used across emails and in-app notifications so internal codes never reach customers.
 */

export const REASON_DICTIONARY = {
  // Payment Rejection Reasons
  amount_mismatch: {
    ar: 'المبلغ المحول في الإيصال غير مطابق لإجمالي الطلب',
    en: 'Transferred amount does not match the order total',
  },
  receipt_unclear: {
    ar: 'صورة إيصال التحويل غير واضحة أو غير مقروءة',
    en: 'The payment receipt image is unclear or unreadable',
  },
  wrong_wallet: {
    ar: 'تم التحويل إلى رقم محفظة غير صحيح',
    en: 'Transferred to an incorrect wallet number',
  },
  wallet_incorrect: {
    ar: 'تم التحويل إلى رقم محفظة غير صحيح',
    en: 'Transferred to an incorrect wallet number',
  },
  other: {
    ar: 'بيانات التحويل غير مطابقة للشروط المحددة',
    en: 'Payment details did not meet requirements',
  },

  // Order Cancellation Reasons
  EXPIRED_UNPAID: {
    ar: 'انتهت مهلة الدفع دون إرسال إيصال',
    en: 'The payment window expired without a receipt',
  },
  expired_unpaid: {
    ar: 'انتهت مهلة الدفع دون إرسال إيصال',
    en: 'The payment window expired without a receipt',
  },
  CUSTOMER_CANCELLED: {
    ar: 'تم الإلغاء بناءً على طلبكِ',
    en: 'Cancelled upon your request',
  },
  customer_cancelled: {
    ar: 'تم الإلغاء بناءً على طلبكِ',
    en: 'Cancelled upon your request',
  },
  ADMIN_CANCELLED: {
    ar: 'تم إلغاء الطلب من قبل الإدارة',
    en: 'Order cancelled by platform administration',
  },
  admin_cancelled: {
    ar: 'تم إلغاء الطلب من قبل الإدارة',
    en: 'Order cancelled by platform administration',
  },
  OUT_OF_STOCK: {
    ar: 'نفدت الكمية المتاحة من الوسيلة التعليمية',
    en: 'Selected teaching aid is currently out of stock',
  },
  out_of_stock: {
    ar: 'نفدت الكمية المتاحة من الوسيلة التعليمية',
    en: 'Selected teaching aid is currently out of stock',
  },
}

/**
 * Returns a friendly sentence for a reason code in the specified language.
 * If the reason is not in the dictionary (e.g. custom admin free-text note),
 * returns the string as typed.
 *
 * @param {string} reasonCode - Code (e.g. EXPIRED_UNPAID, amount_mismatch) or free-text
 * @param {'ar'|'en'} [locale='ar'] - Language
 * @returns {string} Human-readable reason sentence
 */
export function getFriendlyReason(reasonCode, locale = 'ar') {
  if (!reasonCode || typeof reasonCode !== 'string') return ''
  const trimmed = reasonCode.trim()
  const entry =
    REASON_DICTIONARY[trimmed] ||
    REASON_DICTIONARY[trimmed.toLowerCase()] ||
    REASON_DICTIONARY[trimmed.toUpperCase()]
  if (entry) {
    const lang = locale && locale.toLowerCase().startsWith('en') ? 'en' : 'ar'
    return entry[lang] || entry.ar || trimmed
  }
  return trimmed
}

export default { REASON_DICTIONARY, getFriendlyReason }

