import { Router } from 'express'
import { notificationController } from './controller.js'
import { authenticate } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'

const router = Router()

/**
 * Notifications Routes (Owner: Prompt B5)
 */
router.get('/', authenticate, notificationController.getNotifications)
router.get('/unread-count', authenticate, notificationController.getUnreadCount)
router.patch('/:id/read', authenticate, csrfGuard, notificationController.markRead)
router.post('/read-all', authenticate, csrfGuard, notificationController.markAllRead)
router.delete('/:id', authenticate, csrfGuard, notificationController.deleteNotification)
router.delete('/', authenticate, csrfGuard, notificationController.deleteNotifications)

export default router
