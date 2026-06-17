import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Gift, PackageCheck, Sparkles, Star } from 'lucide-react'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'

function LuckyBoxSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-pink-50 bg-white shadow-card">
      <div className="h-44 animate-pulse bg-pink-50" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
        <div className="h-11 animate-pulse rounded-2xl bg-pink-100" />
      </div>
    </div>
  )
}

function LuckyBoxCard({ box }) {
  const imageUrl = box.image_url || box.image
  const price = Number(box.discount_price || box.price || 0)
  const oldPrice = box.discount_price ? Number(box.price || 0) : 0

  return (
    <article className="overflow-hidden rounded-[20px] border border-pink-50 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
      <div className="relative h-48 bg-gradient-to-br from-pink-50 via-white to-rose-50">
        {imageUrl ? (
          <img src={imageUrl} alt={box.name} className="h-full w-full object-contain p-4" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#E91E63] text-white shadow-[0_18px_40px_rgba(233,30,99,0.24)]">
              <Gift size={44} />
            </div>
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#E91E63] shadow-sm">
          <Sparkles size={13} /> Lucky Box
        </span>
      </div>

      <div className="p-4">
        <h2 className="line-clamp-2 text-base font-black leading-tight text-gray-950">{box.name}</h2>
        {box.description && <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-gray-500">{box.description}</p>}

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-gray-400">{box.items?.length || 0} items inside</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-[#E91E63]">{formatCurrency(price)}</span>
              {oldPrice > price && <span className="text-xs font-bold text-gray-400 line-through">{formatCurrency(oldPrice)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-black text-yellow-600">
            <Star size={13} className="fill-yellow-400 text-yellow-400" /> Hot
          </div>
        </div>

        <Link
          to="/shop"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-[#E91E63] text-sm font-black text-white shadow-[0_14px_28px_rgba(233,30,99,0.22)] transition active:scale-[0.98]"
        >
          Shop Products <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  )
}

export default function LuckyBox() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['customer-lucky-boxes'],
    queryFn: () => productsApi.sets.list({ is_active: true }).then((r) => r.data.results ?? r.data ?? []),
  })

  const boxes = data.filter((box) => box.is_active !== false)

  return (
    <div className="min-h-screen bg-white">
      <section className="-mx-4 -mt-4 bg-gradient-to-br from-pink-50 via-white to-rose-50 px-4 pb-8 pt-7 md:mx-0 md:mt-0 md:rounded-[28px] md:px-8 md:pt-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#E91E63] text-white shadow-[0_16px_38px_rgba(233,30,99,0.24)]">
            <Gift size={31} />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#E91E63]">Beauty Surprise</p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-gray-950 md:text-5xl">Lucky Box</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-gray-500 md:text-base">
            Discover curated beauty bundles with surprise products, special prices, and limited-time rewards.
          </p>
        </div>
      </section>

      <section className="mt-6 md:mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <LuckyBoxSkeleton key={index} />)}
          </div>
        ) : boxes.length === 0 ? (
          <div className="rounded-[24px] border border-pink-100 bg-white px-5 py-16 text-center shadow-card">
            <PackageCheck size={46} className="mx-auto text-pink-200" />
            <h2 className="mt-4 text-xl font-black text-gray-950">Lucky Box coming soon</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-gray-500">
              We are preparing special beauty bundles. Browse products while the next box is being packed.
            </p>
            <Link to="/shop" className="shop-btn-primary mt-6 rounded-[20px] px-8">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boxes.map((box) => <LuckyBoxCard key={box.id} box={box} />)}
          </div>
        )}
      </section>
    </div>
  )
}
