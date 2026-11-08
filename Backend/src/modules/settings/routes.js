import { Router } from 'express'
import { settingsController } from './controller.js'
import { optionalAuth } from '../../middlewares/auth.js'

const router = Router()

// Canonical routes:
// settings: GET /settings/public, GET /settings, GET /settings/shipping-rates

// Public settings & shipping rates
router.get('/public', settingsController.getPublicSettings)
router.get('/shipping-rates', settingsController.getShippingRates)

// Role-scoped settings: seller & admin get commissionRate & payoutScheduleText
router.get('/', optionalAuth, settingsController.getSettings)

export default router
