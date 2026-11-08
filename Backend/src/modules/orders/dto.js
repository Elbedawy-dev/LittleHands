/**
 * Order DTO Mapper
 * Enforces role-based response shaping and privacy:
 * - Customer: No commission fields, no seller net earnings.
 * - Seller: Only her own items; delivery masked until payment is confirmed; NO payment data.
 * - Admin: Full access including per-item commission and payment flags/history.
 */

export function toOrderItemDTO(item, viewerRole = 'customer', viewerSellerId = null) {
  if (!item) return null
  const it = item.toObject ? item.toObject() : { ...item }

  const base = {
    productId: it.productId?.toString ? it.productId.toString() : String(it.productId),
    name: it.name,
    qty: it.qty,
    unitPrice: it.unitPrice,
    sellerId: it.sellerId?.toString ? it.sellerId.toString() : String(it.sellerId),
    image: it.image?.url || (typeof it.image === 'string' ? it.image : ''),
  }

  const isSellerItem =
    viewerRole === 'seller' &&
    viewerSellerId &&
    viewerSellerId.toString() === base.sellerId
  const isAdmin = viewerRole === 'admin'

  if (isAdmin || isSellerItem) {
    return {
      ...base,
      commissionRate: it.commissionRate,
      commissionAmount: it.commissionAmount,
      sellerNet: it.sellerNet,
    }
  }

  return base
}

