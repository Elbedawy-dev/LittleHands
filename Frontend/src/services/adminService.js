import apiClient from './api.js'

export const adminService = {
  /**
   * Admin: Create a new seller account (returns seller object & temporary password)
   */
  async createSellerAccount(data) {
    const res = await apiClient.post('/admin/sellers', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      governorate: data.governorate,
      workshopAddress: data.workshopAddress,
      bio: data.bio,
      stages: data.stages,
      materials: data.materials,
      payoutWallet: data.payoutWallet || data.phone,
    })
    return {
      seller: res.user || res.seller || res,
      temporaryPassword: res.tempPassword || res.temporaryPassword,
    }
  },

  /**
   * Admin: List all seller accounts
   */
  async getSellerAccounts() {
    const res = await apiClient.get('/admin/sellers/accounts')
    return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : []
  },

  /**
   * Admin: Update user status (active | suspended)
   */
  async updateUserStatus(userId, status) {
    return apiClient.patch(`/admin/users/${userId}/status`, { status })
  },

  /**
   * Admin: List customers with optional search/pagination
   */
  async getCustomers(params = {}) {
    return apiClient.get('/admin/customers', { params })
  },

  /**
   * Admin: Update category
   */
  async updateCategory(slugOrId, data) {
    return apiClient.put(`/admin/categories/${slugOrId}`, data)
  },

  /**
   * Admin: Reorder categories
   */
  async reorderCategories(slugsOrIds) {
    const payload = Array.isArray(slugsOrIds) ? { slugs: slugsOrIds } : slugsOrIds
    return apiClient.put('/admin/categories/order', payload)
  },

  /**
   * Admin: Delete user (customer or seller)
   * DELETE /admin/users/:id
   */
  async deleteUser(userId) {
    return apiClient.delete(`/admin/users/${userId}`)
  },
}

export default adminService
