import { mapUserDTO } from '../../utils/dto.js'
import { fromPiasters, toPiasters } from '../../utils/money.js'

export const toCustomerSummaryDTO = (user, { ordersCount = 0, totalSpent = 0, lastOrderAt = null } = {}) => {
  const base = mapUserDTO(user, 'admin')
  const spentRounded = fromPiasters(toPiasters(totalSpent))

  return {
    ...base,
    ordersCount,
    totalSpent: spentRounded,
    lastOrderAt: lastOrderAt ? new Date(lastOrderAt).toISOString() : null,
    lastOrderDate: lastOrderAt ? new Date(lastOrderAt).toISOString() : null,
  }
}
