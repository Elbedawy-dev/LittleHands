import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { contactController } from './controller.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import { AppError } from '../../utils/appError.js'
import { customRequestSchema } from './schemas.js'

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

// Canonical route:
// contact: POST /contact/custom-requests
router.post(
  '/custom-requests',
  strictCustomRequestLimiter,
  csrfGuard,
  validate(customRequestSchema),
  contactController.sendCustomRequest
)

export default router
