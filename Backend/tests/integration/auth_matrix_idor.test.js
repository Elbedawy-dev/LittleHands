import { describe, it, beforeEach, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createProduct, createOrder } from '../helpers/factories.js'
import { Address } from '../../src/db/models/Address.js'
import { Favorite } from '../../src/db/models/Favorite.js'
import { Notification } from '../../src/db/models/Notification.js'
import { Payment } from '../../src/db/models/Payment.js'
import { Payout } from '../../src/db/models/Payout.js'
import { storage } from '../../src/infra/storage/index.js'
import sharp from 'sharp'

describe('Comprehensive Authorization Matrix & IDOR Test Suite', () => {
  let app
  let guest
  let customer1, customer2
  let seller1, seller2
  let admin

  let product1, product2
  let order1
  let payment1
  let address1
  let notification1
  let privateFileKey

  beforeEach(async () => {
    app = createApp()

    // Setup guest agent
    guest = request.agent(app)
    guest.set('X-Requested-With', 'lh-web')
    guest.set('Origin', 'http://localhost:5173')

    // Setup authenticated agents
    customer1 = await authedAgent(app, 'customer', { name: 'Customer One', email: 'c1@test.eg' })
    customer2 = await authedAgent(app, 'customer', { name: 'Customer Two', email: 'c2@test.eg' })
    seller1 = await authedAgent(app, 'seller', { name: 'Seller One', email: 's1@test.eg' })
    seller2 = await authedAgent(app, 'seller', { name: 'Seller Two', email: 's2@test.eg' })
    admin = await authedAgent(app, 'admin', { name: 'Super Admin', email: 'admin@test.eg' })

    // Setup mock products
    product1 = await createProduct({
      sellerId: seller1.user._id,
      name: { ar: 'منتج البائعة الأولى', en: 'Seller 1 Product' },
      price: 150,
      stock: 10,
    })

    product2 = await createProduct({
      sellerId: seller2.user._id,
      name: { ar: 'منتج البائعة الثانية', en: 'Seller 2 Product' },
      price: 200,
      stock: 5,
    })

    // Setup mock order owned by customer1
    order1 = await createOrder({
      customerId: customer1.user._id,
      sellerId: seller1.user._id,
      subtotal: 150,
      shipping: 40,
      total: 190,
      items: [
        {
          productId: product1._id,
          name: product1.name,
          qty: 1,
          unitPrice: 150,
          sellerId: seller1.user._id,
          commissionRate: 0.2,
          commissionAmount: 30,
          sellerNet: 120,
        },
      ],
      sellerFulfillment: [
        {
          sellerId: seller1.user._id,
          status: 'pending',
        },
      ],
    })

    // Setup private file in storage
    const imgBuffer = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 10, g: 150, b: 200 } },
    }).png().toBuffer()

    const saved = await storage.saveImage(
      { buffer: imgBuffer, originalname: 'receipt.png' },
      { kind: 'payment', ownerId: customer1.user._id }
    )
    privateFileKey = saved.key

    payment1 = await Payment.create({
      orderId: order1._id,
      attempt: 1,
      senderPhone: '01012345678',
      reference: 'VF-TEST-12345',
      transferredAmount: 190,
      screenshot: { key: saved.key, url: saved.url, mime: 'image/webp', size: 100 },
      status: 'pending',
    })

    address1 = await Address.create({
      userId: customer1.user._id,
      name: 'منزل الدقي',
      phone: '01012345678',
      governorate: 'الجيزة',
      city: 'الدقي',
      address: 'شارع التحرير 15',
    })

    await Favorite.create({
      userId: customer1.user._id,
      productId: product1._id,
    })

    notification1 = await Notification.create({
      userId: customer1.user._id,
      role: 'customer',
      type: 'ORDER_STATUS',
      title: 'إشعار تجريبي',
      message: 'تم تأكيد طلبك',
    })

    await Payout.create({
      sellerId: seller1.user._id,
      sellerName: seller1.user.name,
      amount: 100,
      reference: `VF-PAYOUT-${Date.now()}`,
      date: '2026-11-01',
      recordedBy: admin.user._id,
    })
  })

  describe('1. Route Authorization Matrix', () => {
    it('Public endpoints are accessible by guest, customer, sellers, and admin', async () => {
      const endpoints = [
        '/api/v1/health',
        '/api/v1/catalog/categories',
        '/api/v1/catalog/products',
        '/api/v1/catalog/products/featured',
        `/api/v1/catalog/products/${product1._id}`,
        `/api/v1/catalog/products/${product1._id}/related`,
        '/api/v1/sellers',
        `/api/v1/sellers/${seller1.user._id}`,
        `/api/v1/sellers/${seller1.user._id}/products`,
        '/api/v1/settings',
      ]

      for (const endpoint of endpoints) {
        const resGuest = await guest.get(endpoint)
        expect([200, 304]).toContain(resGuest.status)

        const resCust = await customer1.agent.get(endpoint)
        expect([200, 304]).toContain(resCust.status)

        const resSeller = await seller1.agent.get(endpoint)
        expect([200, 304]).toContain(resSeller.status)

        const resAdmin = await admin.agent.get(endpoint)
        expect([200, 304]).toContain(resAdmin.status)
      }
    })

    it('Customer-restricted endpoints reject unauthenticated guests (401) and sellers (403)', async () => {
      // Favorites list
      const resGuestFav = await guest.get('/api/v1/users/favorites')
      expect(resGuestFav.status).toBe(401)

      const resSellerFav = await seller1.agent.get('/api/v1/users/favorites')
      expect(resSellerFav.status).toBe(403)

      const resCustFav = await customer1.agent.get('/api/v1/users/favorites')
      expect(resCustFav.status).toBe(200)

      // Customer orders list
      const resGuestOrders = await guest.get('/api/v1/orders/my')
      expect(resGuestOrders.status).toBe(401)

      const resSellerOrders = await seller1.agent.get('/api/v1/orders/my')
      expect(resSellerOrders.status).toBe(403)

      const resCustOrders = await customer1.agent.get('/api/v1/orders/my')
      expect(resCustOrders.status).toBe(200)

      // Saved addresses list
      const resGuestAddr = await guest.get('/api/v1/users/addresses')
      expect(resGuestAddr.status).toBe(401)

      const resSellerAddr = await seller1.agent.get('/api/v1/users/addresses')
      expect(resSellerAddr.status).toBe(403)

      const resCustAddr = await customer1.agent.get('/api/v1/users/addresses')
      expect(resCustAddr.status).toBe(200)
    })

    it('Seller-restricted endpoints reject guests (401) and customers (403)', async () => {
      // Products management
      const resGuestProd = await guest.get('/api/v1/products/manage')
      expect(resGuestProd.status).toBe(401)

      const resCustProd = await customer1.agent.get('/api/v1/products/manage')
      expect(resCustProd.status).toBe(403)

      const resSellerProd = await seller1.agent.get('/api/v1/products/manage')
      expect(resSellerProd.status).toBe(200)

      // Seller orders
      const resGuestOrd = await guest.get('/api/v1/orders/seller/list')
      expect(resGuestOrd.status).toBe(401)

      const resCustOrd = await customer1.agent.get('/api/v1/orders/seller/list')
      expect(resCustOrd.status).toBe(403)

      const resSellerOrd = await seller1.agent.get('/api/v1/orders/seller/list')
      expect(resSellerOrd.status).toBe(200)

      // Seller earnings
      const resGuestEarn = await guest.get('/api/v1/earnings/seller')
      expect(resGuestEarn.status).toBe(401)

      const resCustEarn = await customer1.agent.get('/api/v1/earnings/seller')
      expect(resCustEarn.status).toBe(403)

      const resSellerEarn = await seller1.agent.get('/api/v1/earnings/seller')
      expect(resSellerEarn.status).toBe(200)
    })

    it('Admin-restricted endpoints reject guests (401), customers (403), and sellers (403)', async () => {
      const adminEndpoints = [
        '/api/v1/admin/customers',
        '/api/v1/admin/overview',
        '/api/v1/admin/payouts',
        '/api/v1/orders/admin/all',
        '/api/v1/payments/admin',
        '/api/v1/contact/admin/custom-requests',
      ]

      for (const endpoint of adminEndpoints) {
        const resGuest = await guest.get(endpoint)
        expect(resGuest.status).toBe(401)

        const resCust = await customer1.agent.get(endpoint)
        expect(resCust.status).toBe(403)

        const resSeller1 = await seller1.agent.get(endpoint)
        expect(resSeller1.status).toBe(403)

        const resSeller2 = await seller2.agent.get(endpoint)
        expect(resSeller2.status).toBe(403)

        const resAdmin = await admin.agent.get(endpoint)
        expect(resAdmin.status).toBe(200)
      }
    })
  })

  describe('2. Insecure Direct Object Reference (IDOR) Protections', () => {
    it('Orders IDOR: customer2 cannot read customer1 order', async () => {
      const resOwner = await customer1.agent.get(`/api/v1/orders/${order1._id}`)
      expect(resOwner.status).toBe(200)
      expect(resOwner.body.data.id).toBe(order1._id.toString())

      const resOther = await customer2.agent.get(`/api/v1/orders/${order1._id}`)
      expect(resOther.status).toBe(404)
    })

    it('Orders IDOR: customer2 cannot cancel customer1 order', async () => {
      const resOther = await customer2.agent.post(`/api/v1/orders/${order1._id}/cancel`)
      expect(resOther.status).toBe(404)
    })

    it('Orders Fulfillment IDOR: seller2 cannot update fulfillment of order containing only seller1 items', async () => {
      // Must be in payment_confirmed state for fulfillment updates
      order1.status = 'payment_confirmed'
      await order1.save()

      const resSeller2 = await seller2.agent
        .patch(`/api/v1/orders/${order1._id}/seller-status`)
        .send({ status: 'preparing' })
      expect(resSeller2.status).toBe(404)

      const resSeller1 = await seller1.agent
        .patch(`/api/v1/orders/${order1._id}/seller-status`)
        .send({ status: 'preparing' })
      expect(resSeller1.status).toBe(200)
    })

    it('Payments IDOR: customer2 and sellers cannot submit payment for customer1 order', async () => {
      const fakeBuffer = await sharp({
        create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
      }).png().toBuffer()

      const resOtherCust = await customer2.agent
        .post(`/api/v1/payments/orders/${order1._id}/payment`)
        .attach('screenshot', fakeBuffer, 'proof.png')
        .field('senderPhone', '01099999999')
        .field('transferredAmount', 190)

      expect(resOtherCust.status).toBe(404)

      const resSeller = await seller1.agent
        .post(`/api/v1/payments/orders/${order1._id}/payment`)
        .attach('screenshot', fakeBuffer, 'proof.png')
        .field('senderPhone', '01099999999')
        .field('transferredAmount', 190)

      expect(resSeller.status).toBe(403)
    })

    it('Payment Screenshots IDOR: customer2 and sellers cannot stream customer1 screenshot', async () => {
      // 1. Through /payments/:id/screenshot
      const resOtherCust = await customer2.agent.get(`/api/v1/payments/${payment1._id}/screenshot`)
      expect(resOtherCust.status).toBe(404)

      const resSeller1 = await seller1.agent.get(`/api/v1/payments/${payment1._id}/screenshot`)
      expect(resSeller1.status).toBe(404)

      const resOwner = await customer1.agent.get(`/api/v1/payments/${payment1._id}/screenshot`)
      expect(resOwner.status).toBe(200)

      const resAdmin = await admin.agent.get(`/api/v1/payments/${payment1._id}/screenshot`)
      expect(resAdmin.status).toBe(200)

      // 2. Through /files/:key endpoint
      const resFileOtherCust = await customer2.agent.get(`/api/v1/files/${privateFileKey}`)
      expect(resFileOtherCust.status).toBe(404)

      const resFileSeller = await seller1.agent.get(`/api/v1/files/${privateFileKey}`)
      expect(resFileSeller.status).toBe(404)

      const resFileOwner = await customer1.agent.get(`/api/v1/files/${privateFileKey}`)
      expect(resFileOwner.status).toBe(200)

      const resFileAdmin = await admin.agent.get(`/api/v1/files/${privateFileKey}`)
      expect(resFileAdmin.status).toBe(200)
    })

    it('Addresses IDOR: customer2 cannot edit or delete customer1 address', async () => {
      const resUpdateOther = await customer2.agent
        .put(`/api/v1/users/addresses/${address1._id}`)
        .send({ name: 'اختراق العنوان' })
      expect(resUpdateOther.status).toBe(404)

      const resDeleteOther = await customer2.agent
        .delete(`/api/v1/users/addresses/${address1._id}`)
      expect(resDeleteOther.status).toBe(404)

      const resUpdateOwner = await customer1.agent
        .put(`/api/v1/users/addresses/${address1._id}`)
        .send({ name: 'عنوان معدل للمالك' })
      expect(resUpdateOwner.status).toBe(200)
    })

    it('Favorites Isolation: customer2 list does not leak customer1 favorites', async () => {
      const resCust1 = await customer1.agent.get('/api/v1/users/favorites')
      expect(resCust1.body.data.items || resCust1.body.data).toBeDefined()
      const cust1Favs = Array.isArray(resCust1.body.data) ? resCust1.body.data : resCust1.body.data.items
      expect(cust1Favs.length).toBeGreaterThan(0)

      const resCust2 = await customer2.agent.get('/api/v1/users/favorites')
      const cust2Favs = Array.isArray(resCust2.body.data) ? resCust2.body.data : resCust2.body.data.items
      expect(cust2Favs.length).toBe(0)
    })

    it('Notifications IDOR: customer2 cannot mark customer1 notification as read', async () => {
      const resOther = await customer2.agent
        .patch(`/api/v1/notifications/${notification1._id}/read`)
      expect(resOther.status).toBe(404)

      const resOwner = await customer1.agent
        .patch(`/api/v1/notifications/${notification1._id}/read`)
      expect(resOwner.status).toBe(200)
      expect(resOwner.body.data.read).toBe(true)
    })

    it('Products IDOR: seller2 cannot edit, delete, or toggle publish on seller1 product', async () => {
      // Update
      const resEdit = await seller2.agent
        .patch(`/api/v1/products/${product1._id}`)
        .send({ price: 999 })
      expect(resEdit.status).toBe(404)

      // Publish toggle
      const resPub = await seller2.agent
        .patch(`/api/v1/products/${product1._id}/publish`)
        .send({ published: false })
      expect(resPub.status).toBe(404)

      // Delete
      const resDel = await seller2.agent
        .delete(`/api/v1/products/${product1._id}`)
      expect(resDel.status).toBe(404)

      // Seller 1 owns it, so she can update it
      const resOwnerEdit = await seller1.agent
        .patch(`/api/v1/products/${product1._id}`)
        .send({ price: 160 })
      expect(resOwnerEdit.status).toBe(200)
      expect(resOwnerEdit.body.data.price).toBe(160)
    })

    it('Earnings IDOR: sellers cannot access other seller earnings drilldown or admin earnings', async () => {
      // Seller 1 querying admin seller drilldown
      const resSellerQuery = await seller1.agent
        .get(`/api/v1/admin/sellers/${seller2.user._id}/orders`)
      expect(resSellerQuery.status).toBe(403)

      // Seller 1 querying admin sellers overview
      const resSellerAdmin = await seller1.agent
        .get('/api/v1/earnings/sellers')
      expect(resSellerAdmin.status).toBe(403)

      // Admin can access drilldown
      const resAdmin = await admin.agent
        .get(`/api/v1/admin/sellers/${seller2.user._id}/orders`)
      expect(resAdmin.status).toBe(200)
    })
  })
})
