import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      toggle: (product) => {
        const items = get().items
        const exists = items.some((i) => i.id === product.id)
        set({ items: exists ? items.filter((i) => i.id !== product.id) : [...items, product] })
      },
      isWishlisted: (productId) => get().items.some((i) => i.id === productId),
    }),
    {
      name: 'shadow-shop-wishlist',
      partialize: (state) => ({
        items: state.items.filter((product) => product?.id),
      }),
      version: 1,
      migrate: () => ({ items: [] }),
    }
  )
)

export default useWishlistStore
