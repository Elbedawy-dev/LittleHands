import { db } from '../mocks/db'
import { delay } from '../utils'

/**
 * خدمة طلبات التفصيل المخصص والتواصل مع الحاضنات
 */
export const contactService = {
  async sendCustomRequest({ name, phone, nurseryName = '', details }) {
    await delay(450)
    const request = {
      id: `req_${Date.now()}`,
      name,
      phone,
      nurseryName,
      details,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }

    if (!db.data.customRequests) {
      db.data.customRequests = []
    }
    db.data.customRequests.push(request)

    // إشعار للإدارة
    db.data.notifications.unshift({
      id: `notif_${Date.now()}`,
      role: 'admin',
      title: 'طلب تفصيل وسيلة خاصة جديد',
      message: `طلب من ${name} (${nurseryName || 'حضانة'})، هاتف: ${phone}`,
      type: 'custom_request',
      link: '/admin/orders',
      read: false,
      createdAt: new Date().toISOString(),
    })

    db.save()
    return { success: true, request }
  },
}

