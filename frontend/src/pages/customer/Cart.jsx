import { useEffect, useMemo, useState, startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingCart, ArrowRight, ChevronLeft, Gift, Loader2, Percent, Ticket, TicketPercent, Truck, X } from 'lucide-react'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
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

function getCouponDiscount(coupon, subtotal, deliveryFee) {
  if (!coupon) return 0
  if (coupon.reward_type === 'free_delivery' || coupon.discount_type === 'free_delivery') return Math.min(deliveryFee, subtotal + deliveryFee)
  const value = Number(coupon.coupon_value || 0)
  const applyTo = coupon.apply_to || 'products'
  const base = applyTo === 'delivery' ? deliveryFee : applyTo === 'order' ? subtotal + deliveryFee : subtotal
  let discount = coupon.discount_type === 'percent' ? base * value / 100 : value
  if (coupon.max_discount_amount) discount = Math.min(discount, Number(coupon.max_discount_amount))
  return Math.min(Math.max(discount, 0), subtotal + deliveryFee)
}

function isCouponExpired(coupon) {
  return coupon.ends_at && new Date(coupon.ends_at).getTime() < Date.now()
}

function canUseCoupon(coupon) {
  return coupon?.coupon_code && coupon.status !== 'used' && !isCouponExpired(coupon)
}

function couponVisual(coupon, t) {
  if (coupon.reward_type === 'free_delivery') return { icon: Truck, label: t('rewardsPage.coupons.freeShip'), tone: 'bg-sky-50 text-sky-600' }
  if (coupon.reward_type === 'manual') return { icon: Gift, label: t('rewardsPage.coupons.gift'), tone: 'bg-violet-50 text-violet-600' }
  if (coupon.coupon_discount_type === 'percent') return { icon: Percent, label: `${Number(coupon.coupon_value || 0)}%`, tone: 'bg-pink-50 text-pink-600' }
  return { icon: Ticket, label: `$${Number(coupon.coupon_value || 0).toFixed(0)}`, tone: 'bg-pink-50 text-pink-600' }
}

