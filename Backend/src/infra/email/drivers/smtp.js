import nodemailer from 'nodemailer'
import { env } from '../../../config/env.js'

/**
 * SMTP Email Driver
 * Uses nodemailer pool with SMTP credentials.
 */

class SmtpEmailDriver {
  constructor() {
    this.transporter = null
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST || 'localhost',
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_SECURE || false,
        auth: env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      })
    }
    return this.transporter
  }

  /**
   * Sends an email via SMTP.
   *
   * @param {Object} options
   * @param {string} options.from
   * @param {string} options.to
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} options.text
   * @returns {Promise<{ messageId: string, response: string }>}
   */
  async sendMail({ from, to, subject, html, text }) {
    const transporter = this.getTransporter()
    const info = await transporter.sendMail({
      from: from || env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    })

    return {
      messageId: info.messageId,
      response: info.response,
    }
  }
}

export const smtpDriver = new SmtpEmailDriver()
export default smtpDriver
