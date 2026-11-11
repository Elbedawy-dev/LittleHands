import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { User } from '../../db/models/User.js'
import { OtpCode } from '../../db/models/OtpCode.js'
import { RefreshToken } from '../../db/models/RefreshToken.js'
import { AppError } from '../../utils/appError.js'
import { randomCode, randomToken, sha256 } from '../../utils/crypto.js'
import { normalizeEgyptianPhone } from '../../utils/phone.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'

export function generateAccessToken(user) {
  const id = user.id || user._id?.toString()
  return jwt.sign(
    {
      sub: id,
      role: user.role,
    },
    env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: env.ACCESS_TTL || '15m' }
  )
}

export function generateRefreshToken() {
  return randomToken(32)
}

export function getCookieOptions(type = 'access') {
  const isProd = env.NODE_ENV === 'production'
  const maxAge =
    type === 'access'
      ? 15 * 60 * 1000
      : (env.REFRESH_TTL_DAYS || 7) * 24 * 60 * 60 * 1000

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: env.COOKIE_SAMESITE || 'lax',
    path: '/',
    maxAge,
  }
}

// Map to deduplicate concurrent parallel refresh requests for the same token
const inFlightRefreshes = new Map()

export const authService = {
  /**
   * Register a new customer
   */
  async register(data, { ip = '', userAgent = '' } = {}) {
    const cleanEmail = (data.email || '').trim().toLowerCase()
    const cleanPhone = normalizeEgyptianPhone(data.phone)

    if (data.role && data.role !== 'customer') {
      throw new AppError('FORBIDDEN', 403, 'Sellers cannot register through public registration')
    }

    const emailTaken = await User.findOne({ email: cleanEmail })
    if (emailTaken) {
      throw new AppError('EMAIL_EXISTS', 409)
    }

    const phoneTaken = await User.findOne({ phone: cleanPhone })
    if (phoneTaken) {
      throw new AppError('PHONE_EXISTS', 409)
    }

    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(data.password, salt)

    const accountType = data.accountType === 'kindergarten' ? 'nursery' : data.accountType || 'parent'

    const newUser = await User.create({
      name: data.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role: 'customer',
      accountType,
      nurseryName: data.nurseryName ? data.nurseryName.trim() : '',
      governorate: data.governorate ? data.governorate.trim() : 'القاهرة',
      city: data.city ? data.city.trim() : '',
      address: data.address ? data.address.trim() : '',
      emailVerified: false,
      status: 'active',
    })

    const plainCode = randomCode()
    await OtpCode.create({
      userId: newUser._id,
      purpose: 'verify_email',
      codeHash: sha256(plainCode),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    })

    eventBus.emit(EVENT_TYPES.USER_REGISTERED, {
      user: newUser,
      code: plainCode,
    })

    const accessToken = generateAccessToken(newUser)
    const refreshToken = generateRefreshToken()
    const family = randomToken(16)

    await RefreshToken.create({
      userId: newUser._id,
      tokenHash: sha256(refreshToken),
      family,
      expiresAt: new Date(Date.now() + (env.REFRESH_TTL_DAYS || 7) * 24 * 60 * 60 * 1000),
      ip,
      userAgent,
    })

    return {
      user: newUser,
      accessToken,
      refreshToken,
      plainCode,
    }
  },

  /**
   * Log in user with email or Egyptian phone
   */
  async login({ identifier, password, ip = '', userAgent = '' }) {
    const rawId = (identifier || '').trim()
    const isEmail = rawId.includes('@')
    const cleanEmail = isEmail ? rawId.toLowerCase() : null
    const cleanPhone = !isEmail ? normalizeEgyptianPhone(rawId) : null

    const query = isEmail ? { email: cleanEmail } : { phone: cleanPhone }
    const user = await User.findOne(query).select('+passwordHash')

    // Dummy comparison to prevent timing attacks if user does not exist
    if (!user) {
      await bcrypt.compare(
        password,
        '$2a$12$e8YvXmKzqj.1234567890abcdefghijklmnopqrstuvwxyz12345678'
      )
      throw new AppError('INVALID_CREDENTIALS', 401)
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new AppError('ACCOUNT_LOCKED', 423)
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      user.failedLoginCount = (user.failedLoginCount || 0) + 1
      if (user.failedLoginCount >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000)
      }
      await user.save()
      throw new AppError('INVALID_CREDENTIALS', 401)
    }

    // Check suspension / deletion
    if (user.status === 'deleted') {
      throw new AppError('ACCOUNT_DELETED', 403, 'هذا الحساب تم حذفه')
    }
    if (user.status === 'suspended') {
      throw new AppError('ACCOUNT_SUSPENDED', 403)
    }

    // Reset lockout counters on success
    user.failedLoginCount = 0
    user.lockUntil = null
    user.lastLoginAt = new Date()
    await user.save()

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken()
    const family = randomToken(16)

    await RefreshToken.create({
      userId: user._id,
      tokenHash: sha256(refreshToken),
      family,
      expiresAt: new Date(Date.now() + (env.REFRESH_TTL_DAYS || 7) * 24 * 60 * 60 * 1000),
      ip,
      userAgent,
    })

    return {
      user,
      accessToken,
      refreshToken,
    }
  },

  /**
   * Logout user and revoke refresh token
   */
  async logout(refreshToken) {
    if (refreshToken) {
      const tokenHash = sha256(refreshToken)
      await RefreshToken.updateOne(
        { tokenHash, revokedAt: null },
        { revokedAt: new Date() }
      )
    }
    return { success: true }
  },

  /**
   * Refresh token rotation with reuse detection
   */
  async refresh(rawRefreshToken, { ip = '', userAgent = '' } = {}) {
    if (!rawRefreshToken) {
      throw new AppError('UNAUTHENTICATED', 401)
    }

    const tokenHash = sha256(rawRefreshToken)
    if (inFlightRefreshes.has(tokenHash)) {
      return await inFlightRefreshes.get(tokenHash)
    }

    const refreshPromise = (async () => {
      const tokenDoc = await RefreshToken.findOne({ tokenHash })

      if (!tokenDoc) {
        throw new AppError('UNAUTHENTICATED', 401)
      }

      // Reuse detection: token already revoked! Revoke entire family!
      if (tokenDoc.revokedAt) {
        await RefreshToken.updateMany(
          { family: tokenDoc.family },
          { revokedAt: new Date() }
        )
        throw new AppError('UNAUTHENTICATED', 401, 'Token reuse detected')
      }

      if (tokenDoc.expiresAt < new Date()) {
        throw new AppError('UNAUTHENTICATED', 401, 'Refresh token expired')
      }

      const user = await User.findById(tokenDoc.userId)
      if (!user || user.status === 'suspended' || user.status === 'deleted') {
        throw new AppError(user?.status === 'deleted' ? 'ACCOUNT_DELETED' : 'ACCOUNT_SUSPENDED', 403)
      }

      const newRefreshToken = generateRefreshToken()
      const newHashedToken = sha256(newRefreshToken)

      tokenDoc.revokedAt = new Date()
      tokenDoc.replacedBy = newHashedToken
      await tokenDoc.save()

      await RefreshToken.create({
        userId: user._id,
        tokenHash: newHashedToken,
        family: tokenDoc.family,
        expiresAt: new Date(Date.now() + (env.REFRESH_TTL_DAYS || 7) * 24 * 60 * 60 * 1000),
        ip,
        userAgent,
      })

      const newAccessToken = generateAccessToken(user)

      return {
        user,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        rotated: true,
      }
    })()

    inFlightRefreshes.set(tokenHash, refreshPromise)
    try {
      return await refreshPromise
    } finally {
      inFlightRefreshes.delete(tokenHash)
    }
  },

  /**
   * Verify email via 6-digit OTP code
   */
  async verifyEmail({ code, user, email }) {
    let targetUser = user
    if (!targetUser && email) {
      targetUser = await User.findOne({ email: email.trim().toLowerCase() })
    }

    const candidateHash = sha256(code)

    if (!targetUser) {
      // Dummy constant-time comparison to prevent timing-based user enumeration
      const dummyHash = sha256('000000')
      crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(dummyHash, 'hex'))
      throw new AppError('INVALID_CODE', 400)
    }

    const otp = await OtpCode.findOne({
      userId: targetUser._id,
      purpose: 'verify_email',
      usedAt: null,
    }).sort({ createdAt: -1 })

    if (!otp) {
      throw new AppError('INVALID_CODE', 400)
    }

    if (otp.expiresAt < new Date()) {
      throw new AppError('EXPIRED_CODE', 400)
    }

    if (otp.attempts >= 5) {
      throw new AppError('CODE_MAX_ATTEMPTS', 400)
    }

    otp.attempts += 1

    const hashA = Buffer.from(candidateHash, 'hex')
    const hashB = Buffer.from(otp.codeHash, 'hex')
    const isMatch = hashA.length === hashB.length && crypto.timingSafeEqual(hashA, hashB)

    if (!isMatch) {
      await otp.save()
      throw new AppError('INVALID_CODE', 400)
    }

    otp.usedAt = new Date()
    await otp.save()

    targetUser.emailVerified = true
    await targetUser.save()

    return { verified: true, user: targetUser }
  },

  /**
   * Resend 6-digit OTP code (60s cooldown, max 5 per hour)
   */
  async resendCode({ user, email }) {
    let targetUser = user
    if (!targetUser && email) {
      targetUser = await User.findOne({ email: email.trim().toLowerCase() })
    }

    if (!targetUser) {
      return { message: 'Verification code resent successfully' }
    }

    const lastOtp = await OtpCode.findOne({
      userId: targetUser._id,
      purpose: 'verify_email',
    }).sort({ createdAt: -1 })

    if (lastOtp && Date.now() - new Date(lastOtp.createdAt).getTime() < 60 * 1000) {
      throw new AppError('TOO_MANY_REQUESTS', 429, 'Please wait 60 seconds before requesting another code')
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const countRecent = await OtpCode.countDocuments({
      userId: targetUser._id,
      purpose: 'verify_email',
      createdAt: { $gte: oneHourAgo },
    })

    if (countRecent >= 5) {
      throw new AppError('TOO_MANY_REQUESTS', 429, 'Maximum hourly verification requests exceeded')
    }

    await OtpCode.updateMany(
      { userId: targetUser._id, purpose: 'verify_email', usedAt: null },
      { usedAt: new Date() }
    )

    const plainCode = randomCode()
    await OtpCode.create({
      userId: targetUser._id,
      purpose: 'verify_email',
      codeHash: sha256(plainCode),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    })

    eventBus.emit(EVENT_TYPES.AUTH_VERIFICATION_CODE_RESENT, {
      user: targetUser,
      code: plainCode,
    })

    return { success: true, plainCode }
  },

  /**
   * Forgot password request (generic 200, 30 min token, single use)
   */
  async forgotPassword(email) {
    const cleanEmail = (email || '').trim().toLowerCase()
    const user = await User.findOne({ email: cleanEmail })

    if (user && user.status !== 'suspended') {
      await OtpCode.updateMany(
        { userId: user._id, purpose: 'reset_password', usedAt: null },
        { usedAt: new Date() }
      )

      const plainToken = randomToken(32)
      await OtpCode.create({
        userId: user._id,
        purpose: 'reset_password',
        codeHash: sha256(plainToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        attempts: 0,
      })

      eventBus.emit(EVENT_TYPES.AUTH_PASSWORD_RESET_REQUESTED, {
        user,
        token: plainToken,
      })
    }

    return {
      success: true,
      message: 'If the email is registered, password reset instructions have been sent.',
    }
  },

  /**
   * Reset password via token (single-use token)
   */
  async resetPassword({ token, password }) {
    const tokenHash = sha256(token)
    const otp = await OtpCode.findOne({
      purpose: 'reset_password',
      codeHash: tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    })

    if (!otp) {
      throw new AppError('INVALID_CODE', 400, 'Invalid or expired password reset token')
    }

    otp.usedAt = new Date()
    await otp.save()

    const user = await User.findById(otp.userId)
    if (!user) {
      throw new AppError('NOT_FOUND', 404)
    }

    const salt = await bcrypt.genSalt(12)
    user.passwordHash = await bcrypt.hash(password, salt)
    user.failedLoginCount = 0
    user.lockUntil = null
    user.mustChangePassword = false
    await user.save()

    // Revoke all refresh tokens
    await RefreshToken.updateMany(
      { userId: user._id },
      { revokedAt: new Date() }
    )

    return { success: true }
  },

  /**
   * Change password for logged in user (revokes all other sessions)
   */
  async changePassword({ userId, current, next, currentRefreshToken = null }) {
    const user = await User.findById(userId).select('+passwordHash')
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 401)
    }

    const isMatch = await bcrypt.compare(current, user.passwordHash)
    if (!isMatch) {
      throw new AppError('INVALID_CREDENTIALS', 400, 'Current password does not match')
    }

    const salt = await bcrypt.genSalt(12)
    user.passwordHash = await bcrypt.hash(next, salt)
    user.mustChangePassword = false
    await user.save()

    // Revoke other sessions
    if (currentRefreshToken) {
      const currentHash = sha256(currentRefreshToken)
      await RefreshToken.updateMany(
        { userId: user._id, tokenHash: { $ne: currentHash } },
        { revokedAt: new Date() }
      )
    } else {
      await RefreshToken.updateMany(
        { userId: user._id },
        { revokedAt: new Date() }
      )
    }

    return { success: true }
  },
}

export default authService
