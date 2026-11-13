import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { cartApi } from '@/api/orders'

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

const getUnderlyingProductId = (itemOrProduct) => {
  const p = itemOrProduct?.product || itemOrProduct
  return p?.product_id || p?.id
}

const getMaxQuantity = (product, items = [], currentLineKey = null) => {
  const limits = []
  const isAuto = product?.availability_status !== 'available'
  const currentStock = typeof product?.current_stock === 'number' ? product.current_stock : null

  if (isAuto && currentStock !== null) {
    const underlyingId = getUnderlyingProductId(product)
    const otherCartQty = (items || [])
      .filter((i) => {
        const lineKey = getProductId(i)
        if (lineKey === currentLineKey) return false
        return String(getUnderlyingProductId(i)) === String(underlyingId)
      })
      .reduce((sum, i) => sum + getQuantity(i), 0)

    limits.push(Math.max(0, currentStock - otherCartQty))
  }

  const maxFlashQty = Number(product?.flash_sale_max_order_qty || 0)
  if (product?.is_flash_sale_active && maxFlashQty > 0) {
    limits.push(maxFlashQty)
  }
  return limits.length > 0 ? Math.min(...limits) : Infinity
}

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      selectedProductIds: [],
      appliedCoupon: null,

      addItem: (product, quantity = 1) => {
        if (!product?.id) return { success: false, reason: 'invalid' }

        const items = get().items
        const selectedProductIds = get().selectedProductIds
        const productKey = product.cart_key || product.id
        const existing = items.find((i) => getProductId(i) === productKey)
        const nextQuantity = Number(quantity) || 1
        const maxQuantity = getMaxQuantity(product, items, productKey)
        const currentQty = existing ? getQuantity(existing) : 0

        if (currentQty >= maxQuantity) {
          return { success: false, reason: 'stock_limit', maxQuantity, currentQuantity: currentQty }
        }

        const targetQty = Math.min(maxQuantity, currentQty + nextQuantity)

        if (existing) {
          set({
            items: items.map((i) =>
              getProductId(i) === productKey
                ? { ...i, product: { ...i.product, ...product }, quantity: targetQty }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { product, quantity: targetQty }],
            selectedProductIds: selectedProductIds.includes(productKey)
              ? selectedProductIds
              : [...selectedProductIds, productKey],
          })
        }

        if (localStorage.getItem('access_token') && !product?.is_free_gift) {
          cartApi.setQuantity({
            cart_key: productKey,
            product_id: product.item_type === 'set' ? undefined : (product.product_id || product.id),
            product_set_id: product.item_type === 'set' ? (product.product_set_id || product.id) : undefined,
            quantity: targetQty,
          }).catch(() => {})
        }

        return { success: true, quantity: targetQty, maxQuantity }
      },

      removeItem: (productId) => {
        const currentItem = get().items.find((i) => getProductId(i) === productId)
        set({
          items: get().items.filter((i) => getProductId(i) !== productId),
          selectedProductIds: get().selectedProductIds.filter((id) => id !== productId),
        })

        if (localStorage.getItem('access_token') && !currentItem?.product?.is_free_gift) {
          cartApi.removeItem({ cart_key: productId }).catch(() => {})
        }
      },

      updateQuantity: (productId, quantity) => {
        const nextQuantity = Number(quantity) || 0
        const items = get().items
        const currentItem = items.find((i) => getProductId(i) === productId)
        const maxQuantity = getMaxQuantity(currentItem?.product, items, productId)
        const currentQty = currentItem ? getQuantity(currentItem) : 0

        if (nextQuantity <= 0) {
          get().removeItem(productId)
          return { success: true, quantity: 0 }
        }

        if (nextQuantity > maxQuantity) {
          if (currentQty < maxQuantity) {
            set({
              items: get().items.map((i) =>
                getProductId(i) === productId ? { ...i, quantity: maxQuantity } : i
              ),
            })
            if (localStorage.getItem('access_token') && !currentItem?.product?.is_free_gift) {
              cartApi.setQuantity({ cart_key: productId, quantity: maxQuantity }).catch(() => {})
            }
          }
          return { success: false, reason: 'stock_limit', maxQuantity, currentQuantity: maxQuantity }
        }

        set({
          items: get().items.map((i) =>
            getProductId(i) === productId ? { ...i, quantity: nextQuantity } : i
          ),
        })

        if (localStorage.getItem('access_token') && !currentItem?.product?.is_free_gift) {
          cartApi.setQuantity({ cart_key: productId, quantity: nextQuantity }).catch(() => {})
        }

        return { success: true, quantity: nextQuantity, maxQuantity }
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
        const removedIds = [...selected]
        set({
          items: get().items.filter((item) => !selected.has(getProductId(item))),
          selectedProductIds: [],
          appliedCoupon: null,
        })

        if (localStorage.getItem('access_token')) {
          if (get().items.length === 0) {
            cartApi.clear().catch(() => {})
          } else {
            removedIds.forEach((id) => {
              cartApi.removeItem({ cart_key: id }).catch(() => {})
            })
          }
        }
      },

      applyCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearCoupon: () => set({ appliedCoupon: null }),

      clearCart: (skipServer = false) => {
        set({ items: [], selectedProductIds: [], appliedCoupon: null })
        if (!skipServer && localStorage.getItem('access_token')) {
          cartApi.clear().catch(() => {})
        }
      },

      syncPrices: ({ products = [], sets = [] } = {}) => {
        const byProduct = new Map(products.map((product) => [product.id, product]))
        const bySet = new Map(sets.map((productSet) => [productSet.id, productSet]))
        const raised = []
        let changed = false
        const items = get().items.map((item) => {
          if (item.product?.is_free_gift) return item
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
          const maxQuantity = getMaxQuantity(product, currentItems, getProductId(item))
          return {
            ...item,
            product,
            quantity: Math.min(getQuantity(item), maxQuantity),
          }
        })
        if (changed) set({ items })
        return raised
      },

      syncWithServer: async () => {
        if (!localStorage.getItem('access_token')) return
        try {
          const localItems = (get().items || []).filter(
            (item) => getProductId(item) && getQuantity(item) > 0
          )
          const localGifts = localItems.filter((item) => item.product?.is_free_gift)
          const localPaid = localItems.filter((item) => !item.product?.is_free_gift)

          let serverItems = []
          if (localPaid.length > 0) {
            const payload = {
              items: localPaid.map((item) => ({
                cart_key: getProductId(item),
                product_id: item.product?.item_type === 'set' ? undefined : (item.product?.product_id || item.product?.id),
                product_set_id: item.product?.item_type === 'set' ? (item.product?.product_set_id || item.product?.id) : undefined,
                quantity: getQuantity(item),
              })),
            }
            const { data } = await cartApi.sync(payload)
            serverItems = Array.isArray(data) ? data : (data?.results || [])
          } else {
            const { data } = await cartApi.list()
            serverItems = Array.isArray(data) ? data : (data?.results || [])
          }

          if (serverItems && serverItems.length > 0) {
            const merged = serverItems.map((sItem) => {
              const details = sItem.product_details || {}
              return {
                product: {
                  ...details,
                  id: details.id || sItem.product || sItem.cart_key,
                  cart_key: sItem.cart_key || details.cart_key,
                  item_type: sItem.item_type || details.item_type || 'product',
                  name: sItem.product_name || details.name,
                  retail_price: Number(sItem.product_price ?? details.retail_price ?? 0),
                  primary_image: sItem.product_image || details.primary_image || details.image,
                  code: sItem.product_code || details.code,
                },
                quantity: Number(sItem.quantity || 1),
              }
            })

            // Retain local free gifts alongside server items
            const combined = [...merged, ...localGifts]
            const validKeys = combined.map(getProductId).filter(Boolean)
            const currentSelected = get().selectedProductIds
            const newSelected = currentSelected.length > 0
              ? currentSelected.filter((id) => validKeys.includes(id))
              : validKeys

            set({
              items: combined,
              selectedProductIds: newSelected,
            })
          } else if (localPaid.length === 0 && localGifts.length > 0) {
            // Retain free gifts even if server has no paid items
            const giftKeys = localGifts.map(getProductId)
            set({
              items: localGifts,
              selectedProductIds: giftKeys,
            })
          } else if (localItems.length === 0) {
            set({ items: [], selectedProductIds: [] })
          }
        } catch (error) {
          console.error('Failed to sync cart with server:', error)
        }
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
        if (saved && Array.isArray(saved.items) && saved.items.length > 0) {
          set({
            items: saved.items,
            selectedProductIds: Array.isArray(saved.selectedProductIds) ? saved.selectedProductIds : [],
            appliedCoupon: saved.appliedCoupon || null,
          })
        }
        // Always trigger server sync to get authoritative DB cart
        get().syncWithServer()
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
