import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { User } from '../../src/db/models/User.js'
import { Product } from '../../src/db/models/Product.js'
import { Order } from '../../src/db/models/Order.js'

let counter = 1
let cachedPasswordHash = null

export async function createUser(overrides = {}) {
  const num = counter++
  const role = overrides.role || 'customer'
  if (!cachedPasswordHash) {
    const salt = await bcrypt.genSalt(10)
    cachedPasswordHash = await bcrypt.hash('TestPass123!', salt)
  }
  const passwordHash = overrides.passwordHash || cachedPasswordHash

  const defaultUser = {
    name: overrides.name || (role === 'seller' ? 'البائعة الأولى' : `مستخدم تجريبي ${num}`),
    email: overrides.email || `user${num}@test.eg`,
    phone: overrides.phone || `010${String(num).padStart(8, '0')}`,
    passwordHash,
    role,
    status: 'active',
    emailVerified: true,
    governorate: 'القاهرة',
    city: 'مدينة نصر',
    address: 'شارع عباس العقاد',
  }

  if (role === 'seller') {
    defaultUser.seller = {
      displayName: { ar: defaultUser.name, en: 'First Seller' },
      bio: { ar: 'ورشة وسائل تعليمية للأطفال', en: 'Handmade nursery aids workshop' },
      stages: ['nursery', 'kg1'],
      materials: ['felt', 'fabric'],
      payoutWallet: defaultUser.phone,
    }
  }

  const user = await User.create({ ...defaultUser, ...overrides })
  return user
}

export async function createProduct(overrides = {}) {
  const num = counter++
  let sellerId = overrides.sellerId
  if (!sellerId) {
    const seller = await createUser({ role: 'seller' })
    sellerId = seller._id
  }

  const defaultProduct = {
    sellerId,
    sellerName: 'البائعة الأولى',
    categorySlug: 'alphabet-boards',
    name: {
      ar: `وسيلة حروف تعليمية ${num}`,
      en: `Alphabet Teaching Aid ${num}`,
    },
    slug: `product-${num}`,
    description: {
      ar: 'وسيلة تعليمية يدوية للأطفال من الجوخ',
      en: 'Handmade educational felt teaching aid',
    },
    price: 150,
    stock: 10,
    stage: 'nursery',
    stages: ['nursery', 'kg1'],
    materials: ['felt'],
    images: [{ key: `img_${num}`, url: `/storage/public/img_${num}.webp` }],
    published: true,
  }

  const product = await Product.create({ ...defaultProduct, ...overrides })
  return product
}

export async function createOrder(overrides = {}) {
  const num = counter++
  let customerId = overrides.customerId
  if (!customerId) {
    const customer = await createUser({ role: 'customer' })
    customerId = customer._id
  }

  let sellerId = overrides.sellerId
  if (!sellerId) {
    const seller = await createUser({ role: 'seller' })
    sellerId = seller._id
  }

  const defaultOrder = {
    number: `LH-2026-${String(num).padStart(3, '0')}`,
    customerId,
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: { ar: 'لوحة تفاعلية', en: 'Interactive Board' },
        qty: 1,
        unitPrice: 100,
        sellerId,
        commissionRate: 0.20,
        commissionAmount: 20,
        sellerNet: 80,
      },
    ],
    delivery: {
      name: 'سارة أحمد',
      phone: '01012345678',
      governorate: 'القاهرة',
      city: 'المعادي',
      address: 'شارع 9، مبنى 4',
    },
    subtotal: 100,
    shipping: 40,
    total: 140,
    status: 'pending_payment',
  }

  const order = await Order.create({ ...defaultOrder, ...overrides })
  return order
}

