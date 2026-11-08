import { z } from 'zod'
import { EGYPTIAN_PHONE_REGEX, EGYPTIAN_GOVERNORATES } from '../../config/constants.js'
import { normalizeEgyptianPhone } from '../../utils/phone.js'

const hasAtMostTwoDecimals = (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

/** Egyptian mobile (01[0125]xxxxxxxx); empty string clears the value. */
const phoneOrEmpty = z
  .string()
  .trim()
  .transform((v) => normalizeEgyptianPhone(v))
  .refine((v) => v === '' || EGYPTIAN_PHONE_REGEX.test(v), {
    message: 'Must be a valid Egyptian mobile number (01XXXXXXXXX)',
  })

const emailOrEmpty = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Invalid email' })

const price = z
  .number({ invalid_type_error: 'Price must be a number' })
  .min(0, 'Price must be >= 0')
  .max(100_000)
  .refine(hasAtMostTwoDecimals, 'Price must have at most 2 decimals')

const zoneId = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, 'Invalid zone id')

const zoneSchema = z
  .object({
    zone: zoneId,
    price,
    governorates: z.array(z.enum(EGYPTIAN_GOVERNORATES)).min(1, 'A zone needs at least one governorate'),
  })
  .strict()

/** Every governorate must appear in exactly one zone; zone ids must be unique. */
function checkPartition(zones, ctx) {
  const seenZones = new Set()
  const seenGovs = new Map()
  zones.forEach((z, i) => {
    if (seenZones.has(z.zone)) {
      ctx.addIssue({ code: 'custom', path: [i, 'zone'], message: `Duplicate zone "${z.zone}"` })
    }
    seenZones.add(z.zone)
    z.governorates.forEach((gov) => {
      if (seenGovs.has(gov)) {
        ctx.addIssue({
          code: 'custom',
          path: [i, 'governorates'],
          message: `Governorate "${gov}" appears in more than one zone`,
        })
      }
      seenGovs.set(gov, z.zone)
    })
  })
  const missing = EGYPTIAN_GOVERNORATES.filter((g) => !seenGovs.has(g))
  if (missing.length) {
    ctx.addIssue({
      code: 'custom',
      path: [],
      message: `Governorates missing from zones: ${missing.join(', ')}`,
    })
  }
}

export const zonesSchema = z.array(zoneSchema).min(1).superRefine(checkPartition)

/**
 * Shipping update accepts either:
 *  - a price map by zone id (the frontend format, e.g. {greater_cairo: 45}) — keeps the zone→governorate partition
 *  - a full zone list / {zones: [...]} — re-partitions (every governorate in exactly one zone)
 */
export const updateShippingRatesSchema = z.union([
  zonesSchema,
  z.object({ zones: zonesSchema }).strict(),
  z.record(zoneId, price).refine((o) => Object.keys(o).length > 0, 'At least one zone price is required'),
])

/**
 * PUT /admin/settings — strict (unknown keys rejected).
 * commissionRate keeps the frontend units: a FRACTION (0.20 = 20%), allowed range 0–0.50 (0–50%).
 */
export const updateSettingsSchema = z
  .object({
    commissionRate: z
      .number({ invalid_type_error: 'commissionRate must be a number' })
      .min(0, 'commissionRate must be between 0 and 0.50 (0-50%)')
      .max(0.5, 'commissionRate must be between 0 and 0.50 (0-50%)')
      .refine((n) => Math.abs(Math.round(n * 10000) - n * 10000) < 1e-6, 'At most 4 decimals'),
    platformWallet: phoneOrEmpty,
    supportPhone: phoneOrEmpty,
    whatsappNumber: phoneOrEmpty,
    supportEmail: emailOrEmpty,
    payoutScheduleText: z.string().trim().max(300),
    deliveryTimeText: z.union([
      z.string().trim().min(1).max(200),
      z.object({ ar: z.string().trim().max(200), en: z.string().trim().max(200) }).strict(),
    ]),
    // Alias used by the existing admin form
    deliveryTime: z.string().trim().min(1).max(200),
    maintenanceMode: z.boolean(),
    emailNotifications: z.boolean(),
    inSiteNotifications: z.boolean(),
    notifications: z
      .object({
        orderCreated: z.boolean(),
        paymentSubmitted: z.boolean(),
        payoutRecorded: z.boolean(),
      })
      .partial()
      .strict(),
    shippingRates: z.record(zoneId, price),
  })
  .partial()
  .strict()
