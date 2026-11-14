import assert from 'node:assert/strict'
import test from 'node:test'
import { getProductStockMeta } from '../src/utils/productStock.js'

test('getProductStockMeta identifies out-of-stock products from stockCount=0 or inStock=false', () => {
  assert.deepEqual(getProductStockMeta({ stockCount: 0, inStock: true }), {
    stockCount: 0,
    isOutOfStock: true,
    isLowStock: false,
    maxOrderQty: 50,
    status: 'out',
  })

  assert.deepEqual(getProductStockMeta({ stock: 4, inStock: false }), {
    stockCount: 4,
    isOutOfStock: true,
    isLowStock: false,
    maxOrderQty: 4,
    status: 'out',
  })
})

test('getProductStockMeta identifies low stock when 1 <= stockCount <= 3', () => {
  const meta = getProductStockMeta({ stockCount: 3, inStock: true })
  assert.equal(meta.status, 'low')
  assert.equal(meta.isLowStock, true)
  assert.equal(meta.isOutOfStock, false)
  assert.equal(meta.maxOrderQty, 3)
})

test('getProductStockMeta identifies normal in-stock when stockCount > 3 and handles missing counts', () => {
  const stocked = getProductStockMeta({ stock: 12 })
  assert.equal(stocked.status, 'in')
  assert.equal(stocked.isLowStock, false)
  assert.equal(stocked.isOutOfStock, false)
  assert.equal(stocked.maxOrderQty, 12)

  const fallback = getProductStockMeta({ inStock: true })
  assert.equal(fallback.status, 'in')
  assert.equal(fallback.stockCount, null)
  assert.equal(fallback.maxOrderQty, 50)
})
