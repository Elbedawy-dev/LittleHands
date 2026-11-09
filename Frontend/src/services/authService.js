import apiClient from './api.js'

/**
 * خدمة المصادقة وتوثيق المستخدمين عبر المسارات الرسمية للباك إند
 */
export const authService = {
  /**
   * تسجيل الدخول بالبريد الإلكتروني أو رقم الهاتف مع كلمة المرور
   * POST /auth/login
   */
  async login({ identifier, password }) {
    const res = await apiClient.post('/auth/login', {
      identifier: (identifier || '').trim(),
      password,
    })
    // res is unwrapped to { user }
    return res
  },

  /**
   * تسجيل حساب عميل جديد
   * POST /auth/register
   */
  async register(data) {
    const payload = {
      name: data.name?.trim(),
      email: data.email?.trim().toLowerCase(),
      phone: data.phone?.trim(),
      password: data.password,
      nurseryName: data.nurseryName?.trim() || '',
      governorate: data.governorate?.trim() || 'القاهرة',
      city: data.city?.trim() || '',
      address: data.address?.trim() || '',
    }
    const res = await apiClient.post('/auth/register', payload)
    return res
  },

  /**
   * تسجيل الخروج وإلغاء صلاحية كوكيز الجلسة
   * POST /auth/logout
   */
  async logout() {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Ignore errors on logout
    }
    return { success: true }
  },

  /**
   * التحقق من المستخدم الحالي وجلب بياناته
   * GET /auth/me
   */
  async me() {
    try {
      const u = res?.user || res
      return u && typeof u === 'object' && u.id ? u : null
    } catch {
      return null
    }
  },

  /**
   * تأكيد البريد الإلكتروني برمز OTP
   * POST /auth/verify-email
   */
  async verifyEmail({ email, code }) {
    const payload = typeof email === 'object' ? email : { email, code }
    const res = await apiClient.post('/auth/verify-email', {
      email: payload.email?.trim().toLowerCase(),
      code: String(payload.code || '').trim(),
    })
    return res
  },

  /**
   * إعادة إرسال رمز التحقق OTP
   * POST /auth/resend-code
   */
  async resendCode({ email }) {
    const res = await apiClient.post('/auth/resend-code', {
      email: (email || '').trim().toLowerCase(),
    })
    return res
  },

  /**
   * طلب رابط استعادة كلمة المرور
   * POST /auth/forgot-password
   */
  async forgotPassword(email) {
    const cleanEmail = typeof email === 'object' ? email.email : email
    const res = await apiClient.post('/auth/forgot-password', {
      email: (cleanEmail || '').trim().toLowerCase(),
    })
    return res
  },

  /**
   * تعيين كلمة مرور جديدة عبر رمز الاستعادة
   * POST /auth/reset-password
   */
  async resetPassword({ token, newPassword }) {
    const res = await apiClient.post('/auth/reset-password', {
      token: (token || '').trim(),
      newPassword,
    })
    return res
  },

  /**
   * تغيير كلمة المرور للمستخدم المسجل
   * POST /auth/change-password
   */
  async changePassword({ currentPassword, current, next, newPassword }) {
    const curr = currentPassword || current
    const nxt = newPassword || next
    const res = await apiClient.post('/auth/change-password', {
      currentPassword: curr,
      newPassword: nxt,
    })
    return res
  },
}

export default authService
