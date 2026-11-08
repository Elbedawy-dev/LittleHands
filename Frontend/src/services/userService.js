import apiClient from './api.js'

/**
 * خدمة المستخدم الشخصية (الملف الشخصي، المفضلات، العناوين)
 */
export const userService = {
  /**
   * جلب الملف الشخصي للمستخدم الحالي
   * GET /users/me
   */
  async getProfile() {
    const res = await apiClient.get('/users/me')
    return res?.user || res
  },

  /**
   * تحديث بيانات الملف الشخصي
   * PATCH /users/me
   */
  async updateProfile(data) {
    const res = await apiClient.patch('/users/me', data)
    return res?.user || res
  },

  /**
   * رفع الصورة الشخصية
   * POST /users/me/avatar
   */
  async uploadAvatar(file) {
    const formData = new FormData()
    formData.append('avatar', file)
    const res = await apiClient.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res
  },

  /**
   * جلب قائمة الوسائل المفضلة
   * GET /users/me/favorites
   */
  async getFavorites() {
    const res = await apiClient.get('/users/me/favorites')
    return Array.isArray(res) ? res : res?.items || []
  },

  /**
   * إضافة أو إزالة وسيلة من المفضلات
   * POST /users/me/favorites/:productId
   */
  async toggleFavorite(productId) {
    const res = await apiClient.post(`/users/me/favorites/${productId}`)
    return res
  },

  /**
   * جلب عناوين التوصيل المسجلة
   * GET /users/me/addresses
   */
  async getAddresses() {
    const res = await apiClient.get('/users/me/addresses')
    return Array.isArray(res) ? res : res?.items || []
  },

  /**
   * حفظ أو تحديث عنوان توصيل
   */
  async saveAddress(addressData) {
    const id = addressData.id || addressData._id
    if (id) {
      const res = await apiClient.put(`/users/me/addresses/${id}`, addressData)
      return res
    }
    const res = await apiClient.post('/users/me/addresses', addressData)
    return res
  },

  /**
   * حذف عنوان توصيل
   * DELETE /users/me/addresses/:id
   */
  async deleteAddress(id) {
    const res = await apiClient.delete(`/users/me/addresses/${id}`)
    return res
  },

  /**
   * تحديث تفضيلات الإشعارات
   * PATCH /users/me/notification-prefs
   */
  async updateNotificationPrefs(prefs) {
    const res = await apiClient.patch('/users/me/notification-prefs', prefs)
    return res
  },
}

export default userService
