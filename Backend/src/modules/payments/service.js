import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import { Payment } from '../../db/models/Payment.js'
import { Order } from '../../db/models/Order.js'
import { storage } from '../../infra/storage/index.js'
import { AppError } from '../../utils/appError.js'
import { toPiasters } from '../../utils/money.js'
import { escapeRegex } from '../../utils/regex.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { audit } from '../../infra/audit/index.js'

/**
 * Payments Service
 * Handles Vodafone Cash screenshot submission, risk flag computation,
 * admin review (confirm/reject), and authorized private screenshot streaming.
 */
export const paymentService = {
  /**
   * Customer submits Vodafone Cash payment proof with screenshot
   */
  async submitPayment(orderId, { senderPhone, transferredAmount, reference = '' }, file, currentUser) {
    if (!currentUser) throw new AppError('UNAUTHENTICATED', 401)

    const order = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Object-level authorization: owner only
    if (order.customerId.toString() !== currentUser._id.toString()) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Allowed only when status is pending_payment or payment_rejected
    if (!['pending_payment', 'payment_rejected'].includes(order.status)) {
      throw new AppError('INVALID_ORDER_STATUS', 422, 'Cannot submit payment for this order in its current state')
    }

    // Maximum 5 attempts allowed
    const attemptCount = await Payment.countDocuments({ orderId: order._id })
    if (attemptCount >= 5) {
      throw new AppError('MAX_PAYMENT_ATTEMPTS_EXCEEDED', 422, 'Maximum payment submission attempts (5) reached')
    }

    // Screenshot file validation
    if (!file || !file.buffer) {
      throw new AppError('VALIDATION_ERROR', 400, 'Screenshot image is required')
    }

    // Verify magic bytes
    const detectedType = await fileTypeFromBuffer(file.buffer)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!detectedType || !allowedMimes.includes(detectedType.mime)) {
      throw new AppError('INVALID_FILE_TYPE', 400)
    }

    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new AppError('FILE_TOO_LARGE', 400)
    }

    // Re-encode image with sharp (strips EXIF, standardizes format)
    const processedBuffer = await sharp(file.buffer)
      .rotate()
      .webp({ quality: 85 })
      .toBuffer()

    const savedFile = await storage.saveImage(
      {
        buffer: processedBuffer,
        mimetype: 'image/webp',
        originalname: `${file.originalname || 'receipt'}.webp`,
        size: processedBuffer.length,
      },
      { kind: 'payment', ownerId: currentUser._id }
    )

    // Compute Risk Flags:
    // 1. amount_mismatch: transferredAmount != order.total
    // 2. duplicate_reference: same reference on another non-rejected payment
    // 3. duplicate_screenshot: same sha256 hash on another payment
    const flags = []
    const parsedTransferred = Number(transferredAmount)

    if (toPiasters(parsedTransferred) !== toPiasters(order.total)) {
      flags.push('amount_mismatch')
    }

    const trimmedRef = reference ? reference.trim() : ''
    if (trimmedRef) {
      const existingRef = await Payment.findOne({
        orderId: { $ne: order._id },
        reference: { $regex: new RegExp(`^${escapeRegex(trimmedRef)}$`, 'i') },
        status: { $ne: 'rejected' },
      })
      if (existingRef) {
        flags.push('duplicate_reference')
      }
    }

    const existingHash = await Payment.findOne({
      orderId: { $ne: order._id },
      'screenshot.hash': savedFile.hash,
    })
    if (existingHash) {
      flags.push('duplicate_screenshot')
    }

    const attempt = attemptCount + 1

    const payment = await Payment.create({
      orderId: order._id,
      attempt,
      senderPhone: senderPhone.trim(),
      reference: trimmedRef,
      transferredAmount: parsedTransferred,
      screenshot: {
        key: savedFile.key,
        hash: savedFile.hash,
        mime: savedFile.mime,
        size: savedFile.size,
        url: savedFile.url,
      },
      status: 'pending',
      flags,
      submittedAt: new Date(),
    })

    // Move order back to pending_payment and update timeline
    order.status = 'pending_payment'
    order.timeline.push({
      status: 'pending_payment',
      title:
        attempt === 1
          ? 'تم إرفاق إيصال تحويل فودافون كاش وبانتظار مراجعة الإدارة'
          : 'تم إعادة إرفاق إيصال تحويل فودافون كاش وبانتظار مراجعة الإدارة',
      byId: currentUser._id,
      at: new Date(),
      timestamp: new Date(),
    })
    await order.save()

    // Emit system events
    if (attempt === 1) {
      eventBus.emit(EVENT_TYPES.ORDER_CREATED, { order, payment })
    } else {
      eventBus.emit(EVENT_TYPES.PAYMENT_RESUBMITTED, { order, payment })
    }

    await audit.log(currentUser._id, 'PAYMENT_SUBMITTED', 'Payment', payment._id.toString(), {
      orderId: order._id,
      attempt,
      flags,
    })

    return { order, payment }
  },

  /**
   * Retrieves payments list with status counts for Admin review
   */
  async getPayments({ status = 'all', q = '', page = 1, pageSize = 10 } = {}) {
    const counts = {
      pending: await Payment.countDocuments({ status: 'pending' }),
      confirmed: await Payment.countDocuments({ status: 'confirmed' }),
      rejected: await Payment.countDocuments({ status: 'rejected' }),
    }

    const filter = {}
    if (status && status !== 'all') {
      filter.status = status
    }

    if (q && q.trim()) {
      const search = escapeRegex(q.trim())
      const matchingOrders = await Order.find({
        $or: [
          { number: { $regex: search, $options: 'i' } },
          { 'delivery.name': { $regex: search, $options: 'i' } },
          { 'delivery.phone': { $regex: search, $options: 'i' } },
        ],
      }).select('_id')

      const orderIds = matchingOrders.map((o) => o._id)

      filter.$or = [
        { orderId: { $in: orderIds } },
        { senderPhone: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } },
      ]
    }

    const total = await Payment.countDocuments(filter)
    const payments = await Payment.find(filter)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    // Populate order details for each payment
    const orderIds = payments.map((p) => p.orderId)
    const orders = await Order.find({ _id: { $in: orderIds } })
    const orderMap = new Map()
    for (const o of orders) {
      orderMap.set(o._id.toString(), o)
    }

    const items = payments.map((p) => {
      const order = orderMap.get(p.orderId.toString())
      return {
        payment: p,
        extra: {
          orderId: order ? order._id.toString() : p.orderId.toString(),
          orderNumber: order?.number || '',
          customerId: order?.customerId?.toString() || '',
          customerName: order?.delivery?.name || '',
          customerPhone: order?.delivery?.phone || '',
          total: order?.total || 0,
        },
      }
    })

    return { items, total, page, pageSize, counts }
  },

  /**
   * Admin approves payment proof and marks order payment_confirmed
   */
  async confirmPayment(orderId, currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403)
    }

    let order = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    let payment = null
    if (order) {
      payment = await Payment.findOne({ orderId: order._id, status: 'pending' }).sort({ attempt: -1 })
      if (!payment) {
        // Fallback to latest payment
        payment = await Payment.findOne({ orderId: order._id }).sort({ attempt: -1 })
      }
    } else {
      // Check if orderId is payment ID
      payment = await Payment.findById(orderId).catch(() => null)
      if (payment) {
        order = await Order.findById(payment.orderId)
      }
    }

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }
    if (!payment) {
      throw new AppError('RECEIPT_NOT_FOUND', 404)
    }
    if (order.status !== 'pending_payment' || payment.status !== 'pending') {
      throw new AppError('INVALID_ORDER_TRANSITION', 422, 'Can only confirm pending payment for an order awaiting payment')
    }

    payment.status = 'confirmed'
    payment.reviewedAt = new Date()
    payment.reviewedBy = currentUser._id
    await payment.save()

    const oldStatus = order.status
    order.status = 'payment_confirmed'
    order.timeline.push({
      status: 'payment_confirmed',
      title: 'تم اعتماد إيصال فودافون كاش وتأكيد الدفع',
      byId: currentUser._id,
      at: new Date(),
      timestamp: new Date(),
    })
    await order.save()

    eventBus.emit(EVENT_TYPES.PAYMENT_CONFIRMED, { order, payment })
    eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
      order,
      from: oldStatus,
      to: 'payment_confirmed',
      actorId: currentUser._id,
    })

    await audit.log(currentUser._id, 'PAYMENT_CONFIRMED', 'Payment', payment._id.toString(), {
      orderId: order._id,
    })

    return { order, payment }
  },

  /**
   * Admin rejects payment proof and records reason
   */
  async rejectPayment(orderId, { reason, notes = '', notify = true }, currentUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new AppError('FORBIDDEN', 403)
    }

    let order = await Order.findOne({
      $or: [{ _id: orderId.match(/^[0-9a-fA-F]{24}$/) ? orderId : null }, { number: orderId }],
    })

    let payment = null
    if (order) {
      payment = await Payment.findOne({ orderId: order._id, status: 'pending' }).sort({ attempt: -1 })
      if (!payment) {
        payment = await Payment.findOne({ orderId: order._id }).sort({ attempt: -1 })
      }
    } else {
      payment = await Payment.findById(orderId).catch(() => null)
      if (payment) {
        order = await Order.findById(payment.orderId)
      }
    }

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }
    if (!payment) {
      throw new AppError('RECEIPT_NOT_FOUND', 404)
    }
    if (order.status !== 'pending_payment' || payment.status !== 'pending') {
      throw new AppError('INVALID_ORDER_TRANSITION', 422, 'Can only confirm pending payment for an order awaiting payment')
    }

    payment.status = 'rejected'
    payment.rejectReason = reason
    payment.rejectNotes = notes || ''
    payment.notifyCustomer = notify !== false
    payment.reviewedAt = new Date()
    payment.reviewedBy = currentUser._id
    await payment.save()

    const oldStatus = order.status
    order.status = 'payment_rejected'
    order.timeline.push({
      status: 'payment_rejected',
      title: `تم رفض الإيصال: ${reason}`,
      description: notes || '',
      byId: currentUser._id,
      at: new Date(),
      timestamp: new Date(),
    })
    await order.save()

    eventBus.emit(EVENT_TYPES.PAYMENT_REJECTED, { order, payment })
    eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
      order,
      from: oldStatus,
      to: 'payment_rejected',
      actorId: currentUser._id,
    })

    await audit.log(currentUser._id, 'PAYMENT_REJECTED', 'Payment', payment._id.toString(), {
      orderId: order._id,
      reason,
      notes,
    })

    return { order, payment }
  },

  /**
   * Streams private screenshot with authorization check
   */
  async streamScreenshot(targetId, currentUser, res) {
    if (!currentUser) throw new AppError('UNAUTHENTICATED', 401)

    // Target can be Payment ID, Order ID, or Screenshot Key
    let payment = await Payment.findOne({
      $or: [
        { _id: targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null },
        { orderId: targetId.match(/^[0-9a-fA-F]{24}$/) ? targetId : null },
        { 'screenshot.key': targetId },
      ],
    }).sort({ attempt: -1 })

    if (!payment) {
      throw new AppError('RECEIPT_NOT_FOUND', 404)
    }

    const order = await Order.findById(payment.orderId)
    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 404)
    }

    // Authorization: Owner customer or Admin only. Sellers must NEVER access payment screenshots.
    const isOwner = currentUser.role === 'customer' && order.customerId.toString() === currentUser._id.toString()
    const isAdmin = currentUser.role === 'admin'

    if (!isOwner && !isAdmin) {
      throw new AppError('RECEIPT_NOT_FOUND', 404)
    }

    return storage.streamPrivate(payment.screenshot.key, res)
  },
}

export default paymentService
