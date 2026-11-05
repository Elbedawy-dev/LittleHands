/**
 * Money calculations using integer piasters to eliminate floating-point errors.
 * 1 EGP = 100 piasters.
 */

export function toPiasters(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 0
  }
  return Math.round(Number(amount) * 100)
}

export function fromPiasters(piasters) {
  if (piasters === undefined || piasters === null || isNaN(piasters)) {
    return 0
  }
  return Number((Math.round(piasters) / 100).toFixed(2))
}

/**
 * Calculates platform commission and seller net earnings.
 * Commission = round-half-up(amount * rate)
 * Net = amount - commission
 *
 * @param {number} amount - Amount in EGP
 * @param {number} rate - Commission rate (e.g. 0.20 for 20%)
 * @returns {{ commission: number, net: number }}
 */
export function calcCommission(amount, rate = 0.20) {
  const amountPiasters = toPiasters(amount)
  // Round-half-up using Math.round on the piasters product
  const commissionPiasters = Math.round(amountPiasters * Number(rate))
  const netPiasters = amountPiasters - commissionPiasters

  return {
    commission: fromPiasters(commissionPiasters),
    net: fromPiasters(netPiasters),
  }
}

/**
 * Accurately sums multiple EGP amounts using piasters.
 * @param {...number} amounts
 * @returns {number} Sum in EGP
 */
export function sum(...amounts) {
  const totalPiasters = amounts.reduce((acc, curr) => acc + toPiasters(curr), 0)
  return fromPiasters(totalPiasters)
}

