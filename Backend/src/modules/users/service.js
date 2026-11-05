import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import sharp from 'sharp'
import { User } from '../../db/models/User.js'
import { Address } from '../../db/models/Address.js'
import { Favorite } from '../../db/models/Favorite.js'
import { Product } from '../../db/models/Product.js'
import { RefreshToken } from '../../db/models/RefreshToken.js'
import { storage } from '../../infra/storage/index.js'
import { audit } from '../../infra/audit/index.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { AppError } from '../../utils/appError.js'
import { mapProductDTO } from '../../utils/dto.js'
import { randomToken } from '../../utils/crypto.js'
import { normalizeEgyptianPhone, isValidEgyptianPhone } from '../../utils/phone.js'
import { authService } from '../auth/service.js'

export const userService = {
  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 401)
    }
    return user
  },

  /**
   * Update profile fields
   */
  async updateProfile(userId, data) {
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 401)
    }

    if (data.phone) {
      const cleanPhone = normalizeEgyptianPhone(data.phone)
      const existing = await User.findOne({
        phone: cleanPhone,
        _id: { $ne: user._id },
      })
      if (existing) {
        throw new AppError('PHONE_EXISTS', 409)
      }
      user.phone = cleanPhone
    }

    if (data.name !== undefined) user.name = data.name.trim()
    if (data.nurseryName !== undefined) user.nurseryName = data.nurseryName.trim()
    if (data.governorate !== undefined) user.governorate = data.governorate.trim()
    if (data.city !== undefined) user.city = data.city.trim()
    if (data.address !== undefined) user.address = data.address.trim()
    if (data.accountType !== undefined) {
      user.accountType = data.accountType === 'kindergarten' ? 'nursery' : data.accountType
    }
    if (data.locale !== undefined) user.locale = data.locale

    await user.save()
    return user
  },

  /**
   * Change password
   */
  async changePassword(userId, current, next, currentRefreshToken = null) {
    return authService.changePassword({ userId, current, next, currentRefreshToken })
  },

  /**
   * Upload and set user avatar
   */
  async uploadAvatar(userId, file) {
    if (!file || !file.buffer) {
      throw new AppError('VALIDATION_ERROR', 400, 'Image file is required')
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimes.includes(file.mimetype)) {
      throw new AppError('INVALID_FILE_TYPE', 400)
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new AppError('FILE_TOO_LARGE', 400)
    }

    // Process image with Sharp: strip EXIF, convert to WebP
    const processedBuffer = await sharp(file.buffer)
      .rotate()
      .webp({ quality: 85 })
      .toBuffer()

    const saved = await storage.saveImage(
      {
        buffer: processedBuffer,
        originalname: 'avatar.webp',
        mimetype: 'image/webp',
      },
      { kind: 'avatar', ownerId: userId }
    )

    const user = await User.findById(userId)
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 401)
    }

    user.avatar = {
      key: saved.key,
      url: saved.url,
    }
    await user.save()

    return {
      avatar: saved.url,
      user,
    }
  },

  /**
   * Get user favorites (published products only)
   */
  async getFavorites(userId, viewerRole = 'customer') {
    const favs = await Favorite.find({ userId })
    const productIds = favs.map((f) => f.productId)

    const products = await Product.find({
      _id: { $in: productIds },
      published: true,
      deletedAt: null,
    })

    return products.map((p) => mapProductDTO(p, viewerRole))
  },

  /**
   * Toggle product favorite state
   */
  async toggleFavorite(userId, productId) {
    if (!mongoose.isValidObjectId(productId)) {
      throw new AppError('PRODUCT_NOT_FOUND', 404)
    }

    const product = await Product.findOne({
      _id: productId,
      published: true,
      deletedAt: null,
    })

    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', 404)
    }

    const existing = await Favorite.findOne({ userId, productId })
    if (existing) {
      await Favorite.deleteOne({ _id: existing._id })
      return { productId: productId.toString(), isFavorite: false }
    }

    await Favorite.create({ userId, productId })
    return { productId: productId.toString(), isFavorite: true }
  },

  /**
   * Get all user addresses
   */
  async getAddresses(userId) {
    return Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 })
  },

  /**
   * Save (create or update) address
   */
  async saveAddress(userId, data) {
    if (data.id) {
      return this.updateAddress(userId, data.id, data)
    }

    const count = await Address.countDocuments({ userId })
    const isDefault = count === 0 || !!data.isDefault

    if (isDefault) {
      await Address.updateMany({ userId }, { isDefault: false })
    }

    const address = await Address.create({
      userId,
      name: data.name.trim(),
      phone: normalizeEgyptianPhone(data.phone),
      governorate: data.governorate.trim(),
      city: data.city.trim(),
      address: data.address.trim(),
      nurseryName: data.nurseryName ? data.nurseryName.trim() : '',
      isDefault,
    })

    return address
  },

  /**
   * Update address with IDOR ownership check
   */
  async updateAddress(userId, addressId, data) {
    if (!mongoose.isValidObjectId(addressId)) {
      throw new AppError('NOT_FOUND', 404)
    }

    const address = await Address.findOne({ _id: addressId, userId })
    if (!address) {
      throw new AppError('NOT_FOUND', 404)
    }

    if (data.isDefault) {
      await Address.updateMany({ userId }, { isDefault: false })
      address.isDefault = true
    } else if (data.isDefault === false && address.isDefault) {
      // Cannot unset default if it is the only address
      const count = await Address.countDocuments({ userId })
      if (count <= 1) {
        address.isDefault = true
      } else {
        address.isDefault = false
      }
    }

    if (data.name !== undefined) address.name = data.name.trim()
    if (data.phone !== undefined) address.phone = normalizeEgyptianPhone(data.phone)
    if (data.governorate !== undefined) address.governorate = data.governorate.trim()
    if (data.city !== undefined) address.city = data.city.trim()
    if (data.address !== undefined) address.address = data.address.trim()
    if (data.nurseryName !== undefined) address.nurseryName = data.nurseryName.trim()

    await address.save()
    return address
  },

  /**
   * Delete address with IDOR ownership check
   */
  async deleteAddress(userId, addressId) {
    if (!mongoose.isValidObjectId(addressId)) {
      throw new AppError('NOT_FOUND', 404)
    }

    const address = await Address.findOne({ _id: addressId, userId })
    if (!address) {
      throw new AppError('NOT_FOUND', 404)
    }

    const wasDefault = address.isDefault
    await Address.deleteOne({ _id: address._id })

    if (wasDefault) {
      const nextDefault = await Address.findOne({ userId }).sort({ createdAt: -1 })
      if (nextDefault) {
        nextDefault.isDefault = true
        await nextDefault.save()
      }
    }

    return { success: true }
  },

  /**
   * Update notification preferences
   */
  async updateNotificationPrefs(userId, prefs) {
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 401)
    }

    user.notificationPrefs = {
      ...user.notificationPrefs,
      ...prefs,
    }
    await user.save()

    return user.notificationPrefs
  },

  /**
   * Update seller profile (seller role only)
   */
  async updateSellerProfile(userId, data) {
    const user = await User.findById(userId)
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 401)
    }

    if (user.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403, 'Only sellers can update seller profile')
    }

    if (!user.seller) {
      user.seller = {
        displayName: { ar: user.name, en: '' },
        bio: { ar: '', en: '' },
        stages: [],
        materials: [],
        payoutWallet: user.phone,
      }
    }

    if (data.displayName !== undefined) {
      if (typeof data.displayName === 'string') {
        user.seller.displayName = { ar: data.displayName.trim(), en: '' }
      } else {
        user.seller.displayName = {
          ar: (data.displayName.ar || user.seller.displayName?.ar || user.name).trim(),
          en: (data.displayName.en || user.seller.displayName?.en || '').trim(),
        }
      }
    }

    if (data.bio !== undefined) {
      if (typeof data.bio === 'string') {
        user.seller.bio = { ar: data.bio.trim(), en: '' }
      } else {
        user.seller.bio = {
          ar: (data.bio.ar || '').trim(),
          en: (data.bio.en || '').trim(),
        }
      }
    }

    if (data.stages !== undefined) {
      user.seller.stages = data.stages
    }

    if (data.materials !== undefined) {
      user.seller.materials = data.materials
    }

    if (data.payoutWallet !== undefined) {
      const cleanWallet = normalizeEgyptianPhone(data.payoutWallet)
      if (!isValidEgyptianPhone(cleanWallet)) {
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid Egyptian payout wallet phone')
      }
      user.seller.payoutWallet = cleanWallet
    }

    await user.save()
    return user
  },

  /**
   * Admin: Create a new seller account
   */
  async createSeller(adminId, data, { ip = '' } = {}) {
    const cleanEmail = data.email.trim().toLowerCase()
    const cleanPhone = normalizeEgyptianPhone(data.phone)

    const emailTaken = await User.findOne({ email: cleanEmail })
    if (emailTaken) {
      throw new AppError('EMAIL_EXISTS', 409)
    }

    const phoneTaken = await User.findOne({ phone: cleanPhone })
    if (phoneTaken) {
      throw new AppError('PHONE_EXISTS', 409)
    }

    // Temporary password generation
    const tempPassword = `Tmp_${randomToken(4)}!8a`
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(tempPassword, salt)

    const displayName =
      typeof data.name === 'string'
        ? { ar: data.name.trim(), en: '' }
        : data.name
    const bio =
      typeof data.bio === 'string'
        ? { ar: data.bio.trim(), en: '' }
        : data.bio || { ar: '', en: '' }
    const payoutWallet = data.payoutWallet
      ? normalizeEgyptianPhone(data.payoutWallet)
      : cleanPhone

    const seller = await User.create({
      name: data.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      role: 'seller',
      status: 'active',
      emailVerified: true,
      mustChangePassword: true,
      governorate: data.governorate ? data.governorate.trim() : 'القاهرة',
      address: data.workshopAddress ? data.workshopAddress.trim() : '',
      seller: {
        displayName,
        bio,
        stages: data.stages || ['nursery', 'kg1'],
        materials: data.materials || ['felt'],
        payoutWallet,
      },
    })

    await audit.log(
      adminId,
      'SELLER_CREATED',
      'User',
      seller._id.toString(),
      { email: cleanEmail, phone: cleanPhone },
      ip
    )

    eventBus.emit(EVENT_TYPES.SELLER_CREATED, {
      user: seller,
      tempPassword,
    })

    return { seller, tempPassword }
  },

  /**
   * Admin: Toggle user status (active / suspended)
   */
  async updateUserStatus(adminId, targetUserId, status, { ip = '' } = {}) {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('NOT_FOUND', 404)
    }

    if (adminId.toString() === targetUserId.toString()) {
      throw new AppError('BAD_REQUEST', 400, 'Cannot suspend yourself')
    }

    const user = await User.findById(targetUserId)
    if (!user) {
      throw new AppError('NOT_FOUND', 404)
    }

    const prevStatus = user.status
    user.status = status
    await user.save()

    // Suspending a seller hides her products from public lists
    if (user.role === 'seller') {
      if (status === 'suspended') {
        await Product.updateMany({ sellerId: user._id }, { published: false })
      } else if (status === 'active') {
        await Product.updateMany({ sellerId: user._id }, { published: true })
      }
    }

    // Revoke refresh tokens on suspension
    if (status === 'suspended') {
      await RefreshToken.updateMany({ userId: user._id }, { revokedAt: new Date() })
    }

    await audit.log(
      adminId,
      'USER_STATUS_UPDATED',
      'User',
      user._id.toString(),
      { status, prevStatus },
      ip
    )

    return user
  },

  /**
   * Admin: List seller accounts
   */
  async getSellerAccounts() {
    const sellers = await User.find({ role: 'seller' }).sort({ createdAt: -1 })
    return sellers
  },
}

export default userService
