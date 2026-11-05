import { User } from '../../db/models/User.js'
import { Order } from '../../db/models/Order.js'
import { catalogService } from '../catalog/service.js'
import { escapeRegex } from '../../utils/regex.js'
import { sum } from '../../utils/money.js'
import { earningsService, SALE_STATUSES } from '../earnings/service.js'
import { toCustomerSummaryDTO } from './dto.js'

export const adminService = {
  /**
   * Retrieves customers list with search, governorate filter, order stats and pagination.
   */
  async getCustomers({ q, governorate, page, pageSize } = {}) {
    const filter = { role: 'customer' }

    if (q && q.trim()) {
      const escaped = escapeRegex(q.trim())
      const regex = new RegExp(escaped, 'i')
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { nurseryName: regex },
        { governorate: regex },
      ]
    }

    if (governorate && governorate.trim()) {
      filter.governorate = governorate.trim()
    }

    const isPaginated = page !== undefined || pageSize !== undefined
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Math.min(100, Number(pageSize) || 20))

    let customersQuery = User.find(filter).sort({ createdAt: -1 })
    let total = 0

    if (isPaginated) {
      const skip = (pageNum - 1) * limitNum
      total = await User.countDocuments(filter)
      customersQuery = customersQuery.skip(skip).limit(limitNum)
    }

    const customers = await customersQuery
    if (!isPaginated) {
      total = customers.length
    }

    // Enrich customers with orders count and total spent
    const customerIds = customers.map((c) => c._id)
    const customerOrders = await Order.find({ customerId: { $in: customerIds } }).sort({
      createdAt: -1,
    })

    const ordersByCustomer = new Map()
    for (const order of customerOrders) {
      const cidStr = order.customerId.toString()
      if (!ordersByCustomer.has(cidStr)) {
        ordersByCustomer.set(cidStr, [])
      }
      ordersByCustomer.get(cidStr).push(order)
    }

    const items = customers.map((c) => {
      const cidStr = c._id.toString()
      const userOrders = ordersByCustomer.get(cidStr) || []
      const ordersCount = userOrders.length
      const confirmedOrders = userOrders.filter((o) => SALE_STATUSES.includes(o.status))
      const totalSpent = sum(...confirmedOrders.map((o) => o.total))
      const lastOrderAt = userOrders.length > 0 ? userOrders[0].createdAt : null

      return toCustomerSummaryDTO(c, {
        ordersCount,
        totalSpent,
        lastOrderAt,
      })
    })

    if (isPaginated) {
      return {
        items,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      }
    }

    return items
  },

  /**
   * Delegates dashboard overview to earningsService
   */
  async getOverview(period = 'month') {
    return earningsService.getAdminOverview(period)
  },

  /**
   * Delegates sellers earnings to earningsService
   */
  async getSellersEarnings() {
    return earningsService.getSellersEarnings()
  },

  /**
   * Delegates seller orders drill-down to earningsService
   */
  async getSellerOrdersDrilldown(sellerId, options) {
    return earningsService.getSellerOrdersDrilldown(sellerId, options)
  },

  /**
   * Delegates payouts list to earningsService
   */
  async getPayouts(options) {
    return earningsService.getPayouts(options)
  },

  /**
   * Delegates payout recording to earningsService
   */
  async recordPayout(data) {
    return earningsService.recordPayout(data)
  },

  /**
   * Updates category details (Delegated to catalogService)
   */
  async updateCategory(id, values) {
    return catalogService.updateCategory(id, values)
  },

  /**
   * Reorders categories by ID or slug (Delegated to catalogService)
   */
  async reorderCategories(ids) {
    return catalogService.reorderCategories(ids)
  },
}

export default adminService
