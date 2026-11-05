import { db } from '../mocks/db'
import { delay } from '../utils'

/**
 * خدمة إدارة مدفوعات فودافون كاش ومراجعة الإيصالات (لوحة الإدارة)
 */
export const paymentService = {
  async getPayments({ status = 'all', q = '' } = {}) {
    await delay(350)
    // المدفوعات مرتبطة بالطلبات التي تم إرفاق إيصال لها
    let payments = db.data.orders
      .filter((o) => o.payment !== null)
      .map((o) => ({
        orderId: o.id,
        orderNumber: o.number,
        customerId: o.customerId,
        customerName: o.delivery.name,
        customerPhone: o.delivery.phone,
        total: o.total,
        ...o.payment,
      }))

    if (status !== 'all') {
      payments = payments.filter((p) => p.status === status)
    }

    if (q) {
      const query = q.trim().toLowerCase()
      payments = payments.filter(
        (p) =>
          p.orderNumber.toLowerCase().includes(query) ||
          p.customerName.toLowerCase().includes(query) ||
          (p.senderPhone && p.senderPhone.includes(query)) ||
          (p.reference && p.reference.toLowerCase().includes(query))
      )
    }

    return payments
  },

  async confirmPayment(orderId) {
    await delay(450)
    const order = db.data.orders.find((o) => o.id === orderId || o.number === orderId)
    if (!order) throw new Error('ERR_ORDER_NOT_FOUND')
    if (!order.payment) throw new Error('ERR_RECEIPT_NOT_FOUND')

    order.payment.status = 'confirmed'
    order.payment.reviewedAt = new Date().toISOString()
    order.status = 'payment_confirmed'

    order.timeline.push({
      status: 'payment_confirmed',
      title: 'تم اعتماد إيصال فودافون كاش وتأكيد الدفع',
      timestamp: new Date().toISOString(),
    })
    order.updatedAt = new Date().toISOString()

    // إشعار للعميل
    db.data.notifications.unshift({
      id: `notif_${Date.now()}_1`,
      role: 'customer',
      userId: order.customerId,
      title: 'تم تأكيد دفع طلبك',
      message: `تم اعتماد إيصال فودافون كاش للطلب ${order.number}، وبدأت البائعة في التجهيز.`,
      type: 'payment',
      link: `/account/orders/${order.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    })

    // إشعار للبائعات المعنيات
    const sellerIds = [...new Set(order.items.map((it) => it.sellerId))]
    sellerIds.forEach((sId) => {
      db.data.notifications.unshift({
        id: `notif_${Date.now()}_${sId}`,
        role: 'seller',
        userId: sId,
        title: 'طلب جديد جاهز للتجهيز',
        message: `تم تأكيد دفع الطلب ${order.number}، يمكنك البدء في تجهيز الوسائل المطلوبة.`,
        type: 'order',
        link: '/seller/orders',
        read: false,
        createdAt: new Date().toISOString(),
      })
    })

    db.save()
    return order
  },

  async rejectPayment(orderId, { reason, notes = '', notify = true } = {}) {
    await delay(450)
    const order = db.data.orders.find((o) => o.id === orderId || o.number === orderId)
    if (!order) throw new Error('ERR_ORDER_NOT_FOUND')
    if (!order.payment) throw new Error('ERR_RECEIPT_NOT_FOUND')

    order.payment.status = 'rejected'
    order.payment.rejectReason = reason || 'المبلغ غير مطابق'
    order.payment.rejectNotes = notes
    order.payment.reviewedAt = new Date().toISOString()
    order.status = 'payment_rejected'

    order.timeline.push({
      status: 'payment_rejected',
      title: `تم رفض الإيصال: ${reason}`,
      description: notes,
      timestamp: new Date().toISOString(),
    })
    order.updatedAt = new Date().toISOString()

    if (notify) {
      db.data.notifications.unshift({
        id: `notif_${Date.now()}`,
        role: 'customer',
        userId: order.customerId,
        title: 'تنبيه بشأن إيصال الدفع',
        message: `تعذر قبول إيصال الدفع للطلب ${order.number}. السبب: ${reason}. ${notes ? `ملاحظة: ${notes}` : ''}`,
        type: 'payment',
        link: `/account/orders/${order.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    db.save()
    return order
  },
}

