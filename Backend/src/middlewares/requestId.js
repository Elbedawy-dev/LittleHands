import crypto from 'node:crypto'

/**
 * Assigns a unique X-Request-Id to every incoming request.
 */
export function requestId(req, res, next) {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID()
  req.id = reqId
  res.setHeader('X-Request-Id', reqId)
  next()
}

export default requestId

