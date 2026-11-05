import { EGYPTIAN_PHONE_REGEX } from '../config/constants.js'

/**
 * Normalizes an Egyptian mobile phone number.
 * Strips whitespace, dashes, country code (+20 or 20 or 0020),
 * and formats as 01XXXXXXXXX.
 *
 * @param {string} phone
 * @returns {string} Normalized 11-digit mobile phone
 */
export function normalizeEgyptianPhone(phone) {
  if (!phone || typeof phone !== 'string') return ''
  let cleaned = phone.replace(/[\s\-().]/g, '')

  // Remove leading + or 00
  if (cleaned.startsWith('+20')) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('0020')) {
    cleaned = cleaned.substring(4)
  } else if (cleaned.startsWith('20') && cleaned.length === 12) {
    cleaned = cleaned.substring(2)
  }

  // Ensure leading zero
  if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = '0' + cleaned
  }

  return cleaned
}

/**
 * Validates if the phone number is a valid Egyptian mobile number.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidEgyptianPhone(phone) {
  const normalized = normalizeEgyptianPhone(phone)
  return EGYPTIAN_PHONE_REGEX.test(normalized)
}
