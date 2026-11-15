import axios from 'axios'
import i18n from 'i18next'

export const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api/v1'

let cachedToast = null
async function getToastClient() {
  if (cachedToast) return cachedToast
  const mod = await import('react-hot-toast')
  cachedToast = mod.default || mod
  return cachedToast
}

const MUTATION_METHODS = new Set(['post', 'patch', 'put', 'delete'])
const TOAST_DEDUP_MS = 1000
const recentMutationToasts = new Map()

export function resetMutationToastDeduper() {
  recentMutationToasts.clear()
}

const EXCLUDED_MUTATION_ROUTES = [
  /^\/auth\/(login|logout|refresh|me|register|verify-email|resend-code|forgot-password|verify-reset-code|reset-password)$/,
  /^\/notifications\/[^/]+\/read$/,
  /^\/notifications\/read-all$/,
  /^\/products\/manage\/products\/images$/,
]

export const mutationToasts = [
  // Products
  {
    method: 'post',
    pattern: /^\/products\/manage\/products$/,
    key: 'common:mutationToasts.productCreated',
  },
  {
    method: 'patch',
    pattern: /^\/products\/manage\/products\/[^/]+\/publish$/,
    getToast: ({ reqData, payload }) => ({
      key:
        (reqData?.published ?? payload?.published)
          ? 'common:mutationToasts.productPublished'
          : 'common:mutationToasts.productUnpublished',
    }),
  },
  {
    method: 'patch',
    pattern: /^\/products\/manage\/products\/[^/]+$/,
    key: 'common:mutationToasts.productUpdated',
  },
  {
    method: 'delete',
    pattern: /^\/products\/manage\/products\/[^/]+$/,
    key: 'common:mutationToasts.productDeleted',
  },

  // Orders
  {
    method: 'post',
    pattern: /^\/orders$/,
    key: 'common:mutationToasts.orderCreated',
  },
  {
    method: 'patch',
    pattern: /^\/orders\/seller\/[^/]+\/fulfillment$/,
    key: 'common:mutationToasts.sellerOrderUpdated',
  },
  {
    method: 'delete',
    pattern: /^\/orders\/seller\/[^/]+$/,
    key: 'common:mutationToasts.sellerOrderHidden',
  },
  {
    method: 'patch',
    pattern: /^\/orders\/admin\/[^/]+\/status$/,
    key: 'common:mutationToasts.orderStatusUpdated',
  },
  {
    method: 'post',
    pattern: /^\/orders\/admin\/[^/]+\/cancel$/,
    key: 'common:mutationToasts.orderCancelled',
  },
  {
    method: 'post',
    pattern: /^\/orders\/admin\/[^/]+\/refund$/,
    key: 'common:mutationToasts.orderRefunded',
  },
  {
    method: 'post',
    pattern: /^\/orders\/admin\/[^/]+\/archive$/,
    key: 'common:mutationToasts.orderArchived',
  },
  {
    method: 'post',
    pattern: /^\/orders\/admin\/[^/]+\/unarchive$/,
    key: 'common:mutationToasts.orderUnarchived',
  },
  {
    method: 'delete',
    pattern: /^\/orders\/admin\/[^/]+$/,
    key: 'common:mutationToasts.orderDeleted',
  },
  {
    method: 'post',
    pattern: /^\/orders\/[^/]+\/cancel$/,
    key: 'common:mutationToasts.orderCancelled',
  },

  // Payments
  {
    method: 'post',
    pattern: /^\/payments\/orders\/[^/]+\/payment$/,
    key: 'common:mutationToasts.paymentSubmitted',
  },
  {
    method: 'post',
    pattern: /^\/payments\/admin\/[^/]+\/confirm$/,
    key: 'common:mutationToasts.paymentConfirmed',
  },
  {
    method: 'post',
    pattern: /^\/payments\/admin\/[^/]+\/reject$/,
    key: 'common:mutationToasts.paymentRejected',
  },

  // Categories
  {
    method: 'put',
    pattern: /^\/admin\/categories\/order$/,
    key: 'common:mutationToasts.categoriesReordered',
  },
  {
    method: 'put',
    pattern: /^\/admin\/categories\/[^/]+$/,
    key: 'common:mutationToasts.categoryUpdated',
  },

  // Settings
  {
    method: 'put',
    pattern: /^\/admin\/settings\/shipping-rates$/,
    key: 'common:mutationToasts.shippingRatesUpdated',
  },
  {
    method: 'put',
    pattern: /^\/admin\/settings$/,
    key: 'common:mutationToasts.settingsUpdated',
  },

  // Sellers & Users
  {
    method: 'post',
    pattern: /^\/admin\/sellers$/,
    key: 'common:mutationToasts.sellerCreated',
  },
  {
    method: 'patch',
    pattern: /^\/admin\/users\/[^/]+\/status$/,
    getToast: ({ reqData }) => ({
      key:
        reqData?.status === 'active'
          ? 'common:mutationToasts.sellerActivated'
          : reqData?.status === 'suspended'
            ? 'common:mutationToasts.sellerSuspended'
            : 'common:mutationToasts.userStatusUpdated',
    }),
  },
  {
    method: 'delete',
    pattern: /^\/admin\/users\/[^/]+$/,
    key: 'common:mutationToasts.userDeleted',
  },
  {
    method: 'patch',
    pattern: /^\/sellers\/me\/profile$/,
    key: 'common:mutationToasts.sellerProfileUpdated',
  },

  // Payouts
  {
    method: 'post',
    pattern: /^\/admin\/payouts$/,
    key: 'common:mutationToasts.payoutRecorded',
  },

  // Custom Requests
  {
    method: 'post',
    pattern: /^\/contact\/custom-requests$/,
    key: 'common:mutationToasts.customRequestSent',
  },
  {
    method: 'patch',
    pattern: /^\/admin\/custom-requests\/[^/]+$/,
    key: 'common:mutationToasts.customRequestUpdated',
  },
  {
    method: 'delete',
    pattern: /^\/admin\/custom-requests\/[^/]+$/,
    key: 'common:mutationToasts.customRequestDeleted',
  },
  {
    method: 'post',
    pattern: /^\/sellers\/me\/custom-requests\/[^/]+\/claim$/,
    key: 'common:mutationToasts.customRequestClaimed',
  },
  {
    method: 'patch',
    pattern: /^\/sellers\/me\/custom-requests\/[^/]+\/status$/,
    key: 'common:mutationToasts.customRequestUpdated',
  },

  // Addresses
  {
    method: 'post',
    pattern: /^\/users\/me\/addresses$/,
    key: 'common:mutationToasts.addressAdded',
  },
  {
    method: 'put',
    pattern: /^\/users\/me\/addresses\/[^/]+$/,
    key: 'common:mutationToasts.addressUpdated',
  },
  {
    method: 'delete',
    pattern: /^\/users\/me\/addresses\/[^/]+$/,
    key: 'common:mutationToasts.addressDeleted',
  },

  // Favorites
  {
    method: 'post',
    pattern: /^\/users\/me\/favorites\/[^/]+$/,
    getToast: ({ payload }) => ({
      key:
        payload?.isFavorite === false
          ? 'common:mutationToasts.favoriteRemoved'
          : payload?.isFavorite === true
            ? 'common:mutationToasts.favoriteAdded'
            : 'common:mutationToasts.favoriteUpdated',
      options: { duration: 1800 },
    }),
  },

  // Profile, Password, Avatar & Notification Prefs
  {
    method: 'post',
    pattern: /^\/auth\/change-password$/,
    key: 'common:mutationToasts.passwordChanged',
  },
  {
    method: 'patch',
    pattern: /^\/users\/me\/notification-prefs$/,
    key: 'common:mutationToasts.notificationPrefsUpdated',
  },
  {
    method: 'post',
    pattern: /^\/users\/me\/avatar$/,
    key: 'common:mutationToasts.avatarUpdated',
  },
  {
    method: 'patch',
    pattern: /^\/users\/me$/,
    key: 'common:mutationToasts.profileUpdated',
  },
  {
    method: 'delete',
    pattern: /^\/users\/me$/,
    key: 'common:mutationToasts.accountDeleted',
  },

  // Notifications
  {
    method: 'delete',
    pattern: /^\/notifications\/[^/]+$/,
    key: 'common:mutationToasts.notificationDeleted',
  },
  {
    method: 'delete',
    pattern: /^\/notifications$/,
    key: 'common:mutationToasts.notificationsCleared',
  },
]

