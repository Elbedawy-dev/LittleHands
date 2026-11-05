import { z } from 'zod'

export const productListQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  sellerId: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  stage: z.string().optional(),
  inStock: z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'boolean') return val
      if (val === 'true') return true
      if (val === 'false') return false
      return undefined
    })
    .optional(),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc']).default('newest').optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(12).optional(),
})

export const updateCategorySchema = z
  .object({
    nameAr: z.string().min(2).optional(),
    nameEn: z.string().min(2).optional(),
    name: z
      .object({
        ar: z.string().min(2).optional(),
        en: z.string().min(2).optional(),
      })
      .optional(),
    descriptionAr: z.string().optional(),
    descriptionEn: z.string().optional(),
    description: z
      .object({
        ar: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
    color: z.string().optional(),
    bgColor: z.string().optional(),
    textColor: z.string().optional(),
    icon: z.string().optional(),
    order: z.coerce.number().int().optional(),
  })
  .strict()

export const reorderCategoriesSchema = z
  .object({
    slugs: z.array(z.string()).optional(),
    ids: z.array(z.string()).optional(),
  })
  .strict()
  .refine((data) => (data.slugs && data.slugs.length > 0) || (data.ids && data.ids.length > 0), {
    message: 'Either slugs or ids must be provided',
  })
