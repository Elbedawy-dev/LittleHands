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
import { eventBus, EVENT_TYPES } from '../../src/events/eventBus.js'
import { calcCommission } from '../../src/utils/money.js'
import { EGYPTIAN_GOVERNORATES } from '../../src/config/constants.js'
import { cairoDaySeries } from '../../src/modules/earnings/dates.js'

const app = createApp()

/** Order item with a commission snapshot taken at the given rate (never the live rate). */
function item(seller, unitPrice, qty = 1, rate = 0.2) {
  const { commission, net } = calcCommission(unitPrice * qty, rate)
  return {
    productId: new mongoose.Types.ObjectId(),
    name: { ar: 'وسيلة تعليمية', en: 'Teaching aid' },
    qty,
    unitPrice,
    sellerId: seller._id,
    commissionRate: rate,
    commissionAmount: commission,
    sellerNet: net,
  }
}

async function sale(seller, unitPrice, { status = 'payment_confirmed', qty = 1, rate = 0.2, ...rest } = {}) {
  const subtotal = unitPrice * qty
  return createOrder({
    sellerId: seller._id,
    status,
    items: [item(seller, unitPrice, qty, rate)],
    subtotal,
    shipping: 40,
    total: subtotal + 40,
    ...rest,
  })
}

const sum = (rows, key) => Math.round(rows.reduce((a, r) => a + r[key], 0) * 100) / 100

