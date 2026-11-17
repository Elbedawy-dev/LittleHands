import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('F4: MobileTopBar drawer scroll structure and spacing', () => {
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
    cleanup()
    postSpy?.mockRestore()
    apiClient.defaults.adapter = originalAdapter
    localStorage.clear()
    vi.restoreAllMocks()
  })

  function setupMockAdapter(currentUser) {
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
        return { data: { success: true, data: { items: [], total: 0, page: 1, pageSize: 10 } }, status: 200, headers: {}, config }
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
      return { data: { success: true, data: { items: [], total: 0 } }, status: 200, headers: {}, config }
    }
  }

  function renderAtRoute(initialPath) {
    const memRouter = createMemoryRouter(router.routes, { initialEntries: [initialPath] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )
    return memRouter
  }

  async function assertDrawerScrollContract() {
    const hamburger = await screen.findByTestId('mobile-hamburger')
    fireEvent.click(hamburger)

    const panel = await screen.findByTestId('mobile-drawer-panel')
    const links = screen.getByTestId('mobile-drawer-links')
    const appearanceRow = screen.getByTestId('mobile-drawer-appearance-row')
    const bottom = screen.getByTestId('mobile-drawer-bottom')

    // Panel uses flex-col without justify-between so appearance sits directly under links
    expect(panel.className).toContain('flex-col')
    expect(panel.className).not.toContain('justify-between')

    // Direct flex children: [header, links, appearanceWrapper, bottom]
    const children = Array.from(panel.children)
    expect(children).toHaveLength(4)
    expect(children[0].className).toContain('shrink-0')
    expect(children[1]).toBe(links)
    expect(children[2].className).toContain('shrink-0')
    expect(children[2].contains(appearanceRow)).toBe(true)
    expect(children[3]).toBe(bottom)

    // Only links container is scrollable and uses flex-[0_1_auto] min-h-0
    expect(links.className).toContain('flex-[0_1_auto]')
    expect(links.className).toContain('min-h-0')
    expect(links.className).toContain('overflow-y-auto')
    expect(links.className).toContain('overscroll-contain')
    expect(links.className).toContain('modal-scrollbar')
    const allScrollable = panel.querySelectorAll('.overflow-y-auto')
    expect(allScrollable).toHaveLength(1)
    expect(allScrollable[0]).toBe(links)

    // Appearance row and bottom footer stay fixed (never shrink), bottom pinned via mt-auto
    expect(appearanceRow.className).toContain('shrink-0')
    expect(bottom.className).toContain('shrink-0')
    expect(bottom.className).toContain('mt-auto')
  }

  it('keeps header, appearance row directly below links, and bottom CTA fixed for guests', async () => {
    setupMockAdapter(null)
    renderAtRoute('/')
    await waitFor(() => expect(screen.getByTestId('mobile-hamburger')).toBeTruthy())
    await assertDrawerScrollContract()
  })

  it('makes only the nav links region scroll when admin has full dashboard link list', async () => {
    const adminUser = mapUserDTO({
      _id: '507f1f77bcf86cd799439011',
      name: 'أدمن',
      email: 'admin@littlehands.eg',
      phone: '01000000001',
      role: 'admin',
      emailVerified: true,
      status: 'active',
    })
    setupMockAdapter(adminUser)
    renderAtRoute('/')
    await screen.findByTestId('mobile-avatar-btn')
    await assertDrawerScrollContract()
    expect(
      screen.getByTestId('mobile-drawer-links').querySelector('a[href="/admin/custom-requests"]')
    ).toBeTruthy()
  })
})
