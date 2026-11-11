import mongoose from 'mongoose'
import sharp from 'sharp'
import { Product } from '../../db/models/Product.js'
import { User } from '../../db/models/User.js'
import { Setting } from '../../db/models/Setting.js'
import { Upload } from '../../db/models/Upload.js'
import { storage } from '../../infra/storage/index.js'
import { arabicNormalize } from '../../utils/arabic.js'
import { escapeRegex } from '../../utils/regex.js'
import { AppError } from '../../utils/appError.js'
import { DEFAULT_COMMISSION_RATE } from '../../config/constants.js'
import { toManageProductDTO } from './dto.js'
import { hasForbiddenWord } from './schemas.js'

async function getCurrentCommissionRate() {
  const setting = await Setting.findOne({ singletonKey: 'platform_settings' })
  return setting?.commissionRate !== undefined ? Number(setting.commissionRate) : DEFAULT_COMMISSION_RATE
}

export const productService = {
  /**
   * Retrieves manageable products for Sellers and Admins.
   * Sellers see only their own products; Admin may view all or filter by sellerId.
   */
  async getManageableProducts({ user, q = '', status = 'all', sellerId = '' }) {
    const isSeller = user.role === 'seller'
    const targetSellerId = isSeller ? user._id : sellerId ? new mongoose.Types.ObjectId(sellerId) : null

    const filter = {
      deletedAt: null,
    }

    if (targetSellerId) {
      filter.sellerId = targetSellerId
    }

    if (q && q.trim()) {
      const trimmed = q.trim()
      const rawRegex = new RegExp(escapeRegex(trimmed), 'i')
      const normRegex = new RegExp(escapeRegex(arabicNormalize(trimmed)), 'i')

      filter.$or = [
        { 'name.ar': rawRegex },
        { 'name.en': rawRegex },
        { searchText: normRegex },
      ]
    }

    if (status === 'published') {
      filter.published = true
    } else if (status === 'draft') {
      filter.published = false
    } else if (status === 'out_of_stock' || status === 'out-of-stock') {
      filter.stock = { $lte: 0 }
    }

    const commissionRate = await getCurrentCommissionRate()

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .populate('sellerId', '_id name seller avatar')

    return products.map((p) => toManageProductDTO(p, commissionRate))
  },

  /**
   * Creates a new product.
   */
  async createProduct({ user, data }) {
    let targetSellerId
    let sellerName = ''

    if (user.role === 'seller') {
      targetSellerId = user._id
      sellerName = user.seller?.displayName?.ar || user.name
    } else if (user.role === 'admin') {
      if (!data.sellerId) {
        throw new AppError('VALIDATION_ERROR', 400, 'sellerId is required when creating a product as admin')
      }
      const seller = await User.findById(data.sellerId)
      if (!seller || seller.role !== 'seller') {
        throw new AppError('VALIDATION_ERROR', 400, 'Invalid sellerId: seller does not exist')
      }
      targetSellerId = seller._id
      sellerName = seller.seller?.displayName?.ar || seller.name
    } else {
      throw new AppError('FORBIDDEN', 403)
    }

    // Check forbidden words across text inputs
    if (
      hasForbiddenWord(data.name) ||
      hasForbiddenWord(data.nameAr) ||
      hasForbiddenWord(data.nameEn) ||
      hasForbiddenWord(data.description) ||
      hasForbiddenWord(data.descAr) ||
      hasForbiddenWord(data.descEn) ||
      hasForbiddenWord(data.details) ||
      hasForbiddenWord(data.size)
    ) {
      throw new AppError('VALIDATION_ERROR', 400, 'Content contains forbidden marketing words')
    }

    const nameAr = (data.nameAr || (typeof data.name === 'object' ? data.name.ar : data.name) || '').trim()
    const nameEn = (data.nameEn || (typeof data.name === 'object' ? data.name.en : '') || '').trim()

    const descAr = (data.descAr || (typeof data.description === 'object' ? data.description.ar : data.description) || '').trim()
    const descEn = (data.descEn || (typeof data.description === 'object' ? data.description.en : '') || '').trim()

    // Determine publishing flag
    const isPublished =
      data.published !== undefined
        ? Boolean(data.published)
        : data.isPublished !== undefined
        ? Boolean(data.isPublished)
        : true

    // Normalize images array
    const rawImages = Array.isArray(data.images) ? data.images : []
    const images = rawImages.map((img) => {
      if (typeof img === 'string') {
        return { key: img.split('/').pop(), url: img }
      }
      return { key: img.key || img.url?.split('/').pop() || '', url: img.url || '' }
    })

    if (isPublished && images.length === 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'Publishing requires at least one product image')
    }

    // Generate unique slug
    const baseSlugText = nameEn || nameAr || 'product'
    let baseSlug = baseSlugText
      .toLowerCase()
      .replace(/[^a-z0-9\u0621-\u064A]+/g, '-')
      .replace(/(^-|-$)/g, '')
    if (!baseSlug) baseSlug = `product-${Date.now()}`

    let slug = baseSlug
    let suffix = 1
    while (await Product.exists({ slug })) {
      slug = `${baseSlug}-${suffix++}`
    }

    // Compute search text with Arabic normalization
    const searchText = arabicNormalize(`${nameAr} ${nameEn} ${descAr} ${descEn}`)

    // Details formatting
    const details = {
      material: {
        ar: data.details?.material?.ar || (Array.isArray(data.materials) ? data.materials.join('، ') : 'جوخ'),
        en: data.details?.material?.en || (Array.isArray(data.materials) ? data.materials.join(', ') : 'Craft Felt'),
      },
      size: {
        ar: data.details?.size?.ar || data.sizeAr || (typeof data.size === 'string' ? data.size : '') || '50 × 70 سم',
        en: data.details?.size?.en || data.sizeEn || '',
      },
      usage: {
        ar: data.details?.usage?.ar || data.usageAr || '',
        en: data.details?.usage?.en || data.usageEn || '',
      },
      care: {
        ar: data.details?.care?.ar || data.careAr || '',
        en: data.details?.care?.en || data.careEn || '',
      },
    }

    const price = Number(data.price) || 0
    const stock = data.stock !== undefined ? Number(data.stock) : data.stockCount !== undefined ? Number(data.stockCount) : 10

    const product = await Product.create({
      sellerId: targetSellerId,
      sellerName,
      categorySlug: data.categoryId || data.categorySlug,
      name: { ar: nameAr, en: nameEn },
      nameEn,
      slug,
      description: { ar: descAr, en: descEn },
      price,
      stock,
      stage: (data.stages && data.stages[0]) || data.stage || 'nursery',
      stages: data.stages && data.stages.length > 0 ? data.stages : ['nursery'],
      materials: data.materials && data.materials.length > 0 ? data.materials : ['felt'],
      details,
      images,
      published: isPublished,
      isFeatured: user.role === 'admin' ? !!data.isFeatured : false,
      deletedAt: null,
      searchText,
    })

    // Mark image uploads as attached
    const imageKeys = images.map((img) => img.key).filter(Boolean)
    if (imageKeys.length > 0) {
      await storage.markAttached(imageKeys)
    }

    const commissionRate = await getCurrentCommissionRate()
    return toManageProductDTO(product, commissionRate)
  },

  /**
   * Updates an existing product.
   * Enforces object-level authorization (Seller can update ONLY her own product).
   */
  async updateProduct({ user, productId, data }) {
    const query = mongoose.Types.ObjectId.isValid(productId)
      ? { $or: [{ _id: productId }, { slug: productId }], deletedAt: null }
      : { slug: productId, deletedAt: null }

    const product = await Product.findOne(query)
    if (!product) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    // Object-level authorization: return 404 (not 403) for resources caller does not own
    if (user.role === 'seller' && product.sellerId.toString() !== user._id.toString()) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    // Check forbidden words
    if (
      hasForbiddenWord(data.name) ||
      hasForbiddenWord(data.nameAr) ||
      hasForbiddenWord(data.nameEn) ||
      hasForbiddenWord(data.description) ||
      hasForbiddenWord(data.descAr) ||
      hasForbiddenWord(data.descEn) ||
      hasForbiddenWord(data.details) ||
      hasForbiddenWord(data.size)
    ) {
      throw new AppError('VALIDATION_ERROR', 400, 'Content contains forbidden marketing words')
    }

    if (data.name !== undefined || data.nameAr !== undefined || data.nameEn !== undefined) {
      const nameAr = (data.nameAr || (typeof data.name === 'object' ? data.name.ar : data.name) || product.name.ar).trim()
      const nameEn = (data.nameEn || (typeof data.name === 'object' ? data.name.en : product.name.en) || '').trim()
      product.name = { ar: nameAr, en: nameEn }
      product.nameEn = nameEn
    }

    if (data.description !== undefined || data.descAr !== undefined || data.descEn !== undefined) {
      const descAr = (data.descAr || (typeof data.description === 'object' ? data.description.ar : data.description) || product.description.ar).trim()
      const descEn = (data.descEn || (typeof data.description === 'object' ? data.description.en : product.description.en) || '').trim()
      product.description = { ar: descAr, en: descEn }
    }

    // Update search text
    product.searchText = arabicNormalize(
      `${product.name.ar} ${product.name.en || ''} ${product.description.ar} ${product.description.en || ''}`
    )

    if (data.categoryId) product.categorySlug = data.categoryId
    if (data.categorySlug) product.categorySlug = data.categorySlug
    if (data.price !== undefined) product.price = Number(data.price)
    if (data.stock !== undefined) product.stock = Number(data.stock)
    if (data.stockCount !== undefined) product.stock = Number(data.stockCount)
    if (data.stages !== undefined) {
      product.stages = data.stages
      if (data.stages.length > 0) product.stage = data.stages[0]
    }
    if (data.materials !== undefined) product.materials = data.materials
    if (data.isFeatured !== undefined && user.role === 'admin') product.isFeatured = Boolean(data.isFeatured)

    // Details update
    if (data.details || data.sizeAr || data.sizeEn || data.usageAr || data.usageEn || data.careAr || data.careEn) {
      product.details = {
        material: {
          ar: data.details?.material?.ar || product.details?.material?.ar || '',
          en: data.details?.material?.en || product.details?.material?.en || '',
        },
        size: {
          ar: data.details?.size?.ar || data.sizeAr || (typeof data.size === 'string' ? data.size : product.details?.size?.ar) || '50 × 70 سم',
          en: data.details?.size?.en || data.sizeEn || product.details?.size?.en || '',
        },
        usage: {
          ar: data.details?.usage?.ar || data.usageAr || product.details?.usage?.ar || '',
          en: data.details?.usage?.en || data.usageEn || product.details?.usage?.en || '',
        },
        care: {
          ar: data.details?.care?.ar || data.careAr || product.details?.care?.ar || '',
          en: data.details?.care?.en || data.careEn || product.details?.care?.en || '',
        },
      }
    }

    // Images update
    if (data.images !== undefined) {
      const oldKeys = (product.images || []).map((img) => img.key).filter(Boolean)
      const rawImages = Array.isArray(data.images) ? data.images : []
      const formatted = rawImages.map((img) => {
        if (typeof img === 'string') {
          return { key: img.split('/').pop(), url: img }
        }
        return { key: img.key || img.url?.split('/').pop() || '', url: img.url || '' }
      })

      product.images = formatted
      const newKeys = formatted.map((img) => img.key).filter(Boolean)
      if (newKeys.length > 0) {
        await storage.markAttached(newKeys)
      }

      // Mark removed/detached images as unattached for cleanup
      const detachedKeys = oldKeys.filter((k) => !newKeys.includes(k))
      if (detachedKeys.length > 0) {
        await Upload.updateMany(
          { key: { $in: detachedKeys } },
          { $set: { attachedAt: null } }
        )
      }
    }

    if (data.published !== undefined || data.isPublished !== undefined) {
      const targetPublished =
        data.published !== undefined ? Boolean(data.published) : Boolean(data.isPublished)
      product.published = targetPublished
    }

    if (product.published && (!product.images || product.images.length === 0)) {
      throw new AppError('VALIDATION_ERROR', 400, 'Publishing requires at least one product image')
    }

    await product.save()

    const commissionRate = await getCurrentCommissionRate()
    return toManageProductDTO(product, commissionRate)
  },

  /**
   * Soft-deletes a product by ID.
   * Keeps old orders referring to this product readable.
   */
  async deleteProduct({ user, productId }) {
    const query = mongoose.Types.ObjectId.isValid(productId)
      ? { $or: [{ _id: productId }, { slug: productId }], deletedAt: null }
      : { slug: productId, deletedAt: null }

    const product = await Product.findOne(query)
    if (!product) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    if (user.role === 'seller' && product.sellerId.toString() !== user._id.toString()) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    product.deletedAt = new Date()
    await product.save()

    return { success: true }
  },

  /**
   * Toggles product published state.
   */
  async setPublished({ user, productId, published }) {
    const query = mongoose.Types.ObjectId.isValid(productId)
      ? { $or: [{ _id: productId }, { slug: productId }], deletedAt: null }
      : { slug: productId, deletedAt: null }

    const product = await Product.findOne(query)
    if (!product) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    if (user.role === 'seller' && product.sellerId.toString() !== user._id.toString()) {
      throw new AppError('ERR_PRODUCT_NOT_FOUND', 404)
    }

    if (published && (!product.images || product.images.length === 0)) {
      throw new AppError('VALIDATION_ERROR', 400, 'Publishing requires at least one product image')
    }

    product.published = Boolean(published)
    await product.save()

    const commissionRate = await getCurrentCommissionRate()
    return toManageProductDTO(product, commissionRate)
  },

  /**
   * Validates, processes with Sharp, and stores product images.
   */
  async uploadImages({ user, files }) {
    if (!files || files.length === 0) {
      throw new AppError('VALIDATION_ERROR', 400, 'No image files provided')
    }

    if (files.length > 6) {
      throw new AppError('VALIDATION_ERROR', 400, 'Maximum 6 images allowed per upload')
    }

    const uploadedUrls = []
    const uploadedKeys = []

    for (const file of files) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new AppError('VALIDATION_ERROR', 400, `File "${file.originalname}" exceeds 5MB size limit`)
      }

      // Validate image buffer & metadata with Sharp
      let metadata
      try {
        metadata = await sharp(file.buffer).metadata()
      } catch {
        throw new AppError('VALIDATION_ERROR', 400, `File "${file.originalname}" is not a valid image`)
      }

      const allowedFormats = ['jpeg', 'png', 'webp']
      if (!metadata.format || !allowedFormats.includes(metadata.format)) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          `Unsupported image format "${metadata.format}". Only JPEG, PNG and WebP are allowed.`
        )
      }

      // Re-encode image with Sharp to strip EXIF and metadata
      const cleanBuffer = await sharp(file.buffer)
        .rotate() // Auto-orient according to EXIF before stripping
        .toFormat(metadata.format, { quality: 85 })
        .toBuffer()

      const result = await storage.saveImage(
        {
          buffer: cleanBuffer,
          mimetype: `image/${metadata.format}`,
          originalname: file.originalname,
          size: cleanBuffer.length,
        },
        {
          kind: 'product',
          ownerId: user._id,
        }
      )

      uploadedUrls.push(result.url)
      uploadedKeys.push(result.key)
    }

    return {
      urls: uploadedUrls,
      keys: uploadedKeys,
      images: uploadedUrls.map((url, i) => ({ key: uploadedKeys[i], url })),
    }
  },
}

export default productService
