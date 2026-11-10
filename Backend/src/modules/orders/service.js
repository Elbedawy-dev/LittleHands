import mongoose from 'mongoose'
import { Order } from '../../db/models/Order.js'
import { Product } from '../../db/models/Product.js'
import { User } from '../../db/models/User.js'
import { Setting } from '../../db/models/Setting.js'
import { Counter } from '../../db/models/Counter.js'
import { Payment } from '../../db/models/Payment.js'
import { Notification } from '../../db/models/Notification.js'
import { Upload } from '../../db/models/Upload.js'
import { AppError } from '../../utils/appError.js'
import { calcCommission, sum } from '../../utils/money.js'
import { escapeRegex } from '../../utils/regex.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { audit } from '../../infra/audit/index.js'
import { storage } from '../../infra/storage/index.js'
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
          image:
            Array.isArray(product.images) && product.images.length > 0
              ? typeof product.images[0] === 'string'
                ? product.images[0]
                : product.images[0].url || ''
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

      // 7. Initialise timeline (no hardcoded Arabic text: status, note, actor, byId)
      const timeline = [
        {
          status: 'pending_payment',
          note: '',
          actor: 'customer',
          byId: currentUser._id,
          at: new Date(),
          timestamp: new Date(),
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

      eventBus.emit(EVENT_TYPES.ORDER_CREATED, { order })

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

    const isObjectId = mongoose.isValidObjectId(orderId)
    const filter = isObjectId ? { $or: [{ _id: orderId }, { number: String(orderId) }] } : { number: String(orderId) }

    const order = await Order.findOne(filter)
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Object-level authorization
    if (currentUser.role === 'customer') {
      if (order.customerId.toString() !== currentUser._id.toString()) {
        throw new AppError('ORDER_NOT_FOUND', 404)
      }
    } else if (currentUser.role === 'seller') {
      const containsSellerItem = order.items.some(
        (it) => it.sellerId.toString() === currentUser._id.toString()
      )
      if (!containsSellerItem) {
        throw new AppError('ORDER_NOT_FOUND', 404)
      }
    }

    // Attach latest payment
    const payment = await Payment.findOne({ orderId: order._id }).sort({ attempt: -1 })
    const oObj = order.toObject()
    oObj.payment = payment || null

    if (currentUser.role === 'admin') {
      oObj.payments = await Payment.find({ orderId: order._id }).sort({ attempt: 1 })
    }

    return oObj
  },

  /**
   * Returns paginated orders for a seller (containing her items only)
   */
  async getSellerOrders(currentUser, { status = 'all', q = '', page = 1, pageSize = 10 } = {}) {
    if (!currentUser || currentUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403)
    }

    const filter = {
      'items.sellerId': currentUser._id,
      hiddenBySellers: { $ne: currentUser._id },
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
   * Implements atomic conditional transition.
   */
  async setSellerOrderStatus(orderId, newStatus, currentUser) {
    if (!currentUser || currentUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403)
    }

    if (!['preparing', 'shipped'].includes(newStatus)) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid fulfillment status')
    }

    const orderDoc = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!orderDoc) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Must contain seller items
    const sellerEntry = orderDoc.sellerFulfillment.find(
      (sf) => sf.sellerId.toString() === currentUser._id.toString()
    )
    if (!sellerEntry) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Allowed only after payment_confirmed
    if (['pending_payment', 'payment_rejected', 'cancelled'].includes(orderDoc.status)) {
      throw new AppError('PAYMENT_REQUIRED', 422)
    }

    if (orderDoc.status === 'delivered') {
      throw new AppError('INVALID_ORDER_TRANSITION', 422, 'Order is already delivered')
    }

    const currentFulfillmentStatus = sellerEntry.status

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

    // Atomic conditional update on sellerFulfillment item
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderDoc._id,
        status: { $in: ['payment_confirmed', 'preparing'] },
        sellerFulfillment: {
          $elemMatch: {
            sellerId: currentUser._id,
            status: currentFulfillmentStatus,
          },
        },
      },
      {
        $set: {
          'sellerFulfillment.$.status': newStatus,
          'sellerFulfillment.$.updatedAt': new Date(),
        },
      },
      { new: true }
    )

    if (!updatedOrder) {
      throw new AppError('INVALID_ORDER_TRANSITION', 422, 'Order fulfillment update conflict')
    }

    // Status Derivation:
    // - preparing as soon as ANY seller starts
    // - shipped when ALL involved sellers shipped
    const allShipped = updatedOrder.sellerFulfillment.every((sf) => sf.status === 'shipped')
    const anyActive = updatedOrder.sellerFulfillment.some(
      (sf) => sf.status === 'preparing' || sf.status === 'shipped'
    )

    let derivedStatus = 'payment_confirmed'
    if (allShipped) {
      derivedStatus = 'shipped'
    } else if (anyActive) {
      derivedStatus = 'preparing'
    }

    const oldStatus = updatedOrder.status
    if (derivedStatus !== oldStatus) {
      const finalOrder = await Order.findOneAndUpdate(
        { _id: updatedOrder._id, status: oldStatus },
        {
          $set: { status: derivedStatus },
          $push: {
            timeline: {
              status: derivedStatus,
              note: '',
              actor: 'seller',
              byId: currentUser._id,
              at: new Date(),
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      )

      if (finalOrder) {
        eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
          order: finalOrder,
          from: oldStatus,
          to: derivedStatus,
          actorId: currentUser._id,
        })
        eventBus.emit(EVENT_TYPES.ORDER_FULFILLMENT_UPDATED, {
          order: finalOrder,
          sellerId: currentUser._id,
          status: newStatus,
        })
        return finalOrder
      }
    }

    eventBus.emit(EVENT_TYPES.ORDER_FULFILLMENT_UPDATED, {
      order: updatedOrder,
      sellerId: currentUser._id,
      status: newStatus,
    })

    return updatedOrder
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
   * Admin status update adhering to state machine with single atomic conditional update
   */
  async updateOrderStatus(orderId, newStatus, currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403)
    }

    if (!ORDER_STATUSES.includes(newStatus)) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid order status')
    }

    const orderDoc = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!orderDoc) {
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

    const allowed = validTransitions[orderDoc.status] || []
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        'INVALID_ORDER_TRANSITION',
        422,
        `Cannot transition from ${orderDoc.status} to ${newStatus}`
      )
    }

    const isCancelling = newStatus === 'cancelled'
    const paymentWasConfirmed = ['payment_confirmed', 'preparing'].includes(orderDoc.status)

    const updateSet = { status: newStatus }
    if (isCancelling) {
      updateSet.cancelReason = 'Cancelled by admin'
      if (paymentWasConfirmed) {
        updateSet.refund = {
          required: true,
          amount: orderDoc.total,
          status: 'pending',
          note: 'Cancelled by admin',
        }
      }
    } else if (newStatus === 'preparing' || newStatus === 'shipped') {
      // Sync seller fulfillment
      updateSet['sellerFulfillment.$[].status'] = newStatus
      updateSet['sellerFulfillment.$[].updatedAt'] = new Date()
    }

    // Atomic conditional update
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderDoc._id, status: orderDoc.status },
      {
        $set: updateSet,
        $push: {
          timeline: {
            status: newStatus,
            note: '',
            actor: 'admin',
            byId: currentUser._id,
            at: new Date(),
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    )

    if (!updatedOrder) {
      throw new AppError('INVALID_ORDER_TRANSITION', 422, 'Order transition conflict')
    }

    // WINNER restores stock on cancellation
    if (isCancelling) {
      for (const item of updatedOrder.items) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } })
      }
      eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, { order: updatedOrder })
    }

    eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
      order: updatedOrder,
      from: orderDoc.status,
      to: newStatus,
      actorId: currentUser._id,
    })

    await audit.log(currentUser._id, 'ORDER_STATUS_UPDATED', 'Order', updatedOrder._id.toString(), {
      from: orderDoc.status,
      to: newStatus,
    })

    return updatedOrder
  },

  /**
   * Order cancellation with single atomic conditional update and stock restoration
   */
  async cancelOrder(orderId, reason = '', currentUser) {
    if (!currentUser) throw new AppError('UNAUTHENTICATED', 401)

    const orderDoc = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!orderDoc) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    let filter
    let refundPayload = null

    if (currentUser.role === 'customer') {
      if (orderDoc.customerId.toString() !== currentUser._id.toString()) {
        throw new AppError('ORDER_NOT_FOUND', 404)
      }

      // Customer may cancel ONLY while NO payment proof is pending or confirmed
      const hasPayment = await Payment.exists({
        orderId: orderDoc._id,
        status: { $in: ['pending', 'confirmed'] },
      })
      if (hasPayment) {
        throw new AppError(
          'ORDER_HAS_PAYMENT',
          422,
          'Cannot cancel order with pending or confirmed payment proof'
        )
      }

      if (!['pending_payment', 'payment_rejected'].includes(orderDoc.status)) {
        throw new AppError('CANNOT_CANCEL_ORDER', 422, 'Cannot cancel order in current state')
      }

      filter = {
        _id: orderDoc._id,
        customerId: currentUser._id,
        status: { $in: ['pending_payment', 'payment_rejected'] },
      }
    } else if (currentUser.role === 'admin') {
      if (['shipped', 'delivered', 'cancelled'].includes(orderDoc.status)) {
        throw new AppError('CANNOT_CANCEL_ORDER', 422, 'Order cannot be cancelled in its current state')
      }

      const paymentConfirmed = ['payment_confirmed', 'preparing'].includes(orderDoc.status)
      if (paymentConfirmed) {
        if (!reason || !reason.trim()) {
          throw new AppError(
            'VALIDATION_ERROR',
            400,
            'Cancellation reason is required when payment was confirmed'
          )
        }
        refundPayload = {
          required: true,
          amount: orderDoc.total,
          status: 'pending',
          note: reason.trim(),
        }
      }

      filter = {
        _id: orderDoc._id,
        status: { $in: ['pending_payment', 'payment_rejected', 'payment_confirmed', 'preparing'] },
      }
    } else {
      throw new AppError('FORBIDDEN', 403)
    }

    const cancelNote = reason ? reason.trim() : (currentUser.role === 'customer' ? 'Cancelled by customer' : 'Cancelled by admin')

    const updateSet = {
      status: 'cancelled',
      cancelReason: cancelNote,
    }
    if (refundPayload) {
      updateSet.refund = refundPayload
    }

    // SINGLE CONDITIONAL UPDATE (EXPECTED current status in filter, set and push timeline in same update)
    const updatedOrder = await Order.findOneAndUpdate(
      filter,
      {
        $set: updateSet,
        $push: {
          timeline: {
            status: 'cancelled',
            note: cancelNote,
            actor: currentUser.role,
            byId: currentUser._id,
            at: new Date(),
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    )

    if (!updatedOrder) {
      throw new AppError('CANNOT_CANCEL_ORDER', 422, 'Order cancellation conflict: order already transitioned')
    }

    // ONLY the request that wins the transition restores stock (never twice)
    for (const item of updatedOrder.items) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } })
    }

    eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, { order: updatedOrder })
    eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
      order: updatedOrder,
      from: orderDoc.status,
      to: 'cancelled',
      actorId: currentUser._id,
    })

    await audit.log(currentUser._id, 'ORDER_CANCELLED', 'Order', updatedOrder._id.toString(), {
      reason: cancelNote,
    })

    return updatedOrder
  },

  /**
   * Admin records refund completion for cancelled order
   */
  async refundOrder(orderId, { reference, note = '' }, currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403)
    }

    const orderDoc = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!orderDoc) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    if (!orderDoc.refund || !orderDoc.refund.required) {
      throw new AppError('REFUND_NOT_REQUIRED', 422, 'Order does not require a refund')
    }

    if (orderDoc.refund.status === 'completed') {
      throw new AppError('ALREADY_REFUNDED', 422, 'Order refund is already completed')
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderDoc._id, 'refund.status': 'pending' },
      {
        $set: {
          'refund.status': 'completed',
          'refund.reference': reference,
          'refund.note': note || orderDoc.refund.note || '',
          'refund.refundedAt': new Date(),
          'refund.refundedBy': currentUser._id,
        },
      },
      { new: true }
    )

    if (!updatedOrder) {
      throw new AppError('ALREADY_REFUNDED', 422, 'Refund conflict: already completed')
    }

    await audit.log(currentUser._id, 'ORDER_REFUNDED', 'Order', updatedOrder._id.toString(), {
      reference,
      amount: updatedOrder.refund.amount,
      note,
    })

    return updatedOrder
  },

  /**
   * Admin permanently deletes an unpaid/inactive order along with its payments, receipts, uploads, and notifications
   */
  async deleteOrder(orderId, currentUser, { ip = '' } = {}) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403)
    }

    const isObjectId = mongoose.isValidObjectId(orderId)
    const filter = isObjectId ? { $or: [{ _id: orderId }, { number: String(orderId) }] } : { number: String(orderId) }
    const orderDoc = await Order.findOne(filter)

    if (!orderDoc) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    const deletableStatuses = ['pending_payment', 'payment_rejected', 'cancelled']
    if (!deletableStatuses.includes(orderDoc.status)) {
      throw new AppError('ORDER_NOT_DELETABLE', 409)
    }

    // Restore product stock if order was not already cancelled
    if (orderDoc.status !== 'cancelled') {
      for (const item of orderDoc.items || []) {
        await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } }).catch(() => {})
      }
    }

    // Delete associated payments and receipt images from storage
    const payments = await Payment.find({ orderId: orderDoc._id })
    const screenshotKeys = []
    for (const p of payments) {
      if (p.screenshot && p.screenshot.key) {
        screenshotKeys.push(p.screenshot.key)
        try {
          await storage.remove(p.screenshot.key)
        } catch {
          // Ignore storage removal failure so DB cleanup still succeeds
        }
      }
    }

    await Payment.deleteMany({ orderId: orderDoc._id })

    if (screenshotKeys.length > 0) {
      await Upload.deleteMany({ key: { $in: screenshotKeys } }).catch(() => {})
    }

    const orderIdStr = orderDoc._id.toString()
    const orderNum = orderDoc.number

    await Notification.deleteMany({
      $or: [
        { 'params.orderId': orderIdStr },
        { 'params.orderId': orderDoc._id },
        { 'params.orderNumber': orderNum },
        { link: `/account/orders/${orderIdStr}` },
        { link: `/seller/orders?order=${orderNum}` },
        { link: `/admin/orders?order=${orderNum}` },
        { link: `/admin/payments?order=${orderNum}` },
      ],
    }).catch(() => {})

    await Order.deleteOne({ _id: orderDoc._id })

    await audit.log(
      currentUser._id,
      'order.delete',
      'Order',
      orderIdStr,
      {
        number: orderNum,
        status: orderDoc.status,
        total: orderDoc.total,
      },
      ip
    )

    return {
      id: orderIdStr,
      number: orderNum,
      deleted: true,
    }
  },

  /**
   * Seller hides an inactive order from her own list without deleting the order record or altering earnings/payments
   */
  async hideSellerOrder(orderId, currentUser) {
    if (!currentUser || currentUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403)
    }

    const isObjectId = mongoose.isValidObjectId(orderId)
    const filter = isObjectId ? { $or: [{ _id: orderId }, { number: String(orderId) }] } : { number: String(orderId) }
    const orderDoc = await Order.findOne(filter)

    if (!orderDoc) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    const containsSellerItem = (orderDoc.items || []).some(
      (it) => it.sellerId && it.sellerId.toString() === currentUser._id.toString()
    )
    if (!containsSellerItem) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    const hideableStatuses = ['cancelled', 'payment_rejected', 'delivered', 'pending_payment']
    if (!hideableStatuses.includes(orderDoc.status)) {
      throw new AppError('ORDER_NOT_DELETABLE', 409)
    }

    await Order.updateOne(
      { _id: orderDoc._id },
      { $addToSet: { hiddenBySellers: currentUser._id } }
    )

    return {
      id: orderDoc._id.toString(),
      number: orderDoc.number,
      hidden: true,
    }
  },
}

/**
 * Background / Cron Job Export: Cancels orders pending payment with no proof older than TTL
 * Implements single atomic conditional update and single stock restoration.
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
      // SINGLE CONDITIONAL UPDATE: filter on expected status pending_payment
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, status: 'pending_payment' },
        {
          $set: {
            status: 'cancelled',
            cancelReason: 'EXPIRED_UNPAID',
          },
          $push: {
            timeline: {
              status: 'cancelled',
              note: 'EXPIRED_UNPAID',
              actor: 'system',
              byId: null,
              at: new Date(),
              timestamp: new Date(),
            },
          },
        },
        { new: true }
      )

      if (updatedOrder) {
        // Stock is restored only by the winning request
        for (const item of updatedOrder.items) {
          await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } }).catch(() => {})
        }
        cancelledCount++

        eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, { order: updatedOrder })
        eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
          order: updatedOrder,
          from: 'pending_payment',
          to: 'cancelled',
          actorId: null,
        })
        await audit.log(null, 'ORDER_EXPIRED_CANCELLED', 'Order', updatedOrder._id.toString())
      }
    }
  }

  return { success: true, count: cancelledCount, cancelledCount }
}

orderService.cancelExpiredUnpaidOrders = cancelExpiredUnpaidOrders

export default orderService
