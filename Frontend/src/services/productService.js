import apiClient from './api.js'
import { normalizeProduct } from './catalogService.js'

/**
 * خدمة إدارة الوسائل التعليمية للبائعات والإدارة
 */
export const productService = {
  /**
   * جلب الوسائل التعليمية القابلة للإدارة
   * GET /products/manage/products
   */
  async getManageableProducts(params = {}) {
    const query = { ...params }
    if (query.status === 'all') delete query.status
    const res = await apiClient.get('/products/manage/products', { params: query })
    const items = Array.isArray(res) ? res : res?.items || []
    return items.map(normalizeProduct)
  },

  /**
   * إنشاء وسيلة تعليمية جديدة
   * POST /products/manage/products
   */
  async createProduct(values) {
    const payload = {
      name: values.name,
      nameEn: values.nameEn || '',
      categoryId: values.categoryId,
      sellerId: values.sellerId || undefined,
      price: Number(values.price) || 0,
      stock: values.stockCount !== undefined ? Number(values.stockCount) : Number(values.stock) || 0,
      description: values.description || '',
      stages: values.stages || ['nursery'],
      materials: values.materials || ['felt'],
      images: values.images || [],
      published: values.isPublished !== undefined ? Boolean(values.isPublished) : values.published !== false,
      featured: values.isFeatured !== undefined ? Boolean(values.isFeatured) : Boolean(values.featured),
    }

    if (!payload.sellerId) {
      delete payload.sellerId
    }

    const res = await apiClient.post('/products/manage/products', payload)
    const product = res?.product || res
    return normalizeProduct(product)
  },

  /**
   * تعديل بيانات وسيلة تعليمية
   * PATCH /products/manage/products/:id
   */
  async updateProduct(id, values) {
    const payload = { ...values }
    if (payload.stockCount !== undefined && payload.stock === undefined) {
      payload.stock = Number(payload.stockCount)
      delete payload.stockCount
    }
    if (payload.isPublished !== undefined && payload.published === undefined) {
      payload.published = Boolean(payload.isPublished)
      delete payload.isPublished
    }
    if (payload.isFeatured !== undefined && payload.featured === undefined) {
      payload.featured = Boolean(payload.isFeatured)
      delete payload.isFeatured
    }

    const res = await apiClient.patch(`/products/manage/products/${id}`, payload)
    const product = res?.product || res
    return normalizeProduct(product)
  },

  /**
   * حذف وسيلة تعليمية
   * DELETE /products/manage/products/:id
   */
  async deleteProduct(id) {
    const res = await apiClient.delete(`/products/manage/products/${id}`)
    return res
  },

  /**
   * تبديل حالة النشر (نشر / مسودة)
   * PATCH /products/manage/products/:id/publish
   */
  async setPublished(id, published) {
    const res = await apiClient.patch(`/products/manage/products/${id}/publish`, {
      published: Boolean(published),
    })
    const product = res?.product || res
    return normalizeProduct(product)
  },

  async togglePublish(id, published) {
    return this.setPublished(id, published)
  },

  /**
   * رفع صور الوسيلة التعليمية إلى Cloudinary عبر الباك إند
   * POST /products/manage/products/images
   */
  async uploadImages(files, onProgress) {
    const formData = new FormData()
    const fileList = Array.isArray(files) ? files : [files]

    for (const f of fileList) {
      formData.append('images', f)
    }

    const res = await apiClient.post('/products/manage/products/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      },
    })

    return res?.urls || res || []
  },
}

export default productService
