import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/config/i18n'
import apiClient from '../src/services/api'
import { AppProviders } from '../src/app/providers'
import { router } from '../src/app/router'

// Backend real DTOs to validate real backend -> frontend shapes
import { mapUserDTO, mapProductDTO } from '../../Backend/src/utils/dto.js'
import { toCategoryDTO, toCatalogProductDTO } from '../../Backend/src/modules/catalog/dto.js'
import {
  toCardsDTO,
  toSeriesPointDTO,
  toSellerOrderRowDTO,
  toPayoutDTO,
} from '../../Backend/src/modules/earnings/dto.js'
import {
  toSellerPublicDTO,
  toSellerCustomRequestDTO,
} from '../../Backend/src/modules/sellers/dto.js'
import {
  toShippingRatesMap,
  toShippingZonesDTO,
  toShippingGovernoratesDTO,
  toPublicSettingsDTO,
  toAdminSettingsDTO,
} from '../../Backend/src/modules/settings/dto.js'
import { toNotificationDTO } from '../../Backend/src/modules/notifications/dto.js'
import { toPaymentDTO } from '../../Backend/src/modules/payments/dto.js'
import { toCustomerSummaryDTO } from '../../Backend/src/modules/admin/dto.js'
import { toOrderDTO } from '../../Backend/src/modules/orders/dto.js'

const IDS = {
  admin: '650000000000000000000001',
  seller: '650000000000000000000002',
  customer: '650000000000000000000003',
  product: '650000000000000000000010',
  product2: '650000000000000000000011',
  category: '650000000000000000000020',
  order: '650000000000000000000030',
  payment: '650000000000000000000040',
  payout: '650000000000000000000050',
  notif: '650000000000000000000060',
  customReq: '650000000000000000000070',
}

