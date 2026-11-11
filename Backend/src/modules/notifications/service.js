import mongoose from 'mongoose'
import { Notification } from '../../db/models/Notification.js'
import { AppError } from '../../utils/appError.js'
import { toNotificationDTO } from './dto.js'
import { registerNotificationListeners } from '../../infra/notifications/index.js'

// Ensure event listeners are attached
registerNotificationListeners()

/**
 * Builds user-isolated query filter for notifications.
 * A user can only see notifications assigned to their specific userId or broadcast to their role.
 */
function buildUserFilter(user) {
  const userId = user._id || user.id
  return {
    $or: [
      { userId },
      { userId: null, role: user.role },
    ],
  }
}

export const notificationService = {
  /**
   * Retrieves paginated notifications for the authenticated user.
   *
   * @param {Object} user - Authenticated user
   * @param {Object} query - Validated query parameters
   * @param {string} [lang='ar'] - Accept-Language
   * @returns {Promise<{ items: Object[], total: number, page: number, pageSize: number }>}
   */
  async getNotifications(user, query = {}, lang = 'ar') {
    const filter = buildUserFilter(user)

    if (query.type) {
      filter.type = query.type
    }
    if (query.unread === true) {
      filter.read = false
    }

    const page = Math.max(1, query.page || 1)
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 12))
    const skip = (page - 1) * pageSize

    const [total, items] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
    ])

    return {
      items: items.map((item) => toNotificationDTO(item, lang)),
      total,
      page,
      pageSize,
    }
  },

  /**
   * Gets the unread notifications count for the authenticated user.
   *
   * @param {Object} user
   * @returns {Promise<{ count: number }>}
   */
  async getUnreadCount(user) {
    const filter = {
      ...buildUserFilter(user),
      read: false,
    }

    const count = await Notification.countDocuments(filter)
    return { count }
  },

  /**
   * Marks a single notification as read (Owner-only with object-level authorization).
   * Returns 404 for resources caller does not own.
   *
   * @param {Object} user
   * @param {string} notificationId
   * @param {string} [lang='ar']
   * @returns {Promise<Object>}
   */
  async markRead(user, notificationId, lang = 'ar') {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError('NOT_FOUND', 404)
    }

    const notif = await Notification.findById(notificationId)
    if (!notif) {
      throw new AppError('NOT_FOUND', 404)
    }

    // Object-level authorization check: caller must own the notification
    const userId = user._id ? user._id.toString() : user.id?.toString()
    const notifUserId = notif.userId ? notif.userId.toString() : null

    const isDirectOwner = notifUserId && notifUserId === userId
    const isRoleOwner = !notifUserId && notif.role === user.role

    if (!isDirectOwner && !isRoleOwner) {
      // Return 404 (not 403) for resources caller does not own
      throw new AppError('NOT_FOUND', 404)
    }

    if (!notif.read) {
      notif.read = true
      notif.readAt = new Date()
      await notif.save()
    }

    return toNotificationDTO(notif, lang)
  },

  /**
   * Marks all notifications for the authenticated user as read.
   *
   * @param {Object} user
   * @returns {Promise<{ count: number }>}
   */
  async markAllRead(user) {
    const filter = {
      ...buildUserFilter(user),
      read: false,
    }

    const result = await Notification.updateMany(filter, {
      $set: {
        read: true,
        readAt: new Date(),
      },
    })

    return { count: result.modifiedCount || 0 }
  },

  /**
   * Deletes a single notification (Owner-only with object-level authorization).
   * Returns 404 for notifications caller does not own.
   *
   * @param {Object} user
   * @param {string} notificationId
   * @returns {Promise<{ success: boolean, id: string }>}
   */
  async deleteNotification(user, notificationId) {
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw new AppError('NOT_FOUND', 404)
    }

    const notif = await Notification.findById(notificationId)
    if (!notif) {
      throw new AppError('NOT_FOUND', 404)
    }

    const userId = user._id ? user._id.toString() : user.id?.toString()
    const notifUserId = notif.userId ? notif.userId.toString() : null

    const isDirectOwner = notifUserId && notifUserId === userId
    const isRoleOwner = !notifUserId && notif.role === user.role

    if (!isDirectOwner && !isRoleOwner) {
      throw new AppError('NOT_FOUND', 404)
    }

    await Notification.deleteOne({ _id: notif._id })
    return { success: true, id: notificationId }
  },

  /**
   * Deletes notifications for user (all, or read-only when readOnly=true).
   *
   * @param {Object} user
   * @param {{ readOnly?: boolean }} options
   * @returns {Promise<{ success: boolean, count: number }>}
   */
  async deleteNotifications(user, { readOnly = false } = {}) {
    const filter = {
      ...buildUserFilter(user),
    }
    if (readOnly) {
      filter.read = true
    }

    const result = await Notification.deleteMany(filter)
    return { success: true, count: result.deletedCount || 0 }
  },
}

export default notificationService
