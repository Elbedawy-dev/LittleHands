import { Order } from '../../db/models/Order.js'
import { Payout } from '../../db/models/Payout.js'
import { User } from '../../db/models/User.js'
import { Setting } from '../../db/models/Setting.js'
import { AuditLog } from '../../db/models/AuditLog.js'
import { AppError } from '../../utils/appError.js'
import { fromPiasters, toPiasters } from '../../utils/money.js'
import { mapOrderDTO } from '../../utils/dto.js'
import { eventBus, EVENT_TYPES } from '../../events/eventBus.js'
import { withSellerMutex } from './mutex.js'
import {
  toSellerOverviewDTO,
  toAdminOverviewDTO,
  toSellerOrderRowDTO,
  toPayoutDTO,
} from './dto.js'

export const SALE_STATUSES = ['payment_confirmed', 'preparing', 'shipped', 'delivered']

/**
 * Returns date formatted as YYYY-MM-DD in Africa/Cairo timezone
 */
export function formatCairoDate(date) {
  const d = date ? new Date(date) : new Date()
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Generates array of YYYY-MM-DD strings for a given period in Africa/Cairo timezone.
 * week = last 7 days, month = last 30 days.
 */
export function generateCairoDateSeries(period = 'month') {
  const daysCount = period === 'week' ? 7 : 30
  const dates = []
  const now = new Date()

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    dates.push(formatCairoDate(d))
  }

  return dates
}

/**
 * Internal helper to calculate a seller's all-time earnings and remaining balance.
 */
async function calculateSellerFinancials(sellerId) {
  const sidStr = sellerId.toString()
  const orders = await Order.find({
    status: { $in: SALE_STATUSES },
    'items.sellerId': sellerId,
  })

  let salesPiasters = 0
  let commPiasters = 0
  let netPiasters = 0

  for (const order of orders) {
    for (const item of order.items || []) {
      if (item.sellerId?.toString() === sidStr) {
        const itemSales = (item.qty || 1) * (item.unitPrice || 0)
        const itemComm =
          item.commissionAmount !== undefined
            ? item.commissionAmount
            : itemSales * (item.commissionRate || 0.20)
        const itemNet =
          item.sellerNet !== undefined
            ? item.sellerNet
            : itemSales - itemComm

        salesPiasters += toPiasters(itemSales)
        commPiasters += toPiasters(itemComm)
        netPiasters += toPiasters(itemNet)
      }
    }
  }

  const payouts = await Payout.find({ sellerId })
  const paidPiasters = payouts.reduce((acc, p) => acc + toPiasters(p.amount), 0)
  const duePiasters = Math.max(0, netPiasters - paidPiasters)

  return {
    totalSales: fromPiasters(salesPiasters),
    commission: fromPiasters(commPiasters),
    net: fromPiasters(netPiasters),
    paid: fromPiasters(paidPiasters),
    due: fromPiasters(duePiasters),
    ordersCount: orders.length,
    orders,
    payouts,
  }
}

