import { useMemo, useState, useEffect, useCallback, useRef, startTransition, memo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, ShoppingBag, Heart, Grid2X2, List, Star, X, ShoppingCart, ChevronDown, Gift, ChevronLeft, SlidersHorizontal, Clock3, Plus } from 'lucide-react'
import { productsApi } from '@/api/products'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import HeaderBrandMark from '@/components/customer/HeaderBrandMark'
import { CartQuantityStepper, ProductImageAddButton } from '@/components/customer/CustomerUi'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import { cn, formatCurrency } from '@/utils/helpers'
import { getFlashSaleTimerState, hasFlashSaleTimer } from '@/utils/flashSale'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { showCartAddedToast, handleCartAdd } from '@/components/customer/CartAddedToast'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import { useTranslation } from 'react-i18next'

const SHOP_VIEW_STORAGE_KEY = 'shadow-shop-product-list-view'
const LIST_ROW_CLASS = 'md:flex md:items-center md:gap-4 md:rounded-xl md:p-3 md:shadow-none lg:gap-5 lg:p-3.5'
const LIST_HOVER_CLASS = 'md:hover:translate-y-0 md:hover:border-pink-200 md:hover:shadow-none'
const LIST_THUMBNAIL_CLASS = 'md:size-24 md:shrink-0 md:rounded-lg lg:size-28'
const LIST_DETAILS_CLASS = 'md:min-w-0 md:flex-1 md:p-0'
const LIST_TITLE_CLASS = 'md:text-base md:leading-snug'

function FilterSelect({ children, ...props }) {
  return (
    <div className="relative min-w-0">
      <select
        className="h-11 w-full appearance-none truncate rounded-2xl border border-gray-200 bg-white pl-3 pr-8 text-xs font-bold text-gray-800 shadow-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100 sm:h-12 sm:pl-4 sm:pr-10 sm:text-sm"
        {...props}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 shrink-0 text-gray-500 sm:right-3 sm:size-4" />
    </div>
  )
}

function ProductCardSkeleton({ isListView }) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card', isListView && LIST_ROW_CLASS)}>
      <div className={cn('aspect-square animate-pulse bg-gray-100', isListView && LIST_THUMBNAIL_CLASS)} />
      <div className={cn('space-y-2 p-2.5 sm:p-3', isListView && `${LIST_DETAILS_CLASS} md:max-w-sm`)}>
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
        <div className="h-5 w-16 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  )
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

function isAvailableForSale(product) {
  return product?.is_available_for_sale ?? Number(product?.current_stock || 0) > 0
}

function ListCartAction({ available, comingSoon, qty, onAdd, onIncrease, onDecrease }) {
  const { t } = useTranslation()

  return (
    <div className="hidden min-w-36 shrink-0 items-center justify-end md:flex">
      {!available && (
        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
          {t(comingSoon ? 'product.comingSoon' : 'common.soldOut')}
        </span>
      )}
      {available && qty > 0 && (
        <CartQuantityStepper quantity={qty} onIncrease={onIncrease} onDecrease={onDecrease} />
      )}
      {available && qty === 0 && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-pink-600 px-3 text-sm font-semibold text-white transition hover:bg-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
        >
          <Plus size={16} aria-hidden="true" />
          {t('common.addToCart')}
        </button>
      )}
    </div>
  )
}

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
    <div className={`mt-2 flex w-fit items-center gap-1 rounded-lg bg-pink-50 px-2 py-1 leading-none text-pink-600 ${compact ? 'text-[10px]' : 'text-[11px]'} font-black`}>
      <Clock3 size={compact ? 11 : 12} />
      <span>{timer.label} {timer.value}</span>
    </div>
  )
}

