import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, Heart, ShoppingCart, Zap, Plus, Minus, Check,
  PackageSearch, Store, Star, Droplet, Sparkles, ShieldCheck, Leaf,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import { CosmeticArt, RatingRow } from '@/components/customer/CustomerUi'
import { useTranslation } from 'react-i18next'

export default function ProductDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [tab, setTab] = useState('description')
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)
  const clearSelection = useCartStore((s) => s.clearSelection)
  const toggleSelected = useCartStore((s) => s.toggleSelected)

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.products.get(id).then((r) => r.data),
  })

  const images = product?.images?.length > 0 ? product.images : []
  const currentImage = images[activeImg]
  const stock = product?.current_stock ?? 0
  const oldPrice = Number(product?.old_price || product?.wholesale_price || 0)
  const currentPrice = Number(product?.display_price || product?.retail_price || 0)
  const savedAmount = oldPrice > currentPrice ? oldPrice - currentPrice : 0
  const discountPercent = oldPrice > currentPrice ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : 15
  const saleProduct = product?.display_price ? { ...product, retail_price: product.display_price } : product

  const handleAddToCart = () => {
    if (!product) return

    addItem(saleProduct, qty)
    setAdded(true)
    toast.success(t('product.addedToCart'))
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (!product) return

    addItem(saleProduct, qty)
    clearSelection()
    toggleSelected(product.id)
    navigate('/checkout')
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
      <div className="-mx-4 -mt-4 mb-4 grid min-h-[64px] grid-cols-[44px_1fr_44px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950">{t('product.details')}</h1>
        <div />
      </div>

      <button onClick={() => navigate(-1)} className="mb-4 hidden items-center gap-3 text-sm font-black text-gray-600 hover:text-pink-600 md:inline-flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700">
          <ChevronLeft size={20} />
        </span>
        {t('product.backToProducts')}
      </button>

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl bg-white md:border md:border-pink-100 md:bg-gradient-to-br md:from-pink-50 md:to-white md:p-4 md:shadow-card">
          <div className="relative overflow-hidden rounded-3xl bg-white">
            <span className="absolute left-4 top-4 z-10 rounded-full bg-pink-600 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-pink-200">
              -{discountPercent}%
            </span>
            <button
              onClick={() => {
                setIsWishlisted(!isWishlisted)
                toast.success(isWishlisted ? t('product.removedFromWishlist') : t('product.addedToWishlist'))
              }}
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white text-pink-600 shadow-xl shadow-pink-100"
            >
              <Heart size={21} className={isWishlisted ? 'fill-pink-500 text-pink-500' : ''} />
            </button>
            <div className="aspect-[1/0.82] max-h-[520px] md:aspect-square">
              {currentImage ? (
                <img src={currentImage.image} alt={product.name} className="h-full w-full object-contain p-3" />
              ) : (
                <CosmeticArt tone={product.tone} className="min-h-full" />
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-5 gap-2.5">
            {images.length > 0
              ? images.slice(0, 4).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square overflow-hidden rounded-2xl border-2 bg-white ${i === activeImg ? 'border-pink-500' : 'border-transparent'}`}
                >
                  <img src={img.image} alt="" className="h-full w-full object-contain bg-white p-1" />
                </button>
              )).concat(
                images.length > 4
                  ? [(
                    <button key="more" className="aspect-square rounded-2xl border border-gray-100 bg-gray-50 text-base font-black text-gray-600">
                      +{images.length - 4}
                    </button>
                  )]
                  : []
              )
              : ['pink', 'rose', 'red', 'gold'].map((tone, i) => (
                <button key={tone} onClick={() => setActiveImg(i)} className="aspect-square overflow-hidden rounded-2xl border border-pink-100 bg-white">
                  <CosmeticArt tone={tone} className="min-h-full" />
                </button>
              ))}
          </div>
        </section>

        <section className="flex flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-pink-600">
              <Star size={14} className="fill-pink-600" /> {t('home.bestSeller')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500" /> {t('common.inStock')}
            </span>
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tight text-gray-950 md:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <RatingRow rating={product.rating || 4.9} reviews={product.review_count || 126} />
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

          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
            {product.description || t('product.noDescription')}
          </p>

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
              <button onClick={() => setQty((q) => Math.min(stock, q + 1))} className="shop-icon-btn h-10 w-10">
                <Plus size={15} />
              </button>
            </div>
            {stock <= 0 && <span className="text-sm font-black text-red-500">{t('common.outOfStock')}</span>}
          </div>

          <div className="mt-6 hidden flex-col gap-3 sm:flex-row md:flex">
            <button
              onClick={handleAddToCart}
              disabled={stock <= 0}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-4 text-base font-black transition ${
                added ? 'border-green-500 bg-green-500 text-white' : 'border-pink-500 bg-white text-pink-600 hover:bg-pink-50'
              }`}
            >
              {added ? <Check size={19} /> : <ShoppingCart size={19} />}
              {added ? t('product.added') : t('common.addToCart')}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={stock <= 0}
              className="shop-btn-primary flex-1 py-4 text-base"
            >
              <Zap size={19} /> {t('common.buyNow')}
            </button>
          </div>

          <div className="mt-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex gap-4 border-b border-gray-100">
              {[
                { key: 'description', label: t('product.description') },
                { key: 'benefits', label: t('product.benefits') },
                { key: 'how_to_use', label: t('product.howToUse') },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`border-b-2 px-1 pb-3 text-sm font-black ${tab === item.key ? 'border-pink-600 text-pink-600' : 'border-transparent text-gray-400'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="py-5 text-sm leading-7 text-gray-600">
              {tab === 'description' && (product.description || t('product.noDescription'))}
              {tab === 'benefits' && (product.benefits || t('product.noBenefits'))}
              {tab === 'how_to_use' && (product.how_to_use || t('product.noUsage'))}
            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pb-4 pt-2 shadow-[0_-8px_25px_rgba(15,23,42,0.08)] md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[64px_1fr_1fr] items-center gap-2">
          <MobileProductAction icon={Store} label={t('product.store')} onClick={() => navigate('/shop')} />
          <button
            onClick={handleAddToCart}
            disabled={stock <= 0}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gray-950 px-2 text-sm font-black text-white shadow-lg shadow-gray-200 disabled:opacity-50"
          >
            <ShoppingCart size={21} />
            {t('common.addToCart')}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={stock <= 0}
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

function MobileProductAction({ icon: Icon, label, onClick, active = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 text-xs font-black ${active ? 'text-pink-600' : 'text-gray-500'}`}
    >
      <Icon size={24} className={active ? 'fill-pink-100' : ''} />
      <span>{label}</span>
    </button>
  )
}
