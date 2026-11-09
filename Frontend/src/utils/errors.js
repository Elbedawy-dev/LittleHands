import i18n from '../config/i18n'

const ERROR_MAP = {
  ERR_USER_NOT_FOUND: 'auth:errors.ERR_USER_NOT_FOUND',
  ERR_INVALID_PASSWORD: 'auth:errors.ERR_INVALID_PASSWORD',
  ERR_EMAIL_EXISTS: 'auth:errors.ERR_EMAIL_EXISTS',
  ERR_EMAIL_NOT_FOUND: 'auth:errors.ERR_EMAIL_NOT_FOUND',
  ERR_INVALID_CODE: 'auth:errors.ERR_INVALID_CODE',
  ERR_UNAUTHENTICATED: 'auth:errors.ERR_UNAUTHENTICATED',
  ERR_REQUIRED_FIELDS: 'auth:errors.ERR_REQUIRED_FIELDS',
  ERR_PASSWORD_LENGTH: 'auth:errors.ERR_PASSWORD_LENGTH',
  ERR_CATEGORY_NOT_FOUND: 'errors:ERR_CATEGORY_NOT_FOUND',
  ERR_PRODUCT_NOT_FOUND: 'errors:ERR_PRODUCT_NOT_FOUND',
  ERR_ORDER_NOT_FOUND: 'errors:ERR_ORDER_NOT_FOUND',
  ERR_SELLER_NOT_FOUND: 'errors:ERR_SELLER_NOT_FOUND',
  ERR_NOT_FOUND: 'errors:ERR_NOT_FOUND',
  ERR_UNAUTHORIZED: 'auth:errors.ERR_UNAUTHENTICATED',
}

const AXIOS_INTERNAL_CODES = new Set([
  'ERR_NETWORK',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_BAD_RESPONSE',
  'ERR_BAD_REQUEST',
  'ERR_CANCELED',
  'ERR_FR_TOO_MANY_REDIRECTS',
  'ERR_DEPRECATED',
  'ERR_INVALID_URL',
  'ERR_NOT_SUPPORT',
])

const TECHNICAL_ERROR_PATTERN =
  /(is not a function|is not iterable|is not defined|Cannot read|Cannot set|TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|Network Error|Failed to fetch|Load failed|NetworkError|Request failed with status code|timeout of|ECONNABORTED|ERR_NETWORK|ERR_BAD_RESPONSE|ERR_BAD_REQUEST|ERR_CANCELED|ETIMEDOUT|ENOTFOUND|JSON\.parse|Unexpected token|\bundefined\b|\bnull\b|\.map\b|\.filter\b|\.forEach\b|\.reduce\b|\.find\b|\.some\b|\.includes\b|\.slice\b|\.split\b|\.trim\b|at\s+\w+\s*\(|https?:\/\/)/i

/**
 * استخراج رسالة خطأ آمنة ومترجمة للمستخدم دون كشف أي أخطاء برمجية أو تقنية
 *
 * @param {any} err - كائن الخطأ أو كود الخطأ
 * @param {Function} [t] - دالة الترجمة اختيارية
 * @returns {string} رسالة خطأ واضحة ومترجمة
 */
export function getFriendlyError(err, t) {
  const lang = i18n.language || 'ar'
  const fallback = String(lang).startsWith('en')
    ? 'An unexpected error occurred, please try again'
    : 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى'

  const translate = (key, options = {}) => {
    if (typeof t === 'function') {
      const res = t(key, { defaultValue: fallback, ...options })
      if (typeof res === 'string' && res.trim() && res !== key) {
        return res
      }
    }
    return i18n.t(key, { defaultValue: fallback, ...options })
  }

  if (!err) {
    return translate('errors:DEFAULT', { defaultValue: fallback })
  }

  // 1. Check backend or application error code (err.code or err.response.data.error.code or code string)
  const rawCode =
    typeof err === 'string'
      ? err.trim()
      : err?.response?.data?.error?.code ||
        err?.code ||
        (typeof err?.message === 'string' && /^[A-Z][A-Z0-9_]+$/.test(err.message.trim())
          ? err.message.trim()
          : '')

  if (rawCode && !AXIOS_INTERNAL_CODES.has(rawCode) && /^[A-Z][A-Z0-9_]+$/.test(rawCode)) {
    if (i18n.exists(`errors:${rawCode}`)) {
      return i18n.t(`errors:${rawCode}`, { defaultValue: fallback })
    }
    if (ERROR_MAP[rawCode] && i18n.exists(ERROR_MAP[rawCode])) {
      return i18n.t(ERROR_MAP[rawCode], { defaultValue: fallback })
    }
  }

  // 2. Check backend friendlyMessage if safe and non-technical
  if (
    typeof err?.friendlyMessage === 'string' &&
    err.friendlyMessage.trim() &&
    !TECHNICAL_ERROR_PATTERN.test(err.friendlyMessage)
  ) {
    return err.friendlyMessage.trim()
  }

  // 3. Fallback to generic translated message
  return translate('errors:DEFAULT', { defaultValue: fallback })
}

/**
 * تحويل أكواد الأخطاء إلى نصوص مترجمة بحسب لغة واجهة المستخدم
 */
export function formatErrorMessage(err, t) {
  return getFriendlyError(err, t)
}
