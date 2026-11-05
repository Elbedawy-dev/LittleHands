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

export default { toSellerPublicDTO, toSellerDTO }
