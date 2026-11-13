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
    const raw = (typeof arg1 === 'object' ? arg1 : arg2) || {}
    const cleanPayload = {}
    if (raw.displayName !== undefined) cleanPayload.displayName = raw.displayName
    if (raw.bio !== undefined) cleanPayload.bio = raw.bio
    if (Array.isArray(raw.stages)) cleanPayload.stages = raw.stages
    if (Array.isArray(raw.materials)) cleanPayload.materials = raw.materials
    const wallet = raw.payoutWallet || raw.walletNumber
    if (wallet !== undefined && wallet !== '') cleanPayload.payoutWallet = wallet

    const res = await apiClient.patch('/sellers/me/profile', cleanPayload)
    return res?.seller || res
  },

  /**
   * جلب طلبات الوسائل التعليمية المخصصة المتاحة للبائعة
   * GET /sellers/me/custom-requests
   */
  async getCustomRequests(params = {}) {
    const res = await apiClient.get('/sellers/me/custom-requests', { params })
    const items = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : [])
    return {
      items,
      total: res?.total ?? items.length,
      page: res?.page ?? 1,
      pageSize: res?.pageSize ?? 12,
      totalPages: res?.totalPages ?? 1,
    }
  },

  /**
   * استلام وتنفيذ طلب وسيلة مخصصة
   * POST /sellers/me/custom-requests/:id/claim
   */
  async claimCustomRequest(id) {
    const res = await apiClient.post(`/sellers/me/custom-requests/${id}/claim`)
    return res?.data || res
  },

  /**
   * تحديث حالة طلب وسيلة مخصصة تم استلامه
   * PATCH /sellers/me/custom-requests/:id/status
   */
  async updateCustomRequestStatus(id, status) {
    const res = await apiClient.patch(`/sellers/me/custom-requests/${id}/status`, { status })
    return res?.data || res
  },
}

export default sellerService
