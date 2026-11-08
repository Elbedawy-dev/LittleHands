import { Router } from 'express'
import multer from 'multer'
import { paymentController } from './controller.js'
import { submitPaymentSchema, rejectPaymentSchema, paymentQuerySchema } from './schemas.js'
import { authenticate, authorize } from '../../middlewares/auth.js'
import { paymentLimiter } from '../../middlewares/rateLimiter.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'
import { AppError } from '../../utils/appError.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const uploadScreenshot = (req, res, next) => {
  upload.single('screenshot')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('FILE_TOO_LARGE', 400))
      }
      return next(new AppError('BAD_REQUEST', 400, err.message))
    }
    next()
  })
}

const router = Router()

// Canonical routes:
// payments: POST /payments/orders/:id/payment, GET /payments/:id/screenshot,
//           admin: GET /payments/admin, POST /payments/admin/:orderId/confirm, POST /payments/admin/:orderId/reject

// Customer payment proof submission
router.post(
  '/orders/:id/payment',
  authenticate,
  authorize('customer'),
  paymentLimiter,
  csrfGuard,
  uploadScreenshot,
  validate(submitPaymentSchema),
  paymentController.submitPayment
)

// Stream private payment screenshot
router.get('/:id/screenshot', authenticate, paymentController.getScreenshot)

// Admin payments management & verification
router.get(
  '/admin',
  authenticate,
  authorize('admin'),
  validate({ query: paymentQuerySchema }),
  paymentController.getPayments
)

router.post(
  '/admin/:orderId/confirm',
  authenticate,
  authorize('admin'),
  csrfGuard,
  paymentController.confirmPayment
)

router.post(
  '/admin/:orderId/reject',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate({ body: rejectPaymentSchema }),
  paymentController.rejectPayment
)

export default router
