/**
 * check-contracts.mjs
 * 
 * Part A.1: Contract verification between Frontend services and Backend Zod schemas.
 * Intercepts all calls from Frontend/src/services/* using a custom axios adapter,
 * executes realistic test scenarios, and validates recorded payloads against real
 * Backend Zod schemas (.strict()). Fails with detailed route + key + reason on any mismatch.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const BACKEND_ROOT = path.resolve(ROOT, '../Backend')

// Polyfill minimal browser environment for Node.js
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: () => 'ar',
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  }
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    innerWidth: 1024,
  }
}

if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, detail = {}) {
      this.type = type
      this.detail = detail
    }
  }
}

// Ensure FormData / Blob / File exist in Node 20+
const NodeFormData = globalThis.FormData
const NodeBlob = globalThis.Blob
const NodeFile = globalThis.File

// Dynamic imports of backend Zod schemas
console.info('[INFO] Loading backend Zod schemas...')
const authSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/auth/schemas.js').replace(/\\/g, '/')}`)
const usersSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/users/schemas.js').replace(/\\/g, '/')}`)
const catalogSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/catalog/schemas.js').replace(/\\/g, '/')}`)
const productsSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/products/schemas.js').replace(/\\/g, '/')}`)
const sellersSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/sellers/schemas.js').replace(/\\/g, '/')}`)
const contactSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/contact/schemas.js').replace(/\\/g, '/')}`)
const ordersSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/orders/schemas.js').replace(/\\/g, '/')}`)
const paymentsSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/payments/schemas.js').replace(/\\/g, '/')}`)
const earningsSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/earnings/schemas.js').replace(/\\/g, '/')}`)
const adminSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/admin/schemas.js').replace(/\\/g, '/')}`)
const settingsSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/settings/schemas.js').replace(/\\/g, '/')}`)
const notificationsSchemas = await import(`file://${path.join(BACKEND_ROOT, 'src/modules/notifications/schemas.js').replace(/\\/g, '/')}`)

// Dynamic import of Frontend services
console.info('[INFO] Loading Frontend apiClient and services...')
const { default: apiClient } = await import(`file://${path.join(ROOT, 'src/services/api.js').replace(/\\/g, '/')}`)
const { authService } = await import(`file://${path.join(ROOT, 'src/services/authService.js').replace(/\\/g, '/')}`)
const { userService } = await import(`file://${path.join(ROOT, 'src/services/userService.js').replace(/\\/g, '/')}`)
const { productService } = await import(`file://${path.join(ROOT, 'src/services/productService.js').replace(/\\/g, '/')}`)
const { catalogService } = await import(`file://${path.join(ROOT, 'src/services/catalogService.js').replace(/\\/g, '/')}`)
const { orderService } = await import(`file://${path.join(ROOT, 'src/services/orderService.js').replace(/\\/g, '/')}`)
const { paymentService } = await import(`file://${path.join(ROOT, 'src/services/paymentService.js').replace(/\\/g, '/')}`)
const { adminService } = await import(`file://${path.join(ROOT, 'src/services/adminService.js').replace(/\\/g, '/')}`)
const { contactService } = await import(`file://${path.join(ROOT, 'src/services/contactService.js').replace(/\\/g, '/')}`)
const { earningsService } = await import(`file://${path.join(ROOT, 'src/services/earningsService.js').replace(/\\/g, '/')}`)
const { sellerService } = await import(`file://${path.join(ROOT, 'src/services/sellerService.js').replace(/\\/g, '/')}`)
const { settingsService } = await import(`file://${path.join(ROOT, 'src/services/settingsService.js').replace(/\\/g, '/')}`)
const { notificationService } = await import(`file://${path.join(ROOT, 'src/services/notificationService.js').replace(/\\/g, '/')}`)

// Recorded requests container
const recordedCalls = []

// Configure custom axios adapter
apiClient.defaults.adapter = async (config) => {
  let parsedData = config.data

  if (typeof parsedData === 'string') {
    try {
      parsedData = JSON.parse(parsedData)
    } catch {
      // Keep as string if not JSON
    }
  } else if (parsedData && typeof parsedData.entries === 'function') {
    // Convert FormData to plain object
    const obj = {}
    for (const [k, v] of parsedData.entries()) {
      if (v instanceof NodeBlob || v instanceof NodeFile || (typeof v === 'object' && v?.size !== undefined)) {
        obj[k] = { name: v.name || 'file', size: v.size || 1024, type: v.type || 'image/jpeg' }
      } else {
        obj[k] = v
      }
    }
    parsedData = obj
  }

  const normalizedUrl = config.url.replace(/^\/?api\/v1/, '')

  const record = {
    method: config.method.toUpperCase(),
    url: normalizedUrl,
    params: config.params || {},
    data: parsedData,
    headers: config.headers,
  }

  recordedCalls.push(record)

  // Return realistic mock responses so service methods resolve cleanly
  return {
    data: {
      success: true,
      data: {
        id: '507f1f77bcf86cd799439011',
        _id: '507f1f77bcf86cd799439011',
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        keys: ['key-1.webp'],
        urls: ['https://res.cloudinary.com/demo/image/upload/v1/lh/img1.webp'],
      },
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }
}

// Canonical route schemas registry
// Maps `${METHOD} ${ROUTE_PATTERN}` to { body, query, params }
const routeSchemas = new Map()

function registerRouteSchema(method, pattern, { body, query } = {}) {
  routeSchemas.set(`${method.toUpperCase()} ${pattern}`, { body, query })
}

// Auth
registerRouteSchema('POST', '/auth/register', { body: authSchemas.registerSchema })
registerRouteSchema('POST', '/auth/login', { body: authSchemas.loginSchema })
registerRouteSchema('POST', '/auth/logout')
registerRouteSchema('POST', '/auth/refresh')
registerRouteSchema('GET', '/auth/me')
registerRouteSchema('POST', '/auth/verify-email', { body: authSchemas.verifyEmailSchema })
registerRouteSchema('POST', '/auth/resend-code', { body: authSchemas.resendCodeSchema })
registerRouteSchema('POST', '/auth/forgot-password', { body: authSchemas.forgotPasswordSchema })
registerRouteSchema('POST', '/auth/reset-password', { body: authSchemas.resetPasswordSchema })
registerRouteSchema('POST', '/auth/change-password', { body: authSchemas.changePasswordSchema })

// Users
registerRouteSchema('GET', '/users/me')
registerRouteSchema('PATCH', '/users/me', { body: usersSchemas.updateProfileSchema })
registerRouteSchema('DELETE', '/users/me', { body: usersSchemas.deleteAccountSchema })
registerRouteSchema('POST', '/users/me/avatar')
registerRouteSchema('GET', '/users/me/favorites')
registerRouteSchema('POST', '/users/me/favorites/:productId')
registerRouteSchema('GET', '/users/me/addresses')
registerRouteSchema('POST', '/users/me/addresses', { body: usersSchemas.addressSchema })
registerRouteSchema('PUT', '/users/me/addresses/:id', { body: usersSchemas.updateAddressSchema })
registerRouteSchema('DELETE', '/users/me/addresses/:id')
registerRouteSchema('PATCH', '/users/me/notification-prefs', { body: usersSchemas.notificationPrefsSchema })

// Sellers
registerRouteSchema('PATCH', '/sellers/me/profile', { body: sellersSchemas.updateSellerProfileSchema })
registerRouteSchema('GET', '/sellers/me/custom-requests')
registerRouteSchema('POST', '/sellers/me/custom-requests/:id/claim')
registerRouteSchema('GET', '/sellers')
registerRouteSchema('GET', '/sellers/:id')
registerRouteSchema('GET', '/sellers/:id/products')

// Admin
registerRouteSchema('POST', '/admin/sellers', { body: usersSchemas.createSellerSchema })
registerRouteSchema('GET', '/admin/sellers/accounts')
registerRouteSchema('PATCH', '/admin/users/:id/status', { body: usersSchemas.updateUserStatusSchema })
registerRouteSchema('DELETE', '/admin/users/:id')
registerRouteSchema('GET', '/admin/overview', { query: adminSchemas.adminOverviewQuerySchema })
registerRouteSchema('GET', '/admin/customers', { query: adminSchemas.adminCustomersQuerySchema })
registerRouteSchema('GET', '/admin/sellers/earnings')
registerRouteSchema('GET', '/admin/sellers/:id/orders', { query: adminSchemas.adminSellerOrdersQuerySchema })
registerRouteSchema('GET', '/admin/payouts', { query: adminSchemas.adminPayoutsQuerySchema })
registerRouteSchema('POST', '/admin/payouts', { body: adminSchemas.recordPayoutSchema })
registerRouteSchema('PUT', '/admin/settings', { body: settingsSchemas.updateSettingsSchema })
registerRouteSchema('PUT', '/admin/settings/shipping-rates', { body: settingsSchemas.updateShippingRatesSchema })
registerRouteSchema('PUT', '/admin/categories/:slug', { body: catalogSchemas.updateCategorySchema })
registerRouteSchema('PUT', '/admin/categories/order', { body: catalogSchemas.reorderCategoriesSchema })
registerRouteSchema('GET', '/admin/custom-requests', { query: contactSchemas.customRequestQuerySchema })
registerRouteSchema('PATCH', '/admin/custom-requests/:id', { body: contactSchemas.updateCustomRequestStatusSchema })
registerRouteSchema('DELETE', '/admin/custom-requests/:id')

// Catalog
registerRouteSchema('GET', '/catalog/categories')
registerRouteSchema('GET', '/catalog/products', { query: catalogSchemas.productListQuerySchema })
registerRouteSchema('GET', '/catalog/products/featured')
registerRouteSchema('GET', '/catalog/products/:id')
registerRouteSchema('GET', '/catalog/products/:id/related')

// Products Management
registerRouteSchema('GET', '/products/manage/products', { query: productsSchemas.manageableProductsQuerySchema })
registerRouteSchema('POST', '/products/manage/products', { body: productsSchemas.productMutationSchema })
registerRouteSchema('PATCH', '/products/manage/products/:id', { body: productsSchemas.productUpdateSchema })
registerRouteSchema('DELETE', '/products/manage/products/:id')
registerRouteSchema('PATCH', '/products/manage/products/:id/publish', { body: productsSchemas.publishProductSchema })
registerRouteSchema('POST', '/products/manage/products/images')

// Contact & Custom Requests
registerRouteSchema('POST', '/contact/custom-requests', { body: contactSchemas.customRequestSchema })

// Orders
registerRouteSchema('POST', '/orders', { body: ordersSchemas.createOrderSchema })
registerRouteSchema('GET', '/orders/my')
registerRouteSchema('GET', '/orders/:id')
registerRouteSchema('POST', '/orders/:id/cancel', { body: ordersSchemas.cancelOrderSchema })
registerRouteSchema('GET', '/orders/seller')
registerRouteSchema('PATCH', '/orders/seller/:id/fulfillment', { body: ordersSchemas.setSellerOrderStatusSchema })
registerRouteSchema('DELETE', '/orders/seller/:id')
registerRouteSchema('GET', '/orders/admin', { query: ordersSchemas.orderQuerySchema })
registerRouteSchema('GET', '/orders/admin/:id')
registerRouteSchema('PATCH', '/orders/admin/:id/status', { body: ordersSchemas.updateOrderStatusSchema })
registerRouteSchema('POST', '/orders/admin/:id/cancel', { body: ordersSchemas.cancelOrderSchema })
registerRouteSchema('POST', '/orders/admin/:id/refund', { body: ordersSchemas.refundOrderSchema })
registerRouteSchema('DELETE', '/orders/admin/:id')
registerRouteSchema('POST', '/orders/admin/:id/archive')
registerRouteSchema('POST', '/orders/admin/:id/unarchive')

// Payments
registerRouteSchema('POST', '/payments/orders/:id/payment', { body: paymentsSchemas.submitPaymentSchema })
registerRouteSchema('GET', '/payments/:id/screenshot')
registerRouteSchema('GET', '/payments/admin', { query: paymentsSchemas.paymentQuerySchema })
registerRouteSchema('POST', '/payments/admin/:orderId/confirm')
registerRouteSchema('POST', '/payments/admin/:orderId/reject', { body: paymentsSchemas.rejectPaymentSchema })

// Earnings
registerRouteSchema('GET', '/earnings/seller/overview', { query: earningsSchemas.periodQuerySchema })
registerRouteSchema('GET', '/earnings/seller/earnings', { query: earningsSchemas.sellerEarningsQuerySchema })
registerRouteSchema('GET', '/earnings/seller/payouts', { query: earningsSchemas.payoutsQuerySchema })

// Settings
registerRouteSchema('GET', '/settings')
registerRouteSchema('GET', '/settings/public')
registerRouteSchema('GET', '/settings/shipping-rates')

// Notifications
registerRouteSchema('GET', '/notifications', { query: notificationsSchemas.getNotificationsQuerySchema })
registerRouteSchema('GET', '/notifications/unread-count')
registerRouteSchema('PATCH', '/notifications/:id/read')
registerRouteSchema('POST', '/notifications/read-all')
registerRouteSchema('DELETE', '/notifications/:id')
registerRouteSchema('DELETE', '/notifications', { query: notificationsSchemas.deleteNotificationsQuerySchema })

console.info(`[INFO] Registered ${routeSchemas.size} route validation schemas.`)

// Pattern matcher (exact matches checked before parameterized routes)
function matchRoutePattern(actualMethod, actualUrl) {
  const cleanUrl = actualUrl.split('?')[0].replace(/\/+$/, '') || '/'

  // 1. First pass: exact matches
  for (const [key, schemaObj] of routeSchemas.entries()) {
    const [method, pattern] = key.split(' ')
    if (method !== actualMethod) continue
    if (!pattern.includes(':') && pattern === cleanUrl) {
      return { pattern, schemaObj }
    }
  }

  // 2. Second pass: parameterized matches
  for (const [key, schemaObj] of routeSchemas.entries()) {
    const [method, pattern] = key.split(' ')
    if (method !== actualMethod) continue
    if (pattern.includes(':')) {
      const regexStr = '^' + pattern.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)') + '$'
      const re = new RegExp(regexStr)
      if (re.test(cleanUrl)) {
        return { pattern, schemaObj }
      }
    }
  }

  return null
}

// -------------------------------------------------------------
// EXECUTE REALISTIC TEST CASES FOR ALL FRONTEND SERVICES
// -------------------------------------------------------------
console.info('[INFO] Executing service functions with realistic sample payloads...')

async function runServiceScenarios() {
  // 1. authService
  await authService.login({ identifier: 'teacher@example.com', password: 'Password123' }).catch(() => {})
  await authService.register({
    name: 'منى محمد',
    email: 'teacher@example.com',
    phone: '01012345678',
    password: 'Password123',
    role: 'customer',
    accountType: 'teacher',
  }).catch(() => {})
  await authService.verifyEmail({ code: '123456', email: 'teacher@example.com' }).catch(() => {})
  await authService.resendCode({ email: 'teacher@example.com' }).catch(() => {})
  await authService.forgotPassword('teacher@example.com').catch(() => {})
  await authService.resetPassword({ token: 'reset-token-sample', password: 'NewPassword123' }).catch(() => {})
  await authService.changePassword({ current: 'OldPassword123', next: 'NewPassword123' }).catch(() => {})
  await authService.me().catch(() => {})
  await authService.logout().catch(() => {})
  await apiClient.post('/auth/refresh').catch(() => {})

  // 2. userService
  await userService.getProfile().catch(() => {})
  await userService.updateProfile({ name: 'منى محمد', phone: '01012345678', locale: 'ar' }).catch(() => {})
  await userService.deleteMyAccount('Password123').catch(() => {})
  await userService.uploadAvatar(new NodeBlob(['dummy'], { type: 'image/jpeg' })).catch(() => {})
  await userService.getFavorites().catch(() => {})
  await userService.toggleFavorite('507f1f77bcf86cd799439011').catch(() => {})
  await userService.getAddresses().catch(() => {})
  await userService.saveAddress({
    name: 'حضانة الأمل النموذجية',
    phone: '01012345678',
    governorate: 'cairo',
    city: 'مدينة نصر',
    address: 'شارع عباس العقاد بجوار الحديقة الدولية',
    isDefault: true,
  }).catch(() => {})
  await userService.saveAddress({
    id: '507f1f77bcf86cd799439012',
    name: 'حضانة الأمل النموذجية',
    phone: '01012345678',
    governorate: 'cairo',
    city: 'التجمع الخامس',
    address: 'شارع التسعين الشمالي',
    isDefault: false,
  }).catch(() => {})
  await userService.deleteAddress('507f1f77bcf86cd799439012').catch(() => {})
  await userService.updateNotificationPrefs({ email: true, inApp: true }).catch(() => {})

  // 3. productService
  await productService.getManageableProducts({ page: 1, limit: 10 }).catch(() => {})
  await productService.createProduct({
    name: 'لوحة الأرقام بالجوخ',
    nameEn: 'Arabic Numbers Felt Board',
    categoryId: '507f1f77bcf86cd799439013',
    price: 150,
    stockCount: 10,
    description: 'لوحة تعليمية تفاعلية بالجوخ لتعليم الأرقام والحساب',
    stages: ['nursery'],
    materials: ['felt'],
    images: [{ key: 'img-1.webp', url: 'https://res.cloudinary.com/demo/image/upload/v1/lh/img1.webp' }],
    isFeatured: true,
    isPublished: true,
  }).catch(() => {})
  await productService.updateProduct('507f1f77bcf86cd799439014', {
    price: 180,
    isFeatured: false,
  }).catch(() => {})
  await productService.togglePublish('507f1f77bcf86cd799439014', true).catch(() => {})
  await productService.deleteProduct('507f1f77bcf86cd799439014').catch(() => {})
  await productService.uploadImages(new NodeBlob(['dummy'], { type: 'image/jpeg' })).catch(() => {})

  // 4. catalogService
  await catalogService.getCategories().catch(() => {})
  await catalogService.getProducts({ page: 1, pageSize: 12, sort: 'newest' }).catch(() => {})
  await catalogService.getFeaturedProducts().catch(() => {})
  await catalogService.getProduct('507f1f77bcf86cd799439015').catch(() => {})
  await catalogService.getRelatedProducts('507f1f77bcf86cd799439015').catch(() => {})

  // 5. orderService
  await orderService.createOrder({
    items: [
      {
        productId: '507f1f77bcf86cd799439015',
        qty: 2,
        unitPrice: 150,
        name: 'لوحة الأرقام بالجوخ',
        image: 'https://res.cloudinary.com/demo/image/upload/v1/lh/img1.webp',
        sellerId: '507f1f77bcf86cd799439020',
      },
    ],
    delivery: {
      name: 'أحمد علي',
      phone: '01012345678',
      governorate: 'القاهرة',
      city: 'القاهرة',
      address: 'شارع المعز لدين الله',
      nurseryName: 'روضة براعم المستقبل',
    },
    notes: 'التسليم في أوقات دوام الروضة الصباحي',
  }).catch(() => {})
  await orderService.getMyOrders({ page: 1 }).catch(() => {})
  await orderService.getOrder('507f1f77bcf86cd799439016').catch(() => {})
  await orderService.cancelOrder('507f1f77bcf86cd799439016', { reason: 'تعديل تفاصيل الطلب' }).catch(() => {})
  await orderService.getSellerOrders({ page: 1 }).catch(() => {})
  await orderService.setSellerOrderStatus('507f1f77bcf86cd799439016', 'preparing').catch(() => {})
  await orderService.hideSellerOrder('507f1f77bcf86cd799439016').catch(() => {})
  await orderService.getAllOrders({ page: 1, pageSize: 10, status: 'all', archived: 'false' }).catch(() => {})
  await orderService.getAdminOrder('507f1f77bcf86cd799439016').catch(() => {})
  await orderService.updateOrderStatus('507f1f77bcf86cd799439016', 'delivered').catch(() => {})
  await orderService.adminCancelOrder('507f1f77bcf86cd799439016', { reason: 'إلغاء تنفيذي من الإدارة' }).catch(() => {})
  await orderService.adminRefundOrder('507f1f77bcf86cd799439016', { reference: 'REF-123456', note: 'تم التحويل للمحفظة' }).catch(() => {})
  await orderService.deleteOrder('507f1f77bcf86cd799439016').catch(() => {})
  await orderService.archiveOrder('507f1f77bcf86cd799439016').catch(() => {})
  await orderService.unarchiveOrder('507f1f77bcf86cd799439016').catch(() => {})

  // 6. paymentService
  await paymentService.getPayments({ page: 1, pageSize: 10 }).catch(() => {})
  await paymentService.confirmPayment('507f1f77bcf86cd799439016').catch(() => {})
  await paymentService.rejectPayment('507f1f77bcf86cd799439016', {
    reason: 'receipt_unclear',
    notes: 'صورة الإيصال غير واضحة يرجى إعادة إرسالها',
    notify: true,
  }).catch(() => {})
  await paymentService.submitPayment('507f1f77bcf86cd799439016', {
    senderPhone: '01012345678',
    transferredAmount: 300,
    reference: 'VF98765432',
  }).catch(() => {})
  await paymentService.getScreenshotBlob('507f1f77bcf86cd799439017').catch(() => {})

  // 7. adminService
  await adminService.getCustomers({ page: 1, pageSize: 20 }).catch(() => {})
  await adminService.getSellerAccounts().catch(() => {})
  await adminService.createSellerAccount({
    name: 'مريم أحمد',
    email: 'mariam@example.com',
    phone: '01012345678',
    governorate: 'cairo',
    workshopAddress: 'ورشة أيدي صغيرة',
    stages: ['nursery'],
    materials: ['felt'],
  }).catch(() => {})
  await adminService.updateUserStatus('507f1f77bcf86cd799439018', 'active').catch(() => {})
  await adminService.deleteUser('507f1f77bcf86cd799439018').catch(() => {})
  await adminService.updateCategory('alphabet-boards', {
    nameAr: 'لوحات الحروف',
    color: '#f59e0b',
  }).catch(() => {})
  await adminService.reorderCategories(['alphabet-boards', 'numbers-math']).catch(() => {})

  // 8. contactService
  await contactService.sendCustomRequest({
    name: 'سارة محمود',
    phone: '01012345678',
    nurseryName: 'حضانة الزهور',
    details: 'طلب تصميم لوحة جدارية تفاعلية للطقس والفصول الأربعة',
  }).catch(() => {})
  await contactService.getCustomRequests({ page: 1, pageSize: 20 }).catch(() => {})
  await contactService.updateCustomRequestStatus('507f1f77bcf86cd799439019', 'contacted').catch(() => {})
  await contactService.deleteCustomRequest('507f1f77bcf86cd799439019').catch(() => {})

  // 9. earningsService
  await earningsService.getAdminOverview('month').catch(() => {})
  await earningsService.getSellerOverview('507f1f77bcf86cd799439020', 'month').catch(() => {})
  await earningsService.getSellerEarnings({ page: 1, pageSize: 50 }).catch(() => {})
  await earningsService.getSellerPayouts({ page: 1, pageSize: 20 }).catch(() => {})
  await earningsService.getSellersEarnings().catch(() => {})
  await earningsService.getSellerOrdersDrilldown('507f1f77bcf86cd799439020', { page: 1, pageSize: 20 }).catch(() => {})
  await earningsService.getPayouts({ page: 1, pageSize: 20 }).catch(() => {})
  await earningsService.recordPayout({
    sellerId: '507f1f77bcf86cd799439020',
    amount: 500,
    reference: 'PAY-123456',
    date: '2026-11-10',
    notes: 'تحويل مستحقات النصف الأول من نوفمبر',
  }).catch(() => {})

  // 10. sellerService
  await sellerService.getSellers().catch(() => {})
  await sellerService.getSeller('507f1f77bcf86cd799439020').catch(() => {})
  await sellerService.getSellerProducts('507f1f77bcf86cd799439020', { page: 1 }).catch(() => {})
  await sellerService.updateSellerProfile({
    payoutWallet: '01012345678',
    stages: ['nursery'],
    materials: ['felt'],
  }).catch(() => {})
  await sellerService.getCustomRequests({ page: 1 }).catch(() => {})
  await sellerService.claimCustomRequest('507f1f77bcf86cd799439019').catch(() => {})

  // 11. settingsService
  await settingsService.getSettings().catch(() => {})
  await settingsService.getPublicSettings().catch(() => {})
  await settingsService.getShippingRates().catch(() => {})
  await settingsService.updateSettings({
    commissionRate: 0.20,
    platformWallet: '01012345678',
  }).catch(() => {})
  await settingsService.updateShippingRates({
    greater_cairo: 45,
  }).catch(() => {})

  // 12. notificationService
  await notificationService.getNotifications({ page: 1, pageSize: 12, unread: false }).catch(() => {})
  await notificationService.getUnreadCount().catch(() => {})
  await notificationService.markRead('507f1f77bcf86cd799439021').catch(() => {})
  await notificationService.markAllRead().catch(() => {})
  await notificationService.deleteNotification('507f1f77bcf86cd799439021').catch(() => {})
  await notificationService.deleteNotifications(true).catch(() => {})
}

await runServiceScenarios()

console.info(`[INFO] Captured ${recordedCalls.length} service requests. Validating contracts...`)

// Canonical routes check from Backend/check-routes.mjs
const checkRoutesContent = fs.readFileSync(path.join(BACKEND_ROOT, 'check-routes.mjs'), 'utf8')
const canonMatch = checkRoutesContent.match(/const CANON = `([^`]+)`/)
const CANONICAL_ROUTES = canonMatch
  ? canonMatch[1]
      .split(/[\n|]/)
      .map((s) => s.trim())
      .filter(Boolean)
  : []

let passedCount = 0
let failedCount = 0
const testedRoutePatterns = new Set()
const validationErrors = []

for (const call of recordedCalls) {
  const matched = matchRoutePattern(call.method, call.url)

  if (!matched) {
    validationErrors.push({
      route: `${call.method} ${call.url}`,
      message: 'Unknown route or no schema mapping configured in check-contracts.mjs',
    })
    failedCount++
    continue
  }

  const { pattern, schemaObj } = matched
  testedRoutePatterns.add(`${call.method} ${pattern}`)

  // Validate request body if schema exists
  if (schemaObj.body && call.data && Object.keys(call.data).length > 0) {
    const parseResult = schemaObj.body.safeParse(call.data)
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        validationErrors.push({
          route: `${call.method} ${pattern}`,
          key: issue.path.join('.') || '(root)',
          message: issue.message,
          code: issue.code,
          sentData: call.data,
        })
        failedCount++
      }
      continue
    }
  }

  // Validate request query params if schema exists
  if (schemaObj.query && call.params && Object.keys(call.params).length > 0) {
    const parseResult = schemaObj.query.safeParse(call.params)
    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        validationErrors.push({
          route: `${call.method} ${pattern} (query params)`,
          key: issue.path.join('.') || '(query)',
          message: issue.message,
          code: issue.code,
          sentParams: call.params,
        })
        failedCount++
      }
      continue
    }
  }

  passedCount++
}

// Check coverage against CANONICAL_ROUTES
const untestedCanonicalRoutes = CANONICAL_ROUTES.filter((r) => {
  // Ignore cron or health or streaming or internal jobs in frontend service coverage
  if (r.startsWith('GET /health') || r.startsWith('GET /jobs') || r.startsWith('POST /jobs') || r.startsWith('GET /files')) {
    return false
  }
  return !testedRoutePatterns.has(r)
})

console.info('--------------------------------------------------')
console.info(`[SUMMARY] Total Captured Requests: ${recordedCalls.length}`)
console.info(`[PASS] Passed Contract Validations: ${passedCount}`)
console.info(`[FAIL] Contract Violations: ${failedCount}`)

if (untestedCanonicalRoutes.length > 0) {
  console.info(`\n[WARN] Canonical routes without active service test case (${untestedCanonicalRoutes.length}):`)
  for (const r of untestedCanonicalRoutes) {
    console.info(`  - ${r}`)
  }
}

if (validationErrors.length > 0) {
  console.error('\n================ CONTRACT VALIDATION FAILURES ================')
  for (const err of validationErrors) {
    console.error(`❌ [FAIL] Route: ${err.route}`)
    if (err.key) console.error(`   Field/Key: ${err.key}`)
    console.error(`   Reason: ${err.message} (${err.code || 'UNKNOWN'})`)
    if (err.sentData) console.error(`   Sent Payload:`, JSON.stringify(err.sentData))
    if (err.sentParams) console.error(`   Sent Query:`, JSON.stringify(err.sentParams))
    console.error('--------------------------------------------------')
  }
  process.exit(1)
} else {
  console.info('\n✅ [SUCCESS] All Frontend service calls strictly match Backend Zod schemas with 0 errors!')
  process.exit(0)
}
