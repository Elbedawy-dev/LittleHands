import apiClient from './api'

/**
 * Convert base64 dataURL to Blob for multipart upload
 */
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export const paymentService = {
  /**
   * Admin: List payments with optional query params
   */
  async getPayments(params = {}) {
    return apiClient.get('/payments/admin', { params })
  },

  /**
   * Admin: Confirm payment for an order
   */
  async confirmPayment(orderId) {
    return apiClient.post(`/payments/admin/${orderId}/confirm`)
  },

  /**
   * Admin: Reject payment for an order
   */
  async rejectPayment(orderId, { reason, notes = '', notify = true } = {}) {
    return apiClient.post(`/payments/admin/${orderId}/reject`, {
      reason,
      notes,
      notify,
    })
  },

  /**
   * Customer: Submit payment proof for an order (multipart)
   */
  async submitPayment(orderId, { senderPhone, reference = '', transferredAmount, screenshotFile, screenshotDataUrl }) {
    const formData = new FormData()
    formData.append('senderPhone', senderPhone)
    if (reference) formData.append('reference', reference)
    if (transferredAmount !== undefined && transferredAmount !== null) {
      formData.append('transferredAmount', String(transferredAmount))
    }

    if (screenshotFile instanceof File || screenshotFile instanceof Blob) {
      formData.append('screenshot', screenshotFile)
    } else if (screenshotDataUrl && typeof screenshotDataUrl === 'string' && screenshotDataUrl.startsWith('data:')) {
      const blob = dataURLtoBlob(screenshotDataUrl)
      formData.append('screenshot', blob, 'screenshot.jpg')
    }

    return apiClient.post(`/payments/orders/${orderId}/payment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * Stream authenticated payment screenshot as blob
   */
  async getScreenshotBlob(paymentId) {
    const res = await apiClient.get(`/payments/${paymentId}/screenshot`, {
      responseType: 'blob',
    })
    return res
  },
}

export default paymentService