export default function Cart() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const {
    items, selectedProductIds, appliedCoupon, updateQuantity, removeItem,
    selectAll, applyCoupon, clearCoupon,
  } = useCartStore()
  const [promoCode, setPromoCode] = useState(appliedCoupon?.coupon_code || '')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [showCoupons, setShowCoupons] = useState(false)
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
  })
  const { data: addresses = [], isLoading: addressesLoading, isError: addressesError } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => authApi.addresses.list().then((r) => r.data.results ?? r.data),
    enabled: isAuthenticated,
  })
  const { data: rewardsSummary, isLoading: couponsLoading, isError: couponsError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
    enabled: isAuthenticated && showCoupons,
  })
  const selectedItems = items
  const selectedCount = selectedItems.length
  const subtotal = selectedItems.reduce((sum, i) => sum + i.product.retail_price * i.quantity, 0)
  const deliveryFee = selectedItems.length > 0 ? getDefaultDeliveryFee(siteSettings) : 0
  const discount = getCouponDiscount(appliedCoupon, subtotal, deliveryFee)
  const total = subtotal + deliveryFee - discount
  const coupons = useMemo(
    () => (rewardsSummary?.redemptions || []).filter((item) => item.coupon_code),
    [rewardsSummary?.redemptions]
  )
  const activeCoupons = useMemo(() => coupons.filter(canUseCoupon), [coupons])

  useEffect(() => {
    if (items.length > 0 && selectedProductIds.length !== items.length) {
      selectAll()
    }
  }, [items.length, selectedProductIds.length, selectAll])

  useEffect(() => {
    setPromoCode(appliedCoupon?.coupon_code || '')
  }, [appliedCoupon?.coupon_code])

  const goCheckout = () => {
    if (selectedCount <= 0) return
    if (!isAuthenticated) {
      toast.error(t('cart.loginBeforeCheckout'))
      navigate('/login', { state: { from: '/cart' } })
      return
    }
    if (addressesLoading) {
      toast.error(t('checkout.pleaseWait'))
      return
    }
    if (!addressesError && addresses.length === 0) {
      toast.error(t('checkout.addAddressFirst'), { id: 'add-delivery-address-first', duration: 1800 })
      navigate('/address-book', { state: { from: '/cart' } })
      return
    }
    startTransition(() => navigate('/checkout'))
  }

  const openMyCoupons = () => {
    if (!isAuthenticated) {
      toast.error(t('cart.loginForCoupon'))
      navigate('/login', { state: { from: '/cart' } })
      return
    }
    if (selectedCount <= 0) {
      toast.error(t('cart.selectProductFirst'))
      return
    }
    setShowCoupons(true)
  }

  const handleApplyPromo = async (event) => {
    event.preventDefault()
    if (!promoCode.trim()) {
      toast.error(t('cart.enterPromoCode'))
      return
    }
    if (!isAuthenticated) {
      toast.error(t('cart.loginForCoupon'))
      navigate('/login', { state: { from: '/cart' } })
      return
    }
    if (selectedCount <= 0) {
      toast.error(t('cart.selectProductFirst'))
      return
    }

    setApplyingPromo(true)
    try {
      const { data } = await ordersApi.rewards.validateCoupon({
        coupon_code: promoCode.trim(),
        subtotal,
        delivery_fee: deliveryFee,
      })
      applyCoupon(data)
      setPromoCode(data.coupon_code)
      toast.success(t('rewardsPage.toast.couponApplied', { code: data.coupon_code }))
    } catch (error) {
      clearCoupon()
      toast.error(error?.response?.data?.detail || t('cart.promoApplyFailed'))
    } finally {
      setApplyingPromo(false)
    }
  }

  const handleApplySavedCoupon = async (coupon) => {
    setApplyingPromo(true)
    try {
      const { data } = await ordersApi.rewards.validateCoupon({
        coupon_code: coupon.coupon_code,
        subtotal,
        delivery_fee: deliveryFee,
      })
      applyCoupon(data)
      setShowCoupons(false)
      toast.success(t('rewardsPage.toast.couponApplied', { code: data.coupon_code }))
    } catch (error) {
      toast.error(error?.response?.data?.detail || t('cart.promoApplyFailed'))
    } finally {
      setApplyingPromo(false)
    }
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
    <div className="-mx-4 -mt-4 min-h-[calc(100svh-5rem)] bg-slate-100 px-4 pb-28 pt-4 md:mx-0 md:mt-0 md:min-h-0 md:rounded-[2rem] md:p-6 lg:pb-6">
      <div className="sticky top-0 z-30 -mx-4 mb-4 grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center bg-slate-100/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur md:static md:mx-0 md:mb-5 md:block md:min-h-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/shop')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm active:scale-95 md:hidden">
            <ChevronLeft size={22} />
          </button>
          <h1 className="hidden text-xl font-black tracking-tight text-gray-950 md:block">{t('cart.title')} ({items.length})</h1>
        </div>
        <h1 className="min-w-0 truncate text-center text-lg font-black tracking-tight text-gray-950 md:hidden">{t('cart.title')} ({items.length})</h1>
        <span aria-hidden="true" className="h-11 w-11 md:hidden" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          {items.map((item) => {
            const cartKey = getCartKey(item)
            return (
            <article key={cartKey} className="relative rounded-[1.6rem] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft md:p-4">
              <button onClick={() => removeItem(cartKey)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${item.product.name}`}>
                <X size={17} />
              </button>
              <div className="grid grid-cols-[84px_1fr] gap-3 pr-5 md:flex md:gap-4">
                <ProductThumb product={item.product} size="lg" className="h-20 w-20 shrink-0 rounded-xl md:h-24 md:w-24" />
                <div className="min-w-0 flex-1">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm font-black leading-tight text-gray-950 md:text-base">{item.product.name}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">{item.product.item_type === 'set' ? 'Product Set' : item.product.category_name || item.product.code || t('product.cosmetics')}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3 md:mt-5 md:flex-col md:items-stretch lg:flex-row lg:items-center">
                    <div>
                      <p className="text-lg font-black text-pink-600 md:text-xl">{formatCurrency(item.product.retail_price * item.quantity)}</p>
                      <p className="text-xs font-semibold text-gray-400">{formatCurrency(item.product.retail_price)} {t('cart.each')}</p>
                    </div>
                    <div className="flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
                      <button onClick={() => updateQuantity(cartKey, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100">
                        <Minus size={15} />
                      </button>
                      <span className="min-w-8 text-center text-sm font-black text-gray-900">{String(item.quantity).padStart(2, '0')}</span>
                      <button onClick={() => updateQuantity(cartKey, item.quantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white shadow-sm">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )})}
        </section>

        <aside className="h-fit px-1 py-2 lg:sticky lg:top-36 lg:rounded-[1.75rem] lg:bg-white lg:p-5 lg:shadow-sm">
          <h2 className="hidden text-xl font-black text-gray-950 lg:block">{t('cart.orderSummary')}</h2>
          <p className="mt-1 hidden text-sm font-semibold text-gray-400 lg:block">
            {selectedCount} {selectedCount === 1 ? 'item' : 'items'} ready for checkout
          </p>
          <form onSubmit={handleApplyPromo} className="lg:mt-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('cart.promoCode')}</p>
              <button
                type="button"
                onClick={openMyCoupons}
                className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-600 transition hover:bg-pink-100 active:scale-95"
              >
                <Ticket size={13} /> {t('cart.myCoupons')}
              </button>
            </div>
            <div className={`flex items-center gap-2 rounded-full border bg-white p-1.5 pl-4 transition ${appliedCoupon ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-gray-200 focus-within:border-pink-300'}`}>
              <TicketPercent size={19} className={appliedCoupon ? 'text-emerald-500' : 'text-pink-600'} />
              <input
                value={promoCode}
                onChange={(event) => {
                  setPromoCode(event.target.value.toUpperCase())
                  if (appliedCoupon) clearCoupon()
                }}
                placeholder={t('cart.enterPromoCode')}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm font-bold uppercase text-gray-900 outline-none placeholder:font-semibold placeholder:normal-case placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={applyingPromo || !promoCode.trim()}
                className="min-w-[92px] rounded-full bg-pink-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-pink-700 disabled:bg-pink-300"
              >
                {applyingPromo ? '...' : t('rewardsPage.coupons.apply')}
              </button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 flex items-center justify-between px-2 text-xs font-bold text-emerald-600">
                <span>{appliedCoupon.name}</span>
                <button type="button" onClick={() => { clearCoupon(); setPromoCode('') }} className="text-gray-400 hover:text-red-500">{t('cart.removeCoupon')}</button>
              </div>
            )}
          </form>
          <div className="mt-5 space-y-3 border-b border-slate-300 px-1 pb-5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-500">{t('cart.subtotal')}</span>
              <span className="font-black text-gray-950">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-500">{t('cart.deliveryFee')}</span>
              <span className="font-black text-gray-950">{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-gray-500">{t('cart.discountVoucher')}</span>
              <span className="font-black text-emerald-600">-{formatCurrency(discount)}</span>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between px-1">
            <span className="text-base font-black text-gray-950">{t('cart.total')}</span>
            <span className="text-[22px] font-black text-gray-950">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={goCheckout}
            disabled={selectedCount === 0 || (isAuthenticated && addressesLoading)}
            className="shop-btn-primary mt-5 hidden min-h-[50px] w-full rounded-2xl px-5 py-3 text-[15px] font-black disabled:cursor-not-allowed disabled:opacity-60 lg:flex"
          >
            {isAuthenticated && addressesLoading ? t('checkout.pleaseWait') : t('cart.proceedToCheckout')} <ArrowRight size={17} />
          </button>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl bg-white/95 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <button
          onClick={goCheckout}
          disabled={selectedCount === 0 || (isAuthenticated && addressesLoading)}
          className="shop-btn-primary min-h-[50px] w-full rounded-2xl px-5 py-3 text-[15px] font-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAuthenticated && addressesLoading ? t('checkout.pleaseWait') : t('cart.proceedToCheckout')} <ArrowRight size={17} />
        </button>
      </div>

      {showCoupons && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-gray-950/45 px-0 backdrop-blur-sm md:items-center md:px-4">
          <div className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-pink-600">{t('cart.myCoupons')}</p>
                <h2 className="text-lg font-black text-gray-950">{t('rewardsPage.coupons.title')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCoupons(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-500 active:scale-95"
                aria-label={t('common.cancel')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-[220px] flex-1 overflow-y-auto bg-slate-50 p-4">
              {couponsLoading ? (
                <div className="flex h-44 items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-pink-600" />
                </div>
              ) : couponsError ? (
                <div className="py-16 text-center text-sm font-bold text-gray-500">{t('rewardsPage.couponsLoadError')}</div>
              ) : activeCoupons.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
                  <Ticket size={32} className="mx-auto text-gray-200" />
                  <p className="mt-3 text-sm font-black text-gray-500">{t('rewardsPage.coupons.noCoupons')}</p>
                  <button type="button" onClick={() => navigate('/profile/rewards/redeem')} className="mt-4 rounded-lg bg-pink-600 px-5 py-2.5 text-xs font-black text-white">
                    {t('rewardsPage.coupons.redeemRewards')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCoupons.map((coupon) => {
                    const visual = couponVisual(coupon, t)
                    const Icon = visual.icon
                    return (
                      <button
                        key={coupon.id}
                        type="button"
                        onClick={() => handleApplySavedCoupon(coupon)}
                        disabled={applyingPromo}
                        className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-pink-200 active:scale-[0.99] disabled:opacity-60"
                      >
                        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${visual.tone}`}>
                          <Icon size={20} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-gray-950">{coupon.reward_name}</span>
                          <span className="mt-1 block text-xs font-semibold text-gray-500">
                            {visual.label} · {t('rewardsPage.coupons.minOrder', { amount: Number(coupon.minimum_order_amount || 0).toFixed(0) })}
                          </span>
                          <span className="mt-1 block font-mono text-xs font-black text-pink-600">{coupon.coupon_code}</span>
                        </span>
                        <span className="rounded-full bg-pink-600 px-3 py-1.5 text-xs font-black text-white">
                          {t('rewardsPage.coupons.apply')}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
