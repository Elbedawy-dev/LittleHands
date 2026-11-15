import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct, createOrder } from '../helpers/factories.js'
import { Notification } from '../../src/db/models/Notification.js'
import { Setting } from '../../src/db/models/Setting.js'
import { CustomRequest } from '../../src/db/models/CustomRequest.js'
import { Payment } from '../../src/db/models/Payment.js'
import { registerNotificationListeners } from '../../src/infra/notifications/index.js'

const VALID_ROUTE_PATTERNS = [
  /^\/account$/,
  /^\/account\/orders\/[^/]+$/,
  /^\/account\/addresses$/,
  /^\/account\/settings$/,
  /^\/notifications$/,
  /^\/seller\/products$/,
  /^\/seller\/orders\?order=[^/]+$/,
  /^\/seller\/orders$/,
  /^\/seller\/custom-requests$/,
  /^\/seller\/profile$/,
  /^\/seller\/notifications$/,
  /^\/admin\/payments$/,
  /^\/admin\/orders\?order=[^/]+$/,
  /^\/admin\/orders$/,
  /^\/admin\/products$/,
  /^\/admin\/sellers$/,
  /^\/admin\/customers$/,
  /^\/admin\/categories$/,
  /^\/admin\/custom-requests$/,
  /^\/admin\/settings$/,
  /^\/admin\/account$/,
  /^\/admin\/notifications$/,
]

function assertValidRouteLink(link) {
  expect(typeof link).toBe('string')
  expect(link.startsWith('/')).toBe(true)
  expect(VALID_ROUTE_PATTERNS.some((re) => re.test(link))).toBe(true)
}