function buildBackendFixtures() {
  const now = new Date('2026-11-15T00:00:00.000Z')

  const rawSettings = {
    commissionRate: 0.15,
    platformWallet: '01000000001',
    supportPhone: '01000000002',
    supportEmail: 'support@littlehands.example',
    whatsappNumber: '201000000002',
    payoutScheduleText: 'كل أسبوع',
    deliveryTimeText: 'من 2 إلى 5 أيام عمل',
    maintenanceMode: false,
    shippingRates: [
      { zone: 'greater_cairo', price: 40, governorates: ['القاهرة', 'القليوبية'] },
      { zone: 'giza', price: 45, governorates: ['الجيزة'] },
      { zone: 'alexandria', price: 50, governorates: ['الإسكندرية'] },
      { zone: 'delta_canal', price: 55, governorates: ['الدقهلية', 'الغربية', 'الشرقية'] },
      { zone: 'upper_egypt', price: 65, governorates: ['أسيوط', 'أسوان'] },
    ],
    notifications: { orderCreated: true, paymentConfirmed: true },
  }

  const rawCategory = {
    _id: IDS.category,
    slug: 'montessori-wood',
    nameAr: 'وسائل منتسوري',
    nameEn: 'Montessori Aids',
    descriptionAr: 'وسائل تعليمية خشبية',
    descriptionEn: 'Wooden educational aids',
    color: '#4DB6FF',
    bgColor: 'rgba(77, 182, 255, 0.15)',
    textColor: '#0B72B9',
    icon: 'BookOpen',
    order: 0,
  }

  const rawSeller = {
    _id: IDS.seller,
    name: 'ورشة النور',
    nameEn: 'Al Noor Workshop',
    email: 'seller@littlehands.example',
    phone: '01012345678',
    role: 'seller',
    status: 'active',
    governorate: 'القاهرة',
    city: 'مدينة نصر',
    address: 'شارع عباس العقاد',
    avatar: { url: 'https://res.cloudinary.com/demo/image/upload/seller.jpg', key: 'seller.jpg' },
    emailVerified: true,
    seller: {
      displayName: { ar: 'ورشة النور التعليمية', en: 'Al Noor Educational Workshop' },
      bio: { ar: 'تصنيع وسائل منتسوري يدوياً', en: 'Handmade Montessori aids' },
      stages: ['nursery', 'kg1'],
      materials: ['wood', 'felt'],
      payoutWallet: '01012345678',
      workshopAddress: 'مدينة نصر، القاهرة',
    },
    createdAt: now,
  }

  const rawCustomer = {
    _id: IDS.customer,
    name: 'منى أحمد',
    email: 'customer@littlehands.example',
    phone: '01112345678',
    role: 'customer',
    status: 'active',
    accountType: 'nursery',
    nurseryName: 'حضانة البراعم',
    governorate: 'القاهرة',
    city: 'المعادي',
    address: 'شارع 9 المعادي',
    emailVerified: true,
    favorites: [IDS.product],
    addresses: [
      {
        id: '650000000000000000000099',
        _id: '650000000000000000000099',
        label: 'الفرع الرئيسي',
        name: 'منى أحمد',
        phone: '01112345678',
        governorate: 'القاهرة',
        city: 'المعادي',
        address: 'شارع 9',
        nurseryName: 'حضانة البراعم',
        isDefault: true,
      },
    ],
    createdAt: now,
  }

  const rawAdmin = {
    _id: IDS.admin,
    name: 'مديرة المنصة',
    email: 'admin@littlehands.example',
    phone: '01212345678',
    role: 'admin',
    status: 'active',
    governorate: 'القاهرة',
    emailVerified: true,
    createdAt: now,
  }

  const rawProduct = {
    _id: IDS.product,
    slug: 'wooden-counting-board',
    name: { ar: 'لوحة العد الخشبية', en: 'Wooden Counting Board' },
    description: { ar: 'لوحة عد يدوية لتنمية مهارات الحساب', en: 'Handmade counting board for early math' },
    categorySlug: 'montessori-wood',
    categoryId: rawCategory._id,
    sellerId: rawSeller,
    sellerName: 'ورشة النور التعليمية',
    price: 250,
    stock: 8,
    stages: ['nursery', 'kg1'],
    materials: ['wood'],
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', key: 'sample.jpg' }],
    published: true,
    isFeatured: true,
    createdAt: now,
    updatedAt: now,
  }

  const rawPayment = {
    _id: IDS.payment,
    orderId: IDS.order,
    attempt: 1,
    senderPhone: '01112345678',
    transferredAmount: 290,
    reference: 'REF-12345',
    screenshot: { url: 'https://res.cloudinary.com/demo/image/upload/receipt.jpg', key: 'receipt.jpg' },
    status: 'pending',
    flags: [],
    submittedAt: now,
  }

  const rawOrder = {
    _id: IDS.order,
    number: 'LH-2026-0001',
    customerId: IDS.customer,
    items: [
      {
        productId: IDS.product,
        sellerId: IDS.seller,
        sellerName: 'ورشة النور التعليمية',
        name: { ar: 'لوحة العد الخشبية', en: 'Wooden Counting Board' },
        qty: 1,
        unitPrice: 250,
        commissionRate: 0.15,
        commissionAmount: 37.5,
        sellerNet: 212.5,
        image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      },
    ],
    delivery: {
      name: 'منى أحمد',
      phone: '01112345678',
      governorate: 'القاهرة',
      city: 'المعادي',
      address: 'شارع 9 المعادي',
      nurseryName: 'حضانة البراعم',
    },
    subtotal: 250,
    shipping: 40,
    total: 290,
    status: 'payment_confirmed',
    sellerFulfillment: [{ sellerId: IDS.seller, status: 'pending', updatedAt: now }],
    timeline: [{ status: 'pending_payment', note: 'Order created', at: now }],
    payment: rawPayment,
    payments: [rawPayment],
    notes: 'التسليم صباحاً',
    createdAt: now,
    updatedAt: now,
  }

  const rawPayout = {
    _id: IDS.payout,
    sellerId: IDS.seller,
    sellerName: 'ورشة النور التعليمية',
    amount: 150,
    reference: 'PAY-001',
    date: now.toISOString(),
    note: 'تحويل أسبوعي',
    createdAt: now,
  }

  const rawCustomReq = {
    _id: IDS.customReq,
    name: 'أمل حسن',
    phone: '01099887766',
    nurseryName: 'حضانة الأمل',
    details: 'مطلوب وسيلة تعليمية للحروف العربية من الخشب',
    status: 'new',
    createdAt: now,
  }

  const rawNotif = {
    _id: IDS.notif,
    userId: IDS.customer,
    type: 'order_created',
    title: 'تم استلام طلبك',
    message: 'تم إنشاء طلبك #{{orderNumber}} بنجاح',
    params: { orderNumber: 'LH-2026-0001' },
    link: '/account/orders/' + IDS.order,
    read: false,
    createdAt: now,
  }

  return {
    rawSettings,
    rawCategory,
    rawSeller,
    rawCustomer,
    rawAdmin,
    rawProduct,
    rawOrder,
    rawPayment,
    rawPayout,
    rawCustomReq,
    rawNotif,
  }
}

