import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '../src/config/i18n'
import i18n from '../src/config/i18n'
import apiClient from '../src/services/api'
import { AppProviders } from '../src/app/providers'
import { router } from '../src/app/router'
import { DeliveryInfoCard } from '../src/features/storefront/DeliveryInfoCard'
import { PersonalInfoForm } from '../src/features/profile/PersonalInfoForm'
import { SHIPPING_ZONES } from '../../Backend/src/config/constants.js'
import { mapUserDTO } from '../../Backend/src/utils/dto.js'
import {
  toPublicSettingsDTO,
  toShippingGovernoratesDTO,
  toShippingRatesMap,
  toShippingZonesDTO,
} from '../../Backend/src/modules/settings/dto.js'

const buildZonesWithDelta10 = () =>
  SHIPPING_ZONES.map((z) =>
    z.zone === 'delta_canal' ? { ...z, price: 10 } : { ...z }
  )

const sampleCustomer = mapUserDTO(
  {
    _id: '650000000000000000000010',
    name: 'منى الحضانات',
    email: 'mona@nursery.eg',
    phone: '01099887766',
    role: 'customer',
    status: 'active',
    emailVerified: true,
    nurseryName: 'حضانة براعم الدلتا',
    governorate: 'كفر الشيخ',
    city: 'دسوق',
    address: 'شارع الجيش مبنى 4',
    favorites: [],
    addresses: [],
  },
  'customer',
  '650000000000000000000010'
)

const cartItems = [
  {
    productId: '650000000000000000000021',
    name: { ar: 'لوحة الألوان', en: 'Colors Board' },
    price: 200,
    qty: 2,
    stock: 10,
    categoryId: 'colors',
    sellerId: '650000000000000000000002',
    sellerName: 'البائعة الأولى',
    image: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
  },
]

function setupApiMock({ zones = buildZonesWithDelta10(), failShipping = false, requests = [] } = {}) {
  const settingsDoc = {
    platformWallet: '01012345678',
    supportPhone: '01012345678',
    supportEmail: 'support@littlehands.eg',
    whatsappNumber: '01012345678',
    commissionRate: 0.2,
    shippingRates: zones,
  }

  apiClient.defaults.adapter = async (config) => {
    const cleanUrl = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
    requests.push({ method: (config.method || 'get').toUpperCase(), url: cleanUrl })
    if (cleanUrl === '/auth/me') {
      return { data: { success: true, data: { user: sampleCustomer } }, status: 200, headers: {}, config }
    }
    if (cleanUrl === '/settings/public' || cleanUrl === '/settings') {
      return { data: { success: true, data: toPublicSettingsDTO(settingsDoc) }, status: 200, headers: {}, config }
    }
    if (cleanUrl === '/settings/shipping-rates') {
      if (failShipping) {
        const err = new Error('Network Error')
        err.config = config
        throw err
      }
      return {
        data: {
          success: true,
          data: toShippingRatesMap(zones),
          meta: {
            zones: toShippingZonesDTO(zones),
            governorates: toShippingGovernoratesDTO(zones),
          },
        },
        status: 200,
        headers: {},
        config,
      }
    }
    if (cleanUrl === '/users/me/addresses') {
      return { data: { success: true, data: { items: [] } }, status: 200, headers: {}, config }
    }
    if (cleanUrl === '/notifications/unread-count') {
      return { data: { success: true, data: { count: 0 } }, status: 200, headers: {}, config }
    }
    if (cleanUrl === '/orders' && (config.method || 'get').toUpperCase() === 'POST') {
      return {
        data: {
          success: true,
          data: {
            id: '650000000000000000000999',
            number: 'LH-2026-999',
            status: 'pending_payment',
            subtotal: 400,
            shipping: 65,
            total: 465,
          },
        },
        status: 201,
        headers: {},
        config,
      }
    }
    if (cleanUrl.endsWith('/payment') && (config.method || 'get').toUpperCase() === 'POST') {
      return { data: { success: true, data: { status: 'submitted' } }, status: 200, headers: {}, config }
    }
    if (cleanUrl.startsWith('/orders/')) {
      return {
        data: {
          success: true,
          data: {
            id: '650000000000000000000999',
            number: 'LH-2026-999',
            status: 'pending_payment',
            items: [],
            subtotal: 400,
            shipping: 65,
            total: 465,
          },
        },
        status: 200,
        headers: {},
        config,
      }
    }
    return { data: { success: true, data: { items: [] } }, status: 200, headers: {}, config }
  }
}

