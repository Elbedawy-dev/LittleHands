import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

function createLimiter({ windowMs, max, messageCode = 'TOO_MANY_REQUESTS' }) {
  return rateLimit({
    windowMs,
    max: env.NODE_ENV === 'test' ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(new AppError(messageCode, 429))
    },
  })
}

// Global API rate limit: 200 requests per 15 minutes
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
})

// Strict Auth limit: 10 attempts per 15 minutes
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  messageCode: 'TOO_MANY_REQUESTS',
})

// Password reset limiter: 5 attempts per 15 minutes
export const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  messageCode: 'TOO_MANY_REQUESTS',
})

// OTP limiter: 5 attempts per 10 minutes
export const otpLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  messageCode: 'TOO_MANY_REQUESTS',
})

// Payment submission limiter: 10 attempts per 15 minutes
export const paymentLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  messageCode: 'TOO_MANY_REQUESTS',
})

// Custom requests limiter: 5 submissions per hour
export const customRequestLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  messageCode: 'TOO_MANY_REQUESTS',
})

export default {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  otpLimiter,
  paymentLimiter,
  customRequestLimiter,
}

