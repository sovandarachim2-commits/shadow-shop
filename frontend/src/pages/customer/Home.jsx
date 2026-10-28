import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Star, ShoppingBag,
  Gift, Brush, Droplet, SprayCan, Trash2, Plus, Minus, RefreshCw, Zap, ShoppingCart,
  Sparkles, Clock3,
} from 'lucide-react'
import { productsApi } from '@/api/products'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import { formatCurrency } from '@/utils/helpers'
import { formatFlashSaleCountdown, getFlashSaleTimerState, hasFlashSaleTimer, isVisibleFlashSaleItem } from '@/utils/flashSale'
import useCartStore from '@/store/cartStore'
import { BrandLogo } from '@/components/customer/CustomerUi'
import { showCartAddedToast } from '@/components/customer/CartAddedToast'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import WelcomeBonusModal from '@/components/rewards/WelcomeBonusModal'

// ─── Category config ──────────────────────────────────────────────────────────
const HOME_QUERY_OPTIONS = {
  ...STOREFRONT_LIVE_QUERY,
  gcTime: 45 * 60 * 1000,
}

function iconForCategory(name) {
  const v = (name || '').toLowerCase()
  if (v.includes('makeup') || v.includes('make up')) return Brush
  if (v.includes('perfume') || v.includes('fragrance')) return SprayCan
  if (v.includes('lucky') || v.includes('gift')) return Gift
  return Droplet
}

function isAvailableForSale(product) {
  return product?.is_available_for_sale ?? Number(product?.current_stock || 0) > 0
}

function ProductImageLoading() {
  return <div className="absolute inset-0 animate-pulse bg-gray-100" />
}

function ProductImageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">
      <ShoppingBag size={30} />
    </div>
  )
}

