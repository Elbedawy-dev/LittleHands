/**
 * Escapes characters in user input before using in a regular expression.
 * @param {string} string
 * @returns {string}
 */
export function escapeRegex(string) {
  if (typeof string !== 'string') return ''
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

