/**
 * Standard API response envelope helpers
 * Success: { success: true, data, meta? }
 * Lists: data = { items, total, page, pageSize, totalPages }
 */

export function ok(res, data, meta) {
  const payload = { success: true, data }
  if (meta !== undefined) {
    payload.meta = meta
  }
  return res.status(200).json(payload)
}

export function created(res, data, meta) {
  const payload = { success: true, data }
  if (meta !== undefined) {
    payload.meta = meta
  }
  return res.status(201).json(payload)
}

export function paginated(res, { items, total, page, pageSize }, meta) {
  const totalPages = Math.ceil(total / pageSize) || 1
  const payload = {
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages,
    },
  }
  if (meta !== undefined) {
    payload.meta = meta
  }
  return res.status(200).json(payload)
}

export default { ok, created, paginated }

