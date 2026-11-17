import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/config/i18n'
import apiClient from '../src/services/api'
import { AppProviders } from '../src/app/providers'
import { router } from '../src/app/router'
import { mapUserDTO } from '../../Backend/src/utils/dto.js'
import {
  toPublicSettingsDTO,
  toShippingRatesMap,
  toShippingZonesDTO,
} from '../../Backend/src/modules/settings/dto.js'

describe('F3: MobileTopBar unified dashboard navigation and return-to-store active exclusion', () => {
  const originalAdapter = apiClient.defaults.adapter
  let postSpy

  beforeEach(() => {
    localStorage.setItem('lh_lang', 'ar')
    postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, ...rest) => {
      if (String(url).includes('/auth/refresh')) {
        const err = new Error('No refresh token')
        err.response = { status: 401, data: { success: false, error: { code: 'UNAUTHENTICATED' } } }
        throw err
      }
      return axios.request({ method: 'post', url, data: rest[0], ...(rest[1] || {}) })
    })
  })

  afterEach(() => {
    postSpy?.mockRestore()
    apiClient.defaults.adapter = originalAdapter
    localStorage.clear()
    vi.restoreAllMocks()
  })

  function setupMockAdapter(currentUser, pendingPayments = []) {
    apiClient.defaults.adapter = async (config) => {
      const url = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
      if (url === '/auth/me') {
        if (!currentUser) {
          const err = new Error('Unauthenticated')
          err.response = { status: 401, data: { success: false, error: { code: 'UNAUTHENTICATED' } }, config }
          err.config = config
          throw err
        }
        return { data: { success: true, data: { user: currentUser } }, status: 200, headers: {}, config }
      }
      if (url === '/payments/admin') {
        return {
          data: { success: true, data: { items: pendingPayments, total: pendingPayments.length, page: 1, pageSize: 10 } },
          status: 200,
          headers: {},
          config,
        }
      }
      if (url === '/settings/public' || url === '/settings') {
        return { data: { success: true, data: toPublicSettingsDTO({ shippingRates: [] }) }, status: 200, headers: {}, config }
      }
      if (url === '/settings/shipping-rates') {
        return {
          data: { success: true, data: toShippingRatesMap([]), meta: { zones: toShippingZonesDTO([]) } },
          status: 200,
          headers: {},
          config,
        }
      }
      if (url === '/notifications/unread-count') {
        return { data: { success: true, data: { count: 0 } }, status: 200, headers: {}, config }
      }
      if (url === '/catalog/categories') {
        return { data: { success: true, data: [] }, status: 200, headers: {}, config }
      }
      if (url === '/catalog/products' || url === '/catalog/products/featured') {
        return { data: { success: true, data: { items: [], total: 0, page: 1, pageSize: 12, totalPages: 0 } }, status: 200, headers: {}, config }
      }
      if (url === '/sellers') {
        return { data: { success: true, data: { items: [], total: 0 } }, status: 200, headers: {}, config }
      }
      return { data: { success: true, data: { items: [], total: 0 } }, status: 200, headers: {}, config }
    }
  }

  it('admin opening MobileTopBar on storefront / shows full admin nav with icons, custom-requests, badge, and non-active return-to-store', async () => {
    const adminUser = mapUserDTO(
      { _id: '650000000000000000000001', name: 'مديرة المنصة', role: 'admin', status: 'active', emailVerified: true },
      'admin',
      '650000000000000000000001'
    )
    setupMockAdapter(adminUser, [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }])

    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(() => {
      expect(screen.getByTestId('mobile-hamburger')).toBeTruthy()
    })

    // Wait for auth & pending count to load, then open drawer on /
    await waitFor(() => {
      expect(screen.getByTestId('mobile-avatar-btn').getAttribute('aria-label')).toContain('مديرة المنصة')
    })

    fireEvent.click(screen.getByTestId('mobile-hamburger'))

    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer-links')).toBeTruthy()
    })

    const linksContainer = screen.getByTestId('mobile-drawer-links')
    const anchors = Array.from(linksContainer.querySelectorAll('a'))
    const hrefs = anchors.map((a) => a.getAttribute('href'))

    expect(hrefs).toEqual([
      '/admin',
      '/admin/payments',
      '/admin/orders',
      '/admin/products',
      '/admin/sellers',
      '/admin/customers',
      '/admin/categories',
      '/admin/custom-requests',
      '/admin/notifications',
      '/admin/settings',
      '/',
    ])

    // Every item (including custom-requests and return-to-store) has an SVG icon before the label
    anchors.forEach((a) => {
      expect(a.querySelector('svg')).toBeTruthy()
    })

    // Pending badge = 3 on /admin/payments
    await waitFor(() => {
      expect(anchors[1].textContent).toContain('3')
    })

    // Return-to-store link on "/" MUST NOT have active orange background
    const returnLink = anchors[anchors.length - 1]
    expect(returnLink.getAttribute('href')).toBe('/')
    expect(returnLink.className).not.toContain('bg-brand-orange')
    expect(returnLink.className).toContain('border-surface-border')

    // Compare order & hrefs with DashboardLayout on /admin
    await act(async () => {
      await memRouter.navigate('/admin')
    })
    await waitFor(() => {
      expect(memRouter.state.location.pathname).toBe('/admin')
      expect(screen.queryByTestId('mobile-drawer-links')).toBeNull()
      expect(screen.getByTestId('mobile-hamburger').getAttribute('aria-expanded')).toBe('false')
    })
    fireEvent.click(screen.getByTestId('mobile-hamburger'))
    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer-links')).toBeTruthy()
    })
    const adminDrawerHrefs = Array.from(screen.getByTestId('mobile-drawer-links').querySelectorAll('a')).map((a) =>
      a.getAttribute('href')
    )
    expect(adminDrawerHrefs).toEqual(hrefs)
  })

  it('seller opening MobileTopBar on / shows seller nav with icons and non-active return-to-store; guest keeps storefront links with active home', async () => {
    const sellerUser = mapUserDTO(
      { _id: '650000000000000000000002', name: 'بائعة', role: 'seller', status: 'active', emailVerified: true },
      'seller',
      '650000000000000000000002'
    )
    setupMockAdapter(sellerUser)

    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(() => {
      expect(screen.getByTestId('mobile-avatar-btn').getAttribute('aria-label')).toContain('بائعة')
    })

    fireEvent.click(screen.getByTestId('mobile-hamburger'))
    await waitFor(() => {
      expect(screen.getByTestId('mobile-drawer-links')).toBeTruthy()
    })

    const sellerAnchors = Array.from(screen.getByTestId('mobile-drawer-links').querySelectorAll('a'))
    expect(sellerAnchors.map((a) => a.getAttribute('href'))).toEqual([
      '/seller',
      '/seller/products',
      '/seller/orders',
      '/seller/custom-requests',
      '/seller/earnings',
      '/seller/profile',
      '/seller/notifications',
      '/',
    ])
    sellerAnchors.forEach((a) => expect(a.querySelector('svg')).toBeTruthy())
    expect(sellerAnchors[sellerAnchors.length - 1].className).not.toContain('bg-brand-orange')

    // Guest check
    setupMockAdapter(null)
    const guestRouter = createMemoryRouter(router.routes, { initialEntries: ['/'] })
    const { container } = render(
      <AppProviders>
        <RouterProvider router={guestRouter} />
      </AppProviders>
    )

    await waitFor(() => {
      const hamburgers = screen.getAllByTestId('mobile-hamburger')
      expect(hamburgers.length).toBeGreaterThanOrEqual(2)
    })

    const hamburgers = screen.getAllByTestId('mobile-hamburger')
    fireEvent.click(hamburgers[1])

    await waitFor(() => {
      const linkLists = screen.getAllByTestId('mobile-drawer-links')
      expect(linkLists.length).toBeGreaterThanOrEqual(1)
    })

    const linkLists = screen.getAllByTestId('mobile-drawer-links')
    const guestAnchors = Array.from(linkLists[linkLists.length - 1].querySelectorAll('a'))
    expect(guestAnchors.map((a) => a.getAttribute('href'))).toEqual(['/', '/products', '/sellers', '/about'])
    expect(guestAnchors[0].className).toContain('bg-brand-orange')
    expect(container).toBeTruthy()
  })
})
