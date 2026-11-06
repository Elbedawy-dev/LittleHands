import { fromPiasters, toPiasters } from '../../utils/money.js'

const str = (v) => (v === undefined || v === null ? v : v.toString())

/** Per-item money in integer piasters, read ONLY from the order-time snapshots. */
export function itemPiasters(item) {
  return {
    sales: toPiasters((item.qty || 0) * (item.unitPrice || 0)),
    commission: toPiasters(item.commissionAmount || 0),
    net: toPiasters(item.sellerNet || 0),
  }
}

/**
 * Money cards from integer piasters. `due` is clamped at zero.
 * Both the prompt names and the names used by the frontend services are exposed.
 */
export function toCardsDTO({ sales = 0, commission = 0, net = 0, paid = 0 } = {}) {
  const due = Math.max(0, net - paid)
  const out = {
    totalSales: fromPiasters(sales),
    commission: fromPiasters(commission),
    net: fromPiasters(net),
    paid: fromPiasters(paid),
    due: fromPiasters(due),
  }
  return {
    ...out,
    grossSales: out.totalSales,
    platformCut: out.commission,
    netEarnings: out.net,
    totalPaidOut: out.paid,
    pendingBalance: out.due,
  }
}

/** Day bucket (sales/commission/net given in piasters). */
export function toSeriesPointDTO(date, { sales = 0, commission = 0, net = 0, orders = 0 } = {}) {
  return {
    date,
    sales: fromPiasters(sales),
    commission: fromPiasters(commission),
    net: fromPiasters(net),
    orders,
  }
}

function sellerItems(order, sellerId) {
  const sid = str(sellerId)
  return (order.items || []).filter((it) => str(it.sellerId) === sid)
}

/**
 * One order seen from one seller's point of view: ONLY her items and her money.
 * Never includes payment data, shipping or customer details unless `forAdmin`.
 */
export function toSellerOrderRowDTO(order, sellerId, { forAdmin = false } = {}) {
  const items = sellerItems(order, sellerId)
  let sales = 0
  let commission = 0
  let net = 0
  for (const it of items) {
    const p = itemPiasters(it)
    sales += p.sales
    commission += p.commission
    net += p.net
  }
  const fulfillment = (order.sellerFulfillment || []).find((f) => str(f.sellerId) === str(sellerId))
  const rate = items.length ? items[0].commissionRate : undefined

  const row = {
    id: str(order._id || order.id),
    number: order.number,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    status: order.status,
    fulfillmentStatus: fulfillment?.status || 'pending',
    itemsCount: items.reduce((acc, it) => acc + (it.qty || 0), 0),
    sales: fromPiasters(sales),
    commission: fromPiasters(commission),
    net: fromPiasters(net),
    items: items.map((it) => ({
      productId: str(it.productId),
      name: it.name,
      qty: it.qty,
      unitPrice: it.unitPrice,
      ...(forAdmin
        ? { sellerId: str(it.sellerId), commissionRate: it.commissionRate }
        : {}),
      commissionAmount: it.commissionAmount,
      sellerNet: it.sellerNet,
    })),
  }
  if (rate !== undefined) row.commissionRate = rate

  if (forAdmin) {
    row.customerId = str(order.customerId)
    row.customerName = order.delivery?.name || ''
    row.nurseryName = order.delivery?.nurseryName || ''
  }
  return row
}

export function toPayoutDTO(payout) {
  if (!payout) return null
  const p = payout.toObject ? payout.toObject() : payout
  return {
    id: str(p._id || p.id),
    sellerId: str(p.sellerId),
    sellerName: p.sellerName || '',
    amount: fromPiasters(toPiasters(p.amount)),
    reference: p.reference,
    date: p.date,
    note: p.note || p.notes || '',
    notes: p.notes || p.note || '',
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  }
}
