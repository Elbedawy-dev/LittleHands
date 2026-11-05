import mongoose from 'mongoose'
import { User } from '../../db/models/User.js'
import { Product } from '../../db/models/Product.js'
import { Category } from '../../db/models/Category.js'
import { Order } from '../../db/models/Order.js'
import { AppError } from '../../utils/appError.js'
import { toCatalogProductDTO } from '../catalog/dto.js'
import { toSellerPublicDTO } from './dto.js'

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
}

export default sellerService
