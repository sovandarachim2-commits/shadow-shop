import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Brush,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Droplet,
  Flame,
  Gift,
  Grid2X2,
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SprayCan,
  Star,
  Trash2,
  Zap,
} from 'lucide-react'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE = 12

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
    const timer = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(timer)
  }, [])

  return time
}

function formatCountdown(endValue, nowMs) {
  const fallbackEnd = new Date(nowMs)
  fallbackEnd.setHours(23, 59, 59, 999)
  const endTime = endValue ? new Date(endValue).getTime() : fallbackEnd.getTime()
  const diff = Math.max(0, endTime - nowMs)
  const totalSeconds = Math.floor(diff / 1000)
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function countdownProgress(startValue, endValue, nowMs) {
  const fallbackStart = new Date(nowMs)
  fallbackStart.setHours(0, 0, 0, 0)
  const fallbackEnd = new Date(nowMs)
  fallbackEnd.setHours(23, 59, 59, 999)
  const startTime = startValue ? new Date(startValue).getTime() : fallbackStart.getTime()
  const endTime = endValue ? new Date(endValue).getTime() : fallbackEnd.getTime()
  const total = Math.max(endTime - startTime, 1)
  const elapsed = Math.min(Math.max(nowMs - startTime, 0), total)
  return Math.max(3, Math.min(100, (elapsed / total) * 100))
}

function categoryIcon(name) {
  const value = (name || '').toLowerCase()
  if (value.includes('makeup') || value.includes('cosmetic')) return Brush
  if (value.includes('fragrance') || value.includes('perfume')) return SprayCan
  if (value.includes('hair')) return Gift
  if (value.includes('skin') || value.includes('beauty')) return Droplet
  return Grid2X2
}

function ProductArt() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_75%_70%,rgba(236,72,153,0.16),transparent_35%)]" />
      <div className="relative flex items-end gap-2">
        <div className="h-20 w-9 rounded-b-2xl rounded-t-md bg-gradient-to-b from-pink-200 via-pink-300 to-rose-400 shadow-xl">
          <div className="mx-auto -mt-6 h-6 w-6 rounded-t bg-gray-950" />
          <div className="mx-auto mt-6 h-7 w-4 rounded-full bg-white/25" />
        </div>
        <div className="h-14 w-16 rounded-3xl bg-gradient-to-br from-rose-100 via-pink-200 to-rose-300 shadow-xl">
          <div className="mx-auto mt-4 h-3 w-10 rounded-full bg-white/35" />
        </div>
      </div>
    </div>
  )
}

function isAvailableForSale(product) {
  return product?.is_available_for_sale ?? Number(product?.current_stock || 0) > 0
}

