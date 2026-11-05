import { fromPiasters, toPiasters } from '../../utils/money.js'

export function toSellerOverviewDTO({
  sellerId,
  period = 'month',
  totalSales = 0,
  commission = 0,
  net = 0,
  paid = 0,
  due = 0,
  newOrders = 0,
  ordersCount = 0,
  commissionRate = 0.20,
  series = [],
  recentOrders = [],
  recentPayouts = [],
}) {
  const round = (val) => fromPiasters(toPiasters(val))
  const salesRounded = round(totalSales)
  const commissionRounded = round(commission)
  const netRounded = round(net)
  const paidRounded = round(paid)
  const dueRounded = Math.max(0, round(due))

  return {
    sellerId: sellerId?.toString(),
    period,
    // Dual naming for both prompt & frontend compatibility
    totalSales: salesRounded,
    grossSales: salesRounded,
    commission: commissionRounded,
    platformCut: commissionRounded,
    net: netRounded,
    netEarnings: netRounded,
    paid: paidRounded,
    totalPaidOut: paidRounded,
    due: dueRounded,
    pendingBalance: dueRounded,
    newOrders,
    ordersCount,
    commissionRate,
    series,
    daily: series,
    recentOrders,
    recentPayouts,
  }
}

export function toAdminOverviewDTO({
  period = 'month',
  totalSales = 0,
  commission = 0,
  sellersNet = 0,
  sellersDue = 0,
  totalPaidOut = 0,
  totalOrders = 0,
  pendingPayments = 0,
  ordersCountByStatus = {},
  series = [],
  latestOrders = [],
  pendingPaymentsWidget = [],
}) {
  const round = (val) => fromPiasters(toPiasters(val))
  const salesRounded = round(totalSales)
  const commRounded = round(commission)
  const netRounded = round(sellersNet)
  const dueRounded = Math.max(0, round(sellersDue))
  const paidRounded = round(totalPaidOut)

  return {
    period,
    totalSales: salesRounded,
    grossSales: salesRounded,
    commission: commRounded,
    platformCommission: commRounded,
    sellersNet: netRounded,
    sellersDue: dueRounded,
    pendingPayoutsBalance: dueRounded,
    totalPaidOut: paidRounded,
    totalOrders,
    pendingPayments,
    pendingPaymentsCount: pendingPayments,
    ordersCountByStatus,
    series,
    revenueSeries: series,
    latestOrders,
    recentOrders: latestOrders,
    pendingPaymentsWidget,
    pendingPaymentsList: pendingPaymentsWidget,
  }
}

export function toSellerOrderRowDTO(order, sellerId) {
  const sidStr = sellerId?.toString()
  const sellerItems = (order.items || []).filter(
    (item) => item.sellerId?.toString() === sidStr
  )

  let sales = 0
  let commission = 0
  let net = 0
  let commRate = 0.20

  for (const it of sellerItems) {
    const itemSales = (it.qty || 1) * (it.unitPrice || 0)
    sales += itemSales
    commRate = it.commissionRate !== undefined ? it.commissionRate : commRate
    const itComm = it.commissionAmount !== undefined ? it.commissionAmount : itemSales * commRate
    const itNet = it.sellerNet !== undefined ? it.sellerNet : itemSales - itComm
    commission += itComm
    net += itNet
  }

  const fulfillment = (order.sellerFulfillment || []).find(
    (f) => f.sellerId?.toString() === sidStr
  )

  return {
    id: order.id || order._id?.toString(),
    number: order.number,
    createdAt: order.createdAt,
    status: order.status,
    fulfillmentStatus: fulfillment?.status || 'pending',
    itemsCount: sellerItems.reduce((acc, it) => acc + (it.qty || 1), 0),
    sales: fromPiasters(toPiasters(sales)),
    commissionRate: commRate,
    commission: fromPiasters(toPiasters(commission)),
    net: fromPiasters(toPiasters(net)),
  }
}

export function toPayoutDTO(payout) {
  if (!payout) return null
  const p = payout.toObject ? payout.toObject() : { ...payout }
  return {
    id: p.id || p._id?.toString(),
    sellerId: p.sellerId?.toString(),
    sellerName: p.sellerName || '',
    amount: fromPiasters(toPiasters(p.amount)),
    reference: p.reference,
    date: p.date,
    note: p.note || p.notes || '',
    notes: p.notes || p.note || '',
    createdAt: p.createdAt,
  }
}
