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

function mockPublicBootstrap(url, config) {
  if (url === '/settings/public' || url === '/settings') {
    return {
      data: { success: true, data: toPublicSettingsDTO({ shippingRates: [] }) },
      status: 200,
      headers: {},
      config,
    }
  }
  if (url === '/settings/shipping-rates') {
    return {
      data: {
        success: true,
        data: toShippingRatesMap([]),
        meta: { zones: toShippingZonesDTO([]) },
      },
      status: 200,
      headers: {},
      config,
    }
  }
  if (url === '/catalog/categories') {
    return { data: { success: true, data: [] }, status: 200, headers: {}, config }
  }
  if (url === '/catalog/products' || url === '/catalog/products/featured') {
    return {
      data: { success: true, data: { items: [], total: 0, page: 1, pageSize: 12, totalPages: 0 } },
      status: 200,
      headers: {},
      config,
    }
  }
  if (url === '/sellers') {
    return { data: { success: true, data: { items: [], total: 0 } }, status: 200, headers: {}, config }
  }
  return null
}

describe('F1: Registration & Login Email Verification Flow', () => {
  const originalAdapter = apiClient.defaults.adapter
  let postSpy

  beforeEach(() => {
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
    vi.restoreAllMocks()
  })

  it('register does not authenticate user, keeps guest navbar on back navigation, and authenticates only after OTP verification', async () => {
    let authenticated = false
    const verifiedUser = mapUserDTO(
      {
        _id: '650000000000000000000003',
        name: 'سارة أحمد',
        email: 'sara@nursery.eg',
        phone: '01012345678',
        role: 'customer',
        status: 'active',
        emailVerified: true,
      },
      'customer',
      '650000000000000000000003'
    )

    let meCalls = 0
    let verifyPayload = null

    apiClient.defaults.adapter = async (config) => {
      const url = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
      const bootstrap = mockPublicBootstrap(url, config)
      if (bootstrap) return bootstrap

      if (url === '/auth/me') {
        meCalls += 1
        if (!authenticated) {
          const err = new Error('Unauthenticated')
          err.response = {
            status: 401,
            data: { success: false, error: { code: 'UNAUTHENTICATED', message: 'Auth required' } },
            config,
          }
          err.config = config
          throw err
        }
        return { data: { success: true, data: { user: verifiedUser } }, status: 200, headers: {}, config }
      }

      if (url === '/auth/register') {
        return {
          data: {
            success: true,
            data: { email: 'sara@nursery.eg', requiresVerification: true },
          },
          status: 201,
          headers: {},
          config,
        }
      }

      if (url === '/auth/verify-email') {
        verifyPayload = JSON.parse(config.data || '{}')
        authenticated = true
        return {
          data: {
            success: true,
            data: { verified: true, user: verifiedUser, token: 'access-token-123' },
          },
          status: 200,
          headers: {},
          config,
        }
      }

      if (url === '/notifications/unread-count') {
        return { data: { success: true, data: { count: 0 } }, status: 200, headers: {}, config }
      }
      if (url === '/orders/my') {
        return { data: { success: true, data: { items: [], total: 0 } }, status: 200, headers: {}, config }
      }

      return { data: { success: true, data: {} }, status: 200, headers: {}, config }
    }

    const memRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/register'],
    })

    const { container } = render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(() => {
      expect(container.querySelector('#reg-name')).toBeTruthy()
    })

    fireEvent.change(container.querySelector('#reg-name'), { target: { value: 'سارة أحمد' } })
    fireEvent.change(container.querySelector('#reg-phone'), { target: { value: '01012345678' } })
    fireEvent.change(container.querySelector('#reg-email'), { target: { value: 'sara@nursery.eg' } })
    fireEvent.change(container.querySelector('#reg-password'), { target: { value: 'StrongPass123!' } })
    fireEvent.change(container.querySelector('#reg-confirm-password'), { target: { value: 'StrongPass123!' } })
    fireEvent.click(container.querySelector('#reg-terms'))

    fireEvent.submit(container.querySelector('form'))

    await waitFor(() => {
      expect(memRouter.state.location.pathname).toBe('/verify-email')
      expect(memRouter.state.location.search).toBe('?email=sara%40nursery.eg')
    })

    // User went back to home before verifying -> must still appear as guest (login/register links)
    await act(async () => {
      await memRouter.navigate('/')
    })

    await waitFor(() => {
      expect(screen.getByTestId('desktop-auth-links')).toBeTruthy()
    })
    expect(screen.queryByTestId('desktop-avatar-btn')).toBeNull()

    // Now visit verify-email with query email and submit OTP
    await act(async () => {
      await memRouter.navigate('/verify-email?email=sara%40nursery.eg')
    })

    await waitFor(() => {
      expect(container.querySelectorAll('input[inputmode="numeric"]').length).toBe(6)
    })

    const otpInputs = container.querySelectorAll('input[inputmode="numeric"]')
    '654321'.split('').forEach((digit, idx) => {
      fireEvent.change(otpInputs[idx], { target: { value: digit } })
    })

    const meCallsBeforeVerify = meCalls
    fireEvent.submit(container.querySelector('form'))

    await waitFor(() => {
      expect(verifyPayload).toEqual({ email: 'sara@nursery.eg', code: '654321' })
      expect(meCalls).toBeGreaterThan(meCallsBeforeVerify)
      expect(memRouter.state.location.pathname).toBe('/account')
    })
  })

  it('redirects /verify-email without email and without user to /register', async () => {
    apiClient.defaults.adapter = async (config) => {
      const url = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
      const bootstrap = mockPublicBootstrap(url, config)
      if (bootstrap) return bootstrap
      if (url === '/auth/me') {
        const err = new Error('Unauthenticated')
        err.response = {
          status: 401,
          data: { success: false, error: { code: 'UNAUTHENTICATED', message: 'Auth required' } },
          config,
        }
        err.config = config
        throw err
      }
      return { data: { success: true, data: {} }, status: 200, headers: {}, config }
    }

    const memRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/verify-email'],
    })

    render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(() => {
      expect(memRouter.state.location.pathname).toBe('/register')
    })
  })

  it('redirects unverified login (even by phone) to /verify-email?email=...&resend=1 and ignores 429 on auto-resend', async () => {
    let resendCalls = 0

    apiClient.defaults.adapter = async (config) => {
      const url = (config.url || '').split('?')[0].replace(/^\/api\/v1/, '')
      const bootstrap = mockPublicBootstrap(url, config)
      if (bootstrap) return bootstrap

      if (url === '/auth/me') {
        const err = new Error('Unauthenticated')
        err.response = {
          status: 401,
          data: { success: false, error: { code: 'UNAUTHENTICATED', message: 'Auth required' } },
          config,
        }
        err.config = config
        throw err
      }

      if (url === '/auth/login') {
        const err = new Error('Email not verified')
        err.response = {
          status: 403,
          data: {
            success: false,
            error: {
              code: 'EMAIL_NOT_VERIFIED',
              message: 'Please verify your email',
              details: { email: 'phoneuser@nursery.eg' },
            },
          },
          config,
        }
        err.config = config
        throw err
      }

      if (url === '/auth/resend-code') {
        resendCalls += 1
        const err = new Error('Too many requests')
        err.response = {
          status: 429,
          data: {
            success: false,
            error: { code: 'TOO_MANY_REQUESTS', message: 'Wait 60 seconds' },
          },
          config,
        }
        err.config = config
        throw err
      }

      return { data: { success: true, data: {} }, status: 200, headers: {}, config }
    }

    const memRouter = createMemoryRouter(router.routes, {
      initialEntries: ['/login'],
    })

    const { container } = render(
      <AppProviders>
        <RouterProvider router={memRouter} />
      </AppProviders>
    )

    await waitFor(() => {
      expect(container.querySelector('#login-identifier')).toBeTruthy()
    })

    fireEvent.change(container.querySelector('#login-identifier'), { target: { value: '01099887766' } })
    fireEvent.change(container.querySelector('#login-password'), { target: { value: 'Password123!' } })
    fireEvent.submit(container.querySelector('form'))

    await waitFor(() => {
      expect(memRouter.state.location.pathname).toBe('/verify-email')
      expect(memRouter.state.location.search).toBe('?email=phoneuser%40nursery.eg&resend=1')
    })

    await waitFor(() => {
      expect(resendCalls).toBe(1)
    })

    // 429 from auto-resend must be silently ignored (no error banner rendered)
    expect(container.textContent).not.toContain('Wait 60 seconds')
    expect(container.textContent).not.toContain('تجاوزت الحد المسموح')
    expect(container.textContent).toContain('phoneuser@nursery.eg')
  })
})
