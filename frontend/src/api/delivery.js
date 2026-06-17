import client from './client'

export const deliveryApi = {
  byConfig: {
    list: (params) => client.get('/delivery/by-config/', { params }),
    get: (id) => client.get(`/delivery/by-config/${id}/`),
    create: (data) => client.post('/delivery/by-config/', data),
    update: (id, data) => client.patch(`/delivery/by-config/${id}/`, data),
    delete: (id) => client.delete(`/delivery/by-config/${id}/`),
    toggleTelegram: (id) => client.post(`/delivery/by-config/${id}/toggle_telegram/`),
    toggleStatus: (id) => client.post(`/delivery/by-config/${id}/toggle_status/`),
    testBot: (id) => client.post(`/delivery/by-config/${id}/test_bot/`),
  },
}
