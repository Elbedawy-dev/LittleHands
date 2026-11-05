import { mapProductDTO } from '../../utils/dto.js'

export function toCategoryDTO(category) {
  if (!category) return null
  const c = category.toObject ? category.toObject() : { ...category }
  const slug = c.slug || c.id || c._id?.toString()

  return {
    id: slug,
    slug,
    name: c.nameAr || c.name?.ar || '',
    nameAr: c.nameAr || c.name?.ar || '',
    nameEn: c.nameEn || c.name?.en || '',
    description: c.descriptionAr || c.description?.ar || '',
    descriptionAr: c.descriptionAr || c.description?.ar || '',
    descriptionEn: c.descriptionEn || c.description?.en || '',
    color: c.color || '#4DB6FF',
    bgColor: c.bgColor || 'rgba(77, 182, 255, 0.15)',
    textColor: c.textColor || '#0B72B9',
    icon: c.icon || 'BookOpen',
    order: c.order !== undefined ? c.order : 0,
  }
}

export function toCatalogProductDTO(product) {
  if (!product) return null
  const dto = mapProductDTO(product, 'public')

  // Attach safe public seller summary if populated
  const p = product.toObject ? product.toObject() : product
  if (p.sellerId && typeof p.sellerId === 'object' && p.sellerId._id) {
    const s = p.sellerId
    dto.seller = {
      id: s._id.toString(),
      displayName: s.seller?.displayName || { ar: s.name, en: 'Seller' },
      avatar: s.avatar?.url || s.avatar || null,
    }
  }

  // Ensure NO commission or seller financial keys exist in public DTO
  delete dto.commission
  delete dto.commissionRate
  delete dto.commissionAmount
  delete dto.sellerNet
  delete dto.net

  return dto
}

export default { toCategoryDTO, toCatalogProductDTO }
