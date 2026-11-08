import mongoose from 'mongoose'
import { Category } from '../../db/models/Category.js'
import { Product } from '../../db/models/Product.js'
import { User } from '../../db/models/User.js'
import { CATEGORIES } from '../../config/constants.js'
import { arabicNormalize } from '../../utils/arabic.js'
import { escapeRegex } from '../../utils/regex.js'
import { AppError } from '../../utils/appError.js'
import { toCategoryDTO, toCatalogProductDTO } from './dto.js'

export const catalogService = {
  /**
   * Retrieves all product categories.
   * Auto-seeds from fixed dictionary if database collection is empty.
   */
  async getCategories() {
    const categories = await Category.find().sort({ order: 1, createdAt: 1 })

    if (!categories || categories.length === 0) {
      // Read-only in-memory fallback: never write to the database during GET
      return CATEGORIES.map(toCategoryDTO)
    }

    return categories.map(toCategoryDTO)
  },

  /**
   * Updates an existing category (Admin only).
   * Changing the slug or deleting categories is strictly forbidden.
   */
  async updateCategory(slugOrId, data) {
    if (!slugOrId) {
      throw new AppError('ERR_CATEGORY_NOT_FOUND', 404)
    }

    const query = mongoose.Types.ObjectId.isValid(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
      : { slug: slugOrId }

    const category = await Category.findOne(query)
    if (!category) {
      throw new AppError('ERR_CATEGORY_NOT_FOUND', 404)
    }

    // Slug is immutable
    if (data.slug && data.slug !== category.slug) {
      throw new AppError('VALIDATION_ERROR', 400, { slug: 'Category slug cannot be modified' })
    }

    if (data.nameAr !== undefined) category.nameAr = data.nameAr
    if (data.nameEn !== undefined) category.nameEn = data.nameEn
    if (data.name) {
      if (typeof data.name === 'object') {
        if (data.name.ar) category.nameAr = data.name.ar
        if (data.name.en) category.nameEn = data.name.en
      } else if (typeof data.name === 'string') {
        category.nameAr = data.name
      }
    }

    if (data.descriptionAr !== undefined) category.descriptionAr = data.descriptionAr
    if (data.descriptionEn !== undefined) category.descriptionEn = data.descriptionEn
    if (data.description) {
      if (typeof data.description === 'object') {
        if (data.description.ar) category.descriptionAr = data.description.ar
        if (data.description.en) category.descriptionEn = data.description.en
      } else if (typeof data.description === 'string') {
        category.descriptionAr = data.description
      }
    }

    if (data.color !== undefined) category.color = data.color
    if (data.bgColor !== undefined) category.bgColor = data.bgColor
    if (data.textColor !== undefined) category.textColor = data.textColor
    if (data.icon !== undefined) category.icon = data.icon
    if (data.order !== undefined) category.order = data.order

    await category.save()
    return toCategoryDTO(category)
  },

  /**
   * Reorders categories (Admin only).
   */
  async reorderCategories(slugsOrIds) {
    const list = Array.isArray(slugsOrIds)
      ? slugsOrIds
      : slugsOrIds?.slugs || slugsOrIds?.ids || []

    if (!Array.isArray(list) || list.length === 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'No categories provided to reorder')
    }

    for (let i = 0; i < list.length; i++) {
      const idOrSlug = list[i]
      const query = mongoose.Types.ObjectId.isValid(idOrSlug)
        ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
        : { slug: idOrSlug }

      await Category.updateOne(query, { $set: { order: i + 1 } })
    }

    return this.getCategories()
  },

  /**
   * Public list of published products with filtering, search, sorting and pagination.
   * Only includes products from active (non-suspended) sellers that are not soft-deleted.
   */
  async getProducts({
    q = '',
    category = '',
    categoryId = '',
    sellerId = '',
    minPrice,
    maxPrice,
    stage = '',
    inStock,
    sort = 'newest',
    page = 1,
    pageSize = 12,
  } = {}) {
    // 1. Fetch active sellers
    const activeSellers = await User.find({ role: 'seller', status: 'active' }, '_id')
    const activeSellerIds = activeSellers.map((s) => s._id.toString())

    if (activeSellerIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 12,
        totalPages: 0,
      }
    }

    // 2. Base filter: published, not deleted, active seller
    const andConditions = [
      { deletedAt: null },
      { published: true },
      { sellerId: { $in: activeSellerIds } },
    ]

    // 3. Category filter
    const catSlug = category || categoryId
    if (catSlug) {
      andConditions.push({ categorySlug: catSlug })
    }

    // 4. Seller filter
    if (sellerId) {
      if (!activeSellerIds.includes(sellerId.toString())) {
        return {
          items: [],
          total: 0,
          page: Number(page) || 1,
          pageSize: Number(pageSize) || 12,
          totalPages: 0,
        }
      }
      andConditions.push({ sellerId: new mongoose.Types.ObjectId(sellerId) })
    }

    // 5. Price filter
    if (typeof minPrice === 'number' && !isNaN(minPrice)) {
      andConditions.push({ price: { $gte: minPrice } })
    }
    if (typeof maxPrice === 'number' && !isNaN(maxPrice)) {
      andConditions.push({ price: { $lte: maxPrice } })
    }

    // 6. Educational Stage filter
    if (stage) {
      andConditions.push({
        $or: [{ stages: stage }, { stage: stage }],
      })
    }

    // 7. Stock availability filter
    if (typeof inStock === 'boolean') {
      if (inStock) {
        andConditions.push({ stock: { $gt: 0 } })
      } else {
        andConditions.push({ stock: { $lte: 0 } })
      }
    }

    // 8. Text Search with Arabic normalization & escaped regex
    if (q && q.trim()) {
      const trimmed = q.trim()
      const normalizedQuery = arabicNormalize(trimmed)
      const escapedNorm = escapeRegex(normalizedQuery)
      const escapedRaw = escapeRegex(trimmed)

      const searchOr = [
        { searchText: new RegExp(escapedNorm, 'i') },
        { 'name.ar': new RegExp(escapedRaw, 'i') },
        { 'name.en': new RegExp(escapedRaw, 'i') },
        { 'description.ar': new RegExp(escapedRaw, 'i') },
        { 'description.en': new RegExp(escapedRaw, 'i') },
      ]

      andConditions.push({ $or: searchOr })
    }

    const finalFilter = andConditions.length > 0 ? { $and: andConditions } : {}

    // 9. Sorting
    let sortObj = { createdAt: -1 }
    if (sort === 'price_asc') {
      sortObj = { price: 1, _id: 1 }
    } else if (sort === 'price_desc') {
      sortObj = { price: -1, _id: 1 }
    } else if (sort === 'oldest') {
      sortObj = { createdAt: 1, _id: 1 }
    } else {
      // newest
      sortObj = { createdAt: -1, _id: 1 }
    }

    // 10. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 12))
    const skip = (pageNum - 1) * limitNum

    const total = await Product.countDocuments(finalFilter)
    const products = await Product.find(finalFilter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('sellerId', '_id name seller avatar')

    const items = products.map(toCatalogProductDTO)

    return {
      items,
      total,
      page: pageNum,
      pageSize: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    }
  },

  /**
   * Retrieves single public product by ID or slug.
   * Draft products or suspended seller products are hidden from public/customers (404),
   * while allowing the product's owning seller or admin to load it for editing.
   */
  async getProduct(idOrSlug, viewer = null) {
    if (!idOrSlug) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? {
          $or: [{ _id: idOrSlug }, { slug: idOrSlug }],
          deletedAt: null,
        }
      : {
          slug: idOrSlug,
          deletedAt: null,
        }

    const product = await Product.findOne(query).populate('sellerId', '_id name seller avatar status')

    if (!product || !product.sellerId) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    const viewerIdStr = (viewer?._id || viewer?.id)?.toString()
    const productSellerIdStr = (product.sellerId?._id || product.sellerId)?.toString()

    const isAdmin = viewer?.role === 'admin'
    const isOwnerSeller =
      viewer?.role === 'seller' &&
      Boolean(viewerIdStr && productSellerIdStr && viewerIdStr === productSellerIdStr)

    if (!product.published && !isAdmin && !isOwnerSeller) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    if (product.sellerId.status !== 'active' && !isAdmin && !isOwnerSeller) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    return toCatalogProductDTO(product)
  },

  /**
   * Retrieves featured products showcase for homepage.
   */
  async getFeaturedProducts(limit = 6) {
    const numLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 6))

    const activeSellers = await User.find({ role: 'seller', status: 'active' }, '_id')
    const activeSellerIds = activeSellers.map((s) => s._id)

    const products = await Product.find({
      deletedAt: null,
      published: true,
      isFeatured: true,
      sellerId: { $in: activeSellerIds },
    })
      .sort({ createdAt: -1 })
      .limit(numLimit)
      .populate('sellerId', '_id name seller avatar')

    return products.map(toCatalogProductDTO)
  },

  /**
   * Retrieves related products for a given product.
   * Prioritizes the same category, fills remaining with other categories if needed.
   */
  async getRelatedProducts(idOrSlug, limit = 4) {
    const numLimit = Math.min(20, Math.max(1, parseInt(limit, 10) || 4))

    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { $or: [{ _id: idOrSlug }, { slug: idOrSlug }], deletedAt: null }
      : { slug: idOrSlug, deletedAt: null }

    const current = await Product.findOne(query)
    if (!current) return []

    const activeSellers = await User.find({ role: 'seller', status: 'active' }, '_id')
    const activeSellerIds = activeSellers.map((s) => s._id)

    // Primary: same category, excluding current product
    const related = await Product.find({
      _id: { $ne: current._id },
      categorySlug: current.categorySlug,
      deletedAt: null,
      published: true,
      sellerId: { $in: activeSellerIds },
    })
      .sort({ createdAt: -1 })
      .limit(numLimit)
      .populate('sellerId', '_id name seller avatar')

    if (related.length < numLimit) {
      const needed = numLimit - related.length
      const existingIds = [current._id, ...related.map((p) => p._id)]
      const others = await Product.find({
        _id: { $nin: existingIds },
        deletedAt: null,
        published: true,
        sellerId: { $in: activeSellerIds },
      })
        .sort({ createdAt: -1 })
        .limit(needed)
        .populate('sellerId', '_id name seller avatar')

      return [...related, ...others].map(toCatalogProductDTO)
    }

    return related.map(toCatalogProductDTO)
  },
}

export default catalogService