function normalizeMutationPath(rawUrl = '') {
  let clean = String(rawUrl || '').split('?')[0].split('#')[0]
  if (/^https?:\/\//i.test(clean)) {
    try {
      clean = new URL(clean).pathname
    } catch {
      // keep raw
    }
  }
  if (API_BASE_URL && /^https?:\/\//i.test(API_BASE_URL)) {
    try {
      const basePath = new URL(API_BASE_URL).pathname.replace(/\/$/, '')
      if (basePath && clean.startsWith(basePath)) clean = clean.slice(basePath.length)
    } catch {
      // ignore
    }
  }
  clean = clean.replace(/^\/api\/v1\b/i, '')
  if (!clean.startsWith('/')) clean = `/${clean}`
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1)
  return clean
}

function parseMutationBody(data) {
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  if (typeof FormData !== 'undefined' && data instanceof FormData) return null
  return typeof data === 'object' ? data : null
}

async function triggerMutationToast(response) {
  try {
    if (typeof document === 'undefined') return
    const config = response?.config
    if (!config || config.silent === true) return

    const method = (config.method || '').toLowerCase()
    if (!MUTATION_METHODS.has(method)) return

    const path = normalizeMutationPath(config.url)
    if (EXCLUDED_MUTATION_ROUTES.some((re) => re.test(path))) return

    const rule = mutationToasts.find((r) => r.method === method && r.pattern.test(path))
    if (!rule) return

    const payload =
      response.data && typeof response.data === 'object' && 'success' in response.data
        ? response.data.data
        : response.data
    const reqData = parseMutationBody(config.data)
    const resolved = typeof rule.getToast === 'function' ? rule.getToast({ payload, reqData, path }) : rule
    if (!resolved?.key) return

    const message = i18n.isInitialized ? i18n.t(resolved.key) : ''
    if (!message || message === resolved.key) return

    const now = Date.now()
    if (recentMutationToasts.size > 50) {
      for (const [k, ts] of recentMutationToasts.entries()) {
        if (now - ts > TOAST_DEDUP_MS * 5) recentMutationToasts.delete(k)
      }
    }

    const dedupKey = `${resolved.key}:${message}`
    const lastShown = recentMutationToasts.get(dedupKey) || 0
    if (now - lastShown < TOAST_DEDUP_MS) return

    recentMutationToasts.set(dedupKey, now)
    const toastClient = await getToastClient()
    toastClient?.success?.(message, { id: resolved.key, ...(resolved.options || {}) })
  } catch {
    // Non-fatal: never interrupt API response handling
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'lh-web',
  },
})

