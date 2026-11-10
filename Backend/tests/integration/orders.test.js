import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct, createOrder } from '../helpers/factories.js'
import { Product } from '../../src/db/models/Product.js'
import { Order } from '../../src/db/models/Order.js'
import { Payment } from '../../src/db/models/Payment.js'
import { AuditLog } from '../../src/db/models/AuditLog.js'
import { Setting } from '../../src/db/models/Setting.js'
import { storage } from '../../src/infra/storage/index.js'
import { env } from '../../src/config/env.js'
import { cancelExpiredUnpaidOrders } from '../../src/modules/orders/service.js'

const app = createApp()

function findKeysRecursively(obj, forbiddenKeys, path = '') {
  const matches = []
  if (!obj || typeof obj !== 'object') return matches

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key
    if (forbiddenKeys.includes(key)) {
      matches.push(currentPath)
    }
    if (value && typeof value === 'object') {
      matches.push(...findKeysRecursively(value, forbiddenKeys, currentPath))
    }
  }
  return matches
}

describe('Orders Module Integration Tests', () => {
  beforeEach(async () => {
    await Setting.findOneAndUpdate(
      { singletonKey: 'platform_settings' },
      {
        commissionRate: 0.20,
        shippingRates: [
          { zone: 'greater_cairo', price: 40, governorates: ['القاهرة'] },
          { zone: 'alexandria', price: 50, governorates: ['الإسكندرية'] },
        ],
      },
      { upsert: true, new: true }
    )
  })

  describe('POST /api/v1/orders (Order Creation)', () => {
    it('creates an order, decrements stock atomically, and snapshots commission', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller', status: 'active' })
      const product = await createProduct({ sellerId: seller._id, price: 150, stock: 10 })

      const payload = {
        items: [{ productId: product._id.toString(), qty: 2 }],
        delivery: {
          name: 'منى محمود',
          phone: '01123456789',
          governorate: 'القاهرة',
          city: 'المعادي',
          address: 'شارع 105، مبنى 12',
          nurseryName: 'حضانة الأمل',
        },
        notes: 'الرجاء الاتصال قبل الوصول',
      }

      const res = await customerAgent.post('/api/v1/orders').send(payload)
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)

      const orderData = res.body.data
      expect(orderData.number).toMatch(/^LH-\d{4}-\d{3}$/)
      expect(orderData.status).toBe('pending_payment')
      expect(orderData.subtotal).toBe(300) // 150 * 2
      expect(orderData.shipping).toBe(40) // Cairo shipping rate
      expect(orderData.total).toBe(340)
      expect(orderData.customerId).toBe(customer._id.toString())

      // Verify stock was decremented
      const updatedProduct = await Product.findById(product._id)
      expect(updatedProduct.stock).toBe(8)

      // Verify database stored commission snapshot
      const dbOrder = await Order.findById(orderData.id)
      expect(dbOrder.items[0].commissionRate).toBe(0.20)
      expect(dbOrder.items[0].commissionAmount).toBe(60) // 300 * 0.20
      expect(dbOrder.items[0].sellerNet).toBe(240) // 300 - 60
    })

    it('recomputes totals server-side even if client passes manipulated prices', async () => {
      const { agent: customerAgent } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller', status: 'active' })
      const product = await createProduct({ sellerId: seller._id, price: 200, stock: 5 })

      const payload = {
        items: [{ productId: product._id.toString(), qty: 1, unitPrice: 1 }], // Client tries to cheat price
        delivery: {
          name: 'سارة خالد',
          phone: '01012345678',
          governorate: 'الإسكندرية',
          city: 'سموحة',
          address: 'شارع فوزي معاذ',
        },
      }

      const res = await customerAgent.post('/api/v1/orders').send(payload)
      expect(res.status).toBe(201)
      expect(res.body.data.subtotal).toBe(200) // Recomputed correctly from DB
      expect(res.body.data.shipping).toBe(50) // Alexandria shipping rate
      expect(res.body.data.total).toBe(250)
    })

    it('preserves snapshot commission even after Setting commissionRate is changed', async () => {
      const { agent: customerAgent } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller', status: 'active' })
      const product = await createProduct({ sellerId: seller._id, price: 100, stock: 5 })

      const res = await customerAgent.post('/api/v1/orders').send({
        items: [{ productId: product._id.toString(), qty: 1 }],
        delivery: {
          name: 'هدى كريم',
          phone: '01211223344',
          governorate: 'القاهرة',
          city: 'الزمالك',
          address: 'شارع 26 يوليو',
        },
      })
      expect(res.status).toBe(201)
      const orderId = res.body.data.id

      // Platform modifies commission rate from 20% to 30%
      await Setting.findOneAndUpdate(
        { singletonKey: 'platform_settings' },
        { commissionRate: 0.30 }
      )

      const dbOrder = await Order.findById(orderId)
      expect(dbOrder.items[0].commissionRate).toBe(0.20)
      expect(dbOrder.items[0].commissionAmount).toBe(20)
      expect(dbOrder.items[0].sellerNet).toBe(80)
    })

    it('stock race condition: Promise.all for last remaining unit allows exactly one order to succeed', async () => {
      const { agent: agentA } = await authedAgent(app, 'customer')
      const { agent: agentB } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller', status: 'active' })

      // Product with only 1 unit in stock
      const product = await createProduct({ sellerId: seller._id, price: 100, stock: 1 })

      const makeOrder = (agent) =>
        agent.post('/api/v1/orders').send({
          items: [{ productId: product._id.toString(), qty: 1 }],
          delivery: {
            name: 'متسابق المخزون',
            phone: '01011112222',
            governorate: 'القاهرة',
            city: 'المعادي',
            address: 'شارع دجلة',
          },
        })

      const [res1, res2] = await Promise.all([makeOrder(agentA), makeOrder(agentB)])

      const statuses = [res1.status, res2.status].sort()
      expect(statuses).toEqual([201, 422])

      const finalProduct = await Product.findById(product._id)
      expect(finalProduct.stock).toBe(0)
    })

    it('idempotency key returns identical order without double decrementing stock', async () => {
      const { agent: customerAgent } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller', status: 'active' })
      const product = await createProduct({ sellerId: seller._id, price: 120, stock: 10 })

      const idemKey = 'order_idem_key_12345'
      const payload = {
        items: [{ productId: product._id.toString(), qty: 2 }],
        delivery: {
          name: 'مها علي',
          phone: '01511112233',
          governorate: 'القاهرة',
          city: 'الرحاب',
          address: 'مجموعة 12، مبنى 5',
        },
      }

      // First submit
      const res1 = await customerAgent
        .post('/api/v1/orders')
        .set('Idempotency-Key', idemKey)
        .send(payload)
      expect(res1.status).toBe(201)
      const orderId1 = res1.body.data.id

      // Second submit with same Idempotency-Key
      const res2 = await customerAgent
        .post('/api/v1/orders')
        .set('Idempotency-Key', idemKey)
        .send(payload)
      expect([200, 201]).toContain(res2.status)
      expect(res2.body.data.id).toBe(orderId1)

      // Stock should only be decremented once (10 - 2 = 8, not 6)
      const finalProduct = await Product.findById(product._id)
      expect(finalProduct.stock).toBe(8)
    })

    it('enforces requireVerified when REQUIRE_EMAIL_VERIFICATION=true', async () => {
      const orig = env.REQUIRE_EMAIL_VERIFICATION
      try {
        env.REQUIRE_EMAIL_VERIFICATION = true
        const { agent: unverifiedAgent } = await authedAgent(app, 'customer', { emailVerified: false })
        const p = await createProduct({ stock: 5 })

        const res = await unverifiedAgent.post('/api/v1/orders').send({
          items: [{ productId: p._id.toString(), qty: 1 }],
          delivery: {
            name: 'عميلة غير مؤكدة',
            phone: '01011112222',
            governorate: 'القاهرة',
            city: 'المعادي',
            address: 'شارع 9',
          },
        })

        expect(res.status).toBe(403)
        expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED')
      } finally {
        env.REQUIRE_EMAIL_VERIFICATION = orig
      }
    })

    it('seller creates and publishes product through manage API, customer orders it, admin suspends seller, product disappears from public API', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      // 1. Seller creates product as draft via manage API
      const createRes = await sellerAgent.post('/api/v1/products/manage/products').send({
        name: { ar: 'لوحة تفاعلية جديدة', en: 'New Interactive Board' },
        description: { ar: 'وصف الوسيلة التعليمية بالجوخ', en: 'Handmade educational felt board' },
        price: 250,
        stock: 5,
        categoryId: 'alphabet-boards',
        stages: ['nursery'],
        materials: ['felt'],
        images: ['/storage/public/test_img.webp'],
        published: false,
      })
      expect([200, 201]).toContain(createRes.status)
      const prodId = createRes.body.data.id

      // 2. Seller publishes product via manage API
      const pubRes = await sellerAgent
        .patch(`/api/v1/products/manage/products/${prodId}/publish`)
        .send({ published: true })
      expect(pubRes.status).toBe(200)

      // 3. Product is visible in public catalog
      const pubCatalogRes = await customerAgent.get(`/api/v1/catalog/products/${prodId}`)
      expect(pubCatalogRes.status).toBe(200)
      expect(pubCatalogRes.body.data.id).toBe(prodId)

      // 4. Customer successfully places an order for the product
      const orderRes = await customerAgent.post('/api/v1/orders').send({
        items: [{ productId: prodId, qty: 1 }],
        delivery: {
          name: customer.name,
          phone: customer.phone,
          governorate: 'القاهرة',
          city: 'مدينة نصر',
          address: 'شارع عباس العقاد',
        },
      })
      expect(orderRes.status).toBe(201)

      // 5. Admin suspends the seller
      const suspendRes = await adminAgent
        .patch(`/api/v1/admin/users/${seller._id}/status`)
        .send({ status: 'suspended' })
      expect(suspendRes.status).toBe(200)

      // 6. Product disappears from public catalog API (returns 404)
      const postSuspendRes = await customerAgent.get(`/api/v1/catalog/products/${prodId}`)
      expect(postSuspendRes.status).toBe(404)

      // And excluded from public catalog list
      const catalogListRes = await customerAgent.get('/api/v1/catalog/products')
      const foundInList = catalogListRes.body.data.items.some((item) => item.id === prodId)
      expect(foundInList).toBe(false)
    })
  })

  describe('Object-Level Authorization & IDOR', () => {
    it('returns 404 when customer B attempts to view customer A order', async () => {
      const { agent: agentA, user: userA } = await authedAgent(app, 'customer')
      const { agent: agentB } = await authedAgent(app, 'customer')

      const order = await createOrder({ customerId: userA._id })

      // Customer A views own order -> 200
      const resA = await agentA.get(`/api/v1/orders/${order._id}`)
      expect(resA.status).toBe(200)

      // Customer B attempts to view A order -> 404 (not 403)
      const resB = await agentB.get(`/api/v1/orders/${order._id}`)
      expect(resB.status).toBe(404)
    })

    it('returns 404 when seller attempts to view order not containing her products', async () => {
      const seller1 = await createUser({ role: 'seller', status: 'active' })
      const { agent: sellerAgent2 } = await authedAgent(app, 'seller')

      const order = await createOrder({ sellerId: seller1._id })

      const res = await sellerAgent2.get(`/api/v1/orders/${order._id}`)
      expect(res.status).toBe(404)
    })
  })

  describe('Seller Views & Delivery Masking', () => {
    it('masks delivery address and phone for seller before payment confirmation', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const order = await createOrder({
        sellerId: seller._id,
        status: 'pending_payment',
        delivery: {
          name: 'سميرة سعيد',
          phone: '01012345678',
          governorate: 'القاهرة',
          city: 'المهندسين',
          address: 'شارع جامعة الدول العربية رقم 15',
        },
      })

      const res = await sellerAgent.get('/api/v1/orders/seller')
      expect(res.status).toBe(200)

      const myOrder = res.body.data.items.find((o) => o.id === order._id.toString())
      expect(myOrder).toBeDefined()
      expect(myOrder.delivery.masked).toBe(true)
      expect(myOrder.delivery.city).toBeNull()
      expect(myOrder.delivery.phone).toBeNull()
      expect(myOrder.delivery.address).toBeNull()
    })

    it('unmasks delivery information for seller once payment is confirmed', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const order = await createOrder({
        sellerId: seller._id,
        status: 'payment_confirmed',
        delivery: {
          name: 'سميرة سعيد',
          phone: '01012345678',
          governorate: 'القاهرة',
          city: 'المهندسين',
          address: 'شارع جامعة الدول العربية رقم 15',
        },
      })

      const res = await sellerAgent.get('/api/v1/orders/seller')
      expect(res.status).toBe(200)

      const myOrder = res.body.data.items.find((o) => o.id === order._id.toString())
      expect(myOrder).toBeDefined()
      expect(myOrder.delivery.city).toBe('المهندسين')
      expect(myOrder.delivery.phone).toBe('01012345678')
      expect(myOrder.delivery.address).toBe('شارع جامعة الدول العربية رقم 15')
    })
  })

  describe('Multi-Seller Fulfillment Derivation', () => {
    it('derives overall order status correctly across multiple sellers', async () => {
      const { agent: sellerAgent1, user: seller1 } = await authedAgent(app, 'seller')
      const { agent: sellerAgent2, user: seller2 } = await authedAgent(app, 'seller')

      const order = await createOrder({
        status: 'payment_confirmed',
        sellerFulfillment: [
          { sellerId: seller1._id, status: 'pending', updatedAt: new Date() },
          { sellerId: seller2._id, status: 'pending', updatedAt: new Date() },
        ],
        items: [
          {
            productId: (await createProduct({ sellerId: seller1._id }))._id,
            name: { ar: 'وسيلة 1', en: 'Item 1' },
            qty: 1,
            unitPrice: 100,
            sellerId: seller1._id,
            commissionRate: 0.20,
            commissionAmount: 20,
            sellerNet: 80,
          },
          {
            productId: (await createProduct({ sellerId: seller2._id }))._id,
            name: { ar: 'وسيلة 2', en: 'Item 2' },
            qty: 1,
            unitPrice: 100,
            sellerId: seller2._id,
            commissionRate: 0.20,
            commissionAmount: 20,
            sellerNet: 80,
          },
        ],
      })

      // Step 1: Seller 1 sets preparing -> overall status becomes 'preparing'
      const res1 = await sellerAgent1
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'preparing' })
      expect(res1.status).toBe(200)
      expect(res1.body.data.status).toBe('preparing')

      // Step 2: Seller 1 sets shipped, but Seller 2 is still pending -> overall remains 'preparing'
      const res2 = await sellerAgent1
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'shipped' })
      expect(res2.status).toBe(200)
      expect(res2.body.data.status).toBe('preparing')

      // Step 3: Seller 2 sets preparing -> overall remains 'preparing'
      const res3 = await sellerAgent2
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'preparing' })
      expect(res3.status).toBe(200)
      expect(res3.body.data.status).toBe('preparing')

      // Step 4: Seller 2 sets shipped -> ALL sellers shipped -> overall becomes 'shipped'
      const res4 = await sellerAgent2
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'shipped' })
      expect(res4.status).toBe(200)
      expect(res4.body.data.status).toBe('shipped')

      // Step 5: Seller 2 cannot revert from shipped to preparing (illegal backward transition)
      const resRevert = await sellerAgent2
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'preparing' })
      expect(resRevert.status).toBe(422)

      const dbOrder = await Order.findById(order._id)
      expect(dbOrder.status).toBe('shipped')
    })

    it('rejects seller jumping pending -> shipped or seller2 updating seller1 order (IDOR)', async () => {
      const { agent: sellerAgent1, user: seller1 } = await authedAgent(app, 'seller')
      const { agent: sellerAgent2 } = await authedAgent(app, 'seller')

      const order = await createOrder({
        sellerId: seller1._id,
        status: 'payment_confirmed',
        sellerFulfillment: [{ sellerId: seller1._id, status: 'pending', updatedAt: new Date() }],
      })

      // Seller 2 cannot update Seller 1's fulfillment -> 404
      const idorRes = await sellerAgent2
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'preparing' })
      expect(idorRes.status).toBe(404)

      // Seller 1 cannot skip 'preparing' and jump straight from 'pending' to 'shipped' -> 422
      const skipRes = await sellerAgent1
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'shipped' })
      expect(skipRes.status).toBe(422)
    })

    it('enforces every legal and illegal Admin state machine transition', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller', status: 'active' })
      const product = await createProduct({ sellerId: seller._id, stock: 10 })

      const order = await createOrder({
        sellerId: seller._id,
        status: 'pending_payment',
        sellerFulfillment: [{ sellerId: seller._id, status: 'pending', updatedAt: new Date() }],
        items: [
          {
            productId: product._id,
            name: { ar: 'وسيلة', en: 'Aid' },
            qty: 1,
            unitPrice: 100,
            sellerId: seller._id,
            commissionRate: 0.20,
            commissionAmount: 20,
            sellerNet: 80,
          },
        ],
      })

      // Illegal jump: pending_payment -> delivered (422)
      const illegalJump = await adminAgent
        .patch(`/api/v1/orders/admin/${order._id}/status`)
        .send({ status: 'delivered' })
      expect(illegalJump.status).toBe(422)

      // Legal: pending_payment -> payment_rejected -> pending_payment -> payment_confirmed -> preparing -> shipped -> delivered
      expect(
        (await adminAgent.patch(`/api/v1/orders/admin/${order._id}/status`).send({ status: 'payment_rejected' })).status
      ).toBe(200)
      expect(
        (await adminAgent.patch(`/api/v1/orders/admin/${order._id}/status`).send({ status: 'pending_payment' })).status
      ).toBe(200)
      expect(
        (await adminAgent.patch(`/api/v1/orders/admin/${order._id}/status`).send({ status: 'payment_confirmed' })).status
      ).toBe(200)
      expect(
        (await adminAgent.patch(`/api/v1/orders/admin/${order._id}/status`).send({ status: 'preparing' })).status
      ).toBe(200)
      expect(
        (await adminAgent.patch(`/api/v1/orders/admin/${order._id}/status`).send({ status: 'shipped' })).status
      ).toBe(200)
      expect(
        (await adminAgent.patch(`/api/v1/orders/admin/${order._id}/status`).send({ status: 'delivered' })).status
      ).toBe(200)

      // Terminal state: delivered cannot transition to cancelled or preparing (422)
      expect(
        (await adminAgent.patch(`/api/v1/orders/admin/${order._id}/status`).send({ status: 'cancelled' })).status
      ).toBe(422)
      expect(
        (await adminAgent.post(`/api/v1/orders/admin/${order._id}/cancel`).send({ reason: 'Too late' })).status
      ).toBe(422)
    })

    it('compensates (restores) stock if a later item in a multi-item order fails stock check', async () => {
      const { agent: customerAgent } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller', status: 'active' })
      const prod1 = await createProduct({ sellerId: seller._id, price: 100, stock: 5 })
      const prod2 = await createProduct({ sellerId: seller._id, price: 100, stock: 1 })

      const res = await customerAgent.post('/api/v1/orders').send({
        items: [
          { productId: prod1._id.toString(), qty: 2 },
          { productId: prod2._id.toString(), qty: 3 }, // Exceeds stock of 1!
        ],
        delivery: {
          name: 'عميلة تعويض المخزون',
          phone: '01012345678',
          governorate: 'القاهرة',
          city: 'المعادي',
          address: 'شارع النصر رقم 10',
        },
      })

      expect(res.status).toBe(422)
      // Verify prod1 stock was compensated back to 5!
      const checkProd1 = await Product.findById(prod1._id)
      expect(checkProd1.stock).toBe(5)
    })

    it('rejects seller fulfillment update before payment_confirmed', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const order = await createOrder({
        sellerId: seller._id,
        status: 'pending_payment',
        sellerFulfillment: [{ sellerId: seller._id, status: 'pending', updatedAt: new Date() }],
      })

      const res = await sellerAgent
        .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
        .send({ status: 'preparing' })
      expect(res.status).toBe(422)
    })
  })

  describe('Order Cancellation & Stock Restoration', () => {
    it('restores stock when customer cancels an unpaid order', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller', status: 'active' })
      const product = await createProduct({ sellerId: seller._id, price: 100, stock: 5 })

      const order = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'pending_payment',
        items: [
          {
            productId: product._id,
            name: { ar: 'منتج', en: 'Product' },
            qty: 2,
            unitPrice: 100,
            sellerId: seller._id,
            commissionRate: 0.20,
            commissionAmount: 40,
            sellerNet: 160,
          },
        ],
      })

      // Decrement product stock as if created
      await Product.updateOne({ _id: product._id }, { $inc: { stock: -2 } })

      const res = await customerAgent.post(`/api/v1/orders/${order._id}/cancel`).send({
        reason: 'تغيير الطلب',
      })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('cancelled')

      const updatedProduct = await Product.findById(product._id)
      expect(updatedProduct.stock).toBe(5) // Restored back to 5
    })

    it('forbids customer from cancelling an order after payment confirmation', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const order = await createOrder({
        customerId: customer._id,
        status: 'payment_confirmed',
      })

      const res = await customerAgent.post(`/api/v1/orders/${order._id}/cancel`).send({
        reason: 'إلغاء متأخر',
      })
      expect(res.status).toBe(422)
    })
  })

  describe('Recursive Privacy Scan (Forbidden Keys in DTOs)', () => {
    it('ensures customer responses contain zero commission/net fields', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller' })
      const order = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'pending_payment',
      })

      const res = await customerAgent.get(`/api/v1/orders/${order._id}`)
      expect(res.status).toBe(200)

      const forbiddenKeys = ['commissionRate', 'commissionAmount', 'sellerNet']
      const leaked = findKeysRecursively(res.body.data, forbiddenKeys)
      expect(leaked).toEqual([])
    })

    it('ensures seller responses contain zero payment data', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const order = await createOrder({
        sellerId: seller._id,
        status: 'pending_payment',
      })

      const res = await sellerAgent.get(`/api/v1/orders/${order._id}`)
      expect(res.status).toBe(200)

      expect(res.body.data.payment).toBeNull()

      const forbiddenKeys = ['screenshotUrl', 'senderPhone', 'reference', 'transferredAmount', 'flags']
      const leaked = findKeysRecursively(res.body.data, forbiddenKeys)
      expect(leaked).toEqual([])
    })
  })

  describe('Background TTL Job (cancelExpiredUnpaidOrders)', () => {
    it('cancels orders in pending_payment older than TTL with no payment and restores stock', async () => {
      const customer = await createUser({ role: 'customer' })
      const seller = await createUser({ role: 'seller' })
      const product = await createProduct({ sellerId: seller._id, stock: 2 })

      // Create an expired order (created 72 hours ago)
      const oldDate = new Date(Date.now() - 72 * 60 * 60 * 1000)
      const order = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'pending_payment',
        createdAt: oldDate,
        items: [
          {
            productId: product._id,
            name: { ar: 'وسيلة منتهية', en: 'Expired Item' },
            qty: 2,
            unitPrice: 100,
            sellerId: seller._id,
            commissionRate: 0.20,
            commissionAmount: 40,
            sellerNet: 160,
          },
        ],
      })

      // Manually set createdAt in DB to oldDate
      await Order.updateOne({ _id: order._id }, { $set: { createdAt: oldDate } })

      const result = await cancelExpiredUnpaidOrders()
      expect(result.cancelledCount).toBeGreaterThanOrEqual(1)

      const updatedOrder = await Order.findById(order._id)
      expect(updatedOrder.status).toBe('cancelled')
      expect(updatedOrder.cancelReason).toBe('EXPIRED_UNPAID')

      // Stock was restored by 2
      const updatedProduct = await Product.findById(product._id)
      expect(updatedProduct.stock).toBe(4) // 2 + 2
    })
  })

  describe('Order Deletion (Admin) & Order Hiding (Seller)', () => {
    it('rejects deleting a confirmed order with 409 ORDER_NOT_DELETABLE', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const order = await createOrder({ status: 'payment_confirmed' })

      const resAr = await adminAgent
        .delete(`/api/v1/orders/admin/${order._id}`)
        .set('Accept-Language', 'ar')
      expect(resAr.status).toBe(409)
      expect(resAr.body.error.code).toBe('ORDER_NOT_DELETABLE')
      expect(resAr.body.error.message).toContain('لا يمكن حذف')

      const resEn = await adminAgent
        .delete(`/api/v1/orders/admin/${order._id}`)
        .set('Accept-Language', 'en')
      expect(resEn.status).toBe(409)
      expect(resEn.body.error.code).toBe('ORDER_NOT_DELETABLE')
      expect(resEn.body.error.message).toContain('cancelled and refunded')

      const stillExists = await Order.findById(order._id)
      expect(stillExists).not.toBeNull()
    })

    it('deletes a pending_payment order along with its payment, receipt, and records audit log', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const customer = await createUser({ role: 'customer' })
      const seller = await createUser({ role: 'seller' })
      const product = await createProduct({ sellerId: seller._id, stock: 5 })

      const order = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'pending_payment',
        items: [
          {
            productId: product._id,
            name: { ar: 'وسيلة للحذف', en: 'Deletable Item' },
            qty: 2,
            unitPrice: 100,
            sellerId: seller._id,
            commissionRate: 0.20,
            commissionAmount: 40,
            sellerNet: 160,
          },
        ],
      })

      const receiptKey = `payment_${Date.now()}_testreceipt.webp`
      storage._memoryStore.set(receiptKey, {
        buffer: Buffer.from('fake-receipt-content'),
        mime: 'image/webp',
        kind: 'payment',
        size: 20,
        hash: 'abc123sha256',
        key: receiptKey,
      })
      expect(storage.hasInMemory(receiptKey)).toBe(true)

      const payment = await Payment.create({
        orderId: order._id,
        customerId: customer._id,
        attempt: 1,
        senderPhone: '01012345678',
        reference: 'REF-DEL-001',
        transferredAmount: 240,
        expectedAmount: 240,
        screenshot: {
          key: receiptKey,
          sha256: 'abc123sha256',
          mime: 'image/webp',
          size: 20,
        },
        status: 'pending',
      })

      const res = await adminAgent.delete(`/api/v1/orders/admin/${order._id}`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.deleted).toBe(true)

      const deletedOrder = await Order.findById(order._id)
      expect(deletedOrder).toBeNull()

      const deletedPayment = await Payment.findById(payment._id)
      expect(deletedPayment).toBeNull()
      expect(storage.hasInMemory(receiptKey)).toBe(false)

      const restoredProduct = await Product.findById(product._id)
      expect(restoredProduct.stock).toBe(7)

      const auditEntry = await AuditLog.findOne({
        action: 'order.delete',
        entityId: order._id.toString(),
      })
      expect(auditEntry).not.toBeNull()
    })

    it('allows seller to hide an inactive order from her list without deleting it or affecting admin view', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      const order = await createOrder({
        sellerId: seller._id,
        status: 'delivered',
      })

      // Active order (preparing) cannot be hidden -> 409
      const activeOrder = await createOrder({
        sellerId: seller._id,
        status: 'preparing',
      })
      const activeRes = await sellerAgent.delete(`/api/v1/orders/seller/${activeOrder._id}`)
      expect(activeRes.status).toBe(409)
      expect(activeRes.body.error.code).toBe('ORDER_NOT_DELETABLE')

      // Inactive order (delivered) can be hidden -> 200
      const hideRes = await sellerAgent.delete(`/api/v1/orders/seller/${order._id}`)
      expect(hideRes.status).toBe(200)
      expect(hideRes.body.data.hidden).toBe(true)

      // Excluded from seller orders list
      const sellerListRes = await sellerAgent.get('/api/v1/orders/seller')
      expect(sellerListRes.status).toBe(200)
      const inSellerList = sellerListRes.body.data.items.some((o) => o.id === order._id.toString())
      expect(inSellerList).toBe(false)

      // Still exists in DB and visible to admin
      const dbOrder = await Order.findById(order._id)
      expect(dbOrder).not.toBeNull()
      expect(dbOrder.hiddenBySellers.map((id) => id.toString())).toContain(seller._id.toString())

      const adminGetRes = await adminAgent.get(`/api/v1/orders/admin/${order._id}`)
      expect(adminGetRes.status).toBe(200)
    })

    it('prevents seller from hiding another seller order (returns 404)', async () => {
      const seller1 = await createUser({ role: 'seller', status: 'active' })
      const { agent: sellerAgent2, user: seller2 } = await authedAgent(app, 'seller')

      const order = await createOrder({
        sellerId: seller1._id,
        status: 'cancelled',
      })

      const res = await sellerAgent2.delete(`/api/v1/orders/seller/${order._id}`)
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND')

      const dbOrder = await Order.findById(order._id)
      expect(dbOrder.hiddenBySellers.map((id) => id.toString())).not.toContain(seller2._id.toString())
    })
  })
})
