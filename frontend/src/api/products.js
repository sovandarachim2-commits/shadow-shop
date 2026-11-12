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
      timeout: 90000,
    }),
    setPrimaryImage: (id, imageId) => client.post(`/products/items/${id}/set_primary_image/`, { image_id: imageId }),
    reorderImages: (id, imageIds) => client.post(`/products/items/${id}/reorder_images/`, { image_ids: imageIds }),
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
      timeout: 90000,
    }),
    setPrimaryImage: (id, imageId) => client.post(`/products/sets/${id}/set_primary_image/`, { image_id: imageId }),
    reorderImages: (id, imageIds) => client.post(`/products/sets/${id}/reorder_images/`, { image_ids: imageIds }),
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
  announcements: {
    list: (params) => client.get('/products/announcements/', { params }),
    get: (id) => client.get(`/products/announcements/${id}/`),
    create: (data) => client.post('/products/announcements/', data),
    update: (id, data) => client.patch(`/products/announcements/${id}/`, data),
    delete: (id) => client.delete(`/products/announcements/${id}/`),
    publish: (id) => client.post(`/products/announcements/${id}/publish/`),
    unpublish: (id) => client.post(`/products/announcements/${id}/unpublish/`),
    toggleActive: (id, is_active) => client.post(`/products/announcements/${id}/toggle-active/`, { is_active }),
    duplicate: (id) => client.post(`/products/announcements/${id}/duplicate/`),
    reorder: (ordered_ids) => client.post('/products/announcements/reorder/', { ordered_ids }),
    translate: (data) => client.post('/products/announcements/translate/', data),
    public: (params) => client.get('/products/announcements/public/', { params }),
  },
  offerPosters: {
    list: (params) => client.get('/products/offer-posters/', { params }),
    get: (id) => client.get(`/products/offer-posters/${id}/`),
    create: (data, config = {}) => client.post('/products/offer-posters/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      ...config,
    }),
    update: (id, data, config = {}) => client.patch(`/products/offer-posters/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      ...config,
    }),
    delete: (id) => client.delete(`/products/offer-posters/${id}/`),
    publish: (id) => client.post(`/products/offer-posters/${id}/publish/`),
    pause: (id) => client.post(`/products/offer-posters/${id}/pause/`),
    approve: (id) => client.post(`/products/offer-posters/${id}/approve/`),
    reject: (id, reason = '') => client.post(`/products/offer-posters/${id}/reject/`, { reason }),
    public: (params) => client.get('/products/offer-posters/public/', { params }),
  },
  videoHighlights: {
    list: (params) => client.get('/products/video-highlights/', { params }),
    get: (id) => client.get(`/products/video-highlights/${id}/`),
    create: (data, config = {}) => client.post('/products/video-highlights/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      ...config,
    }),
    update: (id, data, config = {}) => client.patch(`/products/video-highlights/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      ...config,
    }),
    delete: (id) => client.delete(`/products/video-highlights/${id}/`),
    publish: (id) => client.post(`/products/video-highlights/${id}/publish/`),
    unpublish: (id) => client.post(`/products/video-highlights/${id}/unpublish/`),
    public: (params) => client.get('/products/video-highlights/public/', { params }),
  },
  home: {
    feed: () => client.get('/products/home/'),
  },
  flashSale: {
    set: (type, id, data) => client.post(`/products/${type === 'set' ? 'sets' : 'items'}/${id}/flash-sale/`, data, { forceAuth: true }),
    remove: (type, id) => client.delete(`/products/${type === 'set' ? 'sets' : 'items'}/${id}/flash-sale/`, { forceAuth: true }),
  },
  revision: () => client.get('/products/revision/'),
}