export function toOrderDTO(order, viewerRole = 'customer', viewerUserId = null) {
  if (!order) return null
  const o = order.toObject ? order.toObject() : { ...order }

  const orderId = o.id || o._id?.toString()
  const customerId = o.customerId?.toString ? o.customerId.toString() : String(o.customerId)

  let items = Array.isArray(o.items) ? o.items : []
  let delivery = o.delivery ? { ...o.delivery } : {}

  if (viewerRole === 'seller') {
    // Seller only sees her own items
    items = items.filter(
      (it) => (it.sellerId?.toString ? it.sellerId.toString() : String(it.sellerId)) === viewerUserId?.toString()
    )

    // Mask delivery address & phone until payment is confirmed
    const isPaymentConfirmed = ['payment_confirmed', 'preparing', 'shipped', 'delivered'].includes(o.status)
    if (!isPaymentConfirmed) {
      delivery = {
        name: null,
        phone: null,
        address: null,
        city: null,
        governorate: null,
        nurseryName: null,
        masked: true,
      }
    } else {
      delivery = {
        ...delivery,
        masked: false,
      }
    }
  }

  const mappedItems = items.map((it) => toOrderItemDTO(it, viewerRole, viewerUserId))

  const dto = {
    id: orderId,
    number: o.number,
    customerId,
    items: mappedItems,
    delivery,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    status: o.status,
    timeline: (o.timeline || []).map((t) => ({
      status: t.status,
      note: t.note || t.title || t.description || '',
      at: (t.at || t.timestamp || new Date()).toISOString ? (t.at || t.timestamp || new Date()).toISOString() : String(t.at || t.timestamp),
      byId: t.byId?.toString ? t.byId.toString() : (t.byId || null),
    })),
    notes: o.notes || '',
    createdAt: o.createdAt?.toISOString ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt?.toISOString ? o.updatedAt.toISOString() : o.updatedAt,
  }

  // Payment scoping
  if (viewerRole === 'seller') {
    // A seller NEVER receives payment data
    dto.payment = null
    // Seller gets her own fulfillment status
    if (o.sellerFulfillment && viewerUserId) {
      const myFulfillment = o.sellerFulfillment.find(
        (sf) => (sf.sellerId?.toString ? sf.sellerId.toString() : String(sf.sellerId)) === viewerUserId.toString()
      )
      dto.sellerFulfillment = myFulfillment
        ? {
            status: myFulfillment.status,
            updatedAt: myFulfillment.updatedAt?.toISOString
              ? myFulfillment.updatedAt.toISOString()
              : myFulfillment.updatedAt,
          }
        : null
    }
  } else if (viewerRole === 'admin') {
    dto.cancelReason = o.cancelReason || null
    if (o.refund && o.refund.required) {
      dto.refund = {
        required: o.refund.required,
        amount: o.refund.amount,
        status: o.refund.status,
        note: o.refund.note || '',
        reference: o.refund.reference || '',
        refundedAt: o.refund.refundedAt?.toISOString
          ? o.refund.refundedAt.toISOString()
          : o.refund.refundedAt || null,
        refundedBy: o.refund.refundedBy?.toString
          ? o.refund.refundedBy.toString()
          : o.refund.refundedBy || null,
      }
    }
    if (o.idempotencyKey) {
      dto.idempotencyKey = o.idempotencyKey
    }
    if (o.sellerFulfillment) {
      dto.sellerFulfillment = o.sellerFulfillment.map((sf) => ({
        sellerId: sf.sellerId?.toString ? sf.sellerId.toString() : String(sf.sellerId),
        status: sf.status,
        updatedAt: sf.updatedAt?.toISOString ? sf.updatedAt.toISOString() : sf.updatedAt,
      }))
    }
    dto.payment = o.payment
      ? {
          id: o.payment.id || o.payment._id?.toString(),
          attempt: o.payment.attempt,
          orderId,
          orderNumber: o.number,
          customerId,
          customerName: o.delivery?.name,
          customerPhone: o.delivery?.phone,
          total: o.total,
          senderPhone: o.payment.senderPhone,
          reference: o.payment.reference,
          transferredAmount: o.payment.transferredAmount,
          screenshotUrl: o.payment.screenshot?.url || o.payment.screenshotUrl || '',
          status: o.payment.status,
          flags: o.payment.flags || [],
          rejectReason: o.payment.rejectReason || null,
          rejectNotes: o.payment.rejectNotes || '',
          submittedAt: o.payment.submittedAt?.toISOString
            ? o.payment.submittedAt.toISOString()
            : o.payment.submittedAt,
          reviewedAt: o.payment.reviewedAt?.toISOString
            ? o.payment.reviewedAt.toISOString()
            : o.payment.reviewedAt || null,
          reviewedBy: o.payment.reviewedBy?.toString ? o.payment.reviewedBy.toString() : o.payment.reviewedBy || null,
        }
      : null

    if (o.payments && Array.isArray(o.payments)) {
      dto.payments = o.payments.map((p) => {
        const pObj = p.toObject ? p.toObject() : { ...p }
        return {
          id: pObj.id || pObj._id?.toString(),
          attempt: pObj.attempt,
          senderPhone: pObj.senderPhone,
          reference: pObj.reference,
          transferredAmount: pObj.transferredAmount,
          screenshotUrl: pObj.screenshot?.url || pObj.screenshotUrl || '',
          status: pObj.status,
          flags: pObj.flags || [],
          rejectReason: pObj.rejectReason || null,
          rejectNotes: pObj.rejectNotes || '',
          submittedAt: pObj.submittedAt?.toISOString
            ? pObj.submittedAt.toISOString()
            : pObj.submittedAt,
          reviewedAt: pObj.reviewedAt?.toISOString
            ? pObj.reviewedAt.toISOString()
            : pObj.reviewedAt || null,
          reviewedBy: pObj.reviewedBy?.toString ? pObj.reviewedBy.toString() : pObj.reviewedBy || null,
        }
      })
    }
  } else {
    // Customer sees safe payment proof summary without admin internal flags
    dto.payment = o.payment
      ? {
          id: o.payment.id || o.payment._id?.toString(),
          attempt: o.payment.attempt,
          senderPhone: o.payment.senderPhone,
          reference: o.payment.reference,
          transferredAmount: o.payment.transferredAmount,
          screenshotUrl: o.payment.screenshot?.url || o.payment.screenshotUrl || '',
          status: o.payment.status,
          rejectReason: o.payment.rejectReason || null,
          rejectNotes: o.payment.rejectNotes || '',
          submittedAt: o.payment.submittedAt?.toISOString
            ? o.payment.submittedAt.toISOString()
            : o.payment.submittedAt,
          reviewedAt: o.payment.reviewedAt?.toISOString
            ? o.payment.reviewedAt.toISOString()
            : o.payment.reviewedAt || null,
        }
      : null
  }

  return dto
}

export default {
  toOrderItemDTO,
  toOrderDTO,
}
