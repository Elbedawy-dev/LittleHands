import { describe, it, expect, afterEach, vi } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/config/i18n'
import apiClient from '../src/services/api'
import { AppProviders } from '../src/app/providers'
import { router } from '../src/app/router'
import { AdminSellerOrdersDrilldown } from '../src/features/admin/sellers/AdminSellerOrdersDrilldown'
import { mapUserDTO } from '../../Backend/src/utils/dto.js'
import { toOrderDTO } from '../../Backend/src/modules/orders/dto.js'
import { toPayoutDTO } from '../../Backend/src/modules/earnings/dto.js'
import { toPublicSettingsDTO, toShippingRatesMap, toShippingZonesDTO } from '../../Backend/src/modules/settings/dto.js'

const IDS = {
  admin: '650000000000000000000001',
  seller1: '650000000000000000000002',
  seller2: '650000000000000000000004',
  customer: '650000000000000000000003',
  order: '650000000000000000000030',
  payout: '650000000000000000000050',
  product: '650000000000000000000010',
}

describe('AdminSellersPage resilience & Promise.allSettled (A3)', () => {
  const originalAdapter = apiClient.defaults.adapter

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('renders successful sections when one request fails, requests orders with pageSize=50, and retries independently', async () => {
    const admin = mapUserDTO(
      { _id: IDS.admin, name: 'Admin', role: 'admin', status: 'active', emailVerified: true },
      'admin',
      IDS.admin
    )

    const sellersEarnings = [
      {
        sellerId: IDS.seller1,
        sellerName: 'ورشة ندى التعليمية',
        nameEn: 'Nada Workshop',
        status: 'active',
        avatar: 'https://res.cloudinary.com/demo/image/upload/seller1.jpg',
        walletNumber: '01012345678',
        ordersCount: 1,
        totalSales: 200,
        commission: 40,
        net: 160,
        paid: 50,
        due: 110,
      },
    ]

    const payout = toPayoutDTO({
      _id: IDS.payout,
      sellerId: { _id: IDS.seller1, name: 'ورشة ندى التعليمية' },
      amount: 50,
      reference: 'VF-RETRY-01',
      date: '2026-04-01',
      notes: 'Payout test',
      createdAt: new Date(),
    })

    const sampleOrder = toOrderDTO(
      {
        _id: IDS.order,
        number: 'LH-2026-0099',
        customerId: IDS.customer,
        items: [
          {
            productId: IDS.product,
            sellerId: IDS.seller1,
            sellerName: { ar: 'ورشة ندى التعليمية', en: 'Nada Workshop' },
            name: { ar: 'لوحة حروف خشبية', en: 'Wooden Letters Board' },
            qty: 1,
            unitPrice: 200,
          },
        ],
        delivery: { name: 'Hana', phone: '01112345678', governorate: 'القاهرة', city: 'نصر', address: '10 Abbas St' },
        subtotal: 200,
        shipping: 40,
        total: 240,
        status: 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'admin',
      admin.id
    )

    let ordersShouldFail = true
    let ordersCalls = 0
    let seenOrdersParams = null

    apiClient.defaults.adapter = async (config) => {
      const url = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
      if (url === '/auth/me') return { data: { success: true, data: { user: admin } }, status: 200, headers: {}, config }
      if (url === '/settings/public' || url === '/settings') {
        return { data: { success: true, data: toPublicSettingsDTO({ shippingRates: [] }) }, status: 200, headers: {}, config }
      }
      if (url === '/settings/shipping-rates') {
        return { data: { success: true, data: toShippingRatesMap([]), meta: { zones: toShippingZonesDTO([]) } }, status: 200, headers: {}, config }
      }
      if (url === '/notifications/unread-count') return { data: { success: true, data: { count: 0 } }, status: 200, headers: {}, config }
      if (url === '/admin/sellers/earnings') {
        return { data: { success: true, data: sellersEarnings }, status: 200, headers: {}, config }
      }
      if (url === '/admin/payouts') {
        return { data: { success: true, data: { items: [payout], total: 1, page: 1, pageSize: 50 } }, status: 200, headers: {}, config }
      }
      if (url === '/orders/admin') {
        ordersCalls += 1
        seenOrdersParams = config.params
        if (ordersShouldFail) {
          const err = new Error('Orders timeout')
          err.response = { status: 503, data: { success: false, code: 'REQUEST_TIMEOUT', message: 'Timeout' }, config }
          err.config = config
          throw err
        }
        return { data: { success: true, data: { items: [sampleOrder], total: 1, page: 1, pageSize: 50 } }, status: 200, headers: {}, config }
      }
      return { data: { success: true, data: {} }, status: 200, headers: {}, config }
    }

    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/admin/sellers'] })
    const view = render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    // Sellers card & payout reference load even while /orders/admin failed
    await waitFor(() => {
      expect(view.container.textContent).toContain('ورشة ندى التعليمية')
      expect(view.container.textContent).toContain('VF-RETRY-01')
    })

    expect(seenOrdersParams).toEqual({ page: 1, pageSize: 50 })

    // Retry button is shown for the failed orders drilldown section
    const retryBtn = await waitFor(() => {
      const btn = view.container.querySelector('button svg.lucide-refresh-cw')?.closest('button')
      expect(btn).toBeTruthy()
      return btn
    })

    ordersShouldFail = false
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(ordersCalls).toBe(2)
      expect(view.container.textContent).toContain('LH-2026-0099')
    })

    view.unmount()
  })

  it('builds drilldown tabs from all seller accounts (active + suspended) even with 0 orders, plus order-only sellers, with order counts (A4)', () => {
    apiClient.defaults.adapter = async (config) => ({
      data: { success: true, data: {} },
      status: 200,
      headers: {},
      config,
    })

    const view1 = render(
      <AppProviders>
        <AdminSellerOrdersDrilldown
          orders={[]}
          sellers={[
            { sellerId: 's1', sellerName: 'ورشة النور', status: 'active' },
            { sellerId: 's2', sellerName: 'ورشة الأمل', status: 'suspended' },
          ]}
        />
      </AppProviders>
    )

    const tabs1 = Array.from(view1.container.querySelectorAll('[role="tab"]')).map((el) => el.textContent)
    expect(tabs1.length).toBe(3)
    expect(tabs1[1]).toContain('ورشة النور')
    expect(tabs1[2]).toContain('ورشة الأمل')
    view1.unmount()

    const view2 = render(
      <AppProviders>
        <AdminSellerOrdersDrilldown
          sellers={[
            { sellerId: 's1', displayName: { ar: 'ورشة النور', en: 'Noor Workshop' }, status: 'active' },
            { sellerId: 's2', displayName: { ar: 'ورشة الأمل', en: 'Amal Workshop' }, status: 'suspended' },
          ]}
          orders={[
            {
              id: 'o1',
              number: 'LH-1001',
              status: 'confirmed',
              delivery: { name: 'Sara' },
              createdAt: new Date().toISOString(),
              items: [
                { sellerId: 's1', sellerName: 'ورشة النور', name: { ar: 'بازل', en: 'Puzzle' }, unitPrice: 100, qty: 1 },
                { sellerId: 's1', sellerName: 'ورشة النور', name: { ar: 'خرز', en: 'Beads' }, unitPrice: 50, qty: 2 },
              ],
            },
            {
              id: 'o2',
              number: 'LH-1002',
              status: 'delivered',
              delivery: { name: 'Mona' },
              createdAt: new Date().toISOString(),
              items: [
                { sellerId: 's3', sellerName: 'ورشة قديمة', name: { ar: 'جوخ', en: 'Felt' }, unitPrice: 80, qty: 1 },
              ],
            },
            {
              id: 'o3',
              number: 'LH-1003',
              status: 'cancelled',
              delivery: { name: 'Laila' },
              createdAt: new Date().toISOString(),
              items: [
                { sellerId: 's2', sellerName: 'ورشة الأمل', name: { ar: 'بطاقات', en: 'Cards' }, unitPrice: 60, qty: 1 },
              ],
            },
          ]}
        />
      </AppProviders>
    )

    const tabs2 = Array.from(view2.container.querySelectorAll('[role="tab"]'))
    // All + s1 + s2 + s3 (order-only) = 4 tabs
    expect(tabs2.length).toBe(4)
    expect(tabs2[0].querySelector('span:last-child')?.textContent).toMatch(/2|٢/)
    expect(tabs2[1].querySelector('span:last-child')?.textContent).toMatch(/1|١/)
    expect(tabs2[2].querySelector('span:last-child')?.textContent).toMatch(/0|٠/)
    expect(tabs2[3].textContent).toContain('ورشة قديمة')
    expect(tabs2[3].querySelector('span:last-child')?.textContent).toMatch(/1|١/)

    fireEvent.click(tabs2[1])
    expect(view2.container.textContent).toContain('LH-1001')
    expect(view2.container.textContent).not.toContain('LH-1002')
    view2.unmount()
  })
})
