import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Gift, Minus, PackageSearch, Plus, ShoppingCart, Store, Trash2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import { ProductThumb } from '@/components/customer/CustomerUi'

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

export default function ProductSetDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { addItem, updateQuantity, items, clearSelection, toggleSelected } = useCartStore()
  const [imageFailed, setImageFailed] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const galleryDragRef = useRef({ active: false, startX: 0, moved: false })

  const { data: productSet, isLoading, isError } = useQuery({
    queryKey: ['product-set-detail', id],
    queryFn: () => productsApi.sets.get(id).then((r) => r.data),
    enabled: !!id,
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
  const imageUrl = galleryImages[activeImg]?.image || productSet?.image_url || productSet?.image
  const isInStock = setStock > 0

  useEffect(() => {
    setActiveImg(0)
    setImageFailed(false)
  }, [productSet?.id])

  const showImageAt = (index) => {
    if (galleryImages.length === 0) return
    setImageFailed(false)
    setActiveImg((index + galleryImages.length) % galleryImages.length)
  }

  const handleGalleryPointerDown = (e) => {
    if (galleryImages.length <= 1 || (e.pointerType === 'mouse' && e.button !== 0)) return
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

  const addSetToCart = () => {
    if (!cartProduct || !isInStock) return
    addItem(cartProduct, 1)
    toast.success(t('product.productSetAdded'))
  }

  const buyNow = () => {
    if (!cartProduct || !isInStock) return
    addItem(cartProduct, 1)
    clearSelection()
    toggleSelected(cartProduct.cart_key)
    navigate('/checkout')
  }

  if (isLoading) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="h-[420px] animate-pulse rounded-3xl bg-pink-50" />
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

      <div className="grid gap-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start">
        <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-card">
          <div className="relative overflow-hidden bg-pink-50">
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => showImageAt(activeImg - 1)}
                  aria-label="Previous product set image"
                  className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-lg shadow-pink-100 transition active:scale-95 md:flex"
                >
                  <ChevronLeft size={22} strokeWidth={3} />
                </button>
                <button
                  type="button"
                  onClick={() => showImageAt(activeImg + 1)}
                  aria-label="Next product set image"
                  className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-pink-600 shadow-lg shadow-pink-100 transition active:scale-95 md:flex"
                >
                  <ChevronRight size={22} strokeWidth={3} />
                </button>
              </>
            )}
            <div
              className="aspect-square cursor-grab touch-pan-y select-none active:cursor-grabbing"
              onPointerDown={handleGalleryPointerDown}
              onPointerMove={handleGalleryPointerMove}
              onPointerUp={handleGalleryPointerEnd}
              onPointerCancel={handleGalleryPointerEnd}
            >
            {imageUrl && !imageFailed ? (
              <img
                src={imageUrl}
                alt={productSet.name}
                draggable={false}
                onError={() => setImageFailed(true)}
                className="h-full w-full object-contain p-4"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-50 to-rose-100">
                <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-pink-600 text-white shadow-xl shadow-pink-200">
                  <Gift size={50} />
                </div>
              </div>
            )}
            </div>
            <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-black text-pink-600 shadow-sm">
              {t('product.productSet').toUpperCase()}
            </span>
            {galleryImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/80 px-2 py-1 shadow-sm">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => showImageAt(i)}
                    aria-label={`Show product set image ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === activeImg ? 'w-5 bg-pink-600' : 'w-1.5 bg-pink-200'}`}
                  />
                ))}
              </div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {galleryImages.map((img, i) => (
                <button
                  key={img.id ?? i}
                  type="button"
                  onClick={() => showImageAt(i)}
                  className={`aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-white md:w-24 ${i === activeImg ? 'border-pink-500' : 'border-transparent'}`}
                >
                  <img src={img.image} alt="" draggable={false} className="h-full w-full object-contain bg-white p-1" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="text-xs font-black uppercase tracking-wide text-pink-600">{t('product.productSet')}</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-gray-950 md:text-4xl">{productSet.name}</h1>
          <p className="mt-3 text-sm font-semibold text-gray-500">
            {t('product.productsInsideCount', { count: productSet.items?.length || 0 })}
          </p>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide ${isInStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              <span className={`h-2 w-2 rounded-full ${isInStock ? 'bg-green-500' : 'bg-red-500'}`} />
              {isInStock ? t('common.inStock') : t('common.outOfStock')}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-black text-pink-600">{formatCurrency(price)}</span>
            {oldPrice > price && (
              <span className="text-base font-bold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>
            )}
          </div>

          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
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
                <button onClick={() => updateQuantity(cartProduct.cart_key, Math.min(setStock, qty + 1))} disabled={qty >= setStock} className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white disabled:opacity-40">
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
                  <ProductThumb product={{ name: item.product_name, primary_image: item.product_image }} size="sm" />
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

      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pb-4 pt-2 shadow-[0_-8px_25px_rgba(15,23,42,0.08)] md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[64px_1fr_1fr] items-center gap-2">
          <MobileSetAction icon={Store} label={t('product.store')} onClick={() => navigate('/shop')} />
          <button
            onClick={addSetToCart}
            disabled={!isInStock}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-2 text-sm font-black text-white shadow-lg shadow-gray-200 disabled:opacity-50"
          >
            <ShoppingCart size={21} />
            {t('common.addToCart')}
          </button>
          <button
            onClick={buyNow}
            disabled={!isInStock}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-pink-600 px-2 text-sm font-black text-white shadow-lg shadow-pink-200 disabled:opacity-50"
          >
            <Zap size={21} />
            {t('common.buyNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

function MobileSetAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 text-xs font-black text-gray-500"
    >
      <Icon size={24} />
      <span>{label}</span>
    </button>
  )
}
