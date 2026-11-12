import { useEffect, useState } from 'react'
import { Minus, Plus, ShoppingBag, Star, Trash2 } from 'lucide-react'
import { cn } from '@/utils/helpers'

const PALETTES = {
  pink: 'from-pink-200 via-pink-300 to-rose-400',
  rose: 'from-rose-100 via-pink-200 to-rose-300',
  red: 'from-red-400 via-rose-500 to-pink-700',
  gold: 'from-amber-100 via-orange-200 to-yellow-300',
  amber: 'from-amber-700 via-orange-500 to-yellow-400',
  orange: 'from-orange-100 via-orange-300 to-amber-400',
  purple: 'from-purple-200 via-fuchsia-300 to-pink-400',
  set: 'from-pink-200 via-rose-300 to-purple-300',
}

export function CosmeticArt({ tone = 'pink', className = '' }) {
  const palette = PALETTES[tone] || PALETTES.pink

  return (
    <div className={cn('relative flex h-full min-h-[88px] items-center justify-center overflow-hidden bg-gradient-to-br from-pink-50 to-rose-100', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_75%_70%,rgba(236,72,153,0.16),transparent_35%)]" />
      <div className="relative flex items-end justify-center gap-2">
        <div className={`h-20 w-9 rounded-b-2xl rounded-t-md bg-gradient-to-b ${palette} shadow-xl md:h-28 md:w-12`}>
          <div className="mx-auto -mt-5 h-5 w-5 rounded-t bg-gray-950 md:-mt-7 md:h-7 md:w-7" />
          <div className="mx-auto mt-6 h-7 w-4 rounded-full bg-white/25 md:mt-8 md:h-9 md:w-5" />
        </div>
        <div className={`h-14 w-16 rounded-3xl bg-gradient-to-br ${palette} shadow-xl md:h-20 md:w-24`}>
          <div className="mx-auto mt-4 h-3 w-10 rounded-full bg-white/35 md:mt-6 md:h-4 md:w-14" />
        </div>
        <div className={`hidden h-24 w-8 rounded-b-2xl rounded-t-md bg-gradient-to-b ${palette} shadow-xl sm:block md:h-32 md:w-10`}>
          <div className="mx-auto -mt-6 h-6 w-4 rounded-t bg-gray-950 md:-mt-8 md:h-8 md:w-5" />
        </div>
      </div>
    </div>
  )
}

export function BrandLogo({ brand, size = 'md', className = '' }) {
  const boxSizes = {
    sm: 'h-9 w-9',
    md: 'h-14 w-14',
    lg: 'h-16 w-16',
  }
  const textSizes = {
    sm: 'text-xs',
    md: 'text-lg',
    lg: 'text-xl',
  }
  const initials = brand?.name
    ? brand.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const logoUrl = brand?.logo_url || brand?.logo

  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-50 ring-1 ring-pink-100', boxSizes[size], className)}>
      {logoUrl ? (
        <img src={logoUrl} alt={brand.name} loading="lazy" decoding="async" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className={cn('font-black text-pink-600', textSizes[size])}>{initials}</span>
      )}
    </div>
  )
}

export function ProductThumb({ product, size = 'md', className = '', priority = false }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [showImageLoader, setShowImageLoader] = useState(priority)
  const sizes = {
    sm: 'h-14 w-14',
    md: 'h-20 w-20',
    lg: 'h-28 w-28',
    full: 'h-full w-full',
  }
  const imageUrl = product?.primary_image || product?.image_url || product?.image || product?.images?.[0]?.image

  useEffect(() => {
    setImageLoaded(false)
    setImageFailed(false)
    setShowImageLoader(priority)
    if (!imageUrl) return undefined
    const timer = setTimeout(() => setShowImageLoader(true), priority ? 0 : 120)
    return () => clearTimeout(timer)
  }, [imageUrl, priority])

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-gray-100', sizes[size], className)}>
      {imageUrl && !imageFailed ? (
        <>
          {!imageLoaded && showImageLoader && <div className="absolute inset-0 animate-pulse bg-gray-100" />}
          <img
            src={imageUrl}
            alt={product?.name || 'Product'}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              priority ? '' : 'transition-opacity duration-200',
              !priority && !imageLoaded ? 'opacity-0' : 'opacity-100',
            )}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-300">
          <ShoppingBag size={24} />
        </div>
      )}
    </div>
  )
}

export function RatingRow({ rating = 4.8, reviews = 126 }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={14} className={index < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'} />
      ))}
      <span className="text-xs font-semibold text-gray-500">{rating}</span>
      <span className="text-xs text-gray-300">({reviews} reviews)</span>
    </div>
  )
}

export function EmptyState({ icon: Icon = ShoppingBag, title, description, action }) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-pink-100 bg-gradient-to-br from-white to-pink-50 px-6 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white text-pink-500 shadow-soft">
        <Icon size={34} />
      </div>
      <h2 className="text-xl font-black text-gray-950">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      {action}
    </div>
  )
}

export function ProductImageAddButton({ available, qty, onAdd, onIncrease, onDecrease, soldOutLabel }) {
  if (!available) {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-gray-950/35 backdrop-blur-[1px]">
        <span className="rounded-full bg-gray-900/85 px-3 py-1.5 text-[11px] font-black tracking-wide text-white shadow-md sm:text-xs">
          {soldOutLabel}
        </span>
      </div>
    )
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add to cart"
        className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-white shadow-md shadow-pink-500/30 ring-2 ring-white transition hover:bg-pink-700 active:scale-95 sm:h-9 sm:w-9"
      >
        <Plus size={17} strokeWidth={2.75} />
      </button>
    )
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-2 right-2 z-10 flex h-9 items-center gap-1 rounded-full bg-pink-600 px-1 text-white shadow-md shadow-pink-500/30 ring-2 ring-white sm:h-10 sm:gap-1.5 sm:px-1.5"
    >
      <button
        type="button"
        onClick={onDecrease}
        aria-label="Decrease quantity"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-8 sm:w-8"
      >
        {qty === 1 ? <Trash2 size={14} /> : <Minus size={14} strokeWidth={2.5} />}
      </button>
      <span className="min-w-[20px] text-center text-sm font-black text-white sm:min-w-[22px]">{qty}</span>
      <button
        type="button"
        onClick={onIncrease}
        aria-label="Increase quantity"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 active:scale-95 sm:h-8 sm:w-8"
      >
        <Plus size={15} strokeWidth={2.75} />
      </button>
    </div>
  )
}
