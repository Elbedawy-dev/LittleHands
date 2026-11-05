import { db } from '../mocks/db'
import { delay } from '../utils'

/**
 * خدمة إعدادات المنصة وأسعار الشحن
 */
export const settingsService = {
  async getSettings() {
    await delay(200)
    return { ...db.data.settings }
  },

  async updateSettings(values) {
    await delay(350)
    db.data.settings = { ...db.data.settings, ...values }
    db.save()
    return { ...db.data.settings }
  },

  async getShippingRates() {
    await delay(200)
    return { ...db.data.settings.shippingRates }
  },

  async updateShippingRates(rates) {
    await delay(350)
    db.data.settings.shippingRates = { ...db.data.settings.shippingRates, ...rates }
    db.save()
    return { ...db.data.settings.shippingRates }
  },
}

