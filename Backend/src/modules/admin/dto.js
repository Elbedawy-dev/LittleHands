import { fromPiasters } from '../../utils/money.js'

const iso = (d) => (d ? new Date(d).toISOString() : null)

/** Admin-only customer row: contact + account info and order statistics (no credentials/lock data). */
export function toCustomerSummaryDTO(user, { ordersCount = 0, totalSpentPiasters = 0, lastOrderAt = null } = {}) {
  const u = user.toObject ? user.toObject() : user
  return {
    id: (u._id || u.id).toString(),
    name: u.name,
    email: u.email,
    phone: u.phone,
    accountType: u.accountType,
    nurseryName: u.nurseryName || '',
    governorate: u.governorate || '',
    city: u.city || '',
    status: u.status,
    createdAt: iso(u.createdAt),
    ordersCount,
    totalSpent: fromPiasters(totalSpentPiasters),
    lastOrderAt: iso(lastOrderAt),
    // Alias used by the existing customers table
    lastOrderDate: iso(lastOrderAt),
  }
}
