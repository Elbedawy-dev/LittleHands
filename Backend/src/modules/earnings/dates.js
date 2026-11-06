/**
 * Africa/Cairo calendar helpers used for day buckets and "not in the future" checks.
 */

export const CAIRO_TZ = 'Africa/Cairo'

const cairoFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CAIRO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** @returns {string} YYYY-MM-DD of the given instant in Africa/Cairo */
export function formatCairoDate(date = new Date()) {
  return cairoFormatter.format(date instanceof Date ? date : new Date(date))
}

/** Days covered by each supported period. week = last 7 days, month = last 30 days. */
export function periodDays(period) {
  return period === 'week' ? 7 : 30
}

/**
 * Ordered list (oldest first) of YYYY-MM-DD Cairo day keys ending today.
 * Calendar arithmetic is done on the date string itself, so DST shifts can
 * never duplicate or skip a day.
 */
export function cairoDaySeries(period = 'month', now = new Date()) {
  const [y, m, d] = formatCairoDate(now).split('-').map(Number)
  const days = periodDays(period)
  const keys = []
  for (let i = days - 1; i >= 0; i--) {
    keys.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10))
  }
  return keys
}

/** True when the YYYY-MM-DD key is strictly after today in Africa/Cairo. */
export function isFutureCairoDate(key, now = new Date()) {
  return key > formatCairoDate(now)
}

