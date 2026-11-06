import mongoose from 'mongoose'
import { Order } from '../../db/models/Order.js'
import { Payout } from '../../db/models/Payout.js'
import { Payment } from '../../db/models/Payment.js'
import { User } from '../../db/models/User.js'
import { AppError } from '../../utils/appError.js'
import { fromPiasters, toPiasters } from '../../utils/money.js'
import { mapOrderDTO } from '../../utils/dto.js'
import { eventBus, EVENT_TYPES } from '../../events/eventBus.js'
import { audit } from '../../infra/audit/index.js'
import { toPaymentDTO } from '../payments/dto.js'
import { withSellerMutex } from './mutex.js'
import { CAIRO_TZ, cairoDaySeries, periodDays } from './dates.js'
import {
  toCardsDTO,
  toSeriesPointDTO,
  toSellerOrderRowDTO,
  toPayoutDTO,
} from './dto.js'

/** An order is a SALE once payment is confirmed (never pending, rejected or cancelled). */
export const SALE_STATUSES = ['payment_confirmed', 'preparing', 'shipped', 'delivered']

const oid = (v) => new mongoose.Types.ObjectId(v.toString())

// Item money in integer piasters, computed from the per-item snapshots only
// (never from the current commission rate). Shipping is not part of items.
const SALES_P = { $round: [{ $multiply: ['$items.qty', '$items.unitPrice', 100] }, 0] }
const COMMISSION_P = { $round: [{ $multiply: ['$items.commissionAmount', 100] }, 0] }
const NET_P = { $round: [{ $multiply: ['$items.sellerNet', 100] }, 0] }

function saleItemsPipeline(sellerId, extraMatch = {}) {
  const match = { status: { $in: SALE_STATUSES }, ...extraMatch }
  if (sellerId) match['items.sellerId'] = oid(sellerId)
  const pipeline = [{ $match: match }, { $unwind: '$items' }]
  if (sellerId) pipeline.push({ $match: { 'items.sellerId': oid(sellerId) } })
  return pipeline
}

/** Map<sellerId, {sales, commission, net, ordersCount}> in piasters (single seller when given). */
async function totalsBySeller(sellerId) {
  const rows = await Order.aggregate([
    ...saleItemsPipeline(sellerId),
    {
      $group: {
        _id: '$items.sellerId',
        sales: { $sum: SALES_P },
        commission: { $sum: COMMISSION_P },
        net: { $sum: NET_P },
        orderIds: { $addToSet: '$_id' },
      },
    },
    { $project: { sales: 1, commission: 1, net: 1, ordersCount: { $size: '$orderIds' } } },
  ])
  return new Map(rows.map((r) => [r._id.toString(), r]))
}

/** Map<sellerId, paidPiasters> */
async function paidBySeller(sellerId) {
  const rows = await Payout.aggregate([
    ...(sellerId ? [{ $match: { sellerId: oid(sellerId) } }] : []),
    {
      $group: {
        _id: '$sellerId',
        paid: { $sum: { $round: [{ $multiply: ['$amount', 100] }, 0] } },
      },
    },
  ])
  return new Map(rows.map((r) => [r._id.toString(), r.paid]))
}

async function sellerFinancials(sellerId) {
  const key = sellerId.toString()
  const [totals, paid] = await Promise.all([totalsBySeller(sellerId), paidBySeller(sellerId)])
  const t = totals.get(key) || { sales: 0, commission: 0, net: 0, ordersCount: 0 }
  return {
    sales: t.sales,
    commission: t.commission,
    net: t.net,
    paid: paid.get(key) || 0,
    ordersCount: t.ordersCount,
  }
}

/** Day buckets (Africa/Cairo), missing days filled with zero. */
async function dailySeries(period, sellerId) {
  const keys = cairoDaySeries(period)
  const since = new Date(Date.now() - (periodDays(period) + 2) * 24 * 60 * 60 * 1000)
  const rows = await Order.aggregate([
    ...saleItemsPipeline(sellerId, { createdAt: { $gte: since } }),
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: CAIRO_TZ } },
          order: '$_id',
        },
        sales: { $sum: SALES_P },
        commission: { $sum: COMMISSION_P },
        net: { $sum: NET_P },
      },
    },
    {
      $group: {
        _id: '$_id.day',
        sales: { $sum: '$sales' },
        commission: { $sum: '$commission' },
        net: { $sum: '$net' },
        orders: { $sum: 1 },
      },
    },
  ])
  const byDay = new Map(rows.map((r) => [r._id, r]))
  return keys.map((key) => toSeriesPointDTO(key, byDay.get(key) || {}))
}

