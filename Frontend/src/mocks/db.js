import { CATEGORIES } from '../config/constants'
import {
  INITIAL_NOTIFICATIONS,
  INITIAL_ORDERS,
  INITIAL_PAYOUTS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_USERS,
} from './initialData'

const DB_KEY = 'lh_mock_db_v3'

/**
 * قاعدة بيانات الذاكرة المحلية للمحاكاة (نسخة v3 الداعمة للبيانات الثنائية)
 * Persistent In-Memory Mock Database v3
 */
class MockDatabase {
  constructor() {
    this.data = this.load()
  }

  load() {
    let parsed = null
    try {
      const stored = localStorage.getItem(DB_KEY)
      if (stored) {
        parsed = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('Failed to load mock DB from localStorage:', e)
    }

    return {
      users: parsed?.users || [...INITIAL_USERS],
      products: parsed?.products || [...INITIAL_PRODUCTS],
      categories: parsed?.categories
        ? parsed.categories.map((c) => {
            const def = CATEGORIES.find((dc) => (dc.id || dc.slug) === (c.id || c.slug))
            return {
              ...def,
              ...c,
              descriptionAr: c.descriptionAr || def?.descriptionAr || c.description,
              descriptionEn: c.descriptionEn || def?.descriptionEn || '',
            }
          })
        : [...CATEGORIES],
      orders: parsed?.orders || [...INITIAL_ORDERS],
      payouts: parsed?.payouts || [...INITIAL_PAYOUTS],
      notifications: parsed?.notifications || [...INITIAL_NOTIFICATIONS],
      settings: parsed?.settings ? { ...INITIAL_SETTINGS, ...parsed.settings } : { ...INITIAL_SETTINGS },
      favorites: parsed?.favorites || {},
      addresses: parsed?.addresses || {},
      customRequests: parsed?.customRequests || [],
    }
  }

  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this.data))
    } catch (e) {
      console.warn('Failed to save mock DB to localStorage:', e)
    }
  }

  reset() {
    try {
      localStorage.removeItem('lh_mock_db_v1')
      localStorage.removeItem('lh_mock_db_v2')
      localStorage.removeItem(DB_KEY)
      localStorage.removeItem('lh_current_user')
      localStorage.removeItem('lh_auth_token')
    } catch (e) {
      console.warn('Failed to remove keys from localStorage:', e)
    }
    this.data = this.load()
  }
}

export const db = new MockDatabase()