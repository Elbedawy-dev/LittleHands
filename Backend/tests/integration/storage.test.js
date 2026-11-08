import { describe, it, expect, beforeEach } from 'vitest'
import sharp from 'sharp'
import { env } from '../../src/config/env.js'
import { storage } from '../../src/infra/storage/index.js'
import { Upload } from '../../src/db/models/Upload.js'
import { sha256 } from '../../src/utils/crypto.js'

describe('Storage Subsystem', () => {
  beforeEach(async () => {
    // cleanup
  })

  it('rejects fake images (text files with image extensions)', async () => {
    const fakeFile = {
      buffer: Buffer.from('Fake image content. This is a text string disguised as PNG.'),
      originalname: 'picture.png',
      mimetype: 'image/png',
      size: 58,
    }

    await expect(storage.saveImage(fakeFile, { kind: 'product' })).rejects.toThrow()
  })

  it('rejects oversized files exceeding 5MB', async () => {
    // Create a 5.1MB dummy buffer
    const largeBuffer = Buffer.alloc(5.1 * 1024 * 1024)
    const largeFile = {
      buffer: largeBuffer,
      originalname: 'large.jpg',
      mimetype: 'image/jpeg',
      size: largeBuffer.length,
    }

    await expect(storage.saveImage(largeFile, { kind: 'product' })).rejects.toThrow()
  })

  it('processes valid image with sharp, strips EXIF, converts to webp, and records Upload', async () => {
    // Generate valid 100x100 PNG image buffer with sharp
    const validPngBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 138, b: 61 },
      },
    })
      .png()
      .toBuffer()

    const originalHash = sha256(validPngBuffer)
    const file = {
      buffer: validPngBuffer,
      originalname: 'test_product.png',
      mimetype: 'image/png',
      size: validPngBuffer.length,
    }

    const result = await storage.saveImage(file, { kind: 'product' })

    expect(result.key).toMatch(/^product_\d+_[a-f0-9]+\.webp$/)
    expect(result.mime).toBe('image/webp')
    expect(result.hash).toBe(originalHash)
    expect(result.url).toBe(`/test-memory/${result.key}`)

    // Verify file was written to in-memory storage
    expect(storage.hasInMemory(result.key)).toBe(true)

    // Inspect processed image with sharp to verify format and EXIF stripping
    const savedBuffer = storage.getInMemory(result.key).buffer
    const metadata = await sharp(savedBuffer).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.exif).toBeUndefined()

    // Verify DB record
    const uploadDoc = await Upload.findOne({ key: result.key })
    expect(uploadDoc).toBeDefined()
    expect(uploadDoc.kind).toBe('product')
    expect(uploadDoc.attachedAt).toBeNull()

    // Clean up
    await storage.remove(result.key)
    expect(storage.hasInMemory(result.key)).toBe(false)
  })

  it('marks uploads as attached in database', async () => {
    const validPngBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 10, g: 100, b: 200 },
      },
    })
      .png()
      .toBuffer()

    const res1 = await storage.saveImage({ buffer: validPngBuffer, originalname: 'p1.png' }, { kind: 'product' })
    const res2 = await storage.saveImage({ buffer: validPngBuffer, originalname: 'p2.png' }, { kind: 'product' })

    await storage.markAttached([res1.key, res2.key])

    const doc1 = await Upload.findOne({ key: res1.key })
    const doc2 = await Upload.findOne({ key: res2.key })

    expect(doc1.attachedAt).toBeInstanceOf(Date)
    expect(doc2.attachedAt).toBeInstanceOf(Date)

    // Clean up
    await storage.remove(res1.key)
    await storage.remove(res2.key)
  })

  it('stores payment receipts in private directory and streamPrivate sets security headers', async () => {
    const validPngBuffer = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 3,
        background: { r: 0, g: 180, b: 100 },
      },
    })
      .png()
      .toBuffer()

    const result = await storage.saveImage(
      { buffer: validPngBuffer, originalname: 'receipt.png' },
      { kind: 'payment' }
    )

    expect(result.url).toBe(`/api/v1/files/${result.key}`)
    expect(storage.hasInMemory(result.key)).toBe(true)

    // Mock Express Response to test streamPrivate
    const headers = {}
    let statusCode = 200
    let endedBuffer = null
    const mockRes = {
      writeHead(code, h) {
        statusCode = code
        Object.assign(headers, h)
      },
      status(code) {
        statusCode = code
        return this
      },
      json(body) {
        this.body = body
        return this
      },
      on() { return this },
      once() { return this },
      emit() { return this },
      write() { return true },
      end(data) {
        endedBuffer = data
      },
    }

    await storage.streamPrivate(result.key, mockRes)
    expect(statusCode).toBe(200)
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Cache-Control']).toContain('private')
    expect(headers['Content-Type']).toBe('image/webp')
    expect(Buffer.isBuffer(endedBuffer)).toBe(true)

    // Clean up
    await storage.remove(result.key)
    expect(storage.hasInMemory(result.key)).toBe(false)
  })

  it('streamPrivate returns 404 when file does not exist', async () => {
    let statusCode = 200
    let jsonBody = null
    const mockRes = {
      status(code) {
        statusCode = code
        return this
      },
      json(body) {
        jsonBody = body
        return this
      },
    }

    await storage.streamPrivate('non_existent_key_12345.webp', mockRes)
    expect(statusCode).toBe(404)
    expect(jsonBody.error.code).toBe('NOT_FOUND')
  })

  it('prohibits local storage driver in production environment', async () => {
    const originalEnv = env.NODE_ENV
    env.NODE_ENV = 'production'
    process.env.NODE_ENV = 'production'

    const validPngBuffer = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).png().toBuffer()

    try {
      await expect(
        storage.saveImage({ buffer: validPngBuffer, originalname: 'test.png' }, { kind: 'product' })
      ).rejects.toThrow(/LOCAL_STORAGE_PROHIBITED_IN_PRODUCTION/)
    } finally {
      env.NODE_ENV = originalEnv
      process.env.NODE_ENV = originalEnv
    }
  })

  it('supports private payment screenshots with Cloudinary driver and server-side signed streaming', async () => {
    const { v2: cloudinary } = await import('cloudinary')
    const originalDriver = env.STORAGE_DRIVER
    env.STORAGE_DRIVER = 'cloudinary'

    let uploadStreamCalled = false
    let uploadStreamOpts = null
    let destroyCalled = false
    let destroyOpts = null

    // Mock Cloudinary upload_stream and utils
    const origUploadStream = cloudinary.uploader.upload_stream
    const origDestroy = cloudinary.uploader.destroy
    const origPrivateUrl = cloudinary.utils.private_download_url

    cloudinary.uploader.upload_stream = (options, callback) => {
      uploadStreamCalled = true
      uploadStreamOpts = options
      // We can use a simple custom EventEmitter / stream
      const mockStream = {
        end(_data) {
          callback(null, {
            secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.webp',
            public_id: options.public_id,
          })
        },
      }
      return mockStream
    }

    cloudinary.uploader.destroy = (publicId, options, callback) => {
      destroyCalled = true
      destroyOpts = { publicId, options }
      callback(null, { result: 'ok' })
    }

    cloudinary.utils.private_download_url = (publicId, format, _options) => {
      return `https://res.cloudinary.com/signed-url-test/${publicId}.${format}?sig=test`
    }

    // Mock global fetch
    const originalFetch = global.fetch
    const dummyImageBytes = Buffer.from('mock_cloudinary_image_bytes')
    global.fetch = async (url) => {
      expect(url).toContain('https://res.cloudinary.com/signed-url-test/')
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => dummyImageBytes.buffer,
      }
    }

    try {
      const validPngBuffer = await sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 50, g: 60, b: 70 } },
      }).png().toBuffer()

      // 1. saveImage creates authenticated private asset
      const saved = await storage.saveImage(
        { buffer: validPngBuffer, originalname: 'receipt.png' },
        { kind: 'payment' }
      )

      expect(uploadStreamCalled).toBe(true)
      expect(uploadStreamOpts.type).toBe('authenticated')
      expect(uploadStreamOpts.folder).toBe('little_hands/payment')
      // Client gets internal route, NEVER a direct Cloudinary URL
      expect(saved.url).toBe(`/api/v1/files/${saved.key}`)

      // 2. streamPrivate fetches server-side and pipes to response
      let statusCode = 200
      let headers = {}
      let endedData = null
      const mockRes = {
        writeHead(code, h) {
          statusCode = code
          headers = h
        },
        end(data) {
          endedData = data
        },
        status(c) {
          statusCode = c
          return this
        },
        json(b) {
          return b
        },
      }

      await storage.streamPrivate(saved.key, mockRes)
      expect(statusCode).toBe(200)
      expect(headers['Content-Type']).toBe('image/webp')
      expect(headers['Cache-Control']).toContain('private')
      expect(Buffer.isBuffer(endedData)).toBe(true)

      // 3. remove calls destroy on Cloudinary
      await storage.remove(saved.key)
      expect(destroyCalled).toBe(true)
      expect(destroyOpts.options.type).toBe('authenticated')
    } finally {
      // Restore
      env.STORAGE_DRIVER = originalDriver
      cloudinary.uploader.upload_stream = origUploadStream
      cloudinary.uploader.destroy = origDestroy
      cloudinary.utils.private_download_url = origPrivateUrl
      global.fetch = originalFetch
    }
  })
})
