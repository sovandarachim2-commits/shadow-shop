import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

async function clearAuthSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  const { default: useAuthStore } = await import('@/store/authStore')
  useAuthStore.getState().clearSession()
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return client(original)
        } catch {
          await clearAuthSession()
        }
      } else if (localStorage.getItem('access_token')) {
        await clearAuthSession()
      }
    }
    return Promise.reject(error)
  }
)

export default client
