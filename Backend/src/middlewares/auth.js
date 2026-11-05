import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'
import { User } from '../db/models/User.js'

function extractToken(req) {
  // Check httpOnly cookie lh_at first
  if (req.cookies && req.cookies.lh_at) {
    return req.cookies.lh_at
  }
  // Check Authorization Bearer header
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }
  return null
}

/**
 * Authentication middleware:
 * Verifies HS256 JWT access token from cookie/header.
 * Attaches verified user to req.user. Rejects suspended users.
 */
export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) {
      return next(new AppError('UNAUTHENTICATED', 401))
    }

    let payload
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] })
    } catch {
      return next(new AppError('UNAUTHENTICATED', 401))
    }

    const userId = payload.sub || payload.id || payload.userId
    if (!userId) {
      return next(new AppError('UNAUTHENTICATED', 401))
    }

    const user = await User.findById(userId)
    if (!user) {
      return next(new AppError('UNAUTHENTICATED', 401))
    }

    if (user.status === 'suspended') {
      return next(new AppError('ACCOUNT_SUSPENDED', 403))
    }

    req.user = user
    req.userId = user._id ? user._id.toString() : user.id
    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Optional authentication middleware:
 * If a valid token is provided, attaches req.user.
 * If no token is provided, continues as guest (req.user = null).
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) {
      req.user = null
      req.userId = null
      return next()
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] })
      const userId = payload.sub || payload.id || payload.userId
      if (userId) {
        const user = await User.findById(userId)
        if (user && user.status !== 'suspended') {
          req.user = user
          req.userId = user._id ? user._id.toString() : user.id
        }
      }
    } catch {
      // Ignored for optionalAuth
      req.user = null
      req.userId = null
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Role authorization guard
 * @param {...string} roles - Whitelisted roles (e.g. 'admin', 'seller', 'customer')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHENTICATED', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 403))
    }

    next()
  }
}

/**
 * Email verification enforcement guard
 */
export function requireVerified(req, res, next) {
  if (env.REQUIRE_EMAIL_VERIFICATION) {
    if (!req.user || !req.user.emailVerified) {
      return next(new AppError('EMAIL_NOT_VERIFIED', 403))
    }
  }
  next()
}

export default {
  authenticate,
  optionalAuth,
  authorize,
  requireVerified,
}

