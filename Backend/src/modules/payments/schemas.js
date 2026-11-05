import { z } from 'zod'
import { EGYPTIAN_PHONE_REGEX, REJECT_REASONS } from '../../config/constants.js'

const validRejectReasonIds = REJECT_REASONS.map((r) => r.id)
const validRejectReasonLabels = REJECT_REASONS.flatMap((r) => [r.ar, r.en])

export const submitPaymentSchema = z
  .object({
    senderPhone: z.string().trim().regex(EGYPTIAN_PHONE_REGEX, 'Invalid Egyptian phone number'),
    transferredAmount: z.coerce.number().positive('Transferred amount must be greater than zero'),
    reference: z.string().trim().max(100).optional().default(''),
  })
  .strict()

export const rejectPaymentSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'Rejection reason is required')
      .max(255)
      .refine(
        (val) => validRejectReasonIds.includes(val) || validRejectReasonLabels.includes(val),
        { message: 'Invalid rejection reason' }
      ),
    notes: z.string().trim().max(500).optional().default(''),
    notify: z
      .union([z.boolean(), z.string()])
      .transform((val) => (typeof val === 'string' ? val === 'true' : !!val))
      .optional()
      .default(true),
  })
  .strict()

export const paymentQuerySchema = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export const paymentIdParamSchema = z.object({
  id: z.string().min(1),
})

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1),
})

export default {
  submitPaymentSchema,
  rejectPaymentSchema,
  paymentQuerySchema,
  paymentIdParamSchema,
  orderIdParamSchema,
}
