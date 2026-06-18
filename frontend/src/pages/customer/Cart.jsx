import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, ChevronLeft } from 'lucide-react'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { formatCurrency } from '@/utils/helpers'
import { EmptyState, ProductThumb } from '@/components/customer/CustomerUi'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

const DEFAULT_PROVINCE_FEES = {
  phnom_penh: 3, siem_reap: 6, battambang: 6,
  kampong_cham: 5, kandal: 4, takeo: 4, other: 8,
}

const getCartKey = (item) => item.product.cart_key || item.product.id

function getDefaultDeliveryFee(siteSettings) {
  const fees = (siteSettings?.delivery_fees && Object.keys(siteSettings.delivery_fees).length > 0)
    ? siteSettings.delivery_fees
    : DEFAULT_PROVINCE_FEES
  const rows = Object.entries(fees)
    .map(([, config]) => {
      const isObjectConfig = config && typeof config === 'object'
      return {
        fee: parseFloat(isObjectConfig ? config.fee : config) || 0,
        enabled: isObjectConfig ? config.enabled !== false : true,
        is_default: isObjectConfig ? config.is_default === true : false,
      }
    })
    .filter((row) => row.enabled)
  return (rows.find((row) => row.is_default) || rows[0])?.fee || 0
}

export default function Cart() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { items, selectedProductIds, updateQuantity, removeItem, clearCart, toggleSelected, selectAll, clearSelection } = useCartStore()
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
  })
  const selectedItems = items.filter((item) => selectedProductIds.includes(getCartKey(item)))
  const selectedCount = selectedItems.length
  const allSelected = items.length > 0 && selectedCount === items.length
  const subtotal = selectedItems.reduce((sum, i) => sum + i.product.retail_price * i.quantity, 0)
  const deliveryFee = selectedItems.length > 0 ? getDefaultDeliveryFee(siteSettings) : 0
  const total = subtotal + deliveryFee

  useEffect(() => {
    if (items.length > 0 && selectedProductIds.length === 0) {
      selectAll()
    }
  }, [])

  const goCheckout = () => {
    if (selectedCount <= 0) return
    if (!isAuthenticated) {
      toast.error(t('cart.loginBeforeCheckout'))
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    navigate('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[calc(100svh-9rem)] items-center justify-center py-6 md:min-h-[520px]">
        <div className="w-full max-w-xl">
          <EmptyState
            icon={ShoppingCart}
            title={t('cart.empty')}
            description={t('cart.emptyText')}
            action={
              <button onClick={() => navigate('/shop')} className="shop-btn-primary mt-6 px-8">
                {t('common.browseProducts')}
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white pb-32 md:pb-0">
      <div className="-mx-4 -mt-4 mb-3 grid min-h-[64px] grid-cols-[44px_1fr_44px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:mx-0 md:mt-0 md:flex md:min-h-0 md:justify-between md:border-0 md:px-0 md:pb-0 md:pt-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/shop')} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95 md:hidden">
            <ChevronLeft size={22} />
          </button>
          <h1 className="hidden text-xl font-black text-gray-950 md:block md:text-2xl">{t('cart.title')} ({items.length})</h1>
        </div>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950 md:hidden">{t('cart.title')} ({items.length})</h1>
        <button onClick={clearCart} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-400 active:scale-95 hover:text-red-500 md:hidden">
          <Trash2 size={21} />
        </button>
        <button onClick={clearCart} className="hidden text-sm font-bold text-red-500 hover:text-red-600 md:inline">{t('cart.clearAll')}</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white md:space-y-4 md:overflow-visible md:border-0">
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-3 py-3 md:rounded-2xl md:border md:bg-gray-50 md:px-4">
            <label className="flex items-center gap-3 text-sm font-black text-gray-700">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => allSelected ? clearSelection() : selectAll()}
                className="h-5 w-5 accent-pink-600 md:h-5 md:w-5"
              />
              {t('cart.selectAllProducts')}
            </label>
            <span className="text-xs font-bold text-gray-400">{selectedCount} {t('cart.selected')}</span>
          </div>
          {items.map((item) => {
            const cartKey = getCartKey(item)
            return (
            <article key={cartKey} className="border-b border-gray-100 bg-white p-3 transition last:border-b-0 hover:bg-gray-50 md:rounded-3xl md:border md:p-4 md:shadow-card md:hover:shadow-soft">
              <div className="grid grid-cols-[24px_82px_1fr] gap-3 md:flex md:gap-4">
                <label className="pt-6 md:pt-8">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(cartKey)}
                    onChange={() => toggleSelected(cartKey)}
                    className="h-5 w-5 accent-pink-600"
                  />
                </label>
                <ProductThumb product={item.product} size="lg" className="h-20 w-20 shrink-0 rounded-xl md:h-24 md:w-24" />
                <div className="min-w-0 flex-1">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm font-black leading-tight text-gray-950 md:text-base">{item.product.name}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">{item.product.item_type === 'set' ? 'Product Set' : item.product.category_name || item.product.code || t('product.cosmetics')}</p>
                    </div>
                    <button onClick={() => removeItem(cartKey)} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 md:flex">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3 md:mt-5 md:flex-col md:items-stretch lg:flex-row lg:items-center">
                    <div>
                      <p className="text-lg font-black text-pink-600 md:text-xl">{formatCurrency(item.product.retail_price * item.quantity)}</p>
                      <p className="text-xs font-semibold text-gray-400">{formatCurrency(item.product.retail_price)} {t('cart.each')}</p>
                    </div>
                    <div className="flex w-fit items-center gap-1 rounded-full bg-gray-50 p-1 md:gap-2 md:rounded-2xl">
                      <button onClick={() => updateQuantity(cartKey, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 text-white md:hidden">
                        <Minus size={18} />
                      </button>
                      <button onClick={() => updateQuantity(cartKey, item.quantity - 1)} className="hidden h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm md:flex">
                        <Minus size={14} />
                      </button>
                      <span className="min-w-9 text-center text-sm font-black text-gray-700">{item.quantity}</span>
                      <button onClick={() => updateQuantity(cartKey, item.quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white shadow-sm md:h-9 md:w-9">
                        <Plus size={20} className="md:h-4 md:w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )})}
        </section>

        <aside className="hidden h-fit rounded-3xl border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-5 shadow-soft md:block lg:sticky lg:top-36">
          <h2 className="text-xl font-black text-gray-950">{t('cart.orderSummary')}</h2>
          <p className="mt-1 text-sm font-semibold text-gray-400">{t('cart.selectedForCheckout', { count: selectedCount })}</p>
          <div className="mt-5 space-y-3 border-b border-pink-100 pb-5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-500">{t('cart.subtotal')}</span>
              <span className="font-black text-gray-950">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-500">{t('cart.deliveryFee')}</span>
              <span className="font-black text-gray-950">{formatCurrency(deliveryFee)}</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-base font-black text-gray-950">{t('cart.total')}</span>
            <span className="text-2xl font-black text-pink-600">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={goCheckout}
            disabled={selectedCount === 0}
            className="shop-btn-primary mt-6 w-full py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('cart.proceedToCheckout')} <ArrowRight size={18} />
          </button>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] md:hidden">
        <label className="mb-3 flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => allSelected ? clearSelection() : selectAll()}
            className="h-5 w-5 accent-pink-600"
          />
          <span className="text-sm font-bold text-gray-800">{t('cart.selectAll')}</span>
          <span className="text-xs font-semibold text-gray-400">({selectedCount} {t('cart.selected')})</span>
        </label>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400">{t('cart.total')}</p>
            <p className="text-2xl font-black leading-tight text-gray-950">{formatCurrency(total)}</p>
          </div>
          <button
            onClick={goCheckout}
            disabled={selectedCount === 0}
            className="shrink-0 rounded-full bg-pink-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-200 disabled:opacity-60"
          >
            {t('cart.checkout')} ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  )
}
