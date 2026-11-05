import { GOVERNORATES, ORDER_STATUS } from '../config/constants'
import { db } from '../mocks/db'
import { delay, generateOrderNumber } from '../utils'

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('lh_current_user'))
  } catch {
    return null
  }
}

/**
 * خدمة الطلبات وإدارة دورة حياة الشراء والدفع
 */
export const orderService = {
  async createOrder({ items, delivery, notes = '', governorate = '' }) {
    await delay(450)
    const currentUser = getCurrentUser()
    const customerId = currentUser ? currentUser.id : ''

    // حساب تكلفة الشحن حسب المحافظة
    const selectedGov = GOVERNORATES.find(
      (g) => g.name === (governorate || delivery.governorate)
    )
    const shipping = selectedGov ? selectedGov.shippingRate : 40

    const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.qty, 0)
    const total = subtotal + shipping

    const orderId = `ord_${Date.now()}`
    const orderNumber = generateOrderNumber(db.data.orders.length + 101)

    const newOrder = {
      id: orderId,
      number: orderNumber,
      customerId,
      items: items.map((it) => ({
        productId: it.productId || it.id,
        name: it.name,
        qty: it.qty || 1,
        unitPrice: it.unitPrice || it.price,
        sellerId: it.sellerId || 'seller_1',
        image: it.image || (it.images && it.images[0]) || '',
      })),
      delivery: {
        name: delivery.name,
        phone: delivery.phone,
        governorate: delivery.governorate || governorate,
        city: delivery.city || '',
        address: delivery.address || '',
        nurseryName: delivery.nurseryName || '',
      },
      subtotal,
      shipping,
      total,
      status: 'pending_payment',
      payment: null,
      timeline: [
        {
          status: 'pending_payment',
          title: 'تم إنشاء الطلب وبانتظار تحويل فودافون كاش ورفع الإيصال',
          timestamp: new Date().toISOString(),
        },
      ],
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    db.data.orders.unshift(newOrder)

    // إضافة إشعار للإدارة بوجود طلب جديد
    db.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      role: 'admin',
      title: 'طلب جديد مسجل بالمنصة',
      message: `طلب جديد ${orderNumber} بانتظار تحويل فودافون كاش من العميل.`,
      type: 'order',
      link: '/admin/orders',
      read: false,
      createdAt: new Date().toISOString(),
    })

    db.save()
    return newOrder
  },

  async submitPayment(orderId, { senderPhone, reference, transferredAmount, screenshotFile }) {
    await delay(500)
    const order = db.data.orders.find((o) => o.id === orderId || o.number === orderId)
    if (!order) throw new Error('ERR_ORDER_NOT_FOUND')

    const screenshotUrl = typeof screenshotFile === 'string'
      ? screenshotFile
      : screenshotFile ? URL.createObjectURL(screenshotFile) : ''

    order.payment = {
      senderPhone,
      reference,
      transferredAmount: Number(transferredAmount) || order.total,
      screenshotUrl,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    }

    order.timeline.push({
      status: 'pending_payment',
      title: 'تم إرفاق إيصال تحويل فودافون كاش وبانتظار مراجعة الإدارة',
      timestamp: new Date().toISOString(),
    })
    order.updatedAt = new Date().toISOString()

    // إشعار للإدارة
    db.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      role: 'admin',
      title: 'إيصال فودافون كاش جديد للمراجعة',
      message: `تم رفع إيصال للطلب ${order.number} بمبلغ ${transferredAmount || order.total} ج.م.`,
      type: 'payment',
      link: '/admin/payments',
      read: false,
      createdAt: new Date().toISOString(),
    })

    db.save()
    return order
  },

  async getMyOrders() {
    await delay(350)
    const user = getCurrentUser()
    if (!user) return []
    return db.data.orders.filter((o) => o.customerId === user.id)
  },

  async getOrder(id) {
    await delay(300)
    const order = db.data.orders.find((o) => o.id === id || o.number === id)
    if (!order) throw new Error('ERR_ORDER_NOT_FOUND')
    return order
  },

  async getSellerOrders({ status = 'all', q = '' } = {}) {
    await delay(350)
    const user = getCurrentUser()
    const sellerId = user && user.role === 'seller' ? user.id : 'seller_1'

    let orders = db.data.orders.filter((o) =>
      o.items.some((item) => item.sellerId === sellerId)
    )

    if (status !== 'all') {
      orders = orders.filter((o) => o.status === status)
    }

    if (q) {
      const query = q.trim().toLowerCase()
      orders = orders.filter(
        (o) =>
          o.number.toLowerCase().includes(query) ||
          o.delivery.name.toLowerCase().includes(query) ||
          (o.delivery.nurseryName && o.delivery.nurseryName.toLowerCase().includes(query))
      )
    }

    return orders
  },

  async setSellerOrderStatus(orderId, newStatus) {
    await delay(400)
    if (newStatus !== 'preparing' && newStatus !== 'shipped') {
      throw new Error('ERR_UNAUTHORIZED')
    }

    const order = db.data.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('ERR_ORDER_NOT_FOUND')

    // قاعدة العمل: لا يمكن للبائعة تغيير الحالة إلا بعد تأكيد الدفع من الإدارة
    if (order.status !== 'payment_confirmed' && order.status !== 'preparing') {
      throw new Error('ERR_PAYMENT_REQUIRED')
    }

    order.status = newStatus
    order.timeline.push({
      status: newStatus,
      title: ORDER_STATUS[newStatus].label,
      timestamp: new Date().toISOString(),
    })
    order.updatedAt = new Date().toISOString()

    db.save()
    return order
  },

  async getAllOrders(filters = {}) {
    await delay(350)
    let list = [...db.data.orders]

    if (filters.status && filters.status !== 'all') {
      list = list.filter((o) => o.status === filters.status)
    }

    if (filters.q) {
      const q = filters.q.trim().toLowerCase()
      list = list.filter(
        (o) =>
          o.number.toLowerCase().includes(q) ||
          o.delivery.name.toLowerCase().includes(q) ||
          o.delivery.phone.includes(q)
      )
    }

    return list
  },

  async updateOrderStatus(id, status) {
    await delay(350)
    const order = db.data.orders.find((o) => o.id === id)
    if (!order) throw new Error('ERR_ORDER_NOT_FOUND')

    order.status = status
    order.timeline.push({
      status,
      title: ORDER_STATUS[status] ? ORDER_STATUS[status].label : status,
      timestamp: new Date().toISOString(),
    })
    order.updatedAt = new Date().toISOString()

    db.save()
    return order
  },
}

