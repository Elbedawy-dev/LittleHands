import { db } from '../mocks/db'
import { delay } from '../utils'

const CURRENT_USER_KEY = 'lh_current_user'

/**
 * خدمة المصادقة وتوثيق المستخدمين
 */
export const authService = {
  async login({ identifier, password }) {
    await delay(350)
    const cleanId = (identifier || '').trim().toLowerCase()

    // فحص المستخدمين التجريبيين
    const user = db.data.users.find(
      (u) => u.email.toLowerCase() === cleanId || u.phone === cleanId
    )

    if (!user) {
      throw new Error('ERR_USER_NOT_FOUND')
    }

    if (password !== '123456' && password !== 'admin123') {
      throw new Error('ERR_INVALID_PASSWORD')
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    localStorage.setItem('lh_auth_token', `mock_token_${user.id}`)
    return { user, token: `mock_token_${user.id}` }
  },

  async register(data) {
    await delay(400)
    const cleanEmail = (data.email || '').trim().toLowerCase()

    const exists = db.data.users.some((u) => u.email.toLowerCase() === cleanEmail)
    if (exists) {
      throw new Error('ERR_EMAIL_EXISTS')
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: cleanEmail,
      phone: data.phone,
      role: data.role || 'customer',
      nurseryName: data.nurseryName || '',
      governorate: data.governorate || 'القاهرة',
      city: data.city || '',
      address: data.address || '',
      createdAt: new Date().toISOString(),
    }

    db.data.users.push(newUser)
    db.save()

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser))
    localStorage.setItem('lh_auth_token', `mock_token_${newUser.id}`)
    return { user: newUser, token: `mock_token_${newUser.id}` }
  },

  async logout() {
    await delay(200)
    localStorage.removeItem(CURRENT_USER_KEY)
    localStorage.removeItem('lh_auth_token')
    return { success: true }
  },

  async me() {
    await delay(150)
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY)
      if (!stored) return null
      const parsed = JSON.parse(stored)
      // تزامن مع بيانات قاعدة البيانات إن وجد تحديث
      const fresh = db.data.users.find((u) => u.id === parsed.id)
      return fresh || parsed
    } catch {
      return null
    }
  },

  async forgotPassword(email) {
    await delay(350)
    const user = db.data.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase())
    if (!user) {
      throw new Error('ERR_EMAIL_NOT_FOUND')
    }
    return { success: true }
  },

  async verifyEmail(code) {
    await delay(350)
    if (code && code.length >= 4) {
      return { success: true, verified: true }
    }
    throw new Error('ERR_INVALID_CODE')
  },

  async resendCode() {
    await delay(300)
    return { success: true }
  },

  async updateProfile(data) {
    await delay(350)
    const stored = localStorage.getItem(CURRENT_USER_KEY)
    if (!stored) throw new Error('ERR_UNAUTHENTICATED')
    const current = JSON.parse(stored)

    const index = db.data.users.findIndex((u) => u.id === current.id)
    if (index === -1) throw new Error('ERR_USER_NOT_FOUND')

    const updated = { ...db.data.users[index], ...data }
    db.data.users[index] = updated
    db.save()

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated))
    return updated
  },

  async changePassword({ current, next }) {
    await delay(350)
    if (!current || !next) throw new Error('ERR_REQUIRED_FIELDS')
    if (next.length < 6) throw new Error('ERR_PASSWORD_LENGTH')
    return { success: true }
  },
}

