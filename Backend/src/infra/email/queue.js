import { EmailLog } from '../../db/models/EmailLog.js'
import { Setting } from '../../db/models/Setting.js'
import { User } from '../../db/models/User.js'
import { env } from '../../config/env.js'
import { consoleDriver } from './drivers/console.js'
import { smtpDriver } from './drivers/smtp.js'
import { renderTemplate } from './templates/index.js'

// Always sent regardless of user preferences or settings
const CRITICAL_TEMPLATES = new Set(['verify-email', 'password-reset', 'seller-welcome'])

class EmailQueue {
  constructor() {
    this.queue = new Map()
    this.counter = 0
  }

  getDriver() {
    if (env.EMAIL_DRIVER === 'smtp' && env.NODE_ENV !== 'test') {
      return smtpDriver
    }
    return consoleDriver
  }

  /**
   * Checks if an email should be sent based on template, user preferences, and platform settings.
   *
   * @param {string} templateKey
   * @param {string} to
   * @param {Object} [user] - Pre-fetched user object if available
   * @returns {Promise<boolean>}
   */
  async shouldSend(templateKey, to, user = null) {
    // 1. Critical auth emails are ALWAYS sent
    if (CRITICAL_TEMPLATES.has(templateKey)) {
      return true
    }

    try {
      // 2. Check user notification preferences
      let recipientUser = user
      if (!recipientUser && User && typeof User.findOne === 'function') {
        recipientUser = await User.findOne({ email: to.toLowerCase().trim() })
      }

      if (recipientUser && recipientUser.notificationPrefs && recipientUser.notificationPrefs.email === false) {
        console.info(`[EMAIL_QUEUE] Email skipped for ${to}: disabled in user notificationPrefs`)
        return false
      }

      // 3. Check Setting notification toggles
      if (Setting && typeof Setting.findOne === 'function') {
        const setting = await Setting.findOne({ singletonKey: 'platform_settings' })
        if (setting && setting.notifications) {
          if ((templateKey === 'customer-order-received' || templateKey === 'seller-new-order') && setting.notifications.orderCreated === false) {
            console.info(`[EMAIL_QUEUE] Email skipped: orderCreated toggle is off in Setting`)
            return false
          }
          if ((templateKey === 'customer-payment-confirmed' || templateKey === 'admin-new-payment') && setting.notifications.paymentSubmitted === false) {
            console.info(`[EMAIL_QUEUE] Email skipped: paymentSubmitted toggle is off in Setting`)
            return false
          }
          if (templateKey === 'payout-recorded' && setting.notifications.payoutRecorded === false) {
            console.info(`[EMAIL_QUEUE] Email skipped: payoutRecorded toggle is off in Setting`)
            return false
          }
        }
      }
    } catch (err) {
      console.warn('[EMAIL_QUEUE] Warning during shouldSend check:', err.message)
    }

    return true
  }

  /**
   * Retrieves platform support info from Setting to inject into template data
   */
  async getSupportInfo() {
    try {
      if (Setting && typeof Setting.findOne === 'function') {
        const setting = await Setting.findOne({ singletonKey: 'platform_settings' })
        if (setting) {
          return {
            supportPhone: setting.supportPhone || '',
            supportEmail: setting.supportEmail || '',
            whatsappNumber: setting.whatsappNumber || '',
            platformWallet: setting.platformWallet || '',
          }
        }
      }
    } catch {
      // ignore
    }
    return { supportPhone: '', supportEmail: '', whatsappNumber: '', platformWallet: '' }
  }

