import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import toast from 'react-hot-toast'
import '../src/config/i18n'
import i18n from '../src/config/i18n'
import apiClient, { mutationToasts, resetMutationToastDeduper } from '../src/services/api'
import { getFriendlyError } from '../src/utils/errors'

describe('D2: Centralized Mutation Success Toasts', () => {
  const originalAdapter = apiClient.defaults.adapter
  let toastSpy

  beforeEach(async () => {
    await i18n.changeLanguage('ar')
    resetMutationToastDeduper()
    toastSpy = vi.spyOn(toast, 'success').mockImplementation(() => 'mock-toast-id')
  })

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
    toastSpy.mockRestore()
    vi.useRealTimers()
  })

  const mockSuccessAdapter = (responseData = { ok: true }) => {
    apiClient.defaults.adapter = async (config) => ({
      data: { success: true, data: responseData },
      status: 200,
      headers: {},
      config,
    })
  }

  it('triggers bilingual success toasts for every covered mutation endpoint', async () => {
    const cases = [
      ['post', '/products/manage/products', { name: 'A' }],
      ['patch', '/products/manage/products/p1', { price: 100 }],
      ['patch', '/products/manage/products/p1/publish', { published: true }, { published: true }],
      ['patch', '/products/manage/products/p1/publish', { published: false }, { published: false }],
      ['delete', '/products/manage/products/p1'],
      ['post', '/orders', { items: [] }],
      ['post', '/orders/o1/cancel', { reason: 'x' }],
      ['patch', '/orders/seller/o1/fulfillment', { status: 'preparing' }],
      ['delete', '/orders/seller/o1'],
      ['patch', '/orders/admin/o1/status', { status: 'shipped' }],
      ['post', '/orders/admin/o1/cancel', { reason: 'x' }],
      ['post', '/orders/admin/o1/refund', { reference: 'R1' }],
      ['post', '/orders/admin/o1/archive'],
      ['post', '/orders/admin/o1/unarchive'],
      ['delete', '/orders/admin/o1'],
      ['post', '/payments/orders/o1/payment', { senderPhone: '01012345678' }],
      ['post', '/payments/admin/o1/confirm'],
      ['post', '/payments/admin/o1/reject', { reason: 'bad' }],
      ['put', '/admin/categories/alphabet-boards', { color: '#fff' }],
      ['put', '/admin/categories/order', { slugs: ['a'] }],
      ['put', '/admin/settings', { commissionRate: 0.2 }],
      ['put', '/admin/settings/shipping-rates', { rates: {} }],
      ['post', '/admin/sellers', { name: 'S' }],
      ['patch', '/admin/users/u1/status', { status: 'active' }],
      ['patch', '/admin/users/u1/status', { status: 'suspended' }],
      ['delete', '/admin/users/u1'],
      ['patch', '/sellers/me/profile', { bio: {} }],
      ['post', '/admin/payouts', { amount: 100 }],
      ['post', '/contact/custom-requests', { details: 'test' }],
      ['patch', '/admin/custom-requests/c1', { status: 'contacted' }],
      ['delete', '/admin/custom-requests/c1'],
      ['post', '/sellers/me/custom-requests/c1/claim'],
      ['patch', '/sellers/me/custom-requests/c1/status', { status: 'closed' }],
      ['post', '/users/me/addresses', { city: 'Cairo' }],
      ['put', '/users/me/addresses/a1', { city: 'Giza' }],
      ['delete', '/users/me/addresses/a1'],
      ['post', '/users/me/favorites/p1', undefined, { isFavorite: true }],
      ['post', '/users/me/favorites/p1', undefined, { isFavorite: false }],
      ['patch', '/users/me', { name: 'New' }],
      ['post', '/auth/change-password', { current: '1', next: '2' }],
      ['post', '/users/me/avatar', { file: 'x' }],
      ['patch', '/users/me/notification-prefs', { inSite: true }],
      ['delete', '/users/me', { password: 'p' }],
      ['delete', '/notifications/n1'],
      ['delete', '/notifications'],
    ]

    expect(mutationToasts.length).toBeGreaterThanOrEqual(40)

    for (const [method, url, body, respPayload] of cases) {
      resetMutationToastDeduper()
      toastSpy.mockClear()
      mockSuccessAdapter(respPayload || { ok: true })

      await apiClient.request({ method, url, data: body })
      expect(toastSpy, `Expected toast for ${method.toUpperCase()} ${url}`).toHaveBeenCalledTimes(1)
      const [msg] = toastSpy.mock.calls[0]
      expect(msg).not.toContain('mutationToasts.')
      expect(msg.length).toBeGreaterThan(3)
    }

    // Also verify English rendering
    await i18n.changeLanguage('en')
    resetMutationToastDeduper()
    toastSpy.mockClear()
    mockSuccessAdapter({ ok: true })
    await apiClient.post('/orders', { items: [] })
    expect(toastSpy).toHaveBeenCalledWith('Order placed successfully', expect.any(Object))
  })

  it('respects silent: true opt-out and excludes auth, notification read, partial uploads, and GET calls', async () => {
    mockSuccessAdapter({ ok: true })

    await apiClient.post('/orders', { items: [] }, { silent: true })
    expect(toastSpy).not.toHaveBeenCalled()

    const excluded = [
      ['post', '/auth/login'],
      ['post', '/auth/logout'],
      ['post', '/auth/refresh'],
      ['get', '/auth/me'],
      ['post', '/auth/register'],
      ['post', '/auth/verify-email'],
      ['patch', '/notifications/n1/read'],
      ['post', '/notifications/read-all'],
      ['post', '/products/manage/products/images'],
      ['get', '/orders/my'],
    ]

    for (const [method, url] of excluded) {
      await apiClient.request({ method, url })
    }

    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('deduplicates rapid identical mutation toasts within 1000ms and allows again after window', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
    mockSuccessAdapter({ ok: true })

    await Promise.all([
      apiClient.post('/orders/admin/1/archive'),
      apiClient.post('/orders/admin/2/archive'),
      apiClient.post('/orders/admin/3/archive'),
    ])
    expect(toastSpy).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1100)
    await apiClient.post('/orders/admin/4/archive')
    expect(toastSpy).toHaveBeenCalledTimes(2)
  })

  it('never fires toast.success on errors and preserves getFriendlyError messages', async () => {
    apiClient.defaults.adapter = async (config) => {
      const err = new Error('Request failed')
      err.config = config
      err.response = {
        status: 400,
        data: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid field' } },
      }
      throw err
    }

    await expect(apiClient.post('/orders', {})).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })

    expect(toastSpy).not.toHaveBeenCalled()
    try {
      await apiClient.post('/orders', {})
    } catch (caught) {
      expect(getFriendlyError(caught, i18n.t)).toBeTruthy()
    }
  })
})
