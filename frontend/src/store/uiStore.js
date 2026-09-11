import { create } from 'zustand'

const useUiStore = create((set) => ({
  authModal: {
    isOpen: false,
    type: 'cart', // 'cart', 'checkout', 'coupon', 'buy_now', 'login', 'register'
  },
  openAuthModal: (type = 'cart') => set({ authModal: { isOpen: true, type } }),
  closeAuthModal: () => set((state) => ({ authModal: { ...state.authModal, isOpen: false } })),
}))

export default useUiStore
