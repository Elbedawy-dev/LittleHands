import pino from 'pino'
import pinoHttp from 'pino-http'
import { env } from '../config/env.js'

export const logger = pino({
  level: env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-access-token"]',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      'token',
      '*.token',
      'code',
      '*.code',
      'codeHash',
      'tokenHash',
    ],
    censor: '[REDACTED]',
  },
})

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.id || req.headers['x-request-id'],
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  autoLogging: env.NODE_ENV !== 'test', // Quiet in tests
})

export default httpLogger

