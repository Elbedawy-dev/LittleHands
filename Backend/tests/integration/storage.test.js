import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
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
    expect(result.url).toBe(`/storage/public/${result.key}`)

    // Verify physical file was written to public storage
    const savedPath = path.join(storage.PUBLIC_DIR, result.key)
    expect(fs.existsSync(savedPath)).toBe(true)

    // Inspect processed image with sharp to verify format and EXIF stripping
    const savedBuffer = await fs.promises.readFile(savedPath)
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
    expect(fs.existsSync(savedPath)).toBe(false)
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
    const privPath = path.join(storage.PRIVATE_DIR, result.key)
    expect(fs.existsSync(privPath)).toBe(true)

    // Mock Express Response to test streamPrivate
    const headers = {}
    let statusCode = 200
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
      end() {},
    }

    const stream = storage.streamPrivate(result.key, mockRes)
    expect(statusCode).toBe(200)
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Cache-Control']).toContain('private')
    expect(headers['Content-Type']).toBe('image/webp')

    if (stream) {
      await new Promise((resolve) => {
        stream.on('open', resolve)
        stream.on('error', resolve)
      })
      stream.destroy()
    }

    await new Promise((r) => setTimeout(r, 50))

    // Clean up
    await storage.remove(result.key)
    expect(fs.existsSync(privPath)).toBe(false)
  })

  it('streamPrivate returns 404 when file does not exist', () => {
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

    storage.streamPrivate('non_existent_key_12345.webp', mockRes)
    expect(statusCode).toBe(404)
    expect(jsonBody.error.code).toBe('NOT_FOUND')
  })
})
