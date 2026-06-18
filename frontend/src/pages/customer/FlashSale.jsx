import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Clock3, Minus, Plus, ShoppingBag, Trash2, Zap } from 'lucide-react'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
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

function FlashProductCard({ product, priority = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addItem, updateQuantity, items } = useCartStore()
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

  const addSaleItem = (e) => {
    e.stopPropagation()
    addItem(saleProduct, 1)
    toast.success(t('product.addedToCart'))
  }

  return (
    <article
      onClick={() => navigate(`/product/${product.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm shadow-rose-100">
        <Zap size={11} className="fill-white" />
        FLASH
      </div>
      {discountPct > 0 && (
        <div className="absolute right-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-xs font-black text-rose-600 shadow-sm">
          -{discountPct}%
        </div>
      )}

      <div className="relative aspect-square overflow-hidden bg-white">
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

      <div className="p-3">
        <div className="flex min-w-0 items-center gap-1 text-xs font-semibold text-gray-400">
          <span className="truncate">{product.brand_name || t('product.noBrand')}</span>
          <span className="shrink-0 text-gray-300">/</span>
          <span className="truncate">{product.category_name || t('product.cosmetics')}</span>
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-[36px] text-sm font-black leading-tight text-gray-950">
          {product.name}
        </h3>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-lg font-black text-rose-600">{formatCurrency(currentPrice)}</span>
          {oldPrice > currentPrice && (
            <span className="pb-0.5 text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-wide text-gray-400">
            {maxOrderQty > 0 ? `Max ${maxOrderQty}` : product.current_stock > 0 ? t('common.inStock') : t('common.outOfStock')}
          </span>
          {product.current_stock <= 0 ? (
            <span className="rounded-2xl bg-gray-100 px-3.5 py-2 text-[11px] font-black text-gray-400">{t('common.outOfStock')}</span>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={addSaleItem}
              disabled={reachedMaxQty}
              className="shrink-0 rounded-2xl bg-rose-600 px-3.5 py-2 text-[11px] font-black text-white shadow-sm shadow-rose-100 transition active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {t('common.add')}
            </button>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-0.5 rounded-2xl bg-rose-600 px-1 py-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, qty - 1) }}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30"
              >
                {qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
              </button>
              <span className="min-w-[22px] text-center text-sm font-black text-white">{qty}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); addItem(saleProduct, 1) }}
                disabled={reachedMaxQty}
                className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30 disabled:opacity-40"
              >
                <Plus size={12} />
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
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['flash-sale-page', page],
    queryFn: () => productsApi.products.list({
      active_flash_sale: true,
      is_active: true,
      ordering: '-created_at',
      page,
      page_size: PAGE_SIZE,
    }).then((r) => r.data),
    staleTime: 30_000,
  })

  const products = useMemo(() => data?.results || [], [data])
  const total = data?.count || 0
  const hasNext = Boolean(data?.next)
  const hasPrev = Boolean(data?.previous)

  return (
    <div className="min-h-screen bg-white">
      <div className="-mx-4 -mt-4 border-b border-rose-100 bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-4 text-white md:mx-0 md:mt-0 md:rounded-[28px] md:px-6 md:py-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition active:scale-95 md:hidden"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm">
                <Zap size={18} className="fill-rose-600" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-white/80">{t('nav.promotions')}</p>
                <h1 className="text-2xl font-black leading-tight md:text-4xl">{t('home.flashSale')}</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/85">
              Limited-time deals from active flash sale products.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-white shadow-sm md:flex">
            <Clock3 size={18} />
            {[countdown.h, countdown.m, countdown.s].map((value, index) => (
              <span key={index} className="flex items-center">
                <span className="min-w-8 rounded-lg bg-white px-2 py-1 text-center text-sm font-black tabular-nums text-rose-600">
                  {value}
                </span>
                {index < 2 && <span className="mx-1 font-black">:</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1 rounded-2xl bg-white/15 px-4 py-3 text-white md:hidden">
          <Clock3 size={17} />
          {[countdown.h, countdown.m, countdown.s].map((value, index) => (
            <span key={index} className="flex items-center">
              <span className="min-w-8 rounded-lg bg-white px-2 py-1 text-center text-sm font-black tabular-nums text-rose-600">
                {value}
              </span>
              {index < 2 && <span className="mx-1 font-black">:</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="py-5 md:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-500">
            <span className="font-black text-gray-950">{total}</span> {t('common.products')}
          </p>
          <Link to="/shop" className="rounded-full border border-rose-100 px-3 py-1.5 text-xs font-black text-rose-600 transition hover:bg-rose-50">
            {t('nav.shop')}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,220px))] md:gap-4">
          {isLoading
            ? Array.from({ length: PAGE_SIZE }).map((_, index) => <ProductSkeleton key={index} />)
            : products.map((product, index) => <FlashProductCard key={product.id} product={product} priority={index < 6} />)
          }
        </div>

        {!isLoading && products.length === 0 && (
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