function createSmokeAdapter(role, fixtures) {
  const {
    rawSettings,
    rawCategory,
    rawSeller,
    rawCustomer,
    rawAdmin,
    rawProduct,
    rawOrder,
    rawPayment,
    rawPayout,
    rawCustomReq,
    rawNotif,
  } = fixtures

  const currentUser =
    role === 'admin'
      ? mapUserDTO(rawAdmin, 'admin', IDS.admin)
      : role === 'seller'
        ? mapUserDTO(rawSeller, 'seller', IDS.seller)
        : role === 'customer'
          ? mapUserDTO(rawCustomer, 'customer', IDS.customer)
          : null

  const categories = [toCategoryDTO(rawCategory)]
  const catalogProducts = [toCatalogProductDTO(rawProduct)]
  const manageProducts = [mapProductDTO(rawProduct, role, role === 'seller' ? IDS.seller : null)]
  const sellerPublic = toSellerPublicDTO(rawSeller, {
    productsCount: 1,
    categoryIds: ['montessori-wood'],
    categories: [rawCategory],
    completedOrdersCount: 1,
  })
  const sellerOrders = [toOrderDTO(rawOrder, 'seller', IDS.seller)]
  const adminOrders = [toOrderDTO(rawOrder, 'admin', IDS.admin)]
  const customerOrders = [toOrderDTO(rawOrder, 'customer', IDS.customer)]
  const payments = [
    toPaymentDTO(rawPayment, 'admin', {
      orderId: IDS.order,
      orderNumber: rawOrder.number,
      customerId: IDS.customer,
      customerName: rawOrder.delivery.name,
      customerPhone: rawOrder.delivery.phone,
      total: rawOrder.total,
    }),
  ]
  const payouts = [toPayoutDTO(rawPayout)]
  const cards = toCardsDTO({ sales: 25000, commission: 3750, net: 21250, paid: 15000 })
  const series = [toSeriesPointDTO('2026-11-15', { sales: 25000, commission: 3750, net: 21250, orders: 1 })]
  const sellerOrderRow = toSellerOrderRowDTO(rawOrder, IDS.seller, { forAdmin: role === 'admin' })
  const customerRow = toCustomerSummaryDTO(rawCustomer, {
    ordersCount: 1,
    totalSpentPiasters: 29000,
    lastOrderAt: rawOrder.createdAt,
  })
  const sellerCustomReq = toSellerCustomRequestDTO(rawCustomReq, IDS.seller)
  const notifications = [toNotificationDTO(rawNotif, 'ar')]

  const makeResponse = (config, data, meta = undefined, status = 200) => ({
    data: meta ? { success: true, data, meta } : { success: true, data },
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config,
  })

  return async (config) => {
    const rawUrl = (config.url || '').split('?')[0]
    const cleanUrl = rawUrl.replace(/^\/api\/v1/, '')
    const method = (config.method || 'get').toLowerCase()

    if (cleanUrl === '/auth/me') {
      if (!currentUser) {
        const err = new Error('Unauthorized')
        err.response = { status: 401, data: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' }, config }
        err.config = config
        throw err
      }
      return makeResponse(config, { user: currentUser })
    }
    if (cleanUrl === '/auth/refresh') {
      const err = new Error('Unauthorized')
      err.response = { status: 401, data: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized' }, config }
      err.config = config
      throw err
    }
    if (cleanUrl === '/users/me') {
      return makeResponse(config, { user: currentUser || {} })
    }
    if (cleanUrl === '/users/me/favorites') {
      return makeResponse(config, { items: catalogProducts })
    }
    if (cleanUrl === '/users/me/addresses') {
      return makeResponse(config, { items: rawCustomer.addresses })
    }
    if (cleanUrl === '/settings/public') {
      return makeResponse(config, toPublicSettingsDTO(rawSettings))
    }
    if (cleanUrl === '/settings') {
      return makeResponse(
        config,
        role === 'admin' || role === 'seller' ? toAdminSettingsDTO(rawSettings) : toPublicSettingsDTO(rawSettings)
      )
    }
    if (cleanUrl === '/settings/shipping-rates') {
      return makeResponse(
        config,
        toShippingRatesMap(rawSettings.shippingRates),
        {
          zones: toShippingZonesDTO(rawSettings.shippingRates),
          governorates: toShippingGovernoratesDTO(rawSettings.shippingRates),
        }
      )
    }
    if (cleanUrl === '/catalog/categories') {
      return makeResponse(config, { items: categories })
    }
    if (cleanUrl === '/catalog/products' || cleanUrl === '/catalog/products/featured') {
      return makeResponse(config, { items: catalogProducts, total: 1, page: 1, pageSize: 12, totalPages: 1 })
    }
    if (/^\/catalog\/products\/[^/]+\/related$/.test(cleanUrl)) {
      return makeResponse(config, { items: catalogProducts })
    }
    if (/^\/catalog\/products\/[^/]+$/.test(cleanUrl)) {
      return makeResponse(config, catalogProducts[0])
    }
    if (cleanUrl === '/sellers') {
      return makeResponse(config, { items: [sellerPublic] })
    }
    if (cleanUrl === '/sellers/me/custom-requests') {
      return makeResponse(config, { items: [sellerCustomReq], total: 1, page: 1, pageSize: 12, totalPages: 1 })
    }
    if (/^\/sellers\/[^/]+\/products$/.test(cleanUrl)) {
      return makeResponse(config, { items: catalogProducts })
    }
    if (/^\/sellers\/[^/]+$/.test(cleanUrl)) {
      return makeResponse(config, { seller: sellerPublic })
    }
    if (cleanUrl === '/products/manage/products') {
      return makeResponse(config, { items: manageProducts, total: 1 })
    }
    if (cleanUrl === '/notifications/unread-count') {
      return makeResponse(config, { count: role === 'guest' ? 0 : 1 })
    }
    if (cleanUrl === '/notifications') {
      return makeResponse(config, { items: notifications, total: 1, page: 1, pageSize: 20, totalPages: 1 })
    }
    if (cleanUrl === '/orders/my') {
      return makeResponse(config, { items: customerOrders, total: 1 })
    }
    if (cleanUrl === '/orders/seller') {
      return makeResponse(config, { items: sellerOrders, total: 1 })
    }
    if (cleanUrl === '/orders/admin') {
      return makeResponse(config, { items: adminOrders, total: 1 })
    }
    if (/^\/orders\/admin\/[^/]+$/.test(cleanUrl)) {
      return makeResponse(config, adminOrders[0])
    }
    if (/^\/orders\/[^/]+$/.test(cleanUrl)) {
      return makeResponse(config, role === 'customer' ? customerOrders[0] : adminOrders[0])
    }
    if (cleanUrl === '/payments/admin') {
      return makeResponse(config, { items: payments, total: 1 })
    }
    if (cleanUrl === '/earnings/seller/overview') {
      return makeResponse(config, { cards, series, orders: [sellerOrderRow], recentOrders: sellerOrders })
    }
    if (cleanUrl === '/earnings/seller/earnings') {
      return makeResponse(config, { cards, series, orders: [sellerOrderRow], items: [sellerOrderRow], total: 1 })
    }
    if (cleanUrl === '/earnings/seller/payouts') {
      return makeResponse(config, { items: payouts, total: 1, page: 1, pageSize: 20 })
    }
    if (cleanUrl === '/admin/overview') {
      return makeResponse(config, {
        cards,
        series,
        pendingPaymentsCount: 1,
        recentOrders: adminOrders,
        pendingPayments: payments,
        sellersCount: 1,
        customersCount: 1,
        productsCount: 1,
      })
    }
    if (cleanUrl === '/admin/sellers/accounts') {
      return makeResponse(config, {
        items: [mapUserDTO(rawSeller, 'admin', IDS.admin)],
      })
    }
    if (cleanUrl === '/admin/sellers/earnings') {
      return makeResponse(config, [
        {
          sellerId: IDS.seller,
          id: IDS.seller,
          sellerName: rawSeller.seller.displayName.ar,
          nameEn: rawSeller.seller.displayName.en,
          displayName: rawSeller.seller.displayName,
          bio: rawSeller.seller.bio,
          status: rawSeller.status,
          avatar: rawSeller.avatar.url,
          walletNumber: rawSeller.seller.payoutWallet,
          payoutWallet: rawSeller.seller.payoutWallet,
          governorate: rawSeller.governorate,
          ordersCount: 1,
          totalSales: 250,
          commission: 37.5,
          net: 212.5,
          paid: 150,
          due: 62.5,
        },
      ])
    }
    if (/^\/admin\/sellers\/[^/]+\/orders$/.test(cleanUrl)) {
      return makeResponse(config, { items: [sellerOrderRow], total: 1 })
    }
    if (cleanUrl === '/admin/payouts') {
      return makeResponse(config, { items: payouts, total: 1, page: 1, pageSize: 20 })
    }
    if (cleanUrl === '/admin/customers') {
      return makeResponse(config, { items: [customerRow], total: 1, page: 1, pageSize: 20 })
    }
    if (cleanUrl === '/admin/custom-requests') {
      return makeResponse(config, { items: [rawCustomReq], total: 1, page: 1, pageSize: 20 })
    }
    if (cleanUrl.endsWith('/screenshot')) {
      return { data: new Blob(['img'], { type: 'image/png' }), status: 200, statusText: 'OK', headers: {}, config }
    }
    if (method === 'get') {
      return makeResponse(config, { items: [] })
    }
    return makeResponse(config, { ok: true })
  }
}

async function renderSmokeRoute({ routePath, role, cartItems = [], interact = null }) {
  localStorage.clear()
  sessionStorage.clear()
  if (cartItems.length > 0) {
    localStorage.setItem('lh_cart_v1', JSON.stringify(cartItems))
  }

  const fixtures = buildBackendFixtures()
  apiClient.defaults.adapter = createSmokeAdapter(role, fixtures)

  const errors = []
  const origConsoleError = console.error
  const isReactActNoise = (msg) =>
    msg.includes('not wrapped in act(...)') ||
    msg.includes('suspended resource finished loading inside a test')

  const onError = (ev) => errors.push(ev?.error?.message || ev?.message || 'window error')
  const onRejection = (ev) => errors.push(ev?.reason?.message || String(ev?.reason || 'unhandled rejection'))

  console.error = (...args) => {
    const joined = args.map((a) => (a instanceof Error ? a.stack || a.message : String(a))).join(' ')
    if (!isReactActNoise(joined)) {
      errors.push(joined)
    }
  }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  try {
    const memRouter = createMemoryRouter(router.routes, { initialEntries: [routePath] })
    const view = render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    // Allow lazy suspense chunks + initial async queries to settle
    await waitFor(
      () => {
        const text = document.body.textContent || ''
        expect(text.trim().length).toBeGreaterThan(20)
      },
      { timeout: 10000 }
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 150))
    })

    if (interact) {
      await interact(view)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 150))
      })
    }

    const bodyText = document.body.textContent || ''
    expect(bodyText).not.toMatch(/is not a function|Cannot read properties|Unexpected Application Error|Something went wrong|Objects are not valid/i)
    if (routePath !== '/non-existent-route') {
      expect(bodyText).not.toContain('الصفحة غير موجودة')
    }
    expect(errors).toEqual([])
    return view
  } finally {
    console.error = origConsoleError
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}

