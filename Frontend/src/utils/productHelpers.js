/**
 * Extract normalized seller ID string from heterogeneous product shapes:
 * - `product.sellerId` as string
 * - `product.sellerId` as populated object `{ id | _id }`
 * - `product.seller` as nested DTO `{ id | _id }`
 *
 * @param {object|null|undefined} product
 * @returns {string}
 */
function extractIdValue(val) {
  if (!val) return ''
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed && trimmed !== '[object Object]' ? trimmed : ''
  }
  if (typeof val === 'object') {
    const nested = val.id || val._id
    if (nested) return extractIdValue(nested)
    if (typeof val.toString === 'function') {
      const str = val.toString()
      return str && str !== '[object Object]' ? str : ''
    }
  }
  return ''
}

export function getProductSellerId(product) {
  if (!product || typeof product !== 'object') return ''
  return extractIdValue(product.sellerId) || extractIdValue(product.seller)
}

/**
 * Compute per-seller and total product counts for filter tabs.
 *
 * @param {Array<object>} products
 * @returns {{ all: number, [sellerId: string]: number }}
 */
export function countProductsBySeller(products = []) {
  const list = Array.isArray(products) ? products : []
  const counts = { all: list.length }
  list.forEach((product) => {
    const sid = getProductSellerId(product)
    if (sid) {
      counts[sid] = (counts[sid] || 0) + 1
    }
  })
  return counts
}

/**
 * Filter products list by selected seller tab ID ('all' returns all).
 *
 * @param {Array<object>} products
 * @param {string} [selectedSeller='all']
 * @returns {Array<object>}
 */
export function filterProductsBySeller(products = [], selectedSeller = 'all') {
  const list = Array.isArray(products) ? products : []
  if (!selectedSeller || selectedSeller === 'all') return list
  const targetId = String(selectedSeller)
  return list.filter((product) => getProductSellerId(product) === targetId)
}
