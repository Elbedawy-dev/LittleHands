import { z } from 'zod'

export const updateSellerProfileSchema = z.object({
  displayName: z
    .object({
      ar: z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
  bio: z
    .object({
      ar: z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
  stages: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  payoutWallet: z.string().optional(),
})

export const createSellerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(11),
  password: z.string().min(8),
  payoutWallet: z.string().optional(),
})

