import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countProductsBySeller,
  filterProductsBySeller,
  getProductSellerId,
} from '../src/utils/productHelpers.js'

test('getProductSellerId resolves string, populated object, and nested seller.id shapes', () => {
  assert.equal(getProductSellerId({ id: 'p1', sellerId: 's1' }), 's1')
  assert.equal(getProductSellerId({ id: 'p2', sellerId: { id: 's2', name: 'Amina' } }), 's2')
  assert.equal(getProductSellerId({ id: 'p3', sellerId: { _id: 's3', name: 'Nour' } }), 's3')
  assert.equal(getProductSellerId({ id: 'p4', seller: { id: 's4' } }), 's4')
  assert.equal(
    getProductSellerId({ id: 'p5', sellerId: '[object Object]', seller: { id: 's5' } }),
    's5'
  )
  assert.equal(getProductSellerId(null), '')
  assert.equal(getProductSellerId({}), '')
})

test('countProductsBySeller computes accurate per-seller counts and matching total', () => {
  const mixedProducts = [
    { id: '1', sellerId: 'seller-a' },
    { id: '2', sellerId: { id: 'seller-a', name: 'A' } },
    { id: '3', seller: { id: 'seller-b' } },
    { id: '4', sellerId: { _id: 'seller-b' } },
    { id: '5', sellerId: '[object Object]', seller: { id: 'seller-a' } },
  ]

  const counts = countProductsBySeller(mixedProducts)
  assert.equal(counts.all, 5)
  assert.equal(counts['seller-a'], 3)
  assert.equal(counts['seller-b'], 2)
  assert.equal(counts['seller-a'] + counts['seller-b'], counts.all)
})

test('filterProductsBySeller filters accurately across heterogeneous DTO shapes', () => {
  const mixedProducts = [
    { id: '1', sellerId: 'seller-a' },
    { id: '2', seller: { id: 'seller-b' } },
    { id: '3', sellerId: { _id: 'seller-a' } },
  ]

  assert.equal(filterProductsBySeller(mixedProducts, 'all').length, 3)
  assert.deepEqual(
    filterProductsBySeller(mixedProducts, 'seller-a').map((p) => p.id),
    ['1', '3']
  )
  assert.deepEqual(
    filterProductsBySeller(mixedProducts, 'seller-b').map((p) => p.id),
    ['2']
  )
})
