import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const getProductId = (item) => item?.product?.cart_key || item?.product?.id
const getProductPrice = (item) => Number(item?.product?.retail_price || 0)
const getQuantity = (item) => Number(item?.quantity || 0)
const getMaxQuantity = (product) => {
  const maxFlashQty = Number(product?.flash_sale_max_order_qty || 0)
  if (product?.is_flash_sale_active && maxFlashQty > 0) return maxFlashQty
  return Infinity
}

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      selectedProductIds: [],
      appliedCoupon: null,
      addItem: (product, quantity = 1) => {
        if (!product?.id) return

        const items = get().items
        const selectedProductIds = get().selectedProductIds
        const productKey = product.cart_key || product.id
        const existing = items.find((i) => getProductId(i) === productKey)
        const nextQuantity = Number(quantity) || 1
        const maxQuantity = getMaxQuantity(product)

        if (existing) {
          set({
            items: items.map((i) =>
              getProductId(i) === productKey
                ? { ...i, product: { ...i.product, ...product }, quantity: Math.min(maxQuantity, getQuantity(i) + nextQuantity) }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { product, quantity: Math.min(maxQuantity, nextQuantity) }],
            selectedProductIds: selectedProductIds.includes(productKey)
              ? selectedProductIds
              : [...selectedProductIds, productKey],
          })
        }
      },
      removeItem: (productId) => {
        set({
          items: get().items.filter((i) => getProductId(i) !== productId),
          selectedProductIds: get().selectedProductIds.filter((id) => id !== productId),
        })
      },
      updateQuantity: (productId, quantity) => {
        const nextQuantity = Number(quantity) || 0
        const currentItem = get().items.find((i) => getProductId(i) === productId)
        const maxQuantity = getMaxQuantity(currentItem?.product)

        if (nextQuantity <= 0) {
          get().removeItem(productId)
          return
        }

        set({
          items: get().items.map((i) =>
            getProductId(i) === productId ? { ...i, quantity: Math.min(maxQuantity, nextQuantity) } : i
          ),
        })
      },
      toggleSelected: (productId) => {
        const selectedProductIds = get().selectedProductIds
        set({
          selectedProductIds: selectedProductIds.includes(productId)
            ? selectedProductIds.filter((id) => id !== productId)
            : [...selectedProductIds, productId],
        })
      },
      selectAll: () => set({ selectedProductIds: get().items.map(getProductId).filter(Boolean) }),
      clearSelection: () => set({ selectedProductIds: [] }),
      removeSelectedItems: () => {
        const selected = new Set(get().selectedProductIds)
        set({
          items: get().items.filter((item) => !selected.has(getProductId(item))),
          selectedProductIds: [],
          appliedCoupon: null,
        })
      },
      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearCoupon: () => set({ appliedCoupon: null }),
      clearCart: () => set({ items: [], selectedProductIds: [], appliedCoupon: null }),
      totalItems: () => get().items.reduce((sum, i) => sum + getQuantity(i), 0),
      subtotal: () => get().items.reduce((sum, i) => sum + getProductPrice(i) * getQuantity(i), 0),
    }),
    {
      name: 'shadow-shop-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items.filter((item) => getProductId(item) && getQuantity(item) > 0),
        selectedProductIds: state.selectedProductIds.filter((id) =>
          state.items.some((item) => getProductId(item) === id)
        ),
        appliedCoupon: state.appliedCoupon,
      }),
      version: 2,
      migrate: () => ({ items: [] }),
    }
  )
)

export default useCartStore