export const earningsService = {
  /**
   * Seller overview dashboard data (her own data only)
   */
  async getSellerOverview(sellerId, period = 'month') {
    const seller = await User.findById(sellerId)
    if (!seller || seller.role !== 'seller') {
      throw new AppError('SELLER_NOT_FOUND', 404, 'البائعة غير موجودة')
    }

    const financials = await calculateSellerFinancials(sellerId)
    const sidStr = sellerId.toString()

    // Determine period date filter
    const daysCount = period === 'week' ? 7 : 30
    const periodStartDate = new Date()
    periodStartDate.setHours(0, 0, 0, 0)
    periodStartDate.setDate(periodStartDate.getDate() - (daysCount - 1))

    // New orders: confirmed/active orders where her fulfillment status is still pending
    const confirmedOrders = await Order.find({
      status: { $in: SALE_STATUSES },
      'items.sellerId': sellerId,
    }).sort({ createdAt: -1 })

    const newOrders = confirmedOrders.filter((order) => {
      const fulfillment = (order.sellerFulfillment || []).find(
        (f) => f.sellerId?.toString() === sidStr
      )
      // Pending if explicitly pending or not yet registered in sellerFulfillment
      return !fulfillment || fulfillment.status === 'pending'
    }).length

    // Daily series with Africa/Cairo timezone and missing days filled with 0
    const dateList = generateCairoDateSeries(period)
    const seriesMap = new Map()
    for (const d of dateList) {
      seriesMap.set(d, { date: d, sales: 0, commission: 0, net: 0, orders: 0 })
    }

    for (const order of confirmedOrders) {
      const orderDateStr = formatCairoDate(order.createdAt)
      if (seriesMap.has(orderDateStr)) {
        const entry = seriesMap.get(orderDateStr)
        let orderHasSellerItem = false

        for (const item of order.items || []) {
          if (item.sellerId?.toString() === sidStr) {
            const itemSales = (item.qty || 1) * (item.unitPrice || 0)
            const itemComm =
              item.commissionAmount !== undefined
                ? item.commissionAmount
                : itemSales * (item.commissionRate || 0.20)
            const itemNet =
              item.sellerNet !== undefined
                ? item.sellerNet
                : itemSales - itemComm

            entry.sales = fromPiasters(toPiasters(entry.sales) + toPiasters(itemSales))
            entry.commission = fromPiasters(toPiasters(entry.commission) + toPiasters(itemComm))
            entry.net = fromPiasters(toPiasters(entry.net) + toPiasters(itemNet))
            orderHasSellerItem = true
          }
        }

        if (orderHasSellerItem) {
          entry.orders += 1
        }
      }
    }

    const series = Array.from(seriesMap.values())

    // Recent orders (up to 5) mapped for seller
    const recentOrders = confirmedOrders
      .slice(0, 5)
      .map((order) => mapOrderDTO(order, 'seller', sidStr))

    // Recent payouts (up to 3)
    const recentPayouts = (financials.payouts || []).slice(0, 3).map(toPayoutDTO)

    // Current default commission rate
    const settings = await Setting.findOne({ singletonKey: 'platform_settings' })
    const commissionRate = settings?.commissionRate ?? 0.20

    return toSellerOverviewDTO({
      sellerId,
      period,
      totalSales: financials.totalSales,
      commission: financials.commission,
      net: financials.net,
      paid: financials.paid,
      due: financials.due,
      newOrders,
      ordersCount: financials.ordersCount,
      commissionRate,
      series,
      recentOrders,
      recentPayouts,
    })
  },

  /**
   * Seller earnings page: cards + per-order breakdown rows
   */
  async getSellerEarnings(sellerId) {
    const seller = await User.findById(sellerId)
    if (!seller || seller.role !== 'seller') {
      throw new AppError('SELLER_NOT_FOUND', 404, 'البائعة غير موجودة')
    }

    const financials = await calculateSellerFinancials(sellerId)
    const orderRows = (financials.orders || []).map((order) =>
      toSellerOrderRowDTO(order, sellerId)
    )

    return {
      totalSales: financials.totalSales,
      grossSales: financials.totalSales,
      commission: financials.commission,
      platformCut: financials.commission,
      net: financials.net,
      netEarnings: financials.net,
      paid: financials.paid,
      totalPaidOut: financials.paid,
      due: financials.due,
      pendingBalance: financials.due,
      orders: orderRows,
    }
  },

  /**
   * List payouts for seller or admin
   */
  async getPayouts({ sellerId, page, pageSize } = {}) {
    const filter = {}
    if (sellerId) {
      filter.sellerId = sellerId
    }

    const query = Payout.find(filter).sort({ createdAt: -1 })

    if (page && pageSize) {
      const skip = (page - 1) * pageSize
      const [items, total] = await Promise.all([
        query.skip(skip).limit(pageSize),
        Payout.countDocuments(filter),
      ])
      return {
        items: items.map(toPayoutDTO),
        total,
        page,
        pageSize,
      }
    }

    const payouts = await query
    return payouts.map(toPayoutDTO)
  },

  /**
   * Per-seller earnings breakdown for Admin
   */
  async getSellersEarnings() {
    const sellers = await User.find({ role: 'seller' }).sort({ createdAt: 1 })
    const results = []

    for (const seller of sellers) {
      const financials = await calculateSellerFinancials(seller._id)
      const walletNumber = seller.seller?.payoutWallet || seller.phone || ''

      results.push({
        sellerId: seller.id || seller._id.toString(),
        sellerName: seller.name,
        email: seller.email,
        phone: seller.phone,
        wallet: walletNumber,
        walletNumber,
        totalSales: financials.totalSales,
        grossSales: financials.totalSales,
        commission: financials.commission,
        platformCut: financials.commission,
        net: financials.net,
        netEarnings: financials.net,
        paid: financials.paid,
        totalPaidOut: financials.paid,
        due: financials.due,
        pendingBalance: financials.due,
        ordersCount: financials.ordersCount,
      })
    }

    return results
  },

  /**
   * Admin dashboard analytics overview
   */
  async getAdminOverview(period = 'month') {
    const confirmedOrders = await Order.find({
      status: { $in: SALE_STATUSES },
    }).sort({ createdAt: -1 })

    let salesPiasters = 0
    let commPiasters = 0
    let netPiasters = 0

    for (const order of confirmedOrders) {
      for (const item of order.items || []) {
        const itemSales = (item.qty || 1) * (item.unitPrice || 0)
        const itemComm =
          item.commissionAmount !== undefined
            ? item.commissionAmount
            : itemSales * (item.commissionRate || 0.20)
        const itemNet =
          item.sellerNet !== undefined
            ? item.sellerNet
            : itemSales - itemComm

        salesPiasters += toPiasters(itemSales)
        commPiasters += toPiasters(itemComm)
        netPiasters += toPiasters(itemNet)
      }
    }

    const allPayouts = await Payout.find({})
    const paidPiasters = allPayouts.reduce((acc, p) => acc + toPiasters(p.amount), 0)
    const duePiasters = Math.max(0, netPiasters - paidPiasters)

    // Orders counts by status
    const allOrders = await Order.find({}).sort({ createdAt: -1 })
    const ordersCountByStatus = {
      pending_payment: 0,
      payment_confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      payment_rejected: 0,
      cancelled: 0,
    }

    for (const order of allOrders) {
      if (ordersCountByStatus[order.status] !== undefined) {
        ordersCountByStatus[order.status] += 1
      }
    }

    const pendingPaymentsCount = ordersCountByStatus.pending_payment

    // Daily series in Africa/Cairo timezone
    const dateList = generateCairoDateSeries(period)
    const seriesMap = new Map()
    for (const d of dateList) {
      seriesMap.set(d, { date: d, sales: 0, commission: 0, net: 0, orders: 0 })
    }

    for (const order of confirmedOrders) {
      const dateStr = formatCairoDate(order.createdAt)
      if (seriesMap.has(dateStr)) {
        const entry = seriesMap.get(dateStr)
        let orderSales = 0
        let orderComm = 0
        let orderNet = 0

        for (const item of order.items || []) {
          const itemSales = (item.qty || 1) * (item.unitPrice || 0)
          const itemComm =
            item.commissionAmount !== undefined
              ? item.commissionAmount
              : itemSales * (item.commissionRate || 0.20)
          const itemNet =
            item.sellerNet !== undefined
              ? item.sellerNet
              : itemSales - itemComm

          orderSales += itemSales
          orderComm += itemComm
          orderNet += itemNet
        }

        entry.sales = fromPiasters(toPiasters(entry.sales) + toPiasters(orderSales))
        entry.commission = fromPiasters(toPiasters(entry.commission) + toPiasters(orderComm))
        entry.net = fromPiasters(toPiasters(entry.net) + toPiasters(orderNet))
        entry.orders += 1
      }
    }

    const series = Array.from(seriesMap.values())

    // Latest orders (5) mapped for admin
    const latestOrders = allOrders.slice(0, 5).map((order) => mapOrderDTO(order, 'admin'))

    // Pending payments widget data
    const pendingOrders = allOrders.filter((o) => o.status === 'pending_payment')
    const pendingPaymentsWidget = pendingOrders.slice(0, 5).map((o) => ({
      orderId: o.id || o._id.toString(),
      orderNumber: o.number,
      customerName: o.delivery?.name || '',
      amount: o.total,
      senderPhone: o.delivery?.phone || '',
      reference: o.payment?.reference || '',
      submittedAt: o.createdAt,
    }))

    return toAdminOverviewDTO({
      period,
      totalSales: fromPiasters(salesPiasters),
      commission: fromPiasters(commPiasters),
      sellersNet: fromPiasters(netPiasters),
      sellersDue: fromPiasters(duePiasters),
      totalPaidOut: fromPiasters(paidPiasters),
      totalOrders: confirmedOrders.length,
      pendingPayments: pendingPaymentsCount,
      ordersCountByStatus,
      series,
      latestOrders,
      pendingPaymentsWidget,
    })
  },

  /**
   * Drill-down of orders for a specific seller
   */
  async getSellerOrdersDrilldown(sellerId, { page = 1, pageSize = 20 } = {}) {
    const seller = await User.findById(sellerId)
    if (!seller || seller.role !== 'seller') {
      throw new AppError('SELLER_NOT_FOUND', 404, 'البائعة غير موجودة')
    }

    const filter = {
      'items.sellerId': sellerId,
    }

    const skip = (page - 1) * pageSize
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
      Order.countDocuments(filter),
    ])

    const items = orders.map((order) => toSellerOrderRowDTO(order, sellerId))

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  },

  /**
   * Records a new payout to a seller under an in-process mutex.
   * Ensures amount > 0, does not exceed due, date not in the future, audited, emits event.
   */
  async recordPayout({ sellerId, amount, reference, date, note, notes, recordedBy, ip }) {
    return withSellerMutex(sellerId, async () => {
      const seller = await User.findById(sellerId)
      if (!seller || seller.role !== 'seller') {
        throw new AppError('SELLER_NOT_FOUND', 404, 'البائعة غير موجودة')
      }

      const numAmount = Number(amount)
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new AppError('INVALID_PAYOUT_AMOUNT', 400, 'مبلغ التحويل يجب أن يكون أكبر من صفر')
      }

      // Check date is not in future
      let payoutDateStr = formatCairoDate(new Date())
      if (date) {
        const parsedDate = new Date(date)
        if (isNaN(parsedDate.getTime())) {
          throw new AppError('INVALID_DATE', 400, 'تاريخ التحويل غير صالح')
        }
        const todayStr = formatCairoDate(new Date())
        const targetStr = formatCairoDate(parsedDate)
        if (targetStr > todayStr) {
          throw new AppError('FUTURE_DATE_NOT_ALLOWED', 400, 'تاريخ التحويل لا يمكن أن يكون في المستقبل')
        }
        payoutDateStr = targetStr
      }

      // Check seller due amount
      const financials = await calculateSellerFinancials(sellerId)
      const duePiasters = toPiasters(financials.due)
      const amountPiasters = toPiasters(numAmount)

      if (amountPiasters > duePiasters) {
        throw new AppError(
          'PAYOUT_EXCEEDS_DUE',
          422,
          `مبلغ التحويل (${numAmount} ج.م) يتجاوز المستحقات المتبقية للبائعة (${financials.due} ج.م)`
        )
      }

      const finalNote = note || notes || ''
      const payout = await Payout.create({
        sellerId,
        sellerName: seller.name,
        amount: numAmount,
        reference: reference.trim(),
        date: payoutDateStr,
        note: finalNote,
        notes: finalNote,
        recordedBy: recordedBy || null,
      })

      // Audit Log
      await AuditLog.create({
        actorId: recordedBy || null,
        action: 'PAYOUT_RECORDED',
        entityType: 'Payout',
        entityId: payout.id || payout._id.toString(),
        meta: {
          sellerId: seller.id || seller._id.toString(),
          sellerName: seller.name,
          amount: numAmount,
          reference: reference.trim(),
          date: payoutDateStr,
          dueBefore: financials.due,
          dueAfter: fromPiasters(duePiasters - amountPiasters),
        },
        ip: ip || '',
      })

      // Emit event
      eventBus.emit(EVENT_TYPES.PAYOUT_RECORDED, {
        payout: payout.toObject(),
        seller: seller.toObject(),
      })

      return toPayoutDTO(payout)
    })
  },
}

export default earningsService
