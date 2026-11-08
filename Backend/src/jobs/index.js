import cron from 'node-cron'
import { env } from '../config/env.js'
import { Order } from '../db/models/Order.js'
import { Payment } from '../db/models/Payment.js'
import { Upload } from '../db/models/Upload.js'
import { User } from '../db/models/User.js'
import { email } from '../infra/email/index.js'
import { storage } from '../infra/storage/index.js'
import { notifications } from '../infra/notifications/index.js'
import { eventBus, EVENT_TYPES } from '../events/index.js'

/**
 * Background Jobs Registry (Owner: Prompt B5)
 */
export const jobs = {
  tasks: new Map(),

  jobHandlers: {
    /**
     * Job 1: Every 30 minutes - Cancel expired unpaid orders (> 48 hours)
     */
    async cancelExpiredOrders() {
      const startTime = Date.now()
      console.info('[JOB:cancelExpiredOrders] Starting execution...')

      try {
        let result
        try {
          const ordersModule = await import('../modules/orders/service.js')
          if (typeof ordersModule.cancelExpiredUnpaidOrders === 'function') {
            result = await ordersModule.cancelExpiredUnpaidOrders()
            console.info(`[JOB:cancelExpiredOrders] Completed via orders module. Cancelled: ${result?.cancelledCount ?? 0}. Duration: ${Date.now() - startTime}ms`)
            return { success: true, count: result?.cancelledCount ?? 0 }
          } else if (typeof ordersModule.orderService?.cancelExpiredUnpaidOrders === 'function') {
            result = await ordersModule.orderService.cancelExpiredUnpaidOrders()
            console.info(`[JOB:cancelExpiredOrders] Completed via orderService. Cancelled: ${result?.cancelledCount ?? 0}. Duration: ${Date.now() - startTime}ms`)
            return { success: true, count: result?.cancelledCount ?? 0 }
          }
        } catch {
          // orders service not yet built or function missing
        }

        if (Order && typeof Order.find === 'function') {
          const cutoff = new Date(Date.now() - (env.PENDING_ORDER_TTL_HOURS || 48) * 60 * 60 * 1000)
          const expiredOrders = await Order.find({
            status: 'pending_payment',
            createdAt: { $lt: cutoff },
          })

          let cancelled = 0
          for (const order of expiredOrders) {
            const paymentCount = await Payment.countDocuments({ orderId: order._id })
            if (paymentCount === 0) {
              const updated = await Order.findOneAndUpdate(
                { _id: order._id, status: 'pending_payment' },
                {
                  $set: { status: 'cancelled', cancelReason: 'EXPIRED_UNPAID' },
                  $push: {
                    timeline: {
                      status: 'cancelled',
                      note: 'EXPIRED_UNPAID',
                      actor: 'system',
                      byId: null,
                      at: new Date(),
                    },
                  },
                },
                { new: true }
              )
              if (updated) {
                cancelled++
                const { Product } = await import('../db/models/Product.js')
                for (const item of updated.items) {
                  await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } }).catch(() => {})
                }
                eventBus.emit(EVENT_TYPES.ORDER_STATUS_CHANGED, {
                  order: updated,
                  from: 'pending_payment',
                  to: 'cancelled',
                  actorId: null,
                })
                eventBus.emit(EVENT_TYPES.ORDER_CANCELLED, { order: updated })
              }
            }
          }

          console.info(`[JOB:cancelExpiredOrders] Cancelled ${cancelled} expired unpaid orders. Duration: ${Date.now() - startTime}ms`)
          return { success: true, count: cancelled }
        }

        console.info(`[JOB:cancelExpiredOrders] Completed. Duration: ${Date.now() - startTime}ms`)
        return { success: true }
      } catch (err) {
        console.error('[JOB:cancelExpiredOrders] Error:', err.message)
        return { success: false, error: err.message }
      }
    },

    /**
     * Job 2: Hourly - Reminder notification to admins for payments pending > 24 hours
     */
    async pendingPaymentReminder() {
      const _startTime = Date.now()
      console.info('[JOB:pendingPaymentReminder] Starting check...')

      try {
        if (!Payment || typeof Payment.find !== 'function') {
          return { success: true, count: 0 }
        }

        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const pendingPayments = await Payment.find({
          status: 'pending',
          submittedAt: { $lt: cutoff },
        })

        if (pendingPayments.length > 0) {
          const activeAdmins = await User.find({ role: 'admin', status: 'active' })
          for (const admin of activeAdmins) {
            await notifications.notify(admin._id, {
              type: 'payment',
              role: 'admin',
              title: {
                ar: 'تذكير: إيصالات دفع معلقة لأكثر من 24 ساعة',
                en: 'Reminder: Payments pending > 24 hours',
              },
              message: {
                ar: `يوجد ${pendingPayments.length} إيصال دفع معلق بانتظار التدقيق والمراجعة.`,
                en: `There are ${pendingPayments.length} pending payments awaiting review.`,
              },
              params: { count: pendingPayments.length },
              link: '/admin/payments',
            })
          }
          console.info(`[JOB:pendingPaymentReminder] Sent reminder for ${pendingPayments.length} pending payments to ${activeAdmins.length} admins.`)
        } else {
          console.info('[JOB:pendingPaymentReminder] No payments pending > 24 hours.')
        }

        return { success: true, count: pendingPayments.length }
      } catch (err) {
        console.error('[JOB:pendingPaymentReminder] Error:', err.message)
        return { success: false, error: err.message }
      }
    },

    /**
     * Job 3: Every 5 minutes - Retry failed emails from queue
     */
    async retryFailedEmails() {
      const _startTime = Date.now()
      console.info('[JOB:retryFailedEmails] Retrying failed emails...')
      try {
        const result = await email.retryFailed()
        console.info(`[JOB:retryFailedEmails] Processed. Retried: ${result.retriedCount}, Succeeded: ${result.successCount}, Remaining: ${result.pendingInQueue}`)
        return { success: true, ...result }
      } catch (err) {
        console.error('[JOB:retryFailedEmails] Error:', err.message)
        return { success: false, error: err.message }
      }
    },

    /**
     * Job 4: Daily at 3 AM - Cleanup orphan upload rows never attached after 24 hours
     */
    async cleanupOrphanUploads() {
      const startTime = Date.now()
      console.info('[JOB:cleanupOrphanUploads] Starting orphan uploads cleanup...')
      try {
        if (!Upload || typeof Upload.find !== 'function') {
          return { success: true, count: 0 }
        }

        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const orphanUploads = await Upload.find({
          attachedAt: null,
          createdAt: { $lt: cutoff },
        })

        let cleaned = 0
        for (const upload of orphanUploads) {
          await storage.remove(upload.key)
          cleaned++
        }

        console.info(`[JOB:cleanupOrphanUploads] Cleaned ${cleaned} orphan uploads. Duration: ${Date.now() - startTime}ms`)
        return { success: true, count: cleaned }
      } catch (err) {
        console.error('[JOB:cleanupOrphanUploads] Error:', err.message)
        return { success: false, error: err.message }
      }
    },
  },

  /**
   * Runs a job manually by name.
   */
  async run(jobName) {
    const handler = this.jobHandlers[jobName]
    if (!handler) {
      throw new Error(`Unknown job name: "${jobName}". Available jobs: ${Object.keys(this.jobHandlers).join(', ')}`)
    }
    return await handler()
  },

  /**
   * Initializes and starts all scheduled cron jobs.
   */
  start() {
    if (env.NODE_ENV === 'test') {
      return
    }

    // 1. Every 30 minutes: cancel expired unpaid orders
    const cancelExpiredTask = cron.schedule('*/30 * * * *', async () => {
      await this.run('cancelExpiredOrders')
    })
    this.tasks.set('cancelExpiredOrders', cancelExpiredTask)

    // 2. Hourly: reminder for payments pending > 24 hours
    const reminderTask = cron.schedule('0 * * * *', async () => {
      await this.run('pendingPaymentReminder')
    })
    this.tasks.set('pendingPaymentReminder', reminderTask)

    // 3. Every 5 minutes: retry failed emails
    const retryEmailsTask = cron.schedule('*/5 * * * *', async () => {
      await this.run('retryFailedEmails')
    })
    this.tasks.set('retryFailedEmails', retryEmailsTask)

    // 4. Daily at 3:00 AM: cleanup orphan uploads > 24 hours
    const cleanupUploadsTask = cron.schedule('0 3 * * *', async () => {
      await this.run('cleanupOrphanUploads')
    })
    this.tasks.set('cleanupOrphanUploads', cleanupUploadsTask)

    console.info('[JOBS] Background job registry initialized with 4 tasks')
  },

  /**
   * Stops all registered cron tasks.
   */
  stop() {
    for (const [name, task] of this.tasks.entries()) {
      task.stop()
      console.info(`[JOBS] Stopped cron job: ${name}`)
    }
    this.tasks.clear()
  },
}

export default jobs
