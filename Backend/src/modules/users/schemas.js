import { z } from 'zod'
import { EGYPTIAN_PHONE_REGEX } from '../../config/constants.js'

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    phone: z.string().trim().regex(EGYPTIAN_PHONE_REGEX).optional(),
    nurseryName: z.string().trim().optional(),
    governorate: z.string().trim().optional(),
    city: z.string().trim().optional(),
    address: z.string().trim().optional(),
    accountType: z.enum(['parent', 'teacher', 'nursery', 'kindergarten']).optional(),
    locale: z.enum(['ar', 'en']).optional(),
  })
  .strict()

export const changePasswordSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8),
  })
  .strict()

export const addressSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2),
    phone: z.string().trim().min(11),
    governorate: z.string().trim().min(1),
    city: z.string().trim().min(2),
    address: z.string().trim().min(5),
    nurseryName: z.string().trim().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()

export const updateAddressSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    phone: z.string().trim().min(11).optional(),
    governorate: z.string().trim().min(1).optional(),
    city: z.string().trim().min(2).optional(),
    address: z.string().trim().min(5).optional(),
    nurseryName: z.string().trim().optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()

export const notificationPrefsSchema = z
  .object({
    email: z.boolean().optional(),
    inApp: z.boolean().optional(),
  })
  .strict()

export const sellerProfileSchema = z
  .object({
    displayName: z
      .union([
        z.string().trim().min(2),
        z.object({
          ar: z.string().trim().min(2),
          en: z.string().trim().optional(),
        }),
      ])
      .optional(),
    bio: z
      .union([
        z.string().trim(),
        z.object({
          ar: z.string().trim().optional(),
          en: z.string().trim().optional(),
        }),
      ])
      .optional(),
    stages: z.array(z.string().trim()).optional(),
    materials: z.array(z.string().trim()).optional(),
    payoutWallet: z.string().trim().regex(EGYPTIAN_PHONE_REGEX, 'Must be a valid Egyptian mobile number').optional(),
  })
  .strict()

export const createSellerSchema = z
  .object({
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().regex(EGYPTIAN_PHONE_REGEX),
    governorate: z.string().trim().optional(),
    workshopAddress: z.string().trim().optional(),
    bio: z
      .union([
        z.string().trim(),
        z.object({
          ar: z.string().trim().optional(),
          en: z.string().trim().optional(),
        }),
      ])
      .optional(),
    stages: z.array(z.string().trim()).optional(),
    materials: z.array(z.string().trim()).optional(),
    payoutWallet: z.string().trim().regex(EGYPTIAN_PHONE_REGEX).optional(),
  })
  .strict()

export const updateUserStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended']),
  })
  .strict()
