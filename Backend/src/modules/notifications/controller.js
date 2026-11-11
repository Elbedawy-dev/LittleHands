import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, paginated } from '../../utils/response.js'
import { notificationService } from './service.js'
import { getNotificationsQuerySchema, notificationIdParamSchema } from './schemas.js'

function getLocale(req) {
  const header = req.headers['accept-language']
  if (header && header.toLowerCase().startsWith('en')) {
    return 'en'
  }
  return 'ar'
}

export const notificationController = {
  /**
   * GET /api/v1/notifications
   */
  getNotifications: asyncHandler(async (req, res) => {
    const query = getNotificationsQuerySchema.parse(req.query)
    const lang = getLocale(req)
    const result = await notificationService.getNotifications(req.user, query, lang)
    return paginated(res, result)
  }),

  /**
   * GET /api/v1/notifications/unread-count
   */
  getUnreadCount: asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user)
    return ok(res, result)
  }),

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  markRead: asyncHandler(async (req, res) => {
    const params = notificationIdParamSchema.parse(req.params)
    const lang = getLocale(req)
    const result = await notificationService.markRead(req.user, params.id, lang)
    return ok(res, result)
  }),

  /**
   * POST /api/v1/notifications/read-all
   */
  markAllRead: asyncHandler(async (req, res) => {
    const result = await notificationService.markAllRead(req.user)
    return ok(res, result)
  }),

  /**
   * DELETE /api/v1/notifications/:id
   */
  deleteNotification: asyncHandler(async (req, res) => {
    const params = notificationIdParamSchema.parse(req.params)
    const result = await notificationService.deleteNotification(req.user, params.id)
    return ok(res, result)
  }),

  /**
   * DELETE /api/v1/notifications
   */
  deleteNotifications: asyncHandler(async (req, res) => {
    const readOnly = req.query.read === 'true' || req.query.read === true
    const result = await notificationService.deleteNotifications(req.user, { readOnly })
    return ok(res, result)
  }),
}

export default notificationController
