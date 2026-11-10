/**
 * Localized System Messages and Error Codes
 * Default language: Arabic ('ar'), with fallback to English ('en')
 */

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: {
    ar: 'بيانات الإدخال غير صالحة',
    en: 'Validation failed for request data',
  },
  UNAUTHENTICATED: {
    ar: 'يرجى تسجيل الدخول أولاً',
    en: 'Authentication required. Please log in.',
  },
  ERR_UNAUTHENTICATED: {
    ar: 'يرجى تسجيل الدخول أولاً',
    en: 'Authentication required. Please log in.',
  },
  FORBIDDEN: {
    ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
    en: 'You do not have permission to perform this action',
  },
  ERR_UNAUTHORIZED: {
    ar: 'ليس لديك صلاحية لتنفيذ هذا الإجراء',
    en: 'You do not have permission to perform this action',
  },
  NOT_FOUND: {
    ar: 'العنصر المطلوب غير موجود',
    en: 'Requested resource not found',
  },
  PAYOUT_EXCEEDS_DUE: {
    ar: 'مبلغ التحويل يتجاوز المستحق للبائعة',
    en: "Payout amount exceeds the seller's due balance",
  },
  ERR_NOT_FOUND: {
    ar: 'العنصر المطلوب غير موجود',
    en: 'Requested resource not found',
  },
  CONFLICT: {
    ar: 'البيانات المدخلة موجودة بالفعل وتتعارض مع البيانات الحالية',
    en: 'Resource conflict. The record already exists.',
  },
  BAD_REQUEST: {
    ar: 'طلب غير صالح',
    en: 'Bad request',
  },
  RATE_LIMITED: {
    ar: 'تجاوزت الحد المسموح من الطلبات، يرجى الانتظار قليلاً',
    en: 'Too many requests. Please slow down and try again later.',
  },
  TOO_MANY_REQUESTS: {
    ar: 'تجاوزت الحد المسموح من المحاولات، يرجى الانتظار والمحاولة لاحقاً',
    en: 'Too many requests. Please try again later.',
  },
  ACCOUNT_LOCKED: {
    ar: 'تم قفل الحساب مؤقتاً بسبب تكرار المحاولات غير الصحيحة. يرجى المحاولة بعد 15 دقيقة',
    en: 'Account is temporarily locked due to failed attempts. Try again after 15 minutes.',
  },
  ACCOUNT_SUSPENDED: {
    ar: 'تم إيقاف هذا الحساب. يرجى التواصل مع الإدارة',
    en: 'This account has been suspended. Please contact support.',
  },
  EMAIL_NOT_VERIFIED: {
    ar: 'يرجى تأكيد البريد الإلكتروني للمتابعة',
    en: 'Please verify your email address to continue.',
  },
  INVALID_CREDENTIALS: {
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    en: 'Invalid email or password.',
  },
  ERR_INVALID_PASSWORD: {
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    en: 'Invalid email or password.',
  },
  ERR_USER_NOT_FOUND: {
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    en: 'Invalid email or password.',
  },
  ERR_EMAIL_NOT_FOUND: {
    ar: 'البريد الإلكتروني غير مسجل بالمنصة',
    en: 'Email address not found.',
  },
  EMAIL_EXISTS: {
    ar: 'البريد الإلكتروني مسجل بالفعل',
    en: 'Email is already registered.',
  },
  ERR_EMAIL_EXISTS: {
    ar: 'البريد الإلكتروني مسجل بالفعل',
    en: 'Email is already registered.',
  },
  PHONE_EXISTS: {
    ar: 'رقم الهاتف مسجل بالفعل',
    en: 'Phone number is already registered.',
  },
  ERR_PHONE_EXISTS: {
    ar: 'رقم الهاتف مسجل بالفعل',
    en: 'Phone number is already registered.',
  },
  INVALID_CODE: {
    ar: 'رمز التحقق غير صحيح',
    en: 'Invalid verification code.',
  },
  ERR_INVALID_CODE: {
    ar: 'رمز التحقق غير صحيح',
    en: 'Invalid verification code.',
  },
  EXPIRED_CODE: {
    ar: 'رمز التحقق منتهي الصلاحية',
    en: 'Verification code has expired.',
  },
  CODE_MAX_ATTEMPTS: {
    ar: 'تم استنفاد الحد الأقصى لمحاولات إدخال الرمز',
    en: 'Maximum verification attempts exceeded. Please request a new code.',
  },
  CSRF_ERROR: {
    ar: 'فشل التحقق الأمني من مصدر الطلب (CSRF)',
    en: 'CSRF security verification failed.',
  },
  INVALID_FILE_TYPE: {
    ar: 'نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, WEBP فقط',
    en: 'Unsupported file type. Only JPEG, PNG, and WEBP are allowed.',
  },
  FILE_TOO_LARGE: {
    ar: 'حجم الملف يتجاوز الحد الأقصى المسموح (5 ميجابايت)',
    en: 'File size exceeds maximum allowed limit (5MB).',
  },
  ORDER_NOT_FOUND: {
    ar: 'الطلب غير موجود',
    en: 'Order not found.',
  },
  ERR_ORDER_NOT_FOUND: {
    ar: 'الطلب غير موجود',
    en: 'Order not found.',
  },
  ORDER_NOT_DELETABLE: {
    ar: 'لا يمكن حذف الطلب المدفوع؛ يجب إلغاء الطلب واسترداد مبلغه أولاً',
    en: 'Paid orders cannot be deleted; the order must be cancelled and refunded first.',
  },
  PAYMENT_REQUIRED: {
    ar: 'لا يمكن اتخاذ هذا الإجراء قبل تأكيد الدفع من الإدارة',
    en: 'Action requires confirmed payment.',
  },
  ERR_PAYMENT_REQUIRED: {
    ar: 'لا يمكن اتخاذ هذا الإجراء قبل تأكيد الدفع من الإدارة',
    en: 'Action requires confirmed payment.',
  },
  RECEIPT_NOT_FOUND: {
    ar: 'لا يوجد إيصال دفع مرفق مع هذا الطلب',
    en: 'No payment receipt found for this order.',
  },
  ERR_RECEIPT_NOT_FOUND: {
    ar: 'لا يوجد إيصال دفع مرفق مع هذا الطلب',
    en: 'No payment receipt found for this order.',
  },
  PRODUCT_NOT_FOUND: {
    ar: 'الوسيلة التعليمية غير موجودة',
    en: 'Product not found.',
  },
  ERR_PRODUCT_NOT_FOUND: {
    ar: 'الوسيلة التعليمية غير موجودة',
    en: 'Product not found.',
  },
  CATEGORY_NOT_FOUND: {
    ar: 'التصنيف غير موجود',
    en: 'Category not found.',
  },
  ERR_CATEGORY_NOT_FOUND: {
    ar: 'التصنيف غير موجود',
    en: 'Category not found.',
  },
  SELLER_NOT_FOUND: {
    ar: 'حساب البائعة غير موجود',
    en: 'Seller not found.',
  },
  ERR_SELLER_NOT_FOUND: {
    ar: 'حساب البائعة غير موجود',
    en: 'Seller not found.',
  },
  INSUFFICIENT_STOCK: {
    ar: 'الكمية المطلوبة غير متوفرة في المخزون',
    en: 'Insufficient stock available for this product.',
  },
  FORBIDDEN_CONTENT: {
    ar: 'المحتوى يحتوي على كلمات أو مصطلحات محظورة بالمنصة',
    en: 'Content contains prohibited terms or claims.',
  },
  CANNOT_CANCEL_ORDER: {
    ar: 'لا يمكن إلغاء الطلب في حالته الحالية',
    en: 'Order cannot be cancelled in its current state.',
  },
  NOT_IMPLEMENTED: {
    ar: 'هذه الخدمة قيد التطوير ولم تُفعل بعد',
    en: 'This endpoint is not implemented yet.',
  },
  CUSTOM_REQUEST_ALREADY_CLAIMED: {
    ar: 'سبقتك بائعة أخرى لاستلام هذا الطلب',
    en: 'Another seller has already claimed this custom request',
  },
  CUSTOM_REQUEST_NOT_AVAILABLE: {
    ar: 'هذا الطلب لم يعد متاحاً للاستلام',
    en: 'This custom request is no longer available',
  },
  INTERNAL_SERVER_ERROR: {
    ar: 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً',
    en: 'An unexpected internal server error occurred.',
  },
}

export function getErrorMessage(code, lang = 'ar') {
  const normLang = lang && lang.toLowerCase().startsWith('en') ? 'en' : 'ar'
  const entry = ERROR_MESSAGES[code]
  if (entry) {
    return entry[normLang] || entry.ar || code
  }
  return code
}

export { REASON_DICTIONARY, getFriendlyReason } from './reasons.js'


