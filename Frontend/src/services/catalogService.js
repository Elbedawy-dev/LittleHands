import { db } from '../mocks/db'
import { delay } from '../utils'

/**
 * خدمة استعراض الكتالوج والتصنيفات والوسائل التعليمية
 */
export const catalogService = {
  async getCategories() {
    await delay(250)
    return [...db.data.categories]
  },

  async getProducts({
    q = '',
    category = '',
    sellerId = '',
    minPrice,
    maxPrice,
    stage = '',
    inStock,
    sort = 'newest',
    page = 1,
    pageSize = 12,
  } = {}) {
    await delay(350)
    let filtered = db.data.products.filter((p) => p.isPublished)

    if (q) {
      const query = q.trim().toLowerCase()
      filtered = filtered.filter((p) => {
        const nameAr = typeof p.name === 'object' ? p.name?.ar || '' : p.name || ''
        const nameEn = typeof p.name === 'object' ? p.name?.en || '' : p.nameEn || ''
        const descAr = typeof p.description === 'object' ? p.description?.ar || '' : p.description || ''
        const descEn = typeof p.description === 'object' ? p.description?.en || '' : p.descriptionEn || ''
        return (
          nameAr.toLowerCase().includes(query) ||
          nameEn.toLowerCase().includes(query) ||
          descAr.toLowerCase().includes(query) ||
          descEn.toLowerCase().includes(query)
        )
      })
    }

    if (category) {
      filtered = filtered.filter((p) => p.categoryId === category)
    }

    if (sellerId) {
      filtered = filtered.filter((p) => p.sellerId === sellerId)
    }

    if (typeof minPrice === 'number' && !isNaN(minPrice)) {
      filtered = filtered.filter((p) => p.price >= minPrice)
    }

    if (typeof maxPrice === 'number' && !isNaN(maxPrice)) {
      filtered = filtered.filter((p) => p.price <= maxPrice)
    }

    if (stage) {
      filtered = filtered.filter((p) => p.stages && p.stages.includes(stage))
    }

    if (typeof inStock === 'boolean') {
      filtered = filtered.filter((p) => p.inStock === inStock)
    }

    // الترتيب
    if (sort === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price)
    } else if (sort === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price)
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    } else {
      // newest
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    const total = filtered.length
    const startIndex = (page - 1) * pageSize
    const items = filtered.slice(startIndex, startIndex + pageSize)

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  },

  async getProduct(id) {
    await delay(300)
    const product = db.data.products.find((p) => p.id === id || p.slug === id)
    if (!product) {
      throw new Error('ERR_PRODUCT_NOT_FOUND')
    }
    return product
  },

  async getFeaturedProducts(limit = 6) {
    await delay(300)
    const featured = db.data.products
      .filter((p) => p.isPublished && p.isFeatured)
      .slice(0, limit)
    return featured
  },

  async getRelatedProducts(id, limit = 4) {
    await delay(300)
    const current = db.data.products.find((p) => p.id === id)
    if (!current) return []

    const related = db.data.products
      .filter((p) => p.id !== id && p.isPublished && p.categoryId === current.categoryId)
      .slice(0, limit)

    // إذا لم يتوفر عدد كافٍ من نفس التصنيف، جلب من تصنيفات أخرى
    if (related.length < limit) {
      const others = db.data.products
        .filter((p) => p.id !== id && p.isPublished && !related.some((r) => r.id === p.id))
        .slice(0, limit - related.length)
      return [...related, ...others]
    }

    return related
  },
}

