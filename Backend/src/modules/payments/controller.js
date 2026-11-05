import { paymentService } from './service.js'
import { toPaymentDTO } from './dto.js'
import { toOrderDTO } from '../orders/dto.js'
import { asyncHandler } from '../../utils/asyncHandler.js'
import { ok, paginated } from '../../utils/response.js'

/**
 * Payments Controller
 */
export const paymentController = {
  /**
   * Customer submits Vodafone Cash screenshot proof
   */
  submitPayment: asyncHandler(async (req, res) => {
    const orderId = req.params.id || req.params.orderId
    const { order, payment } = await paymentService.submitPayment(
      orderId,
      req.body,
      req.file,
      req.user
    )
    const orderObj = order.toObject ? order.toObject() : { ...order }
    orderObj.payment = payment
    return ok(res, toOrderDTO(orderObj, 'customer', req.user._id))
  }),

  /**
   * Admin lists payments for review
   */
  getPayments: asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1
    const pageSize = Number(req.query.pageSize) || 10
    const status = req.query.status || 'all'
    const q = req.query.q || ''

    const { items, total, counts } = await paymentService.getPayments({
      status,
      q,
      page,
      pageSize,
    })

    const mapped = items.map((it) => toPaymentDTO(it.payment, 'admin', it.extra))
    return paginated(res, { items: mapped, total, page, pageSize }, { counts })
  }),

  /**
   * Admin confirms payment
   */
  confirmPayment: asyncHandler(async (req, res) => {
    const targetId = req.params.id || req.params.orderId
    const { order, payment } = await paymentService.confirmPayment(targetId, req.user)
    const orderObj = order.toObject ? order.toObject() : { ...order }
    orderObj.payment = payment
    return ok(res, toOrderDTO(orderObj, 'admin'))
  }),

  /**
   * Admin rejects payment
   */
  rejectPayment: asyncHandler(async (req, res) => {
    const targetId = req.params.id || req.params.orderId
    const { order, payment } = await paymentService.rejectPayment(targetId, req.body, req.user)
    const orderObj = order.toObject ? order.toObject() : { ...order }
    orderObj.payment = payment
    return ok(res, toOrderDTO(orderObj, 'admin'))
  }),

  /**
   * Stream private payment screenshot
   */
  getScreenshot: asyncHandler(async (req, res) => {
    const targetId = req.params.id || req.params.orderId
    return paymentService.streamScreenshot(targetId, req.user, res)
  }),
}

export default paymentController
