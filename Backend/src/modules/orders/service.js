import { Order } from '../../db/models/Order.js'
import { Product } from '../../db/models/Product.js'
import { User } from '../../db/models/User.js'
import { Setting } from '../../db/models/Setting.js'
import { Counter } from '../../db/models/Counter.js'
import { Payment } from '../../db/models/Payment.js'
import { AppError } from '../../utils/appError.js'
import { calcCommission, sum } from '../../utils/money.js'
import { escapeRegex } from '../../utils/regex.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { audit } from '../../infra/audit/index.js'
import { env } from '../../config/env.js'
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_SHIPPING_RATE,
  SHIPPING_ZONES,
  ORDER_STATUSES,
} from '../../config/constants.js'

/**
 * Orders Service
 * Implements full order lifecycle, atomic stock reservation/compensation,
 * pricing, multi-seller fulfillment status derivation, and TTL cancellation.
 */
export const orderService = {
  /**
   * Creates a new customer order
   */
  async createOrder({ items, delivery, notes = '', governorate = '' }, currentUser, idempotencyKey = null) {
    if (!currentUser) {
      throw new AppError('UNAUTHENTICATED', 401)
    }

    // 1. Idempotency Check (valid for 10 minutes)
    if (idempotencyKey) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      const existing = await Order.findOne({
        customerId: currentUser._id,
        idempotencyKey,
        createdAt: { $gte: tenMinutesAgo },
      })
      if (existing) {
        return existing
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'Order must contain items')
    }

    const targetGovernorate = delivery.governorate || governorate
    if (!targetGovernorate) {
      throw new AppError('VALIDATION_ERROR', 400, 'Governorate is required')
    }

    // Aggregate quantities by product ID
    const quantityMap = new Map()
    for (const item of items) {
      const pid = item.productId.toString()
      quantityMap.set(pid, (quantityMap.get(pid) || 0) + item.qty)
    }

    // 2. Atomic Stock Decrement with Compensation
    const compensated = []
    const productRecords = new Map()

    try {
      for (const [productId, qty] of quantityMap.entries()) {
        const product = await Product.findOneAndUpdate(
          {
            _id: productId,
            stock: { $gte: qty },
            published: true,
            deletedAt: null,
          },
          { $inc: { stock: -qty } },
          { new: true }
        )

        if (!product) {
          throw new AppError('INSUFFICIENT_STOCK', 422, { productId })
        }

        // Verify seller is active
        const seller = await User.findById(product.sellerId)
        if (!seller || seller.status !== 'active') {
          throw new AppError('PRODUCT_NOT_AVAILABLE', 422, { productId, sellerId: product.sellerId })
        }

        compensated.push({ productId, qty })
        productRecords.set(productId, product)
      }

      // 3. Load Commission Rate & Shipping Zone from Setting
      const setting = await Setting.findOne({ singletonKey: 'platform_settings' })
      const commissionRate =
        setting && typeof setting.commissionRate === 'number'
          ? setting.commissionRate
          : DEFAULT_COMMISSION_RATE

      let shippingRate = DEFAULT_SHIPPING_RATE
      if (setting && Array.isArray(setting.shippingRates) && setting.shippingRates.length > 0) {
        const matchedZone = setting.shippingRates.find(
          (z) => Array.isArray(z.governorates) && z.governorates.includes(targetGovernorate)
        )
        if (matchedZone && typeof matchedZone.price === 'number') {
          shippingRate = matchedZone.price
        }
      } else {
        const fallbackZone = SHIPPING_ZONES.find((z) => z.governorates.includes(targetGovernorate))
        if (fallbackZone && typeof fallbackZone.price === 'number') {
          shippingRate = fallbackZone.price
        }
      }

      // 4. Calculate item snapshots and line commissions
      const orderItems = []
      const distinctSellerIds = new Set()
      const lineTotals = []

      for (const item of items) {
        const product = productRecords.get(item.productId.toString())
        const unitPrice = product.price // Recomputed exclusively from DB
        const lineTotal = unitPrice * item.qty
        lineTotals.push(lineTotal)

        const { commission, net } = calcCommission(lineTotal, commissionRate)
        const sellerIdStr = product.sellerId.toString()
        distinctSellerIds.add(sellerIdStr)

        orderItems.push({
          productId: product._id,
          name: product.name,
          image: Array.isArray(product.images) && product.images.length > 0
            ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].url || '')
            : '',
          qty: item.qty,
          unitPrice,
          sellerId: product.sellerId,
          commissionRate,
          commissionAmount: commission,
          sellerNet: net,
        })
      }

      const subtotal = sum(...lineTotals)
      const total = sum(subtotal, shippingRate)

      // 5. Initialise seller fulfillment entries
      const sellerFulfillment = Array.from(distinctSellerIds).map((sId) => ({
        sellerId: sId,
        status: 'pending',
        updatedAt: new Date(),
      }))

      // 6. Generate formatted order number
      const number = await Counter.nextOrderNumber()

      // 7. Initialise timeline
      const timeline = [
        {
          status: 'pending_payment',
          title: 'تم إنشاء الطلب وبانتظار تحويل فودافون كاش ورفع الإيصال',
          at: new Date(),
          timestamp: new Date(),
          byId: currentUser._id,
          note: '',
          description: '',
        },
      ]

      // 8. Create Order Document
      const order = await Order.create({
        number,
        customerId: currentUser._id,
        items: orderItems,
        delivery: {
          name: delivery.name,
          phone: delivery.phone,
          governorate: targetGovernorate,
          city: delivery.city,
          address: delivery.address,
          nurseryName: delivery.nurseryName || '',
        },
        notes: notes || '',
        subtotal,
        shipping: shippingRate,
        total,
        status: 'pending_payment',
        sellerFulfillment,
        timeline,
        idempotencyKey: idempotencyKey || undefined,
      })

      // Audit financial action
      await audit.log(currentUser._id, 'ORDER_CREATED', 'Order', order._id.toString(), {
        number,
        total,
        subtotal,
        shipping: shippingRate,
      })

      return order
    } catch (err) {
      // COMPENSATE: restore decremented stock on failure
      for (const comp of compensated) {
        await Product.updateOne({ _id: comp.productId }, { $inc: { stock: comp.qty } }).catch(() => {})
      }
      throw err
    }
  },

  /**
   * Returns paginated orders for the authenticated customer
   */
  async getMyOrders(currentUser, { page = 1, pageSize = 10 } = {}) {
    if (!currentUser) throw new AppError('UNAUTHENTICATED', 401)

    const filter = { customerId: currentUser._id }
    const total = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    // Attach latest payment for each order
    const orderIds = orders.map((o) => o._id)
    const payments = await Payment.find({ orderId: { $in: orderIds } }).sort({ attempt: 1 })

    const paymentMap = new Map()
    for (const p of payments) {
      paymentMap.set(p.orderId.toString(), p)
    }

    const items = orders.map((o) => {
      const oObj = o.toObject()
      oObj.payment = paymentMap.get(o._id.toString()) || null
      return oObj
    })

    return { items, total, page, pageSize }
  },

  /**
   * Retrieves single order by ID or number with object-level authorization
   */
  async getOrder(orderId, currentUser) {
    if (!currentUser) throw new AppError('UNAUTHENTICATED', 401)

    let order = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Object-level authorization
    if (currentUser.role === 'customer') {
      if (order.customerId.toString() !== currentUser._id.toString()) {
        throw new AppError('ORDER_NOT_FOUND', 404)
      }
    } else if (currentUser.role === 'seller') {
      const containsMyItems = order.items.some(
        (it) => it.sellerId.toString() === currentUser._id.toString()
      )
      if (!containsMyItems) {
        throw new AppError('ORDER_NOT_FOUND', 404)
      }
    }

    const orderObj = order.toObject()

    // Attach payments
    if (currentUser.role === 'admin') {
      const payments = await Payment.find({ orderId: order._id }).sort({ attempt: 1 })
      orderObj.payments = payments
      orderObj.payment = payments.length > 0 ? payments[payments.length - 1] : null
    } else if (currentUser.role === 'customer') {
      const latestPayment = await Payment.findOne({ orderId: order._id }).sort({ attempt: -1 })
      orderObj.payment = latestPayment || null
    } else {
      orderObj.payment = null
    }

    return orderObj
  },

  /**
   * Returns orders relevant to the authenticated seller
   */
  async getSellerOrders(currentUser, { status = 'all', q = '', page = 1, pageSize = 10 } = {}) {
    if (!currentUser || currentUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403)
    }

    const filter = {
      'items.sellerId': currentUser._id,
    }

    if (status && status !== 'all') {
      filter.status = status
    }

    if (q && q.trim()) {
      const search = escapeRegex(q.trim())
      filter.$or = [
        { number: { $regex: search, $options: 'i' } },
        { 'delivery.name': { $regex: search, $options: 'i' } },
        { 'delivery.nurseryName': { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    return { items: orders, total, page, pageSize }
  },

  /**
   * Updates fulfillment entry for a seller and derives new overall order status
   */
  async setSellerOrderStatus(orderId, newStatus, currentUser) {
    if (!currentUser || currentUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403)
    }

    if (!['preparing', 'shipped'].includes(newStatus)) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid fulfillment status')
    }

    const order = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Must contain seller items
    const sellerEntryIndex = order.sellerFulfillment.findIndex(
      (sf) => sf.sellerId.toString() === currentUser._id.toString()
    )
    if (sellerEntryIndex === -1) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Allowed only after payment_confirmed
    if (['pending_payment', 'payment_rejected', 'cancelled'].includes(order.status)) {
      throw new AppError('PAYMENT_REQUIRED', 422)
    }

    if (order.status === 'delivered') {
      throw new AppError('INVALID_ORDER_TRANSITION', 422, 'Order is already delivered')
    }

    const currentFulfillmentStatus = order.sellerFulfillment[sellerEntryIndex].status

    // Only forward transitions: pending -> preparing -> shipped
    const validFulfillmentTransitions = {
      pending: ['preparing'],
      preparing: ['shipped'],
      shipped: [],
    }
    if (!validFulfillmentTransitions[currentFulfillmentStatus]?.includes(newStatus)) {
      throw new AppError(
        'INVALID_ORDER_TRANSITION',
        422,
        `Cannot transition fulfillment from ${currentFulfillmentStatus} to ${newStatus}`
      )
    }

    order.sellerFulfillment[sellerEntryIndex].status = newStatus
    order.sellerFulfillment[sellerEntryIndex].updatedAt = new Date()

    // Status Derivation:
    // - preparing as soon as ANY seller starts
    // - shipped when ALL involved sellers shipped
    const allShipped = order.sellerFulfillment.every((sf) => sf.status === 'shipped')
    const anyActive = order.sellerFulfillment.some(
      (sf) => sf.status === 'preparing' || sf.status === 'shipped'
    )

    let derivedStatus = 'payment_confirmed'
    if (allShipped) {
      derivedStatus = 'shipped'
    } else if (anyActive) {
      derivedStatus = 'preparing'
    }

    const oldStatus = order.status
    if (derivedStatus !== oldStatus) {
      order.status = derivedStatus
      order.timeline.push({
        status: derivedStatus,
        title: derivedStatus === 'shipped' ? 'تم الشحن' : 'جاري التجهيز',
        byId: currentUser._id,
        at: new Date(),
        timestamp: new Date(),
      })
      eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
        order,
        from: oldStatus,
        to: derivedStatus,
        actorId: currentUser._id,
      })
    }

    eventBus.emit(EVENT_TYPES.ORDER_FULFILLMENT_UPDATED, {
      order,
      sellerId: currentUser._id,
      status: newStatus,
    })

    await order.save()
    return order
  },

  /**
   * Retrieves all orders for admin review with rich filters
   */
  async getAllOrders({
    status = 'all',
    sellerId = '',
    from = '',
    to = '',
    q = '',
    page = 1,
    pageSize = 10,
  } = {}) {
    const filter = {}

    if (status && status !== 'all') {
      filter.status = status
    }

    if (sellerId) {
      filter['items.sellerId'] = sellerId
    }

    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = new Date(from)
      if (to) filter.createdAt.$lte = new Date(to)
    }

    if (q && q.trim()) {
      const search = escapeRegex(q.trim())
      filter.$or = [
        { number: { $regex: search, $options: 'i' } },
        { 'delivery.name': { $regex: search, $options: 'i' } },
        { 'delivery.phone': { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Order.countDocuments(filter)
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    // Attach latest payment for each order
    const orderIds = orders.map((o) => o._id)
    const payments = await Payment.find({ orderId: { $in: orderIds } }).sort({ attempt: 1 })
    const paymentMap = new Map()
    for (const p of payments) {
      paymentMap.set(p.orderId.toString(), p)
    }

    const items = orders.map((o) => {
      const oObj = o.toObject()
      oObj.payment = paymentMap.get(o._id.toString()) || null
      return oObj
    })

    return { items, total, page, pageSize }
  },

  /**
   * Admin status update adhering to state machine
   */
  async updateOrderStatus(orderId, newStatus, currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403)
    }

    if (!ORDER_STATUSES.includes(newStatus)) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid order status')
    }

    const order = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    const validTransitions = {
      pending_payment: ['payment_confirmed', 'payment_rejected', 'cancelled'],
      payment_rejected: ['pending_payment', 'cancelled'],
      payment_confirmed: ['preparing', 'cancelled'],
      preparing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    }

    const allowed = validTransitions[order.status] || []
    if (!allowed.includes(newStatus)) {
      throw new AppError('INVALID_ORDER_TRANSITION', 422, `Cannot transition from ${order.status} to ${newStatus}`)
    }

    // Restores stock on cancel
    if (newStatus === 'cancelled') {
      for (const item of order.items) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } })
      }
      eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, { order })
    } else if (newStatus === 'preparing' || newStatus === 'shipped') {
      for (const sf of order.sellerFulfillment) {
        if (newStatus === 'shipped' || sf.status === 'pending') {
          sf.status = newStatus
          sf.updatedAt = new Date()
        }
      }
    }

    const oldStatus = order.status
    order.status = newStatus
    order.timeline.push({
      status: newStatus,
      title: newStatus,
      byId: currentUser._id,
      at: new Date(),
      timestamp: new Date(),
    })

    await order.save()

    eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
      order,
      from: oldStatus,
      to: newStatus,
      actorId: currentUser._id,
    })

    await audit.log(currentUser._id, 'ORDER_STATUS_UPDATED', 'Order', order._id.toString(), {
      from: oldStatus,
      to: newStatus,
    })

    return order
  },

  /**
   * Order cancellation with stock restoration
   */
  async cancelOrder(orderId, reason = '', currentUser) {
    if (!currentUser) throw new AppError('UNAUTHENTICATED', 401)

    const order = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Role authorization check
    if (currentUser.role === 'customer') {
      if (order.customerId.toString() !== currentUser._id.toString()) {
        throw new AppError('ORDER_NOT_FOUND', 404)
      }
      if (!['pending_payment', 'payment_rejected'].includes(order.status)) {
        throw new AppError('CANNOT_CANCEL_ORDER', 422, 'Cannot cancel order after payment confirmation')
      }
    } else if (currentUser.role === 'admin') {
      if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        throw new AppError('CANNOT_CANCEL_ORDER', 422, 'Order cannot be cancelled in its current state')
      }
    } else {
      throw new AppError('FORBIDDEN', 403)
    }

    // Restore stock for each item
    for (const item of order.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } })
    }

    const oldStatus = order.status
    order.status = 'cancelled'
    order.cancelReason = reason || 'Order cancelled'
    order.timeline.push({
      status: 'cancelled',
      title: 'تم إلغاء الطلب',
      note: order.cancelReason,
      byId: currentUser._id,
      at: new Date(),
      timestamp: new Date(),
    })

    await order.save()

    eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, { order })
    eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
      order,
      from: oldStatus,
      to: 'cancelled',
      actorId: currentUser._id,
    })

    await audit.log(currentUser._id, 'ORDER_CANCELLED', 'Order', order._id.toString(), {
      reason: order.cancelReason,
    })

    return order
  },
}