function ShopByBrandCarousel({ brands }) {
  const carouselRef = useRef(null)
  const pauseUntil = useRef(0)
  const repeatedBrands = useMemo(() => {
    if (!brands.length) return []
    const repeats = Math.max(1, Math.ceil(12 / brands.length))
    return Array.from({ length: repeats }, () => brands).flat()
  }, [brands])

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const segmentWidth = () => carousel.scrollWidth / 3
    const normalizePosition = () => {
      const segment = segmentWidth()
      if (!segment) return
      if (carousel.scrollLeft < segment * 0.25) carousel.scrollLeft += segment
      else if (carousel.scrollLeft > segment * 1.75) carousel.scrollLeft -= segment
    }

    carousel.scrollLeft = segmentWidth()

    let frameId
    let previousFrameTime = 0
    const animate = (time) => {
      const elapsed = previousFrameTime ? Math.min(time - previousFrameTime, 48) : 0
      previousFrameTime = time
      if (!reducedMotion.matches && time >= pauseUntil.current) {
        carousel.scrollLeft -= elapsed * 0.025
      }
      normalizePosition()
      frameId = window.requestAnimationFrame(animate)
    }
    frameId = window.requestAnimationFrame(animate)

    return () => window.cancelAnimationFrame(frameId)
  }, [repeatedBrands])

  const pauseWhileInteracting = () => {
    pauseUntil.current = Number.POSITIVE_INFINITY
  }

  const resumeAfterInteraction = () => {
    pauseUntil.current = performance.now() + 1200
  }

  return (
    <div
      ref={carouselRef}
      className="brand-marquee -mx-4 overflow-x-auto px-4 pb-1 md:hidden"
      onTouchStart={pauseWhileInteracting}
      onTouchEnd={resumeAfterInteraction}
      onTouchCancel={resumeAfterInteraction}
      onPointerDown={pauseWhileInteracting}
      onPointerUp={resumeAfterInteraction}
      onPointerCancel={resumeAfterInteraction}
      onWheel={resumeAfterInteraction}
    >
      <div className="flex w-max">
        {[0, 1, 2].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-3 pr-3" aria-hidden={copy !== 0 || undefined}>
            {repeatedBrands.map((brand, index) => (
              <Link
                key={`${copy}-${brand.id}-${index}`}
                to={`/shop?brand=${brand.id}`}
                tabIndex={copy !== 0 ? -1 : undefined}
                className="group flex w-[104px] shrink-0 flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-3 transition-colors hover:border-pink-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-100 bg-white p-1">
                  <BrandLogo brand={brand} size="lg" className="h-full w-full rounded-full ring-0 [&>img]:rounded-full [&>img]:object-cover" />
                </div>
                <p className="w-full break-words text-center text-xs font-semibold leading-5 text-gray-900 group-hover:text-pink-600">{brand.name}</p>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductCardButton({ available, qty, onAdd, onIncrease, onDecrease, addLabel, addToCartLabel, soldOutLabel }) {
  if (!available) {
    return (
      <span className="flex h-[42px] w-full items-center justify-center rounded-xl bg-gray-100 text-[13px] font-semibold text-gray-400 sm:h-12 sm:text-sm">
        {soldOutLabel}
      </span>
    )
  }

  if (qty === 0) {
    return (
      <button
        onClick={onAdd}
        className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-3 text-[13px] font-semibold leading-none text-white shadow-sm shadow-pink-100 transition hover:bg-pink-700 active:scale-[0.99] sm:h-12 sm:gap-2 sm:px-4 sm:text-sm"
      >
        <ShoppingCart size={17} />
        <span className="sm:hidden">{addLabel}</span>
        <span className="hidden sm:inline">{addToCartLabel}</span>
      </button>
    )
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex h-[42px] w-full items-center justify-between rounded-xl bg-pink-600 px-1.5 sm:h-12 sm:px-2">
      <button onClick={onDecrease} className="flex h-8 w-9 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-9 sm:w-10">
        {qty === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
      </button>
      <span className="min-w-[34px] text-center text-[13px] font-semibold text-white sm:min-w-[40px] sm:text-sm">{qty}</span>
      <button onClick={onIncrease} className="flex h-8 w-9 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-9 sm:w-10">
        <Plus size={16} />
      </button>
    </div>
  )
}

// ─── Countdown to midnight ────────────────────────────────────────────────────
function FlashSaleTimer({ item, nowMs, compact = false }) {
  const timer = getFlashSaleTimerState(item, nowMs)
  if (!timer?.value) return null

  return (
    <div className={`mt-2 flex w-fit items-center gap-1 rounded-lg bg-pink-50 px-2 py-1 font-black leading-none text-pink-600 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      <Clock3 size={compact ? 11 : 12} />
      <span>{timer.label} {timer.value}</span>
    </div>
  )
}

function getFlashSaleSectionTimer(items, nowMs) {
  const candidates = items
    .map((item) => {
      const startMs = item.flash_sale_starts_at ? new Date(item.flash_sale_starts_at).getTime() : null
      const endMs = item.flash_sale_ends_at ? new Date(item.flash_sale_ends_at).getTime() : null
      if (Number.isFinite(endMs) && endMs < nowMs) return null
      if (Number.isFinite(startMs) && startMs > nowMs) {
        return { type: 'starts', targetMs: startMs, startMs: nowMs, endMs: startMs }
      }
      if (Number.isFinite(endMs)) {
        return { type: 'ends', targetMs: endMs, startMs: Number.isFinite(startMs) ? startMs : nowMs, endMs }
      }
      return null
    })
    .filter(Boolean)
    .sort((a, b) => a.targetMs - b.targetMs)

  const timer = candidates[0]
  if (!timer) return null

  const totalMs = Math.max(1, timer.endMs - timer.startMs)
  const elapsedMs = Math.min(totalMs, Math.max(0, nowMs - timer.startMs))
  return {
    label: timer.type === 'starts' ? 'Starts in' : 'Ends in',
    value: formatFlashSaleCountdown(timer.targetMs, nowMs),
    progress: timer.type === 'starts' ? 0 : Math.round((elapsedMs / totalMs) * 100),
  }
}

function useCountdown() {
  const calc = () => {
    const now = new Date()
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const diff = Math.max(0, end - now)
    return {
      h: String(Math.floor(diff / 3600000)).padStart(2, '0'),
      m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0'),
      s: String(Math.floor((diff % 60000) / 1000)).padStart(2, '0'),
    }
  }
  const [time, setTime] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

// ─── Cosmetic placeholder ─────────────────────────────────────────────────────
function CosmeticMockup({ tone = 'pink' }) {
  const palettes = {
    pink:   'from-pink-200 via-pink-300 to-rose-400',
    rose:   'from-rose-100 via-pink-200 to-rose-300',
    red:    'from-red-400 via-rose-500 to-pink-700',
    gold:   'from-amber-100 via-orange-200 to-yellow-300',
    amber:  'from-amber-700 via-orange-500 to-yellow-400',
    purple: 'from-purple-200 via-fuchsia-300 to-pink-400',
    set:    'from-pink-200 via-rose-300 to-purple-300',
  }
  const p = palettes[tone] || palettes.pink
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_35%)]" />
      <div className="relative flex items-end justify-center gap-2">
        <div className={`h-20 w-9 rounded-b-xl rounded-t-sm bg-gradient-to-b ${p} shadow-lg`}>
          <div className="mx-auto -mt-5 h-5 w-5 rounded-t bg-gray-900" />
          <div className="mx-auto mt-5 h-8 w-4 rounded-full bg-white/25" />
        </div>
        <div className={`h-14 w-16 rounded-2xl bg-gradient-to-br ${p} shadow-lg`}>
          <div className="mx-auto mt-3 h-3 w-10 rounded-full bg-white/35" />
        </div>
      </div>
    </div>
  )
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, badge, nowMs, priority = false, onAuthRequired }) {
  const { t } = useTranslation()
  const { addItem, updateQuantity, items } = useCartStore()
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showImageLoader, setShowImageLoader] = useState(false)
  const cartItem = items.find((i) => i.product?.id === product.id)
  const qty = cartItem?.quantity || 0
  const available = isAvailableForSale(product)

  const currentPrice = Number(product.display_price || product.retail_price || 0)
  const oldPrice = Number(product.old_price || 0)
  const discountPct = oldPrice > currentPrice
    ? Math.round((1 - currentPrice / oldPrice) * 100)
    : null
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired('cart')
      return
    }
    addItem(saleProduct, 1)
    showCartAddedToast(saleProduct, navigate)
  }
  const handleIncrease = (e) => { 
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired('cart')
      return
    }
    addItem(saleProduct, 1) 
  }
  const handleDecrease = (e) => { 
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired('cart')
      return
    }
    updateQuantity(product.id, qty - 1) 
  }
  useEffect(() => {
    setImageLoaded(false)
    setImageFailed(false)
    setShowImageLoader(false)
    if (!product.primary_image) return undefined
    const timer = setTimeout(() => setShowImageLoader(true), 350)
    return () => clearTimeout(timer)
  }, [product.primary_image])

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition active:scale-[0.98] md:hover:-translate-y-1 md:hover:shadow-soft"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {/* Badges */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
        {badge && (
          <span className="rounded-full bg-pink-600 px-2 py-1 text-xs font-black tracking-wide text-white shadow-sm">{badge}</span>
        )}
        {discountPct && (
          <span className="rounded-full bg-pink-600 px-3.5 py-1.5 text-xs font-black leading-none text-white shadow-lg shadow-pink-200 ring-2 ring-white">-{discountPct}%</span>
        )}
      </div>
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.primary_image && !imageFailed ? (
          <>
            {!imageLoaded && showImageLoader && <ProductImageLoading />}
            <img
              src={product.primary_image}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03]"
              loading={priority ? 'eager' : 'lazy'}
              fetchpriority={priority ? 'high' : 'auto'}
              decoding="async"
            />
          </>
        ) : (
          <ProductImageFallback />
        )}
      </div>
      {/* Info */}
      <div className="flex min-h-0 flex-col p-3 sm:min-h-[166px]">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-gray-400">{product.brand_name || t('product.noBrand')}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-500">
            <Star size={13} className="fill-yellow-400 text-yellow-400" />{product.rating > 0 ? product.rating : '4.8'} <span className="text-gray-300">(126)</span>
          </span>
        </div>
        <div className="mt-1 flex min-w-0 items-start justify-between gap-2">
          <h3 className="khmer-title line-clamp-2 min-w-0 flex-1 text-sm text-gray-950">{product.name}</h3>
          <div className="shrink-0 text-right">
            <span className="text-base font-black leading-none text-pink-600">{formatCurrency(currentPrice)}</span>
            {oldPrice > currentPrice && <span className="mt-1 flex flex-wrap items-center justify-end gap-1.5"><span className="text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span><span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold leading-4 text-pink-600">{t('product.saveAmount', { amount: formatCurrency(oldPrice - currentPrice) })}</span></span>}
          </div>
        </div>
        <FlashSaleTimer item={product} nowMs={nowMs} />
        <div className="mt-3 pt-1 sm:mt-auto sm:pt-3">
          <ProductCardButton
            available={available}
            qty={qty}
            onAdd={handleAdd}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            addLabel={t('common.add')}
            addToCartLabel={t('common.addToCart')}
            soldOutLabel={t('common.soldOut')}
          />
        </div>
      </div>
    </article>
  )
}

// ─── Flash sale card ──────────────────────────────────────────────────────────
// ─── Home ─────────────────────────────────────────────────────────────────────
function CardBackdrop({ imageUrl, tintClass }) {
  if (!imageUrl) return null
  return (
    <>
      <img src={imageUrl} alt="" className="absolute inset-0 z-0 h-full w-full object-cover" />
      <div className={`absolute inset-0 z-[1] ${tintClass}`} />
    </>
  )
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pendingWelcomeBonus = useAuthStore((s) => s.pendingWelcomeBonus)
  const clearPendingWelcomeBonus = useAuthStore((s) => s.clearPendingWelcomeBonus)
  const { openAuthModal } = useUiStore()
  const [showWelcomeBonus, setShowWelcomeBonus] = useState(false)
  const [bonusPoints, setBonusPoints] = useState(0)

  useEffect(() => {
    if (pendingWelcomeBonus) {
      setBonusPoints(pendingWelcomeBonus)
      setShowWelcomeBonus(true)
      clearPendingWelcomeBonus()
    }
  }, [pendingWelcomeBonus, clearPendingWelcomeBonus])

  const [nowMs, setNowMs] = useState(Date.now())
  const [categoryPage, setCategoryPage] = useState(0)
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const categoryScrollRef = useRef(null)
  const bannerScrollRef = useRef(null)
  const bannerScrollRaf = useRef(0)
  const bannerIgnoreScrollRef = useRef(false)
  const bannerResumeTimerRef = useRef(0)
  const bannerPausedRef = useRef(false)
  const flashSaleScrollRef = useRef(null)
  const refreshStart = useRef({ x: 0, y: 0 })

  // ── Queries (one round-trip for OVH VPS home) ───────────────────────────────
  const {
    data: homeData,
    isLoading: homeLoading,
    refetch: refetchHome,
  } = useQuery({
    queryKey: ['home-feed'],
    queryFn: () => productsApi.home.feed().then((r) => r.data),
    ...HOME_QUERY_OPTIONS,
  })
  const {
    data: directFlashData = [],
    isLoading: directFlashLoading,
  } = useQuery({
    queryKey: ['home-flash-sale-fallback'],
    queryFn: () => productsApi.products.list({
      is_featured: true,
      is_active: true,
      page_size: 24,
    }).then((r) => (r.data.results || r.data || []).filter((item) => isVisibleFlashSaleItem(item)).slice(0, 10)),
    enabled: !homeLoading && (homeData?.flash_sale?.length || 0) === 0,
    ...STOREFRONT_LIVE_QUERY,
  })
  const bannersData = homeData?.banners
  const categoriesData = homeData?.categories
  const brandsData = homeData?.brands
  const bestSellerData = homeData?.best_sellers
  const flashData = homeData?.flash_sale
  const newArrivalData = homeData?.new_arrivals
  const showBestSkeleton = homeLoading && !bestSellerData
  const showFlashSkeleton = (homeLoading && !flashData) || directFlashLoading
  const showNewSkeleton = homeLoading && !newArrivalData
  const banners = useMemo(() => bannersData || [], [bannersData])
  const sideCards = homeData?.side_cards || {}
  const categories = useMemo(() => categoriesData || [], [categoriesData])
  const brands = useMemo(() => brandsData || [], [brandsData])
  const bestSellers = useMemo(() => bestSellerData || [], [bestSellerData])
  const flashSale = useMemo(() => {
    const source = flashData?.length ? flashData : directFlashData
    return source.filter((item) => isVisibleFlashSaleItem(item, nowMs))
  }, [flashData, directFlashData, nowMs])
  const newArrivals = useMemo(() => newArrivalData || [], [newArrivalData])
  const hasVisibleFlashSaleTimers = useMemo(
    () => [...flashSale, ...bestSellers, ...newArrivals].some(hasFlashSaleTimer),
    [flashSale, bestSellers, newArrivals],
  )
  const flashSaleSectionTimer = useMemo(
    () => getFlashSaleSectionTimer(flashSale, nowMs),
    [flashSale, nowMs],
  )
  const flashSaleSectionTimerParts = useMemo(
    () => flashSaleSectionTimer?.value?.split(/[: ]/) || [],
    [flashSaleSectionTimer],
  )

  const categoryItems = useMemo(() => categories
    .filter((cat) => !cat.parent)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      path: `/shop?category=${cat.id}`,
      imageUrl: cat.image_url || null,
      icon: iconForCategory(cat.name),
      bg: '#F3F4F6',
      color: '#475569',
    })), [categories])

  const categoryPages = Math.max(1, Math.ceil(categoryItems.length / 10))

  const pauseBannerAutoplay = () => {
    bannerPausedRef.current = true
    if (bannerResumeTimerRef.current) window.clearTimeout(bannerResumeTimerRef.current)
    bannerResumeTimerRef.current = window.setTimeout(() => {
      bannerPausedRef.current = false
    }, 4500)
  }

  const getBannerStep = (track) => {
    const first = track?.children?.[0]
    const second = track?.children?.[1]
    if (!first) return track?.clientWidth || 1
    if (!second) return first.getBoundingClientRect().width || track.clientWidth || 1
    // Includes gap between slides (12px mobile / 18px desktop)
    return second.offsetLeft - first.offsetLeft
  }

  const scrollToBanner = (index, behavior = 'smooth') => {
    const track = bannerScrollRef.current
    if (!track || banners.length === 0) return
    const next = ((index % banners.length) + banners.length) % banners.length
    bannerIgnoreScrollRef.current = true
    setActiveBannerIndex(next)
    track.scrollTo({ left: next * getBannerStep(track), behavior })
    window.setTimeout(() => {
      bannerIgnoreScrollRef.current = false
    }, behavior === 'smooth' ? 500 : 40)
  }

  useEffect(() => {
    setActiveBannerIndex(0)
    if (bannerScrollRef.current) bannerScrollRef.current.scrollLeft = 0
  }, [banners.length])

  useEffect(() => {
    banners.forEach((banner, index) => {
      if (!banner?.image_url || index > 4) return
      const img = new Image()
      img.src = banner.image_url
    })
  }, [banners])

  useEffect(() => {
    if (banners.length < 2) return undefined
    const interval = window.setInterval(() => {
      if (bannerPausedRef.current) return
      setActiveBannerIndex((current) => {
        const next = (current + 1) % banners.length
        const track = bannerScrollRef.current
        if (track) {
          bannerIgnoreScrollRef.current = true
          track.scrollTo({ left: next * getBannerStep(track), behavior: 'smooth' })
          window.setTimeout(() => {
            bannerIgnoreScrollRef.current = false
          }, 500)
        }
        return next
      })
    }, 4500)
    return () => window.clearInterval(interval)
  }, [banners.length])

  useEffect(() => () => {
    if (bannerResumeTimerRef.current) window.clearTimeout(bannerResumeTimerRef.current)
  }, [])

  useEffect(() => {
    if (!hasVisibleFlashSaleTimers) return undefined
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [hasVisibleFlashSaleTimers])

  const handleBannerScroll = () => {
    const track = bannerScrollRef.current
    if (!track || banners.length === 0 || bannerIgnoreScrollRef.current) return
    if (bannerScrollRaf.current) cancelAnimationFrame(bannerScrollRaf.current)
    bannerScrollRaf.current = requestAnimationFrame(() => {
      const step = getBannerStep(track)
      const index = Math.round(track.scrollLeft / step)
      const clamped = Math.min(banners.length - 1, Math.max(0, index))
      setActiveBannerIndex((current) => (current === clamped ? current : clamped))
    })
  }

  const handleBannerPointerDown = () => {
    pauseBannerAutoplay()
  }

  const scrollFlashSale = (direction) => {
    const el = flashSaleScrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.85), behavior: 'smooth' })
  }

  // ── Banner auto-slide ──────────────────────────────────────────────────────
  // ── Pull to refresh ────────────────────────────────────────────────────────
  const refreshProgress = Math.min(1, pullDistance / 76)
  const refreshLabel = isRefreshing ? t('home.refreshing') : refreshProgress >= 1 ? t('home.releaseToRefresh') : t('home.pullToRefresh')

  const refreshHome = async () => {
    setIsRefreshing(true)
    setPullDistance(78)
    try {
      await refetchHome()
    } finally {
      setTimeout(() => { setIsRefreshing(false); setIsPulling(false); setPullDistance(0) }, 350)
    }
  }

  const handleTouchStart = (e) => {
    if (isRefreshing) return
    const t = e.touches[0]
    refreshStart.current = { x: t.clientX, y: t.clientY }
  }
  const handleTouchMove = (e) => {
    if (isRefreshing || window.scrollY > 2) return
    const t = e.touches[0]
    const dy = t.clientY - refreshStart.current.y
    const dx = Math.abs(t.clientX - refreshStart.current.x)
    if (dy <= 0 || dx > dy) return
    const d = Math.min(92, dy * 0.5)
    setIsPulling(d > 8)
    setPullDistance(d)
  }
  const handleTouchEnd = () => {
    if (isRefreshing) return
    if (pullDistance >= 76) { refreshHome(); return }
    setIsPulling(false)
    setPullDistance(0)
  }

  return (
    <div
      className="relative min-h-screen bg-gray-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehaviorY: 'contain' }}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="pointer-events-none fixed left-1/2 top-[calc(0.5rem+env(safe-area-inset-top))] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-black text-pink-600 shadow-lg transition-all duration-200 md:hidden"
        style={{
          opacity: isPulling || isRefreshing ? 1 : 0,
          transform: `translate(-50%, ${Math.max(0, pullDistance - 28)}px) scale(${0.9 + refreshProgress * 0.1})`,
        }}
      >
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} style={{ transform: `rotate(${refreshProgress * 180}deg)` }} />
        {refreshLabel}
      </div>

      <div
        className="mx-auto max-w-[1500px] transition-transform duration-200"
        style={{ transform: isPulling || isRefreshing ? `translateY(${Math.min(pullDistance, 78)}px)` : 'translateY(0)' }}
      >

        {/* ════════════════════════════════════════════
            CATEGORIES
        ════════════════════════════════════════════ */}
        {categoryItems.length > 0 && (
          <div className="bg-white">
            <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4 md:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm shadow-pink-100">
                  <ShoppingBag size={14} strokeWidth={2.5} />
                </span>
                <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('home.categories')}</h2>
              </div>
              <Link to="/shop" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                {t('common.all')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>
            <div
              ref={categoryScrollRef}
              onScroll={() => {
                const el = categoryScrollRef.current
                if (el) setCategoryPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
              }}
              className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {Array.from({ length: categoryPages }).map((_, pi) => (
                <div key={pi} className="grid w-full shrink-0 snap-start grid-cols-5 gap-y-3 px-4 py-3 sm:gap-y-4 md:grid-cols-10 md:px-6">
                  {categoryItems.slice(pi * 10, pi * 10 + 10).map((cat) => {
                    const Icon = cat.icon
                    return (
                      <Link 
                        key={cat.id} 
                        to={cat.path} 
                        className="group flex flex-col items-center gap-2 transition-all active:scale-95 md:hover:-translate-y-1.5"
                      >
                        <div
                          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-sm transition-all duration-300 group-hover:rounded-3xl group-hover:shadow-md md:h-16 md:w-16 lg:h-18 lg:w-18 ring-1 ring-black/5"
                          style={{ backgroundColor: cat.bg }}
                        >
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
                          ) : cat.isNew ? (
                            <span className="text-[10px] font-black tracking-wider md:text-xs" style={{ color: cat.color }}>NEW</span>
                          ) : (
                            <Icon size={20} className="transition-transform duration-300 group-hover:scale-110 md:h-7 md:w-7" style={{ color: cat.color }} />
                          )}
                        </div>
                        <p className="khmer-title line-clamp-2 max-w-[65px] text-center text-[10px] text-gray-800 transition-colors group-hover:text-pink-600 md:max-w-[85px] md:text-xs">
                          {cat.name}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
            {categoryPages > 1 && (
              <div className="flex justify-center gap-1.5 pb-3">
                {Array.from({ length: categoryPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => categoryScrollRef.current?.scrollTo({ left: i * categoryScrollRef.current.clientWidth, behavior: 'smooth' })}
                    className={`h-1.5 rounded-full transition-all ${i === categoryPage ? 'w-5 bg-pink-600' : 'w-1.5 bg-gray-200'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-2 bg-gray-50" />

        {banners.length > 0 && (
          <section className="bg-white pb-4 pt-4">
            <div className="mb-3 flex items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-100 text-sm shadow-sm shadow-pink-100">
                  🎁
                </span>
                <h2 className="text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('nav.promotions')}</h2>
              </div>
              <Link
                to="/shop"
                aria-label="View all promotions"
                className="flex items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95"
              >
                {t('common.viewAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>

            {/* Concept 2 Layout: Responsive Desktop Split Grid (Slider + Side Quick Cards) */}
            <div className="px-4 md:px-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
                
                {/* Left/Main Track Container (Full Carousel) */}
                <div className="relative group lg:col-span-8 xl:col-span-9">
                  {/* Desktop Chevron Left Button */}
                  {banners.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        pauseBannerAutoplay()
                        scrollToBanner((activeBannerIndex - 1 + banners.length) % banners.length)
                      }}
                      aria-label="Previous Banner"
                      className="hidden lg:flex absolute left-3 top-1/2 z-20 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md backdrop-blur-md transition-all hover:bg-white hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft size={20} strokeWidth={2.5} />
                    </button>
                  )}

                  {/* Desktop Chevron Right Button */}
                  {banners.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        pauseBannerAutoplay()
                        scrollToBanner((activeBannerIndex + 1) % banners.length)
                      }}
                      aria-label="Next Banner"
                      className="hidden lg:flex absolute right-3 top-1/2 z-20 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md backdrop-blur-md transition-all hover:bg-white hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight size={20} strokeWidth={2.5} />
                    </button>
                  )}

                  {/* Banner Scroll Track */}
                  <div
                    ref={bannerScrollRef}
                    onScroll={handleBannerScroll}
                    onPointerDown={handleBannerPointerDown}
                    onTouchStart={handleBannerPointerDown}
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth lg:gap-4 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
                    style={{ scrollPaddingInline: 0 }}
                  >
                    {banners.map((banner, idx) => (
                      <Link
                        key={banner.id}
                        to={banner.button_link || '/shop'}
                        className="group/item block w-[90%] min-w-[90%] shrink-0 snap-start lg:w-full lg:min-w-full"
                      >
                        <div className="aspect-[2/1] w-full overflow-hidden rounded-[22px] bg-pink-50 shadow-[0_2px_14px_rgba(15,23,42,0.08)] transition duration-300 group-active/item:scale-[0.995] md:rounded-[28px]">
                          {banner.image_url ? (
                            <img
                              src={banner.image_url}
                              alt={banner.title || 'Promotion'}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                              loading={idx === 0 ? 'eager' : 'lazy'}
                              decoding="async"
                              fetchpriority={idx === 0 ? 'high' : 'auto'}
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600">
                              <ShoppingBag size={44} className="mb-2 text-white/50" />
                              {banner.title && <p className="px-4 text-center text-lg font-black text-white md:text-xl">{banner.title}</p>}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Active Indicator Dots */}
                  {banners.length > 1 && (
                    <div className="mt-3 flex justify-center gap-1.5">
                      {banners.map((banner, i) => (
                        <button
                          key={banner.id}
                          type="button"
                          onClick={() => {
                            pauseBannerAutoplay()
                            scrollToBanner(i)
                          }}
                          aria-label={`Go to promotion ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all duration-300 ${i === activeBannerIndex ? 'w-5 bg-pink-600' : 'w-1.5 bg-gray-200 hover:bg-gray-300'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side Quick Cards (Desktop Only - Concept 2 Feature) */}
                <div className="hidden lg:flex lg:col-span-4 lg:flex-col lg:gap-3.5 xl:col-span-3">
                  
                  {/* Card 1: Live Flash Deals */}
                  <Link
                    to="/shop?filter=flash_sale"
                    className={`group relative flex flex-1 flex-col justify-between overflow-hidden rounded-[24px] p-5 text-white shadow-lg shadow-pink-200/50 transition hover:shadow-xl hover:shadow-pink-300/60 active:scale-[0.99] ${sideCards.flash_sale_background ? 'bg-pink-700' : 'bg-gradient-to-br from-pink-600 via-rose-500 to-pink-700'}`}
                  >
                    <CardBackdrop imageUrl={sideCards.flash_sale_background} tintClass="bg-gradient-to-t from-pink-950/70 via-rose-900/25 to-pink-950/20" />
                    <div className="absolute -right-4 -top-4 z-[2] h-24 w-24 rounded-full bg-white/10 blur-xl transition group-hover:scale-125" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md">
                          <Zap size={13} className="fill-yellow-300 text-yellow-300" />
                          <span>Flash Sale</span>
                        </span>
                        <ChevronRight size={16} className="text-white/70 transition group-hover:translate-x-1" />
                      </div>
                      <h3 className="mt-3 text-lg font-black leading-snug">Limited Time Offers</h3>
                      <p className="mt-1 text-xs text-pink-100">Save up to 50% on top cosmetics brands</p>
                    </div>

                    <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                      <span className="text-xs font-bold text-white/90">Shop Deals</span>
                      <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-pink-600 shadow-sm transition group-hover:bg-pink-50">
                        Explore →
                      </span>
                    </div>
                  </Link>

                  {/* Card 2: VIP Rewards & Point Exchange */}
                  <Link
                    to="/profile/rewards"
                    className={`group relative flex flex-1 flex-col justify-between overflow-hidden rounded-[24px] p-5 text-white shadow-lg shadow-indigo-200/50 transition hover:shadow-xl hover:shadow-indigo-300/60 active:scale-[0.99] ${sideCards.rewards_background ? 'bg-indigo-950' : 'bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900'}`}
                  >
                    <CardBackdrop imageUrl={sideCards.rewards_background} tintClass="bg-gradient-to-t from-slate-950/75 via-indigo-950/30 to-indigo-950/15" />
                    <div className="absolute -right-4 -bottom-4 z-[2] h-24 w-24 rounded-full bg-purple-500/20 blur-xl transition group-hover:scale-125" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider backdrop-blur-md">
                          <Gift size={13} className="text-pink-300" />
                          <span>VIP Rewards</span>
                        </span>
                        <ChevronRight size={16} className="text-white/70 transition group-hover:translate-x-1" />
                      </div>
                      <h3 className="mt-3 text-lg font-black leading-snug">VIP Rewards & Points</h3>
                      <p className="mt-1 text-xs text-indigo-200">Redeem points for exclusive cosmetics & vouchers</p>
                    </div>

                    <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                      <span className="text-xs font-bold text-white/90">Claim Rewards</span>
                      <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-indigo-900 shadow-sm transition group-hover:bg-indigo-50">
                        Redeem Now →
                      </span>
                    </div>
                  </Link>

                </div>

              </div>
            </div>
          </section>
        )}

        <div className="h-2 bg-gray-50" />
        {(showFlashSkeleton || flashSale.length > 0) && (
          <div className="bg-white px-4 pb-4 pt-4 md:px-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm shadow-pink-100">
                    <Zap size={14} className="fill-pink-600" strokeWidth={2.5} />
                  </span>
                  <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('home.flashSale')}</h2>
                  {flashSaleSectionTimer && (
                    <div className="hidden items-center gap-1 sm:flex">
                      <span className="text-[11px] font-black text-pink-600">{flashSaleSectionTimer.label}</span>
                      {flashSaleSectionTimerParts.map((v, i) => (
                        <span key={`${v}-${i}`} className="flex items-center">
                          <span className="flex h-[22px] min-w-[24px] items-center justify-center rounded-md bg-gray-900 px-1 text-[11px] font-black tabular-nums text-white">
                            {v}
                          </span>
                          {i < flashSaleSectionTimerParts.length - 1 && <span className="mx-0.5 text-xs font-black text-gray-400">:</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {flashSaleSectionTimer && (
                  <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-pink-100">
                    <div className="h-full rounded-full bg-pink-600 transition-all" style={{ width: `${flashSaleSectionTimer.progress}%` }} />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {flashSale.length > 1 && (
                  <div className="hidden items-center gap-1 sm:flex">
                    <button
                      type="button"
                      onClick={() => scrollFlashSale(-1)}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-gray-100 bg-white text-gray-700 shadow-sm transition hover:border-pink-100 hover:text-pink-600 active:scale-95"
                      aria-label="Scroll flash sale left"
                    >
                      <ChevronLeft size={16} strokeWidth={2.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollFlashSale(1)}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-gray-100 bg-white text-gray-700 shadow-sm transition hover:border-pink-100 hover:text-pink-600 active:scale-95"
                      aria-label="Scroll flash sale right"
                    >
                      <ChevronRight size={16} strokeWidth={2.6} />
                    </button>
                  </div>
                )}
                <Link to="/shop?filter=flash_sale" className="flex items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                  {t('common.seeAll')} <ChevronRight size={13} strokeWidth={3} />
                </Link>
              </div>
            </div>
            <div
              ref={flashSaleScrollRef}
              className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 scroll-smooth [scrollbar-width:none] md:-mx-6 md:gap-4 md:px-6 [&::-webkit-scrollbar]:hidden"
            >
              {showFlashSkeleton
                ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-[calc((100vw-3rem)/2)] min-w-[168px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card sm:w-[240px] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
                    <div className="aspect-square animate-pulse bg-gray-100" />
                    <div className="space-y-2 p-3">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
                      <div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" />
                    </div>
                  </div>
                ))
                : flashSale.map((p, i) => (
                  <div key={p.id} className="w-[calc((100vw-3rem)/2)] min-w-[168px] shrink-0 snap-start sm:w-[240px] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
                    <ProductCard 
                      product={p} 
                      nowMs={nowMs} 
                      onAuthRequired={(type) => openAuthModal(type)}
                    />
                  </div>
                ))
              }
            </div>
          </div>
        )}

        <div className="h-2 bg-gray-50" />

        {/* ════════════════════════════════════════════
            SHOP BY BRAND
        ════════════════════════════════════════════ */}
        {brands.length > 0 && (
          <div className="bg-white px-4 pb-4 pt-3.5 md:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm shadow-pink-100">
                  <Sparkles size={14} strokeWidth={2.5} />
                </span>
                <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('home.shopByBrand')}</h2>
              </div>
              <Link to="/shop" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                {t('common.viewAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>
            {/* Desktop Responsive Grid (md: and lg: screens) */}
            <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-4">
              {brands.slice(0, 12).map((brand) => (
                <Link
                  key={brand.id}
                  to={`/shop?brand=${brand.id}`}
                  className="group flex min-w-0 items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-pink-300 hover:bg-pink-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-100 bg-white p-1">
                    <BrandLogo brand={brand} size="lg" className="h-full w-full rounded-full ring-0 [&>img]:rounded-full [&>img]:object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-semibold leading-6 text-gray-900 transition-colors group-hover:text-pink-600">
                      {brand.name}
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-gray-400 group-hover:text-pink-600" aria-hidden="true" />
                </Link>
              ))}
            </div>

            <ShopByBrandCarousel brands={brands} />
          </div>
        )}

        <div className="h-2 bg-gray-50" />

        {/* ════════════════════════════════════════════
            BEST SELLERS
        ════════════════════════════════════════════ */}
        {(showBestSkeleton || bestSellers.length > 0) && (
          <div className="bg-white px-4 pb-4 pt-4 md:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500 shadow-sm shadow-amber-100">
                  <Star size={14} className="fill-amber-500" strokeWidth={2.5} />
                </span>
                <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('home.bestSellers')}</h2>
              </div>
              <Link to="/shop?filter=best_seller" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                {t('common.seeAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {showBestSkeleton
                ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"><div className="aspect-square animate-pulse bg-gray-100" /><div className="space-y-2 p-3"><div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" /><div className="h-5 w-16 animate-pulse rounded bg-gray-100" /><div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" /></div></div>)
                : bestSellers.slice(0, 12).map((p, i) => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    badge={t('home.bestBadge')} 
                    nowMs={nowMs} 
                    priority={i < 4} 
                    onAuthRequired={(type) => openAuthModal(type)}
                  />
                ))
              }
            </div>
          </div>
        )}

        <div className="h-2 bg-gray-50" />

        {/* ════════════════════════════════════════════
            NEW ARRIVALS
        ════════════════════════════════════════════ */}
        {(showNewSkeleton || newArrivals.length > 0) && (
          <div className="bg-white px-4 pb-5 pt-4 md:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 shadow-sm shadow-green-100">
                  <Gift size={14} strokeWidth={2.5} />
                </span>
                <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('home.newArrivals')}</h2>
              </div>
              <Link to="/shop?filter=new_arrival" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                {t('common.seeAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {showNewSkeleton
                ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"><div className="aspect-square animate-pulse bg-gray-100" /><div className="space-y-2 p-3"><div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" /><div className="h-5 w-16 animate-pulse rounded bg-gray-100" /><div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" /></div></div>)
                : newArrivals.slice(0, 12).map((p, i) => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    badge={t('common.new')} 
                    nowMs={nowMs} 
                    priority={i < 4} 
                    onAuthRequired={(type) => openAuthModal(type)}
                  />
                ))
              }
            </div>
          </div>
        )}

        <div className="h-4 bg-gray-50" />
      </div>

      <WelcomeBonusModal
         isOpen={showWelcomeBonus}
         onClose={() => setShowWelcomeBonus(false)}
         points={bonusPoints}
         onStartShopping={() => setShowWelcomeBonus(false)}
         onViewPoints={() => {
           setShowWelcomeBonus(false)
           navigate('/profile/rewards/history')
         }}
       />
    </div>
  )
}
