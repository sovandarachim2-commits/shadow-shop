import client from './client'

export const storesApi = {
  // Public
  submitInquiry: (data) => client.post('/stores/inquiries/submit/', data),
  getPublicStores: (params) => client.get('/stores/public/list/', { params }),
  getPublicStoreDetail: (slug) => client.get(`/stores/public/${slug}/`),

  // Admin Management
  admin: {
    getSummary: () => client.get('/stores/admin/stores/summary/'),
    getStores: (params) => client.get('/stores/admin/stores/', { params }),
    listStores: (params) => client.get('/stores/admin/stores/', { params }),
    getMyStore: () => client.get('/stores/admin/stores/my-store/'),
    updateMyStore: (data) => client.patch('/stores/admin/stores/my-store/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    getStore: (id) => client.get(`/stores/admin/stores/${id}/`),
    createStore: (data) => client.post('/stores/admin/stores/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    updateStore: (id, data) => client.patch(`/stores/admin/stores/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    deleteStore: (id) => client.delete(`/stores/admin/stores/${id}/`),
    approveNameChange: (id) => client.post(`/stores/admin/stores/${id}/approve-name-change/`),
    rejectNameChange: (id, reason) => client.post(`/stores/admin/stores/${id}/reject-name-change/`, { reason }),

    // Inquiries
    getInquiries: (params) => client.get('/stores/admin/inquiries/', { params }),
    updateInquiry: (id, data) => client.patch(`/stores/admin/inquiries/${id}/`, data),

    // Contracts
    getContracts: (params) => client.get('/stores/admin/contracts/', { params }),
    createContract: (data) => client.post('/stores/admin/contracts/', data),
    updateContract: (id, data) => client.patch(`/stores/admin/contracts/${id}/`, data),

    // Staff Memberships
    getMemberships: (params) => client.get('/stores/admin/memberships/', { params }),
    assignMember: (data) => client.post('/stores/admin/memberships/', data),
    createUserAndAssign: (data) => client.post('/stores/admin/memberships/create-user-and-assign/', data),
    updateMember: (id, data) => client.patch(`/stores/admin/memberships/${id}/`, data),
    removeMember: (id) => client.delete(`/stores/admin/memberships/${id}/`),

    // Payouts
    getPayouts: (params) => client.get('/stores/admin/payouts/', { params }),
    markPayoutSettled: (id, data) => client.post(`/stores/admin/payouts/${id}/mark_settled/`, data),
  },
}

export default storesApi
