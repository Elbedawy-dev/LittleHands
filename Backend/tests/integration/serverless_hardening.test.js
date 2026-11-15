import { describe, it, expect, vi, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createApp, requestTimeoutMiddleware } from '../../src/app.js'
import { errorHandler } from '../../src/middlewares/errorHandler.js'
import { ok } from '../../src/utils/response.js'
import {
  GLOBAL_LIMITER_MAX,
  createGlobalLimiter,
  authLimiter,
  passwordResetLimiter,
  otpLimiter,
} from '../../src/middlewares/rateLimiter.js'

describe('Backend Serverless Hardening, Timeouts, DB Pool & Rate Limiter (A6)', () => {
  afterEach(() => {
    vi.doUnmock('../../src/db/connection.js')
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('responds immediately on GET / with { success: true, name: "Little Hands API" }', async () => {
    const app = createApp()
    const res = await request(app).get('/')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      success: true,
      name: 'Little Hands API',
    })
  })

  it('returns 503 JSON quickly when request exceeds timeout middleware without crashing on late completion', async () => {
    const testApp = express()
    testApp.use(requestTimeoutMiddleware(40))
    testApp.get('/slow', async (_req, res) => {
      await new Promise((r) => setTimeout(r, 90))
      return ok(res, { delayed: true })
    })
    testApp.use(errorHandler)

    const res = await request(testApp).get('/slow')
    expect(res.status).toBe(503)
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
      },
    })

    // Allow delayed handler to finish and ensure guarded response helpers don't throw
    await new Promise((r) => setTimeout(r, 80))
  })

  it('api/index.js returns GET / without DB wait and returns 503 JSON quickly when DB connection fails', async () => {
    vi.resetModules()
    const connectDBMock = vi.fn().mockRejectedValue(new Error('Atlas unreachable'))
    vi.doMock('../../src/db/connection.js', () => ({
      connectDB: connectDBMock,
      disconnectDB: vi.fn(),
      default: { connectDB: connectDBMock, disconnectDB: vi.fn() },
    }))

    const { default: handler } = await import('../../api/index.js')

    const makeMockRes = () => {
      const res = {
        statusCode: 200,
        headers: {},
        headersSent: false,
        writableEnded: false,
        body: null,
        setHeader(k, v) {
          this.headers[k.toLowerCase()] = v
        },
        getHeader(k) {
          return this.headers[k.toLowerCase()]
        },
        removeHeader(k) {
          delete this.headers[k.toLowerCase()]
        },
        status(code) {
          this.statusCode = code
          return this
        },
        json(payload) {
          this.body = payload
          this.headersSent = true
          this.writableEnded = true
          return this
        },
        end(chunk) {
          if (chunk && !this.body) {
            try {
              this.body = JSON.parse(chunk.toString())
            } catch {
              this.body = chunk.toString()
            }
          }
          this.headersSent = true
          this.writableEnded = true
        },
      }
      return res
    }

    // 1. Root GET / bypasses DB wait cleanly
    const rootRes = await request(createApp()).get('/')
    expect(rootRes.status).toBe(200)

    const mockReq = {
      method: 'GET',
      url: '/api/v1/products',
      headers: {},
      connection: {},
      socket: {},
    }
    const mockRes = makeMockRes()
    await handler(mockReq, mockRes)

    expect(connectDBMock).toHaveBeenCalledTimes(1)
    expect(mockRes.statusCode).toBe(503)
    expect(mockRes.body).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connection unavailable',
      },
    })
  })

  it('caches in-flight DB connection promise, sets Atlas timeouts & pool size, and resets on error', async () => {
    vi.resetModules()
    let resolveConnect
    let rejectNext = false
    const connectSpy = vi.fn().mockImplementation(() => {
      if (rejectNext) return Promise.reject(new Error('Transient failure'))
      return new Promise((res) => {
        resolveConnect = () => res({ readyState: 1 })
      })
    })
    const fakeConnection = { readyState: 0 }
    const fakeMongoose = {
      connection: fakeConnection,
      connect: connectSpy,
      disconnect: vi.fn(),
    }

    const { connectDB, disconnectDB } = await vi.importActual('../../src/db/connection.js')
    await disconnectDB(fakeMongoose)

    // Concurrent calls reuse single in-flight connect promise
    const p1 = connectDB('mongodb://127.0.0.1:27017/test', fakeMongoose)
    const p2 = connectDB('mongodb://127.0.0.1:27017/test', fakeMongoose)
    expect(connectSpy).toHaveBeenCalledTimes(1)
    expect(connectSpy).toHaveBeenCalledWith(
      'mongodb://127.0.0.1:27017/test',
      expect.objectContaining({
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
    )

    fakeConnection.readyState = 1
    resolveConnect()
    await Promise.all([p1, p2])

    // Subsequent call when disconnected fails -> clears cache so retry succeeds
    await disconnectDB(fakeMongoose)
    fakeConnection.readyState = 0
    rejectNext = true
    await expect(connectDB('mongodb://127.0.0.1:27017/test', fakeMongoose)).rejects.toThrow('Transient failure')

    rejectNext = false
    const p3 = connectDB('mongodb://127.0.0.1:27017/test', fakeMongoose)
    expect(connectSpy).toHaveBeenCalledTimes(3)
    fakeConnection.readyState = 1
    resolveConnect()
    await p3

    // Already connected -> reuses active connection without calling mongoose.connect again
    await connectDB('mongodb://127.0.0.1:27017/test', fakeMongoose)
    expect(connectSpy).toHaveBeenCalledTimes(3)
  })

  it('raises global rate limit to 600, skips polling GET endpoints, and keeps strict auth limiters', async () => {
    expect(GLOBAL_LIMITER_MAX).toBe(600)
    expect(authLimiter).toBeTypeOf('function')
    expect(passwordResetLimiter).toBeTypeOf('function')
    expect(otpLimiter).toBeTypeOf('function')

    const app = express()
    app.use('/api', createGlobalLimiter({ max: 2, forceProdLimit: true }))
    app.get('/api/v1/notifications/unread-count', (_req, res) => res.json({ ok: true }))
    app.get('/api/v1/settings/public', (_req, res) => res.json({ ok: true }))
    app.get('/api/v1/auth/me', (_req, res) => res.json({ ok: true }))
    app.get('/api/v1/catalog/products', (_req, res) => res.json({ ok: true }))
    app.use(errorHandler)

    // Excluded GET endpoints must never be rate-limited even beyond max=2
    for (let i = 0; i < 5; i++) {
      expect((await request(app).get('/api/v1/notifications/unread-count?t=1')).status).toBe(200)
      expect((await request(app).get('/api/v1/settings/public')).status).toBe(200)
      expect((await request(app).get('/api/v1/auth/me')).status).toBe(200)
    }

    // Normal endpoint enforces max=2 -> 3rd returns 429
    expect((await request(app).get('/api/v1/catalog/products')).status).toBe(200)
    expect((await request(app).get('/api/v1/catalog/products')).status).toBe(200)
    expect((await request(app).get('/api/v1/catalog/products')).status).toBe(429)
  })
})
