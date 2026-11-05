import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createOrder } from '../helpers/factories.js'
import { Notification } from '../../src/db/models/Notification.js'
import { Setting } from '../../src/db/models/Setting.js'
import { eventBus, EVENT_TYPES } from '../../src/events/index.js'
import { email } from '../../src/infra/email/index.js'
import { renderTemplate, templates } from '../../src/infra/email/templates/index.js'
import { registerNotificationListeners } from '../../src/infra/notifications/index.js'

describe('Notifications & Email Subsystem', () => {
  let app

  beforeEach(async () => {
    app = createApp()
    registerNotificationListeners()
    email.clearCaptured()
  })

  describe('Event Listeners & Email Dispatch', () => {
    it('dispatches customer email and admin notification on order.created', async () => {
      const customer = await createUser({ role: 'customer', email: 'customer_order@test.eg' })
      const admin = await createUser({ role: 'admin', email: 'admin_order@test.eg' })
      const seller = await createUser({ role: 'seller', email: 'seller_order@test.eg' })

      const order = await createOrder({ customerId: customer._id, sellerId: seller._id })

      eventBus.emit(EVENT_TYPES.ORDER_CREATED, { order })

      await vi.waitFor(async () => {
        const captured = email.getCaptured()
        const customerEmail = captured.find((e) => e.to === 'customer_order@test.eg')
        expect(customerEmail).toBeDefined()
        expect(customerEmail.templateKey).toBe('customer-order-received')

        const customerNotifs = await Notification.find({ userId: customer._id })
        expect(customerNotifs.length).toBe(1)
        expect(customerNotifs[0].type).toBe('order')

        const adminNotifs = await Notification.find({ userId: admin._id })
        expect(adminNotifs.length).toBe(1)
        expect(adminNotifs[0].type).toBe('payment')
      }, { timeout: 2000, interval: 50 })
    })

    it('dispatches payment.confirmed to customer and seller (with commission for seller only)', async () => {
      const customer = await createUser({ role: 'customer', email: 'cust_pay@test.eg' })
      const seller = await createUser({ role: 'seller', email: 'seller_pay@test.eg' })
      const order = await createOrder({ customerId: customer._id, sellerId: seller._id })

      eventBus.emit(EVENT_TYPES.PAYMENT_CONFIRMED, {
        order,
        payment: { senderPhone: '01011112222', reference: 'VF123456' },
      })

      await vi.waitFor(() => {
        const captured = email.getCaptured()
        const customerEmail = captured.find((e) => e.to === 'cust_pay@test.eg')
        const sellerEmail = captured.find((e) => e.to === 'seller_pay@test.eg')

        expect(customerEmail).toBeDefined()
        expect(customerEmail.templateKey).toBe('customer-payment-confirmed')
        // Customer email must NEVER contain commission
        expect(customerEmail.html).not.toMatch(/عمولة|commission/i)
        expect(customerEmail.text).not.toMatch(/عمولة|commission/i)

        expect(sellerEmail).toBeDefined()
        expect(sellerEmail.templateKey).toBe('seller-new-order')
        // Seller email contains financial breakdown
        expect(sellerEmail.html).toContain('عمولة')
        expect(sellerEmail.html).toContain('صافي أرباحكِ')
      }, { timeout: 2000, interval: 50 })
    })

    it('dispatches payment.rejected to customer with reason when notifyCustomer is true', async () => {
      const customer = await createUser({ role: 'customer', email: 'cust_rej@test.eg' })
      const order = await createOrder({ customerId: customer._id })

      eventBus.emit(EVENT_TYPES.PAYMENT_REJECTED, {
        order,
        payment: {
          rejectReason: 'المبلغ المحول غير مطابق',
          rejectNotes: 'يرجى تحويل 140 ج.م بدلاً من 100 ج.م',
          notifyCustomer: true,
        },
      })

      await vi.waitFor(async () => {
        const captured = email.getCaptured()
        const customerEmail = captured.find((e) => e.to === 'cust_rej@test.eg')
        expect(customerEmail).toBeDefined()
        expect(customerEmail.html).toContain('المبلغ المحول غير مطابق')

        const notifs = await Notification.find({ userId: customer._id })
        expect(notifs.length).toBe(1)
        expect(notifs[0].message).toContain('المبلغ المحول غير مطابق')
      }, { timeout: 2000, interval: 50 })
    })

    it('dispatches seller.created with temporary password', async () => {
      const seller = await createUser({ role: 'seller', email: 'new_seller@test.eg' })

      eventBus.emit(EVENT_TYPES.SELLER_CREATED, {
        user: seller,
        tempPassword: 'TempPassword123!',
      })

      await vi.waitFor(() => {
        const captured = email.getCaptured()
        const sellerEmail = captured.find((e) => e.to === 'new_seller@test.eg')
        expect(sellerEmail).toBeDefined()
        expect(sellerEmail.templateKey).toBe('seller-welcome')
        expect(sellerEmail.html).toContain('TempPassword123!')
      }, { timeout: 2000, interval: 50 })
    })

    it('dispatches verify-email on user.registered and always sends critical auth emails', async () => {
      const user = await createUser({
        role: 'customer',
        email: 'otp_user@test.eg',
        notificationPrefs: { email: false, inApp: false }, // explicitly disabled
      })

      eventBus.emit(EVENT_TYPES.USER_REGISTERED, {
        user,
        code: '654321',
      })

      await vi.waitFor(() => {
        const captured = email.getCaptured()
        const otpEmail = captured.find((e) => e.to === 'otp_user@test.eg')
        // Critical auth emails must ignore email: false
        expect(otpEmail).toBeDefined()
        expect(otpEmail.templateKey).toBe('verify-email')
        expect(otpEmail.html).toContain('654321')
      }, { timeout: 2000, interval: 50 })
    })

    it('respects user.notificationPrefs.email for non-critical emails', async () => {
      const customer = await createUser({
        role: 'customer',
        email: 'no_email_user@test.eg',
        notificationPrefs: { email: false, inApp: true },
      })
      const order = await createOrder({ customerId: customer._id })

      eventBus.emit(EVENT_TYPES.ORDER_CREATED, { order })

      await vi.waitFor(async () => {
        // In-app notification should still be created
        const notifs = await Notification.find({ userId: customer._id })
        expect(notifs.length).toBe(1)

        const captured = email.getCaptured()
        const customerEmail = captured.find((e) => e.to === 'no_email_user@test.eg')
        expect(customerEmail).toBeUndefined()
      }, { timeout: 2000, interval: 50 })
    })

    it('respects Setting notification toggles', async () => {
      await Setting.create({
        singletonKey: 'platform_settings',
        notifications: {
          orderCreated: false, // disabled in settings
          paymentSubmitted: true,
          payoutRecorded: true,
        },
      })

      const customer = await createUser({ role: 'customer', email: 'toggle_cust@test.eg' })
      const order = await createOrder({ customerId: customer._id })

      eventBus.emit(EVENT_TYPES.ORDER_CREATED, { order })

      await new Promise((r) => setTimeout(r, 200))

      const captured = email.getCaptured()
      const customerEmail = captured.find((e) => e.to === 'toggle_cust@test.eg')
      expect(customerEmail).toBeUndefined()
    })
  })

  describe('Template Content Security & Forbidden Words Scan', () => {
    const FORBIDDEN_WORDS = [
      'خشب',
      'مونتيسوري',
      'حسي',
      'ألعاب',
      'toys',
      'wood',
      'Montessori',
      'فيزا',
      'ماستركارد',
      'مدى',
      'ضمان',
    ]

    it('guarantees that all 12 templates contain no forbidden words', () => {
      for (const [key, tpl] of Object.entries(templates)) {
        for (const forbidden of FORBIDDEN_WORDS) {
          const regex = new RegExp(forbidden, 'i')
          expect(tpl.html, `Template "${key}" HTML contains forbidden word "${forbidden}"`).not.toMatch(regex)
          expect(tpl.text, `Template "${key}" Text contains forbidden word "${forbidden}"`).not.toMatch(regex)
          expect(tpl.subject.ar, `Template "${key}" Subject AR contains forbidden word "${forbidden}"`).not.toMatch(regex)
          expect(tpl.subject.en, `Template "${key}" Subject EN contains forbidden word "${forbidden}"`).not.toMatch(regex)
        }
      }
    })

    it('proves customer-facing templates NEVER contain commission or net earnings keywords', () => {
      const CUSTOMER_TEMPLATES = [
        'customer-order-received',
        'customer-payment-confirmed',
        'customer-payment-rejected',
        'customer-shipped',
        'order-cancelled',
      ]

      const COMMISSION_PATTERNS = [/عمولة/i, /عموله/i, /commission/i, /صافي الأرباح/i, /صافي أرباح/i, /sellerNet/i]

      for (const key of CUSTOMER_TEMPLATES) {
        const rendered = renderTemplate(key, {
          customerName: 'مريم',
          orderNumber: 'LH-2026-001',
          totalAmount: 140,
          subtotalAmount: 100,
          shippingAmount: 40,
          governorate: 'القاهرة',
        })

        for (const pattern of COMMISSION_PATTERNS) {
          expect(rendered.html, `Customer template "${key}" HTML matched commission pattern ${pattern}`).not.toMatch(pattern)
          expect(rendered.text, `Customer template "${key}" Text matched commission pattern ${pattern}`).not.toMatch(pattern)
          expect(rendered.subject, `Customer template "${key}" Subject matched commission pattern ${pattern}`).not.toMatch(pattern)
        }
      }
    })

    it('escapes HTML variables safely against XSS', () => {
      const xssPayload = '<script>alert("xss")</script>'
      const rendered = renderTemplate('customer-order-received', {
        customerName: xssPayload,
        orderNumber: 'LH-2026-001',
      })

      expect(rendered.html).not.toContain('<script>')
      expect(rendered.html).toContain('&lt;script&gt;')
    })
  })

  describe('Notifications API Endpoints', () => {
    it('GET /api/v1/notifications returns user-isolated paginated notifications', async () => {
      const { agent, user } = await authedAgent(app, 'customer')
      const otherUser = await createUser({ role: 'customer' })

      // Create 3 notifications for current user, 2 for other user
      await Notification.create([
        { userId: user._id, role: 'customer', type: 'order', title: 'طلب 1', message: 'تفاصيل 1' },
        { userId: user._id, role: 'customer', type: 'order', title: 'طلب 2', message: 'تفاصيل 2' },
        { userId: user._id, role: 'customer', type: 'payment', title: 'دفع 3', message: 'تفاصيل 3' },
        { userId: otherUser._id, role: 'customer', type: 'order', title: 'طلب غريب', message: 'سري' },
      ])

      const res = await agent.get('/api/v1/notifications')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.total).toBe(3)
      expect(res.body.data.items.length).toBe(3)
      expect(res.body.data.items.every((i) => i.title !== 'طلب غريب')).toBe(true)
    })

    it('GET /api/v1/notifications/unread-count returns accurate count for caller', async () => {
      const { agent, user } = await authedAgent(app, 'customer')
      const otherUser = await createUser({ role: 'customer' })

      await Notification.create([
        { userId: user._id, role: 'customer', type: 'order', title: 'تنبيه 1', read: false },
        { userId: user._id, role: 'customer', type: 'order', title: 'تنبيه 2', read: true },
        { userId: otherUser._id, role: 'customer', type: 'order', title: 'تنبيه آخر', read: false },
      ])

      const res = await agent.get('/api/v1/notifications/unread-count')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.count).toBe(1)
    })

    it('PATCH /api/v1/notifications/:id/read marks notification as read (owner only)', async () => {
      const { agent, user } = await authedAgent(app, 'customer')
      const notif = await Notification.create({
        userId: user._id,
        role: 'customer',
        type: 'order',
        title: 'تنبيه جديد',
        message: 'محتوى التنبيه',
        read: false,
      })

      const res = await agent.patch(`/api/v1/notifications/${notif._id}/read`)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.read).toBe(true)

      const updated = await Notification.findById(notif._id)
      expect(updated.read).toBe(true)
    })

    it('PATCH /api/v1/notifications/:id/read returns 404 for notifications caller does not own', async () => {
      const { agent } = await authedAgent(app, 'customer')
      const otherUser = await createUser({ role: 'customer' })

      const notif = await Notification.create({
        userId: otherUser._id,
        role: 'customer',
        type: 'order',
        title: 'تنبيه لعميلة أخرى',
        read: false,
      })

      const res = await agent.patch(`/api/v1/notifications/${notif._id}/read`)
      // Object-level authorization requires 404, not 403
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })

    it('POST /api/v1/notifications/read-all marks only the caller rows as read', async () => {
      const { agent, user } = await authedAgent(app, 'customer')
      const otherUser = await createUser({ role: 'customer' })

      await Notification.create([
        { userId: user._id, role: 'customer', type: 'order', title: '1', read: false },
        { userId: user._id, role: 'customer', type: 'order', title: '2', read: false },
        { userId: otherUser._id, role: 'customer', type: 'order', title: '3', read: false },
      ])

      const res = await agent.post('/api/v1/notifications/read-all')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.count).toBe(2)

      // Other user notification must remain unread
      const otherNotif = await Notification.findOne({ userId: otherUser._id })
      expect(otherNotif.read).toBe(false)
    })
  })
})
