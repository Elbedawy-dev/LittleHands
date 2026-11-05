export * from './User.js'
export * from './RefreshToken.js'
export * from './OtpCode.js'
export * from './Category.js'
export * from './Product.js'
export * from './Address.js'
export * from './Favorite.js'
export * from './Order.js'
export * from './Payment.js'
export * from './Payout.js'
export * from './Notification.js'
export * from './Setting.js'
export * from './CustomRequest.js'
export * from './AuditLog.js'
export * from './EmailLog.js'
export * from './Upload.js'
export * from './Counter.js'

import { Counter } from './Counter.js'

export async function nextOrderNumber(year) {
  return Counter.nextOrderNumber(year)
}

