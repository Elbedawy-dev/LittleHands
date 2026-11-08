import apiClient from './api.js'

export function normalizeProduct(p) {
  if (!p) return null
  const id = p.id || p._id
  const images = Array.isArray(p.images)
    ? p.images.map((img) => (typeof img === 'string' ? img : img.url || ''))
    : []
  const rawImages = Array.isArray(p.images)
    ? p.images.map((img) => (typeof img === 'string' ? { url: img, key: img.split('/').pop() } : img))
    : []

  return {
    ...p,
    id,
    _id: id,
    images,
    rawImages,
    inStock: p.stock !== undefined ? p.stock > 0 : p.inStock !== false,
    stock: p.stock !== undefined ? p.stock : p.stockCount || 0,
    stockCount: p.stock !== undefined ? p.stock : p.stockCount || 0,
    published: p.published !== undefined ? Boolean(p.published) : Boolean(p.isPublished),
    isPublished: p.published !== undefined ? Boolean(p.published) : Boolean(p.isPublished),
    stages: Array.isArray(p.stages) ? p.stages : p.stage ? [p.stage] : [],
  }
}

/**
 * خدمة استعراض الكتالوج والتصنيفات والوسائل التعليمية
 */
export const catalogService = {
  /**
   * جلب تصنيفات الوسائل التعليمية
   * GET /catalog/categories
   */
  async getCategories() {
    const res = await apiClient.get('/catalog/categories')
    return Array.isArray(res) ? res : res?.items || []
  },

  /**
   * تصفية وبحث في كتالوج الوسائل التعليمية مع دعم الترقيم والفرز
   * GET /catalog/products
   */
  async getProducts(params = {}) {
    const query = {
      q: params.q || '',
      category: params.category || '',
      sellerId: params.sellerId || '',
      stage: params.stage || '',
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      inStock: params.inStock,
      sort: params.sort || 'newest',
      page: params.page || 1,
      pageSize: params.pageSize || 12,
    }

    // Clean undefined / empty query params
    Object.keys(query).forEach((key) => {
      if (query[key] === undefined || query[key] === '') {
        delete query[key]
      }
    })

    const res = await apiClient.get('/catalog/products', { params: query })

    const rawItems = res?.items || (Array.isArray(res) ? res : [])
    const items = rawItems.map(normalizeProduct)
    const total = res?.total !== undefined ? res.total : items.length
    const page = res?.page || query.page || 1
    const pageSize = res?.pageSize || query.pageSize || 12
    const totalPages = res?.totalPages || Math.ceil(total / pageSize) || 1

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    }
  },

  /**
   * جلب تفاصيل وسيلة تعليمية واحدة
   * GET /catalog/products/:id
   */
  async getProduct(id) {
    const res = await apiClient.get(`/catalog/products/${id}`)
    const product = res?.product || res
    return normalizeProduct(product)
  },

  /**
   * جلب الوسائل التعليمية المميزة للصفحة الرئيسية
   * GET /catalog/products/featured
   */
  async getFeaturedProducts(limit = 6) {
    const res = await apiClient.get('/catalog/products/featured', { params: { limit } })
    const items = Array.isArray(res) ? res : res?.items || []
    return items.map(normalizeProduct)
  },

  /**
   * جلب الوسائل التعليمية ذات الصلة
   * GET /catalog/products/:id/related
   */
  async getRelatedProducts(id, limit = 4) {
    try {
      const res = await apiClient.get(`/catalog/products/${id}/related`, { params: { limit } })
      const items = Array.isArray(res) ? res : res?.items || []
      return items.map(normalizeProduct)
    } catch {
      return []
    }
  },
}

export default catalogService
