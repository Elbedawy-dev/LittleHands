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

  /**
   * Saves a private activity notification for the actor who performed a mutation,
   * aggregating identical repeated actions by the same actor within 60 seconds.
   */
  async notifyActor({
    userId,
    role = 'customer',
    actionKey,
    title = { ar: '', en: '' },
    message = { ar: '', en: '' },
    link = '',
    params = {},
    windowMs = 60_000,
  } = {}) {
    if (!userId || !actionKey) return null

    try {
      const setting = await Setting.findOne().select('inSiteNotifications').lean()
      if (setting && setting.inSiteNotifications === false) {
        return null
      }

      const user = await User.findById(userId).select('notificationPrefs role').lean()
      if (!user) return null
      if (user.notificationPrefs && user.notificationPrefs.inApp === false) {
        return null
      }

      const allowedRoles = ['customer', 'seller', 'admin']
      const targetRole = allowedRoles.includes(role)
        ? role
        : (allowedRoles.includes(user.role) ? user.role : 'customer')

      const baseTitle = normalizeBilingual(title)
      const baseMessage = normalizeBilingual(message)
      const resolvedLink =
        typeof link === 'string' && link.startsWith('/') ? link : defaultActivityLink(targetRole)

      const lockKey = `${userId.toString()}:${actionKey}`

      return await withActorActionLock(lockKey, async () => {
        const safeWindowMs = Number(windowMs) > 0 ? Number(windowMs) : 60_000
        const cutoff = new Date(Date.now() - safeWindowMs)

        const existing = await Notification.findOne({
          userId,
          type: 'activity',
          'params.actionKey': actionKey,
          createdAt: { $gte: cutoff },
        }).sort({ createdAt: -1 })

        if (existing) {
          const prevCount = Number(existing.params?.repeatCount || 1)
          const repeatCount = prevCount + 1
          const storedBaseTitle = normalizeBilingual(existing.params?.baseTitle || baseTitle)
          const storedBaseMessage = normalizeBilingual(existing.params?.baseMessage || baseMessage)

          const aggTitle = {
            ar: storedBaseTitle.ar,
            en: storedBaseTitle.en,
          }
          const aggMessage = {
            ar: `${storedBaseMessage.ar} (×${repeatCount})`,
            en: `${storedBaseMessage.en} (×${repeatCount})`,
          }

          existing.title = aggTitle.ar
          existing.message = aggMessage.ar
          existing.link = resolvedLink || existing.link
          existing.read = false
          existing.readAt = null
          existing.params = {
            ...(existing.params || {}),
            ...(params || {}),
            actionKey,
            repeatCount,
            baseTitle: storedBaseTitle,
            baseMessage: storedBaseMessage,
            rawTitle: aggTitle,
            rawMessage: aggMessage,
          }
          existing.markModified('params')
          await existing.save()
          return existing
        }

        return await Notification.create({
          userId,
          role: targetRole,
          type: 'activity',
          title: baseTitle.ar,
          message: baseMessage.ar,
          params: {
            ...(params || {}),
            actionKey,
            repeatCount: 1,
            baseTitle,
            baseMessage,
            rawTitle: baseTitle,
            rawMessage: baseMessage,
          },
          link: resolvedLink,
          read: false,
        })
      })
    } catch (err) {
      console.error('[NOTIFICATION] Failed to save actor activity notification:', err.message)
      return null
    }
  },

  registerNotificationListeners,
}

const actorActionMutexes = new Map()

function withActorActionLock(lockKey, fn) {
  const prev = actorActionMutexes.get(lockKey) || Promise.resolve()
  const run = prev.catch(() => {}).then(fn)
  const tracked = run.finally(() => {
    if (actorActionMutexes.get(lockKey) === tracked) {
      actorActionMutexes.delete(lockKey)
    }
  })
  actorActionMutexes.set(lockKey, tracked)
  return run
}

function normalizeBilingual(value, fallback = '') {
  if (value && typeof value === 'object') {
    return {
      ar: String(value.ar || value.en || fallback || '').trim(),
      en: String(value.en || value.ar || fallback || '').trim(),
    }
  }
  const str = String(value || fallback || '').trim()
  return { ar: str, en: str }
}

function defaultActivityLink(role) {
  if (role === 'admin') return '/admin/notifications'
  if (role === 'seller') return '/seller/notifications'
  return '/notifications'
}

// Automatically register listeners on module load
registerNotificationListeners()

export { registerNotificationListeners }
export default notifications
