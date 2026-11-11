import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import sharp from 'sharp'
import { User } from '../../db/models/User.js'
import { Address } from '../../db/models/Address.js'
import { Favorite } from '../../db/models/Favorite.js'
import { Product } from '../../db/models/Product.js'
import { RefreshToken } from '../../db/models/RefreshToken.js'
import { Order } from '../../db/models/Order.js'
import { Notification } from '../../db/models/Notification.js'
import { OtpCode } from '../../db/models/OtpCode.js'
import { CustomRequest } from '../../db/models/CustomRequest.js'
import { Payout } from '../../db/models/Payout.js'
import { storage } from '../../infra/storage/index.js'
import { audit } from '../../infra/audit/index.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { AppError } from '../../utils/appError.js'
import { mapProductDTO } from '../../utils/dto.js'
import { randomToken } from '../../utils/crypto.js'
import { normalizeEgyptianPhone, isValidEgyptianPhone } from '../../utils/phone.js'
import { authService } from '../auth/service.js'
import { sellerFinancials } from '../earnings/service.js'

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
   * Admin: List seller accounts (excluding deleted)
   */
  async getSellerAccounts() {
    const sellers = await User.find({ role: 'seller', status: { $ne: 'deleted' } }).sort({ createdAt: -1 })
    return sellers
  },

  /**
   * Customer: Self delete account (requires password verification)
   */
  async deleteAccount(userId, password, { ip = '' } = {}) {
    const user = await User.findById(userId).select('+passwordHash')
    if (!user) {
      throw new AppError('NOT_FOUND', 404)
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 400, 'كلمة المرور غير صحيحة')
    }

    // Active orders check
    const activeOrder = await Order.findOne({
      customerId: user._id,
      status: { $in: ['pending_payment', 'payment_confirmed', 'preparing', 'shipped'] },
    })
    if (activeOrder) {
      throw new AppError('ACCOUNT_HAS_ACTIVE_ORDERS', 409, 'لا يمكن حذف الحساب لوجود طلبات نشطة جاري تنفيذها')
    }

    const orderCount = await Order.countDocuments({ customerId: user._id })

    // Clean tokens, OTPs, notifications, addresses, favorites, and avatar
    await Promise.all([
      RefreshToken.deleteMany({ userId: user._id }),
      OtpCode.deleteMany({ userId: user._id }),
      Notification.deleteMany({ recipient: user._id }),
      Address.deleteMany({ userId: user._id }),
      Favorite.deleteMany({ userId: user._id }),
    ])

    if (user.avatar?.key) {
      await storage.remove(user.avatar.key).catch(() => {})
    }

    if (orderCount === 0) {
      await CustomRequest.updateMany({ customerId: user._id }, { $set: { customerId: null } })
      await User.findByIdAndDelete(user._id)
      await audit.log(user._id, 'USER_ACCOUNT_DELETED', 'User', user._id.toString(), { mode: 'hard' }, ip)
      return { success: true, mode: 'hard' }
    }

    // Anonymize user record to preserve historical order integrity
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          name: 'حساب محذوف',
          email: `deleted-${user._id}@deleted.invalid`,
          phone: `00000000000-${user._id}`,
          avatar: { key: null, url: null },
          governorate: '',
          city: '',
          address: '',
          nurseryName: '',
          status: 'deleted',
          deletedAt: new Date(),
          emailVerified: false,
        },
      }
    )

    await audit.log(user._id, 'USER_ACCOUNT_ANONYMIZED', 'User', user._id.toString(), { mode: 'anonymized' }, ip)
    return { success: true, mode: 'anonymized' }
  },

  /**
   * Admin: Delete user (customer or seller)
   */
  async deleteUserByAdmin(adminId, targetUserId, { ip = '' } = {}) {
    if (!mongoose.isValidObjectId(targetUserId)) {
      throw new AppError('NOT_FOUND', 404)
    }

    if (adminId.toString() === targetUserId.toString()) {
      throw new AppError('BAD_REQUEST', 400, 'Cannot delete yourself')
    }

    const target = await User.findById(targetUserId)
    if (!target) {
      throw new AppError('NOT_FOUND', 404)
    }

    if (target.role === 'admin') {
      throw new AppError('FORBIDDEN', 403, 'Cannot delete an admin account')
    }

    if (target.role === 'customer') {
      const activeOrder = await Order.findOne({
        customerId: target._id,
        status: { $in: ['pending_payment', 'payment_confirmed', 'preparing', 'shipped'] },
      })
      if (activeOrder) {
        throw new AppError('ACCOUNT_HAS_ACTIVE_ORDERS', 409, 'لا يمكن حذف الحساب لوجود طلبات نشطة جاري تنفيذها')
      }

      const orderCount = await Order.countDocuments({ customerId: target._id })

      await Promise.all([
        RefreshToken.deleteMany({ userId: target._id }),
        OtpCode.deleteMany({ userId: target._id }),
        Notification.deleteMany({ recipient: target._id }),
        Address.deleteMany({ userId: target._id }),
        Favorite.deleteMany({ userId: target._id }),
      ])

      if (target.avatar?.key) {
        await storage.remove(target.avatar.key).catch(() => {})
      }

      if (orderCount === 0) {
        await CustomRequest.updateMany({ customerId: target._id }, { $set: { customerId: null } })
        await User.findByIdAndDelete(target._id)
        await audit.log(adminId, 'USER_DELETED_BY_ADMIN', 'User', target._id.toString(), { mode: 'hard', targetRole: 'customer' }, ip)
        return { success: true, mode: 'hard', id: target._id.toString() }
      }

      await User.updateOne(
        { _id: target._id },
        {
          $set: {
            name: 'حساب محذوف',
            email: `deleted-${target._id}@deleted.invalid`,
            phone: `00000000000-${target._id}`,
            avatar: { key: null, url: null },
            governorate: '',
            city: '',
            address: '',
            nurseryName: '',
            status: 'deleted',
            deletedAt: new Date(),
            deletedBy: adminId,
            emailVerified: false,
          },
        }
      )

      await audit.log(adminId, 'USER_ANONYMIZED_BY_ADMIN', 'User', target._id.toString(), { mode: 'anonymized', targetRole: 'customer' }, ip)
      return { success: true, mode: 'anonymized', id: target._id.toString() }
    }

    if (target.role === 'seller') {
      const activeOrder = await Order.findOne({
        'items.sellerId': target._id,
        status: { $in: ['pending_payment', 'payment_confirmed', 'preparing', 'shipped'] },
      })
      if (activeOrder) {
        throw new AppError('SELLER_HAS_ACTIVE_ORDERS', 409, 'لا يمكن حذف البائعة لوجود طلبات نشطة لمنتجاتها')
      }

      const financials = await sellerFinancials(target._id)
      const duePiasters = Math.max(0, (financials.net || 0) - (financials.paid || 0))
      if (duePiasters > 0) {
        throw new AppError('SELLER_HAS_ACTIVE_OBLIGATIONS', 409, 'لا يمكن حذف البائعة لوجود مستحقات مالية غير مسددة')
      }

      const hasPendingPayout = await Payout.exists({ sellerId: target._id, status: 'pending' })
      if (hasPendingPayout) {
        throw new AppError('SELLER_HAS_ACTIVE_OBLIGATIONS', 409, 'لا يمكن حذف البائعة لوجود دفعات معلقة')
      }

      // Release claimed custom requests back to pool
      await CustomRequest.updateMany(
        { claimedBy: target._id, status: 'pending' },
        { $set: { claimedBy: null, claimedAt: null, status: 'new' } }
      )

      // Handle products: hard delete unsold products and wipe images, soft-delete products with orders
      const products = await Product.find({ sellerId: target._id })
      for (const product of products) {
        const hasOrder = await Order.exists({ 'items.productId': product._id })
        if (hasOrder) {
          await Product.updateOne({ _id: product._id }, { $set: { deletedAt: new Date(), published: false } })
        } else {
          for (const img of product.images || []) {
            if (img.key) await storage.remove(img.key).catch(() => {})
          }
          await Product.findByIdAndDelete(product._id)
        }
      }

      await Promise.all([
        RefreshToken.deleteMany({ userId: target._id }),
        OtpCode.deleteMany({ userId: target._id }),
        Notification.deleteMany({ recipient: target._id }),
      ])

      if (target.avatar?.key) {
        await storage.remove(target.avatar.key).catch(() => {})
      }

      const hasOrderHistory = await Order.exists({ 'items.sellerId': target._id })
      const hasPayoutHistory = await Payout.exists({ sellerId: target._id })

      if (hasOrderHistory || hasPayoutHistory) {
        await User.updateOne(
          { _id: target._id },
          {
            $set: {
              name: 'حساب محذوف',
              email: `deleted-${target._id}@deleted.invalid`,
              phone: `00000000000-${target._id}`,
              avatar: { key: null, url: null },
              status: 'deleted',
              deletedAt: new Date(),
              deletedBy: adminId,
              'seller.displayName': { ar: 'بائعة سابقة', en: 'Former Seller' },
              'seller.bio': { ar: '', en: '' },
              emailVerified: false,
            },
          }
        )

        await audit.log(adminId, 'SELLER_ANONYMIZED_BY_ADMIN', 'User', target._id.toString(), { mode: 'anonymized' }, ip)
        return { success: true, mode: 'anonymized', id: target._id.toString() }
      }

      await User.findByIdAndDelete(target._id)
      await audit.log(adminId, 'SELLER_DELETED_BY_ADMIN', 'User', target._id.toString(), { mode: 'hard' }, ip)
      return { success: true, mode: 'hard', id: target._id.toString() }
    }

    throw new AppError('BAD_REQUEST', 400, 'Unsupported user role for deletion')
  },
}

export default userService
