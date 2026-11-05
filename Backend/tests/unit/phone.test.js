import { describe, it, expect } from 'vitest'
import { normalizeEgyptianPhone, isValidEgyptianPhone } from '../../src/utils/phone.js'

describe('Egyptian Phone Normalization and Validation', () => {
  it('normalizes various mobile number formats', () => {
    expect(normalizeEgyptianPhone('+201012345678')).toBe('01012345678')
    expect(normalizeEgyptianPhone('00201123456789')).toBe('01123456789')
    expect(normalizeEgyptianPhone('201234567890')).toBe('01234567890')
    expect(normalizeEgyptianPhone('015-1234-5678')).toBe('01512345678')
    expect(normalizeEgyptianPhone('1012345678')).toBe('01012345678')
  })

  it('validates correct Egyptian telecom networks (010, 011, 012, 015)', () => {
    expect(isValidEgyptianPhone('01012345678')).toBe(true)
    expect(isValidEgyptianPhone('01123456789')).toBe(true)
    expect(isValidEgyptianPhone('01234567890')).toBe(true)
    expect(isValidEgyptianPhone('01512345678')).toBe(true)
  })

  it('rejects invalid phones', () => {
    expect(isValidEgyptianPhone('01312345678')).toBe(false) // 013 is landline
    expect(isValidEgyptianPhone('0101234567')).toBe(false) // 10 digits
    expect(isValidEgyptianPhone('010123456789')).toBe(false) // 12 digits
    expect(isValidEgyptianPhone('abcdefghijk')).toBe(false)
  })
})

