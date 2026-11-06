import { Router } from 'express'
import { earningsController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'

const router = Router()

// Seller (her own data only)
router.get('/seller', authenticate, authorize('seller'), earningsController.getSellerOverview)
router.get('/seller/overview', authenticate, authorize('seller'), earningsController.getSellerOverview)
router.get('/seller/earnings', authenticate, authorize('seller'), earningsController.getSellerEarnings)
router.get('/seller/payouts', authenticate, authorize('seller'), earningsController.getPayouts)

// Admin
router.get('/admin', authenticate, authorize('admin'), earningsController.getAdminOverview)
router.get('/sellers', authenticate, authorize('admin'), earningsController.getSellersEarnings)

// Payout history (seller: own only, admin: optional ?sellerId)
router.get('/payouts', authenticate, authorize('seller', 'admin'), earningsController.getPayouts)

export default router
