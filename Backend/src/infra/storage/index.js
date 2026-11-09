import crypto from 'node:crypto'
import path from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import { v2 as cloudinary } from 'cloudinary'

// Disable file caching on Windows
sharp.cache(false)
import { env } from '../../config/env.js'
import { sha256 } from '../../utils/crypto.js'
import { AppError } from '../../utils/appError.js'
import { Upload } from '../../db/models/Upload.js'

// Allowed image MIME types verified by magic bytes
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Test-only in-memory storage store
const memoryStore = new Map()

// Configure Cloudinary if credentials are present
function initCloudinary() {
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    })
    return true
  }
  return false
}

initCloudinary()

export const storage = {
  // Expose memoryStore helpers for tests only
  _memoryStore: memoryStore,
  hasInMemory(key) {
    return memoryStore.has(path.basename(key))
  },
  getInMemory(key) {
    return memoryStore.get(path.basename(key))
  },
  clearMemory() {
    memoryStore.clear()
  },

  /**
   * Saves and processes an image:
   * 1. Validates magic bytes via file-type (JPEG, PNG, WEBP only, rejects fake images)
   * 2. Checks size <= 5MB
   * 3. Calculates original SHA-256 hash
   * 4. Re-encodes with sharp: max 1600px width/height, auto-oriented, EXIF stripped, webp
   * 5. Generates random filename
   * 6. Saves to Cloudinary (or in-memory driver when in test environment)
   * 7. Records an Upload row in MongoDB
   */
  async saveImage(file, { kind = 'product', ownerId = null } = {}) {
    if (!file) {
      throw new AppError('INVALID_FILE_TYPE', 400, 'No file provided')
    }

    let buffer = file.buffer
    if (!buffer && file.path) {
      const fs = await import('node:fs')
      if (fs.existsSync(file.path)) {
        buffer = await fs.promises.readFile(file.path)
      }
    }

    if (!buffer || buffer.length === 0) {
      throw new AppError('INVALID_FILE_TYPE', 400, 'File buffer is empty')
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new AppError('FILE_TOO_LARGE', 400, 'File size exceeds maximum allowed limit (5MB)')
    }

    const detectedType = await fileTypeFromBuffer(buffer)
    if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
      throw new AppError('INVALID_FILE_TYPE', 400, 'Unsupported file type. Only JPEG, PNG, and WEBP are allowed.')
    }

    const fileHash = sha256(buffer)

    let processedBuffer
    try {
      processedBuffer = await sharp(buffer)
        .rotate()
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer()
    } catch (sharpError) {
      throw new AppError('INVALID_FILE_TYPE', 400, `Corrupt or invalid image data: ${sharpError.message}`)
    }

    const isPrivate = kind === 'payment'
    const randomSuffix = crypto.randomBytes(8).toString('hex')
    const key = `${kind}_${Date.now()}_${randomSuffix}.webp`

    const isTest = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test'
    const driver = env.STORAGE_DRIVER || (isTest ? 'memory' : 'cloudinary')

    // Guard: Memory storage is strictly test-only
    if (driver === 'memory') {
      if (!isTest) {
        throw new AppError(
          'LOCAL_STORAGE_PROHIBITED_IN_PRODUCTION',
          500,
          'Memory storage driver is strictly test-only and requires NODE_ENV=test'
        )
      }

      memoryStore.set(key, {
        buffer: processedBuffer,
        mime: 'image/webp',
        kind,
        size: processedBuffer.length,
        hash: fileHash,
        key,
      })

      const fileUrl = isPrivate ? `/api/v1/files/${key}` : `/test-memory/${key}`

      try {
        if (Upload && typeof Upload.create === 'function') {
          await Upload.create({
            key,
            kind,
            ownerId: ownerId || null,
            attachedAt: null,
          })
        }
      } catch (e) {
        console.warn('[STORAGE] Failed to record upload:', e.message)
      }

      return {
        key,
        url: fileUrl,
        hash: fileHash,
        mime: 'image/webp',
        size: processedBuffer.length,
      }
    }

    // Guard: Prohibit any non-cloudinary driver in non-test mode
    if (driver !== 'cloudinary') {
      throw new AppError(
        'LOCAL_STORAGE_PROHIBITED_IN_PRODUCTION',
        500,
        'Only Cloudinary storage driver is allowed in development and production'
      )
    }

    // Cloudinary upload
    initCloudinary()
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `little_hands/${kind}`,
          public_id: `${kind}_${Date.now()}_${randomSuffix}`,
          type: isPrivate ? 'authenticated' : 'upload',
          format: 'webp',
          resource_type: 'image',
        },
        (err, result) => {
          if (err) reject(err)
          else resolve(result)
        }
      )
      stream.end(processedBuffer)
    })

    const fileUrl = isPrivate ? `/api/v1/files/${key}` : uploadResult.secure_url

    try {
      if (Upload && typeof Upload.create === 'function') {
        await Upload.create({
          key,
          kind,
          ownerId: ownerId || null,
          attachedAt: null,
        })
      }
    } catch (e) {
      console.warn('[STORAGE] Failed to record upload:', e.message)
    }

    return {
      key,
      url: fileUrl,
      hash: fileHash,
      mime: 'image/webp',
      size: processedBuffer.length,
    }
  },

  /**
   * Streams a private file to an Express response with security headers.
   * If in-memory test driver: streams from memory buffer.
   * If Cloudinary: fetches the authenticated asset server-side using a signed URL.
   *
   * @param {string} key
   * @param {import('express').Response} res
   */
  async streamPrivate(key, res) {
    const isTest = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test'
    const driver = env.STORAGE_DRIVER || (isTest ? 'memory' : 'cloudinary')
    const safeKey = path.basename(key)

    if (driver === 'memory') {
      if (!isTest) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'LOCAL_STORAGE_PROHIBITED_IN_PRODUCTION',
            message: 'Memory storage driver is strictly test-only and requires NODE_ENV=test',
          },
        })
      }

      const item = memoryStore.get(safeKey)
      if (!item) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'File not found' },
        })
      }

      res.writeHead(200, {
        'Content-Length': item.size,
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      })
      res.end(item.buffer)
      return
    }

    // Cloudinary driver
    const filename = path.basename(safeKey, path.extname(safeKey))
    const kind = safeKey.startsWith('payment') ? 'payment' : safeKey.startsWith('avatar') ? 'avatar' : 'product'
    const publicId = `little_hands/${kind}/${filename}`
    const expiresAt = Math.floor(Date.now() / 1000) + 60

    let downloadUrl
    if (typeof cloudinary.utils?.private_download_url === 'function') {
      downloadUrl = cloudinary.utils.private_download_url(publicId, 'webp', {
        resource_type: 'image',
        type: 'authenticated',
        expires_at: expiresAt,
      })
    } else if (typeof cloudinary.url === 'function') {
      downloadUrl = cloudinary.url(publicId, {
        resource_type: 'image',
        type: 'authenticated',
        sign_url: true,
        expires_at: expiresAt,
        format: 'webp',
      })
    }

    try {
      const fetchRes = await fetch(downloadUrl)
      if (!fetchRes.ok) {
        return res.status(fetchRes.status === 404 ? 404 : 502).json({
          success: false,
          error: {
            code: fetchRes.status === 404 ? 'NOT_FOUND' : 'STORAGE_ERROR',
            message: 'Failed to retrieve asset from cloud storage',
          },
        })
      }

      res.writeHead(200, {
        'Content-Type': 'image/webp',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      })

      const arrayBuf = await fetchRes.arrayBuffer()
      res.end(Buffer.from(arrayBuf))
      return
    } catch (err) {
      if (!res.headersSent) {
        return res.status(502).json({
          success: false,
          error: { code: 'STORAGE_ERROR', message: err.message },
        })
      }
      return
    }
  },

  /**
   * Removes a file by key from Cloudinary (or in-memory driver) and MongoDB.
   *
   * @param {string} key
   */
  async remove(key) {
    const safeKey = path.basename(key)
    const isTest = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test'
    const driver = env.STORAGE_DRIVER || (isTest ? 'memory' : 'cloudinary')

    if (driver === 'memory') {
      memoryStore.delete(safeKey)
    } else if (driver === 'cloudinary') {
      const filename = path.basename(safeKey, path.extname(safeKey))
      const kind = safeKey.startsWith('payment') ? 'payment' : safeKey.startsWith('avatar') ? 'avatar' : 'product'
      const isPrivate = kind === 'payment'
      const publicId = `little_hands/${kind}/${filename}`

      try {
        await new Promise((resolve) => {
          cloudinary.uploader.destroy(
            publicId,
            { resource_type: 'image', type: isPrivate ? 'authenticated' : 'upload' },
            (err, result) => resolve(result)
          )
        })
      } catch (err) {
        console.warn('[STORAGE] Cloudinary destroy error:', err.message)
      }
    }

    try {
      if (Upload && typeof Upload.deleteOne === 'function') {
        await Upload.deleteOne({ key: safeKey })
      }
    } catch (e) {
      console.warn('[STORAGE] Failed to remove upload record:', e.message)
    }

    return { success: true }
  },

  /**
   * Marks uploads as permanently attached to an entity.
   *
   * @param {string[]} keys
   */
  async markAttached(keys = []) {
    if (!keys || keys.length === 0) return
    try {
      if (Upload && typeof Upload.updateMany === 'function') {
        const safeKeys = keys.map((k) => path.basename(k))
        await Upload.updateMany(
          { key: { $in: safeKeys } },
          { $set: { attachedAt: new Date() } }
        )
      }
    } catch (e) {
      console.warn('[STORAGE] Failed to markAttached:', e.message)
    }
  },
}

export default storage
