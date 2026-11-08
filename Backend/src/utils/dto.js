/**
 * Role-Based DTO Mappers
 * Enforces data privacy and field scoping per role:
 * - Customer: No commission fields, no seller net earnings, only own orders.
 * - Seller: Only items belonging to the seller; NO payment screenshot, sender phone, or reference;
 *           delivery address/phone masked until order is payment_confirmed.
 * - Admin: Full access.
 * - Public: Strips all internal, financial, and personal details.
 */

export function mapUserDTO(user, viewerRole = 'public', viewerId = null) {
  if (!user) return null
  const u = user.toObject ? user.toObject() : { ...user }

  // Base fields available to public
  const base = {
    id: u.id || u._id?.toString(),
    name: u.name,
    role: u.role,
    avatar: u.avatar?.url || u.avatar || null,
    nurseryName: u.nurseryName || '',
    createdAt: u.createdAt,
  }

  // Seller profile details
  if (u.role === 'seller') {
    base.seller = {
      displayName: u.seller?.displayName || u.name,
      bio: u.seller?.bio || { ar: '', en: '' },
      stages: u.seller?.stages || [],
      materials: u.seller?.materials || [],
      city: u.city || '',
      governorate: u.governorate || '',
    }
  }

  const isSelf = viewerId && (viewerId === base.id || viewerId.toString() === base.id)
  const isAdmin = viewerRole === 'admin'

  if (isSelf || isAdmin) {
    return {
      ...base,
      email: u.email,
      phone: u.phone,
      accountType: u.accountType,
      governorate: u.governorate,
      city: u.city,
      address: u.address,
      locale: u.locale,
      emailVerified: !!u.emailVerified,
      status: u.status,
      mustChangePassword: !!u.mustChangePassword,
      notificationPrefs: u.notificationPrefs,
      seller: u.role === 'seller' ? {
        ...base.seller,
        payoutWallet: u.seller?.payoutWallet || u.phone,
      } : undefined,
      ...(isAdmin ? {
        failedLoginCount: u.failedLoginCount,
        lockUntil: u.lockUntil,
        lastLoginAt: u.lastLoginAt,
      } : {}),
    }
  }

  return base
}

export function mapProductDTO(product, _viewerRole = 'public', _viewerSellerId = null) {
  if (!product) return null
  const p = product.toObject ? product.toObject() : { ...product }

  const dto = {
    id: p.id || p._id?.toString(),
    name: p.name,
    nameEn: typeof p.name === 'object' ? p.name?.en : p.nameEn || '',
    slug: p.slug,
    categoryId: p.categorySlug || p.categoryId,
    sellerId: p.sellerId?.toString(),
    sellerName: p.sellerName || '',
    price: p.price,
    description: p.description,
    details: p.details,
    stages: p.stages || (p.stage ? [p.stage] : []),
    materials: p.materials || [],
    images: Array.isArray(p.images) ? p.images.map((img) => (typeof img === 'string' ? img : img.url)) : [],
    inStock: p.stock !== undefined ? p.stock > 0 : p.inStock !== false,
    stockCount: p.stock !== undefined ? p.stock : p.stockCount || 0,
    published: p.published !== undefined ? Boolean(p.published) : Boolean(p.isPublished),
    isPublished: p.published !== undefined ? Boolean(p.published) : Boolean(p.isPublished),
    isFeatured: !!p.isFeatured,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }

  return dto
}

export function mapOrderItemDTO(item, viewerRole = 'customer', viewerSellerId = null) {
  if (!item) return null
  const it = item.toObject ? item.toObject() : { ...item }

  const base = {
    productId: it.productId?.toString(),
    name: it.name,
    qty: it.qty,
    unitPrice: it.unitPrice,
    sellerId: it.sellerId?.toString(),
    image: it.image?.url || it.image || '',
  }

  // Only admin or the specific seller sees commission details
  const isSellerItem = viewerRole === 'seller' && viewerSellerId && viewerSellerId === base.sellerId
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

export function mapOrderDTO(order, viewerRole = 'customer', viewerUserId = null) {
  if (!order) return null
  const o = order.toObject ? order.toObject() : { ...order }

  const orderId = o.id || o._id?.toString()
  const customerId = o.customerId?.toString()

  let items = o.items || []
  let delivery = { ...o.delivery }

  if (viewerRole === 'seller') {
    // A seller only sees items belonging to her
    items = items.filter((it) => it.sellerId?.toString() === viewerUserId?.toString())
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

  const mappedItems = items.map((it) => mapOrderItemDTO(it, viewerRole, viewerUserId))

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
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }

  // Payment scoping:
  // Seller NEVER receives payment data (screenshot, senderPhone, reference)
  if (viewerRole === 'seller') {
    dto.payment = null
  } else if (viewerRole === 'admin') {
    dto.payment = o.payment ? {
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
      rejectReason: o.payment.rejectReason,
      rejectNotes: o.payment.rejectNotes,
      submittedAt: o.payment.submittedAt,
      reviewedAt: o.payment.reviewedAt,
      reviewedBy: o.payment.reviewedBy,
    } : null
  } else {
    // Customer sees safe payment proof summary without admin internal flags
    dto.payment = o.payment ? {
      senderPhone: o.payment.senderPhone,
      reference: o.payment.reference,
      transferredAmount: o.payment.transferredAmount,
      screenshotUrl: o.payment.screenshot?.url || o.payment.screenshotUrl || '',
      status: o.payment.status,
      rejectReason: o.payment.rejectReason,
      rejectNotes: o.payment.rejectNotes,
      submittedAt: o.payment.submittedAt,
      reviewedAt: o.payment.reviewedAt,
    } : null
  }

  return dto
}

export default {
  mapUserDTO,
  mapProductDTO,
  mapOrderItemDTO,
  mapOrderDTO,
}
