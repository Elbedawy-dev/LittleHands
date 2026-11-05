import { db } from '../mocks/db'
import { delay } from '../utils'

/**
 * خدمة إدارة الوسائل التعليمية للبائعات والإدارة
 */
export const productService = {
  async createProduct(values) {
    await delay(450)
    const newId = `prod_${Date.now()}`
    const seller = db.data.users.find((u) => u.id === values.sellerId) || { name: 'البائعة الأولى', nameEn: 'First Seller' }

    const newProduct = {
      id: newId,
      name: values.name,
      nameEn: values.nameEn || '',
      slug: (values.nameEn || values.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9\u0621-\u064A]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      categoryId: values.categoryId,
      sellerId: values.sellerId,
      sellerName: seller.name,
      sellerNameEn: seller.nameEn || (seller.id === 'seller_2' ? 'Second Seller' : 'First Seller'),
      price: Number(values.price) || 0,
      description: values.description || '',
      stages: values.stages || ['nursery'],
      materials: values.materials || ['felt'],
      images: values.images && values.images.length > 0 ? values.images : [],
      inStock: values.inStock !== false,
      stockCount: Number(values.stockCount) || 10,
      isPublished: values.isPublished !== false,
      isFeatured: !!values.isFeatured,
      createdAt: new Date().toISOString(),
    }

    db.data.products.unshift(newProduct)
    db.save()
    return newProduct
  },

  async updateProduct(id, values) {
    await delay(400)
    const index = db.data.products.findIndex((p) => p.id === id)
    if (index === -1) throw new Error('ERR_PRODUCT_NOT_FOUND')

    const updated = {
      ...db.data.products[index],
      ...values,
      price: values.price !== undefined ? Number(values.price) : db.data.products[index].price,
      stockCount: values.stockCount !== undefined ? Number(values.stockCount) : db.data.products[index].stockCount,
    }

    db.data.products[index] = updated
    db.save()
    return updated
  },

  async deleteProduct(id) {
    await delay(350)
    const initialLen = db.data.products.length
    db.data.products = db.data.products.filter((p) => p.id !== id)
    if (db.data.products.length === initialLen) {
      throw new Error('ERR_PRODUCT_NOT_FOUND')
    }
    db.save()
    return { success: true }
  },

  async setPublished(id, bool) {
    await delay(300)
    const product = db.data.products.find((p) => p.id === id)
    if (!product) throw new Error('ERR_PRODUCT_NOT_FOUND')
    product.isPublished = bool
    db.save()
    return product
  },

  async uploadImages(files) {
    await delay(500)
    // محاكاة رفع الصور مع تحويلها إلى مسارات أو Data URLs
    const uploadedUrls = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (typeof file === 'string') {
        uploadedUrls.push(file)
      } else {
        uploadedUrls.push(URL.createObjectURL(file))
      }
    }
    return uploadedUrls
  },

  async getManageableProducts({ sellerId, q = '', status = 'all' } = {}) {
    await delay(350)
    let list = [...db.data.products]

    if (sellerId) {
      list = list.filter((p) => p.sellerId === sellerId)
    }

    if (q) {
      const query = q.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(query))
    }

    if (status === 'published') {
      list = list.filter((p) => p.isPublished)
    } else if (status === 'draft') {
      list = list.filter((p) => !p.isPublished)
    } else if (status === 'out_of_stock') {
      list = list.filter((p) => !p.inStock || p.stockCount === 0)
    }

    return list
  },
}