const SAMPLE_CART = [
  {
    productId: IDS.product,
    name: { ar: 'لوحة العد الخشبية', en: 'Wooden Counting Board' },
    price: 250,
    unitPrice: 250,
    qty: 1,
    sellerId: IDS.seller,
    sellerName: 'ورشة النور التعليمية',
    sellerNameEn: 'Al Noor Educational Workshop',
    image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    categoryId: 'montessori-wood',
  },
]

const ROUTES_BY_ROLE = {
  guest: [
    '/',
    '/products',
    `/products/${IDS.product}`,
    '/sellers',
    `/sellers/${IDS.seller}`,
    '/about',
    '/cart',
    '/login',
    '/register',
    '/forgot-password',
    '/forgot-password/verify',
    '/reset-password',
    '/verify-email',
  ],
  customer: [
    '/cart',
    '/checkout',
    '/order-success/LH-2026-0001',
    '/account',
    '/account/orders',
    `/account/orders/${IDS.order}`,
    '/account/favorites',
    '/account/addresses',
    '/account/settings',
    '/notifications',
  ],
  seller: [
    '/seller',
    '/seller/products',
    '/seller/products/new',
    `/seller/products/${IDS.product}/edit`,
    '/seller/orders',
    '/seller/custom-requests',
    '/seller/earnings',
    '/seller/profile',
    '/seller/notifications',
  ],
  admin: [
    '/admin',
    '/admin/payments',
    '/admin/orders',
    '/admin/products',
    '/admin/products/new',
    `/admin/products/${IDS.product}/edit`,
    '/admin/sellers',
    '/admin/customers',
    '/admin/categories',
    '/admin/custom-requests',
    '/admin/notifications',
    '/admin/settings',
    '/admin/account',
  ],
}

