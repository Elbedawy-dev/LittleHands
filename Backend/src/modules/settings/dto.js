/**
 * Settings DTO Mappers
 * Security Rule: commissionRate is NEVER exposed in public or customer responses.
 */

export function toPublicSettingsDTO(settings) {
  if (!settings) return null
  const s = settings.toObject ? settings.toObject() : { ...settings }

  return {
    platformWallet: s.platformWallet || '',
    shippingRates: s.shippingRates || [],
    deliveryTimeText: s.deliveryTimeText,
    supportPhone: s.supportPhone || '',
    supportEmail: s.supportEmail || '',
    whatsappNumber: s.whatsappNumber || '',
    maintenanceMode: !!s.maintenanceMode,
  }
}

export function toSellerSettingsDTO(settings) {
  if (!settings) return null
  const s = settings.toObject ? settings.toObject() : { ...settings }

  return {
    ...toPublicSettingsDTO(s),
    commissionRate: s.commissionRate !== undefined ? s.commissionRate : 0.20,
    payoutScheduleText: s.payoutScheduleText || '',
  }
}

export function toAdminSettingsDTO(settings) {
  if (!settings) return null
  const s = settings.toObject ? settings.toObject() : { ...settings }

  return {
    ...toSellerSettingsDTO(s),
    notifications: s.notifications || {
      orderCreated: true,
      paymentSubmitted: true,
      payoutRecorded: true,
    },
  }
}

export function mapSettingsDTO(settings, role = 'public') {
  if (role === 'admin') {
    return toAdminSettingsDTO(settings)
  }
  if (role === 'seller') {
    return toSellerSettingsDTO(settings)
  }
  return toPublicSettingsDTO(settings)
}
