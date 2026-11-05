import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createUser, createOrder } from '../helpers/factories.js'
import { Payout } from '../../src/db/models/Payout.js'
import { Order } from '../../src/db/models/Order.js'
import { Setting } from '../../src/db/models/Setting.js'
import { AuditLog } from '../../src/db/models/AuditLog.js'
import { EGYPTIAN_GOVERNORATES } from '../../src/config/constants.js'

const app = createApp()

describe('B4 Module Integration Tests: Earnings, Settings, and Admin', () => {
  beforeEach(async () => {
    await Setting.deleteMany({})
    await Order.deleteMany({})
    await Payout.deleteMany({})
    await AuditLog.deleteMany({})
  })

  // TEST 1: sellers' (net) + commission = total sales
  it('sellers (net) + commission = total sales mathematically', async () => {
    const { agent, user: seller } = await authedAgent(app, 'seller')

    // Create 2 confirmed orders with snapshotted items
    await createOrder({
      sellerId: seller._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة 1', en: 'Aid 1' },
          qty: 2,
          unitPrice: 150,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 60,
          sellerNet: 240,
        },
      ],
      subtotal: 300,
      shipping: 40,
      total: 340,
    })

    await createOrder({
      sellerId: seller._id,
      status: 'delivered',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة 2', en: 'Aid 2' },
          qty: 1,
          unitPrice: 165,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 33,
          sellerNet: 132,
        },
      ],
      subtotal: 165,
      shipping: 50,
      total: 215,
    })

    const res = await agent.get('/api/v1/earnings/seller/earnings')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const { totalSales, commission, net } = res.body.data
    expect(totalSales).toBe(465)
    expect(commission).toBe(93)
    expect(net).toBe(372)
    expect(Math.round((commission + net) * 100) / 100).toBe(totalSales)
  })

  // TEST 2: due never negative
  it('ensures due is never negative even after payouts', async () => {
    const { agent, user: seller } = await authedAgent(app, 'seller')

    const resBefore = await agent.get('/api/v1/earnings/seller/earnings')
    expect(resBefore.body.data.due).toBe(0)
    expect(resBefore.body.data.due).toBeGreaterThanOrEqual(0)

    // Add order with net 80
    await createOrder({
      sellerId: seller._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة', en: 'Aid' },
          qty: 1,
          unitPrice: 100,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 20,
          sellerNet: 80,
        },
      ],
      subtotal: 100,
      shipping: 40,
      total: 140,
    })

    // Record payout of 80 directly
    await Payout.create({
      sellerId: seller._id,
      sellerName: seller.name,
      amount: 80,
      reference: 'REF-123456',
    })

    const resAfter = await agent.get('/api/v1/earnings/seller/earnings')
    expect(resAfter.body.data.net).toBe(80)
    expect(resAfter.body.data.paid).toBe(80)
    expect(resAfter.body.data.due).toBe(0)
  })

  // TEST 3: payout above due rejected
  it('rejects payout when amount exceeds seller due balance (422)', async () => {
    const { agent: adminAgent } = await authedAgent(app, 'admin')
    const seller = await createUser({ role: 'seller' })

    // Seller has net 80 from confirmed order
    await createOrder({
      sellerId: seller._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة', en: 'Aid' },
          qty: 1,
          unitPrice: 100,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 20,
          sellerNet: 80,
        },
      ],
      subtotal: 100,
      shipping: 40,
      total: 140,
    })

    // Admin attempts to record payout of 100 (which exceeds due of 80)
    const res = await adminAgent.post('/api/v1/admin/payouts').send({
      sellerId: seller._id.toString(),
      amount: 100,
      reference: 'TX-OVERPAY',
      date: new Date().toISOString().split('T')[0],
      note: 'Attempt overpayment',
    })

    expect(res.status).toBe(422)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('PAYOUT_EXCEEDS_DUE')

    // Confirm no payout was recorded
    const payoutsCount = await Payout.countDocuments({ sellerId: seller._id })
    expect(payoutsCount).toBe(0)
  })

  // TEST 4: two concurrent payouts cannot overspend (in-process mutex)
  it('ensures two concurrent payouts cannot overspend due balance using mutex', async () => {
    const { agent: adminAgent1 } = await authedAgent(app, 'admin')
    const { agent: adminAgent2 } = await authedAgent(app, 'admin')
    const seller = await createUser({ role: 'seller' })

    // Seller has net = 100
    await createOrder({
      sellerId: seller._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة كبيرة', en: 'Big Aid' },
          qty: 1,
          unitPrice: 125,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 25,
          sellerNet: 100,
        },
      ],
      subtotal: 125,
      shipping: 40,
      total: 165,
    })

    // Launch two concurrent payout requests of 80 each
    const req1 = adminAgent1.post('/api/v1/admin/payouts').send({
      sellerId: seller._id.toString(),
      amount: 80,
      reference: 'TX-CONCURRENT-1',
    })

    const req2 = adminAgent2.post('/api/v1/admin/payouts').send({
      sellerId: seller._id.toString(),
      amount: 80,
      reference: 'TX-CONCURRENT-2',
    })

    const [res1, res2] = await Promise.all([req1, req2])

    // Exactly one should succeed (201) and one should fail (422)
    const statuses = [res1.status, res2.status].sort()
    expect(statuses).toEqual([201, 422])

    // Total payouts in database must be strictly 80 (not 160)
    const payouts = await Payout.find({ sellerId: seller._id })
    expect(payouts).toHaveLength(1)
    expect(payouts[0].amount).toBe(80)
  })

  // TEST 5: changing the commission rate does not change old totals
  it('changing commission rate does not alter historical order snapshot earnings', async () => {
    const { agent: adminAgent } = await authedAgent(app, 'admin')
    const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')

    // Create order with 20% commission snapshot (sales 100, commission 20, net 80)
    await createOrder({
      sellerId: seller._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة قديمة', en: 'Old Aid' },
          qty: 1,
          unitPrice: 100,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 20,
          sellerNet: 80,
        },
      ],
      subtotal: 100,
      shipping: 40,
      total: 140,
    })

    // Admin updates commission rate to 35%
    const updateRes = await adminAgent.put('/api/v1/admin/settings').send({
      commissionRate: 35,
    })
    expect(updateRes.status).toBe(200)

    // Check seller earnings: must strictly remain 100 sales, 20 commission, 80 net!
    const sellerRes = await sellerAgent.get('/api/v1/earnings/seller/earnings')
    expect(sellerRes.status).toBe(200)
    expect(sellerRes.body.data.totalSales).toBe(100)
    expect(sellerRes.body.data.commission).toBe(20)
    expect(sellerRes.body.data.net).toBe(80)
  })

  // TEST 6: pending/rejected/cancelled orders excluded
  it('strictly excludes pending_payment, payment_rejected, and cancelled orders from sales', async () => {
    const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
    const { agent: adminAgent } = await authedAgent(app, 'admin')

    // Confirmed sale: 100
    await createOrder({
      sellerId: seller._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'مؤكد', en: 'Confirmed' },
          qty: 1,
          unitPrice: 100,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 20,
          sellerNet: 80,
        },
      ],
      subtotal: 100,
      shipping: 40,
      total: 140,
    })

    // Pending payment: 200 (should be excluded)
    await createOrder({
      sellerId: seller._id,
      status: 'pending_payment',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'معلق', en: 'Pending' },
          qty: 1,
          unitPrice: 200,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 40,
          sellerNet: 160,
        },
      ],
      subtotal: 200,
      shipping: 40,
      total: 240,
    })

    // Rejected: 300 (should be excluded)
    await createOrder({
      sellerId: seller._id,
      status: 'payment_rejected',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'مرفوض', en: 'Rejected' },
          qty: 1,
          unitPrice: 300,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 60,
          sellerNet: 240,
        },
      ],
      subtotal: 300,
      shipping: 40,
      total: 340,
    })

    // Cancelled: 400 (should be excluded)
    await createOrder({
      sellerId: seller._id,
      status: 'cancelled',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'ملغي', en: 'Cancelled' },
          qty: 1,
          unitPrice: 400,
          sellerId: seller._id,
          commissionRate: 0.20,
          commissionAmount: 80,
          sellerNet: 320,
        },
      ],
      subtotal: 400,
      shipping: 40,
      total: 440,
    })

    const sellerRes = await sellerAgent.get('/api/v1/earnings/seller/earnings')
    expect(sellerRes.body.data.totalSales).toBe(100)
    expect(sellerRes.body.data.commission).toBe(20)
    expect(sellerRes.body.data.net).toBe(80)

    const adminRes = await adminAgent.get('/api/v1/admin/overview')
    expect(adminRes.body.data.totalSales).toBe(100)
    expect(adminRes.body.data.commission).toBe(20)
    expect(adminRes.body.data.sellersNet).toBe(80)
  })

  // TEST 7: period buckets include empty days
  it('includes empty days filled with zero in period daily series', async () => {
    const { agent: sellerAgent } = await authedAgent(app, 'seller')
    const { agent: adminAgent } = await authedAgent(app, 'admin')

    const weekRes = await sellerAgent.get('/api/v1/earnings/seller/overview?period=week')
    expect(weekRes.status).toBe(200)
    expect(weekRes.body.data.series).toHaveLength(7)
    weekRes.body.data.series.forEach((day) => {
      expect(day).toHaveProperty('date')
      expect(day).toHaveProperty('sales', 0)
      expect(day).toHaveProperty('orders', 0)
    })

    const monthRes = await adminAgent.get('/api/v1/admin/overview?period=month')
    expect(monthRes.status).toBe(200)
    expect(monthRes.body.data.series).toHaveLength(30)
    monthRes.body.data.series.forEach((day) => {
      expect(day).toHaveProperty('date')
      expect(day).toHaveProperty('sales')
      expect(day).toHaveProperty('commission')
    })
  })

  // TEST 8: /settings/public contains no commission keys
  it('GET /settings/public contains ZERO commission keys or fields', async () => {
    const res = await request(app).get('/api/v1/settings/public')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)

    const jsonString = JSON.stringify(res.body.data)
    expect(jsonString).not.toMatch(/commission/i)
    expect(res.body.data.commissionRate).toBeUndefined()
    expect(res.body.data).toHaveProperty('platformWallet')
    expect(res.body.data).toHaveProperty('shippingRates')

    // Also verify unauthenticated /settings has no commissionRate
    const unauthedRes = await request(app).get('/api/v1/settings')
    expect(unauthedRes.status).toBe(200)
    expect(unauthedRes.body.data.commissionRate).toBeUndefined()
  })

  // TEST 9: seller cannot read another seller's earnings
  it('seller cannot read another sellers earnings or payouts', async () => {
    const { agent: seller1Agent, user: seller1 } = await authedAgent(app, 'seller')
    const seller2 = await createUser({ role: 'seller' })

    // Create order for seller 2 only
    await createOrder({
      sellerId: seller2._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة البائعة 2', en: 'Aid 2' },
          qty: 1,
          unitPrice: 500,
          sellerId: seller2._id,
          commissionRate: 0.20,
          commissionAmount: 100,
          sellerNet: 400,
        },
      ],
      subtotal: 500,
      shipping: 40,
      total: 540,
    })

    // Seller 1 accesses her overview
    const res1 = await seller1Agent.get('/api/v1/earnings/seller/overview')
    expect(res1.body.data.totalSales).toBe(0)
    expect(res1.body.data.net).toBe(0)

    // Seller 1 attempts to query seller 2 payouts
    const payoutsRes = await seller1Agent
      .get('/api/v1/earnings/payouts')
      .query({ sellerId: seller2._id.toString() })
    expect(payoutsRes.status).toBe(200)
    // Server must strictly scope to caller's own payouts (empty)
    expect(payoutsRes.body.data).toHaveLength(0)

    // Seller 1 cannot access admin endpoints
    const adminOrdersRes = await seller1Agent.get(`/api/v1/admin/sellers/${seller2._id}/orders`)
    expect(adminOrdersRes.status).toBe(403)
  })

  // TEST 10: admin overview matches the sum of seller earnings exactly
  it('admin overview totals match the sum of individual seller earnings exactly', async () => {
    const { agent: adminAgent } = await authedAgent(app, 'admin')
    const seller1 = await createUser({ role: 'seller', name: 'البائعة الأولى' })
    const seller2 = await createUser({ role: 'seller', name: 'البائعة الثانية' })

    // Seller 1 order: 200 sales (40 comm, 160 net)
    await createOrder({
      sellerId: seller1._id,
      status: 'payment_confirmed',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة 1', en: 'Aid 1' },
          qty: 1,
          unitPrice: 200,
          sellerId: seller1._id,
          commissionRate: 0.20,
          commissionAmount: 40,
          sellerNet: 160,
        },
      ],
      subtotal: 200,
      shipping: 40,
      total: 240,
    })

    // Seller 2 order: 300 sales (60 comm, 240 net)
    await createOrder({
      sellerId: seller2._id,
      status: 'preparing',
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: { ar: 'وسيلة 2', en: 'Aid 2' },
          qty: 1,
          unitPrice: 300,
          sellerId: seller2._id,
          commissionRate: 0.20,
          commissionAmount: 60,
          sellerNet: 240,
        },
      ],
      subtotal: 300,
      shipping: 45,
      total: 345,
    })

    // Payout of 50 to seller 1
    await Payout.create({
      sellerId: seller1._id,
      sellerName: seller1.name,
      amount: 50,
      reference: 'TX-P1',
    })

    const overviewRes = await adminAgent.get('/api/v1/admin/overview')
    const sellersRes = await adminAgent.get('/api/v1/admin/sellers/earnings')

    expect(overviewRes.status).toBe(200)
    expect(sellersRes.status).toBe(200)

    const overview = overviewRes.body.data
    const sellers = sellersRes.body.data

    const sumSales = sellers.reduce((acc, s) => acc + s.totalSales, 0)
    const sumComm = sellers.reduce((acc, s) => acc + s.commission, 0)
    const sumNet = sellers.reduce((acc, s) => acc + s.net, 0)
    const sumPaid = sellers.reduce((acc, s) => acc + s.paid, 0)
    const sumDue = sellers.reduce((acc, s) => acc + s.due, 0)

    expect(overview.totalSales).toBe(sumSales)
    expect(overview.commission).toBe(sumComm)
    expect(overview.sellersNet).toBe(sumNet)
    expect(overview.totalPaidOut).toBe(sumPaid)
    expect(overview.sellersDue).toBe(sumDue)

    expect(overview.totalSales).toBe(500)
    expect(overview.commission).toBe(100)
    expect(overview.sellersNet).toBe(400)
    expect(overview.totalPaidOut).toBe(50)
    expect(overview.sellersDue).toBe(350)
  })

  // TEST 11: Customers list and search
  it('GET /admin/customers supports search and aggregates ordersCount & totalSpent', async () => {
    const { agent: adminAgent } = await authedAgent(app, 'admin')
    const customer = await createUser({
      role: 'customer',
      name: 'فاطمة محمود',
      email: 'fatma@nursery.eg',
      phone: '01099887766',
      nurseryName: 'حضانة الأمل النموذجية',
      governorate: 'القاهرة',
    })

    await createOrder({
      customerId: customer._id,
      status: 'payment_confirmed',
      total: 350,
      subtotal: 300,
      shipping: 50,
    })

    // Search by nursery name
    const res = await adminAgent.get('/api/v1/admin/customers').query({ q: 'الأمل' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const found = res.body.data.find((c) => c.id === customer._id.toString())
    expect(found).toBeDefined()
    expect(found.ordersCount).toBe(1)
    expect(found.totalSpent).toBe(350)
    expect(found.nurseryName).toBe('حضانة الأمل النموذجية')
  })

  // TEST 12: Shipping rates validation and partition check
  it('enforces partition rules on shipping rates updates: every governorate in exactly one zone', async () => {
    const { agent: adminAgent } = await authedAgent(app, 'admin')

    // 1. Missing governorate should fail with 400
    const invalidZones = [
      {
        zone: 'cairo_only',
        price: 40,
        governorates: ['القاهرة'], // Missing other 26 governorates!
      },
    ]

    const failRes1 = await adminAgent.put('/api/v1/admin/settings/shipping-rates').send(invalidZones)
    expect(failRes1.status).toBe(400)

    // 2. Duplicate governorate across zones should fail with 400
    const duplicateZones = [
      {
        zone: 'z1',
        price: 40,
        governorates: [...EGYPTIAN_GOVERNORATES],
      },
      {
        zone: 'z2',
        price: 50,
        governorates: ['القاهرة'], // Duplicate!
      },
    ]

    const failRes2 = await adminAgent.put('/api/v1/admin/settings/shipping-rates').send(duplicateZones)
    expect(failRes2.status).toBe(400)

    // 3. Valid partition should succeed and record audit log
    const validZones = [
      {
        zone: 'cairo_giza',
        price: 45,
        governorates: ['القاهرة', 'الجيزة'],
      },
      {
        zone: 'all_others',
        price: 60,
        governorates: EGYPTIAN_GOVERNORATES.filter((g) => g !== 'القاهرة' && g !== 'الجيزة'),
      },
    ]

    const successRes = await adminAgent.put('/api/v1/admin/settings/shipping-rates').send(validZones)
    expect(successRes.status).toBe(200)

    const audit = await AuditLog.findOne({ action: 'SHIPPING_RATES_UPDATED' })
    expect(audit).toBeDefined()
  })
})
