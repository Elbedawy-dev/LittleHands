import apiClient from './api.js'

export const settingsService = {
  /**
   * Get settings scoped to caller role (public for guest/customer, full for seller/admin)
   */
  async getSettings() {
    return apiClient.get('/settings')
  },

  /**
   * Get public settings (always safe, no commission rate)
   */
  async getPublicSettings() {
    return apiClient.get('/settings/public')
  },

  /**
   * Get shipping rates map / zones
   */
  async getShippingRates() {
    return apiClient.get('/settings/shipping-rates')
  },

  /**
   * Admin: Update platform settings
   */
  async updateSettings(values) {
    return apiClient.put('/admin/settings', values)
  },

  /**
   * Admin: Update shipping rates
   */
  async updateShippingRates(rates) {
    return apiClient.put('/admin/settings/shipping-rates', rates)
  },
}

export default settingsService