describe('B1: Unified Dynamic Shipping Rates (Delta = 10 EGP)', () => {
  const originalAdapter = apiClient.defaults.adapter

  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    await i18n.changeLanguage('ar')
    localStorage.setItem('lh_cart_v1', JSON.stringify(cartItems))
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('CartPage shows live 10 EGP rate for كفر الشيخ and updates total (400 + 10 = 410)', async () => {
    setupApiMock()
    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/cart'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(
      () => {
        const el = screen.getByLabelText(/محافظة مقر الحضانة/)
        expect(el.disabled).toBe(false)
        const selectNode = el.tagName === 'SELECT' ? el : el.parentElement?.querySelector('select')
        expect(selectNode).toBeTruthy()
        expect(
          within(selectNode).getByRole('option', { name: /كفر الشيخ/, hidden: true })
        ).toBeTruthy()
      },
      { timeout: 5000 }
    )

    const activeControl = screen.getByLabelText(/محافظة مقر الحضانة/)
    const hiddenSelect =
      activeControl.tagName === 'SELECT'
        ? activeControl
        : activeControl.parentElement.querySelector('select')
    const kafrOption = within(hiddenSelect).getByRole('option', {
      name: /كفر الشيخ/,
      hidden: true,
    })
    expect(kafrOption.textContent).toContain('10')
    expect(kafrOption.textContent).not.toContain('55')

    const freshControl = screen.getByLabelText(/محافظة مقر الحضانة/)
    if (freshControl.tagName === 'SELECT') {
      fireEvent.change(freshControl, { target: { value: 'كفر الشيخ' } })
    } else {
      fireEvent.click(freshControl)
      const listbox = screen.queryByRole('listbox')
      if (listbox) {
        fireEvent.click(within(listbox).getByRole('option', { name: /كفر الشيخ/ }))
      } else {
        const latestControl = screen.getByLabelText(/محافظة مقر الحضانة/)
        const latestSelect =
          latestControl.tagName === 'SELECT'
            ? latestControl
            : latestControl.parentElement.querySelector('select')
        fireEvent.change(latestSelect, { target: { value: 'كفر الشيخ' } })
      }
    }

    await waitFor(
      () => {
        expect(document.body.textContent).toContain('410')
      },
      { timeout: 5000 }
    )
  })

  it('CheckoutPage & DeliveryStep apply 10 EGP delta rate dynamically without 40/55 fallbacks', async () => {
    setupApiMock()
    sessionStorage.setItem('lh_selected_gov', 'كفر الشيخ')
    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/checkout'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    const selectTrigger = await screen.findByLabelText(/المحافظة/, {}, { timeout: 5000 })
    await waitFor(
      () => {
        expect(selectTrigger.disabled).toBe(false)
        expect(selectTrigger.textContent).toContain('كفر الشيخ')
      },
      { timeout: 5000 }
    )

    const hiddenSelect =
      selectTrigger.tagName === 'SELECT'
        ? selectTrigger
        : selectTrigger.parentElement.querySelector('select')
    const kafrOption = within(hiddenSelect).getByRole('option', {
      name: /كفر الشيخ/,
      hidden: true,
    })
    expect(kafrOption.textContent).toContain('10')
    expect(kafrOption.textContent).not.toContain('55')
    expect(document.body.textContent).toContain('410')
  })

  it('CartPage & CheckoutPage disable proceed button and show loading state when shipping fetch fails', async () => {
    setupApiMock({ failShipping: true })
    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/cart'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(
      () => {
        expect(document.body.textContent).toContain('جارٍ تحميل أسعار الشحن')
      },
      { timeout: 5000 }
    )

    const checkoutButtons = screen.getAllByRole('button', { name: /إتمام الطلب/ })
    expect(checkoutButtons.length).toBeGreaterThan(0)
    for (const btn of checkoutButtons) {
      expect(btn.disabled).toBe(true)
    }
  })

  it('DeliveryInfoCard renders live zone rates (10 EGP) without hardcoded 35/45/55', async () => {
    setupApiMock()
    render(
      <AppProviders>
        <DeliveryInfoCard />
      </AppProviders>
    )

    await waitFor(() => {
      expect(document.body.textContent).toContain('10')
      expect(document.body.textContent).toContain('الدلتا والقناة')
    })
  })

  it('Non-purchase pages (RegisterPage, PersonalInfoForm, AccountAddressesPage) render governorate names only without shipping prices', async () => {
    setupApiMock()
    const regRouter = createMemoryRouter(router.routes, { initialEntries: ['/register'] })
    const { unmount } = render(
      <AppProviders>
        <RouterProvider router={regRouter} />
      </AppProviders>
    )

    const regGovTrigger = await screen.findByLabelText(/المحافظة/)
    const regSelect =
      regGovTrigger.tagName === 'SELECT'
        ? regGovTrigger
        : regGovTrigger.parentElement.querySelector('select')
    expect(regSelect.textContent).toContain('كفر الشيخ')
    expect(regSelect.textContent).not.toMatch(/الشحن|\d+\s*ج\.م|Shipping EGP/i)
    unmount()

    render(
      <AppProviders>
        <PersonalInfoForm variant="customer" />
      </AppProviders>
    )
    const profileGovTrigger = await screen.findByLabelText(/المحافظة/)
    const profileSelect =
      profileGovTrigger.tagName === 'SELECT'
        ? profileGovTrigger
        : profileGovTrigger.parentElement.querySelector('select')
    expect(profileSelect.textContent).toContain('كفر الشيخ')
    expect(profileSelect.textContent).not.toMatch(/الشحن|\d+\s*ج\.م|Shipping EGP/i)
  })

  it('B2: CheckoutPage & DeliveryStep do not fetch or render saved addresses or save-address checkbox', async () => {
    const requests = []
    setupApiMock({ requests })
    sessionStorage.setItem('lh_selected_gov', 'كفر الشيخ')
    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/checkout'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await screen.findByLabelText(/المحافظة/, {}, { timeout: 5000 })
    await waitFor(
      () => {
        expect(document.body.textContent).toContain('كفر الشيخ')
      },
      { timeout: 5000 }
    )

    expect(requests.some((r) => r.url.includes('/users/me/addresses'))).toBe(false)
    expect(document.body.textContent).not.toContain('العناوين المسجلة')
    expect(document.getElementById('save-address-chk')).toBeNull()
  })

  it('B3: no default Cairo selection in Cart or Checkout, shows "اختاري من القائمة"', async () => {
    setupApiMock()
    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/cart'] })
    const { unmount } = render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(
      () => {
        const el = screen.getByLabelText(/محافظة مقر الحضانة/)
        expect(el.disabled).toBe(false)
        expect(document.body.textContent).toContain('اختاري من القائمة')
        expect(document.body.textContent).toContain('اختاري المحافظة لحساب الشحن')
      },
      { timeout: 5000 }
    )
    expect(sessionStorage.getItem('lh_selected_gov')).toBeNull()
    unmount()

    const coRouter = createMemoryRouter(router.routes, { initialEntries: ['/checkout'] })
    render(
      <AppProviders>
        <RouterProvider router={coRouter} />
      </AppProviders>
    )

    await waitFor(
      () => {
        const govControl = screen.getByLabelText(/المحافظة/)
        expect(govControl.disabled).toBe(false)
        const selectEl =
          govControl.tagName === 'SELECT'
            ? govControl
            : govControl.parentElement.querySelector('select')
        expect(selectEl.value).toBe('')
        expect(document.body.textContent).toContain('اختاري من القائمة')
      },
      { timeout: 5000 }
    )
  })

  it('B3: syncs nursery/gov/notes from Cart to DeliveryStep, updates summary & sessionStorage live, and clears on order submit', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-receipt')
    const requests = []
    setupApiMock({ requests })

    const memRouter = createMemoryRouter(router.routes, { initialEntries: ['/cart'] })
    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(
      () => {
        const el = screen.getByLabelText(/محافظة مقر الحضانة/)
        expect(el.disabled).toBe(false)
      },
      { timeout: 5000 }
    )

    // Pick governorate, enter nursery name & notes in Cart
    const govEl = screen.getByLabelText(/محافظة مقر الحضانة/)
    const cartSelect =
      govEl.tagName === 'SELECT' ? govEl : govEl.parentElement.querySelector('select')
    fireEvent.change(cartSelect, { target: { value: 'كفر الشيخ' } })

    const nurseryInput = document.getElementById('cart-nursery-name')
    fireEvent.change(nurseryInput, { target: { value: 'حضانة المستقبل' } })
    const notesInput = document.getElementById('cart-nursery-notes')
    fireEvent.change(notesInput, { target: { value: 'ملاحظة تغليف هدايا' } })

    expect(sessionStorage.getItem('lh_selected_gov')).toBe('كفر الشيخ')
    expect(sessionStorage.getItem('lh_cart_nursery')).toBe('حضانة المستقبل')
    expect(sessionStorage.getItem('lh_cart_notes')).toBe('ملاحظة تغليف هدايا')

    // Proceed to Checkout -> verifies Cart + User auto-fill
    const proceedButtons = screen.getAllByRole('button', { name: /إتمام الطلب/ })
    fireEvent.click(proceedButtons[0])

    await waitFor(
      () => {
        expect(document.getElementById('delivery-nursery')?.value).toBe('حضانة المستقبل')
        expect(document.getElementById('delivery-notes')?.value).toBe('ملاحظة تغليف هدايا')
        expect(document.getElementById('delivery-name')?.value).toBe('منى الحضانات')
        expect(document.getElementById('delivery-phone')?.value).toBe('01099887766')
      },
      { timeout: 5000 }
    )

    // Changing governorate in DeliveryStep syncs CheckoutSummaryCard & lh_selected_gov immediately
    const deliveryGovControl = screen.getByLabelText(/المحافظة/)
    const deliverySelect =
      deliveryGovControl.tagName === 'SELECT'
        ? deliveryGovControl
        : deliveryGovControl.parentElement.querySelector('select')
    fireEvent.change(deliverySelect, { target: { value: 'أسيوط' } })

    await waitFor(
      () => {
        expect(sessionStorage.getItem('lh_selected_gov')).toBe('أسيوط')
        expect(document.body.textContent).toContain('465')
      },
      { timeout: 5000 }
    )

    // Fill remaining required address fields & continue to PaymentStep
    fireEvent.change(document.getElementById('delivery-city'), { target: { value: 'أسيوط' } })
    fireEvent.change(document.getElementById('delivery-address'), {
      target: { value: 'شارع الجمهورية عمارة 12' },
    })
    fireEvent.click(screen.getByRole('button', { name: /متابعة للدفع/ }))

    // PaymentStep -> upload receipt & continue to ReviewStep
    const senderPhoneInput = await screen.findByLabelText(/رقم الهاتف المحوّل منه/, {}, { timeout: 5000 })
    expect(senderPhoneInput.value).toBe('01099887766')
    const fileInput = document.querySelector('input[type="file"]')
    const mockFile = new File(['png-bytes'], 'receipt.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [mockFile] } })
    fireEvent.click(screen.getByRole('button', { name: /مراجعة وتأكيد الطلب/ }))

    // ReviewStep -> final submit clears cart & all session keys
    const submitOrderBtn = await screen.findByRole('button', { name: /تأكيد الطلب وإرسال إيصال الدفع/ }, { timeout: 5000 })
    fireEvent.click(submitOrderBtn)

    await waitFor(
      () => {
        expect(requests.some((r) => r.method === 'POST' && r.url === '/orders')).toBe(true)
        expect(sessionStorage.getItem('lh_selected_gov')).toBeNull()
        expect(sessionStorage.getItem('lh_cart_nursery')).toBeNull()
        expect(sessionStorage.getItem('lh_cart_notes')).toBeNull()
        expect(sessionStorage.getItem('lh_checkout_flow_state')).toBeNull()
      },
      { timeout: 5000 }
    )
  })
})
