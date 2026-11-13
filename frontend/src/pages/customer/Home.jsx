import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Star, ShoppingBag,
  Gift, Brush, Droplet, SprayCan, RefreshCw, Zap,
  Sparkles, Clock3,
} from 'lucide-react'
import { productsApi } from '@/api/products'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import { formatCurrency } from '@/utils/helpers'
import { formatFlashSaleCountdown, getFlashSaleTimerState, hasFlashSaleTimer, isVisibleFlashSaleItem } from '@/utils/flashSale'
import useCartStore from '@/store/cartStore'
import { ProductImageAddButton } from '@/components/customer/CustomerUi'
import { showCartAddedToast, handleCartAdd } from '@/components/customer/CartAddedToast'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import WelcomeBonusModal from '@/components/rewards/WelcomeBonusModal'
import VideoHighlightsSection from '@/components/customer/VideoHighlightsSection'

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

const BrandCarousel = memo(function BrandCarousel({ brands }) {
  const trackRef = useRef(null)
  const pausedRef = useRef(false)
  const resumeTimerRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false })

  const shouldLoop = brands.length > 0
  const items = useMemo(() => {
    if (brands.length === 0) return []
    const minCards = 18
    let repeatCount = Math.max(2, Math.ceil(minCards / brands.length))
    if (repeatCount % 2 !== 0) repeatCount += 1
    return Array.from({ length: repeatCount }, () => brands).flat()
  }, [brands])

  const pauseTemporarily = useCallback((delayMs = 1500) => {
    pausedRef.current = true
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false
    }, delayMs)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track || !shouldLoop) return

    let rafId = 0
    let lastTime = performance.now()

    const tick = (now) => {
      const dt = Math.min(now - lastTime, 64)
      lastTime = now

      if (!pausedRef.current && track.scrollWidth > track.clientWidth) {
        track.scrollLeft += (dt / 16.67) * 0.55
        const half = track.scrollWidth / 2
        if (track.scrollLeft >= half) {
          track.scrollLeft -= half
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [shouldLoop, brands.length])

  const handlePointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const track = trackRef.current
    if (!track) return
    pausedRef.current = true
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: track.scrollLeft,
      moved: false,
    }
  }

  const handlePointerMove = (e) => {
    const drag = dragRef.current
    const track = trackRef.current
    if (!drag.active || !track) return
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 5) drag.moved = true
    track.scrollLeft = drag.startScroll - dx
  }

  const handlePointerUp = () => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    pauseTemporarily(1400)
  }

  const handleScroll = () => {
    const track = trackRef.current
    if (!track || !shouldLoop) return
    const half = track.scrollWidth / 2
    if (half > 0 && track.scrollLeft >= half) {
      track.scrollLeft -= half
    }
  }

  return (
    <div
      ref={trackRef}
      onMouseEnter={() => {
        pausedRef.current = true
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      }}
      onMouseLeave={() => {
        if (!dragRef.current.active) {
          pausedRef.current = false
        }
      }}
      onTouchStart={() => {
        pausedRef.current = true
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      }}
      onTouchEnd={() => pauseTemporarily(1500)}
      onTouchCancel={() => pauseTemporarily(1500)}
      onWheel={() => pauseTemporarily(1500)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onScroll={handleScroll}
      onClickCapture={(e) => {
        if (dragRef.current.moved) {
          e.preventDefault()
          e.stopPropagation()
          dragRef.current.moved = false
        }
      }}
      className="-mx-4 flex cursor-grab select-none gap-3 overflow-x-auto px-4 py-1.5 active:cursor-grabbing [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
    >
      {items.map((brand, idx) => {
        const logoUrl = brand?.logo_url || brand?.logo
        const initials = brand?.name
          ? brand.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
          : '?'
        return (
          <Link
            key={`${brand.id}-${idx}`}
            to={`/shop?brand=${brand.id}`}
            draggable={false}
            className="group flex w-[94px] shrink-0 flex-col items-center rounded-2xl border border-gray-100 bg-white px-2.5 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition hover:border-pink-200 hover:shadow-md sm:w-[108px] md:w-[118px]"
          >
            <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded-xl sm:h-14">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brand.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="max-h-full max-w-full rounded-xl object-contain"
                />
              ) : (
                <span className="text-sm font-black tracking-wide text-pink-600">{initials}</span>
              )}
            </div>
            <p className="mt-2 w-full truncate text-center text-xs font-bold text-gray-800 transition-colors group-hover:text-pink-600 sm:text-[13px]">
              {brand.name}
            </p>
          </Link>
        )
      })}
    </div>
  )
})

function ProductImageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">
      <ShoppingBag size={30} />
    </div>
  )
}

