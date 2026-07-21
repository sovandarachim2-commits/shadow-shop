import client from './client'

export const productsApi = {
  brands: {
    list: (params) => client.get('/products/brands/', { params }),
    get: (id) => client.get(`/products/brands/${id}/`),
    create: (data) => client.post('/products/brands/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    update: (id, data) => client.patch(`/products/brands/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    delete: (id) => client.delete(`/products/brands/${id}/`),
  },
  categories: {
    list: (params) => client.get('/products/categories/', { params }),
    tree: () => client.get('/products/categories/tree/'),
    get: (id) => client.get(`/products/categories/${id}/`),
    create: (data) => client.post('/products/categories/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    update: (id, data) => client.patch(`/products/categories/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    delete: (id) => client.delete(`/products/categories/${id}/`),
  },
  products: {
    list: (params) => client.get('/products/items/', { params }),
    get: (id) => client.get(`/products/items/${id}/`),
    create: (data) => client.post('/products/items/', data),
    update: (id, data) => client.patch(`/products/items/${id}/`, data),
    delete: (id) => client.delete(`/products/items/${id}/`),
    uploadImages: (id, data) => client.post(`/products/items/${id}/upload_images/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20000,
    }),
    setPrimaryImage: (id, imageId) => client.post(`/products/items/${id}/set_primary_image/`, { image_id: imageId }),
    deleteImage: (id, imageId) => client.delete(`/products/items/${id}/delete_image/${imageId}/`),
    searchByCode: (code) => client.get('/products/items/search_by_code/', { params: { code } }),
  },
  reviews: {
    list: (params) => client.get('/products/reviews/', { params }),
    create: (data) => client.post('/products/reviews/', data),
    update: (id, data) => client.patch(`/products/reviews/${id}/`, data),
    delete: (id) => client.delete(`/products/reviews/${id}/`),
  },
  sets: {
    list: (params) => client.get('/products/sets/', { params }),
    get: (id) => client.get(`/products/sets/${id}/`),
    create: (data) => client.post('/products/sets/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    update: (id, data) => client.patch(`/products/sets/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
    delete: (id) => client.delete(`/products/sets/${id}/`),
    setItems: (id, data) => client.post(`/products/sets/${id}/set_items/`, data),
    uploadImages: (id, data) => client.post(`/products/sets/${id}/upload_images/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 20000,
    }),
    setPrimaryImage: (id, imageId) => client.post(`/products/sets/${id}/set_primary_image/`, { image_id: imageId }),
    deleteImage: (id, imageId) => client.delete(`/products/sets/${id}/delete_image/${imageId}/`),
  },
  promotions: {
    list: () => client.get('/products/promotions/'),
    active: () => client.get('/products/promotions/active/'),
  },
  banners: {
    list: (params) => client.get('/products/banners/', { params }),
    get: (id) => client.get(`/products/banners/${id}/`),
    create: (data) => client.post('/products/banners/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, data) => client.patch(`/products/banners/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => client.delete(`/products/banners/${id}/`),
  },
  home: {
    feed: () => client.get('/products/home/'),
  },
}
