import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '@/api/auth'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      pendingWelcomeBonus: null,

      login: async (credentials) => {
        const { data } = await authApi.login(credentials)
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        set({
          user: data.user,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
        return data.user
      },

      register: async (payload) => {
        const { data } = await authApi.register(payload)
        return data
      },

      verifyEmailCode: async (payload) => {
        const { data } = await authApi.verifyEmailCode(payload)
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        set({
          user: data.user,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
        return data
      },

      googleLogin: async (payload) => {
        const { data } = await authApi.googleLogin(payload)
        if (!data?.access || !data?.refresh || !data?.user) {
          throw new Error('Google login returned incomplete data')
        }
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        
        set({
          user: data.user,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
        return data.user
      },

      telegramLogin: async (payload) => {
        const { data } = await authApi.telegramLogin(payload)
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        
        set({
          user: data.user,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
        return data.user
      },

      telegramOtpLogin: async (payload) => {
        const { data } = await authApi.telegramOtpLogin(payload)
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        set({
          user: data.user,
          accessToken: data.access,
          refreshToken: data.refresh,
          isAuthenticated: true,
        })
        return data.user
      },

      logout: async () => {
        const refresh = get().refreshToken || localStorage.getItem('refresh_token')
        try {
          if (refresh) await authApi.logout(refresh)
        } catch {}
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        // Clear persisted credentials before reloading to discard account query caches.
        const destination = '/'
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, pendingWelcomeBonus: null })
        window.location.replace(destination)
      },

      clearSession: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      updateUser: (userData) => set({ user: { ...get().user, ...userData } }),

      setPendingWelcomeBonus: (points) => set({ pendingWelcomeBonus: points }),
      clearPendingWelcomeBonus: () => set({ pendingWelcomeBonus: null }),

      fetchMe: async () => {
        try {
          const { data } = await authApi.me()
          set({ user: data, isAuthenticated: true })
          return data
        } catch {
          get().clearSession()
        }
      },
    }),
    {
      name: 'shadow-shop-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      version: 1,
      migrate: () => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      }),
    }
  )
)

export default useAuthStore
