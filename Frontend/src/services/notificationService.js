import apiClient from './api.js'

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

  /**
   * Delete a single notification
   * DELETE /notifications/:id
   */
  async deleteNotification(id) {
    return apiClient.delete(`/notifications/${id}`)
  },

  /**
   * Delete all notifications (or read-only when read=true)
   * DELETE /notifications
   */
  async deleteNotifications(readOnly = false) {
    return apiClient.delete('/notifications', {
      params: readOnly ? { read: true } : {},
    })
  },
}

export default notificationService
