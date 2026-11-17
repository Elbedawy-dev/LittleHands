import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/config/i18n'
import i18n from '../src/config/i18n'
import apiClient from '../src/services/api'
import { LanguageProvider } from '../src/context/LanguageContext'
import { AppProviders } from '../src/app/providers'
import { router } from '../src/app/router'
import { StickyMobileBar } from '../src/features/storefront/StickyMobileBar'
import { SHIPPING_ZONES } from '../../Backend/src/config/constants.js'
import {
  toPublicSettingsDTO,
  toShippingGovernoratesDTO,
  toShippingRatesMap,
  toShippingZonesDTO,
} from '../../Backend/src/modules/settings/dto.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const sampleCartItems = [
  {
    productId: '650000000000000000000021',
    name: { ar: 'لوحة الألوان', en: 'Colors Board' },
    price: 200,
    qty: 1,
    stock: 10,
    categoryId: 'colors',
    sellerId: '650000000000000000000002',
    sellerName: 'البائعة الأولى',
    image: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
  },
]

describe('F6: MobileTabBar CSS height token, CartPage nursery/notes spacing, and sticky bar clearance', () => {
  const originalAdapter = apiClient.defaults.adapter
  let postSpy

  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await i18n.changeLanguage('ar')
    localStorage.setItem('lh_cart_v1', JSON.stringify(sampleCartItems))

    postSpy = vi.spyOn(axios, 'post').mockImplementation(async (url, ...rest) => {
      if (String(url).includes('/auth/refresh')) {
        const err = new Error('No refresh token')
        err.response = { status: 401, data: { success: false, error: { code: 'UNAUTHENTICATED' } } }
        throw err
      }
      return axios.request({ method: 'post', url, data: rest[0], ...(rest[1] || {}) })
    })

    apiClient.defaults.adapter = async (config) => {
      const url = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
      if (url === '/auth/me') {
        const err = new Error('Unauthenticated')
        err.response = { status: 401, data: { success: false, error: { code: 'UNAUTHENTICATED' } }, config }
        err.config = config
        throw err
      }
      if (url === '/settings/public' || url === '/settings') {
        return { data: { success: true, data: toPublicSettingsDTO({ shippingRates: SHIPPING_ZONES }) }, status: 200, headers: {}, config }
      }
      if (url === '/settings/shipping-rates') {
        return {
          data: {
            success: true,
            data: toShippingRatesMap(SHIPPING_ZONES),
            meta: {
              zones: toShippingZonesDTO(SHIPPING_ZONES),
              governorates: toShippingGovernoratesDTO(SHIPPING_ZONES),
            },
          },
          status: 200,
          headers: {},
          config,
        }
      }
      if (url === '/notifications/unread-count') {
        return { data: { success: true, data: { count: 0 } }, status: 200, headers: {}, config }
      }
      return { data: { success: true, data: { items: [] } }, status: 200, headers: {}, config }
    }
  })

  afterEach(() => {
    cleanup()
    postSpy?.mockRestore()
    apiClient.defaults.adapter = originalAdapter
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('defines --mobile-tabbar-h in index.css and synchronizes MobileTabBar, CartPage sticky bar, and nursery/notes spacing', async () => {
    const indexCss = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8')
    expect(indexCss).toMatch(/--mobile-tabbar-h:\s*72px\s*;/)

    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/cart'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    // Nursery input + customization notes wrapper uses flex flex-col gap-5 and mb-0 on both fields
    const nurseryFields = await screen.findByTestId('cart-nursery-fields')
    expect(nurseryFields.className).toContain('flex-col')
    expect(nurseryFields.className).toContain('gap-5')
    expect(nurseryFields.children).toHaveLength(2)
    expect(nurseryFields.children[0].className).toContain('mb-0')
    expect(nurseryFields.children[0].className).not.toContain('mb-5')
    expect(nurseryFields.children[1].className).toContain('mb-0')
    expect(nurseryFields.children[1].className).not.toContain('mb-5')

    // MobileTabBar uses --mobile-tabbar-h fixed height
    const tabBar = await screen.findByTestId('mobile-tabbar')
    expect(tabBar.className).toContain('h-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom))]')

    // CartPage mobile sticky bar clears MobileTabBar using --mobile-tabbar-h on <md and md:bottom-0 on tablet, with symmetric py-3
    const stickyBar = screen.getByTestId('cart-mobile-sticky-bar')
    expect(stickyBar.className).toContain('bottom-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom))]')
    expect(stickyBar.className).toContain('md:bottom-0')
    expect(stickyBar.className).toContain('py-3')
    expect(stickyBar.className).not.toContain('bottom-16')

    // CartPage container guarantees bottom clearance for sticky bar + tabbar
    await waitFor(() => {
      const pageWrap = nurseryFields.closest('[class*="max-w-[1280px]"]')
      expect(pageWrap.className).toContain('pb-[calc(var(--mobile-tabbar-h)+5.5rem+env(safe-area-inset-bottom))]')
    })
  })

  it('uses --mobile-tabbar-h cleanly in StickyMobileBar above MobileTabBar', () => {
    render(
      <LanguageProvider>
        <MemoryRouter>
          <StickyMobileBar
            product={{
              id: '650000000000000000000021',
              name: { ar: 'لوحة الحروف', en: 'Alphabet Board' },
              price: 150,
              stock: 5,
              isActive: true,
            }}
            onAddToCart={() => {}}
          />
        </MemoryRouter>
      </LanguageProvider>
    )

    const bar = screen.getByTestId('sticky-mobile-bar')
    expect(bar.className).toContain('bottom-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom))]')
    expect(bar.className).toContain('py-3')
  })
})
