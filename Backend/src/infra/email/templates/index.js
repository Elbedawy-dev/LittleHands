import Handlebars from 'handlebars'
import customerOrderReceived from './customerOrderReceived.js'
import customerPaymentConfirmed from './customerPaymentConfirmed.js'
import customerPaymentRejected from './customerPaymentRejected.js'
import customerShipped from './customerShipped.js'
import sellerNewOrder from './sellerNewOrder.js'
import adminNewPayment from './adminNewPayment.js'
import verifyEmail from './verifyEmail.js'
import passwordReset from './passwordReset.js'
import sellerWelcome from './sellerWelcome.js'
import orderCancelled from './orderCancelled.js'
import payoutRecorded from './payoutRecorded.js'
import customRequestAdmin from './customRequestAdmin.js'
import customRequestSeller from './customRequestSeller.js'

export const templates = {
  'customer-order-received': customerOrderReceived,
  'customer-payment-confirmed': customerPaymentConfirmed,
  'customer-payment-rejected': customerPaymentRejected,
  'customer-shipped': customerShipped,
  'seller-new-order': sellerNewOrder,
  'admin-new-payment': adminNewPayment,
  'verify-email': verifyEmail,
  'password-reset': passwordReset,
  'seller-welcome': sellerWelcome,
  'order-cancelled': orderCancelled,
  'payout-recorded': payoutRecorded,
  'custom-request-admin': customRequestAdmin,
  'custom-request-seller': customRequestSeller,
}

// Compile cache for performance
const compiledCache = new Map()

/**
 * Renders an email template with HTML escaping enabled.
 *
 * @param {string} templateKey
 * @param {Object} data
 * @param {Object} [options]
 * @param {'ar'|'en'} [options.locale='ar']
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderTemplate(templateKey, data = {}, { locale = 'ar' } = {}) {
  const tpl = templates[templateKey]
  if (!tpl) {
    throw new Error(`Email template not found: "${templateKey}"`)
  }

  const lang = locale === 'en' ? 'en' : 'ar'
  const isEn = lang === 'en'
  const dir = isEn ? 'ltr' : 'rtl'
  const align = isEn ? 'left' : 'right'
  const oppositeAlign = isEn ? 'right' : 'left'
  const subject = tpl.subject[lang] || tpl.subject.ar

  const hasSupport = Boolean(data.supportPhone || data.whatsappNumber || data.supportEmail)

  const context = {
    ...data,
    lang,
    dir,
    align,
    oppositeAlign,
    title: subject,
    hasSupport,
  }

  let compiled = compiledCache.get(templateKey)
  if (!compiled) {
    compiled = {
      // Handlebars.compile with default options ensures HTML escaping is ON
      html: Handlebars.compile(tpl.html, { noEscape: false }),
      text: Handlebars.compile(tpl.text, { noEscape: false }),
    }
    compiledCache.set(templateKey, compiled)
  }

  const html = compiled.html(context)
  const text = compiled.text(context)

  return {
    subject,
    html,
    text,
  }
}

export default {
  templates,
  renderTemplate,
}
