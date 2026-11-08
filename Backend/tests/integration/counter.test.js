import { describe, it, expect, beforeEach } from 'vitest'
import { nextOrderNumber, Counter } from '../../src/db/models/index.js'

describe('Order Number Generation & Concurrency', () => {
  beforeEach(async () => {
    await Counter.syncIndexes()
  })

  it('generates sequential order numbers in format LH-{year}-{seq padded to 3}', async () => {
    const orderNum1 = await nextOrderNumber(2026)
    const orderNum2 = await nextOrderNumber(2026)

    expect(orderNum1).toBe('LH-2026-001')
    expect(orderNum2).toBe('LH-2026-002')
  })

  it('guarantees unique and non-overlapping order numbers under high concurrency', async () => {
    const concurrentRequests = 25
    const promises = Array.from({ length: concurrentRequests }, () => nextOrderNumber(2027))

    const results = await Promise.all(promises)

    // Ensure all 25 numbers are strictly unique
    const uniqueResults = new Set(results)
    expect(uniqueResults.size).toBe(concurrentRequests)

    // Verify format for every generated order number
    results.forEach((num) => {
      expect(num).toMatch(/^LH-2027-\d{3}$/)
    })
  })
})

