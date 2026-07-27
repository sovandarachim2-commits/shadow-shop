import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, ChevronDown, Heart, ShoppingCart, Zap, Plus, Minus, Check,
  PackageSearch, Star, Droplet, Sparkles, ShieldCheck, Leaf, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import { CosmeticArt } from '@/components/customer/CustomerUi'
import { showCartAddedToast } from '@/components/customer/CartAddedToast'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'

function cleanProductText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isAvailableForSale(product) {
  return product?.is_available_for_sale ?? Number(product?.current_stock || 0) > 0
}

function RelatedProductCard({ product, priority = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addItem, updateQuantity, items } = useCartStore()
  const { toggle, isWishlisted } = useWishlistStore()
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const wishlisted = isWishlisted(product.id)
  const cartItem = items.find((item) => item.product?.id === product.id)
  const qty = cartItem?.quantity || 0
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product
  const available = isAvailableForSale(product)
  const price = Number(product.display_price || product.retail_price || 0)
  const oldPrice = Number(product.old_price || 0)
  const discountPct = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem(saleProduct, 1)
    showCartAddedToast(saleProduct, navigate)
  }

  const handleWishlist = (e) => {
    e.stopPropagation()
    toggle(product)
    toast.success(wishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
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
            {!imageLoaded && <CosmeticArt tone={product.tone} className="min-h-full" />}
            <img
              src={product.primary_image}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03]"
            />
          </>
        ) : (
          <CosmeticArt tone={product.tone} className="min-h-full bg-gray-50" />
        )}
      </div>
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
          <span className="text-lg font-black leading-none text-pink-600">{formatCurrency(price)}</span>
          {oldPrice > price && <span className="ml-2 text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>}
        </div>
        <div className="mt-auto pt-3">
          {!available ? (
            <span className="flex h-10 w-full items-center justify-center rounded-xl bg-gray-100 text-xs font-black text-gray-400">{t('common.soldOut')}</span>
          ) : qty === 0 ? (
            <button onClick={handleAdd} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-3 text-xs font-black text-white shadow-sm shadow-pink-100 transition active:scale-95">
              <ShoppingCart size={14} /> {t('common.addToCart')}
            </button>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="grid h-10 grid-cols-[40px_1fr_40px] overflow-hidden rounded-xl bg-pink-600">
              <button onClick={() => updateQuantity(product.id, qty - 1)} className="flex items-center justify-center bg-white/10 text-white transition active:scale-95 hover:bg-white/20">
                {qty === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
              </button>
              <span className="flex items-center justify-center text-sm font-black text-white">{qty}</span>
              <button onClick={() => addItem(saleProduct, 1)} className="flex items-center justify-center bg-white/10 text-white transition active:scale-95 hover:bg-white/20">
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

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
  const [openAccordion, setOpenAccordion] = useState(null)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [added, setAdded] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const galleryScrollRef = useRef(null)
  const thumbScrollRef = useRef(null)
  const galleryScrollRaf = useRef(0)
  const reviewsSectionRef = useRef(null)
  const addItem = useCartStore((s) => s.addItem)
  const clearSelection = useCartStore((s) => s.clearSelection)
  const toggleSelected = useCartStore((s) => s.toggleSelected)
  const loggedIn = useAuthStore((s) => s.isAuthenticated)

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.products.get(id).then((r) => r.data),
  })
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
    staleTime: 30_000,
  })
  const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
    queryKey: ['recommended-products', id],
    queryFn: () => productsApi.products.list({
      is_active: true,
      ordering: '-created_at',
      page_size: 12,
    }).then((r) => r.data),
    enabled: Boolean(product?.id),
    staleTime: 30_000,
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

  const toggleAccordion = (key) => {
    setOpenAccordion((current) => (current === key ? null : key))
  }

  useEffect(() => {
    setActiveImg(0)
    setQty(1)
    setOpenAccordion(null)
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

    addItem(saleProduct, Math.min(qty, maxPurchaseQty || qty))
    setAdded(true)
    showCartAddedToast(saleProduct, navigate, Math.min(qty, maxPurchaseQty || qty))
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (!product || !isInStock) return

    addItem(saleProduct, Math.min(qty, maxPurchaseQty || qty))
    clearSelection()
    toggleSelected(product.id)
    navigate('/checkout')
  }

  const handleSubmitReview = (e) => {
    e.preventDefault()
    if (!loggedIn) {
      toast.error(t('product.loginToReview'))
      navigate('/login', { state: { from: `/product/${id}` } })
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
    <div className="bg-white pb-24 md:pb-0">
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
              onClick={() => {
                setIsWishlisted(!isWishlisted)
                toast.success(isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
              }}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-pink-600 shadow-xl shadow-pink-100"
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
              className="flex aspect-square w-full max-h-[420px] min-h-[360px] snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-webkit-overflow-scrolling:touch] md:max-h-none md:min-h-[480px] lg:min-h-[560px] [&::-webkit-scrollbar]:hidden"
            >
              {images.length > 0 ? (
                images.map((img, i) => (
                  <div key={img.id || i} className="h-full w-full shrink-0 snap-center snap-always">
                    <img
                      src={img.image}
                      alt={`${product.name} ${i + 1}`}
                      draggable={false}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="h-full w-full object-contain p-3 md:p-4"
                    />
                  </div>
                ))
              ) : (
                <div className="h-full w-full shrink-0 snap-center">
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

          <h1 className="mt-1 line-clamp-2 text-[22px] font-semibold leading-tight tracking-tight text-gray-950 md:line-clamp-none md:text-4xl md:font-black lg:text-5xl">
            {product.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span>{displayRating}</span>
              <span className="text-gray-300">({reviewCount || reviews.length || 126})</span>
            </div>
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
              onClick={() => {
                setIsWishlisted(!isWishlisted)
                toast.success(isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition ${
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
              <button disabled={!isInStock || qty >= maxPurchaseQty} onClick={() => setQty((q) => Math.min(maxPurchaseQty, q + 1))} className="shop-icon-btn h-10 w-10 disabled:opacity-50">
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
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-4 text-base font-black transition ${
                added ? 'border-green-500 bg-green-500 text-white' : 'border-pink-500 bg-white text-pink-600 hover:bg-pink-50'
              }`}
            >
              {added ? <Check size={19} /> : <ShoppingCart size={19} />}
              {added ? t('product.added') : t('common.addToCart')}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!isInStock}
              className="shop-btn-primary flex-1 py-4 text-base"
            >
              <Zap size={19} /> {t('common.buyNow')}
            </button>
          </div>

          <div className="mt-4 border-t border-gray-100 md:mt-8">
            {/* Description */}
            {productDescription && (
              <div className="border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => toggleAccordion('description')}
                  className="flex w-full items-center justify-between py-4 text-left"
                >
                  <span className="text-base font-medium text-gray-900">{t('product.description')}</span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition ${openAccordion === 'description' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openAccordion === 'description' && (
                  <div className="pb-4 text-sm leading-6 text-gray-600">
                    <p className="whitespace-pre-line">{productDescription}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ingredients */}
            {productIngredients && (
              <div className="border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => toggleAccordion('ingredients')}
                  className="flex w-full items-center justify-between py-4 text-left"
                >
                  <span className="text-base font-medium text-gray-900">{t('product.ingredients')}</span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition ${openAccordion === 'ingredients' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openAccordion === 'ingredients' && (
                  <div className="pb-4 text-sm leading-6 text-gray-600">
                    <p className="whitespace-pre-line">{productIngredients}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews */}
            <div ref={reviewsSectionRef} className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => toggleAccordion('reviews')}
                className="flex w-full items-center justify-between py-4 text-left"
              >
                <span className="text-base font-medium text-gray-900">
                  {t('product.reviews')} ({reviewCount || reviews.length || 0})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-pink-600">{displayRating}</span>
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <ChevronRight size={18} className="text-gray-400" />
                </span>
              </button>
              {openAccordion === 'reviews' && (
                <div className="space-y-5 pb-4">
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
                        className="rounded-full bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
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
                        {review.comment && <p className="mt-3 text-sm leading-6 text-gray-600">{review.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(190px,220px))] md:gap-4">
            {productsMoreLoading
              ? Array.from({ length: 4 }).map((_, index) => <RelatedProductSkeleton key={index} />)
              : relatedProducts.map((item, index) => (
                <RelatedProductCard key={item.id} product={item} priority={index < 2} />
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
              onClick={() => setQty((q) => Math.min(maxPurchaseQty, q + 1))}
              className="flex h-8 w-8 items-center justify-center text-gray-950 active:scale-95 disabled:text-gray-300"
              disabled={!isInStock || qty >= maxPurchaseQty}
              aria-label="Increase quantity"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isInStock}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-pink-600 px-4 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-pink-700 disabled:bg-gray-300 disabled:text-gray-500"
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
    <div className="flex min-w-0 flex-col items-center justify-center gap-2 border-r border-gray-100 px-2 text-center last:border-r-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50">
        <Icon size={17} className={iconClass} />
      </span>
      <span className="text-[10px] font-black leading-tight text-gray-500">{label}</span>
    </div>
  )
}
