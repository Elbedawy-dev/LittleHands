import apiClient from './api'
import paymentService from './paymentService'

export const orderService = {
  /**
   * Customer: Create a new order
   */
  async createOrder({ items, delivery, notes = '' }) {
    const formattedItems = (items || []).map((it) => ({
      productId: it.productId || it.id,
      qty: Number(it.qty || it.quantity || 1),
      unitPrice: it.unitPrice || it.price,
      name: it.name,
      image: it.image,
      sellerId: it.sellerId,
    }))

    const formattedDelivery = {
      name: delivery.name,
      phone: delivery.phone,
      governorate: delivery.governorate,
      city: delivery.city,
      address: delivery.address,
      nurseryName: delivery.nurseryName || '',
    }

    return apiClient.post('/orders', {
      items: formattedItems,
      delivery: formattedDelivery,
      notes: notes || '',
    })
  },

  /**
   * Customer: Get my orders
   */
  async getMyOrders(params = {}) {
    return apiClient.get('/orders/my', { params })
  },

  /**
   * Get single order by ID (customer, seller or admin)
   */
  async getOrder(id) {
    return apiClient.get(`/orders/${id}`)
  },

  /**
   * Customer: Cancel an order before payment
   */
  async cancelOrder(id, { reason = '' } = {}) {
    return apiClient.post(`/orders/${id}/cancel`, { reason })
  },

  /**
   * Seller: Get seller orders
   */
  async getSellerOrders(params = {}) {
    return apiClient.get('/orders/seller', { params })
  },

  /**
   * Seller: Update fulfillment status (preparing | shipped)
   */
  async setSellerOrderStatus(orderId, newStatus) {
    return apiClient.patch(`/orders/seller/${orderId}/fulfillment`, {
      status: newStatus,
    })
  },

  /**
   * Admin: Get all orders
   */
  async getAllOrders(params = {}) {
    return apiClient.get('/orders/admin', { params })
  },

  /**
   * Admin: Get single order
   */
  async getAdminOrder(id) {
    return apiClient.get(`/orders/admin/${id}`)
  },

  /**
   * Admin: Update order status
   */
  async updateOrderStatus(id, status) {
    return apiClient.patch(`/orders/admin/${id}/status`, { status })
  },

  /**
   * Admin: Cancel an order
   */
  async adminCancelOrder(id, { reason = '' } = {}) {
    return apiClient.post(`/orders/admin/${id}/cancel`, { reason })
  },

  /**
   * Admin: Refund an order
   */
  async adminRefundOrder(id, { reference, note = '' }) {
    return apiClient.post(`/orders/admin/${id}/refund`, { reference, note })
  },

  /**
   * Submit payment proof (calls paymentService.submitPayment)
   */
  async submitPayment(orderId, payload) {
    return paymentService.submitPayment(orderId, payload)
  },

  /**
   * Reupload payment proof (calls paymentService.submitPayment)
   */
  async reuploadReceipt(orderId, payload) {
    return paymentService.submitPayment(orderId, payload)
  },
}

export default orderService
