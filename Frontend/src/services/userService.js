import { db } from '../mocks/db'
import { delay } from '../utils'

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('lh_current_user'))
    return user ? user.id : null
  } catch {
    return null
  }
}

/**
 * خدمة المستخدم للعميلات (المفضلات، العناوين)
 */
export const userService = {
  async getFavorites() {
    await delay(250)
    const userId = getCurrentUserId()
    if (!userId) return []
    const favIds = db.data.favorites[userId] || []
    return db.data.products.filter((p) => favIds.includes(p.id))
  },

  async toggleFavorite(productId) {
    await delay(200)
    const userId = getCurrentUserId()
    if (!userId) throw new Error('ERR_UNAUTHENTICATED')
    if (!db.data.favorites[userId]) {
      db.data.favorites[userId] = []
    }

    const index = db.data.favorites[userId].indexOf(productId)
    let isFavorite

    if (index > -1) {
      db.data.favorites[userId].splice(index, 1)
      isFavorite = false
    } else {
      db.data.favorites[userId].push(productId)
      isFavorite = true
    }

    db.save()
    return { productId, isFavorite }
  },

  async getAddresses() {
    await delay(250)
    const userId = getCurrentUserId()
    if (!userId) return []
    return db.data.addresses[userId] || []
  },

  async saveAddress(addressData) {
    await delay(350)
    const userId = getCurrentUserId()
    if (!userId) throw new Error('ERR_UNAUTHENTICATED')
    if (!db.data.addresses[userId]) {
      db.data.addresses[userId] = []
    }

    if (addressData.id) {
      const index = db.data.addresses[userId].findIndex((a) => a.id === addressData.id)
      if (index > -1) {
        db.data.addresses[userId][index] = { ...addressData }
      }
    } else {
      const newAddress = {
        ...addressData,
        id: `addr_${Date.now()}`,
        isDefault: db.data.addresses[userId].length === 0,
      }
      db.data.addresses[userId].push(newAddress)
    }

    db.save()
    return db.data.addresses[userId]
  },

  async deleteAddress(id) {
    await delay(300)
    const userId = getCurrentUserId()
    if (db.data.addresses[userId]) {
      db.data.addresses[userId] = db.data.addresses[userId].filter((a) => a.id !== id)
      db.save()
    }
    return { success: true }
  },
}
