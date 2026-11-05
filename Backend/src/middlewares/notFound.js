import { AppError } from '../utils/appError.js'

export function notFound(req, res, next) {
  next(new AppError('NOT_FOUND', 404, `Route ${req.method} ${req.originalUrl} not found`))
}

export default notFound

