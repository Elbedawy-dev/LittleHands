/**
 * Wraps asynchronous Express route handlers to catch errors and pass them to next().
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export default asyncHandler

