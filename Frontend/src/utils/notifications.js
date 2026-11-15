const FALLBACK_BY_ROLE = {
  admin: '/admin/notifications',
  seller: '/seller/notifications',
  customer: '/notifications',
}

const VALID_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/products$/,
  /^\/products\/[^/]+$/,
  /^\/sellers$/,
  /^\/sellers\/[^/]+$/,
  /^\/about$/,
  /^\/cart$/,
  /^\/checkout$/,
  /^\/order-success\/[^/]+$/,
  /^\/account$/,
  /^\/account\/orders$/,
  /^\/account\/orders\/[^/]+$/,
  /^\/account\/favorites$/,
  /^\/account\/addresses$/,
  /^\/account\/settings$/,
  /^\/notifications$/,
  /^\/seller$/,
  /^\/seller\/products$/,
  /^\/seller\/products\/new$/,
  /^\/seller\/products\/[^/]+\/edit$/,
  /^\/seller\/orders$/,
  /^\/seller\/custom-requests$/,
  /^\/seller\/earnings$/,
  /^\/seller\/profile$/,
  /^\/seller\/notifications$/,
  /^\/admin$/,
  /^\/admin\/payments$/,
  /^\/admin\/orders$/,
  /^\/admin\/products$/,
  /^\/admin\/products\/new$/,
  /^\/admin\/products\/[^/]+\/edit$/,
  /^\/admin\/sellers$/,
  /^\/admin\/customers$/,
  /^\/admin\/categories$/,
  /^\/admin\/custom-requests$/,
  /^\/admin\/notifications$/,
  /^\/admin\/settings$/,
  /^\/admin\/account$/,
]

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

/**
 * Resolves notification links (including legacy `/orders/:id`, `/seller/orders/:id`,
 * `/admin/orders/:id` stored in older notifications) to valid frontend routes,
 * falling back to the role's notifications page if a link is missing or unknown.
 */
export function resolveNotificationLink(item, role) {
  const effectiveRole = role || (item && typeof item === 'object' ? item.role : null) || 'customer'
  const fallback = FALLBACK_BY_ROLE[effectiveRole] || FALLBACK_BY_ROLE.customer

  const rawLink = typeof item === 'string' ? item : item?.link
  if (!rawLink || typeof rawLink !== 'string') {
    return fallback
  }

  let candidate = rawLink.trim()
  if (!candidate) return fallback

  // Strip scheme/origin if an absolute internal URL was stored
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const parsed = new URL(candidate)
      candidate = `${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return fallback
    }
  }

  if (!candidate.startsWith('/')) {
    return fallback
  }

  const hashIdx = candidate.indexOf('#')
  const hash = hashIdx >= 0 ? candidate.slice(hashIdx) : ''
  const withoutHash = hashIdx >= 0 ? candidate.slice(0, hashIdx) : candidate

  const queryIdx = withoutHash.indexOf('?')
  const search = queryIdx >= 0 ? withoutHash.slice(queryIdx) : ''
  const pathname = normalizePathname(queryIdx >= 0 ? withoutHash.slice(0, queryIdx) : withoutHash)

  // Legacy pattern: /admin/orders/:id -> /admin/orders?order=:id
  const adminOrderMatch = pathname.match(/^\/admin\/orders\/([^/]+)$/)
  if (adminOrderMatch) {
    return `/admin/orders?order=${encodeURIComponent(adminOrderMatch[1])}`
  }

  // Legacy pattern: /seller/orders/:id -> /seller/orders?order=:id
  const sellerOrderMatch = pathname.match(/^\/seller\/orders\/([^/]+)$/)
  if (sellerOrderMatch) {
    return `/seller/orders?order=${encodeURIComponent(sellerOrderMatch[1])}`
  }

  // Legacy pattern: /orders/:id -> role-appropriate target
  const legacyOrderMatch = pathname.match(/^\/orders\/([^/]+)$/)
  if (legacyOrderMatch) {
    const orderId = legacyOrderMatch[1]
    if (effectiveRole === 'admin') {
      return `/admin/orders?order=${encodeURIComponent(orderId)}`
    }
    if (effectiveRole === 'seller') {
      return `/seller/orders?order=${encodeURIComponent(orderId)}`
    }
    return `/account/orders/${encodeURIComponent(orderId)}`
  }

  if (VALID_ROUTE_PATTERNS.some((re) => re.test(pathname))) {
    return `${pathname}${search}${hash}`
  }

  return fallback
}
