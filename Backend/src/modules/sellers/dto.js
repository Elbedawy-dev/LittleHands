import { toCategoryDTO } from '../catalog/dto.js'

/**
 * Public Seller Profile DTO.
 * Guarantees privacy: No phone, email, payout wallet, or internal fields.
 */
export function toSellerPublicDTO(seller, { productsCount = 0, categoryIds = [], categories = [], completedOrdersCount = 0 } = {}) {
  if (!seller) return null
  const s = seller.toObject ? seller.toObject() : { ...seller }

  return {
    id: s.id || s._id?.toString(),
    name: s.name,
    avatar: s.avatar?.url || s.avatar || null,
    seller: {
      displayName: s.seller?.displayName || { ar: s.name, en: 'Seller' },
      bio: s.seller?.bio || { ar: '', en: '' },
      stages: s.seller?.stages || [],
      materials: s.seller?.materials || [],
      city: s.city || '',
      governorate: s.governorate || '',
    },
    productsCount,
    categoryIds,
    categories: categories.map(toCategoryDTO),
    completedOrdersCount,
    createdAt: s.createdAt,
  }
}

export const toSellerDTO = (seller, _viewerRole = 'public', extra = {}) => {
  return toSellerPublicDTO(seller, extra)
}

/**
 * Masks phone number: first 3 and last 3 characters visible, rest asterisks.
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  const trimmed = phone.trim()
  if (trimmed.length <= 6) return '*'.repeat(trimmed.length)
  const first = trimmed.slice(0, 3)
  const last = trimmed.slice(-3)
  const stars = '*'.repeat(trimmed.length - 6)
  return `${first}${stars}${last}`
}

/**
 * DTO for Custom Request presented to an artisan seller.
 * Privacy rule: full phone ONLY if claimedByMe, otherwise masked.
 * Strictly conceals other seller IDs and personal data.
 */
export function toSellerCustomRequestDTO(doc, sellerId) {
  if (!doc) return null
  const r = doc.toObject ? doc.toObject() : { ...doc }
  const claimedById = r.claimedBy?._id?.toString() || (typeof r.claimedBy === 'string' ? r.claimedBy : null)
  const isClaimedByMe = Boolean(claimedById && sellerId && claimedById === sellerId.toString())

  let claimedByName = null
  if (r.claimedBy) {
    if (typeof r.claimedBy === 'object') {
      claimedByName = r.claimedBy.seller?.displayName?.ar || r.claimedBy.name || null
    }
  }

  return {
    id: r.id || r._id?.toString(),
    nurseryName: r.nurseryName || '',
    customerName: r.name,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    claimed: Boolean(r.claimedBy),
    claimedByMe: isClaimedByMe,
    claimedByName,
    phone: isClaimedByMe ? r.phone : maskPhone(r.phone),
  }
}

export default { toSellerPublicDTO, toSellerDTO, maskPhone, toSellerCustomRequestDTO }
