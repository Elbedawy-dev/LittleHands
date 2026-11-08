import { Setting } from '../../db/models/Setting.js'
import { SHIPPING_ZONES } from '../../config/constants.js'
import { AppError } from '../../utils/appError.js'
import { audit } from '../../infra/audit/index.js'
import {
  mapSettingsDTO,
  toAdminSettingsDTO,
  toPublicSettingsDTO,
  toShippingRatesMap,
  toShippingZonesDTO,
} from './dto.js'

const SINGLETON = 'platform_settings'
const AUDITED_FIELDS = [
  'commissionRate',
  'platformWallet',
  'supportPhone',
  'supportEmail',
  'whatsappNumber',
  'payoutScheduleText',
  'deliveryTimeText',
  'maintenanceMode',
  'emailNotifications',
  'inSiteNotifications',
]

/** Atomic get-or-create of the settings singleton (defaults come from the model + fixed zone config). */
async function getSettingsDoc() {
  let doc = await Setting.findOneAndUpdate(
    { singletonKey: SINGLETON },
    { $setOnInsert: { shippingRates: SHIPPING_ZONES } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
  if (!doc.shippingRates?.length) {
    doc.shippingRates = SHIPPING_ZONES
    doc = await doc.save()
  }
  return doc
}

function snapshot(doc) {
  const s = doc.toObject()
  const out = {}
  for (const key of AUDITED_FIELDS) out[key] = s[key]
  out.notifications = { ...(s.notifications || {}) }
  out.shippingRates = toShippingRatesMap(s.shippingRates)
  return out
}

function diff(before, after) {
  const b = {}
  const a = {}
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key]
      a[key] = after[key]
    }
  }
  return { before: b, after: a }
}

const validationError = (message, path) =>
  new AppError('VALIDATION_ERROR', 400, [{ path, message }])

export const settingsService = {
  /** Settings shaped by role: public/customer never see commissionRate. */
  async getSettings(role = 'public') {
    return mapSettingsDTO(await getSettingsDoc(), role)
  },

  async getPublicSettings() {
    return toPublicSettingsDTO(await getSettingsDoc())
  },

  /** Price map by zone id + full zone list (for admin screens). */
  async getShippingRates() {
    const doc = await getSettingsDoc()
    return {
      rates: toShippingRatesMap(doc.shippingRates),
      zones: toShippingZonesDTO(doc.shippingRates),
    }
  },

  async updateSettings(values, { actorId, ip } = {}) {
    const doc = await getSettingsDoc()
    const before = snapshot(doc)

    const simple = [
      'commissionRate',
      'platformWallet',
      'supportPhone',
      'supportEmail',
      'whatsappNumber',
      'payoutScheduleText',
      'maintenanceMode',
      'emailNotifications',
      'inSiteNotifications',
    ]
    for (const key of simple) {
      if (values[key] !== undefined) doc[key] = values[key]
    }

    const delivery = values.deliveryTimeText ?? values.deliveryTime
    if (delivery !== undefined) {
      const current = doc.deliveryTimeText || {}
      doc.deliveryTimeText =
        typeof delivery === 'string' ? { ar: delivery, en: current.en || '' } : delivery
      doc.markModified('deliveryTimeText')
    }

    if (values.notifications) {
      for (const [key, flag] of Object.entries(values.notifications)) {
        doc.set(`notifications.${key}`, flag)
      }
    }

    if (values.shippingRates) {
      applyPriceMap(doc, values.shippingRates)
    }

    await doc.save()
    const { before: b, after: a } = diff(before, snapshot(doc))
    if (Object.keys(a).length) {
      await audit.log(actorId, 'SETTINGS_UPDATED', 'Setting', doc._id.toString(), { before: b, after: a }, ip)
    }
    return toAdminSettingsDTO(doc)
  },

  /**
   * Price-only update (map by zone id) keeps the partition; a zone list re-partitions.
   * Partition integrity (every governorate in exactly one zone) is enforced by the zod schema.
   */
  async updateShippingRates(input, { actorId, ip } = {}) {
    const doc = await getSettingsDoc()
    const before = toShippingZonesDTO(doc.shippingRates)

    const zones = Array.isArray(input) ? input : input.zones
    if (zones) {
      doc.shippingRates = zones.map((z) => ({
        zone: z.zone,
        price: z.price,
        governorates: z.governorates,
      }))
    } else {
      applyPriceMap(doc, input)
    }

    await doc.save()
    const after = toShippingZonesDTO(doc.shippingRates)
    await audit.log(actorId, 'SHIPPING_RATES_UPDATED', 'Setting', doc._id.toString(), { before, after }, ip)
    return { rates: toShippingRatesMap(doc.shippingRates), zones: after }
  },
}

function applyPriceMap(doc, map) {
  const known = new Set(doc.shippingRates.map((z) => z.zone))
  for (const key of Object.keys(map)) {
    if (!known.has(key)) throw validationError(`Unknown shipping zone "${key}"`, ['shippingRates', key])
  }
  doc.shippingRates = doc.shippingRates.map((z) => ({
    zone: z.zone,
    price: map[z.zone] !== undefined ? map[z.zone] : z.price,
    governorates: [...z.governorates],
  }))
}

export default settingsService
