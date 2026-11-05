import { Router } from 'express'
import { sellerController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import { sellerProfileSchema, createSellerSchema, updateUserStatusSchema } from '../users/schemas.js'

const router = Router()

// Seller profile management (B1)
router.patch('/profile', authenticate, authorize('seller'), csrfGuard, validate(sellerProfileSchema), sellerController.updateSellerProfile)
router.patch('/me/profile', authenticate, authorize('seller'), csrfGuard, validate(sellerProfileSchema), sellerController.updateSellerProfile)

// Admin management of sellers & user status (B1)
router.post('/admin/create', authenticate, authorize('admin'), csrfGuard, validate(createSellerSchema), sellerController.createSeller)
router.patch('/admin/users/:id/status', authenticate, authorize('admin'), csrfGuard, validate(updateUserStatusSchema), sellerController.updateUserStatus)

// Public seller discovery (B2)
router.get('/', sellerController.getSellers)
router.get('/:id', sellerController.getSeller)
router.get('/:id/products', sellerController.getSellerProducts)

export default router
