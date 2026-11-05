import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cookieParser from 'cookie-parser'
import { requestId } from './middlewares/requestId.js'
import { httpLogger } from './middlewares/logger.js'
import { helmetMiddleware, corsMiddleware } from './middlewares/security.js'
import { sanitize } from './middlewares/sanitize.js'
import { globalLimiter } from './middlewares/rateLimiter.js'
import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'
import apiRouter from './routes/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../')
const publicStorageDir = path.join(rootDir, 'storage/public')

/**
 * Express Application Factory
 * Used both for the running server and integration test suites.
 */
export function createApp() {
  const app = express()

  // Trust proxy for secure cookies and rate-limiting behind reverse proxies
  app.set('trust proxy', 1)

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

  // 5. Static Public Storage
  app.use('/storage/public', express.static(publicStorageDir))

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
