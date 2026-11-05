import { Router } from 'express'
import { contactController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { customRequestLimiter } from '../../middlewares/rateLimiter.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import {
  customRequestSchema,
  updateCustomRequestStatusSchema,
  customRequestQuerySchema,
} from './schemas.js'

const router = Router()

// Public custom request submissions
router.post(
  '/custom-request',
  customRequestLimiter,
  csrfGuard,
  validate(customRequestSchema),
  contactController.sendCustomRequest
)
router.post(
  '/custom-requests',
  customRequestLimiter,
  csrfGuard,
  validate(customRequestSchema),
  contactController.sendCustomRequest
)

// Admin management
router.get(
  '/admin/custom-requests',
  authenticate,
  authorize('admin'),
  validate({ query: customRequestQuerySchema }),
  contactController.getCustomRequests
)
router.get(
  '/custom-requests',
  authenticate,
  authorize('admin'),
  validate({ query: customRequestQuerySchema }),
  contactController.getCustomRequests
)

router.patch(
  '/admin/custom-requests/:id',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate(updateCustomRequestStatusSchema),
  contactController.updateCustomRequestStatus
)
router.patch(
  '/custom-requests/:id',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate(updateCustomRequestStatusSchema),
  contactController.updateCustomRequestStatus
)

export default router
