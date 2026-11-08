import { eventBus, EVENT_TYPES } from '../../events/index.js'
import { notifications } from './index.js'
import { email } from '../email/index.js'
import { User } from '../../db/models/User.js'
import { env } from '../../config/env.js'
import { getFriendlyReason } from '../../config/reasons.js'


let registered = false

/**
 * Registers all event listeners for the notifications and email system.
 * Idempotent: ensures listeners are only attached once.
 */
export function registerNotificationListeners() {
  if (registered) return
  registered = true

  // 1. Order Created
  eventBus.on(EVENT_TYPES.ORDER_CREATED, async (payload) => {
    try {
      const { order, payment } = payload || {}
      if (!order) return

      // A. Customer: in-app notification + email
      let customer = null
      if (order.customerId && User && typeof User.findById === 'function') {
        customer = await User.findById(order.customerId)
      }

      const customerName = customer?.name || order.delivery?.name || 'عميلتنا العزيزة'
      const customerEmail = customer?.email

      await notifications.notify(order.customerId, {
        type: 'order',
        role: 'customer',
        title: {
          ar: 'تم استلام طلبك بنجاح',
          en: 'Order received successfully',
        },
        message: {
          ar: `تم تسجيل طلبك رقم ${order.number} بنجاح وهو بانتظار تحويل فودافون كاش.`,
          en: `Your order ${order.number} has been received and is awaiting Vodafone Cash payment.`,
        },
        params: { orderNumber: order.number, totalAmount: order.total },
        link: `/orders/${order.id || order._id}`,
      })

      if (customerEmail && !payment) {
        await email.sendTemplate(
          'customer-order-received',
          customerEmail,
          {
            customerName,
            orderNumber: order.number,
            totalAmount: order.total,
            subtotalAmount: order.subtotal,
            shippingAmount: order.shipping,
            governorate: order.delivery?.governorate || '',
            deliveryAddress: order.delivery?.address || '',
            customerPhone: order.delivery?.phone || '',
            items: order.items?.map((item) => ({
              name: typeof item.name === 'object' ? item.name.ar : item.name,
              qty: item.qty,
              unitPrice: item.unitPrice,
            })) || [],
          },
          { locale: customer?.locale || 'ar', user: customer }
        )
      }

      // B. Admins: in-app notification for review
      const activeAdmins = await getActiveAdmins()
      for (const admin of activeAdmins) {
        await notifications.notify(admin._id, {
          type: 'payment',
          role: 'admin',
          title: {
            ar: 'طلب جديد بانتظار الدفع',
            en: 'New order awaiting payment',
          },
          message: {
            ar: `تم إنشاء طلب جديد رقم ${order.number} بقيمة ${order.total} ج.م.`,
            en: `New order ${order.number} created for ${order.total} EGP.`,
          },
          params: { orderNumber: order.number, totalAmount: order.total },
          link: `/admin/orders/${order.id || order._id}`,
        })

        // If payment screenshot was submitted immediately at checkout
        if (payment && payment.screenshot?.url && admin.email) {
          await email.sendTemplate(
            'admin-new-payment',
            admin.email,
            {
              customerName,
              nurseryName: order.delivery?.nurseryName || '',
              orderNumber: order.number,
              totalAmount: order.total,
              senderPhone: payment.senderPhone || '',
              referenceNumber: payment.reference || '',
              commissionAmount: order.items?.reduce((sum, item) => sum + (item.commissionAmount || 0), 0) || 0,
              reviewUrl: `${env.CLIENT_URL}/admin/payments`,
            },
            { locale: admin.locale || 'ar', user: admin }
          )
        }
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling order.created:', err)
    }
  })

  // 2. Payment Resubmitted
  eventBus.on(EVENT_TYPES.PAYMENT_RESUBMITTED, async (payload) => {
    try {
      const { order, payment } = payload || {}
      if (!order) return

      const activeAdmins = await getActiveAdmins()
      for (const admin of activeAdmins) {
        await notifications.notify(admin._id, {
          type: 'payment',
          role: 'admin',
          title: {
            ar: 'إعادة رفع إيصال فودافون كاش',
            en: 'Vodafone Cash receipt resubmitted',
          },
          message: {
            ar: `قامت العميلة بإعادة رفع إيصال تحويل للطلب رقم ${order.number}.`,
            en: `Customer resubmitted payment receipt for order ${order.number}.`,
          },
          params: { orderNumber: order.number },
          link: `/admin/payments`,
        })

        if (admin.email) {
          await email.sendTemplate(
            'admin-new-payment',
            admin.email,
            {
              customerName: order.delivery?.name || 'عميلة',
              nurseryName: order.delivery?.nurseryName || '',
              orderNumber: order.number,
              totalAmount: order.total,
              senderPhone: payment?.senderPhone || '',
              referenceNumber: payment?.reference || '',
              commissionAmount: order.items?.reduce((sum, item) => sum + (item.commissionAmount || 0), 0) || 0,
              reviewUrl: `${env.CLIENT_URL}/admin/payments`,
            },
            { locale: admin.locale || 'ar', user: admin }
          )
        }
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling payment.resubmitted:', err)
    }
  })

  // 3. Payment Confirmed
  eventBus.on(EVENT_TYPES.PAYMENT_CONFIRMED, async (payload) => {
    try {
      const { order, payment } = payload || {}
      if (!order) return

      // A. Customer: notification + email
      let customer = null
      if (order.customerId && User && typeof User.findById === 'function') {
        customer = await User.findById(order.customerId)
      }

      await notifications.notify(order.customerId, {
        type: 'payment',
        role: 'customer',
        title: {
          ar: 'تم اعتماد دفع الطلب بنجاح',
          en: 'Payment confirmed successfully',
        },
        message: {
          ar: `تم اعتماد إيصال فودافون كاش للطلب رقم ${order.number} وجاري تجهيز الوسائل التعليمية.`,
          en: `Payment confirmed for order ${order.number}. Your items are being prepared.`,
        },
        params: { orderNumber: order.number },
        link: `/orders/${order.id || order._id}`,
      })

      if (customer?.email) {
        await email.sendTemplate(
          'customer-payment-confirmed',
          customer.email,
          {
            customerName: customer.name || order.delivery?.name || 'عميلتنا العزيزة',
            orderNumber: order.number,
            totalAmount: order.total,
            senderPhone: payment?.senderPhone || '',
            referenceNumber: payment?.reference || '',
            items: order.items?.map((item) => ({
              name: typeof item.name === 'object' ? item.name.ar : item.name,
              qty: item.qty,
              unitPrice: item.unitPrice,
            })) || [],
          },
          { locale: customer.locale || 'ar', user: customer }
        )
      }

      // B. Involved Sellers: notification + email per seller (with commission and net strictly for seller)
      const sellerItemGroups = new Map()
      for (const item of order.items || []) {
        const sellerIdStr = item.sellerId?.toString()
        if (!sellerIdStr) continue
        if (!sellerItemGroups.has(sellerIdStr)) {
          sellerItemGroups.set(sellerIdStr, [])
        }
        sellerItemGroups.get(sellerIdStr).push(item)
      }

      for (const [sellerId, items] of sellerItemGroups.entries()) {
        const seller = await User.findById(sellerId)
        if (!seller) continue

        const salePrice = items.reduce((sum, i) => sum + (i.unitPrice * i.qty), 0)
        const commissionAmount = items.reduce((sum, i) => sum + (i.commissionAmount || 0), 0)
        const netSellerAmount = items.reduce((sum, i) => sum + (i.sellerNet || (i.unitPrice * i.qty - (i.commissionAmount || 0))), 0)

        await notifications.notify(sellerId, {
          type: 'order',
          role: 'seller',
          title: {
            ar: 'طلب شراء جديد لوسيلتكِ التعليمية',
            en: 'New order for your educational aid',
          },
          message: {
            ar: `تم تأكيد دفع الطلب رقم ${order.number}. صافي أرباحكِ: ${netSellerAmount} ج.م.`,
            en: `Order ${order.number} payment confirmed. Your net: ${netSellerAmount} EGP.`,
          },
          params: { orderNumber: order.number, netSellerAmount },
          link: `/seller/orders/${order.id || order._id}`,
        })

        if (seller.email) {
          await email.sendTemplate(
            'seller-new-order',
            seller.email,
            {
              sellerName: seller.name || 'بائعتنا العزيزة',
              orderNumber: order.number,
              salePrice,
              commissionAmount,
              netSellerAmount,
              items: items.map((i) => ({
                name: typeof i.name === 'object' ? i.name.ar : i.name,
                qty: i.qty,
                unitPrice: i.unitPrice,
              })),
            },
            { locale: seller.locale || 'ar', user: seller }
          )
        }
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling payment.confirmed:', err)
    }
  })

  // 4. Payment Rejected
  eventBus.on(EVENT_TYPES.PAYMENT_REJECTED, async (payload) => {
    try {
      const { order, payment } = payload || {}
      if (!order) return

      let customer = null
      if (order.customerId && User && typeof User.findById === 'function') {
        customer = await User.findById(order.customerId)
      }

      const locale = customer?.locale || 'ar'
      const friendlyReasonAr = getFriendlyReason(payment?.rejectReason, 'ar') || 'بيانات التحويل غير مطابقة'
      const friendlyReasonEn = getFriendlyReason(payment?.rejectReason, 'en') || 'Payment details did not match'
      const localizedReason = locale === 'en' ? friendlyReasonEn : friendlyReasonAr

      await notifications.notify(order.customerId, {
        type: 'payment',
        role: 'customer',
        title: {
          ar: 'تنبيه بشأن إيصال التحويل',
          en: 'Payment receipt update',
        },
        message: {
          ar: `تعذر اعتماد إيصال فودافون كاش للطلب رقم ${order.number}: ${friendlyReasonAr}`,
          en: `Could not verify payment receipt for order ${order.number}: ${friendlyReasonEn}`,
        },
        params: {
          orderNumber: order.number,
          reason: localizedReason,
          rejectReason: payment?.rejectReason,
          rejectReasonCode: payment?.rejectReason,
          status: 'rejected',
        },
        link: `/orders/${order.id || order._id}`,
        dedupKey: `${order.customerId}:payment:${order.number}:rejected:${payment?.rejectReason || ''}`,
      })

      // Send email if notifyCustomer is true
      if (customer?.email && payment?.notifyCustomer !== false) {
        await email.sendTemplate(
          'customer-payment-rejected',
          customer.email,
          {
            customerName: customer.name || order.delivery?.name || 'عميلتنا العزيزة',
            orderNumber: order.number,
            rejectionReason: localizedReason,
            rejectionReasonCode: payment?.rejectReason || '',
            adminNotes: payment?.rejectNotes || '',
            orderUrl: `${env.CLIENT_URL}/orders/${order.id || order._id}`,
          },
          {
            locale,
            user: customer,
            dedupKey: `${customer.email}:customer-payment-rejected:${order.number}:${payment?.rejectReason || ''}`,
          }
        )
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling payment.rejected:', err)
    }
  })

  // 5. Order Fulfillment Updated (seller marked items as shipped)
  // Per architecture contract: ORDER_FULFILLMENT_UPDATED sends nothing to the customer.
  // The customer receives the shipped notification/email only when the whole order becomes shipped via ORDER_STATUS_CHANGED.
  eventBus.on(EVENT_TYPES.ORDER_FULFILLMENT_UPDATED, async (_payload) => {
    // Intentionally no customer notification or email here.
  })

  // 6. Order Status Changed (single source of truth for shipped, delivered, cancelled)
  eventBus.on(EVENT_TYPES.ORDER_STATUS_CHANGED, async (payload) => {
    try {
      const { order, to } = payload || {}
      if (!order) return

      let customer = null
      if (order.customerId && User && typeof User.findById === 'function') {
        customer = await User.findById(order.customerId)
      }

      const locale = customer?.locale || 'ar'
      const customerName = customer?.name || order.delivery?.name || 'عميلتنا العزيزة'
      const customerEmail = customer?.email

      if (to === 'shipped') {
        await notifications.notify(order.customerId, {
          type: 'shipping',
          role: 'customer',
          title: {
            ar: 'طلبك في الطريق إليك',
            en: 'Your order is on the way',
          },
          message: {
            ar: `تم تسليم طلبك رقم ${order.number} لمندوب الشحن وهو في الطريق إليكِ الآن.`,
            en: `Your order ${order.number} has been shipped and is on its way.`,
          },
          params: { orderNumber: order.number, status: 'shipped' },
          link: `/orders/${order.id || order._id}`,
          dedupKey: `${order.customerId}:shipping:${order.number}:shipped`,
        })

        if (customerEmail) {
          await email.sendTemplate(
            'customer-shipped',
            customerEmail,
            {
              customerName,
              orderNumber: order.number,
              deliveryAddress: order.delivery?.address || '',
              nurseryName: order.delivery?.nurseryName || '',
              customerPhone: order.delivery?.phone || '',
            },
            {
              locale,
              user: customer,
              dedupKey: `${customerEmail}:customer-shipped:${order.number}:shipped`,
            }
          )
        }
      } else if (to === 'delivered') {
        await notifications.notify(order.customerId, {
          type: 'shipping',
          role: 'customer',
          title: {
            ar: 'تم تسليم طلبك بنجاح',
            en: 'Order delivered successfully',
          },
          message: {
            ar: `تم تسليم طلبك رقم ${order.number} بنجاح. شكراً لاختياركِ أيدي صغيرة!`,
            en: `Your order ${order.number} has been delivered. Thank you for choosing Little Hands!`,
          },
          params: { orderNumber: order.number, status: 'delivered' },
          link: `/orders/${order.id || order._id}`,
          dedupKey: `${order.customerId}:shipping:${order.number}:delivered`,
        })
      } else if (to === 'cancelled') {
        const friendlyCancelAr = getFriendlyReason(order.cancelReason, 'ar')
        const friendlyCancelEn = getFriendlyReason(order.cancelReason, 'en')
        const localizedCancelReason = locale === 'en' ? (friendlyCancelEn || friendlyCancelAr) : (friendlyCancelAr || friendlyCancelEn)

        const refundNoteAr = order.refund?.required ? ' سيتواصل معك فريق الإدارة بخصوص رد المبلغ.' : ''
        const refundNoteEn = order.refund?.required ? ' The management team will contact you regarding the refund.' : ''
        const cancelReasonSuffixAr = friendlyCancelAr ? ` — سبب الإلغاء: ${friendlyCancelAr}` : ''
        const cancelReasonSuffixEn = friendlyCancelEn ? ` — Reason: ${friendlyCancelEn}` : ''

        await notifications.notify(order.customerId, {
          type: 'order',
          role: 'customer',
          title: {
            ar: 'تم إلغاء الطلب',
            en: 'Order cancelled',
          },
          message: {
            ar: `تم إلغاء طلبك رقم ${order.number}${cancelReasonSuffixAr}.${refundNoteAr}`,
            en: `Your order ${order.number} has been cancelled${cancelReasonSuffixEn}.${refundNoteEn}`,
          },
          params: {
            orderNumber: order.number,
            status: 'cancelled',
            cancelReason: localizedCancelReason,
            cancelReasonCode: order.cancelReason || '',
          },
          link: `/orders/${order.id || order._id}`,
          dedupKey: `${order.customerId}:order:${order.number}:cancelled`,
        })

        if (customerEmail) {
          await email.sendTemplate(
            'order-cancelled',
            customerEmail,
            {
              customerName,
              orderNumber: order.number,
              cancelReason: localizedCancelReason,
              cancelReasonCode: order.cancelReason || '',
            },
            {
              locale,
              user: customer,
              dedupKey: `${customerEmail}:order-cancelled:${order.number}:cancelled`,
            }
          )
        }
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling order.statusChanged:', err)
    }
  })

  // 7. Order Cancelled
  // Per architecture contract: ORDER_STATUS_CHANGED is the single source of truth for customer cancellation notifications/emails.
  // ORDER_CANCELLED listener sends nothing to the customer to prevent duplicate events.
  eventBus.on(EVENT_TYPES.ORDER_CANCELLED, async (_payload) => {
    // Intentionally no customer notification or email here.
  })

  // 8. Payout Recorded
  eventBus.on(EVENT_TYPES.PAYOUT_RECORDED, async (payload) => {
    try {
      const { payout, seller } = payload || {}
      if (!payout || !seller) return

      const sellerId = seller._id || seller.id

      await notifications.notify(sellerId, {
        type: 'payout',
        role: 'seller',
        title: {
          ar: 'تم تسجيل تحويل أرباحكِ',
          en: 'Payout recorded',
        },
        message: {
          ar: `تم تسجيل تحويل دفعة أرباح بقيمة ${payout.amount} ج.م إلى محفظتكِ.`,
          en: `Payout of ${payout.amount} EGP has been recorded to your wallet.`,
        },
        params: { amount: payout.amount },
        link: `/seller/earnings`,
      })

      if (seller.email) {
        await email.sendTemplate(
          'payout-recorded',
          seller.email,
          {
            sellerName: seller.name || 'بائعتنا العزيزة',
            amount: payout.amount,
            payoutWallet: seller.seller?.payoutWallet || seller.phone || '',
            reference: payout.reference || '',
            date: payout.createdAt ? new Date(payout.createdAt).toLocaleDateString('ar-EG') : '',
          },
          { locale: seller.locale || 'ar', user: seller }
        )
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling payout.recorded:', err)
    }
  })

  // 9. Custom Request Created
  eventBus.on(EVENT_TYPES.CUSTOM_REQUEST_CREATED, async (payload) => {
    try {
      const { request } = payload || {}
      if (!request) return

      const activeAdmins = await getActiveAdmins()
      for (const admin of activeAdmins) {
        await notifications.notify(admin._id, {
          type: 'custom_request',
          role: 'admin',
          title: {
            ar: 'طلب تفصيل وسيلة تعليمية جديد',
            en: 'New custom request received',
          },
          message: {
            ar: `طلب جديد لتفصيل وسيلة تعليمية من ${request.name || 'عميلة'}.`,
            en: `New custom teaching aid request submitted by ${request.name || 'customer'}.`,
          },
          params: { name: request.name },
          link: `/admin/custom-requests`,
        })

        if (admin.email) {
          await email.sendTemplate(
            'custom-request-admin',
            admin.email,
            {
              customerName: request.name || '',
              phone: request.phone || '',
              email: request.email || '',
              subject: request.subject || '',
              description: request.description || '',
              stage: request.stage || '',
              reviewUrl: `${env.CLIENT_URL}/admin/custom-requests`,
            },
            { locale: admin.locale || 'ar', user: admin }
          )
        }
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling customRequest.created:', err)
    }
  })

  // 10. Seller Created
  eventBus.on(EVENT_TYPES.SELLER_CREATED, async (payload) => {
    try {
      const { user, tempPassword } = payload || {}
      if (!user) return

      await notifications.notify(user._id || user.id, {
        type: 'system',
        role: 'seller',
        title: {
          ar: 'مرحباً بكِ في منصة أيدي صغيرة',
          en: 'Welcome to Little Hands',
        },
        message: {
          ar: 'تم إنشاء وتفعيل حسابكِ كبائعة حرفية بالمنصة بنجاح.',
          en: 'Your artisan seller account has been created successfully.',
        },
        params: {},
        link: `/seller/profile`,
      })

      if (user.email) {
        await email.sendTemplate(
          'seller-welcome',
          user.email,
          {
            name: user.name || 'بائعتنا العزيزة',
            email: user.email,
            tempPassword: tempPassword || '',
            loginUrl: `${env.CLIENT_URL}/login`,
          },
          { locale: user.locale || 'ar', user }
        )
      }
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling seller.created:', err)
    }
  })

  // 11. User Registered (OTP Verification)
  eventBus.on(EVENT_TYPES.USER_REGISTERED, async (payload) => {
    try {
      const { user, code } = payload || {}
      if (!user?.email || !code) return

      await email.sendTemplate(
        'verify-email',
        user.email,
        {
          name: user.name || '',
          code,
        },
        { locale: user.locale || 'ar', user }
      )
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling user.registered:', err)
    }
  })

  // 12. Auth Verification Code Resent
  eventBus.on(EVENT_TYPES.AUTH_VERIFICATION_CODE_RESENT, async (payload) => {
    try {
      const { user, code } = payload || {}
      if (!user?.email || !code) return

      await email.sendTemplate(
        'verify-email',
        user.email,
        {
          name: user.name || '',
          code,
        },
        { locale: user.locale || 'ar', user }
      )
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling auth.verificationCodeResent:', err)
    }
  })

  // 13. Password Reset Requested
  eventBus.on(EVENT_TYPES.AUTH_PASSWORD_RESET_REQUESTED, async (payload) => {
    try {
      const { user, token } = payload || {}
      if (!user?.email || !token) return

      const resetLink = `${env.CLIENT_URL}/reset-password?token=${token}`

      await email.sendTemplate(
        'password-reset',
        user.email,
        {
          name: user.name || '',
          resetLink,
          token,
        },
        { locale: user.locale || 'ar', user }
      )
    } catch (err) {
      console.error('[EVENT_LISTENER] Error handling auth.passwordResetRequested:', err)
    }
  })
}

async function getActiveAdmins() {
  try {
    if (User && typeof User.find === 'function') {
      return await User.find({ role: 'admin', status: 'active' })
    }
  } catch (err) {
    console.warn('[NOTIFICATIONS] Failed to query active admins:', err.message)
  }
  return []
}

export default registerNotificationListeners
