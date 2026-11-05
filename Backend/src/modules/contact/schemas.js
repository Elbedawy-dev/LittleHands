import { z } from 'zod'
import { EGYPTIAN_PHONE_REGEX } from '../../config/constants.js'

export const customRequestSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().regex(EGYPTIAN_PHONE_REGEX, 'Invalid Egyptian mobile number format'),
    nurseryName: z.string().trim().max(150).optional().default(''),
    details: z.string().trim().min(5).max(2000),
    // Honeypot anti-spam fields
    website: z.string().optional(),
    hp: z.string().optional(),
    honeypot: z.string().optional(),
  })
  .strict()

export const updateCustomRequestStatusSchema = z
  .object({
    status: z.enum(['new', 'pending', 'contacted', 'closed']),
  })
  .strict()

export const customRequestQuerySchema = z.object({
  status: z.enum(['new', 'pending', 'contacted', 'closed']).optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  pageSize: z.coerce.number().int().positive().max(100).default(20).optional(),
})
