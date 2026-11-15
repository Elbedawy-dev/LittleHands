import express from 'express'
import cookieParser from 'cookie-parser'
import { requestId } from './middlewares/requestId.js'
import { httpLogger } from './middlewares/logger.js'
import { helmetMiddleware, corsMiddleware } from './middlewares/security.js'
import { sanitize } from './middlewares/sanitize.js'
import { globalLimiter } from './middlewares/rateLimiter.js'
import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'
import apiRouter from './routes/index.js'

export function requestTimeoutMiddleware(timeoutMs = 25000) {
  return (req, res, next) => {
    if (!timeoutMs || timeoutMs <= 0) return next()

    let timedOut = false
    const timer = setTimeout(() => {
      if (timedOut || res.headersSent || res.writableEnded) return
      timedOut = true
      req.timedOut = true
      res.status(503).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timed out',
        },
      })
    }, timeoutMs)

    if (typeof timer.unref === 'function') timer.unref()

    const cleanup = () => {
      clearTimeout(timer)
    }
    res.on('finish', cleanup)
    res.on('close', cleanup)

    next()
  }
}

/**
 * Express Application Factory
 * Used both for the running server and integration test suites.
 */
export function createApp({ requestTimeoutMs = 25000 } = {}) {
  const app = express()

  // Trust proxy for secure cookies and rate-limiting behind reverse proxies
  app.set('trust proxy', 1)

  // 0. Request Timeout Guard (default 25s -> 503 JSON)
  app.use(requestTimeoutMiddleware(requestTimeoutMs))

  // 1. Request ID tracking & Logging
  app.use(requestId)
  app.use(httpLogger)

  // 2. Security Headers & CORS
  app.use(helmetMiddleware)
  app.use(corsMiddleware)

  // 3. Cookie Parser & Body Parsers with 1MB limit
  app.use(cookieParser())
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // 4. Global NoSQL Injection Sanitizer
  app.use(sanitize)

  // Instant root response for Vercel / uptime probes (no DB needed)
  app.get('/', (_req, res) => {
    res.status(200).json({ success: true, name: 'Little Hands API' })
  })

  // Root health redirect for developer convenience
  app.get('/health', (req, res) => {
    res.redirect('/api/v1/health')
  })

  // 6. Global API Rate Limiter
  app.use('/api', globalLimiter)

  // 7. Mount Primary API Router
  app.use('/api/v1', apiRouter)

  // 8. 404 Catch-All Handler
  app.use(notFound)

  // 9. Central Error Handler
  app.use(errorHandler)

  return app
}

export default createApp
