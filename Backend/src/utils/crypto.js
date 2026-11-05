import crypto from 'node:crypto'

/**
 * Computes a SHA-256 hash string for given data.
 * @param {string|Buffer} data
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex')
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 * @returns {string} 6-digit code string (e.g. "839201")
 */
export function randomCode() {
  return crypto.randomInt(100000, 1000000).toString()
}

/**
 * Generates a cryptographically secure random hex token.
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} Hex string (64 characters for 32 bytes)
 */
export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex')
}

