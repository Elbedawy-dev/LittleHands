import mongoose from 'mongoose'
import { User } from '../../db/models/User.js'
import { Product } from '../../db/models/Product.js'
import { Category } from '../../db/models/Category.js'
import { Order } from '../../db/models/Order.js'
import { CustomRequest } from '../../db/models/CustomRequest.js'
import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { AppError } from '../../utils/appError.js'
import { toCatalogProductDTO } from '../catalog/dto.js'
import { toSellerPublicDTO, toSellerCustomRequestDTO } from './dto.js'

export const sellerService = {
  /**
   * Retrieves all active sellers with product counts and categories (Public).
   */
  async getSellers() {
    const sellers = await User.find({ role: 'seller', status: 'active' }).sort({ createdAt: 1 })

    const result = []
    for (const seller of sellers) {
      const products = await Product.find({
        sellerId: seller._id,
        published: true,
        deletedAt: null,
      })

      const categoryIds = [...new Set(products.map((p) => p.categorySlug).filter(Boolean))]
      const categories = await Category.find({ slug: { $in: categoryIds } })

      let completedOrdersCount = 0
      try {
        completedOrdersCount = await Order.countDocuments({
          status: 'delivered',
          'items.sellerId': seller._id,
        })
      } catch {
        completedOrdersCount = 0
      }

      result.push(
        toSellerPublicDTO(seller, {
          productsCount: products.length,
          categoryIds,
          categories,
          completedOrdersCount,
        })
      )
    }

    return result
  },

  /**
   * Retrieves single public seller by ID.
   */
  async getSeller(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ERR_SELLER_NOT_FOUND', 404)
    }

    const seller = await User.findOne({ _id: id, role: 'seller', status: 'active' })
    if (!seller) {
      throw new AppError('ERR_SELLER_NOT_FOUND', 404)
    }

    const products = await Product.find({
      sellerId: seller._id,
      published: true,
      deletedAt: null,
    })

    const categoryIds = [...new Set(products.map((p) => p.categorySlug).filter(Boolean))]
    const categories = await Category.find({ slug: { $in: categoryIds } })

    let completedOrdersCount = 0
    try {
      completedOrdersCount = await Order.countDocuments({
        status: 'delivered',
        'items.sellerId': seller._id,
      })
    } catch {
      completedOrdersCount = 0
    }

    return toSellerPublicDTO(seller, {
      productsCount: products.length,
      categoryIds,
      categories,
      completedOrdersCount,
    })
  },

  /**
   * Retrieves all published products for a specific seller (Public).
   */
  async getSellerProducts(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('ERR_SELLER_NOT_FOUND', 404)
    }

    const seller = await User.findOne({ _id: id, role: 'seller', status: 'active' })
    if (!seller) {
      throw new AppError('ERR_SELLER_NOT_FOUND', 404)
    }

    const products = await Product.find({
      sellerId: seller._id,
      published: true,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .populate('sellerId', '_id name seller avatar')

    return products.map(toCatalogProductDTO)
  },

  // B1 Implementations
  async updateSellerProfile(userId, data) {
    const { userService } = await import('../users/service.js')
    return userService.updateSellerProfile(userId, data)
  },
  async createSeller(adminId, data, meta) {
    const { userService } = await import('../users/service.js')
    return userService.createSeller(adminId, data, meta)
  },
  async updateStatus(adminId, targetUserId, status, meta) {
    const { userService } = await import('../users/service.js')
    return userService.updateUserStatus(adminId, targetUserId, status, meta)
  },

  /**
   * Retrieves custom educational aid requests for the authenticated seller.
   * Supports pagination, status filtering, and tabs ('available' | 'mine' | 'all').
   */
  async getCustomRequests(sellerUser, { status, filter, tab, page = 1, pageSize = 12 } = {}) {
    if (!sellerUser || sellerUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403, 'Forbidden')
    }
    if (sellerUser.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'Account is not active')
    }

    const filterObj = {}
    const activeFilter = filter || tab

    if (activeFilter === 'available') {
      filterObj.claimedBy = null
      filterObj.status = { $in: ['new', 'pending'] }
    } else if (activeFilter === 'mine') {
      filterObj.claimedBy = sellerUser._id
    }

    if (status && status !== 'all') {
      filterObj.status = status
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 12))
    const skip = (pageNum - 1) * limitNum

    const total = await CustomRequest.countDocuments(filterObj)
    const requests = await CustomRequest.find(filterObj)
      .populate('claimedBy', 'name seller.displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)

    return {
      items: requests.map((item) => toSellerCustomRequestDTO(item, sellerUser._id)),
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }
  },

  /**
   * Atomically claims a custom request for the authenticated seller.
   * Idempotent: returns success if already claimed by the same seller.
   * Race-safe: returns 409 CUSTOM_REQUEST_ALREADY_CLAIMED if won by another seller.
   */
  async claimCustomRequest(sellerUser, id) {
    if (!sellerUser || sellerUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403, 'Forbidden')
    }
    if (sellerUser.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'Account is not active')
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('NOT_FOUND', 404, 'Custom request not found')
    }

    const now = new Date()
    const updated = await CustomRequest.findOneAndUpdate(
      {
        _id: id,
        claimedBy: null,
        status: { $in: ['new', 'pending'] },
      },
      {
        $set: {
          claimedBy: sellerUser._id,
          claimedAt: now,
          status: 'contacted',
        },
      },
      { new: true }
    ).populate('claimedBy', 'name seller.displayName')

    if (updated) {
      eventBus.emit(EVENT_TYPES.CUSTOM_REQUEST_CLAIMED, {
        request: updated,
        seller: sellerUser,
      })
      return toSellerCustomRequestDTO(updated, sellerUser._id)
    }

    // Atomic claim did not match; inspect reason
    const existing = await CustomRequest.findById(id).populate('claimedBy', 'name seller.displayName')
    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Custom request not found')
    }

    const existingClaimedById = existing.claimedBy?._id?.toString() || existing.claimedBy?.toString()
    if (existingClaimedById === sellerUser._id.toString()) {
      return toSellerCustomRequestDTO(existing, sellerUser._id)
    }

    if (existing.claimedBy) {
      throw new AppError('CUSTOM_REQUEST_ALREADY_CLAIMED', 409)
    }

    throw new AppError('CUSTOM_REQUEST_NOT_AVAILABLE', 409)
  },

  /**
   * Updates status of a custom request claimed by this seller.
   * Atomic transition: { _id: id, claimedBy: me, status: { $ne: 'closed' } }
   * Status can be: 'pending', 'contacted', 'closed'
   * If request is already closed: returns 409 CUSTOM_REQUEST_LOCKED
   * If claimed by another or not found: returns 404
   * Suspended seller: returns 403 FORBIDDEN
   */
  async updateCustomRequestStatus(sellerUser, id, status) {
    if (!sellerUser || sellerUser.role !== 'seller') {
      throw new AppError('FORBIDDEN', 403, 'Forbidden')
    }
    if (sellerUser.status !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'Account is not active')
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('NOT_FOUND', 404, 'Custom request not found')
    }

    const now = new Date()
    const updateSet = {
      status,
      ...(status === 'closed' ? { closedAt: now } : {}),
    }

    const updated = await CustomRequest.findOneAndUpdate(
      {
        _id: id,
        claimedBy: sellerUser._id,
        status: { $ne: 'closed' },
      },
      {
        $set: updateSet,
      },
      { new: true }
    ).populate('claimedBy', 'name seller.displayName')

    if (updated) {
      return toSellerCustomRequestDTO(updated, sellerUser._id)
    }

    // Atomic update did not match; inspect reason
    const existing = await CustomRequest.findById(id)
    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Custom request not found')
    }

    const existingClaimedById = existing.claimedBy?.toString()
    if (!existingClaimedById || existingClaimedById !== sellerUser._id.toString()) {
      throw new AppError('NOT_FOUND', 404, 'Custom request not found')
    }

    if (existing.status === 'closed') {
      throw new AppError('CUSTOM_REQUEST_LOCKED', 409, {
        ar: 'لا يمكن تغيير حالة طلب مكتمل',
        en: 'Cannot change the status of a completed request',
      })
    }

    throw new AppError('NOT_FOUND', 404, 'Custom request not found')
  },
}

export default sellerService
