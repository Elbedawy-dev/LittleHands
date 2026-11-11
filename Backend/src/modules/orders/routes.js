import { Router } from 'express'
import { orderController } from './controller.js'
import {
  createOrderSchema,
  updateOrderStatusSchema,
  setSellerOrderStatusSchema,
  cancelOrderSchema,
  refundOrderSchema,
  orderQuerySchema,
} from './schemas.js'
import { authenticate, authorize, requireVerified } from '../../middlewares/auth.js'
import { csrfGuard } from '../../middlewares/csrfGuard.js'
import { validate } from '../../middlewares/validate.js'

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
  '/seller',
  authenticate,
  authorize('seller'),
  validate({ query: orderQuerySchema }),
  orderController.getSellerOrders
)

router.patch(
  '/seller/:id/fulfillment',
  authenticate,
  authorize('seller'),
  csrfGuard,
  validate({ body: setSellerOrderStatusSchema }),
  orderController.setSellerOrderStatus
)

router.delete(
  '/seller/:id',
  authenticate,
  authorize('seller'),
  csrfGuard,
  orderController.hideSellerOrder
)

// Admin Order Management
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

router.post(
  '/admin/:id/cancel',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate({ body: cancelOrderSchema }),
  orderController.cancelOrder
)

router.post(
  '/admin/:id/refund',
  authenticate,
  authorize('admin'),
  csrfGuard,
  validate({ body: refundOrderSchema }),
  orderController.refundOrder
)

router.delete(
  '/admin/:id',
  authenticate,
  authorize('admin'),
  csrfGuard,
  orderController.deleteOrder
)

router.post(
  '/admin/:id/archive',
  authenticate,
  authorize('admin'),
  csrfGuard,
  orderController.archiveOrder
)

router.post(
  '/admin/:id/unarchive',
  authenticate,
  authorize('admin'),
  csrfGuard,
  orderController.unarchiveOrder
)

// Customer Cancel & Detail
router.post(
  '/:id/cancel',
  authenticate,
  csrfGuard,
  validate({ body: cancelOrderSchema }),
  orderController.cancelOrder
)

router.get('/:id', authenticate, orderController.getOrder)

export default router
