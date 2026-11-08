import { Notification } from '../../db/models/Notification.js'
import { User } from '../../db/models/User.js'
import { Setting } from '../../db/models/Setting.js'
import { registerNotificationListeners } from './listeners.js'

const inFlightDedup = new Set()

/**
 * Fixed Notifications Infrastructure Interface
 */
export const notifications = {
  /**
   * Clears in-flight deduplication set (used by tests)
   */
  clearDedup() {
    inFlightDedup.clear()
  },

  /**
   * Emits/persists an in-app notification.
   *
   * @param {string|null} userId - Specific recipient, or null for role broadcast
   * @param {Object} options
   * @param {'order'|'payment'|'payout'|'custom_request'|'system'|'shipping'} options.type
   * @param {string|Object} [options.title]
   * @param {string|Object} [options.message]
   * @param {Object} [options.params]
   * @param {string} [options.link]
   * @param {string} [options.dedupKey] - De-duplication key
   * @param {'customer'|'seller'|'admin'} [options.role='customer']
   * @returns {Promise<Object>} Created notification document
   */
  async notify(userId, { type, title = '', message = '', params = {}, link = '', role = 'customer', dedupKey = null } = {}) {
    try {
      // 0. Check Setting inSiteNotifications global toggle
      if (Setting && typeof Setting.findOne === 'function') {
        const setting = await Setting.findOne({ singletonKey: 'platform_settings' })
        if (setting && setting.inSiteNotifications === false) {
          console.info('[NOTIFICATION] Skipped: inSiteNotifications global toggle is off in Setting')
          return null
        }
      }

      // 1. Check recipient user preferences if specific userId is provided
      if (userId && User && typeof User.findById === 'function') {
        const recipient = await User.findById(userId)
        if (recipient && recipient.notificationPrefs && recipient.notificationPrefs.inApp === false) {
          console.info(`[NOTIFICATION] Skipped for user ${userId}: disabled in notificationPrefs.inApp`)
          return null
        }
      }

      // 2. Check de-duplication key
      const resolvedDedupKey = dedupKey || (userId && type && params?.orderNumber
        ? `${userId}:${type}:${params.orderNumber}:${params.status || ''}`
        : null)

      if (resolvedDedupKey) {
        if (inFlightDedup.has(resolvedDedupKey)) {
          console.info(`[NOTIFICATION] Skipped in-flight duplicate notification: ${resolvedDedupKey}`)
          return null
        }
        inFlightDedup.add(resolvedDedupKey)

        if (Notification && typeof Notification.findOne === 'function') {
          const existing = await Notification.findOne({ dedupKey: resolvedDedupKey })
          if (existing) {
            console.info(`[NOTIFICATION] Skipped duplicate notification: ${resolvedDedupKey}`)
            return existing
          }
        }
      }

      // Format title and message if bilingual objects were passed
      const titleStr = typeof title === 'object' && title !== null ? (title.ar || title.en || '') : String(title || '')
      const messageStr = typeof message === 'object' && message !== null ? (message.ar || message.en || '') : String(message || '')

      if (Notification && typeof Notification.create === 'function') {
        try {
          const notif = await Notification.create({
            userId: userId || null,
            role,
            type,
            title: titleStr,
            message: messageStr,
            params: {
              ...params,
              rawTitle: typeof title === 'object' ? title : undefined,
              rawMessage: typeof message === 'object' ? message : undefined,
            },
            link,
            dedupKey: resolvedDedupKey || undefined,
            read: false,
          })
          return notif
        } catch (err) {
          if (err.code === 11000) {
            console.info(`[NOTIFICATION] Duplicate prevented by unique index: ${resolvedDedupKey}`)
            return await Notification.findOne({ dedupKey: resolvedDedupKey })
          }
          throw err
        }
      }
    } catch (e) {
      console.warn('[NOTIFICATION] Failed to persist notification:', e.message)
    }

    return {
      id: `notif_${Date.now()}`,
      userId,
      role,
      type,
      title: typeof title === 'object' ? title.ar : title,
      message: typeof message === 'object' ? message.ar : message,
      params,
      link,
      read: false,
      createdAt: new Date().toISOString(),
    }
  },

  registerNotificationListeners,
}

// Automatically register listeners on module load
registerNotificationListeners()

export { registerNotificationListeners }
export default notifications
