import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronRight, Star, Heart, ShoppingBag,
  Gift, Brush, Droplet, SprayCan, Trash2, Plus, Minus, RefreshCw, Zap,
} from 'lucide-react'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { BrandLogo } from '@/components/customer/CustomerUi'
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

function iconForCategory(name) {
  const v = (name || '').toLowerCase()
  if (v.includes('makeup') || v.includes('make up')) return Brush
  if (v.includes('perfume') || v.includes('fragrance')) return SprayCan
  if (v.includes('lucky') || v.includes('gift')) return Gift
  return Droplet
}

// ─── Countdown to midnight ────────────────────────────────────────────────────
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
function ProductCard({ product, badge }) {
  const { t } = useTranslation()
  const { addItem, updateQuantity, items } = useCartStore()
  const { toggle, isWishlisted } = useWishlistStore()
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const wishlisted = isWishlisted(product.id)
  const cartItem = items.find((i) => i.product?.id === product.id)
  const qty = cartItem?.quantity || 0

  const discountPct = product.old_price
    ? Math.round((1 - Number(product.display_price || product.retail_price) / product.old_price) * 100)
    : null
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product

  const handleAdd = (e) => { e.stopPropagation(); addItem(saleProduct, 1) }
  const handleIncrease = (e) => { e.stopPropagation(); addItem(saleProduct, 1) }
  const handleDecrease = (e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1) }
  const handleWishlist = (e) => {
    e.stopPropagation()
    toggle(product)
    toast.success(wishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
  }

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
          <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-pink-600 shadow-sm">-{discountPct}%</span>
        )}
      </div>
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-white">
        {product.primary_image && !imageFailed ? (
          <>
            {!imageLoaded && <CosmeticMockup tone={product.tone} />}
            <img
              src={product.primary_image}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className={`absolute inset-0 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          <CosmeticMockup tone={product.tone} />
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <div className="flex min-w-0 items-center gap-1 text-xs font-semibold text-gray-400">
          <span className="truncate">{product.brand_name || t('product.noBrand')}</span>
          <span className="shrink-0 text-gray-300">/</span>
          <span className="truncate">{product.category_name || t('product.cosmetics')}</span>
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-gray-950">{product.name}</h3>
        <div className="mt-2 flex items-center gap-1">
          <Star size={13} className="fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-semibold text-gray-500">{product.rating > 0 ? product.rating : '4.8'}</span>
          <span className="text-xs text-gray-300">(126)</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[15px] font-black text-pink-600 sm:text-base">{formatCurrency(product.display_price || product.retail_price)}</span>
            {product.old_price && <span className="ml-2 text-xs font-semibold text-gray-400 line-through">{formatCurrency(product.old_price)}</span>}
          </div>
          {product.current_stock <= 0 ? (
            <span className="shrink-0 rounded-2xl bg-gray-100 px-3.5 py-2 text-[11px] font-black text-gray-400">Sold Out</span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              className="shrink-0 rounded-2xl bg-pink-600 px-3.5 py-2 text-[11px] font-black text-white shadow-sm shadow-pink-100 transition active:scale-95 sm:px-4"
            >
              <span className="md:hidden">{t('common.add')}</span>
              <span className="hidden md:inline">{t('common.addToCart')}</span>
            </button>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-0.5 rounded-2xl bg-pink-600 px-1 py-1">
              <button onClick={handleDecrease} className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30">
                {qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
              </button>
              <span className="min-w-[22px] text-center text-sm font-black text-white">{qty}</span>
              <button onClick={handleIncrease} className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30">
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── Flash sale card ──────────────────────────────────────────────────────────
function FlashSaleCard({ product }) {
  const { t } = useTranslation()
  const { addItem, updateQuantity, items } = useCartStore()
  const navigate = useNavigate()
  const cartItem = items.find((i) => i.product?.id === product.id)
  const qty = cartItem?.quantity || 0
  const discountPct = product.old_price
    ? Math.round((1 - Number(product.display_price || product.retail_price) / product.old_price) * 100)
    : null
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product
  const handleAdd = (e) => { e.stopPropagation(); addItem(saleProduct, 1); toast.success(t('product.addedToCart')) }
  const handleIncrease = (e) => { e.stopPropagation(); addItem(saleProduct, 1) }
  const handleDecrease = (e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1) }

  return (
    <article
      className="relative w-[136px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition active:scale-[0.97] md:w-auto"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      {discountPct && (
        <div className="absolute left-2 top-2 z-10 rounded-lg bg-white px-1.5 py-0.5 text-[9px] font-black text-pink-600 shadow-sm">
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
        {product.current_stock <= 0 ? (
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
  const countdown = useCountdown()
  const [categoryPage, setCategoryPage] = useState(0)
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const categoryScrollRef = useRef(null)
  const bannerScrollRef = useRef(null)
  const refreshStart = useRef({ x: 0, y: 0 })

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: bannersData, refetch: refetchBanners } = useQuery({
    queryKey: ['home-banners'],
    queryFn: () => productsApi.banners.list({ is_active: true }).then((r) => r.data.results ?? r.data),
  })
  const { data: categoriesData, refetch: refetchCategories } = useQuery({
    queryKey: ['categories-home'],
    queryFn: () => productsApi.categories.list({ is_active: true }).then((r) => r.data.results || r.data),
  })
  const { data: brandsData, refetch: refetchBrands } = useQuery({
    queryKey: ['brands-home'],
    queryFn: () => productsApi.brands.list({ is_active: true }).then((r) => r.data.results || r.data),
  })
  const { data: bestSellerData, isLoading: bestLoading, refetch: refetchBestSellers } = useQuery({
    queryKey: ['best-sellers'],
    queryFn: () => productsApi.products.list({ is_best_seller: true, page_size: 8 }).then((r) => r.data.results),
  })
  const { data: flashData, isLoading: flashLoading, refetch: refetchFlash } = useQuery({
    queryKey: ['flash-sale'],
    queryFn: () => productsApi.products.list({ active_flash_sale: true, page_size: 10 }).then((r) => r.data.results),
  })
  const { data: newArrivalData, isLoading: newLoading, refetch: refetchNewArrivals } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: () => productsApi.products.list({ is_new_arrival: true, page_size: 8 }).then((r) => r.data.results),
  })

  const banners = useMemo(() => bannersData || [], [bannersData])
  const categories = useMemo(() => categoriesData || [], [categoriesData])
  const brands = useMemo(() => brandsData || [], [brandsData])
  const bestSellers = useMemo(() => bestSellerData || [], [bestSellerData])
  const flashSale = useMemo(() => flashData || [], [flashData])
  const newArrivals = useMemo(() => newArrivalData || [], [newArrivalData])

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

  useEffect(() => {
    setActiveBannerIndex(0)
  }, [banners.length])

  useEffect(() => {
    if (!bannerScrollRef.current) return
    const item = bannerScrollRef.current.children[activeBannerIndex]
    if (!item) return
    bannerScrollRef.current.scrollTo({ left: item.offsetLeft, behavior: 'smooth' })
  }, [activeBannerIndex, banners.length])

  useEffect(() => {
    if (!bannerScrollRef.current) return
    bannerScrollRef.current.scrollTo({ left: 0, behavior: 'auto' })
    setActiveBannerIndex(0)
  }, [banners.length])

  useEffect(() => {
    if (banners.length < 2) return
    const interval = setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % banners.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [banners.length])

  // ── Banner auto-slide ──────────────────────────────────────────────────────
  // ── Pull to refresh ────────────────────────────────────────────────────────
  const refreshProgress = Math.min(1, pullDistance / 76)
  const refreshLabel = isRefreshing ? t('home.refreshing') : refreshProgress >= 1 ? t('home.releaseToRefresh') : t('home.pullToRefresh')

  const refreshHome = async () => {
    setIsRefreshing(true)
    setPullDistance(78)
    try {
      await Promise.all([
        refetchBanners(), refetchCategories(), refetchBrands(),
        refetchBestSellers(), refetchNewArrivals(), refetchFlash(),
      ])
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
            <div className="flex items-center justify-between px-4 pb-1 pt-3.5 md:px-6">
              <h2 className="text-sm font-black text-gray-950">{t('home.categories')}</h2>
              <Link to="/shop" className="flex items-center gap-0.5 text-[13px] font-black text-pink-600">
                {t('common.all')} <ChevronRight size={13} />
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
          <section className="bg-white pb-3 pt-4">
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

            {/* Mobile — horizontal scroll */}
            <div ref={bannerScrollRef} className="flex snap-x snap-mandatory scroll-pl-4 items-start gap-3 overflow-x-auto px-4 pb-1 pr-5 scroll-smooth [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
              {banners.map((banner, idx) => (
                <Link
                  key={banner.id}
                  to={banner.button_link || '/shop'}
                  className="group block w-[calc(100vw-2rem)] max-w-[680px] shrink-0 snap-start"
                >
                  <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_2px_18px_rgba(15,23,42,0.1)] transition group-active:scale-[0.99]">
                    {banner.image_url ? (
                      <img src={banner.image_url} alt={banner.title || 'Promotion'} className="h-full w-full object-cover" loading={idx === 0 ? 'eager' : 'lazy'} />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-[13px] bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600">
                        <ShoppingBag size={40} className="mb-2 text-white/50" />
                        {banner.title && <p className="px-4 text-center text-lg font-black text-white">{banner.title}</p>}
                      </div>
                    )}
                  </div>
                  {banner.title && <p className="mt-1.5 line-clamp-1 text-[15px] font-black leading-tight text-gray-950">{banner.title}</p>}
                </Link>
              ))}
              <div className="w-2 shrink-0" />
            </div>

            {/* Desktop — full-width grid */}
            <div className={`hidden md:grid md:gap-4 md:px-6 ${banners.length === 1 ? 'md:grid-cols-1' : banners.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {banners.map((banner, idx) => (
                <Link
                  key={banner.id}
                  to={banner.button_link || '/shop'}
                  className="group block w-full"
                >
                  <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.07)] transition group-hover:shadow-md">
                    {banner.image_url ? (
                      <img src={banner.image_url} alt={banner.title || 'Promotion'} className="h-full w-full object-cover" loading={idx === 0 ? 'eager' : 'lazy'} />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600">
                        <ShoppingBag size={48} className="mb-2 text-white/50" />
                        {banner.title && <p className="px-6 text-center text-xl font-black text-white">{banner.title}</p>}
                      </div>
                    )}
                  </div>
                  {banner.title && <p className="mt-2 line-clamp-1 text-base font-black leading-tight text-gray-950">{banner.title}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="h-2 bg-gray-50" />
        {(flashLoading || flashSale.length > 0) && (
          <div className="bg-white px-4 pb-4 pt-3.5 md:px-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* Badge */}
                <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-500 px-2.5 py-1 shadow-sm shadow-pink-200">
                  <Zap size={12} className="fill-white text-white" />
                  <span className="text-[11px] font-black text-white">{t('home.flashSale')}</span>
                </div>
                {/* Countdown */}
                <div className="flex items-center gap-0.5">
                  {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                    <span key={i} className="flex items-center">
                      <span className="flex h-[22px] min-w-[24px] items-center justify-center rounded-md bg-gray-900 px-1 text-[11px] font-black tabular-nums text-white">
                        {v}
                      </span>
                      {i < 2 && <span className="mx-0.5 text-xs font-black text-gray-400">:</span>}
                    </span>
                  ))}
                </div>
              </div>
              <Link to="/flash-sale" className="flex items-center gap-0.5 text-[13px] font-bold text-pink-600">
                {t('common.seeAll')} <ChevronRight size={13} />
              </Link>
            </div>
            {/* Mobile: horizontal scroll; Desktop: grid */}
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
              {flashLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-56 w-[136px] shrink-0 animate-pulse rounded-2xl bg-gray-100" />
                  ))
                : flashSale.map((p) => <FlashSaleCard key={p.id} product={p} />)
              }
            </div>
            <div className="hidden md:grid md:grid-cols-5 md:gap-3 lg:grid-cols-6">
              {flashLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-100" />
                  ))
                : flashSale.slice(0, 6).map((p) => <FlashSaleCard key={p.id} product={p} />)
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-950">{t('home.shopByBrand')}</h2>
              <Link to="/shop" className="flex items-center gap-0.5 text-[13px] font-bold text-pink-600">
                {t('common.viewAll')} <ChevronRight size={13} />
              </Link>
            </div>
            {/* Mobile: compact circles */}
            <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden">
              {brands.slice(0, 14).map((brand) => (
                <Link
                  key={brand.id}
                  to={`/shop?brand=${brand.id}`}
                  className="flex shrink-0 flex-col items-center gap-1.5 transition active:scale-90"
                >
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-pink-100 bg-pink-50 shadow-sm">
                    <BrandLogo brand={brand} size="md" className="h-full w-full" />
                  </div>
                  <p className="max-w-[68px] truncate text-center text-xs font-black leading-tight text-gray-900">{brand.name}</p>
                </Link>
              ))}
            </div>
            {/* Desktop: wide cards */}
            <div className="hidden gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex">
              {brands.map((brand) => (
                <Link
                  key={brand.id}
                  to={`/shop?brand=${brand.id}`}
                  className="group flex min-w-[260px] items-center gap-5 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-card transition hover:border-pink-100 hover:bg-pink-50"
                >
                  <BrandLogo brand={brand} size="lg" className="h-20 w-20 rounded-full transition group-hover:ring-2 group-hover:ring-pink-200" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-gray-950">{brand.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="h-2 bg-gray-50" />

        {/* ════════════════════════════════════════════
            BEST SELLERS
        ════════════════════════════════════════════ */}
        {(bestLoading || bestSellers.length > 0) && (
          <div className="bg-white px-4 pb-4 pt-3.5 md:px-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 shadow-sm shadow-amber-200">
                  <Star size={12} className="fill-white text-white" />
                </span>
                <h2 className="text-sm font-black text-gray-950">{t('home.bestSellers')}</h2>
              </div>
              <Link to="/shop?filter=best_seller" className="flex items-center gap-0.5 text-[13px] font-bold text-pink-600">
                {t('common.seeAll')} <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-2 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,220px))] md:gap-4">
              {bestLoading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-100" />)
                : bestSellers.slice(0, 6).map((p) => <ProductCard key={p.id} product={p} badge={t('home.bestBadge')} />)
              }
            </div>
          </div>
        )}

        <div className="h-2 bg-gray-50" />

        {/* ════════════════════════════════════════════
            NEW ARRIVALS
        ════════════════════════════════════════════ */}
        {(newLoading || newArrivals.length > 0) && (
          <div className="bg-white px-4 pb-5 pt-3.5 md:px-6">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-green-500 px-2 py-0.5 text-[9px] font-black tracking-wide text-white shadow-sm shadow-green-200">
                  NEW
                </span>
                <h2 className="text-sm font-black text-gray-950">{t('home.newArrivals')}</h2>
              </div>
              <Link to="/shop?filter=new_arrival" className="flex items-center gap-0.5 text-[13px] font-bold text-pink-600">
                {t('common.seeAll')} <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-2 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,220px))] md:gap-4">
              {newLoading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-gray-100" />)
                : newArrivals.slice(0, 6).map((p) => <ProductCard key={p.id} product={p} badge={t('common.new')} />)
              }
            </div>
          </div>
        )}

        <div className="h-4 bg-gray-50" />
      </div>
    </div>
  )
}
