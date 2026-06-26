import client from './client'

export const ordersApi = {
  customers: {
    list: (params) => client.get('/orders/customers/', { params }),
    get: (id) => client.get(`/orders/customers/${id}/`),
    create: (data) => client.post('/orders/customers/', data),
    update: (id, data) => client.patch(`/orders/customers/${id}/`, data),
  },
  orders: {
    list: (params) => client.get('/orders/list/', { params }),
    get: (id) => client.get(`/orders/list/${id}/`),
    create: (data) => client.post('/orders/list/', data),
    update: (id, data) => client.patch(`/orders/list/${id}/`, data),
    adminUpdate: (id, data) => client.post(`/orders/list/${id}/admin_update/`, data),
    delete: (id) => client.delete(`/orders/list/${id}/`),
    updateStatus: (id, data) => client.post(
      `/orders/list/${id}/update_status/`,
      data,
      data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    ),
    markPaid: (id, data) => client.post(`/orders/list/${id}/mark_paid/`, data),
    validatePrintStock: (orderIds) => client.post('/orders/list/validate_print_stock/', { order_ids: orderIds }),
    generateQr: (id) => client.get(`/orders/list/${id}/generate_qr/`),
    today: () => client.get('/orders/list/today/'),
    kanban: () => client.get('/orders/list/kanban/'),
    operationSummary: () => client.get('/orders/list/operation_summary/'),
    checkout: (data) => client.post('/orders/list/checkout/', data),
  },
  prepareRecords: {
    list: (params) => client.get('/orders/prepare-records/', { params }),
    create: (data) => client.post('/orders/prepare-records/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    delete: (id) => client.delete(`/orders/prepare-records/${id}/`),
  },
  outRecords: {
    list: (params) => client.get('/orders/out-records/', { params }),
    create: (data) => client.post('/orders/out-records/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    delete: (id) => client.delete(`/orders/out-records/${id}/`),
  },
  cart: {
    list: () => client.get('/orders/cart/'),
    add: (data) => client.post('/orders/cart/', data),
    update: (id, data) => client.patch(`/orders/cart/${id}/`, data),
    remove: (id) => client.delete(`/orders/cart/${id}/`),
    clear: () => client.delete('/orders/cart/clear/'),
    summary: () => client.get('/orders/cart/summary/'),
  },
  wishlist: {
    list: () => client.get('/orders/wishlist/'),
    add: (data) => client.post('/orders/wishlist/', data),
    remove: (id) => client.delete(`/orders/wishlist/${id}/`),
    clear: () => client.delete('/orders/wishlist/clear/'),
  },
  rewards: {
    summary: () => client.get('/orders/rewards/'),
    exchange: (rewardItemId) => client.post('/orders/rewards/exchange/', { reward_item: rewardItemId }),
  },
  adminRewards: {
    items: {
      list: (params) => client.get('/orders/admin/reward-items/', { params }),
      get: (id) => client.get(`/orders/admin/reward-items/${id}/`),
      create: (data) => client.post('/orders/admin/reward-items/', data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      }),
      update: (id, data) => client.patch(`/orders/admin/reward-items/${id}/`, data, {
        headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      }),
      delete: (id) => client.delete(`/orders/admin/reward-items/${id}/`),
      toggleActive: (id) => client.post(`/orders/admin/reward-items/${id}/toggle_active/`),
    },
    redemptions: {
      list: (params) => client.get('/orders/admin/reward-redemptions/', { params }),
      updateStatus: (id, status) => client.post(`/orders/admin/reward-redemptions/${id}/update_status/`, { status }),
    },
    points: {
      list: (params) => client.get('/orders/admin/reward-points/', { params }),
      adjust: (data) => client.post('/orders/admin/reward-points/adjust/', data),
    },
    transactions: {
      list: (params) => client.get('/orders/admin/reward-transactions/', { params }),
    },
  },
  payments: {
    generateBakong: (orderId) => client.post('/payments/bakong/generate/', { order: orderId }),
    checkBakong: (paymentId) => client.post(`/payments/bakong/${paymentId}/check/`),
    generateAba: (orderId) => client.post('/payments/aba/generate/', { order: orderId }),
  },
}
