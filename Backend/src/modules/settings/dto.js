/**
 * Settings DTO mappers (role-based response shaping).
 * SECURITY: commissionRate is returned ONLY to seller/admin, never to public/customer.
 */

const plain = (doc) => (doc.toObject ? doc.toObject() : { ...doc })

/** [{zone, price, governorates}] -> {zone: price} (the shape the frontend uses). */
export function toShippingRatesMap(zones = []) {
  return Object.fromEntries(zones.map((z) => [z.zone, z.price]))
}

/** Full zone list (with governorates) — returned as `meta.zones` on shipping endpoints. */
export function toShippingZonesDTO(zones = []) {
  return zones.map((z) => ({
    zone: z.zone,
    price: z.price,
    governorates: [...(z.governorates || [])],
  }))
}

export function toPublicSettingsDTO(settings) {
  if (!settings) return null
  const s = plain(settings)
  return {
    platformWallet: s.platformWallet || '',
    shippingRates: toShippingRatesMap(s.shippingRates),
    deliveryTimeText: s.deliveryTimeText,
    supportPhone: s.supportPhone || '',
    supportEmail: s.supportEmail || '',
    whatsappNumber: s.whatsappNumber || '',
    maintenanceMode: !!s.maintenanceMode,
  }
}

export function toSellerSettingsDTO(settings) {
  if (!settings) return null
  const s = plain(settings)
  return {
    ...toPublicSettingsDTO(s),
    commissionRate: s.commissionRate,
    payoutScheduleText: s.payoutScheduleText || '',
  }
}

export function toAdminSettingsDTO(settings) {
  if (!settings) return null
  const s = plain(settings)
  return {
    ...toSellerSettingsDTO(s),
    notifications: s.notifications || {},
  }
}

export function mapSettingsDTO(settings, role = 'public') {
  if (role === 'admin') return toAdminSettingsDTO(settings)
  if (role === 'seller') return toSellerSettingsDTO(settings)
  return toPublicSettingsDTO(settings)
}
