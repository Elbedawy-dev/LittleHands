import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * CSRF Protection Guard:
 * 1. Requires custom header `X-Requested-With: lh-web` for mutating HTTP requests.
 * 2. Validates Origin / Referer matches CLIENT_ORIGINS allowlist when provided.
 */
export function csrfGuard(req, res, next) {
  if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
    return next()
  }

  // 1. Check custom requested-with header
  const requestedWith = req.headers['x-requested-with']
  if (requestedWith !== 'lh-web') {
    return next(new AppError('CSRF_ERROR', 403, 'Missing or invalid X-Requested-With header'))
  }

  // 2. Check Origin or Referer if present
  const originHeader = req.headers.origin
  const refererHeader = req.headers.referer

  let requestOrigin = originHeader
  if (!requestOrigin && refererHeader) {
    try {
      requestOrigin = new URL(refererHeader).origin
    } catch {
      return next(new AppError('CSRF_ERROR', 403, 'Invalid Referer header'))
    }
  }

  if (requestOrigin) {
    const isAllowed = env.CLIENT_ORIGINS_ARRAY.includes(requestOrigin)
    if (!isAllowed) {
      return next(new AppError('CSRF_ERROR', 403, 'Origin not in allowed origins'))
    }
  }

  next()
}

export default csrfGuard

