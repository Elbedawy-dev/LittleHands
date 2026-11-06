import { User } from '../../db/models/User.js'
import { Order } from '../../db/models/Order.js'
import { catalogService } from '../catalog/service.js'
import { escapeRegex } from '../../utils/regex.js'
import { earningsService, SALE_STATUSES } from '../earnings/service.js'
import { toCustomerSummaryDTO } from './dto.js'

export const adminService = {
  /**
   * Customers list (admin): name, accountType, governorate, ordersCount,
   * totalSpent (confirmed items + shipping), lastOrderAt. Paginated.
   * The search text is regex-escaped and never passed to Mongo raw.
   */
  async getCustomers({ q, governorate, page = 1, pageSize = 20 } = {}) {
    const filter = { role: 'customer' }

    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i')
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { nurseryName: regex },
        { governorate: regex },
      ]
    }
    if (governorate) filter.governorate = governorate

    const [customers, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ])

    const stats = await Order.aggregate([
      { $match: { customerId: { $in: customers.map((c) => c._id) } } },
      {
        $group: {
          _id: '$customerId',
          ordersCount: { $sum: 1 },
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ['$status', SALE_STATUSES] },
                { $round: [{ $multiply: ['$total', 100] }, 0] },
                0,
              ],
            },
          },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ])
    const statsById = new Map(stats.map((s) => [s._id.toString(), s]))

    const items = customers.map((c) => {
      const s = statsById.get(c._id.toString())
      return toCustomerSummaryDTO(c, {
        ordersCount: s?.ordersCount || 0,
        totalSpentPiasters: s?.totalSpent || 0,
        lastOrderAt: s?.lastOrderAt || null,
      })
    })

    return { items, total, page, pageSize }
  },

  getOverview: (period) => earningsService.getAdminOverview(period),
  getSellersEarnings: () => earningsService.getSellersEarnings(),
  getSellerOrdersDrilldown: (sellerId, options) =>
    earningsService.getSellerOrdersDrilldown(sellerId, options),
  getPayouts: (options) => earningsService.getPayouts(options),
  recordPayout: (data, ctx) => earningsService.recordPayout(data, ctx),

  // Categories are owned by the catalog module (B2)
  updateCategory: (id, values) => catalogService.updateCategory(id, values),
  reorderCategories: (ids) => catalogService.reorderCategories(ids),
}

export default adminService
