/**
 * Payment DTO Mapper
 * Enforces role-based response shaping:
 * - Seller: NEVER receives payment details.
 * - Customer: Receives safe payment submission summary (no flags, no internal fields).
 * - Admin: Receives full verification details including risk flags and reviewer ID.
 */

export function toPaymentDTO(payment, viewerRole = 'admin', extra = {}) {
  if (!payment) return null
  const p = payment.toObject ? payment.toObject() : { ...payment }

  if (viewerRole === 'seller') {
    return null
  }

  const base = {
    id: p.id || p._id?.toString(),
    senderPhone: p.senderPhone,
    transferredAmount: p.transferredAmount,
    reference: p.reference || '',
    screenshotUrl: p.screenshot?.url || p.screenshotUrl || '',
    status: p.status,
    submittedAt: p.submittedAt?.toISOString ? p.submittedAt.toISOString() : p.submittedAt,
  }

  if (viewerRole === 'admin') {
    return {
      ...base,
      orderId: (p.orderId?.toString ? p.orderId.toString() : p.orderId) || extra.orderId || '',
      orderNumber: extra.orderNumber || '',
      customerId: extra.customerId || '',
      customerName: extra.customerName || '',
      customerPhone: extra.customerPhone || '',
      total: extra.total !== undefined ? extra.total : 0,
      attempt: p.attempt || 1,
      flags: p.flags || [],
      rejectReason: p.rejectReason || null,
      rejectNotes: p.rejectNotes || '',
      reviewedAt: p.reviewedAt?.toISOString ? p.reviewedAt.toISOString() : p.reviewedAt || null,
      reviewedBy: p.reviewedBy?.toString ? p.reviewedBy.toString() : p.reviewedBy || null,
    }
  }

  // Customer view
  return {
    ...base,
    rejectReason: p.rejectReason || null,
    rejectNotes: p.rejectNotes || '',
    reviewedAt: p.reviewedAt?.toISOString ? p.reviewedAt.toISOString() : p.reviewedAt || null,
  }
}

export default toPaymentDTO