// Request interceptor: attach Accept-Language and Idempotency-Key
apiClient.interceptors.request.use((config) => {
  let currentLang = 'ar'
  try {
    if (typeof localStorage !== 'undefined') {
      currentLang = localStorage.getItem('lh_lang') || 'ar'
    }
  } catch {
    currentLang = 'ar'
  }
  config.headers['Accept-Language'] = currentLang

  // Strip any accidental Authorization header / tokens
  delete config.headers.Authorization

  // Set Idempotency-Key for order creation if not already present
  const isOrderCreate =
    config.method?.toLowerCase() === 'post' &&
    (config.url === '/orders' || config.url === 'orders' || config.url?.endsWith('/orders'))

  if (isOrderCreate && !config.headers['Idempotency-Key']) {
    const idKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `lh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    config.headers['Idempotency-Key'] = idKey
  }

  return config
})

// Single-flight token refresh with retry on cold-start / network timeout
let refreshPromise = null

async function performTokenRefresh() {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    let attempts = 0
    const maxAttempts = 3 // 1 initial attempt + 2 retries on network/cold-start

    while (attempts < maxAttempts) {
      attempts += 1
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            timeout: 10000,
            headers: {
              'X-Requested-With': 'lh-web',
              Accept: 'application/json',
            },
          }
        )
        return res
      } catch (err) {
        const status = err.response?.status
        const isNetworkOr5xx = !status || status >= 500 || err.code === 'ECONNABORTED'

        // Only retry on network, timeout, or 5xx cold start
        if (isNetworkOr5xx && attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 600 * attempts))
          continue
        }

        throw err
      }
    }
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

// Response interceptor: unwrap { success, data } and handle 401 refresh
apiClient.interceptors.response.use(
  async (response) => {
    await triggerMutationToast(response)

    // If response is a blob or non-enveloped, return raw
    if (response.config?.responseType === 'blob' || response.data instanceof Blob) {
      return response.data
    }

    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        const payload = response.data.data
          if (payload && !Array.isArray(payload) && Array.isArray(payload.items) && 'total' in payload) {
            const { items, ...pageInfo } = payload
            const list = [...items]
            Object.assign(list, pageInfo)
            if (response.data.meta) list.meta = response.data.meta
            Object.defineProperty(list, 'items', { value: list, enumerable: false })
            return list
          }
      // If meta is present (e.g. pagination or payment counts), attach it to data object if object
      if (response.data.meta && response.data.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
        return {
          ...response.data.data,
          meta: response.data.meta,
          _raw: response.data,
        }
      }
      return response.data.data !== undefined ? response.data.data : response.data
    }

    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    // Format error message via i18n errors namespace
    const errorCode = error.response?.data?.error?.code
    const backendMessage = error.response?.data?.error?.message
    if (errorCode) {
      const translated = i18n.t(`errors:${errorCode}`, {
        defaultValue: backendMessage || i18n.t('errors:DEFAULT'),
      })
      error.friendlyMessage = translated
      error.code = errorCode
      error.message = translated
    } else if (backendMessage) {
      error.friendlyMessage = backendMessage
      error.message = backendMessage
    }

    // 401 Silent Token Refresh with single-flight mutex
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Do not attempt refresh on auth endpoints to prevent loops
      const url = originalRequest.url || ''
      if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register')) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        await performTokenRefresh()
        return apiClient(originalRequest)
      } catch (refreshErr) {
        const status = refreshErr.response?.status
        // Strictly only logout on confirmed 401 or 403 (never on cold-start/network/5xx)
        if (status === 401 || status === 403) {
          window.dispatchEvent(new CustomEvent('lh:auth:logout'))
        }
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
