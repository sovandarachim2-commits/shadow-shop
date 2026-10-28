import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Gift, Heart, Minus, PackageSearch, Plus, ShoppingBag, ShoppingCart, Star, Trash2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import { ProductThumb } from '@/components/customer/CustomerUi'
import { showCartAddedToast } from '@/components/customer/CartAddedToast'
import { showWishlistToast } from '@/components/customer/WishlistToast'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'

function toCartProduct(productSet, categoryLabel) {
  const imageUrl = productSet.image_url || productSet.image
  const price = Number(productSet.display_price || productSet.discount_price || productSet.price || 0)
  return {
    id: `set-${productSet.id}`,
    cart_key: `set-${productSet.id}`,
    item_type: 'set',
    product_set_id: productSet.id,
    name: productSet.name,
    primary_image: imageUrl,
    image_url: imageUrl,
    retail_price: price,
    cost_price: 0,
    current_stock: Number(productSet.current_stock || 0),
    is_flash_sale_active: productSet.is_flash_sale_active,
    flash_sale_max_order_qty: productSet.flash_sale_max_order_qty,
    category_name: categoryLabel,
  }
}

function relatedProductAvailable(item) {
  if (item.type === 'set') return Number(item.current_stock || 0) > 0
  return item.is_available_for_sale ?? Number(item.current_stock || 0) > 0
}

