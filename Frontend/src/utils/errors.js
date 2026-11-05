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
  ERR_CATEGORY_NOT_FOUND: 'common:status.error',
  ERR_PRODUCT_NOT_FOUND: 'common:status.error',
  ERR_ORDER_NOT_FOUND: 'common:status.error',
  ERR_SELLER_NOT_FOUND: 'common:status.error',
  ERR_NOT_FOUND: 'common:status.empty',
  ERR_UNAUTHORIZED: 'auth:errors.ERR_UNAUTHENTICATED',
}

/**
 * تحويل أكواد الأخطاء إلى نصوص مترجمة بحسب لغة واجهة المستخدم
 */
export function formatErrorMessage(err) {
  if (!err) return i18n.t('common:status.error')
  const code = typeof err === 'string' ? err : err.message || ''
  if (ERROR_MAP[code]) {
    return i18n.t(ERROR_MAP[code])
  }
  return code || i18n.t('common:status.error')
}

