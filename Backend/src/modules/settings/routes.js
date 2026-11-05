import { Router } from 'express'
import { settingsController } from './controller.js'
import { authenticate, authorize, optionalAuth } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'

const router = Router()

// Public settings & shipping rates
router.get('/public', settingsController.getPublicSettings)
router.get('/shipping-rates', settingsController.getShippingRates)

// Role-scoped settings: seller & admin get commissionRate & payoutScheduleText
router.get('/', optionalAuth, settingsController.getSettings)

// Admin settings updates (B4)
router.put('/', authenticate, authorize('admin'), csrfGuard, settingsController.updateSettings)
router.patch('/', authenticate, authorize('admin'), csrfGuard, settingsController.updateSettings)

router.put('/shipping-rates', authenticate, authorize('admin'), csrfGuard, settingsController.updateShippingRates)
router.patch('/shipping-rates', authenticate, authorize('admin'), csrfGuard, settingsController.updateShippingRates)

export default router