// ─── Countdown to midnight ────────────────────────────────────────────────────
function FlashSaleTimer({ item, compact = false }) {
  const hasTimer = hasFlashSaleTimer(item)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!hasTimer) return undefined
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasTimer])

  if (!hasTimer) return null
  const timer = getFlashSaleTimerState(item, nowMs)
  if (!timer?.value) return null

  return (
    <div className={`mt-2 flex w-fit items-center gap-1 rounded-lg bg-pink-50 px-2 py-1 font-black leading-none text-pink-600 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
      <Clock3 size={compact ? 11 : 12} />
      <span>{timer.label} {timer.value}</span>
    </div>
  )
}

function FlashSaleSectionTimerBadge({ flashSale }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const hasAnyTimer = useMemo(() => flashSale.some(hasFlashSaleTimer), [flashSale])

  useEffect(() => {
    if (!hasAnyTimer) return undefined
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasAnyTimer])

  const timer = useMemo(() => getFlashSaleSectionTimer(flashSale, nowMs), [flashSale, nowMs])
  const parts = useMemo(() => timer?.value?.split(/[: ]/) || [], [timer])

  if (!timer) return null

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <span className="text-[11px] font-black text-pink-600">{timer.label}</span>
      {parts.map((v, i) => (
        <span key={`${v}-${i}`} className="flex items-center">
          <span className="flex h-[22px] min-w-[24px] items-center justify-center rounded-md bg-gray-900 px-1 text-[11px] font-black tabular-nums text-white">
            {v}
          </span>
          {i < parts.length - 1 && <span className="mx-0.5 text-xs font-black text-gray-400">:</span>}
        </span>
      ))}
    </div>
  )
}

function FlashSaleSectionProgressBar({ flashSale }) {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const hasAnyTimer = useMemo(() => flashSale.some(hasFlashSaleTimer), [flashSale])

  useEffect(() => {
    if (!hasAnyTimer) return undefined
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [hasAnyTimer])

  const timer = useMemo(() => getFlashSaleSectionTimer(flashSale, nowMs), [flashSale, nowMs])

  if (!timer) return null

  return (
    <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-pink-100">
      <div className="h-full rounded-full bg-pink-600 transition-all" style={{ width: `${timer.progress}%` }} />
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
const ProductCard = memo(function ProductCard({ product, badge, priority = false, onAuthRequired }) {
  const { t } = useTranslation()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const qty = useCartStore((s) => {
    const item = s.items.find((i) => (i.product?.cart_key || i.product?.id) === (product.cart_key || product.id))
    return item?.quantity || 0
  })
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showImageLoader, setShowImageLoader] = useState(false)
  const available = isAvailableForSale(product)

  const currentPrice = Number(product.display_price || product.retail_price || 0)
  const oldPrice = Number(product.old_price || 0)
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    handleCartAdd(addItem, saleProduct, navigate, 1)
  }
  const handleIncrease = (e) => { 
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    handleCartAdd(addItem, saleProduct, navigate, 1)
  }
  const handleDecrease = (e) => { 
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
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
      {badge && (
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
          <span className="rounded-full bg-pink-600 px-2 py-1 text-xs font-black tracking-wide text-white shadow-sm">{badge}</span>
        </div>
      )}
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
              className="absolute inset-0 h-full w-full object-contain p-1 transition duration-300 group-hover:scale-[1.03] sm:p-2"
              loading={priority ? 'eager' : 'lazy'}
              fetchpriority={priority ? 'high' : 'auto'}
              decoding="async"
            />
          </>
        ) : (
          <ProductImageFallback />
        )}
        <ProductImageAddButton
          available={available}
          qty={qty}
          onAdd={handleAdd}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          soldOutLabel={t('common.soldOut')}
        />
      </div>
      {/* Info */}
      <div className="flex min-h-0 flex-col p-2.5 sm:p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-gray-400">{product.brand_name || t('product.noBrand')}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-500">
            <Star size={13} className="fill-yellow-400 text-yellow-400" />{product.rating > 0 ? product.rating : '4.8'} <span className="text-gray-300">(126)</span>
          </span>
        </div>
        <h3 className="khmer-title mt-1 line-clamp-2 text-sm text-gray-950">{product.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-base font-black leading-none text-pink-600">{formatCurrency(currentPrice)}</span>
          {oldPrice > currentPrice && (
            <>
              <span className="text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
              <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold leading-4 text-pink-600">
                {t('product.saveAmount', { amount: formatCurrency(oldPrice - currentPrice) })}
              </span>
            </>
          )}
        </div>
        <FlashSaleTimer item={product} />
      </div>
    </article>
  )
})

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
  const openAuthModal = useUiStore((s) => s.openAuthModal)
  const handleAuthRequired = useCallback((type) => openAuthModal(type), [openAuthModal])
  const [showWelcomeBonus, setShowWelcomeBonus] = useState(false)
  const [bonusPoints, setBonusPoints] = useState(0)

  useEffect(() => {
    if (pendingWelcomeBonus) {
      setBonusPoints(pendingWelcomeBonus)
      setShowWelcomeBonus(true)
      clearPendingWelcomeBonus()
    }
  }, [pendingWelcomeBonus, clearPendingWelcomeBonus])

  const [categoryPage, setCategoryPage] = useState(0)
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [activeFlashIndex, setActiveFlashIndex] = useState(0)
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
  const flashSaleScrollRaf = useRef(0)
  const bestSellerScrollRef = useRef(null)
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
  const showFlashCard = sideCards.flash_sale_enabled !== false
  const showRewardsCard = sideCards.rewards_enabled !== false
  const hasAnySideCard = showFlashCard || showRewardsCard
  const categories = useMemo(() => categoriesData || [], [categoriesData])
  const brands = useMemo(() => brandsData || [], [brandsData])
  const bestSellers = useMemo(() => bestSellerData || [], [bestSellerData])
  const flashSale = useMemo(() => {
    const source = flashData?.length ? flashData : directFlashData
    return source.filter((item) => isVisibleFlashSaleItem(item))
  }, [flashData, directFlashData])
  const newArrivals = useMemo(() => newArrivalData || [], [newArrivalData])

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

  const handleBannerMouseEnter = () => {
    bannerPausedRef.current = true
    if (bannerResumeTimerRef.current) window.clearTimeout(bannerResumeTimerRef.current)
  }

  const handleBannerMouseLeave = () => {
    if (bannerResumeTimerRef.current) window.clearTimeout(bannerResumeTimerRef.current)
    bannerResumeTimerRef.current = window.setTimeout(() => {
      bannerPausedRef.current = false
    }, 2500)
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

  const handleFlashSaleScroll = () => {
    const el = flashSaleScrollRef.current
    if (!el || flashSale.length <= 1) return
    if (flashSaleScrollRaf.current) cancelAnimationFrame(flashSaleScrollRaf.current)
    flashSaleScrollRaf.current = requestAnimationFrame(() => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) {
        setActiveFlashIndex(0)
        return
      }
      const progress = Math.min(1, Math.max(0, el.scrollLeft / maxScroll))
      const index = Math.round(progress * (flashSale.length - 1))
      setActiveFlashIndex((current) => (current === index ? current : index))
    })
  }

  const scrollToFlashItem = (index) => {
    const el = flashSaleScrollRef.current
    if (!el || flashSale.length <= 1) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) return
    const targetScroll = (index / (flashSale.length - 1)) * maxScroll
    el.scrollTo({ left: targetScroll, behavior: 'smooth' })
    setActiveFlashIndex(index)
  }

  const scrollFlashSale = (direction) => {
    const el = flashSaleScrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.85), behavior: 'smooth' })
  }

  const scrollBestSellers = (direction) => {
    const el = bestSellerScrollRef.current
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
                <div
                  className={`relative group ${hasAnySideCard ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12 xl:col-span-12'}`}
                  onMouseEnter={handleBannerMouseEnter}
                  onMouseLeave={handleBannerMouseLeave}
                >
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
                        <div className="aspect-[16/9] md:aspect-[2/1] w-full overflow-hidden isolate rounded-2xl bg-gray-50 shadow-[0_2px_14px_rgba(15,23,42,0.08)] transition duration-300 group-active/item:scale-[0.995] md:rounded-3xl">
                          {banner.image_url ? (
                            <img
                              src={banner.image_url}
                              alt={banner.title || 'Promotion'}
                              className="h-full w-full rounded-2xl object-cover md:rounded-3xl"
                              loading={idx === 0 ? 'eager' : 'lazy'}
                              decoding="async"
                              fetchpriority={idx === 0 ? 'high' : 'auto'}
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600 md:rounded-3xl">
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
                {hasAnySideCard && (
                  <div className="hidden lg:flex lg:col-span-4 lg:flex-col lg:gap-3.5 xl:col-span-3">
                    
                    {/* Card 1: Live Flash Deals */}
                    {showFlashCard && (
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
                    )}

                    {/* Card 2: VIP Rewards & Point Exchange */}
                    {showRewardsCard && (
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
                    )}

                  </div>
                )}

              </div>
            </div>
          </section>
        )}

        <div className="h-2 bg-gray-50" />
        {(showFlashSkeleton || flashSale.length > 0) && (
          <div className="bg-white px-2.5 pb-4 pt-4 sm:px-4 md:px-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm shadow-pink-100">
                    <Zap size={14} className="fill-pink-600" strokeWidth={2.5} />
                  </span>
                  <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('home.flashSale')}</h2>
                  <FlashSaleSectionTimerBadge flashSale={flashSale} />
                </div>
                <FlashSaleSectionProgressBar flashSale={flashSale} />
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
              onScroll={handleFlashSaleScroll}
              className="-mx-2.5 flex snap-x snap-mandatory scroll-px-2.5 gap-2 overflow-x-auto px-2.5 pb-1 scroll-smooth [scrollbar-width:none] sm:-mx-4 sm:scroll-px-4 sm:gap-3 sm:px-4 md:-mx-6 md:gap-4 md:px-6 [&::-webkit-scrollbar]:hidden"
            >
              {showFlashSkeleton
                ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-[calc((100vw-1.75rem)/2)] min-w-[160px] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card sm:w-[240px] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
                    <div className="aspect-square animate-pulse bg-gray-100" />
                    <div className="space-y-2 p-2.5 sm:p-3">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
                      <div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" />
                    </div>
                  </div>
                ))
                : flashSale.map((p, i) => (
                  <div key={p.id} className="w-[calc((100vw-1.75rem)/2)] min-w-[160px] shrink-0 snap-start sm:w-[240px] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
                    <ProductCard 
                      product={p} 
                      onAuthRequired={handleAuthRequired}
                    />
                  </div>
                ))
              }
            </div>

            {/* Active Indicator Dots */}
            {flashSale.length > 1 && (
              <div className="mt-3.5 flex justify-center gap-1.5">
                {flashSale.map((item, i) => (
                  <button
                    key={item.id || i}
                    type="button"
                    onClick={() => scrollToFlashItem(i)}
                    aria-label={`Go to flash sale item ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === activeFlashIndex ? 'w-5 bg-pink-600' : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
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
            <BrandCarousel brands={brands} />
          </div>
        )}

        <div className="h-2 bg-gray-50" />

        {/* ════════════════════════════════════════════
            BEST SELLERS
        ════════════════════════════════════════════ */}
        {(showBestSkeleton || bestSellers.length > 0) && (
          <div className="bg-white px-2.5 pb-4 pt-4 sm:px-4 md:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500 shadow-sm shadow-amber-100">
                  <Star size={14} className="fill-amber-500" strokeWidth={2.5} />
                </span>
                <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('home.bestSellers')}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden items-center gap-1 md:flex">
                  <button
                    type="button"
                    onClick={() => scrollBestSellers(-1)}
                    aria-label={`Previous ${t('home.bestSellers')}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-pink-300 hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollBestSellers(1)}
                    aria-label={`Next ${t('home.bestSellers')}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-pink-300 hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                <Link to="/shop?filter=best_seller" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                  {t('common.seeAll')} <ChevronRight size={13} strokeWidth={3} />
                </Link>
              </div>
            </div>
            <div
              ref={bestSellerScrollRef}
              role="region"
              aria-label={t('home.bestSellers')}
              className="-mx-2.5 flex snap-x snap-mandatory scroll-px-2.5 gap-2 overflow-x-auto px-2.5 pb-2 scroll-smooth [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:-mx-4 sm:scroll-px-4 sm:gap-3 sm:px-4 md:-mx-6 md:gap-4 md:px-6"
            >
              {showBestSkeleton
                ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-[47.5%] shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card sm:w-[31%] lg:w-[24%] xl:w-[19%]">
                    <div className="aspect-square animate-pulse bg-gray-100" />
                    <div className="space-y-2 p-2.5 sm:p-3">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
                      <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
                      <div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" />
                    </div>
                  </div>
                ))
                : bestSellers.slice(0, 12).map((p, i) => (
                  <div key={p.id} className="w-[47.5%] shrink-0 snap-start sm:w-[31%] lg:w-[24%] xl:w-[19%]">
                    <ProductCard
                      product={p}
                      badge={t('home.bestBadge')}
                      priority={i < 4}
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
            NEW ARRIVALS
        ════════════════════════════════════════════ */}
        {(showNewSkeleton || newArrivals.length > 0) && (
          <div className="bg-white px-2.5 pb-5 pt-4 sm:px-4 md:px-6">
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 lg:grid-cols-4">
              {showNewSkeleton
                ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"><div className="aspect-square animate-pulse bg-gray-100" /><div className="space-y-2 p-3"><div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" /><div className="h-5 w-16 animate-pulse rounded bg-gray-100" /><div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" /></div></div>)
                : newArrivals.slice(0, 12).map((p, i) => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    badge={t('common.new')} 
                    priority={i < 4} 
                    onAuthRequired={(type) => openAuthModal(type)}
                  />
                ))
              }
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            VIDEO HIGHLIGHTS
        ════════════════════════════════════════════ */}
        {(homeData?.video_highlights?.length > 0) && <div className="h-2 bg-gray-50" />}
        <VideoHighlightsSection videos={homeData?.video_highlights || []} />

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
