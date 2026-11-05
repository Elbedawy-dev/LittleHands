import { db } from '../mocks/db'
import { delay } from '../utils'

/**
 * خدمة عمليات الإدارة المتقدمة (العملاء، إدارة التصنيفات)
 */
export const adminService = {
  async getCustomers({ q = '' } = {}) {
    await delay(300)
    let customers = db.data.users.filter((u) => u.role === 'customer')

    if (q) {
      const query = q.trim().toLowerCase()
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.nurseryName && c.nurseryName.toLowerCase().includes(query))
      )
    }

    return customers.map((c) => ({
      ...c,
      ordersCount: db.data.orders.filter((o) => o.customerId === c.id).length,
      totalSpent: db.data.orders
        .filter((o) => o.customerId === c.id && o.status !== 'payment_rejected')
        .reduce((sum, o) => sum + o.total, 0),
    }))
  },

  async updateCategory(id, values) {
    await delay(350)
    const index = db.data.categories.findIndex((c) => c.id === id || c.slug === id)
    if (index === -1) throw new Error('ERR_CATEGORY_NOT_FOUND')

    db.data.categories[index] = { ...db.data.categories[index], ...values }
    db.save()
    return db.data.categories[index]
  },

  async reorderCategories(ids) {
    await delay(300)
    const ordered = []
    ids.forEach((id) => {
      const cat = db.data.categories.find((c) => c.id === id || c.slug === id)
      if (cat) ordered.push(cat)
    })
    db.data.categories.forEach((cat) => {
      if (!ordered.some((o) => o.id === cat.id)) ordered.push(cat)
    })
    db.data.categories = ordered
    db.save()
    return [...db.data.categories]
  },
}

