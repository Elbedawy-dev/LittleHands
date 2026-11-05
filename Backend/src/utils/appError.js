/**
 * Custom Operational Application Error class
 */
export class AppError extends Error {
  /**
   * @param {string} code - Stable UPPER_SNAKE error code (e.g. 'VALIDATION_ERROR')
   * @param {number} status - HTTP status code (default 400)
   * @param {any} [details] - Optional extra error details
   */
  constructor(code, status = 400, details = undefined) {
    super(code)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export default AppError

