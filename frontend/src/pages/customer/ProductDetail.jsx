import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Heart, ShoppingCart, Zap, Plus, Minus, Check,
  PackageSearch, Star, Droplet, Sparkles, ShieldCheck, Leaf, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import { CosmeticArt, RatingRow } from '@/components/customer/CustomerUi'
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
      <div className="relative h-44 overflow-hidden bg-white">
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
              className={`absolute inset-0 h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03] ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <CosmeticArt tone={product.tone} className="min-h-full" />
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
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[15px] font-black text-pink-600 sm:text-base">{formatCurrency(price)}</span>
            {oldPrice > price && <span className="ml-2 text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>}
          </div>
          {!available ? (
            <span className="shrink-0 rounded-2xl bg-gray-100 px-3 py-2 text-[11px] font-black text-gray-400">{t('common.soldOut')}</span>
          ) : qty === 0 ? (
            <button onClick={handleAdd} className="shrink-0 rounded-2xl bg-pink-600 px-3.5 py-2 text-[11px] font-black text-white shadow-sm shadow-pink-100 transition active:scale-95">
              {t('common.add')}
            </button>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-0.5 rounded-2xl bg-pink-600 px-1 py-1">
              <button onClick={() => updateQuantity(product.id, qty - 1)} className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30">
                {qty === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
              </button>
              <span className="min-w-[22px] text-center text-sm font-black text-white">{qty}</span>
              <button onClick={() => addItem(saleProduct, 1)} className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 text-white transition active:scale-95 hover:bg-white/30">
                <Plus size={12} />
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
      <div className="h-44 animate-pulse bg-gray-100" />
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
  const [tab, setTab] = useState('description')
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [added, setAdded] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const galleryDragRef = useRef({ active: false, startX: 0, moved: false })
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
  const currentImage = images[activeImg]
  const stock = product?.current_stock ?? 0
  const isInStock = product?.is_available_for_sale ?? stock > 0
  const oldPrice = Number(product?.old_price || product?.wholesale_price || 0)
  const currentPrice = Number(product?.display_price || product?.retail_price || 0)
  const savedAmount = oldPrice > currentPrice ? oldPrice - currentPrice : 0
  const saleProduct = product?.display_price ? { ...product, retail_price: product.display_price } : product
  const flashSaleMaxQty = product?.is_flash_sale_active ? Number(product?.flash_sale_max_order_qty || 0) : 0
  const maxPurchaseQty = flashSaleMaxQty > 0 ? (stock > 0 ? Math.min(stock, flashSaleMaxQty) : flashSaleMaxQty) : (stock > 0 ? stock : 9999)
  const productDescription = cleanProductText(product?.description)
  const productBenefits = cleanProductText(product?.benefits)
  const productHowToUse = cleanProductText(product?.how_to_use)
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
  const detailTabs = [
    ...(productDescription ? [{ key: 'description', label: t('product.description'), content: productDescription }] : []),
    ...(productBenefits ? [{ key: 'benefits', label: t('product.benefits'), content: productBenefits }] : []),
    ...(productHowToUse ? [{ key: 'how_to_use', label: t('product.howToUse'), content: productHowToUse }] : []),
    { key: 'reviews', label: t('product.reviews') },
  ]
  const activeDetailTab = detailTabs.find((item) => item.key === tab) || detailTabs[0]

  useEffect(() => {
    setActiveImg(0)
    setQty(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [product?.id])

  useEffect(() => {
    if (!detailTabs.some((item) => item.key === tab)) {
      setTab(detailTabs[0]?.key || 'reviews')
    }
  }, [productDescription, productBenefits, productHowToUse, tab])

  const showImageAt = (index) => {
    if (images.length === 0) return
    setActiveImg((index + images.length) % images.length)
  }

  const handleGalleryPointerDown = (e) => {
    if (images.length <= 1 || (e.pointerType === 'mouse' && e.button !== 0)) return
    galleryDragRef.current = { active: true, startX: e.clientX, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const handleGalleryPointerMove = (e) => {
    const drag = galleryDragRef.current
    if (!drag.active) return
    if (Math.abs(e.clientX - drag.startX) > 8) {
      drag.moved = true
      e.preventDefault()
    }
  }

  const handleGalleryPointerEnd = (e) => {
    const drag = galleryDragRef.current
    if (!drag.active) return
    drag.active = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    const dx = e.clientX - drag.startX
    if (drag.moved && Math.abs(dx) > 45) {
      showImageAt(activeImg + (dx < 0 ? 1 : -1))
    }
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
        <div className="h-[520px] animate-pulse rounded-3xl bg-pink-50" />
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

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="overflow-hidden rounded-[28px] bg-white md:border md:border-pink-100 md:bg-gradient-to-br md:from-pink-50 md:to-white md:p-4 md:shadow-card">
          <div className="relative overflow-hidden rounded-[28px] bg-gray-50 md:bg-white">
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
                  className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-lg shadow-pink-100 transition active:scale-95 md:flex"
                >
                  <ChevronLeft size={22} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => showImageAt(activeImg + 1)}
                  aria-label="Next product image"
                  className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-lg shadow-pink-100 transition active:scale-95 md:flex"
                >
                  <ChevronRight size={22} strokeWidth={3} />
                </button>
              </>
            )}
            <div
              className="aspect-square max-h-[520px] cursor-grab touch-pan-y select-none active:cursor-grabbing"
              onPointerDown={handleGalleryPointerDown}
              onPointerMove={handleGalleryPointerMove}
              onPointerUp={handleGalleryPointerEnd}
              onPointerCancel={handleGalleryPointerEnd}
            >
              {currentImage ? (
                <img src={currentImage.image} alt={product.name} draggable={false} className="h-full w-full object-contain p-4 md:p-5" />
              ) : (
                <CosmeticArt tone={product.tone} className="min-h-full" />
              )}
            </div>
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-black text-pink-600 shadow-sm ring-1 ring-pink-50">
                <div className="flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => showImageAt(i)}
                      aria-label={`Show product image ${i + 1}`}
                      className={`h-2 rounded-full transition-all ${i === activeImg ? 'w-5 bg-pink-600' : 'w-2 bg-pink-200'}`}
                    />
                  ))}
                </div>
                <span>{activeImg + 1}/{images.length}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-center">
            <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-gray-50 px-2.5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:bg-white/70">
            {images.length > 0
              ? images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition md:w-20 ${i === activeImg ? 'border-pink-500 shadow-sm shadow-pink-100' : 'border-transparent opacity-75 hover:opacity-100'}`}
                  aria-label={`Show product image ${i + 1}`}
                >
                  <img src={img.image} alt="" className="h-full w-full object-cover bg-white" />
                </button>
              ))
              : ['pink', 'rose', 'red', 'gold'].map((tone, i) => (
                <button key={tone} onClick={() => setActiveImg(i)} className="aspect-square w-16 shrink-0 overflow-hidden rounded-xl border border-pink-100 bg-white md:w-20">
                  <CosmeticArt tone={tone} className="min-h-full" />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-pink-600">
              <Star size={14} className="fill-pink-600" /> {t('home.bestSeller')}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${
              isInStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}>
              <span className={`h-2 w-2 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`} />
              {isInStock ? t('common.inStock') : t('common.outOfStock')}
            </span>
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight text-gray-950 md:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <RatingRow rating={Number(product.rating || 0)} reviews={Number(product.review_count || 0)} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-pink-600">{formatCurrency(currentPrice)}</span>
              {oldPrice > currentPrice && (
                <span className="text-base font-bold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
              )}
            </div>
            {savedAmount > 0 && (
              <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-600">
                {t('product.saveAmount', { amount: formatCurrency(savedAmount) })}
              </span>
            )}
          </div>

          {productDescription && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              {productDescription}
            </p>
          )}

          <div className="mt-5 grid grid-cols-4 overflow-hidden rounded-2xl bg-gray-50/80 py-3 shadow-sm ring-1 ring-gray-100">
            <FeatureChip icon={Droplet} label={t('product.deepHydration')} />
            <FeatureChip icon={Sparkles} label={t('product.brightening')} />
            <FeatureChip icon={ShieldCheck} label={t('product.skinBarrier')} />
            <FeatureChip icon={Leaf} label={t('product.allSkinTypes')} iconClass="text-green-500" />
          </div>

          <div className="mt-7 hidden flex-wrap items-center gap-4 border-y border-gray-100 py-5 md:flex">
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

          <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex gap-4 border-b border-gray-100">
              {detailTabs.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`border-b-2 px-1 pb-3 text-sm font-black ${activeDetailTab.key === item.key ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="py-5 text-sm leading-7 text-gray-600">
              {activeDetailTab.content && <p className="whitespace-pre-line">{activeDetailTab.content}</p>}
              {activeDetailTab.key === 'reviews' && (
                <div className="space-y-5">
                  <form onSubmit={handleSubmitReview} className="rounded-2xl bg-gray-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-gray-950">{t('product.rateProduct')}</p>
                        <p className="text-xs font-semibold text-gray-400">{t('product.reviewHint')}</p>
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
                        className="rounded-full bg-pink-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-60"
                      >
                        {reviewMutation.isPending ? t('product.saving') : t('product.submitReview')}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-3">
                    {reviews.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                        <p className="text-sm font-black text-gray-500">{t('product.noReviewsYet')}</p>
                      </div>
                    ) : reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-gray-950">{review.user_name || t('product.customer')}</p>
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
                          <span className="text-xs font-semibold text-gray-400">
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
                {showingSameCategory ? (product.category_name || 'Related Products') : 'Recommended Products'}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                {showingSameCategory ? 'More From This Category' : 'You May Also Like'}
              </h2>
            </div>
            {showingSameCategory && product.category && (
              <button
                type="button"
                onClick={() => navigate(`/shop?category=${product.category}`)}
                className="hidden rounded-full border border-pink-100 bg-white px-4 py-2 text-sm font-black text-pink-600 shadow-sm transition hover:bg-pink-50 md:inline-flex"
              >
                View all
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
              View all {product.category_name || 'products'}
            </button>
          )}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[112px_1fr] items-center gap-3">
          <div className="flex h-12 items-center justify-between rounded-[1.35rem] border border-gray-200 bg-white px-3 shadow-sm">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(product.min_order_qty || 1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 active:scale-95 disabled:text-gray-300"
              disabled={qty <= (product.min_order_qty || 1)}
              aria-label="Decrease quantity"
            >
              <Minus size={16} strokeWidth={2.5} />
            </button>
            <span className="min-w-6 text-center text-sm font-black text-gray-950">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxPurchaseQty, q + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-950 active:scale-95 disabled:text-gray-300"
              disabled={!isInStock || qty >= maxPurchaseQty}
              aria-label="Increase quantity"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!isInStock}
            className="flex h-12 items-center justify-center gap-2 rounded-[1.35rem] bg-pink-600 px-4 text-sm font-black text-white shadow-lg shadow-pink-100 transition active:scale-[0.98] hover:bg-pink-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-gray-100"
          >
            <span>{isInStock ? t('common.addToCart') : t('common.outOfStock')}</span>
            {isInStock && <span className="opacity-90">{formatCurrency(currentPrice * qty)}</span>}
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
