import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

const AUTH_FREE_PATHS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/email/resend-code/',
  '/auth/email/verify-code/',
  '/auth/google/config/',
  '/auth/google/login/',
  '/auth/telegram/config/',
  '/auth/telegram/login/',
  '/auth/telegram/start/',
  '/auth/telegram/status/',
  '/auth/telegram/confirm/',
  '/auth/telegram/otp-login/',
  '/auth/refresh/',
  '/auth/site-settings/',
]

const PUBLIC_GET_PREFIXES = [
  '/products/brands/',
  '/products/categories/',
  '/products/home/',
  '/products/home-sections/',
  '/products/items/',
  '/products/reviews/',
  '/products/sets/',
  '/products/promotions/',
  '/products/banners/',
]

function requestPath(config) {
  const rawUrl = config?.url || ''
  try {
    const parsed = new URL(rawUrl, window.location.origin)
    return parsed.pathname
  } catch {
    return rawUrl.split('?')[0]
  }
}

function isAuthFreeRequest(config) {
  const path = requestPath(config)
  return AUTH_FREE_PATHS.some((authPath) => path.endsWith(authPath))
}

function isPublicGetRequest(config) {
  if ((config?.method || 'get').toLowerCase() !== 'get') return false
  const path = requestPath(config)
  return PUBLIC_GET_PREFIXES.some((prefix) => path.endsWith(prefix) || path.includes(prefix))
}

async function clearAuthSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  const { default: useAuthStore } = await import('@/store/authStore')
  useAuthStore.getState().clearSession()
}

client.interceptors.request.use((config) => {
  if (isAuthFreeRequest(config) || isPublicGetRequest(config)) {
    delete config.headers.Authorization
    return config
  }

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
    if (error.response?.status === 401 && original && !original._retry && !isAuthFreeRequest(original) && !isPublicGetRequest(original)) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh)
            const { default: useAuthStore } = await import('@/store/authStore')
            useAuthStore.setState({ accessToken: data.access, refreshToken: data.refresh, isAuthenticated: true })
          }
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
