/**
 * Pure helper computing stock availability status and quantity bounds for a product DTO.
 * Keeps UI copy strictly inside translation files (storefront / common).
 *
 * @param {object|null|undefined} product
 * @returns {{ stockCount: number|null, isOutOfStock: boolean, isLowStock: boolean, maxOrderQty: number, status: 'out'|'low'|'in' }}
 */
export function getProductStockMeta(product) {
  const rawStock = product?.stockCount ?? product?.stock
  const hasExplicitStock = rawStock !== undefined && rawStock !== null && rawStock !== ''
  const parsed = hasExplicitStock ? Number(rawStock) : NaN
  const stockCount =
    hasExplicitStock && Number.isFinite(parsed)
      ? Math.max(0, Math.floor(parsed))
      : product?.inStock === false
        ? 0
        : null

  const isOutOfStock = product?.inStock === false || stockCount === 0
  const isLowStock = !isOutOfStock && stockCount !== null && stockCount <= 3
  const maxOrderQty = stockCount !== null && stockCount > 0 ? stockCount : 50
  const status = isOutOfStock ? 'out' : isLowStock ? 'low' : 'in'

  return {
    stockCount,
    isOutOfStock,
    isLowStock,
    maxOrderQty,
    status,
  }
}
