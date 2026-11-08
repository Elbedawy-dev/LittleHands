import { describe, it, expect, beforeEach } from 'vitest'
import sharp from 'sharp'
import { createApp } from '../../src/app.js'
import { authedAgent } from '../helpers/authedAgent.js'
import { createOrder } from '../helpers/factories.js'
import { Payment } from '../../src/db/models/Payment.js'

const app = createApp()

async function createDummyPngBuffer() {
  return sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: { r: 255, g: 138, b: 61 },
    },
  })
    .png()
    .toBuffer()
}

describe('Payments Module Integration Tests', () => {
  let samplePngBuffer

  beforeEach(async () => {
    samplePngBuffer = await createDummyPngBuffer()
  })

  describe('POST /api/v1/orders/:id/payment (Submit Proof)', () => {
    it('customer submits payment screenshot proof successfully', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const order = await createOrder({
        customerId: customer._id,
        total: 250,
        status: 'pending_payment',
      })

      const res = await customerAgent
        .post(`/api/v1/payments/orders/${order._id}/payment`)
        .field('senderPhone', '01011112222')
        .field('transferredAmount', '250')
        .field('reference', 'VF-998877')
        .attach('screenshot', samplePngBuffer, 'vodafone_receipt.png')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const orderData = res.body.data
      expect(orderData.status).toBe('pending_payment')
      expect(orderData.payment).toBeDefined()
      expect(orderData.payment.senderPhone).toBe('01011112222')
      expect(orderData.payment.transferredAmount).toBe(250)
      expect(orderData.payment.reference).toBe('VF-998877')
      expect(orderData.payment.status).toBe('pending')
      // Customer must NOT see risk flags
      expect(orderData.payment.flags).toBeUndefined()

      // Verify payment document in DB
      const dbPayment = await Payment.findOne({ orderId: order._id })
      expect(dbPayment).toBeDefined()
      expect(dbPayment.attempt).toBe(1)
      expect(dbPayment.flags).toEqual([]) // Exact match, no flags
    })

    it('computes amount_mismatch, duplicate_reference, and duplicate_screenshot flags for admin', async () => {
      const { agent: customerAgent1, user: customer1 } = await authedAgent(app, 'customer')
      const { agent: customerAgent2, user: customer2 } = await authedAgent(app, 'customer')
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      // First order & payment
      const order1 = await createOrder({ customerId: customer1._id, total: 300 })
      await customerAgent1
        .post(`/api/v1/payments/orders/${order1._id}/payment`)
        .field('senderPhone', '01011112222')
        .field('transferredAmount', '300')
        .field('reference', 'TXN-REPEATED-100')
        .attach('screenshot', samplePngBuffer, 'receipt1.png')

      // Second order by different customer:
      // - amount is 200 while order total is 300 (amount_mismatch)
      // - reference is identical (duplicate_reference)
      // - screenshot is identical (duplicate_screenshot)
      const order2 = await createOrder({ customerId: customer2._id, total: 300 })
      const res = await customerAgent2
        .post(`/api/v1/payments/orders/${order2._id}/payment`)
        .field('senderPhone', '01033334444')
        .field('transferredAmount', '200')
        .field('reference', 'TXN-REPEATED-100')
        .attach('screenshot', samplePngBuffer, 'receipt2.png')

      expect(res.status).toBe(200)

      // Verify risk flags in DB / Admin view
      const dbPayment = await Payment.findOne({ orderId: order2._id })
      expect(dbPayment.flags).toContain('amount_mismatch')
      expect(dbPayment.flags).toContain('duplicate_reference')
      expect(dbPayment.flags).toContain('duplicate_screenshot')

      // Admin detail view exposes all flags
      const adminOrderRes = await adminAgent.get(`/api/v1/orders/admin/${order2._id}`)
      expect(adminOrderRes.status).toBe(200)
      expect(adminOrderRes.body.data.payment.flags).toEqual(
        expect.arrayContaining(['amount_mismatch', 'duplicate_reference', 'duplicate_screenshot'])
      )
    })

    it('enforces maximum 5 payment attempts per order', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const order = await createOrder({ customerId: customer._id, total: 100 })

      // Seed 5 existing attempts
      for (let i = 1; i <= 5; i++) {
        await Payment.create({
          orderId: order._id,
          attempt: i,
          senderPhone: '01011112222',
          transferredAmount: 100,
          screenshot: { key: `key_${i}`, hash: `hash_${i}`, mime: 'image/webp', size: 100, url: `/file_${i}` },
          status: 'rejected',
        })
      }

      // 6th attempt should be rejected with 422
      const res = await customerAgent
        .post(`/api/v1/payments/orders/${order._id}/payment`)
        .field('senderPhone', '01011112222')
        .field('transferredAmount', '100')
        .attach('screenshot', samplePngBuffer, 'attempt6.png')

      expect(res.status).toBe(422)
    })

    it('returns 404 when customer B attempts to submit payment for customer A order', async () => {
      const { user: customerA } = await authedAgent(app, 'customer')
      const { agent: agentB } = await authedAgent(app, 'customer')

      const orderA = await createOrder({ customerId: customerA._id })

      const res = await agentB
        .post(`/api/v1/payments/orders/${orderA._id}/payment`)
        .field('senderPhone', '01011112222')
        .field('transferredAmount', '100')
        .attach('screenshot', samplePngBuffer, 'receipt.png')

      expect(res.status).toBe(404)
    })
  })

  describe('Admin Review (Confirm & Reject Payments)', () => {
    it('admin confirms payment: transitions order to payment_confirmed', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      const order = await createOrder({ customerId: customer._id, total: 200 })
      await customerAgent
        .post(`/api/v1/payments/orders/${order._id}/payment`)
        .field('senderPhone', '01099998888')
        .field('transferredAmount', '200')
        .attach('screenshot', samplePngBuffer, 'valid.png')

      const confirmRes = await adminAgent.post(`/api/v1/payments/admin/${order._id}/confirm`)
      expect(confirmRes.status).toBe(200)
      expect(confirmRes.body.data.status).toBe('payment_confirmed')

      const updatedPayment = await Payment.findOne({ orderId: order._id })
      expect(updatedPayment.status).toBe('confirmed')
      expect(updatedPayment.reviewedAt).toBeDefined()
    })

    it('admin rejects payment: transitions order to payment_rejected with reason and notes', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      const order = await createOrder({ customerId: customer._id, total: 180 })
      await customerAgent
        .post(`/api/v1/payments/orders/${order._id}/payment`)
        .field('senderPhone', '01088887777')
        .field('transferredAmount', '100')
        .attach('screenshot', samplePngBuffer, 'unclear.png')

      const rejectRes = await adminAgent.post(`/api/v1/payments/admin/${order._id}/reject`).send({
        reason: 'المبلغ غير مطابق',
        notes: 'المبلغ المحول أقل من إجمالي الطلب',
        notify: true,
      })
      expect(rejectRes.status).toBe(200)
      expect(rejectRes.body.data.status).toBe('payment_rejected')

      const updatedPayment = await Payment.findOne({ orderId: order._id })
      expect(updatedPayment.status).toBe('rejected')
      expect(updatedPayment.rejectReason).toBe('المبلغ غير مطابق')
      expect(updatedPayment.rejectNotes).toBe('المبلغ المحول أقل من إجمالي الطلب')
    })

    it('admin gets payments list with counts in meta', async () => {
      const { agent: adminAgent } = await authedAgent(app, 'admin')
      const order = await createOrder()

      await Payment.create({
        orderId: order._id,
        senderPhone: '01011112222',
        transferredAmount: 150,
        screenshot: { key: 'sample_key', hash: 'sample_hash', mime: 'image/webp', size: 100, url: '/url' },
        status: 'pending',
      })

      const res = await adminAgent.get('/api/v1/payments/admin')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.meta).toBeDefined()
      expect(res.body.meta.counts).toBeDefined()
      expect(res.body.meta.counts.pending).toBeGreaterThanOrEqual(1)
      expect(res.body.data.items).toBeDefined()
    })
  })

  describe('Private Screenshot Streaming & IDOR', () => {
    it('allows owner customer and admin to stream payment screenshot', async () => {
      const { agent: customerAgent, user: customer } = await authedAgent(app, 'customer')
      const { agent: adminAgent } = await authedAgent(app, 'admin')

      const order = await createOrder({ customerId: customer._id })
      await customerAgent
        .post(`/api/v1/payments/orders/${order._id}/payment`)
        .field('senderPhone', '01055556666')
        .field('transferredAmount', '100')
        .attach('screenshot', samplePngBuffer, 'proof.png')

      const payment = await Payment.findOne({ orderId: order._id })

      // Owner customer streams -> 200
      const ownerRes = await customerAgent.get(`/api/v1/payments/${payment._id}/screenshot`)
      expect(ownerRes.status).toBe(200)

      // Admin streams -> 200
      const adminRes = await adminAgent.get(`/api/v1/payments/${payment._id}/screenshot`)
      expect(adminRes.status).toBe(200)
    })

    it('blocks another customer and seller from streaming payment screenshot (returns 404)', async () => {
      const { agent: customerAgent1, user: customer1 } = await authedAgent(app, 'customer')
      const { agent: customerAgent2 } = await authedAgent(app, 'customer')
      const { agent: sellerAgent } = await authedAgent(app, 'seller')

      const order = await createOrder({ customerId: customer1._id })
      await customerAgent1
        .post(`/api/v1/payments/orders/${order._id}/payment`)
        .field('senderPhone', '01055556666')
        .field('transferredAmount', '100')
        .attach('screenshot', samplePngBuffer, 'proof.png')

      const payment = await Payment.findOne({ orderId: order._id })

      // Another customer -> 404
      const otherCustomerRes = await customerAgent2.get(`/api/v1/payments/${payment._id}/screenshot`)
      expect(otherCustomerRes.status).toBe(404)

      // Seller -> 404
      const sellerRes = await sellerAgent.get(`/api/v1/payments/${payment._id}/screenshot`)
      expect(sellerRes.status).toBe(404)
    })
  })
})
