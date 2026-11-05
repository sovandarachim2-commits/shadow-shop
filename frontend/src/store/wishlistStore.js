import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { wishlistApi } from '@/api/orders'

export function getWishlistProductId(item) {
  if (!item) return null
  return item.product?.id || item.product || item.id || null
}

export function normalizeWishlistItem(entry) {
  if (!entry) return null
  const productId = Number(getWishlistProductId(entry))
  if (!productId) return null

  // If entry is directly from backend WishlistSerializer
  const name = entry.product_name || entry.name || ''
  const retailPrice = Number(entry.product_price ?? entry.retail_price ?? entry.price ?? 0)
  const image = entry.product_image || entry.primary_image || entry.image_url || entry.image || entry.images?.[0]?.image || null

  return {
    id: productId,
    wishlist_id: entry.wishlist_id || (entry.product ? entry.id : undefined),
    name,
    retail_price: retailPrice,
    price: retailPrice,
    primary_image: image,
    image_url: image,
    category_name: entry.category_name || '',
    stock_quantity: entry.stock_quantity ?? entry.current_stock ?? 0,
    is_in_stock: entry.is_in_stock ?? true,
    slug: entry.slug || '',
    item_type: entry.item_type || 'product',
  }
}

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      syncing: false,

      isWishlisted: (productId) => {
        if (!productId) return false
        const targetId = Number(productId)
        return get().items.some((i) => Number(getWishlistProductId(i)) === targetId)
      },

      toggle: async (rawProduct) => {
        if (!rawProduct) return false
        const product = normalizeWishlistItem(rawProduct)
        if (!product?.id) return false

        const targetId = product.id
        const currentItems = get().items
        const exists = currentItems.some((i) => Number(getWishlistProductId(i)) === targetId)

        const nextItems = exists
          ? currentItems.filter((i) => Number(getWishlistProductId(i)) !== targetId)
          : [...currentItems, product]

        set({ items: nextItems })

        const token = localStorage.getItem('access_token')
        if (token) {
          try {
            await wishlistApi.toggle({ product: targetId })
          } catch (err) {
            console.error('Failed to sync wishlist toggle to server:', err)
          }
        }

        return !exists
      },

      remove: async (rawProductOrId) => {
        const targetId = typeof rawProductOrId === 'object'
          ? Number(getWishlistProductId(rawProductOrId))
          : Number(rawProductOrId)
        if (!targetId) return

        const currentItems = get().items
        set({
          items: currentItems.filter((i) => Number(getWishlistProductId(i)) !== targetId),
        })

        const token = localStorage.getItem('access_token')
        if (token) {
          try {
            await wishlistApi.removeProduct(targetId)
          } catch (err) {
            console.error('Failed to remove wishlist item from server:', err)
          }
        }
      },

      clearWishlist: async () => {
        set({ items: [] })
        const token = localStorage.getItem('access_token')
        if (token) {
          try {
            await wishlistApi.clear()
          } catch (err) {
            console.error('Failed to clear wishlist on server:', err)
          }
        }
      },

      syncWithServer: async () => {
        const token = localStorage.getItem('access_token')
        if (!token || get().syncing) return

        set({ syncing: true })
        try {
          const res = await wishlistApi.list()
          const rawServerList = res.data?.results || res.data || []
          const serverItems = rawServerList.map(normalizeWishlistItem).filter(Boolean)

          const localItems = get().items.map(normalizeWishlistItem).filter(Boolean)
          const mergedMap = new Map()

          // Add server items to merged map
          serverItems.forEach((item) => {
            mergedMap.set(item.id, item)
          })

          // For any local item not in server, sync to server
          for (const item of localItems) {
            if (!mergedMap.has(item.id)) {
              mergedMap.set(item.id, item)
              try {
                await wishlistApi.add({ product: item.id })
              } catch {
                // Ignore duplicate or error
              }
            }
          }

          set({
            items: Array.from(mergedMap.values()),
            syncing: false,
          })
        } catch (error) {
          console.error('Failed to sync wishlist with server:', error)
          set({ syncing: false })
        }
      },
    }),
    {
      name: 'shadow-shop-wishlist',
      partialize: (state) => ({
        items: state.items.map(normalizeWishlistItem).filter(Boolean),
      }),
      version: 2,
      migrate: (persistedState) => ({
        items: Array.isArray(persistedState?.items)
          ? persistedState.items.map(normalizeWishlistItem).filter(Boolean)
          : [],
      }),
    }
  )
)

export default useWishlistStore