function RelatedSetCard({ item, priority = false, onAuthRequired }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addItem, updateQuantity, items } = useCartStore()
  const { toggle, isWishlisted } = useWishlistStore()
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const isSet = item.type === 'set'
  const cartProduct = isSet
    ? toCartProduct(item, t('product.productSet'))
    : (item.display_price ? { ...item, retail_price: item.display_price } : item)
  const cartKey = isSet ? cartProduct.cart_key : item.id
  const cartItem = items.find((entry) => isSet
    ? entry.product?.cart_key === cartKey
    : entry.product?.id === item.id)
  const qty = cartItem?.quantity || 0
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const wishlisted = !isSet && isWishlisted(item.id)
  const imageUrl = isSet ? (item.image_url || item.image) : item.primary_image
  const price = Number(isSet ? (item.display_price || item.discount_price || item.price || 0) : (item.display_price || item.retail_price || 0))
  const oldPrice = Number(isSet ? (item.old_price || item.price || 0) : (item.old_price || 0))
  const available = relatedProductAvailable(item)
  const path = isSet ? `/product-set/${item.id}` : `/product/${item.id}`

  useEffect(() => {
    setImageFailed(false)
    setImageLoaded(false)
  }, [imageUrl])

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    addItem(cartProduct, 1)
    showCartAddedToast(cartProduct, navigate)
  }

  const handleIncrease = (e) => {
    e.stopPropagation()
    if (!loggedIn) {
      onAuthRequired?.('cart')
      return
    }
    addItem(cartProduct, 1)
  }

  const handleDecrease = (e) => {
    e.stopPropagation()
    updateQuantity(cartKey, qty - 1)
  }

  const handleWishlist = (e) => {
    e.stopPropagation()
    toggle(item)
    showWishlistToast(wishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'), !wishlisted)
  }

  return (
    <article
      onClick={() => navigate(path)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        {!isSet && (
          <button type="button" onClick={handleWishlist} className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 shadow-sm transition ${wishlisted ? 'border-pink-200 text-pink-600' : 'border-pink-100 text-gray-500 hover:text-pink-600'}`} aria-label="Toggle wishlist">
            <Heart size={17} className={wishlisted ? 'fill-pink-500' : ''} />
          </button>
        )}
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={item.name}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            className={`absolute inset-0 h-full w-full ${isSet ? 'object-cover' : 'object-contain p-2'} transition duration-300 group-hover:scale-[1.03]`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-300">
            {isSet ? <Gift size={44} className="text-pink-300" /> : <ShoppingBag size={30} />}
          </div>
        )}
        {!imageLoaded && imageUrl && !imageFailed && <div className="pointer-events-none absolute inset-0 animate-pulse bg-gray-100" />}
        {isSet && (
          <span className="absolute left-3 top-3 rounded-full bg-pink-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-pink-100">
            {t('product.productSetBadge')}
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-col p-3.5 sm:min-h-[230px] sm:p-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-gray-400 sm:text-xs">{isSet ? t('product.productSet') : (item.brand_name || item.category_name || t('product.cosmetics'))}</span>
          {!isSet && <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-500 sm:text-xs"><Star size={14} className="fill-yellow-400 text-yellow-400" />{item.rating > 0 ? item.rating : '4.8'} <span className="text-gray-300">(126)</span></span>}
        </div>
        <div className="mt-1 flex min-w-0 items-start justify-between gap-2">
          <h3 className="khmer-title line-clamp-2 min-w-0 flex-1 text-base text-gray-950 sm:text-sm">{item.name}</h3>
          <div className="shrink-0 text-right">
            <span className="text-base font-black leading-none text-pink-600 sm:text-lg">{formatCurrency(price)}</span>
            {oldPrice > price && <span className="mt-1 block text-xs font-semibold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>}
          </div>
        </div>
        <div className="mt-auto pt-4">
          {!available ? (
            <span className="flex h-[42px] w-full items-center justify-center rounded-xl bg-gray-100 text-xs font-black text-gray-400 sm:h-12">{t('common.soldOut')}</span>
          ) : qty === 0 ? (
            <button onClick={handleAdd} className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-3 text-[13px] font-semibold text-white shadow-sm shadow-pink-100 transition hover:bg-pink-700 active:scale-[0.99] sm:h-12 sm:gap-2 sm:text-sm">
              <ShoppingCart size={17} /> <span className="sm:hidden">{t('common.add')}</span><span className="hidden sm:inline">{t('common.addToCart')}</span>
            </button>
          ) : (
            <div onClick={(e) => e.stopPropagation()} className="flex h-[42px] w-full items-center justify-between rounded-xl bg-pink-600 px-1.5 sm:h-12 sm:px-2">
              <button onClick={handleDecrease} className="flex h-8 w-9 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-9 sm:w-10">
                {qty === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
              </button>
              <span className="min-w-[34px] text-center text-[13px] font-semibold text-white sm:min-w-[40px] sm:text-sm">{qty}</span>
              <button onClick={handleIncrease} className="flex h-8 w-9 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-9 sm:w-10">
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function RelatedSetSkeleton() {
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

export default function ProductSetDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, updateQuantity, items, clearSelection, toggleSelected } = useCartStore()
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const openAuthModal = useUiStore((s) => s.openAuthModal)
  const [imageFailed, setImageFailed] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [purchaseQty, setPurchaseQty] = useState(1)
  const galleryScrollRef = useRef(null)
  const galleryScrollRaf = useRef(0)

  const onAuthRequired = (action = 'cart') => {
    openAuthModal(action)
  }

  const { data: productSet, isLoading, isError } = useQuery({
    queryKey: ['product-set-detail', id],
    queryFn: () => productsApi.sets.get(id).then((r) => r.data),
    enabled: !!id,
    ...STOREFRONT_LIVE_QUERY,
  })
  const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
    queryKey: ['product-set-recommended-products', id],
    queryFn: () => productsApi.products.list({
      is_active: true,
      ordering: '-created_at',
      page_size: 12,
    }).then((r) => r.data),
    enabled: !!id,
    ...STOREFRONT_LIVE_QUERY,
  })

  const cartProduct = useMemo(() => productSet ? toCartProduct(productSet, t('product.productSet')) : null, [productSet, t])
  const cartItem = cartProduct ? items.find((item) => item.product?.cart_key === cartProduct.cart_key) : null
  const qty = cartItem?.quantity || 0
  const setStock = Number(productSet?.current_stock || 0)
  const price = Number(productSet?.display_price || productSet?.discount_price || productSet?.price || 0)
  const oldPrice = productSet?.old_price || productSet?.discount_price ? Number(productSet?.price || 0) : 0
  const galleryImages = useMemo(() => {
    if (!productSet) return []
    const managed = (productSet.images || [])
      .map((img) => ({ id: img.id, image: img.image, is_primary: img.is_primary }))
      .filter((img) => img.image)
    const legacyUrl = productSet.image_url || productSet.image
    const hasLegacyUrl = legacyUrl && managed.some((img) => img.image === legacyUrl)
    const images = hasLegacyUrl || !legacyUrl ? managed : [{ id: 'legacy', image: legacyUrl, is_primary: true }, ...managed]
    const primaryIndex = images.findIndex((img) => img.is_primary)
    if (primaryIndex > 0) {
      const primary = images[primaryIndex]
      return [primary, ...images.slice(0, primaryIndex), ...images.slice(primaryIndex + 1)]
    }
    return images
  }, [productSet])
  const isInStock = setStock > 0
  const productIdsInsideSet = new Set((productSet?.items || [])
    .map((item) => item.product || item.product_id)
    .filter(Boolean)
    .map((itemId) => String(itemId)))
  const recommendedProducts = (recommendedData?.results || recommendedData || [])
    .filter((item) => !productIdsInsideSet.has(String(item.id)))
    .map((item) => ({ ...item, type: 'product' }))
    .slice(0, 8)
  const relatedItems = recommendedProducts
  const relatedLoading = recommendedLoading

  useEffect(() => {
    setActiveImg(0)
    setImageFailed(false)
    if (galleryScrollRef.current) galleryScrollRef.current.scrollLeft = 0
  }, [productSet?.id])

  useEffect(() => {
    galleryImages.forEach((img, index) => {
      if (!img?.image || Math.abs(index - activeImg) > 2) return
      const preload = new Image()
      preload.src = img.image
    })
  }, [galleryImages, activeImg])

  const showImageAt = (index, behavior = 'smooth') => {
    if (galleryImages.length === 0) return
    setImageFailed(false)
    const next = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length
    setActiveImg(next)
    const track = galleryScrollRef.current
    const slide = track?.children?.[next]
    if (track && slide) track.scrollTo({ left: slide.offsetLeft, behavior })
  }

  const handleGalleryScroll = () => {
    const track = galleryScrollRef.current
    if (!track || galleryImages.length === 0) return
    if (galleryScrollRaf.current) cancelAnimationFrame(galleryScrollRaf.current)
    galleryScrollRaf.current = requestAnimationFrame(() => {
      const width = track.clientWidth || 1
      const index = Math.round(track.scrollLeft / width)
      const clamped = Math.min(galleryImages.length - 1, Math.max(0, index))
      setActiveImg((current) => (current === clamped ? current : clamped))
    })
  }

  const addSetToCart = () => {
    if (!cartProduct || !isInStock) return
    if (!loggedIn) return onAuthRequired('cart')
    addItem(cartProduct, 1)
    toast.success(t('product.productSetAdded'))
  }

  const addSelectedSetToCart = () => {
    if (!cartProduct || !isInStock) return
    if (!loggedIn) return onAuthRequired('cart')
    addItem(cartProduct, purchaseQty)
    toast.success(t('product.productSetAdded'))
  }

  const buyNow = () => {
    if (!cartProduct || !isInStock) return
    if (!loggedIn) return onAuthRequired('checkout')
    addItem(cartProduct, 1)
    clearSelection()
    toggleSelected(cartProduct.cart_key)
    navigate('/checkout')
  }

  if (isLoading) {
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

  if (isError || !productSet) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <PackageSearch size={52} className="mx-auto mb-4 text-gray-200" />
        <h1 className="text-xl font-black text-gray-950">{t('product.productSetNotFound')}</h1>
        <button onClick={() => navigate('/shop')} className="shop-btn-primary mt-6 px-8">
          {t('common.browseProducts')}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white pb-28 md:pb-0">
      <div className="-mx-4 -mt-4 mb-4 grid min-h-[64px] grid-cols-[44px_1fr_44px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950">{t('product.details')}</h1>
        <HeaderActionIcons />
      </div>

      <div className="mb-4 hidden items-center gap-3 md:flex">
        <div className="flex items-center gap-3 text-sm font-black text-gray-600 hover:text-pink-600">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700">
            <ChevronLeft size={22} />
          </button>
          <span>{t('product.details')}</span>
        </div>
      </div>

      <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-start md:gap-10">
        <section className="-mx-4 overflow-hidden bg-white md:mx-0 md:rounded-[28px] md:border md:border-pink-100 md:bg-gradient-to-br md:from-pink-50 md:to-white md:p-3 md:shadow-card lg:p-4">
          <div className="relative overflow-hidden bg-pink-50 md:rounded-[24px] md:bg-white">
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => showImageAt(activeImg - 1)}
                  aria-label="Previous product set image"
                  className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-lg shadow-pink-100 transition active:scale-95 md:flex"
                >
                  <ChevronLeft size={22} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => showImageAt(activeImg + 1)}
                  aria-label="Next product set image"
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
              {galleryImages.length > 0 && !imageFailed ? (
                galleryImages.map((img, i) => (
                  <div
                    key={img.id ?? i}
                    className="box-border h-full w-full min-w-full shrink-0 grow-0 basis-full snap-center snap-always overflow-hidden"
                  >
                    <img
                      src={img.image}
                      alt={`${productSet.name} ${i + 1}`}
                      draggable={false}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      onError={() => setImageFailed(true)}
                      className="h-full w-full max-h-full max-w-full object-contain p-3 md:p-4"
                    />
                  </div>
                ))
              ) : (
                <div className="box-border flex h-full w-full min-w-full shrink-0 grow-0 basis-full snap-center items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100">
                  <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-pink-600 text-white shadow-xl shadow-pink-200">
                    <Gift size={50} />
                  </div>
                </div>
              )}
            </div>
            <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-pink-600 shadow-sm">
              {t('product.productSet').toUpperCase()}
            </span>
            {galleryImages.length > 1 && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/80 px-2 py-1 shadow-sm">
                <div className="pointer-events-auto flex max-w-[180px] gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {galleryImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => showImageAt(i)}
                      aria-label={`Show product set image ${i + 1}`}
                      className={`h-1.5 shrink-0 rounded-full transition-all duration-300 ${i === activeImg ? 'w-5 bg-pink-600' : 'w-1.5 bg-pink-200'}`}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium tabular-nums text-pink-600">{activeImg + 1}/{galleryImages.length}</span>
              </div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="mt-3 hidden gap-2.5 overflow-x-auto scroll-smooth px-4 py-0 md:flex md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {galleryImages.map((img, i) => (
                <button
                  key={img.id ?? i}
                  type="button"
                  onClick={() => showImageAt(i)}
                  className={`aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition duration-300 md:w-24 ${i === activeImg ? 'border-pink-500' : 'border-transparent'}`}
                >
                  <img src={img.image} alt="" draggable={false} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="pt-4 md:pt-0">
          <p className="text-xs font-medium uppercase tracking-wide text-pink-600">{t('product.productSet')}</p>
          <h1 className="mt-1 line-clamp-2 text-[22px] font-semibold leading-tight text-gray-950 md:line-clamp-none md:text-4xl md:font-black">{productSet.name}</h1>
          <p className="mt-2 text-sm font-medium text-gray-500">
            {t('product.productsInsideCount', { count: productSet.items?.length || 0 })}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${isInStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`} />
              {isInStock ? t('common.inStock') : t('common.outOfStock')}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-[30px] font-bold leading-none text-pink-600 md:text-4xl md:font-black">{formatCurrency(price)}</span>
            {oldPrice > price && (
              <span className="text-base font-medium text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
            )}
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            {productSet.description || t('product.setDescriptionFallback')}
          </p>


          <div className="mt-6 hidden flex-col gap-3 sm:flex-row md:flex">
            {qty === 0 ? (
              <button
                onClick={addSetToCart}
                disabled={!isInStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-pink-500 bg-white py-4 text-base font-black text-pink-600 transition hover:bg-pink-50 disabled:border-gray-200 disabled:text-gray-400"
              >
                <ShoppingCart size={19} /> {t('common.addToCart')}
              </button>
            ) : (
              <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-pink-100 bg-pink-50 py-3">
                <button onClick={() => updateQuantity(cartProduct.cart_key, qty - 1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white">
                  {qty === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                </button>
                <span className="min-w-10 text-center text-base font-black text-gray-950">{qty}</span>
                <button
                  onClick={() => {
                    if (!loggedIn) return onAuthRequired('cart')
                    updateQuantity(cartProduct.cart_key, Math.min(setStock, qty + 1))
                  }}
                  disabled={qty >= setStock}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
            <button onClick={buyNow} disabled={!isInStock} className="shop-btn-primary flex-1 py-4 text-base disabled:opacity-50">
              <Zap size={19} /> {t('common.buyNow')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="text-lg font-black text-gray-950">{t('product.productsInside')}</h2>
            <div className="mt-4 space-y-3">
              {(productSet.items || []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3">
                  <ProductThumb product={{ name: item.product_name, primary_image: item.product_image }} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-gray-950">{item.product_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-950">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {(relatedLoading || relatedItems.length > 0) && (
        <section className="mt-10 md:mt-14">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-pink-600">
                {t('product.recommendedProducts')}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
                {t('product.youMayAlsoLike')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="hidden rounded-full border border-pink-100 bg-white px-4 py-2 text-sm font-black text-pink-600 shadow-sm transition hover:bg-pink-50 md:inline-flex"
            >
              {t('common.viewAll')}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
            {relatedLoading
              ? Array.from({ length: 4 }).map((_, index) => <RelatedSetSkeleton key={index} />)
              : relatedItems.map((item, index) => (
                <RelatedSetCard key={`${item.type}-${item.id}`} item={item} priority={index < 2} onAuthRequired={onAuthRequired} />
              ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[112px_1fr] items-center gap-3">
          <div className="flex h-12 items-center justify-between rounded-full border border-gray-200 bg-white px-3">
            <button
              type="button"
              onClick={() => setPurchaseQty((value) => Math.max(1, value - 1))}
              disabled={purchaseQty <= 1}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 items-center justify-center text-gray-800 transition active:scale-95 disabled:text-gray-300"
            >
              <Minus size={16} strokeWidth={2.5} />
            </button>
            <span className="min-w-6 text-center text-sm font-bold text-gray-950">{purchaseQty}</span>
            <button
              type="button"
              onClick={() => setPurchaseQty((value) => Math.min(setStock, value + 1))}
              disabled={!isInStock || purchaseQty >= setStock}
              aria-label="Increase quantity"
              className="flex h-8 w-8 items-center justify-center text-gray-950 transition active:scale-95 disabled:text-gray-300"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
          <button
            onClick={addSelectedSetToCart}
            disabled={!isInStock}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-pink-600 px-4 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-pink-700 disabled:bg-gray-300 disabled:text-gray-500"
          >
            <span>{isInStock ? t('common.addToCart') : t('common.outOfStock')}</span>
            {isInStock && <span>{formatCurrency(price * purchaseQty)}</span>}
          </button>
        </div>
      </div>
     </div>
   )
 }
