import { z } from 'zod'
import { periodQuerySchema, payoutsQuerySchema, recordPayoutSchema, sellerDrilldownParamsSchema, sellerDrilldownQuerySchema } from '../earnings/schemas.js'

// Reads strip unknown keys (zod default); writes reject them (strict) — see recordPayoutSchema.
export const adminCustomersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  governorate: z.string().trim().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const adminOverviewQuerySchema = periodQuerySchema
export const adminPayoutsQuerySchema = payoutsQuerySchema
export const adminSellerOrdersParamsSchema = sellerDrilldownParamsSchema
export const adminSellerOrdersQuerySchema = sellerDrilldownQuerySchema
export { recordPayoutSchema }
