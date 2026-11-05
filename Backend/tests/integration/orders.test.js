import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct, createOrder } from '../helpers/factories.js'
import { Product } from '../../src/db/models/Product.js'
import { Order } from '../../src/db/models/Order.js'
import { Setting } from '../../src/db/models/Setting.js'
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

      const res = await sellerAgent.get('/api/v1/orders/seller/list')
      expect(res.status).toBe(200)

      const myOrder = res.body.data.items.find((o) => o.id === order._id.toString())
      expect(myOrder).toBeDefined()
      expect(myOrder.delivery.city).toBe('***')
      expect(myOrder.delivery.phone).toBe('01*********')
      expect(myOrder.delivery.address).toContain('محجوب حتى تأكيد الدفع')
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

      const res = await sellerAgent.get('/api/v1/orders/seller/list')
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
        .patch(`/api/v1/orders/${order._id}/fulfillment`)
        .send({ status: 'preparing' })
      expect(res1.status).toBe(200)
      expect(res1.body.data.status).toBe('preparing')

      // Step 2: Seller 1 sets shipped, but Seller 2 is still pending -> overall remains 'preparing'
      const res2 = await sellerAgent1
        .patch(`/api/v1/orders/${order._id}/fulfillment`)
        .send({ status: 'shipped' })
      expect(res2.status).toBe(200)
      expect(res2.body.data.status).toBe('preparing')

      // Step 3: Seller 2 sets shipped -> ALL sellers shipped -> overall becomes 'shipped'
      const res3 = await sellerAgent2
        .patch(`/api/v1/orders/${order._id}/fulfillment`)
        .send({ status: 'shipped' })
      expect(res3.status).toBe(200)
      expect(res3.body.data.status).toBe('shipped')

      const dbOrder = await Order.findById(order._id)
      expect(dbOrder.status).toBe('shipped')
    })

    it('rejects seller fulfillment update before payment_confirmed', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const order = await createOrder({
        sellerId: seller._id,
        status: 'pending_payment',
        sellerFulfillment: [{ sellerId: seller._id, status: 'pending', updatedAt: new Date() }],
      })

      const res = await sellerAgent
        .patch(`/api/v1/orders/${order._id}/fulfillment`)
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
})
