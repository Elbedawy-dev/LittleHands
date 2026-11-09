import axios from 'axios'
import i18n from '../config/i18n.js'

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

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
  const currentLang = i18n.language || localStorage.getItem('lh_lang') || 'ar'
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

// Silent refresh queue state
let isRefreshing = false
let failedQueue = []

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

// Response interceptor: unwrap { success, data } and handle 401 refresh
apiClient.interceptors.response.use(
  (response) => {
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

    // 401 Silent Token Refresh Queue
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Do not attempt refresh on auth endpoints to prevent loops
      const url = originalRequest.url || ''
      if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register')) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'X-Requested-With': 'lh-web',
              Accept: 'application/json',
            },
          }
        )

        isRefreshing = false
        processQueue(null)
        return apiClient(originalRequest)
      } catch (refreshErr) {
        isRefreshing = false
        processQueue(refreshErr)
        window.dispatchEvent(new CustomEvent('lh:auth:logout'))
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
