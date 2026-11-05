/**
 * Documented System Event Types
 */
export const EVENT_TYPES = {
  USER_REGISTERED: 'user.registered', // { user, code }
  AUTH_VERIFICATION_CODE_RESENT: 'auth.verificationCodeResent', // { user, code }
  AUTH_PASSWORD_RESET_REQUESTED: 'auth.passwordResetRequested', // { user, token }
  SELLER_CREATED: 'seller.created', // { user, tempPassword }
  ORDER_CREATED: 'order.created', // { order, payment }
  PAYMENT_RESUBMITTED: 'payment.resubmitted', // { order, payment }
  PAYMENT_CONFIRMED: 'payment.confirmed', // { order, payment }
  PAYMENT_REJECTED: 'payment.rejected', // { order, payment }
  ORDER_FULFILLMENT_UPDATED: 'order.fulfillmentUpdated', // { order, sellerId, status }
  ORDER_STATUS_CHANGED: 'order.statusChanged', // { order, from, to, actorId }
  ORDER_CANCELLED: 'order.cancelled', // { order }
  PAYOUT_RECORDED: 'payout.recorded', // { payout, seller }
  CUSTOM_REQUEST_CREATED: 'customRequest.created', // { request }
}

export default EVENT_TYPES

