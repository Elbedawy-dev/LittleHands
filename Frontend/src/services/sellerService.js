import apiClient from './api.js'

/**
 * خدمة البائعات والورش الشريكة
 */
export const sellerService = {
  /**
   * استعراض قائمة البائعات النشطات
   * GET /sellers
   */
  async getSellers() {
    const res = await apiClient.get('/sellers')
    return Array.isArray(res) ? res : res?.items || []
  },

  /**
   * جلب تفاصيل بائعة محددة
   * GET /sellers/:id
   */
  async getSeller(id) {
    const res = await apiClient.get(`/sellers/${id}`)
    return res?.seller || res
  },

  async getSellerById(id) {
    return this.getSeller(id)
  },

  /**
   * جلب منتجات ورشة بائعة محددة
   * GET /sellers/:id/products
   */
  async getSellerProducts(id, params = {}) {
    const res = await apiClient.get(`/sellers/${id}/products`, { params })
    return Array.isArray(res) ? res : res?.items || []
  },

  /**
   * تحديث الملف المهني للبائعة الحالية
   * PATCH /sellers/me/profile
   */
  async updateSellerProfile(arg1, arg2) {
    const data = typeof arg1 === 'object' ? arg1 : arg2
    const res = await apiClient.patch('/sellers/me/profile', data)
    return res?.seller || res
  },
}

export default sellerService
