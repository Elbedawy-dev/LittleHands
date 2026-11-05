/**
 * Helper to parse and sanitize pagination parameters.
 * Default page: 1, default pageSize: 12, max pageSize: 100.
 */
export function getPagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || 12))
  const skip = (page - 1) * pageSize
  const limit = pageSize

  return {
    page,
    pageSize,
    skip,
    limit,
    toResponse(items, total) {
      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      }
    },
  }
}

