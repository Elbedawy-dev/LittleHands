import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

export const GLOBAL_LIMITER_MAX = 600

export const GLOBAL_LIMIT_SKIP_PATHS = new Set([
  '/api/v1/notifications/unread-count',
  '/api/v1/settings/public',
  '/api/v1/auth/me',
])

export function shouldSkipGlobalLimiter(req) {
  if (req.method !== 'GET') return false
  const raw = req.originalUrl || `${req.baseUrl || ''}${req.path || req.url || ''}`
  const pathname = raw.split('?')[0]
  return GLOBAL_LIMIT_SKIP_PATHS.has(pathname)
}

function createLimiter({ windowMs, max, messageCode = 'TOO_MANY_REQUESTS', skip, forceProdLimit = false }) {
  return rateLimit({
    windowMs,
    max: !forceProdLimit && (env.NODE_ENV === 'test' || env.NODE_ENV === 'development') ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(skip ? { skip } : {}),
    handler: (req, res, next) => {
      next(new AppError(messageCode, 429))
    },
  })
}

export function createGlobalLimiter({ max = GLOBAL_LIMITER_MAX, forceProdLimit = false } = {}) {
  return createLimiter({
    windowMs: 15 * 60 * 1000,
    max,
    skip: shouldSkipGlobalLimiter,
    forceProdLimit,
  })
}

// Global API rate limit: 600 requests per 15 minutes (excludes SPA polling endpoints)
export const globalLimiter = createGlobalLimiter()

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
  GLOBAL_LIMITER_MAX,
  GLOBAL_LIMIT_SKIP_PATHS,
  shouldSkipGlobalLimiter,
  createGlobalLimiter,
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  otpLimiter,
  paymentLimiter,
  customRequestLimiter,
}

