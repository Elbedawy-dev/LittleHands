import { z } from 'zod'

export const adminCustomersQuerySchema = z.object({
  q: z.string().optional(),
  governorate: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
})

export const adminOverviewQuerySchema = z.object({
  period: z.enum(['week', 'month', 'all', 'year']).default('month').optional(),
})

export const adminSellerOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(20).optional(),
})

export const adminPayoutsQuerySchema = z.object({
  sellerId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
})

export const recordPayoutSchema = z.object({
  sellerId: z.string().min(1, 'معرّف البائعة مطلوب'),
  amount: z.coerce.number().positive('مبلغ التحويل يجب أن يكون أكبر من صفر'),
  reference: z.string().min(1, 'الرقم المرجعي مطلوب').trim(),
  date: z.string().optional(),
  note: z.string().optional(),
  notes: z.string().optional(),
})

export const updateCategorySchema = z.object({
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  descriptionEn: z.string().optional(),
  color: z.string().optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
})

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string()),
})