const ProductCard = memo(function ProductCard({ product, priority = false, onAuthRequired, isListView }) {
  const { t } = useTranslation()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const qty = useCartStore((s) => {
    const item = s.items.find((i) => i.product?.id === product.id)
    return item?.quantity || 0
  })
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showImageLoader, setShowImageLoader] = useState(false)

  const isComingSoon = product?.availability_status === 'coming_soon'
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product
  const available = !isComingSoon && isAvailableForSale(product)

  const handleAdd = (e) => {
    e.stopPropagation()
    if (isComingSoon) return
    if (product.variants_enabled) return navigate(`/product/${product.id}`)
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    handleCartAdd(addItem, saleProduct, navigate, 1)
  }

  const handleIncrease = (e) => {
    e.stopPropagation()
    if (product.variants_enabled) return navigate(`/product/${product.id}`)
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

  const currentPrice = Number(product.display_price || product.retail_price || 0)
  const oldPrice = Number(product.old_price || 0)
  const cartAction = { available, comingSoon: isComingSoon, qty, onAdd: handleAdd, onIncrease: handleIncrease, onDecrease: handleDecrease }

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
      className={cn('group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft', isListView && LIST_ROW_CLASS, isListView && LIST_HOVER_CLASS)}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className={cn('relative aspect-square overflow-hidden bg-gray-50', isListView && LIST_THUMBNAIL_CLASS)}>
        {isComingSoon && (
          <span className={cn('absolute left-3 top-3 z-10 rounded-full bg-pink-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm', isListView && 'md:hidden')}>
            Coming Soon
          </span>
        )}
        {product.primary_image && !imageFailed ? (
          <>
            {!imageLoaded && showImageLoader && <ProductImageLoading />}
            <img
              src={product.primary_image}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-contain p-1 transition duration-300 group-hover:scale-[1.03] sm:p-2"
            />
          </>
        ) : (
          <ProductImageFallback />
        )}
        <div className={isListView ? 'md:hidden' : undefined}>
          <ProductImageAddButton {...cartAction} soldOutLabel={t('common.soldOut')} />
        </div>
      </div>
      <div className={cn('flex min-h-0 flex-col p-2.5 sm:p-3', isListView && LIST_DETAILS_CLASS)}>
        <div className={cn('flex min-w-0 items-center justify-between gap-2', isListView && 'md:justify-start md:gap-3')}>
          <span className="truncate text-xs font-semibold text-gray-400">{product.brand_name || t('product.noBrand')}</span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-gray-500">
            <Star size={13} className="fill-yellow-400 text-yellow-400" />{product.rating > 0 ? product.rating : '4.8'} <span className="text-gray-300">(126)</span>
          </span>
        </div>
        <h3 className={cn('khmer-title mt-1 line-clamp-2 text-sm text-gray-950', isListView && LIST_TITLE_CLASS)}>{product.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {isComingSoon ? (
            <span className="text-xs sm:text-sm font-bold text-pink-600">{t('product.comingSoon', 'Coming Soon')}</span>
          ) : (
            <>
              <span className="text-base font-black leading-none text-pink-600">{formatCurrency(currentPrice)}</span>
              {oldPrice > currentPrice && (
                <>
                  <span className="text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
                  <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold leading-4 text-pink-600">
                    {t('product.saveAmount', { amount: formatCurrency(oldPrice - currentPrice) })}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <FlashSaleTimer item={product} />
      </div>
      {isListView && <ListCartAction {...cartAction} />}
    </article>
  )
})

const ProductSetCard = memo(function ProductSetCard({ productSet, priority = false, onAuthRequired, isListView }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showImageLoader, setShowImageLoader] = useState(false)
  const imageUrl = productSet.image_url || productSet.image
  const price = Number(productSet.display_price || productSet.discount_price || productSet.price || 0)
  const oldPrice = productSet.old_price || productSet.discount_price ? Number(productSet.price || 0) : 0
  const setStock = Number(productSet.current_stock || 0)
  const cartProduct = {
    id: `set-${productSet.id}`,
    cart_key: `set-${productSet.id}`,
    item_type: 'set',
    product_set_id: productSet.id,
    name: productSet.name,
    primary_image: imageUrl,
    image_url: imageUrl,
    retail_price: price,
    cost_price: 0,
    current_stock: setStock,
    is_flash_sale_active: productSet.is_flash_sale_active,
    flash_sale_max_order_qty: productSet.flash_sale_max_order_qty,
    category_name: t('product.productSet'),
  }
  const qty = useCartStore((s) => {
    const item = s.items.find((entry) => entry.product?.cart_key === cartProduct.cart_key)
    return item?.quantity || 0
  })

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    handleCartAdd(addItem, cartProduct, navigate, 1)
  }

  const handleIncrease = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    handleCartAdd(addItem, cartProduct, navigate, 1)
  }

  const handleDecrease = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    updateQuantity(cartProduct.cart_key, qty - 1)
  }

  const cartAction = { available: setStock > 0, qty, onAdd: handleAdd, onIncrease: handleIncrease, onDecrease: handleDecrease }

  useEffect(() => {
    setImageLoaded(false)
    setImageFailed(false)
    setShowImageLoader(false)
    if (!imageUrl) return undefined
    const timer = setTimeout(() => setShowImageLoader(true), 350)
    return () => clearTimeout(timer)
  }, [imageUrl])

  return (
    <article
      className={cn('group relative cursor-pointer overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft', isListView && LIST_ROW_CLASS, isListView && LIST_HOVER_CLASS)}
      onClick={() => navigate(`/product-set/${productSet.id}`)}
    >
      <div className={cn('relative aspect-square overflow-hidden bg-gray-50', isListView && LIST_THUMBNAIL_CLASS)}>
        {imageUrl && !imageFailed ? (
          <>
            {!imageLoaded && showImageLoader && <ProductImageLoading />}
            <img
              src={imageUrl}
              alt={productSet.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-contain p-1 transition duration-300 group-hover:scale-[1.03] sm:p-2"
            />
          </>
        ) : (
          <ProductImageFallback />
        )}
        <span className={cn('absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-xs font-black text-pink-600 shadow-sm', isListView && 'md:hidden')}>
          {t('product.productSetBadge')}
        </span>
        <div className={isListView ? 'md:hidden' : undefined}>
          <ProductImageAddButton {...cartAction} soldOutLabel={t('common.soldOut')} />
        </div>
      </div>
      <div className={cn('flex min-h-0 flex-col p-2.5 sm:p-3', isListView && LIST_DETAILS_CLASS)}>
        <div className="flex min-w-0 items-center gap-1 text-xs font-semibold text-gray-400">
          <span className="truncate">{t('product.productSet')}</span>
        </div>
        <h3 className={cn('mt-1 line-clamp-2 text-sm font-black leading-tight text-gray-950', isListView && LIST_TITLE_CLASS)}>{productSet.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
          <span className="text-base font-black leading-none text-pink-600">{formatCurrency(price)}</span>
          {oldPrice > price && <span className="text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>}
        </div>
        <div className={cn('mt-2 flex items-center gap-1', isListView && 'md:hidden')}>
          <Gift size={14} className="text-pink-500" />
          <span className="text-xs font-semibold text-gray-500">
            {setStock > 0 ? t('common.inStock') : t('common.soldOut')}
          </span>
        </div>
        <FlashSaleTimer item={productSet} />
      </div>
      {isListView && <ListCartAction {...cartAction} />}
    </article>
  )
})

export default function ProductList() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const totalItems = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0))
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const activeFilter = searchParams.get('filter') || ''
  const searchParam = searchParams.get('search') || ''
  const categoryParam = searchParams.get('category') || ''
  const brandParam = searchParams.get('brand') || ''
  const [search, setSearch] = useState(searchParam)
  const [categoryId, setCategoryId] = useState(categoryParam)
  const [brand, setBrand] = useState(brandParam)
  const [sortBy, setSortBy] = useState('-created_at')
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(SHOP_VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const isListView = view === 'list'
  const [showFilters, setShowFilters] = useState(false)
  const openAuthModal = useUiStore((s) => s.openAuthModal)
  const [showGridRefetchLoader, setShowGridRefetchLoader] = useState(false)

  const handleViewChange = (mode) => {
    setView(mode)
    try {
      localStorage.setItem(SHOP_VIEW_STORAGE_KEY, mode)
    } catch {
      // The current page can still switch views when browser storage is unavailable.
    }
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (categoryId) count++
    if (brand) count++
    if (sortBy && sortBy !== '-created_at') count++
    return count
  }, [categoryId, brand, sortBy])

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      setCategoryId('')
      setBrand('')
      setSortBy('-created_at')
    })
  }, [])

  const onAuthRequired = useCallback((type = 'cart') => {
    openAuthModal(type)
  }, [openAuthModal])

  useEffect(() => {
    setSearch(searchParam)
    setCategoryId(categoryParam)
    setBrand(brandParam)
  }, [activeFilter, brandParam, categoryParam, searchParam])

  const { data: categoryData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories.list({ is_active: true }).then((r) => r.data.results || r.data),
    ...STOREFRONT_LIVE_QUERY,
  })

  const { data: brandData } = useQuery({
    queryKey: ['brands-shop'],
    queryFn: () => productsApi.brands.list({ is_active: true }).then((r) => r.data.results || r.data),
    ...STOREFRONT_LIVE_QUERY,
  })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products-list', search, categoryId, brand, sortBy, activeFilter],
    queryFn: () => productsApi.products.list({
      search: search || undefined,
      category: categoryId || undefined,
      brand: brand || undefined,
      active_flash_sale: activeFilter === 'flash_sale' ? true : undefined,
      is_new_arrival: activeFilter === 'new_arrival' ? true : undefined,
      is_best_seller: activeFilter === 'best_seller' ? true : undefined,
      ordering: sortBy,
      page: 1,
      page_size: 1000,
      is_active: true,
    }).then((r) => r.data),
    ...STOREFRONT_LIVE_QUERY,
    placeholderData: keepPreviousData,
  })

  const setOrdering = sortBy === 'retail_price'
    ? 'price'
    : sortBy === '-retail_price'
      ? '-price'
      : sortBy === '-rating'
        ? '-created_at'
        : sortBy

  const { data: setData = [], isFetching: setsFetching } = useQuery({
    queryKey: ['shop-product-sets', search, setOrdering, activeFilter],
    queryFn: () => productsApi.sets.list({
      search: search || undefined,
      active_flash_sale: activeFilter === 'flash_sale' ? true : undefined,
      ordering: setOrdering,
      page_size: 100,
      is_active: true,
    }).then((r) => r.data.results ?? r.data ?? []),
    enabled: !categoryId && !brand && (!activeFilter || activeFilter === 'flash_sale'),
    ...STOREFRONT_LIVE_QUERY,
    placeholderData: keepPreviousData,
  })

  const isGridFetching = isFetching || setsFetching

  useEffect(() => {
    setShowGridRefetchLoader(false)
    if (!isGridFetching) return undefined
    const timer = setTimeout(() => setShowGridRefetchLoader(true), 350)
    return () => clearTimeout(timer)
  }, [isGridFetching])

  const categories = useMemo(() => categoryData || [], [categoryData])
  const shopBrands = useMemo(() => brandData || [], [brandData])

  const products = data?.results || []
  const productSets = (!categoryId && !brand && (!activeFilter || activeFilter === 'flash_sale')) ? setData.filter((set) => set.is_active !== false) : []
  const isGridLoading = (isLoading && !data) || (isGridFetching && showGridRefetchLoader && products.length === 0 && productSets.length === 0)
  const total = (data?.count || 0) + productSets.length
  const isSearchResult = Boolean(searchParams.get('search'))

  const CHUNK_SIZE = 24
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE)
  const sentinelRef = useRef(null)

  useEffect(() => {
    setVisibleCount(CHUNK_SIZE)
  }, [categoryId, brand, sortBy, activeFilter, search])

  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || visibleCount >= products.length) return undefined

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, products.length))
      }
    }, { rootMargin: '500px' })

    observer.observe(el)
    return () => observer.disconnect()
  }, [visibleCount, products.length])

  return (
    <div className="min-h-screen bg-white">
      <div className="-mx-4 -mt-4 mb-3 border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+var(--page-safe-top))] shadow-sm md:hidden">
        <div className={isSearchResult ? 'grid grid-cols-[42px_1fr_auto] items-center gap-2.5' : 'flex min-h-[48px] items-center justify-between gap-3'}>
          {isSearchResult ? (
            <>
              <button
                onClick={() => navigate(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 active:scale-95"
                aria-label={t('common.back')}
              >
                <ChevronLeft size={21} />
              </button>
              <button
                onClick={() => navigate('/search')}
                className="flex h-10 min-w-0 items-center gap-2.5 rounded-full border border-gray-300 bg-white px-3.5 text-left text-sm font-black text-gray-950 active:scale-[0.99]"
              >
                <Search size={19} className="shrink-0 text-gray-950" />
                <span className="truncate">{search || t('shop.searchForProducts')}</span>
              </button>
              <HeaderActionIcons />
            </>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <HeaderBrandMark />
                <h1 className="min-w-0 truncate text-left text-xl font-black text-gray-950">{t('common.products')}</h1>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => navigate('/search')} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 active:scale-95">
                  <Search size={22} />
                </button>
                <button onClick={() => navigate('/wishlist')} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700 active:scale-95">
                  <Heart size={22} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-xs font-bold text-white ring-2 ring-white">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
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
            </>
          )}
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
          {[
            { mode: 'grid', Icon: Grid2X2, label: t('shop.gridView') },
            { mode: 'list', Icon: List, label: t('shop.listView') },
          ].map(({ mode, Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleViewChange(mode)}
              aria-label={label}
              aria-pressed={view === mode}
              aria-controls="shop-product-results"
              title={label}
              className="shop-icon-btn h-11 w-11 aria-pressed:border-pink-300 aria-pressed:bg-pink-50 aria-pressed:text-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
            >
              <Icon size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <div>
        <section>
          {/* Header Bar with Count & Filter Toggle */}
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-semibold text-gray-500">
              <span className="font-bold text-gray-950">{total}</span>{' '}
              {isSearchResult ? <>{t('shop.resultsFor', { query: search })}</> : t('common.products')}
            </p>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-lg px-2 py-1 text-xs font-bold text-gray-500 hover:text-pink-600 hover:bg-gray-100 transition"
                >
                  {t('common.clear', 'Clear')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold shadow-xs transition active:scale-95',
                  showFilters || activeFilterCount > 0
                    ? 'border-pink-300 bg-pink-50 text-pink-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                )}
                aria-expanded={showFilters}
                aria-label="Toggle filters"
              >
                <SlidersHorizontal size={15} className={showFilters || activeFilterCount > 0 ? 'text-pink-600' : 'text-gray-500'} />
                <span>{t('shop.filterAndSort', 'Filter & Sort')}</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown size={14} className={cn('text-gray-400 transition-transform duration-200', showFilters && 'rotate-180')} />
              </button>
            </div>
          </div>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="mb-4 rounded-2xl border border-gray-200/80 bg-white p-3 sm:p-4 shadow-sm animate-slide-up">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    {t('shop.category', 'Category')}
                  </label>
                  <FilterSelect
                    value={categoryId}
                    onChange={(e) => { const v = e.target.value; startTransition(() => setCategoryId(v)) }}
                  >
                    <option value="">{t('shop.allCategories')}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                    ))}
                  </FilterSelect>
                </div>

                {!isSearchResult && (
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                      {t('shop.brand', 'Brand')}
                    </label>
                    <FilterSelect
                      value={brand}
                      onChange={(e) => { const v = e.target.value; startTransition(() => setBrand(v)) }}
                    >
                      <option value="">{t('shop.allBrands')}</option>
                      {shopBrands.map((b) => (
                        <option key={b.id} value={String(b.id)}>{b.name}</option>
                      ))}
                    </FilterSelect>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    {t('shop.sortBy', 'Sort By')}
                  </label>
                  <FilterSelect
                    value={sortBy}
                    onChange={(e) => { const v = e.target.value; startTransition(() => setSortBy(v)) }}
                  >
                    <option value="-created_at">{isSearchResult ? t('shop.sortBy') : t('shop.newest')}</option>
                    <option value="retail_price">{t('shop.priceLowHigh')}</option>
                    <option value="-retail_price">{t('shop.priceHighLow')}</option>
                    <option value="-rating">{t('shop.bestRated')}</option>
                  </FilterSelect>
                </div>
              </div>
            </div>
          )}

          <div
            id="shop-product-results"
            className={cn('relative z-0 -mx-2.5 grid grid-cols-2 gap-2 sm:mx-0 sm:grid-cols-3 sm:gap-3', isListView ? 'md:grid-cols-1 md:gap-2.5' : 'md:gap-4 lg:grid-cols-4')}
          >
            {isGridLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} isListView={isListView} />)
              : (
                <>
                  {productSets.map((set, i) => (
                    <ProductSetCard
                      key={`set-${set.id}`}
                      productSet={set}
                      priority={i < 4}
                      onAuthRequired={onAuthRequired}
                      isListView={isListView}
                    />
                  ))}
                  {visibleProducts.map((p, i) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      priority={i < 6}
                      onAuthRequired={onAuthRequired}
                      isListView={isListView}
                    />
                  ))}
                  {visibleCount < products.length && (
                    <div ref={sentinelRef} className="col-span-full h-1" />
                  )}
                </>
              )}
          </div>

          {!isGridLoading && products.length === 0 && productSets.length === 0 && (
            <div className="rounded-2xl border border-gray-100 py-20 text-center">
              <ShoppingBag size={48} className="mx-auto mb-3 text-gray-200" />
              <p className="font-bold text-gray-500">{t('shop.noProductsFound')}</p>
            </div>
          )}
        </section>
      </div>


    </div>
  )
}
