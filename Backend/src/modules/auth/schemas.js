import { z } from 'zod'
import { EGYPTIAN_PHONE_REGEX } from '../../config/constants.js'

export const registerSchema = z
  .object({
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().regex(EGYPTIAN_PHONE_REGEX),
    password: z.string().min(8),
    role: z.enum(['customer', 'seller', 'admin']).optional(),
    accountType: z.enum(['parent', 'teacher', 'nursery', 'kindergarten']).default('parent').optional(),
    nurseryName: z.string().trim().optional(),
    governorate: z.string().trim().min(1).optional(),
    city: z.string().trim().optional(),
    address: z.string().trim().optional(),
  })
  .strict()

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1),
    password: z.string().min(1),
  })
  .strict()

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email(),
  })
  .strict()

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: z.string().min(8),
  })
  .strict()

export const verifyEmailSchema = z
  .object({
    code: z.string().trim().min(4).max(6),
    email: z.string().trim().email().optional(),
  })
  .strict()

export const resendCodeSchema = z
  .object({
    email: z.string().trim().email().optional(),
  })
  .strict()

export const changePasswordSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8),
  })
  .strict()