function FlashProductCard({ product, priority = false, nowMs }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addItem, updateQuantity, items } = useCartStore()
  const { toggle, isWishlisted } = useWishlistStore()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const cartItem = items.find((item) => item.product?.id === product.id)
  const qty = cartItem?.quantity || 0
  const currentPrice = Number(product.display_price || product.retail_price || 0)
  const oldPrice = Number(product.old_price || product.retail_price || 0)
  const discountPct = oldPrice > currentPrice ? Math.round((1 - currentPrice / oldPrice) * 100) : 0
  const saleProduct = { ...product, retail_price: currentPrice }
  const maxOrderQty = Number(product.flash_sale_max_order_qty || 0)
  const reachedMaxQty = maxOrderQty > 0 && qty >= maxOrderQty
  const available = isAvailableForSale(product)
  const countdownText = formatCountdown(product.flash_sale_ends_at, nowMs)
  const timePercent = countdownProgress(product.flash_sale_starts_at || product.flash_sale_start_at, product.flash_sale_ends_at, nowMs)
  const rating = Number(product.rating || 0) > 0 ? Number(product.rating).toFixed(1) : '4.8'
  const reviews = Number(product.review_count || product.flash_sale_order_count || 0)
  const wishlisted = isWishlisted(product.id)

  const addSaleItem = (e) => {
    e.stopPropagation()
    addItem(saleProduct, 1)
    toast.success(t('product.addedToCart'))
  }

  const toggleWishlist = (event) => {
    event.stopPropagation()
    toggle(product)
    toast.success(wishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
  }

  return (
    <article
      onClick={() => navigate(product.item_type === 'set' ? `/product-set/${product.product_set_id}` : `/product/${product.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-rose-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition active:scale-[0.99] md:hover:-translate-y-1 md:hover:shadow-soft"
    >
      {discountPct > 0 && (
        <div className="absolute left-3 top-3 z-10 rounded-lg bg-pink-600 px-2.5 py-1.5 text-xs font-black leading-none text-white shadow-lg shadow-pink-200">
          -{discountPct}%
        </div>
      )}
      <button
        type="button"
        onClick={toggleWishlist}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm ring-1 ring-pink-100 transition hover:text-pink-600"
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart size={18} className={wishlisted ? 'fill-pink-500 text-pink-500' : ''} />
      </button>

      <div className="relative aspect-[1/0.95] overflow-hidden bg-gradient-to-br from-pink-50 via-white to-rose-50">
        {product.primary_image && !imageFailed ? (
          <>
            {!imageLoaded && <ProductArt />}
            <img
              src={product.primary_image}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className={`absolute inset-0 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <ProductArt />
        )}
      </div>

      <div className="rounded-t-2xl bg-white p-3 md:p-4">
        <div className="mb-3 rounded-xl bg-white/95">
          <div className="mb-1.5 flex items-center justify-end gap-2 text-[11px] font-black">
            <span className="flex shrink-0 items-center gap-1 tabular-nums text-pink-600">
              <Clock3 size={12} /> {countdownText}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-pink-100">
            <div className="h-full rounded-full bg-pink-600 transition-[width] duration-1000 ease-linear" style={{ width: `${timePercent}%` }} />
          </div>
        </div>

        <h3 className="mt-1 line-clamp-2 min-h-[36px] text-sm font-black leading-tight text-gray-950">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-gray-500">
          {[...Array(5)].map((_, index) => (
            <Star key={index} size={12} className={index < 4 ? 'fill-amber-400 text-amber-400' : 'fill-amber-200 text-amber-200'} />
          ))}
          <span>{rating}</span>
          <span className="text-gray-400">({reviews.toLocaleString()})</span>
        </div>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-xl font-black text-rose-600">{formatCurrency(currentPrice)}</span>
          {oldPrice > currentPrice && (
            <span className="pb-1 text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
          )}
        </div>

        <div className="mt-4">
          {!available ? (
            <span className="flex h-11 w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-black text-gray-400">{t('common.outOfStock')}</span>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={addSaleItem}
              disabled={reachedMaxQty}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-pink-500 bg-white text-sm font-black text-pink-600 shadow-sm shadow-pink-50 transition active:scale-95 disabled:border-gray-200 disabled:text-gray-400"
            >
              <ShoppingBag size={17} />
              Add to Cart
            </button>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-2 py-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition active:scale-95 hover:bg-white/30"
              >
                {qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
              </button>
              <span className="min-w-[28px] text-center text-base font-black text-white">{qty}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); addItem(saleProduct, 1) }}
                disabled={reachedMaxQty}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition active:scale-95 hover:bg-white/30 disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
      <div className="aspect-square animate-pulse bg-gray-100" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 h-9 w-full animate-pulse rounded-2xl bg-gray-100" />
      </div>
    </div>
  )
}

