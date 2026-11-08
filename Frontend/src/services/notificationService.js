import apiClient from './api'

export const notificationService = {
  /**
   * Get paginated notifications list for the current user
   */
  async getNotifications(params = {}) {
    return apiClient.get('/notifications', { params })
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount() {
    return apiClient.get('/notifications/unread-count')
  },

  /**
   * Mark a single notification as read
   */
  async markRead(id) {
    return apiClient.patch(`/notifications/${id}/read`)
  },

  /**
   * Mark all notifications as read
   */
  async markAllRead() {
    return apiClient.post('/notifications/read-all')
  },
}

export default notificationService
