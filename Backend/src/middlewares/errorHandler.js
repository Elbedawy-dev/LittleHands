import { ZodError } from 'zod'
import { AppError } from '../utils/appError.js'
import { getErrorMessage } from '../config/messages.js'
import { env } from '../config/env.js'

export function errorHandler(err, req, res, _next) {
  let status = err.status || 500
  let code = err.code || 'INTERNAL_SERVER_ERROR'
  let details = err.details

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    status = 400
    code = 'VALIDATION_ERROR'
    details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
  }
  // 2. Mongoose Duplicate Key Error
  else if (err.code === 11000) {
    status = 409
    const key = Object.keys(err.keyPattern || {})[0]
    if (key === 'email') {
      code = 'EMAIL_EXISTS'
    } else if (key === 'phone') {
      code = 'PHONE_EXISTS'
    } else {
      code = 'CONFLICT'
    }
  }
  // 3. Mongoose Validation Error
  else if (err.name === 'ValidationError') {
    status = 400
    code = 'VALIDATION_ERROR'
    details = Object.values(err.errors || {}).map((e) => ({
      path: e.path,
      message: e.message,
    }))
  }
  // 4. Mongoose Cast Error (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    status = 400
    code = 'VALIDATION_ERROR'
    details = [{ path: err.path, message: `Invalid identifier format: ${err.value}` }]
  }
  // 5. Multer File Upload Errors
  else if (err.name === 'MulterError') {
    status = 400
    if (err.code === 'LIMIT_FILE_SIZE') {
      code = 'FILE_TOO_LARGE'
    } else {
      code = 'INVALID_FILE_TYPE'
    }
  }
  // 6. JSON parse body error
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    status = 400
    code = 'VALIDATION_ERROR'
    details = [{ message: 'Malformed JSON payload' }]
  }
  // 7. Standard AppError
  else if (err instanceof AppError) {
    status = err.status
    code = err.code
    details = err.details
  }

  // Determine language preference
  const lang = req.headers?.['accept-language'] || req.user?.locale || 'ar'
  const message = getErrorMessage(code, lang)

  const errorResponse = {
    code,
    message,
  }

  if (details !== undefined && details !== null) {
    errorResponse.details = details
  }

  // In development, log full stack if it's a 500 error
  if (status >= 500 && env.NODE_ENV !== 'test') {
    console.error(`[SERVER_ERROR] ${req.method} ${req.originalUrl}:`, err)
  }

  return res.status(status).json({
    success: false,
    error: errorResponse,
  })
}

export default errorHandler

