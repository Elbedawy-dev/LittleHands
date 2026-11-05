import { db } from '../mocks/db'
import { delay } from '../utils'

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('lh_current_user'))
  } catch {
    return null
  }
}

/**
 * خدمة الإشعارات والتنبيهات الموجهة لكل دور
 */
export const notificationService = {
  async getNotifications(role) {
    await delay(250)
    const user = getCurrentUser()
    const targetRole = role || (user ? user.role : 'customer')

    return db.data.notifications.filter((n) => {
      if (n.role !== targetRole) return false
      if (n.userId && user && n.userId !== user.id) return false
      return true
    })
  },

  async markRead(id) {
    await delay(150)
    const notif = db.data.notifications.find((n) => n.id === id)
    if (notif) {
      notif.read = true
      db.save()
    }
    return { success: true }
  },

  async markAllRead(role) {
    await delay(200)
    const user = getCurrentUser()
    const targetRole = role || (user ? user.role : 'customer')

    db.data.notifications.forEach((n) => {
      if (n.role === targetRole) {
        if (!n.userId || (user && n.userId === user.id)) {
          n.read = true
        }
      }
    })
    db.save()
    return { success: true }
  },
}

