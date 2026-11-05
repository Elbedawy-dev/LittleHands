/**
 * Creates an object composed of the picked object properties.
 *
 * @param {Object} object - Source object
 * @param {string[]} keys - Whitelisted keys
 * @returns {Object} New object with picked properties
 */
export function pick(object, keys = []) {
  if (!object || typeof object !== 'object') return {}
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(object, key) && object[key] !== undefined) {
      acc[key] = object[key]
    }
    return acc
  }, {})
}

export default pick

