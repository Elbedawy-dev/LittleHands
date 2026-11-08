import { Router } from 'express'
import { earningsController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'

const router = Router()

// Canonical routes:
// earnings/admin: seller: GET /earnings/seller/overview, /earnings/seller/earnings, /earnings/seller/payouts

router.get('/seller/overview', authenticate, authorize('seller'), earningsController.getSellerOverview)
router.get('/seller/earnings', authenticate, authorize('seller'), earningsController.getSellerEarnings)
router.get('/seller/payouts', authenticate, authorize('seller'), earningsController.getPayouts)

export default router
