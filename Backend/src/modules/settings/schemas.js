import { z } from 'zod'
import { EGYPTIAN_PHONE_REGEX, EGYPTIAN_GOVERNORATES } from '../../config/constants.js'
import { normalizeEgyptianPhone } from '../../utils/phone.js'

const optionalPhoneSchema = z
  .string()
  .transform((val) => normalizeEgyptianPhone(val.trim()))
  .refine((val) => val === '' || EGYPTIAN_PHONE_REGEX.test(val), {
    message: 'رقم الهاتف يجب أن يكون رقم محمول مصري صحيح (01XXXXXXXXX)',
  })
  .optional()

export const updateSettingsSchema = z.object({
  commissionRate: z.coerce
    .number({ invalid_type_error: 'نسبة العمولة يجب أن تكون رقماً' })
    .min(0, 'نسبة العمولة يجب ألا تقل عن 0')
    .max(50, 'نسبة العمولة يجب ألا تتجاوز 50')
    .optional(),
  platformWallet: optionalPhoneSchema,
  supportPhone: optionalPhoneSchema,
  whatsappNumber: optionalPhoneSchema,
  supportEmail: z
    .string()
    .trim()
    .refine((val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'البريد الإلكتروني غير صحيح',
    })
    .optional(),
  payoutScheduleText: z.string().optional(),
  deliveryTimeText: z.union([z.string(), z.record(z.string())]).optional(),
  maintenanceMode: z.boolean().optional(),
  notifications: z.record(z.boolean()).optional(),
  shippingRates: z.any().optional(),
})

const shippingZoneSchema = z.object({
  zone: z.string().min(1, 'اسم المنطقة مطلوب'),
  price: z.coerce.number().min(0, 'سعر الشحن يجب أن يكون 0 أو أكثر'),
  governorates: z.array(z.string()).min(1, 'يجب تحديد محافظة واحدة على الأقل لكل منطقة'),
})

export const updateShippingRatesSchema = z.union([
  z.array(shippingZoneSchema).refine((zones) => {
    // Check every governorate in exactly one zone
    const seenGovs = new Set()
    for (const z of zones) {
      for (const gov of z.governorates) {
        if (seenGovs.has(gov)) {
          return false // duplicate governorate
        }
        seenGovs.add(gov)
      }
    }
    // Must contain all 27 governorates
    return EGYPTIAN_GOVERNORATES.every((gov) => seenGovs.has(gov))
  }, {
    message: 'يجب أن تشتمل مناطق الشحن على كافة المحافظات المصرية الـ 27 بدون تكرار أو نقص',
  }),
  z.object({
    zones: z.array(shippingZoneSchema),
  }).refine(({ zones }) => {
    const seenGovs = new Set()
    for (const z of zones) {
      for (const gov of z.governorates) {
        if (seenGovs.has(gov)) return false
        seenGovs.add(gov)
      }
    }
    return EGYPTIAN_GOVERNORATES.every((gov) => seenGovs.has(gov))
  }, {
    message: 'يجب أن تشتمل مناطق الشحن على كافة المحافظات المصرية الـ 27 بدون تكرار أو نقص',
  }),
  z.record(z.string(), z.coerce.number().min(0, 'سعر الشحن يجب أن يكون 0 أو أكثر')),
])
