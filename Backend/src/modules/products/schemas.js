import { z } from 'zod'

const FORBIDDEN_WORDS = [
  'خشب',
  'خشبي',
  'خشبية',
  'مونتيسوري',
  'حسي',
  'حسية',
  'ألعاب',
  'لعبة',
  'toy',
  'toys',
  'wood',
  'wooden',
  'montessori',
  'sensory',
  'فيزا',
  'ماستركارد',
  'مدى',
  'ضمان',
]

const FORBIDDEN_REGEX = new RegExp('(' + FORBIDDEN_WORDS.join('|') + ')', 'i')

export function hasForbiddenWord(val) {
  if (!val) return false
  if (typeof val === 'string') {
    return FORBIDDEN_REGEX.test(val)
  }
  if (typeof val === 'object') {
    return Object.values(val).some((item) => hasForbiddenWord(item))
  }
  return false
}

const safeText = (minLen = 1) =>
  z
    .string()
    .min(minLen)
    .refine((val) => !hasForbiddenWord(val), {
      message: 'FORBIDDEN_WORD_DETECTED',
    })

const localizedSafeText = (minLen = 1) =>
  z.union([
    safeText(minLen),
    z
      .object({
        ar: safeText(minLen),
        en: z
          .string()
          .refine((val) => !val || !hasForbiddenWord(val), {
            message: 'FORBIDDEN_WORD_DETECTED',
          })
          .optional(),
      })
      .refine((val) => !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      }),
  ])

const localizedOptionalDetail = z.union([
  z
    .string()
    .refine((val) => !val || !hasForbiddenWord(val), {
      message: 'FORBIDDEN_WORD_DETECTED',
    })
    .optional(),
  z
    .object({
      ar: z
        .string()
        .refine((val) => !val || !hasForbiddenWord(val), {
          message: 'FORBIDDEN_WORD_DETECTED',
        })
        .optional(),
      en: z
        .string()
        .refine((val) => !val || !hasForbiddenWord(val), {
          message: 'FORBIDDEN_WORD_DETECTED',
        })
        .optional(),
    })
    .optional(),
])

export const productMutationSchema = z
  .object({
    name: localizedSafeText(2),
    nameAr: safeText(2).optional(),
    nameEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    slug: z.string().optional(),
    categoryId: z.string().min(1),
    sellerId: z.string().optional(),
    price: z.coerce.number().min(1).max(50000),
    description: localizedSafeText(5),
    descAr: safeText(5).optional(),
    descEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    stage: z.string().optional(),
    stages: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    images: z.array(z.any()).optional(),
    inStock: z.boolean().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    stockCount: z.coerce.number().int().min(0).optional(),
    isPublished: z.boolean().optional(),
    published: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    size: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    sizeAr: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    sizeEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    usageAr: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    usageEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    careAr: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    careEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    details: z
      .object({
        material: localizedOptionalDetail,
        size: localizedOptionalDetail,
        usage: localizedOptionalDetail,
        care: localizedOptionalDetail,
      })
      .optional(),
  })
  .strict()

export const productUpdateSchema = z
  .object({
    name: localizedSafeText(2).optional(),
    nameAr: safeText(2).optional(),
    nameEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    categoryId: z.string().min(1).optional(),
    sellerId: z.string().optional(),
    price: z.coerce.number().min(1).max(50000).optional(),
    description: localizedSafeText(5).optional(),
    descAr: safeText(5).optional(),
    descEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    stage: z.string().optional(),
    stages: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    images: z.array(z.any()).optional(),
    inStock: z.boolean().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    stockCount: z.coerce.number().int().min(0).optional(),
    isPublished: z.boolean().optional(),
    published: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    size: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    sizeAr: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    sizeEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    usageAr: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    usageEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    careAr: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    careEn: z
      .string()
      .refine((val) => !val || !hasForbiddenWord(val), {
        message: 'FORBIDDEN_WORD_DETECTED',
      })
      .optional(),
    details: z
      .object({
        material: localizedOptionalDetail,
        size: localizedOptionalDetail,
        usage: localizedOptionalDetail,
        care: localizedOptionalDetail,
      })
      .optional(),
  })
  .strict()

export const publishProductSchema = z
  .object({
    published: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => typeof data.published === 'boolean' || typeof data.isPublished === 'boolean',
    {
      message: 'published boolean flag is required',
    }
  )

export const manageableProductsQuerySchema = z.object({
  sellerId: z.string().optional(),
  q: z.string().optional(),
  status: z.enum(['all', 'published', 'draft', 'out_of_stock', 'out-of-stock']).optional(),
})