  /**
   * Sends an email or enqueues it on failure.
   *
   * @param {string} templateKey
   * @param {string} to
   * @param {Object} data
   * @param {Object} [options]
   * @returns {Promise<{ success: boolean, messageId?: string, skipped?: boolean, error?: string }>}
   */
  async enqueueAndSend(templateKey, to, data = {}, { locale = 'ar', user = null } = {}) {
    const should = await this.shouldSend(templateKey, to, user)
    if (!should) {
      return { success: true, skipped: true }
    }

    // Merge support info from platform settings if not provided
    const supportInfo = await this.getSupportInfo()
    const mergedData = {
      ...supportInfo,
      ...data,
      platformWallet: data.platformWallet || supportInfo.platformWallet || '',
    }

    let rendered
    try {
      rendered = renderTemplate(templateKey, mergedData, { locale })
    } catch (err) {
      console.error(`[EMAIL_QUEUE] Failed to render template ${templateKey}:`, err.message)
      return { success: false, error: err.message }
    }

    const driver = this.getDriver()
    const emailPayload = {
      from: env.EMAIL_FROM,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      templateKey,
      locale,
    }

    try {
      const result = await driver.sendMail(emailPayload)

      // Record successful attempt in EmailLog
      await this.recordEmailLog({
        to,
        template: templateKey,
        status: 'sent',
        attempts: 1,
        sentAt: new Date(),
      })

      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.warn(`[EMAIL_QUEUE] Initial delivery failed for ${to} (${templateKey}): ${error.message}`)

      // Record failed attempt in EmailLog
      const logEntry = await this.recordEmailLog({
        to,
        template: templateKey,
        status: 'failed',
        attempts: 1,
        error: error.message,
      })

      // Enqueue for in-process retry with exponential backoff
      const queueId = `eq_${++this.counter}_${Date.now()}`
      this.queue.set(queueId, {
        id: queueId,
        logId: logEntry?._id || null,
        templateKey,
        to,
        data: mergedData,
        locale,
        payload: emailPayload,
        attempts: 1,
        maxAttempts: 5,
        nextRetryAt: Date.now() + 1000, // 1s initial backoff
        lastError: error.message,
      })

      return { success: false, error: error.message, queued: true }
    }
  }

  /**
   * Helper to write/update EmailLog
   */
  async recordEmailLog({ to, template, status, attempts, error, sentAt }) {
    try {
      if (EmailLog && typeof EmailLog.create === 'function') {
        return await EmailLog.create({
          to,
          template,
          status,
          attempts,
          error: error || null,
          sentAt: sentAt || null,
        })
      }
    } catch (e) {
      console.warn('[EMAIL_QUEUE] Failed to record EmailLog:', e.message)
    }
    return null
  }

  /**
   * Retries failed emails from the in-process queue and EmailLog.
   * Called by background cron job every 5 minutes and manual triggers.
   */
  async retryFailed() {
    const now = Date.now()
    const driver = this.getDriver()
    let retriedCount = 0
    let successCount = 0

    // 1. Process in-memory queue
    for (const [id, item] of this.queue.entries()) {
      if (now < item.nextRetryAt) {
        continue
      }

      retriedCount++
      item.attempts++

      try {
        await driver.sendMail(item.payload)
        successCount++

        // Update DB log if logId exists
        if (item.logId && EmailLog && typeof EmailLog.findByIdAndUpdate === 'function') {
          await EmailLog.findByIdAndUpdate(item.logId, {
            status: 'sent',
            attempts: item.attempts,
            sentAt: new Date(),
            error: null,
          })
        }

        this.queue.delete(id)
        console.info(`[EMAIL_QUEUE] Retry successful for ${item.to} on attempt ${item.attempts}`)
      } catch (err) {
        item.lastError = err.message
        if (item.attempts >= item.maxAttempts) {
          console.error(`[EMAIL_QUEUE] Max retry attempts (${item.maxAttempts}) reached for ${item.to} (${item.templateKey})`)
          if (item.logId && EmailLog && typeof EmailLog.findByIdAndUpdate === 'function') {
            await EmailLog.findByIdAndUpdate(item.logId, {
              status: 'failed',
              attempts: item.attempts,
              error: `Permanently failed after ${item.attempts} attempts: ${err.message}`,
            })
          }
          this.queue.delete(id)
        } else {
          // Exponential backoff: 2s, 4s, 8s, 16s (max 300s)
          const backoffDelay = Math.min(1000 * Math.pow(2, item.attempts), 300000)
          item.nextRetryAt = now + backoffDelay
          if (item.logId && EmailLog && typeof EmailLog.findByIdAndUpdate === 'function') {
            await EmailLog.findByIdAndUpdate(item.logId, {
              attempts: item.attempts,
              error: err.message,
            })
          }
          console.warn(`[EMAIL_QUEUE] Retry attempt ${item.attempts} failed for ${item.to}. Next retry in ${backoffDelay}ms`)
        }
      }
    }

    return { retriedCount, successCount, pendingInQueue: this.queue.size }
  }

  getQueueSize() {
    return this.queue.size
  }

  clearQueue() {
    this.queue.clear()
  }
}

export const emailQueue = new EmailQueue()
export default emailQueue
