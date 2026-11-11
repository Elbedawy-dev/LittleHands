import apiClient from './api.js'

export const contactService = {
  /**
   * Public: Submit a custom nursery request
   */
  async sendCustomRequest({ name, phone, nurseryName = '', details }) {
    return apiClient.post('/contact/custom-requests', {
      name,
      phone,
      nurseryName: nurseryName || '',
      details,
    })
  },

  /**
   * Admin: Get custom requests
   */
  async getCustomRequests(params = {}) {
    return apiClient.get('/admin/custom-requests', { params })
  },

  /**
   * Admin: Update status of a custom request ('new' | 'pending' | 'contacted' | 'closed')
   */
  async updateCustomRequestStatus(id, status) {
    return apiClient.patch(`/admin/custom-requests/${id}`, { status })
  },

  /**
   * Admin: Delete custom request
   * DELETE /admin/custom-requests/:id
   */
  async deleteCustomRequest(id) {
    return apiClient.delete(`/admin/custom-requests/${id}`)
  },
}

export default contactService
