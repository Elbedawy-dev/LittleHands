import { Router } from 'express'
import { sellerController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import { sellerProfileSchema } from '../users/schemas.js'

const router = Router()

// Canonical routes:
// sellers: PATCH /sellers/me/profile. Public sellers: GET /sellers, /sellers/:id, /sellers/:id/products.

// Seller profile management
router.patch('/me/profile', authenticate, authorize('seller'), csrfGuard, validate(sellerProfileSchema), sellerController.updateSellerProfile)

// Seller custom educational aid requests
router.get('/me/custom-requests', authenticate, authorize('seller'), sellerController.getCustomRequests)
router.post('/me/custom-requests/:id/claim', authenticate, authorize('seller'), csrfGuard, sellerController.claimCustomRequest)

// Public seller discovery
router.get('/', sellerController.getSellers)
router.get('/:id', sellerController.getSeller)
router.get('/:id/products', sellerController.getSellerProducts)

export default router
