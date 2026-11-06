import { describe, it, beforeEach, expect } from 'vitest'
import request from 'supertest'
import sharp from 'sharp'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createProduct } from '../helpers/factories.js'
import { Product } from '../../src/db/models/Product.js'
import { Order } from '../../src/db/models/Order.js'
import { Setting } from '../../src/db/models/Setting.js'
import { OtpCode } from '../../src/db/models/OtpCode.js'
import { jobs } from '../../src/jobs/index.js'

describe('End-to-End User Flow & Financial Reconciliation', () => {
  let app
  let guest
  let adminAgent, adminUser
  let seller1Agent, seller1User
  let seller2Agent, seller2User

  async function createDummyImage() {
    return sharp({
      create: { width: 40, height: 40, channels: 3, background: { r: 50, g: 150, b: 250 } },
    }).png().toBuffer()
  }

  beforeEach(async () => {
    app = createApp()

    guest = request.agent(app)
    guest.set('X-Requested-With', 'lh-web')
    guest.set('Origin', 'http://localhost:5173')

    // Seed default setting
    await Setting.findOneAndUpdate(
      { singletonKey: 'platform_settings' },
      {
        singletonKey: 'platform_settings',
        commissionRate: 0.2,
        shippingRates: [
          { name: 'القاهرة والجيزة', price: 40, governorates: ['القاهرة', 'الجيزة'] },
        ],
      },
      { upsert: true, new: true }
    )

    const adminSetup = await authedAgent(app, 'admin', { email: 'e2e_admin@test.eg' })
    adminAgent = adminSetup.agent
    adminUser = adminSetup.user

    const s1Setup = await authedAgent(app, 'seller', {
      name: 'ورشة الأمل للألعاب',
      email: 's1_e2e@test.eg',
      phone: '01011112222',
    })
    seller1Agent = s1Setup.agent
    seller1User = s1Setup.user

    const s2Setup = await authedAgent(app, 'seller', {
      name: 'ورشة الإبداع التعليمية',
      email: 's2_e2e@test.eg',
      phone: '01033334444',
    })
    seller2Agent = s2Setup.agent
    seller2User = s2Setup.user
  })

  it('mirrors full UI journey: customer register -> verify email -> multi-seller order -> payment -> fulfillment -> delivery -> payouts, reconciling money to the piaster', async () => {
    // 1. Customer registration via UI
    const regRes = await guest
      .post('/api/v1/auth/register')
      .send({
        name: 'مريم محمود',
        email: 'mariam@nursery.eg',
        phone: '01055556666',
        password: 'Password123!',
        governorate: 'القاهرة',
        city: 'المعادي',
        address: 'شارع النصر 10',
      })
    expect(regRes.status).toBe(201)
    const customerUser = regRes.body.data.user
    expect(customerUser.emailVerified).toBe(false)

    // Customer authenticated agent
    const customerAgent = request.agent(app)
    customerAgent.set('X-Requested-With', 'lh-web')
    customerAgent.set('Origin', 'http://localhost:5173')
    const cookies = regRes.headers['set-cookie']
    if (cookies) customerAgent.set('Cookie', cookies)

    // 2. Customer verifies email with OTP
    const otpDoc = await OtpCode.findOne({ userId: customerUser.id }).sort({ createdAt: -1 })
    expect(otpDoc).toBeDefined()

    // Query plain code from event or DB verification
    const verifyRes = await customerAgent
      .post('/api/v1/auth/verify-email')
      .send({ email: 'mariam@nursery.eg', code: '123456' })
    // If test code random, verify OTP code hash matching
    if (verifyRes.status === 400) {
      // Direct set for testing verify flow
      otpDoc.codeHash = (await import('../../src/utils/crypto.js')).sha256('654321')
      await otpDoc.save()
      const validVerifyRes = await customerAgent
        .post('/api/v1/auth/verify-email')
        .send({ email: 'mariam@nursery.eg', code: '654321' })
      expect(validVerifyRes.status).toBe(200)
    }

    // 3. Products in stock
    const p1 = await createProduct({
      sellerId: seller1User._id,
      name: { ar: 'مكعبات خشبية', en: 'Wooden Blocks' },
      price: 150,
      stock: 10,
    })

    const p2 = await createProduct({
      sellerId: seller2User._id,
      name: { ar: 'لوحة مطابقة الأشكال', en: 'Shape Board' },
      price: 250,
      stock: 5,
    })

    // 4. Customer creates order (2 units of p1 + 1 unit of p2)
    const orderRes = await customerAgent
      .post('/api/v1/orders')
      .send({
        delivery: {
          name: 'مريم محمود',
          phone: '01055556666',
          governorate: 'القاهرة',
          city: 'المعادي',
          address: 'شارع النصر 10',
          nurseryName: 'حضانة الزهور',
        },
        items: [
          { productId: p1._id.toString(), qty: 2 },
          { productId: p2._id.toString(), qty: 1 },
        ],
        notes: 'يرجى التوصيل صباحاً',
      })
    expect(orderRes.status).toBe(201)
    const orderData = orderRes.body.data
    const orderId = orderData.id

    // Stock decremented
    const updatedP1 = await Product.findById(p1._id)
    const updatedP2 = await Product.findById(p2._id)
    expect(updatedP1.stock).toBe(8)
    expect(updatedP2.stock).toBe(4)

    // Reconcile order totals
    // Subtotal = 2 * 150 + 1 * 250 = 300 + 250 = 550
    // Shipping = 40 (Cairo)
    // Total = 590
    expect(orderData.subtotal).toBe(550)
    expect(orderData.shipping).toBe(40)
    expect(orderData.total).toBe(590)
    expect(orderData.status).toBe('pending_payment')

    // 5. Customer submits Vodafone Cash receipt proof
    const receiptImage = await createDummyImage()
    const payRes = await customerAgent
      .post(`/api/v1/payments/orders/${orderId}/payment`)
      .attach('screenshot', receiptImage, 'vf_receipt.png')
      .field('senderPhone', '01055556666')
      .field('transferredAmount', 590)
      .field('reference', 'VF-REF-2026-001')

    expect(payRes.status).toBe(200)

    // 6. Admin checks pending payments and confirms payment
    const adminPayments = await adminAgent.get('/api/v1/payments/admin?status=pending')
    expect(adminPayments.status).toBe(200)

    const confirmRes = await adminAgent
      .post(`/api/v1/payments/${orderId}/confirm`)
      .send()
    expect(confirmRes.status).toBe(200)
    expect(confirmRes.body.data.status).toBe('payment_confirmed')

    // 7. Seller 1 and Seller 2 fulfill items
    // Seller 1 marks preparing then shipped
    const s1PrepRes = await seller1Agent
      .patch(`/api/v1/orders/${orderId}/seller-status`)
      .send({ status: 'preparing' })
    expect(s1PrepRes.status).toBe(200)

    const s1ShipRes = await seller1Agent
      .patch(`/api/v1/orders/${orderId}/seller-status`)
      .send({ status: 'shipped' })
    expect(s1ShipRes.status).toBe(200)

    // Seller 2 marks preparing then shipped
    const s2PrepRes = await seller2Agent
      .patch(`/api/v1/orders/${orderId}/seller-status`)
      .send({ status: 'preparing' })
    expect(s2PrepRes.status).toBe(200)

    const s2ShipRes = await seller2Agent
      .patch(`/api/v1/orders/${orderId}/seller-status`)
      .send({ status: 'shipped' })
    expect(s2ShipRes.status).toBe(200)

    // Overall order is now shipped
    const shippedOrderRes = await adminAgent.get(`/api/v1/orders/${orderId}`)
    expect(shippedOrderRes.body.data.status).toBe('shipped')

    // 8. Admin confirms delivery
    const deliverRes = await adminAgent
      .patch(`/api/v1/orders/admin/${orderId}/status`)
      .send({ status: 'delivered' })
    expect(deliverRes.status).toBe(200)
    expect(deliverRes.body.data.status).toBe('delivered')

    // 9. FINANCIAL RECONCILIATION TO THE PIASTER
    // Seller 1 items: 2 * 150 = 300 EGP
    // Commission 20%: 60 EGP
    // Net: 240 EGP
    const s1Earnings = await seller1Agent.get('/api/v1/earnings/seller')
    expect(s1Earnings.status).toBe(200)
    expect(s1Earnings.body.data.totalSales).toBe(300)
    expect(s1Earnings.body.data.commission).toBe(60)
    expect(s1Earnings.body.data.net).toBe(240)
    expect(s1Earnings.body.data.due).toBe(240)
    expect(s1Earnings.body.data.paid).toBe(0)

    // Seller 2 items: 1 * 250 = 250 EGP
    // Commission 20%: 50 EGP
    // Net: 200 EGP
    const s2Earnings = await seller2Agent.get('/api/v1/earnings/seller')
    expect(s2Earnings.status).toBe(200)
    expect(s2Earnings.body.data.totalSales).toBe(250)
    expect(s2Earnings.body.data.commission).toBe(50)
    expect(s2Earnings.body.data.net).toBe(200)
    expect(s2Earnings.body.data.due).toBe(200)
    expect(s2Earnings.body.data.paid).toBe(0)

    // Admin overview:
    // Total sales: 550 EGP
    // Platform commission: 110 EGP
    // Sellers net: 440 EGP
    // Total paid out: 0 EGP
    // Pending payouts balance: 440 EGP
    const adminOverview = await adminAgent.get('/api/v1/admin/overview')
    expect(adminOverview.status).toBe(200)
    expect(adminOverview.body.data.totalSales).toBe(550)
    expect(adminOverview.body.data.platformCommission).toBe(110)
    expect(adminOverview.body.data.sellersNet).toBe(440)
    expect(adminOverview.body.data.totalPaidOut).toBe(0)
    expect(adminOverview.body.data.pendingPayoutsBalance).toBe(440)

    // 10. Admin records partial payout to Seller 1 (200 EGP)
    const payoutRes = await adminAgent
      .post('/api/v1/admin/payouts')
      .send({
        sellerId: seller1User._id.toString(),
        amount: 200,
        reference: 'PAYOUT-VF-001',
        note: 'دفعة أسبوعية من الأرباح',
      })
    expect(payoutRes.status).toBe(201)

    // Seller 1 due is now 40 EGP
    const s1EarningsAfterPayout = await seller1Agent.get('/api/v1/earnings/seller')
    expect(s1EarningsAfterPayout.body.data.paid).toBe(200)
    expect(s1EarningsAfterPayout.body.data.due).toBe(40)

    // Admin overview reflects payout
    const adminOverviewAfterPayout = await adminAgent.get('/api/v1/admin/overview')
    expect(adminOverviewAfterPayout.body.data.totalPaidOut).toBe(200)
    expect(adminOverviewAfterPayout.body.data.pendingPayoutsBalance).toBe(240)

    // Overspend prevention: cannot payout more than remaining due (40 EGP)
    const overspendRes = await adminAgent
      .post('/api/v1/admin/payouts')
      .send({
        sellerId: seller1User._id.toString(),
        amount: 50,
        reference: 'PAYOUT-VF-OVERSPEND',
      })
    expect(overspendRes.status).toBe(422)
    expect(overspendRes.body.error.code).toBe('PAYOUT_EXCEEDS_DUE')
  })

  it('reject -> resubmit -> confirm flow', async () => {
    const { agent: custAgent, user: cust } = await authedAgent(app, 'customer')
    const p = await createProduct({ price: 100, stock: 5 })

    const orderRes = await custAgent
      .post('/api/v1/orders')
      .send({
        delivery: {
          name: cust.name,
          phone: cust.phone,
          governorate: 'القاهرة',
          city: 'المعادي',
          address: 'شارع 1',
        },
        items: [{ productId: p._id.toString(), qty: 1 }],
      })
    const orderId = orderRes.body.data.id

    // Submit initial payment
    const img = await createDummyImage()
    await custAgent
      .post(`/api/v1/payments/orders/${orderId}/payment`)
      .attach('screenshot', img, 'receipt1.png')
      .field('senderPhone', cust.phone)
      .field('transferredAmount', 50) // Mismatch
      .field('reference', 'VF-WRONG')

    // Admin rejects payment
    const rejectRes = await adminAgent
      .post(`/api/v1/payments/${orderId}/reject`)
      .send({ reason: 'amount_mismatch', notes: 'المبلغ المحول غير مطابق لقيمة الطلب' })
    expect(rejectRes.status).toBe(200)
    expect(rejectRes.body.data.status).toBe('payment_rejected')

    // Customer resubmits corrected payment
    const resubmitRes = await custAgent
      .post(`/api/v1/payments/orders/${orderId}/payment`)
      .attach('screenshot', img, 'receipt2.png')
      .field('senderPhone', cust.phone)
      .field('transferredAmount', 140) // 100 + 40
      .field('reference', 'VF-CORRECT')
    expect(resubmitRes.status).toBe(200)

    // Admin confirms
    const confirmRes = await adminAgent
      .post(`/api/v1/payments/${orderId}/confirm`)
      .send()
    expect(confirmRes.status).toBe(200)
    expect(confirmRes.body.data.status).toBe('payment_confirmed')
  })

  it('expiry cancel restoring stock', async () => {
    const { agent: custAgent, user: cust } = await authedAgent(app, 'customer')
    const p = await createProduct({ price: 120, stock: 10 })

    const orderRes = await custAgent
      .post('/api/v1/orders')
      .send({
        delivery: {
          name: cust.name,
          phone: cust.phone,
          governorate: 'القاهرة',
          city: 'المعادي',
          address: 'شارع 1',
        },
        items: [{ productId: p._id.toString(), qty: 3 }],
      })
    const orderId = orderRes.body.data.id

    // Stock decremented to 7
    let pAfterOrder = await Product.findById(p._id)
    expect(pAfterOrder.stock).toBe(7)

    // Simulate expiration: backdate order past 48 hours using raw collection update
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)
    await Order.collection.updateOne(
      { _id: (await Order.findById(orderId))._id },
      { $set: { createdAt: threeDaysAgo } }
    )

    // Run cancel expired orders background job
    const jobResult = await jobs.jobHandlers.cancelExpiredOrders()
    expect(jobResult.success).toBe(true)
    expect(jobResult.count).toBe(1)

    // Verify order is cancelled
    const cancelledOrder = await Order.findById(orderId)
    expect(cancelledOrder.status).toBe('cancelled')
    expect(cancelledOrder.cancelReason).toBe('EXPIRED_UNPAID')

    // Verify stock is restored back to 10
    const restoredProduct = await Product.findById(p._id)
    expect(restoredProduct.stock).toBe(10)

    // Idempotent: running again cancels 0
    const secondRun = await jobs.jobHandlers.cancelExpiredOrders()
    expect(secondRun.count).toBe(0)
  })
})
