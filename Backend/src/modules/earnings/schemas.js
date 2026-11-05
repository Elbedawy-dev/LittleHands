import { z } from 'zod'

export const earningsPeriodQuerySchema = z.object({
  period: z.enum(['week', 'month', 'all', 'year']).default('month').optional(),
})

export const sellerPayoutsQuerySchema = z.object({
  sellerId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(20).optional(),
})

export const recordPayoutSchema = z.object({
  sellerId: z.string().min(1, 'معرّف البائعة مطلوب'),
  amount: z.coerce.number().positive('مبلغ التحويل يجب أن يكون أكبر من صفر'),
  reference: z.string().min(1, 'الرقم المرجعي مطلوب').trim(),
  date: z.string().optional(),
  note: z.string().optional(),
  notes: z.string().optional(),
})
