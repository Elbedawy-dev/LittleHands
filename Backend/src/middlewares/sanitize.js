import { AppError } from '../utils/appError.js'

function containsProhibitedKeys(obj) {
  if (!obj || typeof obj !== 'object') return false

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      return true
    }
    const val = obj[key]
    if (typeof val === 'object' && val !== null) {
      if (containsProhibitedKeys(val)) {
        return true
      }
    }
  }

  return false
}

/**
 * Global sanitizer rejecting any request where body, query, or params
 * contains keys starting with '$' or containing '.' (NoSQL injection vectors).
 */
export function sanitize(req, res, next) {
  if (
    containsProhibitedKeys(req.body) ||
    containsProhibitedKeys(req.query) ||
    containsProhibitedKeys(req.params)
  ) {
    return next(
      new AppError('VALIDATION_ERROR', 400, {
        message: 'Request contains prohibited parameter keys for database security',
      })
    )
  }

  next()
}

export default sanitize

