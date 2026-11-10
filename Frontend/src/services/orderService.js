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
    const res = await apiClient.get('/orders/my', { params })
    return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : []
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
    const res = await apiClient.get('/orders/seller', { params })
    return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : []
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
   * Seller: Hide an inactive order from seller's own orders list
   */
  async hideSellerOrder(orderId) {
    return apiClient.delete(`/orders/seller/${orderId}`)
  },

  /**
   * Admin: Get all orders
   */
  async getAllOrders(params = {}) {
    const res = await apiClient.get('/orders/admin', { params })
    return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : []
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
   * Admin: Permanently delete an unpaid/inactive order
   */
  async deleteOrder(id) {
    return apiClient.delete(`/orders/admin/${id}`)
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
