import { useEffect, useMemo, useState, startTransition } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingCart, ArrowRight, ChevronLeft, Gift, Loader2, Percent, Ticket, TicketPercent, Truck, X, Sparkles, CheckCircle2 } from 'lucide-react'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import { showStockLimitToast } from '@/components/customer/CartAddedToast'
import CouponStatusModal from '@/components/rewards/CouponStatusModal'
import FreeGiftSelectorModal from '@/components/customer/FreeGiftSelectorModal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { EmptyState, ProductThumb } from '@/components/customer/CustomerUi'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useCartPriceSync } from '@/utils/cartPriceSync'

const DEFAULT_PROVINCE_FEES = {
  phnom_penh: 3, siem_reap: 6, battambang: 6,
  kampong_cham: 5, kandal: 4, takeo: 4, other: 8,
}

const getCartKey = (item) => item.product.cart_key || item.product.id

const COUPON_ERROR_KEYS = {
  'Enter a promo code.': 'cart.couponErrors.enterCode',
  'This promo code has already been used or is no longer active.': 'cart.couponErrors.usedOrInactive',
  'This reward cannot be used as a promo code.': 'cart.couponErrors.cannotUse',
  'This promo code is not currently available.': 'cart.couponErrors.notAvailable',
  'Promo code was not found.': 'cart.couponErrors.notFound',
  'This promo code is for new customers only.': 'cart.couponErrors.newCustomersOnly',
  'This promo code is for staff only.': 'cart.couponErrors.staffOnly',
  'This promo code has reached its usage limit.': 'cart.couponErrors.usageLimitReached',
  'You already reached the usage limit for this promo code.': 'cart.couponErrors.customerLimitReached',
}

function translateCouponError(detail, t) {
  if (!detail) return t('cart.promoApplyFailed')
  const key = COUPON_ERROR_KEYS[detail]
  if (key) return t(key)
  const minOrderMatch = /^Minimum order amount is \$([0-9.]+)\.$/.exec(detail)
  if (minOrderMatch) {
    return t('cart.couponErrors.minOrder', { amount: minOrderMatch[1] })
  }
  return detail
}

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
  const expiresAt = coupon?.ends_at || coupon?.expires_at
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now())
}

function canUseCoupon(coupon) {
  return Boolean(
    coupon?.coupon_code &&
    (!coupon.status || coupon.status === 'active') &&
    !isCouponExpired(coupon)
  )
}

function couponVisual(coupon, t) {
  if (coupon.reward_type === 'free_delivery') return { icon: Truck, label: t('rewardsPage.coupons.freeShip'), tone: 'bg-sky-50 text-sky-600' }
  if (coupon.reward_type === 'manual') return { icon: Gift, label: t('rewardsPage.coupons.gift'), tone: 'bg-violet-50 text-violet-600' }
  if (coupon.coupon_discount_type === 'percent') return { icon: Percent, label: `${Number(coupon.coupon_value || 0)}%`, tone: 'bg-pink-50 text-pink-600' }
  return { icon: Ticket, label: `$${Number(coupon.coupon_value || 0).toFixed(0)}`, tone: 'bg-pink-50 text-pink-600' }
}

