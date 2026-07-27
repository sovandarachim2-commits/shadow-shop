import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Star, Heart, ShoppingBag,
  Gift, Brush, Droplet, SprayCan, Trash2, Plus, Minus, RefreshCw, Zap, ShoppingCart,
  Sparkles, Clock3,
} from 'lucide-react'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import { formatFlashSaleCountdown, getFlashSaleTimerState, hasFlashSaleTimer, isVisibleFlashSaleItem } from '@/utils/flashSale'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { BrandLogo } from '@/components/customer/CustomerUi'
import { showCartAddedToast } from '@/components/customer/CartAddedToast'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

// ─── Category config ──────────────────────────────────────────────────────────
const CATEGORY_SHORTCUTS = [
  { id: 'skincare',     name: 'Skincare',     keywords: ['skin', 'skincare'],               icon: Droplet,   bg: '#FFE4EC', color: '#E91E8C' },
  { id: 'makeup',       name: 'Makeup',       keywords: ['makeup', 'make up'],              icon: Brush,     bg: '#FFE0E6', color: '#F43F5E' },
  { id: 'body-care',    name: 'Body Care',    keywords: ['body'],                           icon: Droplet,   bg: '#FFE8D6', color: '#EA580C' },
  { id: 'hair-care',    name: 'Hair Care',    keywords: ['hair'],                           icon: SprayCan,  bg: '#FFF3CD', color: '#D97706' },
  { id: 'perfume',      name: 'Perfume',      keywords: ['perfume', 'fragrance'],           icon: SprayCan,  bg: '#F0E6FF', color: '#9333EA' },
  { id: 'accessories',  name: 'Accessories',  keywords: ['accessory', 'accessories'],       icon: ShoppingBag, bg: '#E0F0FF', color: '#2563EB' },
  { id: 'health',       name: 'Health',       keywords: ['health'],                         icon: Droplet,   bg: '#DCFCE7', color: '#16A34A' },
  { id: 'tools',        name: 'Tools',        keywords: ['tool', 'tools'],                  icon: Brush,     bg: '#E8E0FF', color: '#7C3AED' },
  { id: 'combo',        name: 'Combo',        keywords: ['combo', 'set', 'bundle'],         icon: Gift,      bg: '#D1FAE5', color: '#0D9488' },
  { id: 'new-arrival',  name: 'New',          keywords: [],                                 icon: Gift,      bg: '#EC4899', color: '#FFFFFF', path: '/shop?filter=new_arrival', isNew: true },
]