describe('D3: Centralized In-Site Actor Activity Notifications', () => {
  let app

  beforeEach(() => {
    app = createApp()
    registerNotificationListeners()
  })

  it('customer actions create isolated bilingual activity notifications without duplicating existing listeners', async () => {
    const { agent: custAgent, user: customer } = await authedAgent(app, 'customer', {
      name: 'حضانتنا الصغيرة',
    })
    const { user: otherCustomer } = await authedAgent(app, 'customer')
    const seller = await createUser({ role: 'seller' })
    const product = await createProduct({ sellerId: seller._id, price: 200, stock: 5 })

    await Notification.deleteMany({})

    // 1. Update profile + add address -> produces activity notifications
    const profileRes = await custAgent
      .patch('/api/v1/users/me')
      .send({ name: 'حضانة الأمل المحدثة' })
    expect(profileRes.status).toBe(200)

    const addrRes = await custAgent
      .post('/api/v1/users/me/addresses')
      .send({
        name: 'حضانة الأمل',
        phone: '01012345678',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        address: '15 شارع مكرم عبيد',
      })
    expect(addrRes.status).toBe(201)

    await vi.waitFor(async () => {
      const custActivities = await Notification.find({
        userId: customer._id,
        type: 'activity',
      })
      expect(custActivities.length).toBe(2)
      custActivities.forEach((n) => assertValidRouteLink(n.link))
    }, { timeout: 2000, interval: 40 })

    // Verify AR and EN API responses via Accept-Language
    const arList = await custAgent
      .get('/api/v1/notifications?type=activity')
      .set('Accept-Language', 'ar')
    expect(arList.status).toBe(200)
    expect(arList.body.data.items.length).toBe(2)
    expect(arList.body.data.items.some((i) => i.title.includes('العنوان') || i.title.includes('الحساب'))).toBe(true)

    const enList = await custAgent
      .get('/api/v1/notifications?type=activity')
      .set('Accept-Language', 'en')
    expect(enList.status).toBe(200)
    expect(enList.body.data.items.some((i) => /address|profile/i.test(i.title))).toBe(true)

    // Verify zero leaks to another customer
    const otherNotifs = await Notification.find({ userId: otherCustomer._id })
    expect(otherNotifs.length).toBe(0)

    // 2. Customer cancels own order -> only existing ORDER_STATUS_CHANGED 'order' notif, NO extra 'activity' notif
    const order = await createOrder({
      customerId: customer._id,
      sellerId: seller._id,
      productId: product._id,
      status: 'pending_payment',
    })
    await Notification.deleteMany({ userId: customer._id })

    const cancelRes = await custAgent
      .post(`/api/v1/orders/${order._id}/cancel`)
      .send({ reason: 'Changed mind' })
    expect(cancelRes.status).toBe(200)

    await vi.waitFor(async () => {
      const allNotifs = await Notification.find({ userId: customer._id })
      expect(allNotifs.length).toBe(1)
      expect(allNotifs[0].type).toBe('order')
    }, { timeout: 2000, interval: 40 })
  })

  it('seller actions emit private activity notifications with valid seller routes', async () => {
    const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
    const { user: otherSeller } = await authedAgent(app, 'seller')
    const customer = await createUser({ role: 'customer' })

    const createRes = await sellerAgent
      .post('/api/v1/products/manage/products')
      .send({
        name: { ar: 'بازل فوم تعليمي', en: 'Educational Foam Puzzle' },
        categoryId: 'alphabet-boards',
        price: 180,
        description: {
          ar: 'وسيلة تعليمية من الفوم الآمن لتعليم الحروف',
          en: 'Educational foam aid for learning Arabic alphabet',
        },
        materials: ['foam'],
        stock: 8,
        published: false,
      })
    expect(createRes.status).toBe(201)
    const productId = createRes.body.data.id || createRes.body.data._id

    const updateRes = await sellerAgent
      .patch(`/api/v1/products/manage/products/${productId}`)
      .send({
        name: { ar: 'بازل فوم تعليمي مطور', en: 'Upgraded Educational Foam Puzzle' },
        price: 190,
        description: {
          ar: 'وسيلة تعليمية مطورة من الفوم الآمن للحضانات',
          en: 'Upgraded educational foam aid for nurseries',
        },
        materials: ['foam'],
        stock: 10,
      })
    expect(updateRes.status).toBe(200)

    const order = await createOrder({
      customerId: customer._id,
      sellerId: seller._id,
      productId,
      status: 'payment_confirmed',
      sellerFulfillment: [{ sellerId: seller._id, status: 'pending' }],
    })

    const fulfillRes = await sellerAgent
      .patch(`/api/v1/orders/seller/${order._id}/fulfillment`)
      .send({ status: 'preparing' })
    expect(fulfillRes.status).toBe(200)

    const profileRes = await sellerAgent
      .patch('/api/v1/sellers/me/profile')
      .send({
        bio: { ar: 'ورشة وسائل تعليمية متخصصة', en: 'Specialized educational aids workshop' },
      })
    expect(profileRes.status).toBe(200)

    const customReq = await CustomRequest.create({
      name: 'حضانة النور',
      phone: '01099887766',
      details: 'وسيلة تعليمية مخصصة للألوان',
      status: 'new',
    })
    const claimRes = await sellerAgent.post(`/api/v1/sellers/me/custom-requests/${customReq._id}/claim`)
    expect(claimRes.status).toBe(200)

    await vi.waitFor(async () => {
      const sellerActivities = await Notification.find({
        userId: seller._id,
        type: 'activity',
      })
      expect(sellerActivities.length).toBeGreaterThanOrEqual(5)
      sellerActivities.forEach((n) => {
        expect(n.role).toBe('seller')
        assertValidRouteLink(n.link)
      })
    }, { timeout: 2000, interval: 40 })

    // Other seller never sees these activities
    const otherActivities = await Notification.find({ userId: otherSeller._id, type: 'activity' })
    expect(otherActivities.length).toBe(0)
  })

  it('admin actions emit private actor notifications (never broadcast) with valid /admin routes', async () => {
    const { agent: adminAgent, user: admin1 } = await authedAgent(app, 'admin')
    const { user: admin2 } = await authedAgent(app, 'admin')
    const customer = await createUser({ role: 'customer' })
    const seller = await createUser({ role: 'seller' })
    const product = await createProduct({ sellerId: seller._id, price: 250, stock: 5 })

    const order = await createOrder({
      customerId: customer._id,
      sellerId: seller._id,
      productId: product._id,
      status: 'pending_payment',
    })
    await Payment.create({
      orderId: order._id,
      attempt: 1,
      senderPhone: '01055556666',
      reference: 'VF-D3-001',
      transferredAmount: order.total,
      status: 'pending',
      screenshot: {
        key: 'receipt_d3.webp',
        hash: 'hash_d3_001',
        mime: 'image/webp',
        size: 1024,
        url: '/storage/public/receipt_d3.webp',
      },
    })

    await Notification.deleteMany({})

    // Admin 1 confirms payment, updates settings, updates user status, records payout, updates order status
    const confirmRes = await adminAgent.post(`/api/v1/payments/admin/${order._id}/confirm`).send({})
    expect(confirmRes.status).toBe(200)

    const statusRes = await adminAgent
      .patch(`/api/v1/orders/admin/${order._id}/status`)
      .send({ status: 'preparing' })
    expect(statusRes.status).toBe(200)

    const settingsRes = await adminAgent
      .put('/api/v1/admin/settings')
      .send({ supportPhone: '01011223344' })
    expect(settingsRes.status).toBe(200)

    const userStatusRes = await adminAgent
      .patch(`/api/v1/admin/users/${customer._id}/status`)
      .send({ status: 'suspended' })
    expect(userStatusRes.status).toBe(200)

    const createSellerRes = await adminAgent
      .post('/api/v1/admin/sellers')
      .send({
        name: 'بائعة نشيطة',
        email: 'd3_seller@test.eg',
        phone: '01044332211',
      })
    expect(createSellerRes.status).toBe(201)

    await vi.waitFor(async () => {
      const admin1Activities = await Notification.find({
        userId: admin1._id,
        type: 'activity',
      })
      expect(admin1Activities.length).toBeGreaterThanOrEqual(5)
      admin1Activities.forEach((n) => {
        expect(n.role).toBe('admin')
        assertValidRouteLink(n.link)
      })
    }, { timeout: 2000, interval: 40 })

    // Activity notifications are strictly bound to the acting admin, not broadcast to admin2
    const admin2Activities = await Notification.find({ userId: admin2._id, type: 'activity' })
    expect(admin2Activities.length).toBe(0)
  })

  it('deduplicates & aggregates identical repeated actions within 60 seconds and creates a new one after 60 seconds', async () => {
    const { agent: adminAgent, user: admin } = await authedAgent(app, 'admin')

    await Notification.deleteMany({})

    // Two identical settings updates within 60 seconds -> single aggregated notification doc
    const res1 = await adminAgent.put('/api/v1/admin/settings').send({ supportPhone: '01010001111' })
    expect(res1.status).toBe(200)

    await vi.waitFor(async () => {
      const count = await Notification.countDocuments({ userId: admin._id, type: 'activity' })
      expect(count).toBe(1)
    }, { timeout: 2000, interval: 40 })

    const res2 = await adminAgent.put('/api/v1/admin/settings').send({ supportPhone: '01010002222' })
    expect(res2.status).toBe(200)

    await vi.waitFor(async () => {
      const list = await Notification.find({ userId: admin._id, type: 'activity' })
      expect(list.length).toBe(1)
      expect(list[0].params.repeatCount).toBe(2)
      expect(list[0].params.rawMessage.ar).toContain('×2')
      expect(list[0].params.rawMessage.en).toContain('×2')
    }, { timeout: 2000, interval: 40 })

    // Backdate the existing notification by 65 seconds -> next identical action creates a NEW document
    const pastDate = new Date(Date.now() - 65_000)
    await Notification.collection.updateMany(
      { userId: admin._id, type: 'activity' },
      { $set: { createdAt: pastDate } }
    )

    const res3 = await adminAgent.put('/api/v1/admin/settings').send({ supportPhone: '01010003333' })
    expect(res3.status).toBe(200)

    await vi.waitFor(async () => {
      const list = await Notification.find({ userId: admin._id, type: 'activity' }).sort({ createdAt: 1 })
      expect(list.length).toBe(2)
      expect(list[1].params.repeatCount).toBe(1)
    }, { timeout: 2000, interval: 40 })
  })

  it('respects Setting.inSiteNotifications = false and user.notificationPrefs.inApp = false', async () => {
    const { agent: custAgent, user: customer } = await authedAgent(app, 'customer')

    // 1. Global toggle off
    await Setting.create({ singletonKey: 'platform_settings', inSiteNotifications: false })
    await custAgent.patch('/api/v1/users/me').send({ name: 'تجربة صامتة' })
    await new Promise((r) => setTimeout(r, 150))
    expect(await Notification.countDocuments({ userId: customer._id, type: 'activity' })).toBe(0)

    // 2. Enable global, disable user inApp preference
    await Setting.updateOne({ singletonKey: 'platform_settings' }, { $set: { inSiteNotifications: true } })
    const prefRes = await custAgent.patch('/api/v1/users/me/notification-prefs').send({ inApp: false })
    expect(prefRes.status).toBe(200)
    await new Promise((r) => setTimeout(r, 150))
    expect(await Notification.countDocuments({ userId: customer._id, type: 'activity' })).toBe(0)

    // 3. Re-enable user inApp preference -> preference save creates activity notification
    const prefOnRes = await custAgent.patch('/api/v1/users/me/notification-prefs').send({ inApp: true })
    expect(prefOnRes.status).toBe(200)
    await vi.waitFor(async () => {
      expect(await Notification.countDocuments({ userId: customer._id, type: 'activity' })).toBe(1)
    }, { timeout: 2000, interval: 40 })
  })
})
