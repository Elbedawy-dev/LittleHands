/**
 * Settings DTO mappers (role-based response shaping).
 * SECURITY: commissionRate is returned ONLY to seller/admin, never to public/customer.
 */

import { GOVERNORATE_NAMES, SHIPPING_ZONE_LABELS } from '../../config/constants.js'

const plain = (doc) => (doc.toObject ? doc.toObject() : { ...doc })

/** [{zone, price, governorates}] -> {zone: price} (the shape the frontend uses). */
export function toShippingRatesMap(zones = []) {
  return Object.fromEntries(zones.map((z) => [z.zone, z.price]))
}

/** Full zone list (with governorates and bilingual zone labels) — returned as `meta.zones`. */
export function toShippingZonesDTO(zones = []) {
  return zones.map((z) => ({
    zone: z.zone,
    name: SHIPPING_ZONE_LABELS[z.zone]?.ar || z.zone,
    nameEn: SHIPPING_ZONE_LABELS[z.zone]?.en || z.zone,
    price: z.price,
    governorates: [...(z.governorates || [])],
  }))
}

/** Flat governorate list [{name, nameEn, zoneId, price}] — returned as `meta.governorates`. */
export function toShippingGovernoratesDTO(zones = []) {
  return zones.flatMap((z) =>
    (z.governorates || []).map((gov) => ({
      name: gov,
      nameEn: GOVERNORATE_NAMES[gov]?.en || gov,
      zoneId: z.zone,
      price: z.price,
    }))
  )
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
    emailNotifications: s.emailNotifications !== false,
    inSiteNotifications: s.inSiteNotifications !== false,
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
