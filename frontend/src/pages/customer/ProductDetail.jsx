import { useEffect, useRef, useState, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, ChevronDown, Heart, ShoppingCart, Zap, Plus, Minus, Check, ShoppingBag,
  PackageSearch, Star, Droplet, Sparkles, ShieldCheck, Leaf, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import { formatCurrency } from '@/utils/helpers'
import { getFlashSaleTimerState } from '@/utils/flashSale'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import { CosmeticArt } from '@/components/customer/CustomerUi'
import { showCartAddedToast, handleCartAdd, showStockLimitToast } from '@/components/customer/CartAddedToast'
import { showWishlistToast } from '@/components/customer/WishlistToast'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'

function cleanProductText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/[ \t]+\)/g, ')').trim()
}

function isAvailableForSale(product) {
  return product?.is_available_for_sale ?? Number(product?.current_stock || 0) > 0
}

const RelatedProductCard = memo(function RelatedProductCard({ product, priority = false, onAuthRequired }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const qty = useCartStore((s) => {
    const item = s.items.find((i) => i.product?.id === product.id)
    return item?.quantity || 0
  })
  const toggle = useWishlistStore((s) => s.toggle)
  const wishlisted = useWishlistStore((s) => s.items.some((i) => (i.product?.id || i.id) === product.id))
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showImageLoader, setShowImageLoader] = useState(false)
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product
  const available = isAvailableForSale(product)
  const price = Number(product.display_price || product.retail_price || 0)
  const oldPrice = Number(product.old_price || 0)
  const discountPct = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null
  const saleTimer = getFlashSaleTimerState(product, Date.now())

  useEffect(() => {
    setImageLoaded(false)
    setImageFailed(false)
    setShowImageLoader(false)
    if (!product.primary_image) return undefined
    const timer = setTimeout(() => setShowImageLoader(true), 350)
    return () => clearTimeout(timer)
  }, [product.primary_image])

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    handleCartAdd(addItem, saleProduct, navigate, 1)
  }

  const handleUpdateQty = (e, newQty) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    if (newQty > qty) {
      handleCartAdd(addItem, saleProduct, navigate, newQty - qty)
    } else {
      updateQuantity(product.id, newQty)
    }
  }

  const handleWishlist = (e) => {
    e.stopPropagation()
    toggle(product)
    showWishlistToast(wishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'), !wishlisted)
  }

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <button
        type="button"
        onClick={handleWishlist}
        className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 shadow-sm transition ${wishlisted ? 'border-pink-200 text-pink-600' : 'border-pink-100 text-gray-500 hover:text-pink-600'}`}
        aria-label="Toggle wishlist"
      >
        <Heart size={17} className={wishlisted ? 'fill-pink-500' : ''} />
      </button>
      {discountPct && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-pink-600 px-3 py-1.5 text-xs font-black leading-none text-white shadow-lg shadow-pink-200 ring-2 ring-white">
          -{discountPct}%
        </span>
      )}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {product.primary_image && !imageFailed ? (
          <>
            {!imageLoaded && showImageLoader && <div className="absolute inset-0 animate-pulse bg-gray-100" />}
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
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300"><ShoppingBag size={30} /></div>
        )}
      </div>
      <div className="flex min-h-0 flex-col p-2.5 sm:min-h-[166px] sm:p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-gray-400 sm:text-xs">{product.brand_name || t('product.noBrand')}</span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-500 sm:text-xs">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            {product.rating > 0 ? product.rating : '4.8'} <span className="text-gray-300">(126)</span>
          </span>
        </div>
        <div className="mt-1 flex min-w-0 items-start justify-between gap-2">
          <h3 className="khmer-title line-clamp-2 min-w-0 flex-1 text-base font-bold leading-snug text-gray-950 sm:min-h-[48px] sm:text-sm">{product.name}</h3>
          <div className="shrink-0 text-right">
            <span className="text-base font-black leading-none text-pink-600 sm:text-lg">{formatCurrency(price)}</span>
            {oldPrice > price && <span className="mt-1 block text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>}
          </div>
        </div>
        {saleTimer?.value && <div className="mt-2 flex w-fit items-center gap-1 rounded-lg bg-pink-50 px-2 py-1 text-[11px] font-black leading-none text-pink-600"><Zap size={12} /><span>{saleTimer.label} {saleTimer.value}</span></div>}
        <div className="mt-auto pt-3 sm:pt-4">
          {!available ? (
            <span className="flex h-10 w-full items-center justify-center rounded-xl bg-gray-100 text-xs font-black text-gray-400">{t('common.soldOut')}</span>
          ) : qty === 0 ? (
            <button onClick={handleAdd} className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-3 text-[13px] font-semibold text-white shadow-sm shadow-pink-100 transition hover:bg-pink-700 active:scale-[0.99] sm:h-12 sm:gap-2 sm:text-sm">
              <ShoppingCart size={17} /> <span className="sm:hidden">{t('common.add')}</span><span className="hidden sm:inline">{t('common.addToCart')}</span>
            </button>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="flex h-[42px] w-full items-center justify-between rounded-xl bg-pink-600 px-1.5 sm:h-12 sm:px-2">
              <button onClick={(e) => handleUpdateQty(e, qty - 1)} className="flex h-8 w-9 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-9 sm:w-10">
                {qty === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
              </button>
              <span className="min-w-[34px] text-center text-[13px] font-semibold text-white sm:min-w-[40px] sm:text-sm">{qty}</span>
              <button onClick={(e) => handleUpdateQty(e, qty + 1)} className="flex h-8 w-9 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-9 sm:w-10">
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
})

function RelatedProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
      <div className="aspect-square animate-pulse bg-gray-100" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 h-8 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [activeTab, setActiveTab] = useState('description')
  const toggleWishlist = useWishlistStore((s) => s.toggle)
  const [added, setAdded] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const { openAuthModal } = useUiStore()
  const galleryScrollRef = useRef(null)
  const thumbScrollRef = useRef(null)
  const galleryScrollRaf = useRef(0)
  const reviewsSectionRef = useRef(null)
  const addItem = useCartStore((s) => s.addItem)
  const clearSelection = useCartStore((s) => s.clearSelection)
  const toggleSelected = useCartStore((s) => s.toggleSelected)
  const loggedIn = useAuthStore((s) => s.isAuthenticated)

  const onAuthRequired = (type) => {
    openAuthModal(type)
  }

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.products.get(id).then((r) => r.data),
    ...STOREFRONT_LIVE_QUERY,
  })

  const isWishlisted = useWishlistStore((s) => {
    const targetId = Number(product?.id)
    if (!targetId) return false
    return s.items.some((i) => Number(i.product?.id || i.id) === targetId)
  })

  const handleToggleWishlist = async (e) => {
    e?.stopPropagation?.()
    if (!product?.id) return
    const wasWishlisted = isWishlisted
    await toggleWishlist(product)
    showWishlistToast(
      wasWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'),
      !wasWishlisted
    )
  }
  const { data: reviewData } = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: () => productsApi.reviews.list({ product: id }).then((r) => r.data.results || r.data),
    enabled: !!id,
  })
  const { data: relatedData, isLoading: relatedLoading } = useQuery({
    queryKey: ['related-products', product?.category, id],
    queryFn: () => productsApi.products.list({
      category: product.category,
      is_active: true,
      ordering: '-created_at',
      page_size: 9,
    }).then((r) => r.data),
    enabled: Boolean(product?.category),
    ...STOREFRONT_LIVE_QUERY,
  })
  const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
    queryKey: ['recommended-products', id],
    queryFn: () => productsApi.products.list({
      is_active: true,
      ordering: '-created_at',
      page_size: 12,
    }).then((r) => r.data),
    enabled: Boolean(product?.id),
    ...STOREFRONT_LIVE_QUERY,
  })
  const reviews = reviewData || []

  const reviewMutation = useMutation({
    mutationFn: (data) => productsApi.reviews.create(data),
    onSuccess: () => {
      setReviewComment('')
      queryClient.invalidateQueries({ queryKey: ['product-reviews', id] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      toast.success(t('product.reviewSaved'))
    },
    onError: () => toast.error(t('product.reviewSaveFailed')),
  })

  const images = product?.images?.length > 0 ? product.images : []
  const stock = product?.current_stock ?? 0
  const isInStock = product?.is_available_for_sale ?? stock > 0
  const oldPrice = Number(product?.old_price || product?.wholesale_price || 0)
  const currentPrice = Number(product?.display_price || product?.retail_price || 0)
  const savedAmount = oldPrice > currentPrice ? oldPrice - currentPrice : 0
  const saleProduct = product?.display_price ? { ...product, retail_price: product.display_price } : product
  const flashSaleMaxQty = product?.is_flash_sale_active ? Number(product?.flash_sale_max_order_qty || 0) : 0
  const maxPurchaseQty = flashSaleMaxQty > 0 ? (stock > 0 ? Math.min(stock, flashSaleMaxQty) : flashSaleMaxQty) : (stock > 0 ? stock : 9999)
  const productDescription = cleanProductText(product?.description)
  const productIngredients = cleanProductText(product?.ingredients)
  const reviewCount = Number(product?.review_count || reviews?.length || 0)
  const displayRating = Number(product?.rating || 0) > 0 ? Number(product.rating).toFixed(1) : '4.8'
  const sameCategoryProducts = (relatedData?.results || relatedData || [])
    .filter((item) => String(item.id) !== String(product?.id))
    .slice(0, 8)
  const recommendedProducts = (recommendedData?.results || recommendedData || [])
    .filter((item) => String(item.id) !== String(product?.id))
    .filter((item) => !sameCategoryProducts.some((related) => String(related.id) === String(item.id)))
    .slice(0, 8)
  const relatedProducts = sameCategoryProducts.length > 0 ? sameCategoryProducts : recommendedProducts
  const showingSameCategory = sameCategoryProducts.length > 0
  const productsMoreLoading = relatedLoading || (!showingSameCategory && recommendedLoading)

  useEffect(() => {
    setActiveImg(0)
    setQty(1)
    setActiveTab('description')
    if (galleryScrollRef.current) galleryScrollRef.current.scrollLeft = 0
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [product?.id])

  useEffect(() => {
    // Preload nearby images for smoother swipes
    images.forEach((img, index) => {
      if (!img?.image) return
      if (Math.abs(index - activeImg) > 2) return
      const preload = new Image()
      preload.src = img.image
    })
  }, [images, activeImg])

  useEffect(() => {
    const thumb = thumbScrollRef.current?.children?.[activeImg]
    if (thumb?.scrollIntoView) {
      thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeImg])

  const showImageAt = (index, behavior = 'smooth') => {
    if (images.length === 0) return
    const next = ((index % images.length) + images.length) % images.length
    setActiveImg(next)
    const track = galleryScrollRef.current
    const slide = track?.children?.[next]
    if (track && slide) {
      track.scrollTo({ left: slide.offsetLeft, behavior })
    }
  }

  const handleGalleryScroll = () => {
    const track = galleryScrollRef.current
    if (!track || images.length === 0) return
    if (galleryScrollRaf.current) cancelAnimationFrame(galleryScrollRaf.current)
    galleryScrollRaf.current = requestAnimationFrame(() => {
      const width = track.clientWidth || 1
      const index = Math.round(track.scrollLeft / width)
      const clamped = Math.min(images.length - 1, Math.max(0, index))
      setActiveImg((current) => (current === clamped ? current : clamped))
    })
  }

  const handleAddToCart = () => {
    if (!product || !isInStock) return
    if (!loggedIn) {
      onAuthRequired('cart')
      return
    }

    const toAdd = Math.min(qty, maxPurchaseQty || qty)
    const result = addItem(saleProduct, toAdd)
    if (result?.success) {
      setAdded(true)
      showCartAddedToast(saleProduct, navigate, result.quantity)
      setTimeout(() => setAdded(false), 2000)
    } else if (result?.reason === 'stock_limit') {
      showStockLimitToast(saleProduct, result.maxQuantity)
    }
  }

  const handleBuyNow = () => {
    if (!product || !isInStock) return
    if (!loggedIn) {
      onAuthRequired('buy_now')
      return
    }

    addItem(saleProduct, Math.min(qty, maxPurchaseQty || qty))
    clearSelection()
    toggleSelected(product.id)
    navigate('/checkout')
  }

  const handleSubmitReview = (e) => {
    e.preventDefault()
    if (!loggedIn) {
      onAuthRequired('cart')
      return
    }
    reviewMutation.mutate({
      product: product.id,
      rating: reviewRating,
      comment: reviewComment,
    })
  }

  if (isLoading && !product) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square max-h-[420px] w-full animate-pulse rounded-3xl bg-pink-50 md:max-h-none md:min-h-[520px]" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100" />
          <div className="h-12 w-1/3 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <PackageSearch size={52} className="mx-auto mb-4 text-gray-200" />
        <h1 className="text-xl font-black text-gray-950">{t('product.productNotFound')}</h1>
        <p className="mt-2 text-sm font-semibold text-gray-400">{t('product.productUnavailable')}</p>
        <button onClick={() => navigate('/shop')} className="shop-btn-primary mt-6 px-8">
          {t('common.browseProducts')}
        </button>
      </div>
    )
  }

  return (
    <div className="product-detail-view bg-white pb-24 md:pb-0">
      <div className="-mx-4 -mt-4 mb-4 grid min-h-[64px] grid-cols-[44px_1fr_auto] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950">{t('product.details')}</h1>
        <HeaderActionIcons />
      </div>

      <button onClick={() => navigate(-1)} className="mb-4 hidden items-center gap-3 text-sm font-black text-gray-600 hover:text-pink-600 md:inline-flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700">
          <ChevronLeft size={20} />
        </span>
        {t('product.backToProducts')}
      </button>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start lg:gap-10">
        {/* Gallery — smooth snap carousel for many images */}
        <section className="-mx-4 overflow-hidden bg-white md:mx-0 md:rounded-[28px] md:border md:border-pink-100 md:bg-gradient-to-br md:from-pink-50 md:to-white md:p-3 md:shadow-card lg:p-4">
          <div className="relative overflow-hidden bg-gray-50 md:rounded-[24px] md:bg-white">
            <button
              type="button"
              onClick={handleToggleWishlist}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-pink-600 shadow-xl shadow-pink-100 transition active:scale-95"
              aria-label="Toggle wishlist"
            >
              <Heart size={21} className={isWishlisted ? 'fill-pink-500 text-pink-500' : ''} />
            </button>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => showImageAt(activeImg - 1)}
                  aria-label="Previous product image"
                  className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-lg shadow-pink-100 transition active:scale-95 md:flex"
                >
                  <ChevronLeft size={22} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => showImageAt(activeImg + 1)}
                  aria-label="Next product image"
                  className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-lg shadow-pink-100 transition active:scale-95 md:flex"
                >
                  <ChevronRight size={22} strokeWidth={3} />
                </button>
              </>
            )}
            <div
              ref={galleryScrollRef}
              onScroll={handleGalleryScroll}
              className="flex aspect-square w-full min-w-0 max-h-[420px] min-h-[360px] snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-webkit-overflow-scrolling:touch] md:max-h-none md:min-h-[480px] lg:min-h-[560px] [&::-webkit-scrollbar]:hidden"
            >
              {images.length > 0 ? (
                images.map((img, i) => (
                  <div
                    key={img.id || i}
                    className="box-border h-full w-full min-w-full shrink-0 grow-0 basis-full snap-center snap-always overflow-hidden"
                  >
                    <img
                      src={img.image}
                      alt={`${product.name} ${i + 1}`}
                      draggable={false}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="h-full w-full max-h-full max-w-full object-contain p-3 md:p-4"
                    />
                  </div>
                ))
              ) : (
                <div className="box-border h-full w-full min-w-full shrink-0 grow-0 basis-full snap-center overflow-hidden">
                  <CosmeticArt tone={product.tone} className="min-h-full" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-pink-600 shadow-sm ring-1 ring-pink-50">
                <div className="pointer-events-auto flex max-w-[180px] gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => showImageAt(i)}
                      aria-label={`Show product image ${i + 1}`}
                      className={`h-2 shrink-0 rounded-full transition-all duration-300 ${i === activeImg ? 'w-5 bg-pink-600' : 'w-2 bg-pink-200'}`}
                    />
                  ))}
                </div>
                <span className="tabular-nums">{activeImg + 1}/{images.length}</span>
              </div>
            )}
          </div>

          <div className="mt-3 hidden justify-center px-4 md:flex md:px-0">
            <div
              ref={thumbScrollRef}
              className="flex max-w-full gap-2.5 overflow-x-auto scroll-smooth rounded-2xl bg-gray-50 px-2.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:bg-white/70"
            >
            {images.length > 0
              ? images.map((img, i) => (
                <button
                  key={img.id || i}
                  onClick={() => showImageAt(i)}
                  className={`aspect-square w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition duration-300 md:w-24 ${i === activeImg ? 'border-pink-500 shadow-sm shadow-pink-100' : 'border-transparent opacity-75 hover:opacity-100'}`}
                  aria-label={`Show product image ${i + 1}`}
                >
                  <img src={img.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover bg-white" />
                </button>
              ))
              : ['pink', 'rose', 'red', 'gold'].map((tone, i) => (
                <button key={tone} onClick={() => setActiveImg(i)} className="aspect-square w-20 shrink-0 overflow-hidden rounded-xl border border-pink-100 bg-white md:w-24">
                  <CosmeticArt tone={tone} className="min-h-full" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Info — typography & spacing from size guide */}
        <section className="flex flex-col px-0 pt-4 md:pt-0">
          <p className="text-xs font-medium text-gray-500">
            {product.brand_name || product.category_name || t('product.cosmetics')}
          </p>

          <h1 className="pd-khmer-title mt-1 line-clamp-2 text-[22px] font-bold leading-snug text-gray-950 md:line-clamp-none md:text-3xl lg:text-4xl md:leading-normal">
            {product.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('reviews')
                reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 transition hover:text-pink-600"
            >
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span>{displayRating}</span>
              <span className="text-gray-400">({reviewCount || reviews.length || 0})</span>
            </button>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              isInStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`} />
              {isInStock ? t('common.inStock') : t('common.outOfStock')}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-[30px] font-bold leading-none text-pink-600 md:text-4xl md:font-black">{formatCurrency(currentPrice)}</span>
            {oldPrice > currentPrice && (
              <span className="text-base font-medium text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
            )}
            {savedAmount > 0 && (
              <span className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-600">
                {t('product.saveAmount', { amount: formatCurrency(savedAmount) })}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center md:hidden">
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition active:scale-95 ${
                isWishlisted ? 'border-pink-200 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-600'
              }`}
            >
              <Heart size={16} className={isWishlisted ? 'fill-pink-500' : ''} />
              {t('nav.wishlist')}
            </button>
          </div>

          {flashSaleMaxQty > 0 && (
            <p className="mt-2 text-sm font-medium text-pink-600 md:hidden">{t('product.maxPerOrder', { count: flashSaleMaxQty })}</p>
          )}

          <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-2xl bg-gray-50/80 py-3 shadow-sm ring-1 ring-gray-100">
            <FeatureChip icon={Droplet} label={t('product.deepHydration')} />
            <FeatureChip icon={Sparkles} label={t('product.brightening')} />
            <FeatureChip icon={ShieldCheck} label={t('product.skinBarrier')} />
            <FeatureChip icon={Leaf} label={t('product.allSkinTypes')} iconClass="text-green-500" />
          </div>

          <div className="mt-4 hidden flex-wrap items-center gap-4 border-y border-gray-100 py-5 md:flex">
            <span className="text-sm font-black text-gray-700">{t('product.quantity')}</span>
            <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-1">
              <button onClick={() => setQty((q) => Math.max(product.min_order_qty || 1, q - 1))} className="shop-icon-btn h-10 w-10">
                <Minus size={15} />
              </button>
              <span className="w-10 text-center text-base font-black">{qty}</span>
              <button disabled={!isInStock} onClick={() => {
                if (qty >= maxPurchaseQty) {
                  showStockLimitToast(saleProduct, maxPurchaseQty)
                } else {
                  setQty((q) => Math.min(maxPurchaseQty, q + 1))
                }
              }} className="shop-icon-btn h-10 w-10 disabled:opacity-50">
                <Plus size={15} />
              </button>
            </div>
            {flashSaleMaxQty > 0 && <span className="text-sm font-black text-pink-600">{t('product.maxPerOrder', { count: flashSaleMaxQty })}</span>}
            {!isInStock && <span className="text-sm font-black text-red-500">{t('common.outOfStock')}</span>}
          </div>

          <div className="mt-6 hidden flex-col gap-3 sm:flex-row md:flex">
            <button
              onClick={handleAddToCart}
              disabled={!isInStock}
              className={`pd-khmer-font flex flex-1 items-center justify-center gap-2 rounded-lg border py-4 text-base font-bold transition ${
                added ? 'border-green-500 bg-green-500 text-white' : 'border-pink-500 bg-white text-pink-600 hover:bg-pink-50'
              }`}
            >
              {added ? <Check size={19} /> : <ShoppingCart size={19} />}
              {added ? t('product.added') : t('common.addToCart')}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!isInStock}
              className="pd-khmer-font shop-btn-primary flex-1 py-4 text-base font-bold"
            >
              <Zap size={19} /> {t('common.buyNow')}
            </button>
          </div>

          {/* Tabs Section matching requested UI */}
          <div ref={reviewsSectionRef} className="mt-6 md:mt-8 border-t border-gray-100 pt-2">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100 gap-6 md:gap-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`pd-khmer-font relative pb-3 text-[15px] sm:text-base font-bold transition whitespace-nowrap ${
                  activeTab === 'description'
                    ? 'text-gray-950 font-black'
                    : 'text-gray-400 font-semibold hover:text-gray-600'
                }`}
              >
                {t('product.description')}
                {activeTab === 'description' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-pink-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('additional')}
                className={`pd-khmer-font relative pb-3 text-[15px] sm:text-base font-bold transition whitespace-nowrap ${
                  activeTab === 'additional'
                    ? 'text-gray-950 font-black'
                    : 'text-gray-400 font-semibold hover:text-gray-600'
                }`}
              >
                {t('product.additionalInfo')}
                {activeTab === 'additional' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-pink-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pd-khmer-font relative pb-3 text-[15px] sm:text-base font-bold transition whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'text-gray-950 font-black'
                    : 'text-gray-400 font-semibold hover:text-gray-600'
                }`}
              >
                {t('product.reviews')} {reviewCount > 0 || reviews.length > 0 ? `(${reviewCount || reviews.length})` : ''}
                {activeTab === 'reviews' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-pink-600" />
                )}
              </button>
            </div>

            {/* Tab 1: Description */}
            {activeTab === 'description' && (
              <div className="py-5">
                {productDescription ? (
                  <div className="pd-khmer-content whitespace-pre-line text-[15px] sm:text-base leading-[1.85] text-gray-700 font-normal">
                    {productDescription}
                  </div>
                ) : (
                  <p className="pd-khmer-font italic text-gray-400">{t('product.noDescription')}</p>
                )}
              </div>
            )}

            {/* Tab 2: Additional Information */}
            {activeTab === 'additional' && (
              <div className="py-5">
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
                  <div className="divide-y divide-gray-100">
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <span className="pd-khmer-font text-[14px] sm:text-[15px] font-semibold text-gray-500">{t('product.brand')}</span>
                      <span className="pd-khmer-font text-[14px] sm:text-[15px] font-bold text-gray-900 text-right">{product.brand_name || 'Lakamo'}</span>
                    </div>

                    <div className="flex items-center justify-between px-5 py-3.5">
                      <span className="pd-khmer-font text-[14px] sm:text-[15px] font-semibold text-gray-500">{t('product.category')}</span>
                      <span className="pd-khmer-font text-[14px] sm:text-[15px] font-bold text-gray-900 text-right">{product.category_name || 'General'}</span>
                    </div>

                    <div className="flex items-center justify-between px-5 py-3.5">
                      <span className="pd-khmer-font text-[14px] sm:text-[15px] font-semibold text-gray-500">{t('product.availability')}</span>
                      <span className="pd-khmer-font text-[14px] sm:text-[15px] font-bold text-gray-900 text-right">
                        {isInStock ? t('common.inStock') : t('common.outOfStock')}
                      </span>
                    </div>

                    {product.weight && (
                      <div className="flex items-center justify-between px-5 py-3.5">
                        <span className="pd-khmer-font text-[14px] sm:text-[15px] font-semibold text-gray-500">Weight</span>
                        <span className="pd-khmer-font text-[14px] sm:text-[15px] font-bold text-gray-900 text-right">{product.weight}</span>
                      </div>
                    )}
                  </div>
                </div>

                {productIngredients && (
                  <div className="mt-7">
                    <h3 className="pd-khmer-title text-base sm:text-lg font-bold text-gray-950 mb-3">{t('product.ingredients')}</h3>
                    <div className="pd-khmer-content whitespace-pre-line text-[15px] sm:text-base leading-[1.85] text-gray-700 font-normal">
                      {productIngredients}
                    </div>
                  </div>
                )}

                {product.how_to_use && (
                  <div className="mt-6">
                    <h3 className="pd-khmer-title text-base sm:text-lg font-bold text-gray-950 mb-3">{t('product.howToUse')}</h3>
                    <div className="pd-khmer-content whitespace-pre-line text-[15px] sm:text-base leading-[1.85] text-gray-700 font-normal">
                      {product.how_to_use}
                    </div>
                  </div>
                )}

                {product.benefits && (
                  <div className="mt-6">
                    <h3 className="pd-khmer-title text-base sm:text-lg font-bold text-gray-950 mb-3">{t('product.benefits')}</h3>
                    <div className="pd-khmer-content whitespace-pre-line text-[15px] sm:text-base leading-[1.85] text-gray-700 font-normal">
                      {product.benefits}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Reviews */}
            {activeTab === 'reviews' && (
              <div className="py-5 space-y-5">
                <form onSubmit={handleSubmitReview} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{t('product.rateProduct')}</p>
                      <p className="text-xs font-medium text-gray-400">{t('product.reviewHint')}</p>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(value)}
                          className="rounded-full p-1"
                          aria-label={`${value} stars`}
                        >
                          <Star
                            size={22}
                            className={value <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    className="mt-3 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                    placeholder={t('product.reviewPlaceholder')}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={reviewMutation.isPending}
                      className="rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition active:scale-95"
                    >
                      {reviewMutation.isPending ? t('product.saving') : t('product.submitReview')}
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                      <p className="text-sm font-medium text-gray-500">{t('product.noReviewsYet')}</p>
                    </div>
                  ) : reviews.map((review) => (
                    <div key={review.id} className="rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-950">{review.user_name || t('product.customer')}</p>
                          <div className="mt-1 flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Star
                                key={value}
                                size={14}
                                className={value <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-400">
                          {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      {review.comment && <p className="pd-khmer-content mt-3 text-sm leading-[1.8] text-gray-600 font-normal">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {(productsMoreLoading || relatedProducts.length > 0) && (
        <section className="mt-10 md:mt-14">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-pink-600">
                {showingSameCategory ? (product.category_name || t('product.relatedProducts')) : t('product.recommendedProducts')}
              </p>
              <h2 className="khmer-title mt-1 text-2xl font-black text-gray-950 md:text-3xl">
                {showingSameCategory ? t('product.moreFromThisCategory') : t('product.youMayAlsoLike')}
              </h2>
            </div>
            {showingSameCategory && product.category && (
              <button
                type="button"
                onClick={() => navigate(`/shop?category=${product.category}`)}
                className="hidden rounded-full border border-pink-100 bg-white px-4 py-2 text-sm font-black text-pink-600 shadow-sm transition hover:bg-pink-50 md:inline-flex"
              >
                {t('common.viewAll')}
              </button>
            )}
          </div>

          <div className="-mx-2.5 grid grid-cols-2 gap-2 sm:mx-0 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 md:gap-4">
            {productsMoreLoading
              ? Array.from({ length: 4 }).map((_, index) => <RelatedProductSkeleton key={index} />)
              : relatedProducts.map((item, index) => (
                <RelatedProductCard 
                  key={item.id} 
                  product={item} 
                  priority={index < 2} 
                  onAuthRequired={onAuthRequired}
                />
              ))}
          </div>

          {showingSameCategory && product.category && (
            <button
              type="button"
              onClick={() => navigate(`/shop?category=${product.category}`)}
              className="mt-4 flex w-full items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 px-4 py-3 text-sm font-black text-pink-600 md:hidden"
            >
              {t('common.viewAll')} {product.category_name || t('common.products')}
            </button>
          )}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[112px_1fr] items-center gap-3">
          <div className="flex h-12 items-center justify-between rounded-full border border-gray-200 bg-white px-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(product.min_order_qty || 1, q - 1))}
              className="flex h-8 w-8 items-center justify-center text-gray-800 active:scale-95 disabled:text-gray-300"
              disabled={qty <= (product.min_order_qty || 1)}
              aria-label="Decrease quantity"
            >
              <Minus size={16} strokeWidth={2.5} />
            </button>
            <span className="min-w-6 text-center text-sm font-bold text-gray-950">{qty}</span>
            <button
              type="button"
              onClick={() => {
                if (qty >= maxPurchaseQty) {
                  showStockLimitToast(saleProduct, maxPurchaseQty)
                } else {
                  setQty((q) => Math.min(maxPurchaseQty, q + 1))
                }
              }}
              className="flex h-8 w-8 items-center justify-center text-gray-950 active:scale-95 disabled:text-gray-300"
              disabled={!isInStock}
              aria-label="Increase quantity"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isInStock}
            className="pd-khmer-font flex h-12 items-center justify-center gap-2 rounded-full bg-pink-600 px-4 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-pink-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            <span>{isInStock ? t('common.addToCart') : t('common.outOfStock')}</span>
            {isInStock && <span>{formatCurrency(currentPrice * qty)}</span>}
          </button>
        </div>
      </div>

    </div>
  )
}

function FeatureChip({ icon: Icon, label, iconClass = 'text-pink-600' }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-1.5 border-r border-gray-100 px-2 text-center last:border-r-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50">
        <Icon size={17} className={iconClass} />
      </span>
      <span className="pd-khmer-font text-[11px] sm:text-xs font-semibold leading-normal text-gray-600 text-center">{label}</span>
    </div>
  )
}