describe('Smoke render check across all routes and roles with real Backend DTOs', () => {
  const originalAdapter = apiClient.defaults.adapter

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  for (const [role, routes] of Object.entries(ROUTES_BY_ROLE)) {
    describe(`Role: ${role}`, () => {
      for (const routePath of routes) {
        it(`renders ${routePath} without console errors or ErrorBoundary`, async () => {
          const cart = role === 'customer' && (routePath === '/cart' || routePath === '/checkout') ? SAMPLE_CART : []
          await renderSmokeRoute({ routePath, role, cartItems: cart })
        })
      }
    })
  }

  it('opens AdminOrderDrawer on /admin/orders when clicking details without crashing', async () => {
    await renderSmokeRoute({
      routePath: '/admin/orders',
      role: 'admin',
      interact: async () => {
        const btns = await screen.findAllByText(/عرض التفاصيل|View Details/i)
        fireEvent.click(btns[0])
      },
    })
  })

  it('renders seller avatar image on /admin/sellers and /sellers/:id (A5)', async () => {
    await renderSmokeRoute({
      routePath: '/admin/sellers',
      role: 'admin',
      interact: async () => {
        await waitFor(() => {
          const imgs = Array.from(document.querySelectorAll('img')).map((el) => el.getAttribute('src'))
          expect(imgs).toContain('https://res.cloudinary.com/demo/image/upload/seller.jpg')
        })
      },
    })

    await renderSmokeRoute({
      routePath: `/sellers/${IDS.seller}`,
      role: 'guest',
      interact: async () => {
        await waitFor(() => {
          const imgs = Array.from(document.querySelectorAll('img')).map((el) => el.getAttribute('src'))
          expect(imgs).toContain('https://res.cloudinary.com/demo/image/upload/seller.jpg')
        })
      },
    })
  })
})
