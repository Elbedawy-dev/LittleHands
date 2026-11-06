import { z } from 'zod'
import { formatCairoDate, isFutureCairoDate } from './dates.js'

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier')

const pageSchema = z.coerce.number().int().min(1).default(1)
const pageSizeSchema = (def) => z.coerce.number().int().min(1).max(100).default(def)

/** Reads strip unknown keys (default zod object behaviour). */
export const periodQuerySchema = z.object({
  period: z.enum(['week', 'month']).default('month'),
})

export const sellerEarningsQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema(50),
})

export const payoutsQuerySchema = z.object({
  sellerId: objectIdSchema.optional(),
  page: pageSchema,
  pageSize: pageSizeSchema(20),
})

export const sellerDrilldownParamsSchema = z.object({ id: objectIdSchema })

export const sellerDrilldownQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema(20),
})

const hasAtMostTwoDecimals = (n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

/** Normalises YYYY-MM-DD or ISO input to a Cairo YYYY-MM-DD key (or null when invalid). */
function toDateKey(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null
    return value
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : formatCairoDate(parsed)
}

/** Writes reject unknown keys. Amount cap vs. due is a business rule (422) checked in the service. */
export const recordPayoutSchema = z
  .object({
    sellerId: objectIdSchema,
    amount: z
      .number({ invalid_type_error: 'amount must be a number' })
      .positive('amount must be greater than 0')
      .max(10_000_000)
      .refine(hasAtMostTwoDecimals, 'amount must have at most 2 decimals'),
    reference: z.string().trim().min(1, 'reference is required').max(100),
    date: z
      .string()
      .trim()
      .optional()
      .transform((value, ctx) => {
        if (!value) return formatCairoDate()
        const key = toDateKey(value)
        if (!key) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'date is invalid' })
          return z.NEVER
        }
        if (isFutureCairoDate(key)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'date cannot be in the future' })
          return z.NEVER
        }
        return key
      }),
    note: z.string().trim().max(500).optional(),
    // Frontend modal sends "notes"; accepted as an alias of "note".
    notes: z.string().trim().max(500).optional(),
  })
  .strict()
