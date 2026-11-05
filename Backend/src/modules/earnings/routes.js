import { Router } from 'express'
import { earningsController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'

const router = Router()

// Seller private earnings & overview (B4)
router.get('/seller/overview', authenticate, authorize('seller'), earningsController.getSellerOverview)
router.get('/seller/earnings', authenticate, authorize('seller'), earningsController.getSellerEarnings)
router.get('/seller/payouts', authenticate, authorize('seller'), earningsController.getPayouts)
router.get('/seller', authenticate, authorize('seller'), earningsController.getSellerOverview)
router.get('/overview', authenticate, authorize('seller'), earningsController.getSellerOverview)
router.get('/earnings', authenticate, authorize('seller'), earningsController.getSellerEarnings)

// Admin earnings & payouts
router.get('/admin', authenticate, authorize('admin'), earningsController.getAdminOverview)
router.get('/sellers', authenticate, authorize('admin'), earningsController.getSellersEarnings)
router.get('/payouts', authenticate, authorize('seller', 'admin'), earningsController.getPayouts)
router.post('/payouts', authenticate, authorize('admin'), csrfGuard, earningsController.recordPayout)

export default router
