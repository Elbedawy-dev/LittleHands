import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { jobs } from '../../src/jobs/index.js'
import { Order } from '../../src/db/models/Order.js'
import { Payment } from '../../src/db/models/Payment.js'
import { Upload } from '../../src/db/models/Upload.js'
import { Notification } from '../../src/db/models/Notification.js'
import { EmailLog } from '../../src/db/models/EmailLog.js'
import { createUser, createOrder } from '../helpers/factories.js'
import { email } from '../../src/infra/email/index.js'
import { emailQueue } from '../../src/infra/email/queue.js'
import { storage } from '../../src/infra/storage/index.js'

describe('Background Jobs Subsystem', () => {
  beforeEach(async () => {
    email.clearCaptured()
  })

  it('cancelExpiredOrders cancels unpaid orders older than 48 hours and is idempotent', async () => {
    const customer = await createUser({ role: 'customer' })
    const oldDate = new Date(Date.now() - 50 * 60 * 60 * 1000) // 50 hours ago
    const recentDate = new Date(Date.now() - 10 * 60 * 60 * 1000) // 10 hours ago

    // Expired order
    const expiredOrder = await createOrder({
      customerId: customer._id,
      status: 'pending_payment',
    })
    await Order.collection.updateOne({ _id: expiredOrder._id }, { $set: { createdAt: oldDate } })

    // Recent order
    const recentOrder = await createOrder({
      customerId: customer._id,
      status: 'pending_payment',
    })
    await Order.collection.updateOne({ _id: recentOrder._id }, { $set: { createdAt: recentDate } })

    // Run job 1st time
    const res1 = await jobs.run('cancelExpiredOrders')
    expect(res1.success).toBe(true)
    expect(res1.count).toBe(1)

    const updatedExpired = await Order.findById(expiredOrder._id)
    expect(updatedExpired.status).toBe('cancelled')
    expect(updatedExpired.cancelReason).toBe('EXPIRED_UNPAID')

    const updatedRecent = await Order.findById(recentOrder._id)
    expect(updatedRecent.status).toBe('pending_payment')

    // Run job 2nd time (test idempotency: 0 orders cancelled on rerun)
    const res2 = await jobs.run('cancelExpiredOrders')
    expect(res2.success).toBe(true)
    expect(res2.count).toBe(0)
  })

  it('pendingPaymentReminder notifies admins when payments are pending > 24 hours', async () => {
    const admin = await createUser({ role: 'admin' })
    const customer = await createUser({ role: 'customer' })
    const order = await createOrder({ customerId: customer._id })

    const oldSubmittedAt = new Date(Date.now() - 30 * 60 * 60 * 1000) // 30 hours ago

    await Payment.create({
      orderId: order._id,
      senderPhone: '01012345678',
      transferredAmount: 140,
      screenshot: { key: 'screenshot_1.webp', url: '/api/v1/files/screenshot_1.webp' },
      status: 'pending',
      submittedAt: oldSubmittedAt,
    })

    const res = await jobs.run('pendingPaymentReminder')
    expect(res.success).toBe(true)
    expect(res.count).toBe(1)

    const adminNotifs = await Notification.find({ userId: admin._id, type: 'payment' })
    expect(adminNotifs.length).toBeGreaterThanOrEqual(1)
    expect(adminNotifs[0].title).toContain('تذكير')
  })

  it('retryFailedEmails retries failed items in queue and respects max attempts', async () => {
    // Inject a failed item into emailQueue
    const mockEmailPayload = {
      from: 'test@littlehands.eg',
      to: 'retry_test@test.eg',
      subject: 'Retry Test',
      html: '<p>Retry</p>',
      text: 'Retry',
      templateKey: 'verify-email',
      locale: 'ar',
    }

    const logEntry = await EmailLog.create({
      to: 'retry_test@test.eg',
      template: 'verify-email',
      status: 'failed',
      attempts: 1,
      error: 'Simulated network timeout',
    })

    emailQueue.queue.set('test_queue_item', {
      id: 'test_queue_item',
      logId: logEntry._id,
      templateKey: 'verify-email',
      to: 'retry_test@test.eg',
      data: {},
      locale: 'ar',
      payload: mockEmailPayload,
      attempts: 1,
      maxAttempts: 5,
      nextRetryAt: Date.now() - 1000, // Ready for retry
      lastError: 'Simulated network timeout',
    })

    expect(emailQueue.getQueueSize()).toBe(1)

    const res = await jobs.run('retryFailedEmails')
    expect(res.success).toBe(true)
    expect(res.retriedCount).toBe(1)
    expect(res.successCount).toBe(1)
    expect(emailQueue.getQueueSize()).toBe(0)

    const updatedLog = await EmailLog.findById(logEntry._id)
    expect(updatedLog.status).toBe('sent')
    expect(updatedLog.attempts).toBe(2)
  })

  it('cleanupOrphanUploads cleans unattached uploads older than 24 hours, preserves attached ones', async () => {
    const validPngBuffer = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: { r: 50, g: 50, b: 50 },
      },
    })
      .png()
      .toBuffer()

    // 1. Orphan upload older than 24 hours (should be deleted)
    const oldOrphan = await storage.saveImage({ buffer: validPngBuffer, originalname: 'old_orphan.png' }, { kind: 'product' })
    const oldDate = new Date(Date.now() - 26 * 60 * 60 * 1000)
    await Upload.collection.updateOne({ key: oldOrphan.key }, { $set: { createdAt: oldDate } })

    // 2. Recent orphan upload (< 24 hours, should NOT be deleted)
    const recentOrphan = await storage.saveImage({ buffer: validPngBuffer, originalname: 'recent_orphan.png' }, { kind: 'product' })

    // 3. Attached upload older than 24 hours (should NOT be deleted)
    const attachedOld = await storage.saveImage({ buffer: validPngBuffer, originalname: 'attached_old.png' }, { kind: 'product' })
    await Upload.collection.updateOne({ key: attachedOld.key }, { $set: { createdAt: oldDate, attachedAt: oldDate } })

    // Verify all 3 physical files exist before cleanup
    const oldPath = path.join(storage.PUBLIC_DIR, oldOrphan.key)
    const recentPath = path.join(storage.PUBLIC_DIR, recentOrphan.key)
    const attachedPath = path.join(storage.PUBLIC_DIR, attachedOld.key)

    expect(fs.existsSync(oldPath)).toBe(true)
    expect(fs.existsSync(recentPath)).toBe(true)
    expect(fs.existsSync(attachedPath)).toBe(true)

    // Run cleanup job
    const res = await jobs.run('cleanupOrphanUploads')
    expect(res.success).toBe(true)
    expect(res.count).toBe(1)

    // Verify old orphan file and DB row were removed
    expect(fs.existsSync(oldPath)).toBe(false)
    const docOld = await Upload.findOne({ key: oldOrphan.key })
    expect(docOld).toBeNull()

    // Verify recent orphan and attached old were preserved
    expect(fs.existsSync(recentPath)).toBe(true)
    expect(fs.existsSync(attachedPath)).toBe(true)

    // Clean up remaining
    await storage.remove(recentOrphan.key)
    await storage.remove(attachedOld.key)
  })
})
