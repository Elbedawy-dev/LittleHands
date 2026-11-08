import apiClient from './api'

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
    return apiClient.get('/admin/sellers/accounts')
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
    return apiClient.put('/admin/categories/order', slugsOrIds)
  },
}

export default adminService
