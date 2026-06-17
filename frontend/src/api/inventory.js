import client from './client'

export const inventoryApi = {
  stock: {
    list: (params) => client.get('/inventory/stock/', { params }),
    dashboard: () => client.get('/inventory/stock/dashboard/'),
    lowStock: () => client.get('/inventory/stock/low_stock/'),
    outOfStock: () => client.get('/inventory/stock/out_of_stock/'),
    adjust: (id, data) => client.post(`/inventory/stock/${id}/adjust/`, data),
  },
  movements: {
    list: (params) => client.get('/inventory/movements/', { params }),
    create: (data) => client.post('/inventory/movements/', data),
  },
  transfers: {
    list: (params) => client.get('/inventory/transfers/', { params }),
    get: (id) => client.get(`/inventory/transfers/${id}/`),
    create: (data) => client.post('/inventory/transfers/', data),
    update: (id, data) => client.patch(`/inventory/transfers/${id}/`, data),
    delete: (id) => client.delete(`/inventory/transfers/${id}/`),
    complete: (id) => client.post(`/inventory/transfers/${id}/complete/`),
    cancel: (id) => client.post(`/inventory/transfers/${id}/cancel/`),
  },
  warehouses: {
    list: (params) => client.get('/inventory/warehouses/', { params }),
  },
}
