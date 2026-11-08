import helmet from 'helmet'
import cors from 'cors'
import { env } from '../config/env.js'
import { AppError } from '../utils/appError.js'

export const helmetMiddleware = helmet({
  contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts:
    env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
})

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow tools, curl, and server-to-server requests with no origin
    if (!origin) return callback(null, true)

    if (env.CLIENT_ORIGINS_ARRAY.includes(origin)) {
      return callback(null, true)
    }

    return callback(new AppError('CSRF_ERROR', 403, 'Origin not permitted by CORS policy'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Id',
    'Accept-Language',
    'Idempotency-Key',
  ],
  exposedHeaders: ['X-Request-Id'],
})

export default { helmetMiddleware, corsMiddleware }

