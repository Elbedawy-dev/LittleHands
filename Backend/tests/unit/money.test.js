import { describe, it, expect } from 'vitest'
import { toPiasters, fromPiasters, calcCommission, sum } from '../../src/utils/money.js'

describe('Money Utilities (Piasters Integer Calculations)', () => {
  it('accurately converts EGP to piasters and back', () => {
    expect(toPiasters(100)).toBe(10000)
    expect(toPiasters(33.5)).toBe(3350)
    expect(fromPiasters(10000)).toBe(100)
    expect(fromPiasters(3350)).toBe(33.5)
  })

  it('calculates 100 EGP at 20% commission -> 20 EGP platform, 80 EGP net', () => {
    const result = calcCommission(100, 0.20)
    expect(result.commission).toBe(20)
    expect(result.net).toBe(80)
    expect(result.commission + result.net).toBe(100)
  })

  it('calculates 465 EGP at 20% commission -> 93 EGP platform, 372 EGP net', () => {
    const result = calcCommission(465, 0.20)
    expect(result.commission).toBe(93)
    expect(result.net).toBe(372)
    expect(result.commission + result.net).toBe(465)
  })

  it('calculates 33 EGP at 20% commission -> 6.6 EGP platform, 26.4 EGP net (round-half-up)', () => {
    const result = calcCommission(33, 0.20)
    expect(result.commission).toBe(6.6)
    expect(result.net).toBe(26.4)
    expect(result.commission + result.net).toBe(33)
  })

  it('accurately sums multiple decimal amounts without float precision drift', () => {
    expect(sum(0.1, 0.2)).toBe(0.3)
    expect(sum(100, 465, 33)).toBe(598)
    expect(sum(20.55, 10.45)).toBe(31)
  })
})