export default function Cart() {
  useCartPriceSync()
  const { t, i18n } = useTranslation()
  const isKhmer = i18n.language === 'km'
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const openAuthModal = useUiStore((s) => s.openAuthModal)
  const {
    items, selectedProductIds, appliedCoupon, updateQuantity, removeItem,
    selectAll, applyCoupon, clearCoupon, addItem,
  } = useCartStore()
  const [confirm, ConfirmDialog] = useConfirm()
  const [promoCode, setPromoCode] = useState(appliedCoupon?.coupon_code || '')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [showCoupons, setShowCoupons] = useState(false)
  const [couponModal, setCouponModal] = useState({ isOpen: false, type: 'success', message: '', name: '' })
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  })
  const { data: rewardsSummary, isLoading: couponsLoading, isError: couponsError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
    enabled: isAuthenticated && showCoupons,
  })
  const { data: brandPromos = [], isFetched: brandPromosFetched } = useQuery({
    queryKey: ['active-brand-promotions'],
    queryFn: async () => {
      const res = await productsApi.promotions.active({ type: 'buy_x_get_y' })
      const data = res.data
      return Array.isArray(data) ? data : (data?.results || [])
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const [activePromoModal, setActivePromoModal] = useState(null)

  const selectedItems = items
  const selectedCount = selectedItems.length
  const subtotal = selectedItems.reduce((sum, i) => sum + (i.product?.is_free_gift ? 0 : (i.product.retail_price * i.quantity)), 0)
  const deliveryFee = selectedItems.length > 0 ? getDefaultDeliveryFee(siteSettings) : 0
  const discount = getCouponDiscount(appliedCoupon, subtotal, deliveryFee)
  const total = subtotal + deliveryFee - discount

  // Brand Buy X Get Y Free progress tracker
  const brandPromoProgress = useMemo(() => {
    if (!brandPromos.length || !items.length) return []

    return brandPromos.map((promo) => {
      const brandId = promo.brand
      const paidQty = items
        .filter((i) => !i.product?.is_free_gift && String(i.product?.brand) === String(brandId))
        .reduce((sum, i) => sum + (i.quantity || 1), 0)

      const brandSpent = items
        .filter((i) => !i.product?.is_free_gift && String(i.product?.brand) === String(brandId))
        .reduce((sum, i) => sum + (Number(i.product?.retail_price || 0) * (i.quantity || 1)), 0)

      const selectedGifts = items
        .filter((i) => i.product?.is_free_gift && String(i.product?.promo_brand_id) === String(brandId))
        .reduce((sum, i) => sum + (i.quantity || 1), 0)

      const buyQty = promo.buy_quantity || 2
      const getQty = promo.get_quantity || 1
      const minSpend = promo.min_spend ? Number(promo.min_spend) : null
      const meetsSpend = minSpend === null || brandSpent >= minSpend

      const earnedGifts = (paidQty >= buyQty && meetsSpend)
        ? Math.floor(paidQty / buyQty) * getQty
        : 0
      const remainingPicks = Math.max(0, earnedGifts - selectedGifts)
      const progressToNext = paidQty % buyQty
      const spendRemaining = minSpend ? Math.max(0, minSpend - brandSpent) : 0

      return {
        promo,
        brandId,
        brandName: promo.brand_name || 'Brand',
        paidQty,
        brandSpent,
        minSpend,
        meetsSpend,
        spendRemaining,
        buyQty,
        getQty,
        earnedGifts,
        selectedGifts,
        remainingPicks,
        progressToNext,
        neededForNext: buyQty - progressToNext,
      }
    }).filter((p) => p.paidQty > 0 || p.selectedGifts > 0)
  }, [brandPromos, items])

  // Auto-prune free gifts if promo is turned OFF, expired, or terms are not met
  useEffect(() => {
    if (!brandPromosFetched || !items.length) return

    const giftItems = items.filter((i) => i.product?.is_free_gift)
    if (!giftItems.length) return

    const activePromosByBrand = new Map()
    brandPromos.forEach((p) => {
      activePromosByBrand.set(String(p.brand), p)
    })

    // Group free gifts by brand
    const giftsByBrand = {}
    giftItems.forEach((gift) => {
      const bId = String(gift.product?.promo_brand_id || gift.product?.brand || '')
      if (!giftsByBrand[bId]) giftsByBrand[bId] = []
      giftsByBrand[bId].push(gift)
    })

    let removedAny = false
    Object.entries(giftsByBrand).forEach(([brandId, brandGifts]) => {
      const activePromo = activePromosByBrand.get(brandId)

      // 1. If the promotion was turned OFF or does not exist, remove ALL its free gifts!
      if (!activePromo) {
        brandGifts.forEach((g) => removeItem(getCartKey(g)))
        removedAny = true
        return
      }

      // 2. If promo is active, check if customer still qualifies
      const paidQty = items
        .filter((i) => !i.product?.is_free_gift && String(i.product?.brand) === String(brandId))
        .reduce((sum, i) => sum + (i.quantity || 1), 0)

      const brandSpent = items
        .filter((i) => !i.product?.is_free_gift && String(i.product?.brand) === String(brandId))
        .reduce((sum, i) => sum + (Number(i.product?.retail_price || 0) * (i.quantity || 1)), 0)

      const minSpend = activePromo.min_spend ? Number(activePromo.min_spend) : null
      const meetsSpend = minSpend === null || brandSpent >= minSpend

      const earnedGifts = (paidQty >= (activePromo.buy_quantity || 2) && meetsSpend)
        ? Math.floor(paidQty / (activePromo.buy_quantity || 2)) * (activePromo.get_quantity || 1)
        : 0

      const currentGiftCount = brandGifts.reduce((sum, i) => sum + (i.quantity || 1), 0)

      if (currentGiftCount > earnedGifts) {
        let toRemove = currentGiftCount - earnedGifts
        for (const giftItem of brandGifts) {
          if (toRemove <= 0) break
          removeItem(getCartKey(giftItem))
          toRemove -= (giftItem.quantity || 1)
        }
        removedAny = true
      }
    })

    if (removedAny) {
      if (isKhmer) {
        toast('ប្រូម៉ូសិនត្រូវបានបិទ ឬលែងត្រូវលក្ខខណ្ឌ កាដូឥតគិតថ្លៃត្រូវបានដកចេញពីកន្ត្រក', { icon: 'ℹ️' })
      } else {
        toast('Promotion is inactive or terms not met. Free gifts were removed from cart.', { icon: 'ℹ️' })
      }
    }
  }, [items, brandPromos, brandPromosFetched, removeItem, isKhmer])

  const handleSelectFreeGift = (product, promo) => {
    // Check remaining stock if product availability is auto by stock
    const isAuto = product.availability_status === 'auto'
    if (isAuto && typeof product.current_stock === 'number') {
      const cartQty = items
        .filter((i) => {
          const iProdId = i.product?.product_id || i.product?.id
          return String(iProdId) === String(product.id)
        })
        .reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)

      if (cartQty >= product.current_stock) {
        if (isKhmer) {
          toast.error(`ផលិតផល "${product.name}" អស់ពីស្តុកហើយ មិនអាចជ្រើសរើសបានទេ`)
        } else {
          toast.error(`"${product.name}" is out of stock and cannot be added`)
        }
        return
      }
    }

    const res = addItem({
      ...product,
      id: `gift-${product.id}-${Date.now()}`,
      cart_key: `gift-${product.id}-${Date.now()}`,
      product_id: product.id,
      name: product.name,
      retail_price: 0,
      original_price: product.retail_price,
      is_free_gift: true,
      promo_id: promo.id,
      promo_brand_id: promo.brand,
      item_type: 'product',
    }, 1)

    if (res?.success === false && res?.reason === 'stock_limit') {
      if (isKhmer) {
        toast.error(`ផលិតផល "${product.name}" អស់ពីស្តុកហើយ`)
      } else {
        toast.error(`"${product.name}" is out of stock`)
      }
      return
    }

    if (isKhmer) {
      toast.success(`🎉 បានបន្ថែម "${product.name}" ជាកាដូឥតគិតថ្លៃរបស់អ្នក!`)
    } else {
      toast.success(`🎉 Added "${product.name}" as your FREE gift!`)
    }
    setActivePromoModal(null)
  }

  const handlePromptRemove = async (item) => {
    const isGift = Boolean(item.product?.is_free_gift)
    const name = item.product?.name || (isKhmer ? 'មុខទំនិញ' : 'Item')

    const title = isGift
      ? (isKhmer ? 'តើអ្នកចង់លុបកាដូឥតគិតថ្លៃនេះទេ?' : 'Remove Free Gift?')
      : (isKhmer ? 'តើអ្នកចង់លុបផលិតផលនេះទេ?' : 'Remove Product?')

    const desc = isGift
      ? (isKhmer
          ? `តើអ្នកប្រាកដជាចង់លុប "${name}" ចេញពីកន្ត្រកមែនទេ? អ្នកអាចជ្រើសរើសកាដូផ្សេងទៀតឡើងវិញបាន។`
          : `Are you sure you want to remove "${name}" from your cart? You can choose another free gift.`)
      : (isKhmer
          ? `តើអ្នកប្រាកដជាចង់លុប "${name}" ចេញពីកន្ត្រករបស់អ្នកមែនទេ?`
          : `Are you sure you want to remove "${name}" from your cart?`)

    const ok = await confirm(title, desc, {
      confirmText: isKhmer ? 'លុបចេញ' : 'Remove',
      cancelText: isKhmer ? 'បោះបង់' : 'Cancel',
      tone: 'danger',
    })

    if (ok) {
      removeItem(getCartKey(item))
      if (isKhmer) {
        toast.success(`បានលុប "${name}" ចេញពីកន្ត្រក`)
      } else {
        toast.success(`Removed "${name}" from cart`)
      }
    }
  }
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

  // Warm cart thumbnails so they paint quickly on open
  useEffect(() => {
    items.slice(0, 6).forEach((item) => {
      const url = item?.product?.primary_image || item?.product?.image_url || item?.product?.image || item?.product?.images?.[0]?.image
      if (!url) return
      const img = new Image()
      img.src = url
    })
  }, [items])

  useEffect(() => {
    setPromoCode(appliedCoupon?.coupon_code || '')
  }, [appliedCoupon?.coupon_code])

  const goCheckout = () => {
    if (selectedCount <= 0) return
    if (!isAuthenticated) {
      openAuthModal('checkout')
      return
    }
    startTransition(() => navigate('/checkout'))
  }

  const openMyCoupons = () => {
    if (!isAuthenticated) {
      openAuthModal('coupon')
      return
    }
    startTransition(() => navigate('/profile/rewards/coupons'))
  }

  const handleApplyPromo = async (event) => {
    event.preventDefault()
    if (!promoCode.trim()) {
      toast.error(t('cart.enterPromoCode'))
      return
    }
    if (!isAuthenticated) {
      openAuthModal('coupon')
      return
    }
    if (selectedCount <= 0) {
      toast.error(t('cart.selectProductFirst'))
      return
    }

    setApplyingPromo(true)
    const startTime = Date.now()
    try {
      const { data } = await ordersApi.rewards.validateCoupon({
        coupon_code: promoCode.trim(),
        subtotal,
        delivery_fee: deliveryFee,
      })
      const elapsed = Date.now() - startTime
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed))
      }
      applyCoupon(data)
      setPromoCode(data.coupon_code)
      setCouponModal({
        isOpen: true,
        type: 'success',
        message: t('rewardsPage.toast.couponApplied', { code: data.coupon_code }),
        name: data.name
      })
    } catch (error) {
      const elapsed = Date.now() - startTime
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed))
      }
      clearCoupon()
      const errorMsg = translateCouponError(error?.response?.data?.detail, t)
      setCouponModal({
        isOpen: true,
        type: 'error',
        message: errorMsg,
        name: ''
      })
    } finally {
      setApplyingPromo(false)
    }
  }

  const handleApplySavedCoupon = async (coupon) => {
    setApplyingPromo(true)
    const startTime = Date.now()
    try {
      const { data } = await ordersApi.rewards.validateCoupon({
        coupon_code: coupon.coupon_code,
        subtotal,
        delivery_fee: deliveryFee,
      })
      const elapsed = Date.now() - startTime
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed))
      }
      applyCoupon(data)
      setShowCoupons(false)
      setCouponModal({
        isOpen: true,
        type: 'success',
        message: t('rewardsPage.toast.couponApplied', { code: data.coupon_code }),
        name: data.name
      })
    } catch (error) {
      const elapsed = Date.now() - startTime
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed))
      }
      const errorMsg = translateCouponError(error?.response?.data?.detail, t)
      setCouponModal({
        isOpen: true,
        type: 'error',
        message: errorMsg,
        name: ''
      })
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
      <div className="sticky top-0 z-30 -mx-4 mb-4 grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center bg-slate-100/95 px-4 pb-2 pt-[max(0.5rem,var(--page-safe-top))] backdrop-blur md:static md:mx-0 md:mb-5 md:block md:min-h-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/shop'))}
            aria-label={t('common.back')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm active:scale-95 md:hidden"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="hidden text-xl font-black tracking-tight text-gray-950 md:block">{t('cart.title')} ({items.length})</h1>
        </div>
        <h1 className="min-w-0 truncate text-center text-lg font-black tracking-tight text-gray-950 md:hidden">{t('cart.title')} ({items.length})</h1>
        <span aria-hidden="true" className="h-11 w-11 md:hidden" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_380px]">
        <section className="space-y-3">
          {/* Brand Buy X Get Y Promotion Banners */}
          {brandPromoProgress.map((prog) => {
            const defaultBadge = isKhmer
              ? `ទិញ ${prog.buyQty} ថែម ${prog.getQty} ឥតគិតថ្លៃ`
              : `Buy ${prog.buyQty} Get ${prog.getQty} Free`

            return (
              <div
                key={prog.brandId}
                className="overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/50 p-4 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white shadow-sm">
                      <Gift className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-pink-700">
                          {isKhmer ? `ប្រូម៉ូសិនពិសេស ${prog.brandName}` : `${prog.brandName} Special Promo`}
                        </span>
                        <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-[11px] font-bold text-pink-700 border border-pink-200">
                          {prog.promo.badge_text || defaultBadge}
                        </span>
                      </div>

                      {prog.earnedGifts > 0 ? (
                        <p className="mt-0.5 text-xs font-bold text-gray-800">
                          {isKhmer ? (
                            <>
                              🎉 អ្នកទទួលបាន <span className="text-pink-600 font-bold">{prog.earnedGifts} កាដូឥតគិតថ្លៃ</span>!{' '}
                              {prog.remainingPicks > 0 ? (
                                <span className="text-emerald-700 font-bold">({prog.remainingPicks} មុខទៀតដើម្បីជ្រើសរើស)</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">✅ បានជ្រើសរើសរួចរាល់!</span>
                              )}
                            </>
                          ) : (
                            <>
                              🎉 You earned <span className="text-pink-600 font-bold">{prog.earnedGifts} FREE gift{prog.earnedGifts > 1 ? 's' : ''}</span>!{' '}
                              {prog.remainingPicks > 0 ? (
                                <span className="text-emerald-700 font-bold">({prog.remainingPicks} left to pick)</span>
                              ) : (
                                <span className="text-emerald-600 font-bold">✅ All claimed!</span>
                              )}
                            </>
                          )}
                        </p>
                      ) : !prog.meetsSpend && prog.paidQty >= prog.buyQty ? (
                        <p className="mt-0.5 text-xs font-bold text-gray-800">
                          {isKhmer ? (
                            <>
                              ទិញផលិតផល {prog.brandName} បន្ថែម <span className="text-pink-600 font-bold">{formatCurrency(prog.spendRemaining)}</span> ទៀត ដើម្បីទទួលបានកាដូឥតគិតថ្លៃ! (ទិញយ៉ាងតិច {formatCurrency(prog.minSpend)})
                            </>
                          ) : (
                            <>
                              Add <span className="text-pink-600 font-bold">{formatCurrency(prog.spendRemaining)}</span> more of {prog.brandName} to unlock your FREE gift! (Min. spend {formatCurrency(prog.minSpend)})
                            </>
                          )}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs font-bold text-gray-700">
                          {isKhmer ? (
                            <>
                              ទិញផលិតផល {prog.brandName} បន្ថែម <span className="text-pink-600 font-bold">{prog.neededForNext} មុខទៀត</span>{prog.minSpend ? ` (ទិញយ៉ាងតិច ${formatCurrency(prog.minSpend)})` : ''} ដើម្បីទទួលបាន <span className="text-pink-600 font-bold">{prog.getQty} ឥតគិតថ្លៃ</span>!
                            </>
                          ) : (
                            <>
                              Add <span className="text-pink-600 font-bold">{prog.neededForNext} more item{prog.neededForNext > 1 ? 's' : ''}</span> from {prog.brandName}{prog.minSpend ? ` (Min. spend ${formatCurrency(prog.minSpend)})` : ''} to get <span className="text-pink-600 font-bold">{prog.getQty} FREE</span>!
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {prog.remainingPicks > 0 ? (
                    <button
                      type="button"
                      onClick={() => setActivePromoModal(prog.promo)}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-pink-700 active:scale-95"
                    >
                      <Gift className="h-4 w-4" />
                      <span>
                        {isKhmer
                          ? `ជ្រើសរើសកាដូ (${prog.remainingPicks} ទៀត)`
                          : `Pick Free Gift (${prog.remainingPicks} left)`}
                      </span>
                    </button>
                  ) : prog.earnedGifts > 0 ? (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>
                        {isKhmer
                          ? `កាដូឥតគិតថ្លៃ ${prog.selectedGifts} ក្នុងកន្ត្រក`
                          : `${prog.selectedGifts} Free Gifts in Cart`}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full sm:w-32">
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-1">
                        <span>{isKhmer ? 'ដំណើរការ' : 'Progress'}</span>
                        <span>{prog.progressToNext}/{prog.buyQty}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-pink-600 transition-all duration-300"
                          style={{ width: `${(prog.progressToNext / prog.buyQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {items.map((item, index) => {
            const cartKey = getCartKey(item)
            const isGift = Boolean(item.product?.is_free_gift)

            if (isGift) {
              return (
                <article key={cartKey} className="relative rounded-[1.6rem] border-2 border-emerald-100 bg-emerald-50/25 p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft md:p-4">
                  <button onClick={() => handlePromptRemove(item)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${item.product.name}`}>
                    <X size={17} />
                  </button>
                  <div className="grid grid-cols-[84px_1fr] gap-3 pr-5 md:flex md:gap-4">
                    <ProductThumb product={item.product} size="lg" priority={index < 6} className="h-20 w-20 shrink-0 rounded-xl md:h-24 md:w-24 border border-emerald-200" />
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                              <Gift size={12} /> {isKhmer ? 'កាដូឥតគិតថ្លៃ' : 'FREE GIFT (PROMO)'}
                            </span>
                          </div>
                          <p className="khmer-title mt-1 line-clamp-2 text-sm text-gray-950 md:text-base font-bold">{item.product.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                            {isKhmer ? 'បានជ្រើសរើសជាកាដូឥតគិតថ្លៃ' : 'Selected as free gift'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3 md:mt-5 md:flex-col md:items-stretch lg:flex-row lg:items-center">
                        <div>
                          <p className="text-lg font-black text-emerald-600 md:text-xl">$0.00</p>
                          <p className="text-xs font-semibold text-gray-400 line-through">
                            {formatCurrency(item.product.original_price || item.product.retail_price)} {isKhmer ? 'តម្លៃដើម' : 'regular'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>{isKhmer ? `ចំនួន: ${item.quantity} (កាដូ)` : `Qty: ${item.quantity} (Free Gift)`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            }

            return (
            <article key={cartKey} className="relative rounded-[1.6rem] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft md:p-4">
              <button onClick={() => handlePromptRemove(item)} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${item.product.name}`}>
                <X size={17} />
              </button>
              <div className="grid grid-cols-[84px_1fr] gap-3 pr-5 md:flex md:gap-4">
                <ProductThumb product={item.product} size="lg" priority={index < 6} className="h-20 w-20 shrink-0 rounded-xl md:h-24 md:w-24" />
                <div className="min-w-0 flex-1">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="khmer-title line-clamp-2 text-sm text-gray-950 md:text-base">{item.product.name}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">{item.product.item_type === 'set' ? 'Product Set' : item.product.category_name || item.product.code || t('product.cosmetics')}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3 md:mt-5 md:flex-col md:items-stretch lg:flex-row lg:items-center">
                    <div>
                      <p className="text-lg font-black text-pink-600 md:text-xl">{formatCurrency(item.product.retail_price * item.quantity)}</p>
                      <p className="text-xs font-semibold text-gray-400">{formatCurrency(item.product.retail_price)} {t('cart.each')}</p>
                    </div>
                    <div className="flex w-fit items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
                      <button
                        onClick={() => {
                          if (item.quantity <= 1) {
                            handlePromptRemove(item)
                          } else {
                            updateQuantity(cartKey, item.quantity - 1)
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="min-w-8 text-center text-sm font-black text-gray-900">{String(item.quantity).padStart(2, '0')}</span>
                      <button
                        onClick={() => {
                          const res = updateQuantity(cartKey, item.quantity + 1)
                          if (!res?.success && res?.reason === 'stock_limit') {
                            showStockLimitToast(item.product, res.maxQuantity)
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white shadow-sm"
                      >
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
            {t('cart.readyForCheckout', { count: selectedCount })}
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
                disabled={applyingPromo}
                placeholder={t('cart.enterPromoCode')}
                className="min-w-0 flex-1 bg-transparent py-2 text-sm font-bold uppercase text-gray-900 outline-none placeholder:font-semibold placeholder:normal-case placeholder:text-gray-400 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={
                  applyingPromo
                  || !promoCode.trim()
                  || Boolean(appliedCoupon?.coupon_code && appliedCoupon.coupon_code.trim().toUpperCase() === promoCode.trim().toUpperCase())
                }
                className="flex min-w-[96px] items-center justify-center gap-1.5 rounded-full bg-pink-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-pink-300 active:scale-95"
              >
                {applyingPromo ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs">Applying...</span>
                  </>
                ) : appliedCoupon?.coupon_code && appliedCoupon.coupon_code.trim().toUpperCase() === promoCode.trim().toUpperCase() ? (
                  t('rewardsPage.coupons.applied')
                ) : (
                  t('rewardsPage.coupons.apply')
                )}
              </button>
            </div>
            {appliedCoupon && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm transition animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                    <Ticket size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black uppercase text-emerald-950">{appliedCoupon.name || appliedCoupon.coupon_code}</p>
                    <p className="text-[11px] font-semibold text-emerald-600">
                      {appliedCoupon.coupon_code} · {t('cart.couponAppliedDesc', 'Coupon applied')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { clearCoupon(); setPromoCode('') }}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-500 transition hover:bg-emerald-100 hover:text-red-600"
                >
                  {t('cart.removeCoupon')}
                </button>
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
            disabled={selectedCount === 0}
            className="shop-btn-primary mt-5 hidden min-h-[50px] w-full rounded-2xl px-5 py-3 text-[15px] font-black disabled:cursor-not-allowed disabled:opacity-60 lg:flex"
          >
            {t('cart.proceedToCheckout')} <ArrowRight size={17} />
          </button>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl bg-white/95 px-4 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <button
          onClick={goCheckout}
          disabled={selectedCount === 0}
          className="shop-btn-primary min-h-[50px] w-full rounded-2xl px-5 py-3 text-[15px] font-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('cart.proceedToCheckout')} <ArrowRight size={17} />
        </button>
      </div>

      {showCoupons && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-gray-950/50 p-0 backdrop-blur-sm md:items-center md:p-4"
          onClick={() => setShowCoupons(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:rounded-3xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-pink-600">{t('profile.rewards')}</p>
                <h2 className="text-lg font-black text-gray-950">{t('cart.myCoupons')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCoupons(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 active:scale-95"
                aria-label={t('common.cancel')}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
                    const isApplied = Boolean(
                      appliedCoupon?.coupon_code
                      && coupon.coupon_code?.trim().toUpperCase() === appliedCoupon.coupon_code.trim().toUpperCase()
                    )
                    return (
                      <button
                        key={coupon.id}
                        type="button"
                        onClick={() => handleApplySavedCoupon(coupon)}
                        disabled={applyingPromo || isApplied}
                        className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition hover:border-pink-200 active:scale-[0.99] disabled:cursor-default disabled:opacity-75"
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
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-black ${
                            isApplied ? 'bg-emerald-50 text-emerald-600' : 'bg-pink-600 text-white'
                          }`}
                        >
                          {isApplied ? t('rewardsPage.coupons.applied') : t('rewardsPage.coupons.apply')}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      <CouponStatusModal
        isOpen={couponModal.isOpen}
        onClose={() => setCouponModal(prev => ({ ...prev, isOpen: false }))}
        type={couponModal.type}
        message={couponModal.message}
        couponName={couponModal.name}
      />

      {/* Brand Free Gift Selector Modal */}
      {activePromoModal && (
        <FreeGiftSelectorModal
          isOpen={Boolean(activePromoModal)}
          onClose={() => setActivePromoModal(null)}
          promo={activePromoModal}
          remainingGiftsCount={
            brandPromoProgress.find((p) => p.promo.id === activePromoModal.id)?.remainingPicks || 1
          }
          onSelectGift={(product) => handleSelectFreeGift(product, activePromoModal)}
        />
      )}

      {ConfirmDialog}
    </div>
  )
}
