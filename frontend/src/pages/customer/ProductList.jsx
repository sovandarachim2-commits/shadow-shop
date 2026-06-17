import { useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, ShoppingBag, Heart, Grid2X2, List, Star, X, ShoppingCart, Trash2, Plus, Minus, ChevronDown } from 'lucide-react'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import { Logo } from '@/components/layout/CustomerLayout'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

function FilterSelect({ children, ...props }) {
  return (
    <div className="relative min-w-0">
      <select
        className="h-9 w-full appearance-none truncate rounded-2xl border border-gray-100 bg-gray-50 pl-2.5 pr-7 text-[11px] font-black text-gray-700 outline-none focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:h-10 sm:pl-3 sm:pr-9 sm:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 shrink-0 text-gray-400 sm:right-2.5 sm:size-4" />
    </div>
  )
}

function ProductArt({ tone = 'pink' }) {
  const palette = {
    pink: 'from-pink-200 via-pink-300 to-rose-400',
    rose: 'from-rose-100 via-pink-200 to-rose-300',
    red: 'from-red-400 via-rose-500 to-pink-700',
    gold: 'from-amber-100 via-orange-200 to-yellow-300',
    amber: 'from-amber-700 via-orange-500 to-yellow-400',
    orange: 'from-orange-100 via-orange-300 to-amber-400',
    purple: 'from-purple-200 via-fuchsia-300 to-pink-400',
    set: 'from-pink-200 via-rose-300 to-purple-300',
  }[tone] || 'from-pink-200 via-pink-300 to-rose-400'

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_75%_70%,rgba(236,72,153,0.16),transparent_35%)]" />
      <div className="relative flex items-end gap-2">
        <div className={`h-20 w-9 rounded-b-2xl rounded-t-md bg-gradient-to-b ${palette} shadow-xl`}>
          <div className="mx-auto -mt-6 h-6 w-6 rounded-t bg-gray-950" />
          <div className="mx-auto mt-6 h-7 w-4 rounded-full bg-white/25" />
        </div>
        <div className={`h-14 w-16 rounded-3xl bg-gradient-to-br ${palette} shadow-xl`}>
          <div className="mx-auto mt-4 h-3 w-10 rounded-full bg-white/35" />
        </div>
      </div>
    </div>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
      <div className="h-44 animate-pulse bg-gray-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 flex items-center justify-between">
          <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
          <div className="h-8 w-20 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, priority = false }) {
  const { t } = useTranslation()
  const { addItem, updateQuantity, items } = useCartStore()
  const { toggle, isWishlisted } = useWishlistStore()
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const wishlisted = isWishlisted(product.id)

  const cartItem = items.find((i) => i.product?.id === product.id)
  const qty = cartItem?.quantity || 0
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(saleProduct, 1)
  }

  const handleIncrease = (e) => {
    e.stopPropagation()
    addItem(saleProduct, 1)
  }

  const handleDecrease = (e) => {
    e.stopPropagation()
    updateQuantity(product.id, qty - 1)
  }

  const handleWishlist = (e) => {
    e.stopPropagation()
    toggle(product)
    toast.success(isWishlisted(product.id) ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
  }

  const discountPct = product.old_price
    ? Math.round((1 - Number(product.display_price || product.retail_price) / product.old_price) * 100)
    : null

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <button
        onClick={handleWishlist}
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 shadow-sm transition ${wishlisted ? 'border-pink-200 text-pink-600' : 'border-pink-100 text-gray-500 hover:text-pink-600'}`}
      >
        <Heart size={17} className={wishlisted ? 'fill-pink-500' : ''} />
      </button>
      {discountPct && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2 py-1 text-xs font-black text-pink-600 shadow-sm">
          -{discountPct}%
        </span>
      )}
      <div className="relative h-44 overflow-hidden bg-white">
        {product.primary_image && !imageFailed ? (
          <>
            {!imageLoaded && <ProductArt tone={product.tone} />}
            <img
              src={product.primary_image}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchpriority={priority ? 'high' : 'auto'}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className={`absolute inset-0 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <ProductArt tone={product.tone} />
        )}
      </div>
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
            <button onClick={handleAdd} className="shrink-0 rounded-2xl bg-pink-600 px-3.5 py-2 text-[11px] font-black text-white shadow-sm shadow-pink-100 transition active:scale-95 sm:px-4">
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