/**
 * Background / Cron Job Export: Cancels orders pending payment with no proof older than TTL
 */
export async function cancelExpiredUnpaidOrders() {
  const ttlHours = env.PENDING_ORDER_TTL_HOURS || 48
  const cutoffDate = new Date(Date.now() - ttlHours * 60 * 60 * 1000)

  const expiredOrders = await Order.find({
    status: 'pending_payment',
    createdAt: { $lt: cutoffDate },
  })

  let cancelledCount = 0

  for (const order of expiredOrders) {
    const paymentCount = await Payment.countDocuments({ orderId: order._id })
    if (paymentCount === 0) {
      // Restore stock
      for (const item of order.items) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } }).catch(() => {})
      }

      const oldStatus = order.status
      order.status = 'cancelled'
      order.cancelReason = 'EXPIRED_UNPAID'
      order.timeline.push({
        status: 'cancelled',
        title: 'تم إلغاء الطلب تلقائياً لانتهاء مهلة السداد',
        at: new Date(),
        timestamp: new Date(),
      })
      await order.save()
      cancelledCount++

      eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, { order })
      eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
        order,
        from: oldStatus,
        to: 'cancelled',
        actorId: null,
      })
      await audit.log(null, 'ORDER_EXPIRED_CANCELLED', 'Order', order._id.toString())
    }
  }

  return { success: true, count: cancelledCount, cancelledCount }
}

orderService.cancelExpiredUnpaidOrders = cancelExpiredUnpaidOrders

export default orderService
