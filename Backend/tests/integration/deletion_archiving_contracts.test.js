import { describe, it, expect, beforeEach } from 'vitest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct, createOrder } from '../helpers/factories.js'
import { User } from '../../src/db/models/User.js'
import { Product } from '../../src/db/models/Product.js'
import { Order } from '../../src/db/models/Order.js'
import { Notification } from '../../src/db/models/Notification.js'
import { CustomRequest } from '../../src/db/models/CustomRequest.js'
import { AuditLog } from '../../src/db/models/AuditLog.js'

describe('Part D: Deletion & Archiving Subsystems (D1 - D6)', () => {
  let app

  beforeEach(async () => {
    app = createApp()
  })

  // -------------------------------------------------------------
  // D1: Notification Deletion
  // -------------------------------------------------------------
  describe('D1: Notification Deletion', () => {
    it('DELETE /api/v1/notifications/:id deletes single notification with IDOR check', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const otherUser = await createUser({ role: 'customer' })

      const notif1 = await Notification.create({
        userId: customer._id,
        role: 'customer',
        type: 'order',
        title: 'إشعار 1',
        message: 'محتوى 1',
      })
      const notifOther = await Notification.create({
        userId: otherUser._id,
        role: 'customer',
        type: 'order',
        title: 'إشعار لشخص آخر',
        message: 'محتوى',
      })

      // Trying to delete another user's notification returns 404
      const resOther = await customerAgent.delete(`/api/v1/notifications/${notifOther._id}`)
      expect(resOther.status).toBe(404)

      // Deleting own notification succeeds
      const resOwn = await customerAgent.delete(`/api/v1/notifications/${notif1._id}`)
      expect(resOwn.status).toBe(200)

      const exists = await Notification.findById(notif1._id)
      expect(exists).toBeNull()
    })

    it('DELETE /api/v1/notifications deletes all read notifications when ?read=true', async () => {
      const { agent, user } = await authedAgent(app, 'customer')

      await Notification.create([
        { userId: user._id, role: 'customer', type: 'order', title: 'غير مقروء', message: 'م1', read: false },
        { userId: user._id, role: 'customer', type: 'order', title: 'مقروء 1', message: 'م2', read: true, readAt: new Date() },
        { userId: user._id, role: 'customer', type: 'order', title: 'مقروء 2', message: 'م3', read: true, readAt: new Date() },
      ])

      const res = await agent.delete('/api/v1/notifications?read=true')
      expect(res.status).toBe(200)

      const remaining = await Notification.find({ userId: user._id })
      expect(remaining.length).toBe(1)
      expect(remaining[0].read).toBe(false)
    })
  })

  // -------------------------------------------------------------
  // D2: Customer Account Self-Deletion
  // -------------------------------------------------------------
  describe('D2: Customer Self Deletion (DELETE /api/v1/users/me)', () => {
    it('rejects deletion with wrong or missing password', async () => {
      const { agent } = await authedAgent(app, 'customer')

      const resNoPass = await agent.delete('/api/v1/users/me').send({})
      expect(resNoPass.status).toBe(400)

      const resWrongPass = await agent.delete('/api/v1/users/me').send({ password: 'WrongPassword999!' })
      expect(resWrongPass.status).toBe(400)
    })

    it('blocks deletion with 409 ACCOUNT_HAS_ACTIVE_ORDERS if active orders exist', async () => {
      const { agent, user } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller' })

      await createOrder({
        customerId: user._id,
        sellerId: seller._id,
        status: 'preparing',
      })

      const res = await agent.delete('/api/v1/users/me').send({ password: 'TestPass123!' })
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('ACCOUNT_HAS_ACTIVE_ORDERS')

      const userInDb = await User.findById(user._id)
      expect(userInDb).not.toBeNull()
      expect(userInDb.status).not.toBe('deleted')
    })

    it('hard-deletes customer if 0 historical orders exist and clears auth cookies', async () => {
      const { agent, user } = await authedAgent(app, 'customer')

      const res = await agent.delete('/api/v1/users/me').send({ password: 'TestPass123!' })
      expect(res.status).toBe(200)

      // Cookies should be cleared
      const setCookie = res.headers['set-cookie']
      expect(setCookie).toBeDefined()

      const userInDb = await User.findById(user._id)
      expect(userInDb).toBeNull()
    })

    it('anonymizes customer if delivered order exists, sets status=deleted, and blocks login', async () => {
      const { agent, user } = await authedAgent(app, 'customer')
      const seller = await createUser({ role: 'seller' })

      await createOrder({
        customerId: user._id,
        sellerId: seller._id,
        status: 'delivered',
      })

      const res = await agent.delete('/api/v1/users/me').send({ password: 'TestPass123!' })
      expect(res.status).toBe(200)
      expect(res.body.data.mode).toBe('anonymized')

      const userInDb = await User.findById(user._id)
      expect(userInDb).not.toBeNull()
      expect(userInDb.status).toBe('deleted')
      expect(userInDb.name).toBe('حساب محذوف')
      expect(userInDb.email).toMatch(/^deleted-/)

      // Subsequent login attempt must fail
      const loginRes = await agent.post('/api/v1/auth/login').send({
        identifier: user.email,
        password: 'TestPass123!',
      })
      expect(loginRes.status).toBe(401)
    })
  })

  // -------------------------------------------------------------
  // D3: Admin Delete User (Customer or Seller)
  // -------------------------------------------------------------
  describe('D3: Admin Delete User (DELETE /api/v1/admin/users/:id)', () => {
    it('blocks admin deletion of seller with 409 SELLER_HAS_ACTIVE_ORDERS', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      const customer = await createUser({ role: 'customer' })

      await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'preparing',
      })

      const res = await adminAgent.delete(`/api/v1/admin/users/${seller._id}`)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('SELLER_HAS_ACTIVE_ORDERS')
    })

    it('deleting seller hard-deletes unsold products, soft-deletes sold products, and releases claimed requests', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      const customer = await createUser({ role: 'customer' })

      // Sold product (part of delivered order)
      const soldProd = await createProduct({ sellerId: seller._id, title: 'وسيلة مباعة' })
      await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'delivered',
        items: [{ productId: soldProd._id, qty: 1, unitPrice: 100, name: soldProd.name, sellerId: seller._id }],
      })

      // Unsold product
      const unsoldProd = await createProduct({ sellerId: seller._id, title: 'وسيلة غير مباعة' })

      // Claimed custom request
      const claimedReq = await CustomRequest.create({
        name: 'عميلة للتفصيل',
        phone: '01011112222',
        details: 'تفصيل لوحة خاصة',
        status: 'pending',
        claimedBy: seller._id,
        claimedAt: new Date(),
      })

      const res = await adminAgent.delete(`/api/v1/admin/users/${seller._id}`)
      expect(res.status).toBe(200)

      // Unsold product must be hard deleted
      const checkUnsold = await Product.findById(unsoldProd._id)
      expect(checkUnsold).toBeNull()

      // Sold product must be soft-deleted
      const checkSold = await Product.findById(soldProd._id)
      expect(checkSold).not.toBeNull()
      expect(checkSold.deletedAt).not.toBeNull()

      // Claimed custom request must be released back to 'new'
      const checkReq = await CustomRequest.findById(claimedReq._id)
      expect(checkReq.status).toBe('new')
      expect(checkReq.claimedBy).toBeNull()
      expect(checkReq.claimedAt).toBeNull()
    })
  })

  // -------------------------------------------------------------
  // D4: Order Deletion Audit Snapshot & Protection
  // -------------------------------------------------------------
  describe('D4: Order Deletion Snapshot & Protection', () => {
    it('blocks deletion of delivered order with 409 ORDER_NOT_DELETABLE', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const customer = await createUser({ role: 'customer' })
      const seller = await createUser({ role: 'seller' })

      const deliveredOrder = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'delivered',
      })

      const res = await adminAgent.delete(`/api/v1/orders/admin/${deliveredOrder._id}`)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('ORDER_NOT_DELETABLE')
    })

    it('logs full snapshot into audit.log when deleting unpaid/cancelled order', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const customer = await createUser({ role: 'customer' })
      const seller = await createUser({ role: 'seller' })

      const unpaidOrder = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'pending_payment',
      })

      const res = await adminAgent.delete(`/api/v1/orders/admin/${unpaidOrder._id}`)
      expect(res.status).toBe(200)

      const auditEntry = await AuditLog.findOne({
        action: 'ORDER_DELETED',
        entityId: unpaidOrder._id.toString(),
      })
      expect(auditEntry).not.toBeNull()
      expect(auditEntry.meta.snapshot).toBeDefined()
      expect(auditEntry.meta.snapshot.number).toBe(unpaidOrder.number)
    })
  })

  // -------------------------------------------------------------
  // D5: Order Archiving (Backend)
  // -------------------------------------------------------------
  describe('D5: Order Archiving', () => {
    it('only allows delivered orders to be archived, else returns 400', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const customer = await createUser({ role: 'customer' })
      const seller = await createUser({ role: 'seller' })

      const pendingOrder = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'pending_payment',
      })

      const resPending = await adminAgent.post(`/api/v1/orders/admin/${pendingOrder._id}/archive`)
      expect(resPending.status).toBe(400)

      const deliveredOrder = await createOrder({
        customerId: customer._id,
        sellerId: seller._id,
        status: 'delivered',
      })

      const resDelivered = await adminAgent.post(`/api/v1/orders/admin/${deliveredOrder._id}/archive`)
      expect(resDelivered.status).toBe(200)
      expect(resDelivered.body.data.order.archivedAt).toBeDefined()

      // Unarchive
      const resUnarchive = await adminAgent.post(`/api/v1/orders/admin/${deliveredOrder._id}/unarchive`)
      expect(resUnarchive.status).toBe(200)
      expect(resUnarchive.body.data.order.archivedAt).toBeNull()
    })

    it('filters orders by archived query param (active / true / all)', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const customer = await createUser({ role: 'customer' })
      const seller = await createUser({ role: 'seller' })

      const o1 = await createOrder({ customerId: customer._id, sellerId: seller._id, status: 'delivered' })
      const o2 = await createOrder({ customerId: customer._id, sellerId: seller._id, status: 'delivered' })

      // Archive o1
      await adminAgent.post(`/api/v1/orders/admin/${o1._id}/archive`)

      // Default query: archived=false (only o2)
      const resActive = await adminAgent.get('/api/v1/orders/admin')
      const activeIds = resActive.body.data.items.map((it) => (it.id || it._id).toString())
      expect(activeIds).toContain(o2._id.toString())
      expect(activeIds).not.toContain(o1._id.toString())

      // archived=true: only o1
      const resArchived = await adminAgent.get('/api/v1/orders/admin?archived=true')
      const archivedIds = resArchived.body.data.items.map((it) => (it.id || it._id).toString())
      expect(archivedIds).toContain(o1._id.toString())
      expect(archivedIds).not.toContain(o2._id.toString())

      // archived=all: both
      const resAll = await adminAgent.get('/api/v1/orders/admin?archived=all')
      const allIds = resAll.body.data.items.map((it) => (it.id || it._id).toString())
      expect(allIds).toContain(o1._id.toString())
      expect(allIds).toContain(o2._id.toString())
    })
  })

  // -------------------------------------------------------------
  // D6: Custom Requests Deletion & Linking
  // -------------------------------------------------------------
  describe('D6: Custom Requests Deletion & Linking', () => {
    it('DELETE /api/v1/admin/custom-requests/:id deletes request and frees reference', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      const req = await CustomRequest.create({
        name: 'معلمة رياض أطفال',
        phone: '01012345678',
        details: 'طلب وسيلة تفاعلية مجسمة',
      })

      const res = await adminAgent.delete(`/api/v1/admin/custom-requests/${req._id}`)
      expect(res.status).toBe(200)

      const exists = await CustomRequest.findById(req._id)
      expect(exists).toBeNull()
    })

    it('attaches customerId to custom request when submitted by authenticated customer', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')

      const res = await customerAgent.post('/api/v1/contact/custom-requests').send({
        name: 'معلمة مسجلة',
        phone: '01012345678',
        details: 'تفصيل لوحة حروف جوخ',
      })
      expect(res.status).toBe(201)

      const created = await CustomRequest.findById(res.body.data.id)
      expect(created).not.toBeNull()
      expect(created.customerId).toBeDefined()
      expect(created.customerId.toString()).toBe(customer._id.toString())
    })
  })

  // -------------------------------------------------------------
  // Image Validation: reject blob: and data: URLs
  // -------------------------------------------------------------
  describe('Product Images Validation: strictly reject blob: and data: URLs', () => {
    it('rejects product creation when images contain blob: or data: URLs', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })

      const resBlob = await adminAgent.post('/api/v1/products/manage/products').send({
        name: 'وسيلة تجريبية',
        sellerId: seller._id.toString(),
        categoryId: 'alphabet-boards',
        price: 150,
        description: 'وصف تفصيلي للوسيلة التعليمية',
        images: [{ key: 'test.webp', url: 'blob:http://localhost:5173/test-uuid' }],
      })
      expect(resBlob.status).toBe(400)

      const resData = await adminAgent.post('/api/v1/products/manage/products').send({
        name: 'وسيلة تجريبية',
        sellerId: seller._id.toString(),
        categoryId: 'alphabet-boards',
        price: 150,
        description: 'وصف تفصيلي للوسيلة التعليمية',
        images: [{ key: 'test.webp', url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...' }],
      })
      expect(resData.status).toBe(400)
    })
  })
})