const HOME_QUERY_OPTIONS = {
  staleTime: 10 * 60 * 1000,
  gcTime: 45 * 60 * 1000,
  refetchOnMount: false,
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
function ProductCard({ product, badge, nowMs, priority = false }) {
  const { t } = useTranslation()
  const { addItem, updateQuantity, items } = useCartStore()
  const { toggle, isWishlisted } = useWishlistStore()
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showImageLoader, setShowImageLoader] = useState(false)
  const wishlisted = isWishlisted(product.id)
  const cartItem = items.find((i) => i.product?.id === product.id)
  const qty = cartItem?.quantity || 0
  const available = isAvailableForSale(product)

  const discountPct = product.old_price
    ? Math.round((1 - Number(product.display_price || product.retail_price) / product.old_price) * 100)
    : null
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(saleProduct, 1)
    showCartAddedToast(saleProduct, navigate)
  }
  const handleIncrease = (e) => { e.stopPropagation(); addItem(saleProduct, 1) }
  const handleDecrease = (e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1) }
  const handleWishlist = (e) => {
    e.stopPropagation()
    toggle(product)
    toast.success(wishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
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
      {/* Wishlist */}
      <button
        onClick={handleWishlist}
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 shadow-sm transition ${wishlisted ? 'border-pink-200 text-pink-600' : 'border-pink-100 text-gray-500 hover:text-pink-600'}`}
      >
        <Heart size={17} className={wishlisted ? 'fill-pink-500' : ''} />
      </button>
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
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
            />
          </>
        ) : (
          <ProductImageFallback />
        )}
      </div>
      {/* Info */}
      <div className="flex min-h-[166px] flex-col p-3">
        <div className="flex min-w-0 items-center gap-1 text-xs font-semibold text-gray-400">
          <span className="truncate">{product.brand_name || t('product.noBrand')}</span>
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-gray-950">{product.name}</h3>
        <div className="mt-2 flex items-center gap-1">
          <Star size={13} className="fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-semibold text-gray-500">{product.rating > 0 ? product.rating : '4.8'}</span>
          <span className="text-xs text-gray-300">(126)</span>
        </div>
        <div className="mt-3 min-w-0">
          <span className="text-lg font-black leading-none text-pink-600">{formatCurrency(product.display_price || product.retail_price)}</span>
          {product.old_price && <span className="ml-2 text-xs font-semibold text-gray-400 line-through">{formatCurrency(product.old_price)}</span>}
        </div>
        <FlashSaleTimer item={product} nowMs={nowMs} />
        <div className="mt-auto pt-3">
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
function FlashSaleCard({ product, nowMs }) {
  const { t } = useTranslation()
  const { addItem, updateQuantity, items } = useCartStore()
  const navigate = useNavigate()
  const cartItem = items.find((i) => i.product?.id === product.id)
  const qty = cartItem?.quantity || 0
  const available = isAvailableForSale(product)
  const discountPct = product.old_price
    ? Math.round((1 - Number(product.display_price || product.retail_price) / product.old_price) * 100)
    : null
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product
  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(saleProduct, 1)
    showCartAddedToast(saleProduct, navigate)
  }
  const handleIncrease = (e) => { e.stopPropagation(); addItem(saleProduct, 1) }
  const handleDecrease = (e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1) }

  return (
    <article
      className="relative w-[136px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition active:scale-[0.97] md:w-auto"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {discountPct && (
        <div className="absolute left-2 top-2 z-10 rounded-full bg-pink-600 px-3 py-1.5 text-[10px] font-black leading-none text-white shadow-lg shadow-pink-200 ring-2 ring-white">
          -{discountPct}%
        </div>
      )}
      <div className="aspect-square w-full bg-white">
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} className="h-full w-full object-contain p-2" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-pink-50">
            <ShoppingBag size={24} className="text-pink-200" />
          </div>
        )}
      </div>
      <div className="px-2.5 pb-3 pt-1">
        <p className="line-clamp-2 min-h-[30px] text-[11px] font-semibold leading-tight text-gray-800">{product.name}</p>
        <p className="mt-1.5 text-sm font-black text-pink-600">{formatCurrency(product.display_price || product.retail_price)}</p>
        {product.old_price && <p className="text-[10px] font-semibold text-gray-400 line-through">{formatCurrency(product.old_price)}</p>}
        <FlashSaleTimer item={product} nowMs={nowMs} compact />
        {!available ? (
          <div className="mt-2 w-full rounded-xl bg-gray-100 py-1.5 text-center text-[11px] font-black text-gray-400">Sold Out</div>
        ) : qty === 0 ? (
          <button
            onClick={handleAdd}
            className="mt-2 w-full rounded-xl bg-pink-600 py-1.5 text-[11px] font-black text-white shadow-sm shadow-pink-100 transition active:scale-95"
          >
            + {t('common.add')}
          </button>
        ) : (
          <div onClick={(e) => e.stopPropagation()} className="mt-2 flex w-fit items-center rounded-xl bg-pink-600 p-0.5 text-white shadow-sm shadow-pink-100">
            <button onClick={handleDecrease} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 transition active:scale-95">
              {qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
            </button>
            <span className="min-w-[28px] text-center text-sm font-black">{qty}</span>
            <button onClick={handleIncrease} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 transition active:scale-95">
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
    staleTime: 30_000,
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
  const categories = useMemo(() => categoriesData || [], [categoriesData])
  const brands = useMemo(() => brandsData || [], [brandsData])
  const marqueeBrands = useMemo(() => {
    if (!brands.length) return []
    const repeats = Math.max(1, Math.ceil(12 / brands.length))
    return Array.from({ length: repeats }, () => brands).flat()
  }, [brands])
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

  const categoryItems = useMemo(() => {
    const realCategories = categories
      .filter((cat) => !cat.parent)
      .map((cat, index) => {
        const shortcut = CATEGORY_SHORTCUTS.find((sc) =>
          sc.keywords.some((kw) => (cat.name || '').toLowerCase().includes(kw))
        ) || CATEGORY_SHORTCUTS[index % (CATEGORY_SHORTCUTS.length - 1)]
        return {
          ...shortcut,
          id: cat.id,
          name: cat.name,
          path: `/shop?category=${cat.id}`,
          imageUrl: cat.image_url || null,
          icon: iconForCategory(cat.name),
        }
      })

    const newShortcut = CATEGORY_SHORTCUTS.find((sc) => sc.isNew)
    return newShortcut ? [...realCategories, newShortcut] : realCategories
  }, [categories])

  const categoryPages = Math.max(1, Math.ceil(categoryItems.length / 10))

  const pauseBannerAutoplay = () => {
    bannerPausedRef.current = true
    if (bannerResumeTimerRef.current) window.clearTimeout(bannerResumeTimerRef.current)
    bannerResumeTimerRef.current = window.setTimeout(() => {
      bannerPausedRef.current = false
    }, 4500)
  }

  const BANNER_GAP = 12

  const getBannerStep = (track) => {
    const slide = track?.children?.[0]
    if (!slide) return track?.clientWidth || 1
    return slide.getBoundingClientRect().width + BANNER_GAP
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
      if (!banner?.image_url || index > 2) return
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
        className="mx-auto max-w-[1440px] transition-transform duration-200"
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
                <h2 className="min-w-0 truncate text-xl font-black leading-none text-gray-950 md:text-2xl">{t('home.categories')}</h2>
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
                <div key={pi} className="grid w-full shrink-0 snap-start grid-cols-5 gap-y-3 px-4 py-3 md:grid-cols-10 md:px-6">
                  {categoryItems.slice(pi * 10, pi * 10 + 10).map((cat) => {
                    const Icon = cat.icon
                    return (
                      <Link key={cat.id} to={cat.path} className="group flex flex-col items-center gap-1.5 transition active:scale-90">
                        <div
                          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-sm transition"
                          style={{ backgroundColor: cat.bg }}
                        >
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" loading="lazy" />
                          ) : cat.isNew ? (
                            <span className="text-[10px] font-black" style={{ color: cat.color }}>NEW</span>
                          ) : (
                            <Icon size={20} style={{ color: cat.color }} />
                          )}
                        </div>
                        <p className="line-clamp-2 max-w-[60px] text-center text-[10px] font-black leading-tight text-gray-800">{cat.name}</p>
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
                <h2 className="text-xl font-black leading-none text-gray-950 md:text-2xl">{t('nav.promotions')}</h2>
              </div>
              <Link
                to="/shop"
                aria-label="View all promotions"
                className="flex items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95"
              >
                {t('common.viewAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>

            {/* Peek carousel: main 83%, next preview ~17%, gap 12px, side pad 16px */}
            <div
              ref={bannerScrollRef}
              onScroll={handleBannerScroll}
              onPointerDown={handleBannerPointerDown}
              onTouchStart={handleBannerPointerDown}
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth px-4 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
              style={{ scrollPaddingLeft: 16 }}
            >
              {banners.map((banner, idx) => (
                <Link
                  key={banner.id}
                  to={banner.button_link || '/shop'}
                  className="group block w-[83%] min-w-[83%] shrink-0 snap-start"
                >
                  <div className="aspect-[2/1] w-full overflow-hidden rounded-[22px] bg-pink-50 shadow-[0_2px_14px_rgba(15,23,42,0.08)] transition duration-300 group-active:scale-[0.995] md:rounded-[28px]">
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title || 'Promotion'}
                        className="h-full w-full object-cover"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={idx === 0 ? 'high' : 'auto'}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600">
                        <ShoppingBag size={40} className="mb-2 text-white/50" />
                        {banner.title && <p className="px-4 text-center text-lg font-black text-white">{banner.title}</p>}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

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
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeBannerIndex ? 'w-5 bg-pink-600' : 'w-1.5 bg-gray-200'}`}
                  />
                ))}
              </div>
            )}
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
                  <h2 className="min-w-0 truncate text-xl font-black leading-none text-gray-950 md:text-2xl">{t('home.flashSale')}</h2>
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
                    <ProductCard product={p} nowMs={nowMs} priority={i < 4} />
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
                <h2 className="min-w-0 truncate text-xl font-black leading-none text-gray-950 md:text-2xl">{t('home.shopByBrand')}</h2>
              </div>
              <Link to="/shop" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                {t('common.viewAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>
            <div className="brand-marquee -mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              <div className="brand-marquee-track flex w-max">
                {[0, 1, 2].map((copy) => (
                  <div key={copy} className="flex shrink-0 gap-3 pr-3 md:gap-4 md:pr-4" aria-hidden={copy !== 0 || undefined}>
                    {marqueeBrands.map((brand, index) => (
                      <Link
                        key={`${copy}-${brand.id}-${index}`}
                        to={`/shop?brand=${brand.id}`}
                        tabIndex={copy !== 0 ? -1 : undefined}
                        className="group flex min-w-[84px] flex-col items-center gap-1.5 rounded-2xl border border-gray-100 bg-white px-2.5 py-3 shadow-sm transition active:scale-95 md:min-w-[220px] md:flex-row md:gap-4 md:px-4 md:py-3 md:hover:border-pink-100 md:hover:bg-pink-50"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-pink-100 bg-pink-50 shadow-sm md:h-16 md:w-16">
                          <BrandLogo brand={brand} size="lg" className="h-full w-full rounded-full transition group-hover:ring-2 group-hover:ring-pink-200" />
                        </div>
                        <p className="max-w-[68px] truncate text-center text-xs font-black leading-tight text-gray-900 group-hover:text-pink-600 md:max-w-[130px] md:text-left md:text-base">{brand.name}</p>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
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
                <h2 className="min-w-0 truncate text-xl font-black leading-none text-gray-950 md:text-2xl">{t('home.bestSellers')}</h2>
              </div>
              <Link to="/shop?filter=best_seller" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                {t('common.seeAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {showBestSkeleton
                ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"><div className="aspect-square animate-pulse bg-gray-100" /><div className="space-y-2 p-3"><div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" /><div className="h-5 w-16 animate-pulse rounded bg-gray-100" /><div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" /></div></div>)
                : bestSellers.slice(0, 12).map((p, i) => <ProductCard key={p.id} product={p} badge={t('home.bestBadge')} nowMs={nowMs} priority={i < 4} />)
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
                <h2 className="min-w-0 truncate text-xl font-black leading-none text-gray-950 md:text-2xl">{t('home.newArrivals')}</h2>
              </div>
              <Link to="/shop?filter=new_arrival" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
                {t('common.seeAll')} <ChevronRight size={13} strokeWidth={3} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {showNewSkeleton
                ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card"><div className="aspect-square animate-pulse bg-gray-100" /><div className="space-y-2 p-3"><div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" /><div className="h-4 w-full animate-pulse rounded bg-gray-100" /><div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" /><div className="h-5 w-16 animate-pulse rounded bg-gray-100" /><div className="mt-3 h-[42px] w-full animate-pulse rounded-xl bg-gray-100 sm:h-12" /></div></div>)
                : newArrivals.slice(0, 12).map((p, i) => <ProductCard key={p.id} product={p} badge={t('common.new')} nowMs={nowMs} priority={i < 4} />)
              }
            </div>
          </div>
        )}

        <div className="h-4 bg-gray-50" />
      </div>
    </div>
  )
}
