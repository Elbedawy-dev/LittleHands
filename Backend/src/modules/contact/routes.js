import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { contactController } from './controller.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import { AppError } from '../../utils/appError.js'
import {
  customRequestSchema,
  updateCustomRequestStatusSchema,
  customRequestQuerySchema,
} from './schemas.js'

const router = Router()

// Strict rate limit for public custom requests (5 per hour per IP)
const strictCustomRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError('TOO_MANY_REQUESTS', 429))
  },
})

// Public custom request submissions
router.post(
  '/custom-request',
  strictCustomRequestLimiter,
  csrfGuard,
  validate(customRequestSchema),
  contactController.sendCustomRequest
)
router.post(
  '/custom-requests',
  strictCustomRequestLimiter,
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