export default function ProductList() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const cartItems = useCartStore((s) => s.items)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '')
  const [brand, setBrand] = useState(searchParams.get('brand') || '')
  const [sortBy, setSortBy] = useState('-created_at')
  const [page, setPage] = useState(1)
  const [showSearch, setShowSearch] = useState(Boolean(searchParams.get('search')))

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: categoryData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories.list({ is_active: true }).then((r) => r.data.results || r.data),
  })

  const { data: brandData } = useQuery({
    queryKey: ['brands-shop'],
    queryFn: () => productsApi.brands.list({ is_active: true }).then((r) => r.data.results || r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['products-list', search, categoryId, brand, sortBy, page],
    queryFn: () => productsApi.products.list({
      search: search || undefined,
      category: categoryId || undefined,
      brand: brand || undefined,
      ordering: sortBy,
      page,
      page_size: 12,
      is_active: true,
    }).then((r) => r.data),
    staleTime: 30_000,
  })

  const categories = useMemo(() => categoryData || [], [categoryData])
  const shopBrands = useMemo(() => brandData || [], [brandData])

  const products = data?.results || []
  const total = data?.count || 0
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-white">
      <div className="-mx-4 -mt-4 mb-3 grid min-h-[64px] grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-sm md:hidden">
        <div className="min-w-0 justify-self-start">
          <Logo
            compact
            iconOnly
            logoUrl={siteSettings?.logo_url || null}
            storeName={siteSettings?.store_name || 'Shadow Shop'}
          />
        </div>
        <h1 className="text-xl font-black text-gray-950">{t('nav.shop')}</h1>
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setShowSearch((v) => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 active:scale-95">
            {showSearch ? <X size={22} /> : <Search size={22} />}
          </button>
          <button onClick={() => navigate('/cart')} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 active:scale-95">
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-xs font-bold text-white ring-2 ring-white">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mb-6 hidden flex-col gap-4 md:flex md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-pink-600">{t('nav.shop')}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-950">{t('shop.shopCosmetics')}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {brand
              ? t('shop.showingBrand', { brand: shopBrands.find((b) => String(b.id) === brand)?.name || t('shop.selectedBrand') })
              : t('shop.browseText')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch((v) => !v)} className="shop-icon-btn h-11 w-11">
            {showSearch ? <X size={18} /> : <Search size={18} />}
          </button>
          <button className="shop-icon-btn h-11 w-11">
            <Grid2X2 size={18} />
          </button>
          <button className="shop-icon-btn h-11 w-11">
            <List size={18} />
          </button>
        </div>
      </div>

      <div>
        <section>
          <div className="-mx-4 mb-4 border-b border-gray-100 bg-white px-4 pb-3 pt-1 md:mx-0 md:mb-5 md:rounded-2xl md:border md:bg-white/95 md:p-3 md:shadow-card md:backdrop-blur">
            {showSearch && (
              <div className="mb-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm md:rounded-xl md:shadow-none">
                <div className="relative">
                  <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    placeholder={t('header.searchPlaceholder')}
                    autoFocus
                    className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setPage(1) }}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-white hover:text-pink-600"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid min-w-0 grid-cols-3 gap-2">
              <FilterSelect
                value={categoryId}
                onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}
              >
                <option value="">{t('shop.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
              </FilterSelect>
              <FilterSelect
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setPage(1) }}
              >
                <option value="">{t('shop.allBrands')}</option>
                {shopBrands.map((b) => (
                  <option key={b.id} value={String(b.id)}>{b.name}</option>
                ))}
              </FilterSelect>
              <FilterSelect
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="-created_at">{t('shop.newest')}</option>
                <option value="retail_price">{t('shop.priceLowHigh')}</option>
                <option value="-retail_price">{t('shop.priceHighLow')}</option>
                <option value="-rating">{t('shop.bestRated')}</option>
              </FilterSelect>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-500">
              <span className="text-gray-950">{total}</span> {t('common.products')}
            </p>
          </div>

          <div className="relative z-0 grid grid-cols-2 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,220px))] md:gap-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 6} />)}
          </div>

          {!isLoading && products.length === 0 && (
            <div className="rounded-2xl border border-gray-100 py-20 text-center">
              <ShoppingBag size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-gray-500">{t('shop.noProductsFound')}</p>
            </div>
          )}

          {total > 12 && (
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {t('common.prev')}
              </button>
              <span className="px-4 py-2 text-sm font-semibold text-gray-500">{t('common.page')} {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={products.length < 12}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

