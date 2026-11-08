import { orderService } from './service.js'
import { toOrderDTO } from './dto.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, created, paginated } from '../../utils/response.js'

/**
 * Orders Controller (Thin controller layer)
 */
export const orderController = {
  /**
   * Customer creates an order
   */
  createOrder: asyncHandler(async (req, res) => {
    const idempotencyKey = req.headers['idempotency-key'] || null
    const order = await orderService.createOrder(req.body, req.user, idempotencyKey)
    return created(res, toOrderDTO(order, 'customer', req.user._id))
  }),

  /**
   * Customer views own orders
   */
  getMyOrders: asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1
    const pageSize = Number(req.query.pageSize) || 10
    const { items, total } = await orderService.getMyOrders(req.user, { page, pageSize })
    const mapped = items.map((o) => toOrderDTO(o, 'customer', req.user._id))
    return paginated(res, { items: mapped, total, page, pageSize })
  }),

  /**
   * View single order by ID or order number (object-level scoped)
   */
  getOrder: asyncHandler(async (req, res) => {
    const order = await orderService.getOrder(req.params.id, req.user)
    return ok(res, toOrderDTO(order, req.user.role, req.user._id))
  }),

  /**
   * Seller views orders containing her items
   */
  getSellerOrders: asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1
    const pageSize = Number(req.query.pageSize) || 10
    const status = req.query.status || 'all'
    const q = req.query.q || ''

    const { items, total } = await orderService.getSellerOrders(req.user, {
      status,
      q,
      page,
      pageSize,
    })
    const mapped = items.map((o) => toOrderDTO(o, 'seller', req.user._id))
    return paginated(res, { items: mapped, total, page, pageSize })
  }),

  /**
   * Seller updates fulfillment status for her items
   */
  setSellerOrderStatus: asyncHandler(async (req, res) => {
    const order = await orderService.setSellerOrderStatus(
      req.params.id,
      req.body.status,
      req.user
    )
    return ok(res, toOrderDTO(order, 'seller', req.user._id))
  }),

  /**
   * Admin lists all orders with filtering and pagination
   */
  getAllOrders: asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1
    const pageSize = Number(req.query.pageSize) || 10
    const { status, sellerId, from, to, q } = req.query

    const { items, total } = await orderService.getAllOrders({
      status,
      sellerId,
      from,
      to,
      q,
      page,
      pageSize,
    })
    const mapped = items.map((o) => toOrderDTO(o, 'admin'))
    return paginated(res, { items: mapped, total, page, pageSize })
  }),

  /**
   * Admin updates order status (enforces state machine)
   */
  updateOrderStatus: asyncHandler(async (req, res) => {
    const order = await orderService.updateOrderStatus(
      req.params.id,
      req.body.status,
      req.user
    )
    return ok(res, toOrderDTO(order, 'admin'))
  }),

  /**
   * Order cancellation (Customer or Admin)
   */
  cancelOrder: asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(
      req.params.id,
      req.body ? req.body.reason : undefined,
      req.user
    )
    return ok(res, toOrderDTO(order, req.user.role, req.user._id))
  }),

  /**
   * Admin records refund for cancelled order
   */
  refundOrder: asyncHandler(async (req, res) => {
    const order = await orderService.refundOrder(req.params.id, req.body, req.user)
    return ok(res, toOrderDTO(order, 'admin'))
  }),
}

export default orderController
