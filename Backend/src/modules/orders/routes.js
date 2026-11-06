import { Router } from 'express'
import multer from 'multer'
import { orderController } from './controller.js'
import { paymentController } from '../payments/controller.js'
import {
  createOrderSchema,
  updateOrderStatusSchema,
  setSellerOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema,
} from './schemas.js'
import { submitPaymentSchema } from '../payments/schemas.js'
import { authenticate, authorize, requireVerified } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { paymentLimiter } from '../../middlewares/rateLimiter.js'
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

// Customer Order Lifecycle
router.post(
  '/',
  authenticate,
  authorize('customer'),
  requireVerified,
  csrfGuard,
  validate(createOrderSchema),
  orderController.createOrder
)

router.get(
  '/my',
  authenticate,
  authorize('customer'),
  validate({ query: orderQuerySchema }),
  orderController.getMyOrders
)

// Seller Order Views & Fulfillment
router.get(
  '/seller/list',
  authenticate,
  authorize('seller'),
  validate({ query: orderQuerySchema }),
  orderController.getSellerOrders
)
router.get(
  '/seller/orders',
  authenticate,
  authorize('seller'),
  validate({ query: orderQuerySchema }),
  orderController.getSellerOrders
)
router.get(
  '/seller',
  authenticate,
  authorize('seller'),
  validate({ query: orderQuerySchema }),
  orderController.getSellerOrders
)

router.patch(
  '/:id/seller-status',
  authenticate,
  authorize('seller'),
  csrfGuard,
  validate({ body: setSellerOrderStatusSchema }),
  orderController.setSellerOrderStatus
)
router.patch(
  '/:id/fulfillment',
  authenticate,
  authorize('seller'),
  csrfGuard,
  validate({ body: setSellerOrderStatusSchema }),
  orderController.setSellerOrderStatus
)
router.patch(
  '/seller/:id/fulfillment',
  authenticate,
  authorize('seller'),
  csrfGuard,
  validate({ body: setSellerOrderStatusSchema }),
  orderController.setSellerOrderStatus
)
router.patch(
  '/seller/:id/status',
  authenticate,
  authorize('seller'),
  csrfGuard,
  validate({ body: setSellerOrderStatusSchema }),
  orderController.setSellerOrderStatus
)
router.patch(
  '/seller/orders/:id/fulfillment',
  authenticate,
  authorize('seller'),
  csrfGuard,
  validate({ body: setSellerOrderStatusSchema }),
  orderController.setSellerOrderStatus
)

// Admin Order Management
router.get(
  '/admin/all',
  authenticate,
  authorize('admin'),
  validate({ query: orderQuerySchema }),
  orderController.getAllOrders
)
router.get(
  '/admin/orders',
  authenticate,
  authorize('admin'),
  validate({ query: orderQuerySchema }),
  orderController.getAllOrders
)
router.get(
  '/admin',
  authenticate,
  authorize('admin'),
  validate({ query: orderQuerySchema }),
  orderController.getAllOrders
)

router.get('/admin/:id', authenticate, authorize('admin'), orderController.getOrder)

router.patch(
  '/admin/:id/status',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate({ body: updateOrderStatusSchema }),
  orderController.updateOrderStatus
)
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate({ body: updateOrderStatusSchema }),
  orderController.updateOrderStatus
)

router.post(
  '/admin/:id/cancel',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate({ body: cancelOrderSchema }),
  orderController.cancelOrder
)

// Payment submission under /orders/:id/payment
router.post(
  '/:id/payment',
  authenticate,
  authorize('customer'),
  paymentLimiter,
  csrfGuard,
  uploadScreenshot,
  validate(submitPaymentSchema),
  paymentController.submitPayment
)

// Customer / Shared Cancel & Detail
router.post(
  '/:id/cancel',
  authenticate,
  csrfGuard,
  validate({ body: cancelOrderSchema }),
  orderController.cancelOrder
)

router.get('/:id', authenticate, orderController.getOrder)

export default router