export default function FlashSale() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const countdown = useCountdown()
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [page, setPage] = useState(1)
  const [activeCategory, setActiveCategory] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [activeCategory])

  const { data, isLoading } = useQuery({
    queryKey: ['flash-sale-page', page, activeCategory],
    queryFn: () => productsApi.products.list({
      active_flash_sale: true,
      is_active: true,
      category: activeCategory || undefined,
      ordering: '-created_at',
      page,
      page_size: PAGE_SIZE,
    }).then((r) => r.data),
    staleTime: 30_000,
  })

  const { data: categoryData = [] } = useQuery({
    queryKey: ['flash-sale-categories'],
    queryFn: () => productsApi.categories.list({ is_active: true }).then((r) => r.data.results || r.data || []),
    staleTime: 5 * 60_000,
  })

  const { data: setData = [], isLoading: setsLoading } = useQuery({
    queryKey: ['flash-sale-page-sets'],
    queryFn: () => productsApi.sets.list({
      active_flash_sale: true,
      is_active: true,
      ordering: '-created_at',
      page_size: 100,
    }).then((r) => r.data.results ?? r.data ?? []),
    staleTime: 30_000,
  })

  const activeCategoryMeta = useMemo(() => {
    const real = (categoryData || []).map((category) => ({
      key: String(category.id),
      label: category.name,
      icon: categoryIcon(category.name),
    }))
    return [{ key: '', label: 'All', icon: Grid2X2 }, ...real]
  }, [categoryData])

  const products = useMemo(() => {
    const regularProducts = data?.results || []
    if (page !== 1 || activeCategory) return regularProducts
    const productSets = setData.map((productSet) => {
      const imageUrl = productSet.image_url || productSet.image
      return {
        ...productSet,
        id: `set-${productSet.id}`,
        cart_key: `set-${productSet.id}`,
        item_type: 'set',
        product_set_id: productSet.id,
        primary_image: imageUrl,
        retail_price: Number(productSet.display_price || productSet.flash_sale_price || productSet.price || 0),
        display_price: Number(productSet.display_price || productSet.flash_sale_price || productSet.price || 0),
        old_price: Number(productSet.old_price || productSet.price || 0),
        flash_sale_ends_at: productSet.flash_sale_ends_at,
        category_name: `${productSet.items?.length || 0} items inside`,
        is_available_for_sale: Number(productSet.current_stock || 0) > 0,
      }
    })
    return [...productSets, ...regularProducts]
  }, [activeCategory, data, page, setData])
  const total = (data?.count || 0) + (activeCategory ? 0 : setData.length)
  const hasNext = Boolean(data?.next)
  const hasPrev = Boolean(data?.previous)

  return (
    <div className="min-h-screen bg-white pb-6">
      <header className="-mx-4 -mt-4 mb-5 grid min-h-[64px] grid-cols-[44px_1fr_auto] items-center gap-2 border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95"
          aria-label={t('common.back')}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950">
          Flash Sale <Zap size={18} className="ml-0.5 inline fill-pink-600 text-pink-600" />
        </h1>
        <div className="flex items-center justify-end gap-2">
          <Link to="/search" aria-label={t('common.search')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:scale-90">
            <Search size={19} />
          </Link>
          <HeaderActionIcons />
        </div>
      </header>

      <section className="rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3 text-pink-700 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-black text-gray-950">
              <Zap size={18} className="shrink-0 fill-pink-600 text-pink-600" />
              Today&apos;s Flash Sale
            </p>
            <p className="mt-1 text-sm font-semibold text-pink-700">Limited deals before the day ends.</p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black shadow-sm">
            <Clock3 size={16} className="text-pink-600" />
            <span className="tabular-nums text-gray-950">{countdown.h}:{countdown.m}:{countdown.s}</span>
          </div>
        </div>
      </section>

      <nav className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {activeCategoryMeta.map((category, index) => {
          const Icon = category.icon || Grid2X2
          const active = activeCategory === category.key
          return (
            <button
              key={`${category.key}-${category.label}`}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={`flex min-w-[92px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-center transition ${
                active || (!activeCategory && index === 0)
                  ? 'border-pink-100 bg-pink-50 text-pink-600 shadow-sm'
                  : 'border-gray-100 bg-white text-gray-500 hover:border-pink-100 hover:text-pink-600'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs font-black">{category.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="py-4 md:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-black text-gray-950">
            <Flame size={26} className="fill-orange-500 text-orange-500" />
            Hot Deals
          </h2>
          <Link to="/shop" className="flex items-center gap-1 text-sm font-black text-pink-600">
            View All <ChevronRight size={18} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,220px))] md:gap-4">
          {isLoading || setsLoading
            ? Array.from({ length: PAGE_SIZE }).map((_, index) => <ProductSkeleton key={index} />)
            : products.map((product, index) => <FlashProductCard key={product.id} product={product} priority={index < 6} nowMs={nowMs} />)
          }
        </div>

        {!isLoading && !setsLoading && products.length === 0 && (
          <div className="rounded-2xl border border-gray-100 py-20 text-center">
            <ShoppingBag size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="font-bold text-gray-500">{t('common.noResults')}</p>
            <Link to="/shop" className="mt-4 inline-flex rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-black text-white">
              {t('common.browseProducts')}
            </Link>
          </div>
        )}

        {(hasPrev || hasNext) && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!hasPrev}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold disabled:opacity-50"
            >
              {t('common.prev')}
            </button>
            <span className="px-4 py-2 text-sm font-semibold text-gray-500">{t('common.page')} {page}</span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!hasNext}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold disabled:opacity-50"
            >
              {t('common.next')} <ChevronRight size={14} className="inline" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
