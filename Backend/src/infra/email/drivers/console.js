/**
 * Console Email Driver
 * Logs rendered emails to console and captures them in memory for inspection and automated tests.
 */

class ConsoleEmailDriver {
  constructor() {
    this.captured = []
  }

  /**
   * Sends an email by logging to console and capturing in memory.
   *
   * @param {Object} options
   * @param {string} options.from
   * @param {string} options.to
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} options.text
   * @param {string} options.templateKey
   * @param {string} [options.locale='ar']
   * @returns {Promise<{ messageId: string, response: string }>}
   */
  async sendMail({ from, to, subject, html, text, templateKey, locale = 'ar' }) {
    const messageId = `console_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const record = {
      messageId,
      from,
      to,
      subject,
      html,
      text,
      templateKey,
      locale,
      timestamp: new Date().toISOString(),
    }

    this.captured.push(record)

    console.info(`[EMAIL_CONSOLE] To: ${to} | Subject: "${subject}" | Template: ${templateKey} (${locale})`)
    console.info(`[EMAIL_CONSOLE] Text Preview: ${text.substring(0, 150).replace(/\n/g, ' ')}...`)

    return {
      messageId,
      response: 'Logged to console',
    }
  }

  getCaptured() {
    return [...this.captured]
  }

  clearCaptured() {
    this.captured = []
  }
}

export const consoleDriver = new ConsoleEmailDriver()
export default consoleDriver