describe('B4: earnings, settings, admin', () => {
  beforeEach(async () => {
    await Promise.all([Setting.deleteMany({}), Order.deleteMany({}), Payout.deleteMany({}), AuditLog.deleteMany({})])
  })

  describe('seller earnings', () => {
    it('net + commission = total sales, shipping excluded', async () => {
      const { agent, user: seller } = await authedAgent(app, 'seller')
      await sale(seller, 150, { qty: 2 })
      await sale(seller, 165, { status: 'delivered' })

      const res = await agent.get('/api/v1/earnings/seller/earnings')
      expect(res.status).toBe(200)
      const d = res.body.data
      expect(d.totalSales).toBe(465)
      expect(d.commission).toBe(93)
      expect(d.net).toBe(372)
      expect(Math.round((d.commission + d.net) * 100)).toBe(Math.round(d.totalSales * 100))
      expect(d.orders.total).toBe(2)
      expect(d.orders.items).toHaveLength(2)
    })

    it('due is never negative and equals net - payouts', async () => {
      const { agent, user: seller } = await authedAgent(app, 'seller')
      expect((await agent.get('/api/v1/earnings/seller/earnings')).body.data.due).toBe(0)

      await sale(seller, 100)
      await Payout.create({ sellerId: seller._id, sellerName: seller.name, amount: 50, reference: 'R-1' })
      let d = (await agent.get('/api/v1/earnings/seller/earnings')).body.data
      expect(d.paid).toBe(50)
      expect(d.due).toBe(30)

      // Data inconsistency (payouts above net) must still never yield a negative due
      await Payout.create({ sellerId: seller._id, sellerName: seller.name, amount: 500, reference: 'R-2' })
      d = (await agent.get('/api/v1/earnings/seller/earnings')).body.data
      expect(d.due).toBe(0)
    })

    it('excludes pending_payment, payment_rejected and cancelled orders', async () => {
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      await sale(seller, 100)
      await sale(seller, 200, { status: 'pending_payment' })
      await sale(seller, 300, { status: 'payment_rejected' })
      await sale(seller, 400, { status: 'cancelled' })

      const s = (await sellerAgent.get('/api/v1/earnings/seller/earnings')).body.data
      expect([s.totalSales, s.commission, s.net]).toEqual([100, 20, 80])
      const a = (await adminAgent.get('/api/v1/admin/overview')).body.data
      expect([a.totalSales, a.commission, a.sellersNet]).toEqual([100, 20, 80])
      expect(a.totalOrders).toBe(1)
      expect(a.ordersByStatus.pending_payment).toBe(1)
      expect(a.ordersByStatus.cancelled).toBe(1)
    })

    it('changing the commission rate never alters old totals', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const { agent: sellerAgent, user: seller } = await authedAgent(app, 'seller')
      await sale(seller, 100) // snapshot at 20%

      const upd = await adminAgent.put('/api/v1/admin/settings').send({ commissionRate: 0.35 })
      expect(upd.status).toBe(200)
      expect(upd.body.data.commissionRate).toBe(0.35)

      const s = (await sellerAgent.get('/api/v1/earnings/seller/earnings')).body.data
      expect([s.totalSales, s.commission, s.net]).toEqual([100, 20, 80])

      // A new sale after the change keeps its own (new) snapshot
      await sale(seller, 100, { rate: 0.35 })
      const s2 = (await sellerAgent.get('/api/v1/earnings/seller/earnings')).body.data
      expect([s2.totalSales, s2.commission, s2.net]).toEqual([200, 55, 145])
    })

    it('overview: cards, newOrders (her fulfillment pending), series and recent orders', async () => {
      const { agent, user: seller } = await authedAgent(app, 'seller')
      const other = await createUser({ role: 'seller' })
      await sale(seller, 100) // pending fulfillment -> new
      await sale(seller, 100, {
        status: 'preparing',
        sellerFulfillment: [{ sellerId: seller._id, status: 'preparing' }],
      })
      await sale(seller, 100, { status: 'pending_payment' })
      await sale(other, 999)

      const res = await agent.get('/api/v1/earnings/seller/overview?period=week')
      expect(res.status).toBe(200)
      const d = res.body.data
      expect(d.totalSales).toBe(200)
      expect(d.newOrders).toBe(1)
      expect(d.series).toHaveLength(7)
      expect(d.recentOrders).toHaveLength(2)
      expect(sum(d.series, 'sales')).toBe(200)
    })

    it('period buckets include empty days and use the Africa/Cairo day', async () => {
      const { agent, user: seller } = await authedAgent(app, 'seller')
      const keys = cairoDaySeries('week')
      const targetKey = keys[5]
      // 22:30Z on the previous UTC day is 00:30/01:30 on targetKey in Cairo
      const [y, m, d] = targetKey.split('-').map(Number)
      const createdAt = new Date(Date.UTC(y, m - 1, d - 1, 22, 30))
      await sale(seller, 100, { createdAt })

      const week = (await agent.get('/api/v1/earnings/seller/overview?period=week')).body.data
      expect(week.series.map((p) => p.date)).toEqual(keys)
      expect(week.series.find((p) => p.date === targetKey).sales).toBe(100)
      expect(week.series.filter((p) => p.sales === 0)).toHaveLength(6)

      const month = (await agent.get('/api/v1/earnings/seller/overview?period=month')).body.data
      expect(month.series).toHaveLength(30)
      expect(month.series.filter((p) => p.sales === 0).length).toBe(29)

      const bad = await agent.get('/api/v1/earnings/seller/overview?period=year')
      expect(bad.status).toBe(400)
    })

    it('seller never receives payment data, customer contact data or another seller\'s items', async () => {
      const { agent, user: seller } = await authedAgent(app, 'seller')
      const other = await createUser({ role: 'seller' })
      await createOrder({
        sellerId: seller._id,
        status: 'payment_confirmed',
        items: [item(seller, 100), item(other, 500)],
        subtotal: 600,
        shipping: 40,
        total: 640,
      })

      const res = await agent.get('/api/v1/earnings/seller/earnings')
      const row = res.body.data.orders.items[0]
      expect(row.sales).toBe(100)
      expect(row.items).toHaveLength(1)
      const json = JSON.stringify(res.body)
      expect(json).not.toMatch(/senderPhone|screenshot|transferredAmount|01012345678|شارع 9|"total":640|"shipping"/)
      expect(json).not.toContain(other._id.toString())

      const ov = JSON.stringify((await agent.get('/api/v1/earnings/seller/overview')).body)
      expect(ov).not.toMatch(/senderPhone|screenshot|01012345678/)
      expect(ov).not.toContain(other._id.toString())
    })

    it('a seller cannot read another seller\'s earnings or payouts; roles are enforced', async () => {
      const { agent: s1 } = await authedAgent(app, 'seller')
      const seller2 = await createUser({ role: 'seller' })
      await sale(seller2, 500)
      await Payout.create({ sellerId: seller2._id, sellerName: 'x', amount: 10, reference: 'R-9' })

      const own = (await s1.get('/api/v1/earnings/seller/overview')).body.data
      expect([own.totalSales, own.net, own.due]).toEqual([0, 0, 0])

      const payouts = await s1.get('/api/v1/earnings/payouts').query({ sellerId: seller2._id.toString() })
      expect(payouts.status).toBe(200)
      expect(payouts.body.data.items).toHaveLength(0)
      const own2 = await s1.get('/api/v1/earnings/seller/payouts').query({ sellerId: seller2._id.toString() })
      expect(own2.body.data.items).toHaveLength(0)

      expect((await s1.get(`/api/v1/admin/sellers/${seller2._id}/orders`)).status).toBe(403)
      expect((await s1.get('/api/v1/admin/overview')).status).toBe(403)
      expect((await s1.post('/api/v1/admin/payouts').send({})).status).toBe(403)

      const { agent: customer } = await authedAgent(app, 'customer')
      expect((await customer.get('/api/v1/earnings/seller/overview')).status).toBe(403)
      expect((await request(app).get('/api/v1/earnings/seller/overview')).status).toBe(401)
    })
  })

  describe('admin payouts', () => {
    it('rejects a payout above due (422) and records nothing', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      await sale(seller, 100) // net 80

      const res = await admin.post('/api/v1/admin/payouts').send({
        sellerId: seller._id.toString(),
        amount: 80.01,
        reference: 'TX-OVER',
      })
      expect(res.status).toBe(422)
      expect(res.body.error.code).toBe('PAYOUT_EXCEEDS_DUE')
      expect(await Payout.countDocuments()).toBe(0)
    })

    it('records a payout, audits it and emits payout.recorded; due drops accordingly', async () => {
      const { agent: admin, user: adminUser } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      await sale(seller, 100)
      const events = []
      const listener = (p) => events.push(p)
      eventBus.on(EVENT_TYPES.PAYOUT_RECORDED, listener)

      try {
        const res = await admin.post('/api/v1/admin/payouts').send({
          sellerId: seller._id.toString(),
          amount: 30.5,
          reference: 'TX-1',
          note: 'first transfer',
        })
        expect(res.status).toBe(201)
        expect(res.body.data).toMatchObject({ amount: 30.5, reference: 'TX-1', note: 'first transfer' })
        expect(res.body.data.id).toBeTruthy()
        expect(res.body.data._id).toBeUndefined()
      } finally {
        eventBus.off(EVENT_TYPES.PAYOUT_RECORDED, listener)
      }

      expect(events).toHaveLength(1)
      const audit = await AuditLog.findOne({ action: 'PAYOUT_RECORDED' })
      expect(audit).toBeTruthy()
      expect(audit.actorId.toString()).toBe(adminUser._id.toString())
      expect(audit.meta).toMatchObject({ amount: 30.5, dueBefore: 80, dueAfter: 49.5 })

      const list = await admin.get('/api/v1/admin/payouts').query({ sellerId: seller._id.toString() })
      expect(list.body.data).toMatchObject({ total: 1, page: 1, pageSize: 20 })
      const rows = (await admin.get('/api/v1/admin/sellers/earnings')).body.data
      expect(rows.find((r) => r.sellerId === seller._id.toString())).toMatchObject({ paid: 30.5, due: 49.5 })
    })

    it('validates the payload: strict keys, amount, decimals, date not in the future', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      await sale(seller, 1000)
      const base = { sellerId: seller._id.toString(), amount: 10, reference: 'TX' }
      const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10)

      for (const bad of [
        { ...base, amount: 0 },
        { ...base, amount: -5 },
        { ...base, amount: 10.123 },
        { ...base, amount: '10' },
        { ...base, reference: '' },
        { ...base, date: tomorrow },
        { ...base, date: 'not-a-date' },
        { ...base, role: 'admin' },
        { ...base, sellerId: 'nope' },
        { ...base, sellerId: { $ne: null } },
      ]) {
        const res = await admin.post('/api/v1/admin/payouts').send(bad)
        expect(res.status, JSON.stringify(bad)).toBe(400)
      }
      expect(await Payout.countDocuments()).toBe(0)

      const ok = await admin.post('/api/v1/admin/payouts').send({ ...base, date: new Date().toISOString().slice(0, 10) })
      expect(ok.status).toBe(201)

      const unknown = await admin.post('/api/v1/admin/payouts').send({
        ...base,
        sellerId: new mongoose.Types.ObjectId().toString(),
      })
      expect(unknown.status).toBe(404)
      const notSeller = await admin.post('/api/v1/admin/payouts').send({
        ...base,
        sellerId: (await createUser({ role: 'customer' }))._id.toString(),
      })
      expect(notSeller.status).toBe(404)
    })

    it('two concurrent payouts cannot overspend due', async () => {
      const { agent: a1 } = await authedAgent(app, 'admin')
      const { agent: a2 } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      await sale(seller, 125) // net 100

      const send = (agent, ref) =>
        agent.post('/api/v1/admin/payouts').send({ sellerId: seller._id.toString(), amount: 80, reference: ref })
      const [r1, r2] = await Promise.all([send(a1, 'C-1'), send(a2, 'C-2')])

      expect([r1.status, r2.status].sort()).toEqual([201, 422])
      const payouts = await Payout.find({ sellerId: seller._id })
      expect(payouts).toHaveLength(1)
      expect(payouts[0].amount).toBe(80)
    })

    it('many concurrent payouts: exactly floor(due/amount) succeed', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      await sale(seller, 125) // net 100

      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) =>
          admin.post('/api/v1/admin/payouts').send({ sellerId: seller._id.toString(), amount: 30, reference: `M-${i}` })
        )
      )
      expect(results.filter((r) => r.status === 201)).toHaveLength(3)
      expect(results.filter((r) => r.status === 422)).toHaveLength(3)
      const total = (await Payout.find({ sellerId: seller._id })).reduce((a, p) => a + p.amount, 0)
      expect(total).toBe(90)
    })
  })

  describe('admin overview, drill-down and customers', () => {
    it('admin overview equals the exact sum of seller earnings', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')
      const s1 = await createUser({ role: 'seller', name: 'البائعة الأولى' })
      const s2 = await createUser({ role: 'seller', name: 'البائعة الثانية' })
      await sale(s1, 33.33, { qty: 3 }) // rounding-sensitive
      await sale(s1, 19.99)
      await sale(s2, 300, { status: 'preparing' })
      await Payout.create({ sellerId: s1._id, sellerName: s1.name, amount: 20, reference: 'P1' })

      const overview = (await admin.get('/api/v1/admin/overview')).body.data
      const sellers = (await admin.get('/api/v1/admin/sellers/earnings')).body.data
      expect(sellers).toHaveLength(2)
      expect(overview.totalSales).toBe(sum(sellers, 'totalSales'))
      expect(overview.commission).toBe(sum(sellers, 'commission'))
      expect(overview.sellersNet).toBe(sum(sellers, 'net'))
      expect(overview.totalPaidOut).toBe(sum(sellers, 'paid'))
      expect(overview.sellersDue).toBe(sum(sellers, 'due'))
      expect(Math.round((overview.commission + overview.sellersNet) * 100)).toBe(Math.round(overview.totalSales * 100))
      expect(overview.series).toHaveLength(30)
      expect(sum(overview.series, 'sales')).toBe(overview.totalSales)
    })

    it('drill-down shows only that seller\'s items with snapshot money; 404 for unknown seller', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')
      const s1 = await createUser({ role: 'seller' })
      const s2 = await createUser({ role: 'seller' })
      await createOrder({
        sellerId: s1._id,
        status: 'delivered',
        items: [item(s1, 100), item(s2, 50)],
        subtotal: 150,
        shipping: 40,
        total: 190,
      })

      const res = await admin.get(`/api/v1/admin/sellers/${s1._id}/orders`)
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({ total: 1, page: 1, pageSize: 20 })
      const row = res.body.data.items[0]
      expect([row.sales, row.commission, row.net]).toEqual([100, 20, 80])
      expect(row.items).toHaveLength(1)
      expect(row.customerName).toBeTruthy()

      expect((await admin.get(`/api/v1/admin/sellers/${new mongoose.Types.ObjectId()}/orders`)).status).toBe(404)
      expect((await admin.get('/api/v1/admin/sellers/not-an-id/orders')).status).toBe(400)
    })

    it('customers: search, pagination, ordersCount, totalSpent (confirmed items + shipping), lastOrderAt', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')
      const seller = await createUser({ role: 'seller' })
      const customer = await createUser({
        role: 'customer',
        name: 'فاطمة محمود',
        email: 'fatma@nursery.eg',
        phone: '01099887766',
        accountType: 'nursery',
        nurseryName: 'حضانة الأمل',
        governorate: 'الجيزة',
      })
      await createUser({ role: 'customer', name: 'عميلة أخرى' })
      await sale(seller, 300, { customerId: customer._id, shipping: 50, total: 350 })
      await sale(seller, 120, { customerId: customer._id, shipping: 40, total: 160, status: 'delivered' })
      await sale(seller, 900, { customerId: customer._id, status: 'pending_payment' })

      const res = await admin.get('/api/v1/admin/customers').query({ q: 'الأمل' })
      expect(res.status).toBe(200)
      expect(res.body.data).toMatchObject({ total: 1, page: 1, pageSize: 20 })
      const c = res.body.data.items[0]
      expect(c).toMatchObject({
        id: customer._id.toString(),
        name: 'فاطمة محمود',
        accountType: 'nursery',
        governorate: 'الجيزة',
        ordersCount: 3,
        totalSpent: 510,
      })
      expect(c.lastOrderAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|failedLoginCount|lockUntil/)

      const all = await admin.get('/api/v1/admin/customers').query({ pageSize: 1, page: 2 })
      expect(all.body.data).toMatchObject({ total: 2, page: 2, pageSize: 1 })
      expect(all.body.data.items).toHaveLength(1)

      expect((await admin.get('/api/v1/admin/customers').query({ pageSize: 101 })).status).toBe(400)
      // regex metacharacters are escaped, not interpreted
      const rx = await admin.get('/api/v1/admin/customers').query({ q: '.*' })
      expect(rx.status).toBe(200)
      expect(rx.body.data.total).toBe(0)
    })
  })

  describe('settings', () => {
    it('GET /settings/public has no commission keys; /settings is role-shaped', async () => {
      const pub = await request(app).get('/api/v1/settings/public')
      expect(pub.status).toBe(200)
      expect(JSON.stringify(pub.body)).not.toMatch(/commission/i)
      expect(Object.keys(pub.body.data).sort()).toEqual(
        ['deliveryTimeText', 'maintenanceMode', 'platformWallet', 'shippingRates', 'supportEmail', 'supportPhone', 'whatsappNumber']
      )
      expect(pub.body.data.shippingRates).toMatchObject({ greater_cairo: 40, giza: 45, alexandria: 50 })

      const anon = await request(app).get('/api/v1/settings')
      expect(anon.body.data.commissionRate).toBeUndefined()
      const { agent: customer } = await authedAgent(app, 'customer')
      expect(JSON.stringify((await customer.get('/api/v1/settings')).body)).not.toMatch(/commission|payoutSchedule/i)
      const { agent: seller } = await authedAgent(app, 'seller')
      const s = (await seller.get('/api/v1/settings')).body.data
      expect(s.commissionRate).toBe(0.2)
      expect(s).toHaveProperty('payoutScheduleText')
      const { agent: admin } = await authedAgent(app, 'admin')
      expect((await admin.get('/api/v1/settings')).body.data.commissionRate).toBe(0.2)
    })

    it('PUT /admin/settings: validates, is audited with before/after, rejects unknown keys', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')

      const ok = await admin.put('/api/v1/admin/settings').send({
        platformWallet: '01012345678',
        supportEmail: 'help@example.com',
        payoutScheduleText: 'كل خميس',
        commissionRate: 0.25,
      })
      expect(ok.status).toBe(200)
      expect(ok.body.data).toMatchObject({ platformWallet: '01012345678', commissionRate: 0.25 })

      const audit = await AuditLog.findOne({ action: 'SETTINGS_UPDATED' })
      expect(audit.meta.before.commissionRate).toBe(0.2)
      expect(audit.meta.after.commissionRate).toBe(0.25)
      expect(audit.meta.after.platformWallet).toBe('01012345678')

      for (const bad of [
        { commissionRate: 0.51 },
        { commissionRate: -0.01 },
        { commissionRate: 20 },
        { commissionRate: '0.2' },
        { platformWallet: '0123' },
        { platformWallet: '01312345678' },
        { supportPhone: 'abc' },
        { supportEmail: 'not-an-email' },
        { isAdmin: true },
        { role: 'admin' },
        { shippingRates: { not_a_zone_id_ok: -1 } },
        { shippingRates: { unknown_zone: 10 } },
        { $set: { commissionRate: 0 } },
      ]) {
        const res = await admin.put('/api/v1/admin/settings').send(bad)
        expect(res.status, JSON.stringify(bad)).toBe(400)
      }
      const state = (await admin.get('/api/v1/admin/settings')).body.data
      expect(state.commissionRate).toBe(0.25)

      // Wallet can be cleared
      expect((await admin.put('/api/v1/admin/settings').send({ platformWallet: '' })).body.data.platformWallet).toBe('')
    })

    it('only admins can change settings (CSRF header is enforced too)', async () => {
      const { agent: seller } = await authedAgent(app, 'seller')
      expect((await seller.put('/api/v1/admin/settings').send({ commissionRate: 0 })).status).toBe(403)
      const { agent: customer } = await authedAgent(app, 'customer')
      expect((await customer.put('/api/v1/admin/settings/shipping-rates').send({ giza: 1 })).status).toBe(403)
      const noCsrf = await request(app).put('/api/v1/admin/settings').send({ commissionRate: 0 })
      expect([401, 403]).toContain(noCsrf.status)
    })

    it('shipping rates: price map update, partition rules, audit', async () => {
      const { agent: admin } = await authedAgent(app, 'admin')

      const pub = await request(app).get('/api/v1/settings/shipping-rates')
      expect(pub.status).toBe(200)
      expect(pub.body.data.upper_egypt).toBe(65)
      expect(pub.body.meta.zones.flatMap((z) => z.governorates).sort()).toEqual([...EGYPTIAN_GOVERNORATES].sort())

      const priceUpdate = await admin.put('/api/v1/admin/settings/shipping-rates').send({ greater_cairo: 45.5, giza: 0 })
      expect(priceUpdate.status).toBe(200)
      expect(priceUpdate.body.data).toMatchObject({ greater_cairo: 45.5, giza: 0, alexandria: 50 })
      expect(await AuditLog.countDocuments({ action: 'SHIPPING_RATES_UPDATED' })).toBe(1)

      for (const bad of [
        { greater_cairo: -1 },
        { greater_cairo: 10.123 },
        { greater_cairo: '40' },
        { nope: 10 },
        {},
        { zones: [{ zone: 'cairo_only', price: 40, governorates: ['القاهرة'] }] },
        {
          zones: [
            { zone: 'z1', price: 40, governorates: [...EGYPTIAN_GOVERNORATES] },
            { zone: 'z2', price: 50, governorates: ['القاهرة'] },
          ],
        },
        { zones: [{ zone: 'z1', price: -5, governorates: [...EGYPTIAN_GOVERNORATES] }] },
        { zones: [{ zone: 'z1', price: 5, governorates: [...EGYPTIAN_GOVERNORATES, 'اتلانتس'] }] },
      ]) {
        const res = await admin.put('/api/v1/admin/settings/shipping-rates').send(bad)
        expect(res.status, JSON.stringify(bad)).toBe(400)
      }

      const valid = await admin.put('/api/v1/admin/settings/shipping-rates').send({
        zones: [
          { zone: 'cairo_giza', price: 45, governorates: ['القاهرة', 'الجيزة'] },
          { zone: 'others', price: 60, governorates: EGYPTIAN_GOVERNORATES.filter((g) => g !== 'القاهرة' && g !== 'الجيزة') },
        ],
      })
      expect(valid.status).toBe(200)
      expect(valid.body.data).toEqual({ cairo_giza: 45, others: 60 })
      const audit = await AuditLog.findOne({ action: 'SHIPPING_RATES_UPDATED' }).sort({ createdAt: -1 })
      expect(audit.meta.before).toBeTruthy()
      expect(audit.meta.after).toHaveLength(2)
    })
  })
})
