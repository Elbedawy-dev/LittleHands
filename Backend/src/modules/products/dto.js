import { mapProductDTO } from '../../utils/dto.js'
import { calcCommission } from '../../utils/money.js'
import { DEFAULT_COMMISSION_RATE } from '../../config/constants.js'

/**
 * Public product DTO.
 * Explicitly conceals all commission and seller net fields.
 */
export function toPublicProductDTO(product) {
  if (!product) return null
  const dto = mapProductDTO(product, 'public')

  const p = product.toObject ? product.toObject() : product
  if (p.sellerId && typeof p.sellerId === 'object' && p.sellerId._id) {
    const s = p.sellerId
    dto.seller = {
      id: s._id.toString(),
      displayName: s.seller?.displayName || { ar: s.name, en: 'Seller' },
      avatar: s.avatar?.url || s.avatar || null,
    }
  }

  // Double check removal of any internal financial details
  delete dto.commission
  delete dto.commissionRate
  delete dto.commissionAmount
  delete dto.sellerNet
  delete dto.net

  return dto
}

/**
 * Manageable product DTO for Sellers and Admin.
 * Enriches product with commissionAmount and sellerNet calculated at the current platform rate.
 */
export function toManageProductDTO(product, commissionRate = DEFAULT_COMMISSION_RATE) {
  if (!product) return null
  const dto = mapProductDTO(product, 'seller')

  const { commission, net } = calcCommission(dto.price, commissionRate)
  dto.commissionRate = Number(commissionRate)
  dto.commissionAmount = commission
  dto.sellerNet = net

  return dto
}

export const toProductDTO = (product, viewerRole = 'seller', _viewerId = null, commissionRate = DEFAULT_COMMISSION_RATE) => {
  if (viewerRole === 'public' || viewerRole === 'customer') {
    return toPublicProductDTO(product)
  }
  return toManageProductDTO(product, commissionRate)
}

export default { toPublicProductDTO, toManageProductDTO, toProductDTO }
