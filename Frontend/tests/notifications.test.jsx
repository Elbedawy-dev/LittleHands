import { describe, it, expect, afterEach, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/config/i18n'
import apiClient from '../src/services/api'
import { AppProviders } from '../src/app/providers'
import { router } from '../src/app/router'
import { resolveNotificationLink } from '../src/utils/notifications'
import { mapUserDTO } from '../../Backend/src/utils/dto.js'
import { toOrderDTO } from '../../Backend/src/modules/orders/dto.js'
import { toPublicSettingsDTO, toShippingRatesMap, toShippingZonesDTO } from '../../Backend/src/modules/settings/dto.js'

describe('Notification link resolution & ?order= deep-linking', () => {
  const originalAdapter = apiClient.defaults.adapter

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    vi.restoreAllMocks()
  })

  it('rewrites legacy /orders/:id, /seller/orders/:id, and /admin/orders/:id by role', () => {
    expect(resolveNotificationLink({ link: '/orders/abc123' }, 'customer')).toBe('/account/orders/abc123')
    expect(resolveNotificationLink({ link: '/orders/abc123' }, 'seller')).toBe('/seller/orders?order=abc123')
    expect(resolveNotificationLink({ link: '/orders/abc123' }, 'admin')).toBe('/admin/orders?order=abc123')

    expect(resolveNotificationLink({ link: '/seller/orders/ord99' }, 'seller')).toBe('/seller/orders?order=ord99')
    expect(resolveNotificationLink({ link: '/admin/orders/ord99' }, 'admin')).toBe('/admin/orders?order=ord99')
  })

  it('preserves valid links and falls back to role notifications page on unknown or missing links', () => {
    expect(resolveNotificationLink({ link: '/account/orders/ord1' }, 'customer')).toBe('/account/orders/ord1')
    expect(resolveNotificationLink({ link: '/admin/payments' }, 'admin')).toBe('/admin/payments')
    expect(resolveNotificationLink({ link: '/seller/orders?order=ord1' }, 'seller')).toBe('/seller/orders?order=ord1')

    expect(resolveNotificationLink({ link: '/does-not-exist/foo' }, 'customer')).toBe('/notifications')
    expect(resolveNotificationLink({ link: '/does-not-exist/foo' }, 'seller')).toBe('/seller/notifications')
    expect(resolveNotificationLink({ link: '/does-not-exist/foo' }, 'admin')).toBe('/admin/notifications')
    expect(resolveNotificationLink({}, 'admin')).toBe('/admin/notifications')
  })

  it('AdminOrdersPage ignores invalid ?order= param without crashing or toasting errors', async () => {
    const admin = mapUserDTO(
      { _id: '650000000000000000000001', name: 'Admin', role: 'admin', status: 'active', emailVerified: true },
      'admin',
      '650000000000000000000001'
    )
    const sampleOrder = toOrderDTO(
      {
        _id: '650000000000000000000030',
        number: 'LH-2026-0001',
        customerId: '650000000000000000000003',
        items: [],
        delivery: { name: 'Customer', phone: '01112345678', governorate: 'القاهرة', city: 'نصر', address: '1' },
        subtotal: 100,
        shipping: 40,
        total: 140,
        status: 'pending_payment',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      'admin',
      admin.id
    )

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
      if (url === '/orders/admin') return { data: { success: true, data: { items: [sampleOrder], total: 1 } }, status: 200, headers: {}, config }
      if (url === '/orders/admin/non-existent-id') {
        const err = new Error('Not found')
        err.response = { status: 404, data: { success: false, code: 'NOT_FOUND', message: 'Order not found' }, config }
        err.config = config
        throw err
      }
      return { data: { success: true, data: { items: [] } }, status: 200, headers: {}, config }
    }

    const memRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/admin/orders?order=non-existent-id'],
    })

    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('LH-2026-0001')
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120))
    })
    // No crash, no NotFound page, no dialog opened for invalid order
    expect(document.body.textContent).not.toContain('الصفحة غير موجودة')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
