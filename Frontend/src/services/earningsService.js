import apiClient from './api.js'

export const earningsService = {
  /**
   * Admin: Get platform analytics overview
   */
  async getAdminOverview(period = 'month') {
    return apiClient.get('/admin/overview', { params: { period } })
  },

  /**
   * Seller: Get own earnings overview
   */
  async getSellerOverview(sellerId, period = 'month') {
    // Backend automatically scopes seller to req.user._id
    return apiClient.get('/earnings/seller/overview', { params: { period } })
  },

  /**
   * Seller: Get own detailed earnings
   */
  async getSellerEarnings(query = {}) {
    return apiClient.get('/earnings/seller/earnings', { params: query })
  },

  /**
   * Seller: Get own payouts history
   * GET /earnings/seller/payouts
   */
  async getSellerPayouts(params = {}) {
    return apiClient.get('/earnings/seller/payouts', { params })
  },

  /**
   * Admin: Get all sellers' earnings summary
   */
  async getSellersEarnings() {
    return apiClient.get('/admin/sellers/earnings')
  },

  /**
   * Admin: Get drilldown of orders for a specific seller
   */
  async getSellerOrdersDrilldown(sellerId, params = {}) {
    return apiClient.get(`/admin/sellers/${sellerId}/orders`, { params })
  },

  /**
   * Get payouts (seller gets own payouts via /earnings/seller/payouts, admin gets via /admin/payouts)
   */
  async getPayouts(params = {}) {
    // If params.sellerId is provided, or if called by admin
    try {
      return await apiClient.get('/admin/payouts', { params })
    } catch {
      // Fallback for seller role
      return await apiClient.get('/earnings/seller/payouts', { params })
    }
  },

  /**
   * Admin: Record a payout to a seller
   */
  async recordPayout({ sellerId, amount, reference, date, notes = '', note = '' }) {
    return apiClient.post('/admin/payouts', {
      sellerId,
      amount: Number(amount),
      reference: reference || '',
      date: date || new Date().toISOString(),
      note: note || notes || '',
    })
  },
}

export default earningsService
