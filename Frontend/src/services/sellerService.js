import { CATEGORIES } from '../config/constants'
import { db } from '../mocks/db'
import { delay } from '../utils'

/**
 * خدمة البائعات والورش اليدوية الشريكة
 */
export const sellerService = {
  async getSellers() {
    await delay(300)
    return db.data.users
      .filter((u) => u.role === 'seller')
      .map((s) => {
        const sellerProducts = db.data.products.filter((p) => p.sellerId === s.id && p.isPublished)
        const categoryIds = [...new Set(sellerProducts.map((p) => p.categoryId).filter(Boolean))]
        const categories = categoryIds.map((cid) => CATEGORIES.find((c) => c.id === cid)).filter(Boolean)
        const completedOrdersCount = (db.data.orders || []).filter(
          (o) => o.status === 'delivered' && o.items?.some((it) => it.sellerId === s.id)
        ).length

        return {
          ...s,
          productsCount: sellerProducts.length,
          categoryIds,
          categories,
          completedOrdersCount,
        }
      })
  },

  async getSeller(id) {
    await delay(300)
    const seller = db.data.users.find((u) => u.id === id && u.role === 'seller')
    if (!seller) {
      throw new Error('ERR_SELLER_NOT_FOUND')
    }
    const sellerProducts = db.data.products.filter((p) => p.sellerId === id && p.isPublished)
    const categoryIds = [...new Set(sellerProducts.map((p) => p.categoryId).filter(Boolean))]
    const categories = categoryIds.map((cid) => CATEGORIES.find((c) => c.id === cid)).filter(Boolean)
    const completedOrdersCount = (db.data.orders || []).filter(
      (o) => o.status === 'delivered' && o.items?.some((it) => it.sellerId === id)
    ).length

    return {
      ...seller,
      productsCount: sellerProducts.length,
      categoryIds,
      categories,
      completedOrdersCount,
    }
  },

  async getSellerProducts(id) {
    await delay(350)
    return db.data.products.filter((p) => p.sellerId === id && p.isPublished)
  },

  async updateSellerProfile(id, data) {
    await delay(400)
    const index = db.data.users.findIndex((u) => u.id === id && u.role === 'seller')
    if (index === -1) throw new Error('ERR_SELLER_NOT_FOUND')

    const updated = { ...db.data.users[index], ...data }
    db.data.users[index] = updated
    db.save()
    return updated
  },
}
