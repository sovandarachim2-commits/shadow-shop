import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const CARTS_BY_USER_KEY = 'shadow-shop-carts-by-user'

const getProductId = (item) => item?.product?.cart_key || item?.product?.id
const getProductPrice = (item) => Number(item?.product?.retail_price || 0)
const getQuantity = (item) => Number(item?.quantity || 0)

function cartSnapshot(state) {
  const items = (state.items || []).filter((item) => getProductId(item) && getQuantity(item) > 0)
  return {
    items,
    selectedProductIds: (state.selectedProductIds || []).filter((id) =>
      items.some((item) => getProductId(item) === id)
    ),
    appliedCoupon: state.appliedCoupon || null,
  }
}

function readUserCarts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CARTS_BY_USER_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
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
      syncPrices: ({ products = [], sets = [] } = {}) => {
        const byProduct = new Map(products.map((product) => [product.id, product]))
        const bySet = new Map(sets.map((productSet) => [productSet.id, productSet]))
        const raised = []
        let changed = false
        const items = get().items.map((item) => {
          const isSet = item.product?.item_type === 'set'
          const live = isSet ? bySet.get(item.product?.product_set_id) : byProduct.get(item.product?.id)
          if (!live) return item
          const nextPrice = Number(isSet
            ? (live.display_price || live.discount_price || live.price || 0)
            : (live.display_price || live.retail_price || 0))
          const currentPrice = Number(item.product?.retail_price || 0)
          const nextActive = Boolean(live.is_flash_sale_active)
          const nextMax = live.flash_sale_max_order_qty ?? null
          const nextStock = Number(live.current_stock || 0)
          const samePrice = currentPrice === nextPrice
          const sameSale = Boolean(item.product?.is_flash_sale_active) === nextActive
          const sameMax = (item.product?.flash_sale_max_order_qty ?? null) === nextMax
          const sameStock = Number(item.product?.current_stock || 0) === nextStock
          if (samePrice && sameSale && sameMax && sameStock) return item
          changed = true
          if (currentPrice < nextPrice) {
            raised.push({ id: getProductId(item), name: item.product?.name, price: nextPrice })
          }
          const product = {
            ...item.product,
            retail_price: nextPrice,
            is_flash_sale_active: nextActive,
            flash_sale_max_order_qty: nextMax,
            current_stock: nextStock,
            old_price: live.old_price ?? null,
          }
          const maxQuantity = getMaxQuantity(product)
          return {
            ...item,
            product,
            quantity: Math.min(getQuantity(item), maxQuantity),
          }
        })
        if (changed) set({ items })
        return raised
      },
      saveCartForUser: (userId) => {
        if (userId == null || userId === '') return
        const carts = readUserCarts()
        carts[String(userId)] = cartSnapshot(get())
        localStorage.setItem(CARTS_BY_USER_KEY, JSON.stringify(carts))
      },
      restoreCartForUser: (userId) => {
        if (userId == null || userId === '') return
        const carts = readUserCarts()
        const key = String(userId)
        const saved = carts[key]
        if (!saved) {
          carts[key] = cartSnapshot(get())
          localStorage.setItem(CARTS_BY_USER_KEY, JSON.stringify(carts))
          return
        }
        set({
          items: Array.isArray(saved.items) ? saved.items : [],
          selectedProductIds: Array.isArray(saved.selectedProductIds) ? saved.selectedProductIds : [],
          appliedCoupon: saved.appliedCoupon || null,
        })
      },
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
