import { db } from '../mocks/db'
import { calcCommission, delay } from '../utils'

/**
 * خدمة حساب الأرباح والعمولات وتحويلات المستحقات للبائعات والإدارة
 */
export const earningsService = {
  async getAdminOverview(period = 'month') {
    await delay(350)
    // حساب المبيعات من الطلبات المؤكدة أو المسلمة
    const confirmedOrders = db.data.orders.filter(
      (o) => o.status !== 'pending_payment' && o.status !== 'payment_rejected'
    )

    const grossSales = confirmedOrders.reduce((acc, o) => acc + o.subtotal, 0)
    const { commission: platformCommission, net: sellersNet } = calcCommission(
      grossSales,
      db.data.settings.commissionRate
    )

    const totalOrders = confirmedOrders.length
    const pendingPaymentsCount = db.data.orders.filter(
      (o) => o.payment && o.payment.status === 'pending'
    ).length

    // إجمالي ما تم تحويله للبائعات
    const totalPaidOut = db.data.payouts.reduce((acc, p) => acc + p.amount, 0)
    const pendingPayoutsBalance = Math.max(0, sellersNet - totalPaidOut)

    return {
      period,
      grossSales,
      platformCommission, // 20%
      sellersNet, // 80%
      totalOrders,
      pendingPaymentsCount,
      totalPaidOut,
      pendingPayoutsBalance,
    }
  },

  async getSellerOverview(sellerId, period = 'month') {
    await delay(350)
    const targetSellerId = sellerId || 'seller_1'

    // جمع المنتجات الخاصة بهذه البائعة من الطلبات المؤكدة
    let sellerGross = 0
    let sellerOrdersCount = 0

    const validOrders = db.data.orders.filter(
      (o) => o.status !== 'pending_payment' && o.status !== 'payment_rejected'
    )

    validOrders.forEach((order) => {
      let hasItem = false
      order.items.forEach((item) => {
        if (item.sellerId === targetSellerId) {
          sellerGross += item.unitPrice * item.qty
          hasItem = true
        }
      })
      if (hasItem) sellerOrdersCount++
    })

    const { commission: platformCut, net: netEarnings } = calcCommission(
      sellerGross,
      db.data.settings.commissionRate
    )

    const sellerPayouts = db.data.payouts.filter((p) => p.sellerId === targetSellerId)
    const totalPaidOut = sellerPayouts.reduce((acc, p) => acc + p.amount, 0)
    const pendingBalance = Math.max(0, netEarnings - totalPaidOut)

    return {
      sellerId: targetSellerId,
      period,
      grossSales: sellerGross,
      commissionRate: db.data.settings.commissionRate,
      platformCut,
      netEarnings,
      totalPaidOut,
      pendingBalance,
      ordersCount: sellerOrdersCount,
      recentPayouts: sellerPayouts.slice(-3),
    }
  },

  async getSellerEarnings(sellerId) {
    return this.getSellerOverview(sellerId, 'all')
  },

  async getPayouts({ sellerId } = {}) {
    await delay(300)
    if (sellerId) {
      return db.data.payouts.filter((p) => p.sellerId === sellerId)
    }
    return [...db.data.payouts]
  },

  async recordPayout({ sellerId, amount, reference, date, notes = '' }) {
    await delay(450)
    const seller = db.data.users.find((u) => u.id === sellerId)
    const sellerName = seller ? seller.name : 'البائعة'

    const newPayout = {
      id: `pay_${Date.now()}`,
      sellerId,
      sellerName,
      amount: Number(amount),
      reference,
      date: date || new Date().toISOString().split('T')[0],
      notes,
    }

    db.data.payouts.unshift(newPayout)

    // إشعار للبائعة
    db.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      role: 'seller',
      userId: sellerId,
      title: 'تحويل أرباح جديد',
      message: `تم تسجيل تحويل أرباح بقيمة ${amount} ج.م إلى محفظتك برقم مرجعي ${reference}.`,
      type: 'payout',
      link: '/seller/earnings',
      read: false,
      createdAt: new Date().toISOString(),
    })

    db.save()
    return newPayout
  },

  async getSellersEarnings() {
    await delay(400)
    const sellers = db.data.users.filter((u) => u.role === 'seller')
    const results = []

    for (const seller of sellers) {
      const summary = await this.getSellerOverview(seller.id, 'all')
      results.push({
        sellerId: seller.id,
        sellerName: seller.name,
        email: seller.email,
        phone: seller.phone,
        walletNumber: seller.walletNumber || seller.phone,
        ...summary,
      })
    }

    return results
  },
}

