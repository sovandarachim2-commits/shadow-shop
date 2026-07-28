import client from './client'

export const reportsApi = {
  sales: (params) => client.get('/reports/sales/', { params }),
  products: (params) => client.get('/reports/products/', { params }),
  inventory: (params) => client.get('/reports/inventory/', { params }),
}
