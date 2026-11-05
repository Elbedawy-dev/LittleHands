import { ZodError } from 'zod'

/**
 * Validates request data against Zod schemas.
 * Accepts either:
 * - An object containing { body, query, params }
 * - A single Zod schema (defaults to validating req.body)
 *
 * @param {import('zod').ZodTypeAny|{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export function validate(schemas) {
  return async (req, res, next) => {
    try {
      if (schemas._def) {
        // Single schema passed, validate req.body
        req.body = await schemas.parseAsync(req.body)
      } else {
        // Multi-source schema object
        if (schemas.params) {
          req.params = await schemas.params.parseAsync(req.params)
        }
        if (schemas.query) {
          req.query = await schemas.query.parseAsync(req.query)
        }
        if (schemas.body) {
          req.body = await schemas.body.parseAsync(req.body)
        }
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return next(error)
      }
      next(error)
    }
  }
}

export default validate

