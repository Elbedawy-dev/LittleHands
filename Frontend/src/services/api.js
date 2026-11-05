import axios from 'axios'

// بيئة العمل ومؤشر استخدام خدمات المحاكاة
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// إرفاق رمز التوثيق إن وجد
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('lh_auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient

