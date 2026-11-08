import { emailQueue } from './queue.js'
import { consoleDriver } from './drivers/console.js'
import { smtpDriver } from './drivers/smtp.js'
import { templates, renderTemplate } from './templates/index.js'

/**
 * Fixed Email Infrastructure Interface
 */
export const email = {
  /**
   * Sends an email using a template key.
   *
   * @param {string} templateKey
   * @param {string} to - Recipient email
   * @param {Object} data - Template variables
   * @param {Object} [options]
   * @param {'ar'|'en'} [options.locale='ar']
   * @param {Object} [options.user] - Recipient user model (for preference checking)
   * @param {string} [options.dedupKey] - Unique de-duplication key
   * @returns {Promise<{ success: boolean, messageId?: string, skipped?: boolean, error?: string }>}
   */
  async sendTemplate(templateKey, to, data = {}, { locale = 'ar', user = null, dedupKey = null } = {}) {
    return emailQueue.enqueueAndSend(templateKey, to, data, { locale, user, dedupKey })
  },

  /**
   * Retries failed emails from the queue.
   */
  async retryFailed() {
    return emailQueue.retryFailed()
  },

  /**
   * Helper for tests and debug: returns captured emails from console driver
   */
  getCaptured() {
    return consoleDriver.getCaptured()
  },

  /**
   * Helper for tests: clears captured emails
   */
  clearCaptured() {
    consoleDriver.clearCaptured()
    emailQueue.clearQueue()
  },

  /**
   * Returns current pending queue size
   */
  getQueueSize() {
    return emailQueue.getQueueSize()
  },

  // Export drivers and template utilities
  consoleDriver,
  smtpDriver,
  templates,
  renderTemplate,
}

export default email