async function assertSeller(sellerId) {
  const seller = await User.findOne({ _id: sellerId, role: 'seller' })
  if (!seller) throw new AppError('SELLER_NOT_FOUND', 404)
  return seller
}

export const earningsService = {
  /**
   * Seller dashboard (her own data only).
   * newOrders = confirmed orders where HER fulfillment is still pending.
   */
  async getSellerOverview(sellerId, period = 'month') {
    const [financials, series, newOrders, recent] = await Promise.all([
      sellerFinancials(sellerId),
      dailySeries(period, sellerId),
      Order.countDocuments({
        status: { $in: SALE_STATUSES },
        'items.sellerId': oid(sellerId),
        $nor: [
          { sellerFulfillment: { $elemMatch: { sellerId: oid(sellerId), status: { $ne: 'pending' } } } },
        ],
      }),
      Order.find({ status: { $in: SALE_STATUSES }, 'items.sellerId': oid(sellerId) })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ])

    return {
      sellerId: sellerId.toString(),
      period,
      ...toCardsDTO(financials),
      newOrders,
      ordersCount: financials.ordersCount,
      series,
      recentOrders: recent.map((o) => toSellerOrderRowDTO(o, sellerId)),
    }
  },

  /** Seller earnings page: cards + per-order breakdown rows (her items only). */
  async getSellerEarnings(sellerId, { page = 1, pageSize = 50 } = {}) {
    const filter = { status: { $in: SALE_STATUSES }, 'items.sellerId': oid(sellerId) }
    const [financials, orders, total] = await Promise.all([
      sellerFinancials(sellerId),
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Order.countDocuments(filter),
    ])
    return {
      ...toCardsDTO(financials),
      orders: {
        items: orders.map((o) => toSellerOrderRowDTO(o, sellerId)),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    }
  },

  /** Paginated payouts. Callers decide the sellerId scope (a seller is always scoped to herself). */
  async getPayouts({ sellerId, page = 1, pageSize = 20 } = {}) {
    const filter = sellerId ? { sellerId: oid(sellerId) } : {}
    const [items, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Payout.countDocuments(filter),
    ])
    return { items: items.map(toPayoutDTO), total, page, pageSize }
  },

  /** Per-seller sales / commission / net / paid / due / wallet (admin). */
  async getSellersEarnings() {
    const [sellers, totals, paid] = await Promise.all([
      User.find({ role: 'seller' }).sort({ createdAt: 1 }).lean(),
      totalsBySeller(),
      paidBySeller(),
    ])
    return sellers.map((seller) => {
      const key = seller._id.toString()
      const t = totals.get(key) || { sales: 0, commission: 0, net: 0, ordersCount: 0 }
      const wallet = seller.seller?.payoutWallet || seller.phone || ''
      return {
        sellerId: key,
        sellerName: seller.name,
        email: seller.email,
        phone: seller.phone,
        wallet,
        walletNumber: wallet,
        ordersCount: t.ordersCount,
        ...toCardsDTO({ ...t, paid: paid.get(key) || 0 }),
      }
    })
  },

  /** Admin dashboard. Totals are the exact sum of the per-seller figures. */
  async getAdminOverview(period = 'month') {
    const [totals, paid, series, statusRows, pendingPayments, pendingCount, latest] = await Promise.all([
      totalsBySeller(),
      paidBySeller(),
      dailySeries(period),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.find({ status: 'pending' }).sort({ submittedAt: 1 }).limit(5).lean(),
      Payment.countDocuments({ status: 'pending' }),
      Order.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ])

    // Sum seller by seller so that admin == Σ sellers to the piaster.
    let sales = 0
    let commission = 0
    let net = 0
    let salesOrders = 0
    let due = 0
    let paidTotal = 0
    for (const [sellerId, t] of totals) {
      sales += t.sales
      commission += t.commission
      net += t.net
      const sellerPaid = paid.get(sellerId) || 0
      due += Math.max(0, t.net - sellerPaid)
    }
    for (const value of paid.values()) paidTotal += value
    for (const status of SALE_STATUSES) {
      salesOrders += statusRows.find((r) => r._id === status)?.count || 0
    }

    const ordersByStatus = {
      pending_payment: 0,
      payment_confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      payment_rejected: 0,
      cancelled: 0,
    }
    for (const row of statusRows) {
      if (row._id in ordersByStatus) ordersByStatus[row._id] = row.count
    }

    const orderIds = pendingPayments.map((p) => p.orderId)
    const orders = await Order.find({ _id: { $in: orderIds } }).lean()
    const orderMap = new Map(orders.map((o) => [o._id.toString(), o]))
    const pendingWidget = pendingPayments.map((p) => {
      const order = orderMap.get(p.orderId.toString())
      return toPaymentDTO(p, 'admin', {
        orderId: p.orderId.toString(),
        orderNumber: order?.number || '',
        customerId: order?.customerId?.toString() || '',
        customerName: order?.delivery?.name || '',
        customerPhone: order?.delivery?.phone || '',
        total: order?.total ?? 0,
      })
    })

    return {
      period,
      totalSales: fromPiasters(sales),
      grossSales: fromPiasters(sales),
      commission: fromPiasters(commission),
      platformCommission: fromPiasters(commission),
      sellersNet: fromPiasters(net),
      sellersDue: fromPiasters(due),
      pendingPayoutsBalance: fromPiasters(due),
      totalPaidOut: fromPiasters(paidTotal),
      pendingPayments: pendingCount,
      pendingPaymentsCount: pendingCount,
      totalOrders: salesOrders,
      ordersByStatus,
      series,
      latestOrders: latest.map((o) => mapOrderDTO(o, 'admin')),
      pendingPaymentsWidget: pendingWidget,
    }
  },

  /** Admin drill-down: one seller's sale orders, her items only, with snapshot money. */
  async getSellerOrdersDrilldown(sellerId, { page = 1, pageSize = 20 } = {}) {
    await assertSeller(sellerId)
    const filter = { status: { $in: SALE_STATUSES }, 'items.sellerId': oid(sellerId) }
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Order.countDocuments(filter),
    ])
    return {
      items: orders.map((o) => toSellerOrderRowDTO(o, sellerId, { forAdmin: true })),
      total,
      page,
      pageSize,
    }
  },

  /**
   * Records a payout. Serialized per seller with an in-process mutex so two
   * concurrent requests can never overspend `due`.
   */
  async recordPayout({ sellerId, amount, reference, date, note, notes }, { actorId, ip } = {}) {
    return withSellerMutex(sellerId, async () => {
      const seller = await assertSeller(sellerId)

      const financials = await sellerFinancials(sellerId)
      const duePiasters = Math.max(0, financials.net - financials.paid)
      const amountPiasters = toPiasters(amount)

      if (amountPiasters > duePiasters) {
        throw new AppError('PAYOUT_EXCEEDS_DUE', 422, {
          due: duePiasters / 100,
          amount,
        })
      }

      const text = note || notes || ''
      const payout = await Payout.create({
        sellerId: oid(sellerId),
        sellerName: seller.name,
        amount: amountPiasters / 100,
        reference,
        date,
        note: text,
        notes: text,
        recordedBy: actorId || null,
      })

      await audit.log(
        actorId,
        'PAYOUT_RECORDED',
        'Payout',
        payout._id.toString(),
        {
          sellerId: seller._id.toString(),
          amount: amountPiasters / 100,
          reference,
          date,
          dueBefore: duePiasters / 100,
          dueAfter: (duePiasters - amountPiasters) / 100,
        },
        ip
      )

      eventBus.emit(EVENT_TYPES.PAYOUT_RECORDED, {
        payout: payout.toObject(),
        seller: seller.toObject(),
      })

      return toPayoutDTO(payout)
    })
  },
}

export default earningsService
