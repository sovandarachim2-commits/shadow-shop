import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Gift, HelpCircle, Loader2, Percent, Ticket, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import useCartStore from '@/store/cartStore'
import { cn, formatDate } from '@/utils/helpers'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'used', label: 'Used' },
  { key: 'expired', label: 'Expired' },
]

function isExpired(coupon) {
  return coupon.ends_at && new Date(coupon.ends_at).getTime() < Date.now()
}

function couponStatus(coupon) {
  if (isExpired(coupon)) return 'expired'
  if (coupon.status === 'used') return 'used'
  return 'active'
}

function couponVisual(coupon) {
  if (coupon.reward_type === 'free_delivery') return { icon: Truck, label: 'FREE', sub: 'SHIP', tone: 'from-sky-500 to-cyan-500' }
  if (coupon.reward_type === 'manual') return { icon: Gift, label: 'GIFT', sub: 'COUPON', tone: 'from-violet-500 to-fuchsia-500' }
  if (coupon.coupon_discount_type === 'percent') return { icon: Percent, label: `${Number(coupon.coupon_value || 0)}%`, sub: '', tone: 'from-pink-500 to-rose-600' }
  return { icon: Ticket, label: `$${Number(coupon.coupon_value || 0).toFixed(0)}`, sub: '', tone: 'from-pink-500 to-rose-600' }
}

function expiryText(coupon) {
  if (!coupon.ends_at) return 'No expiry'
  return formatDate(coupon.ends_at)
}

function CouponCard({ coupon, onApply }) {
  const visual = couponVisual(coupon)
  const Icon = visual.icon
  const status = couponStatus(coupon)
  const active = status === 'active'

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
      <div className="grid grid-cols-[72px_1fr_auto] gap-3">
        <div className={cn('flex h-[74px] items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm', visual.tone)}>
          <div className="text-center">
            <Icon size={18} className="mx-auto mb-0.5" />
            <p className="text-2xl font-black leading-none">{visual.label}</p>
            {visual.sub && <p className="mt-1 text-[10px] font-black leading-none">{visual.sub}</p>}
          </div>
        </div>

        <div className="min-w-0 py-1">
          <h2 className="truncate text-sm font-black text-gray-950">{coupon.reward_name}</h2>
          <p className="mt-1 text-xs font-semibold text-gray-500">
            Min. order ${Number(coupon.minimum_order_amount || 0).toFixed(0)}
          </p>
          <p className="mt-2 inline-flex rounded-md bg-pink-50 px-2 py-1 text-[11px] font-black text-pink-600">
            Code: {coupon.coupon_code}
          </p>
        </div>

        <div className="flex min-w-[76px] flex-col items-end justify-between">
          <div className="text-right">
            <p className={cn('text-xs font-black capitalize', active ? 'text-emerald-600' : status === 'used' ? 'text-gray-500' : 'text-gray-400')}>
              {status}
            </p>
            <p className="mt-1 text-[10px] font-semibold leading-tight text-gray-400">
              {status === 'used' ? 'Used' : status === 'expired' ? 'Expired' : 'Expires on'}<br />
              {expiryText(coupon)}
            </p>
          </div>
          <button
            type="button"
            disabled={!active}
            onClick={() => onApply(coupon)}
            className={cn(
              'mt-2 min-w-[70px] rounded-lg px-3 py-1.5 text-xs font-black text-white',
              active ? 'bg-pink-600 shadow-sm shadow-pink-100 active:scale-95' : 'cursor-not-allowed bg-gray-300'
            )}
          >
            {active ? 'Apply' : status === 'used' ? 'Used' : 'Expired'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function MyCoupons() {
  const navigate = useNavigate()
  const applyCoupon = useCartStore((state) => state.applyCoupon)
  const [activeFilter, setActiveFilter] = useState('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
  })

  const coupons = useMemo(
    () => (data?.redemptions || []).filter((item) => item.coupon_code),
    [data?.redemptions]
  )
  const filteredCoupons = useMemo(() => {
    if (activeFilter === 'all') return coupons
    return coupons.filter((coupon) => couponStatus(coupon) === activeFilter)
  }, [activeFilter, coupons])

  const handleApply = (coupon) => {
    applyCoupon({
      coupon_code: coupon.coupon_code,
      name: coupon.reward_name,
      reward_type: coupon.reward_type,
      discount_type: coupon.coupon_discount_type,
      coupon_value: coupon.coupon_value,
      minimum_order_amount: coupon.minimum_order_amount,
    })
    toast.success(`${coupon.coupon_code} applied`)
    navigate('/cart')
  }

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 size={26} className="animate-spin text-pink-600" /></div>
  if (isError) return <div className="py-20 text-center text-sm font-bold text-gray-500">Coupons could not load.</div>

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="mx-auto w-full max-w-[560px] px-4 md:max-w-[1440px] md:px-6 md:pt-6">
        <header className="sticky top-0 z-30 -mx-4 grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:mx-0 md:mb-4 md:flex md:min-h-0 md:items-start md:justify-between md:bg-transparent md:px-0 md:pt-0">
          <button type="button" onClick={() => navigate('/profile/rewards')} className="flex h-10 w-10 items-center justify-center md:hidden"><ChevronLeft size={23} /></button>
          <div className="min-w-0 text-center md:text-left">
            <h1 className="text-lg font-black text-gray-950 md:text-2xl">My Coupons</h1>
            <p className="mt-1 hidden text-xs font-semibold text-gray-500 md:block">View and apply your reward coupon codes.</p>
          </div>
          <button type="button" className="flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-pink-600"><HelpCircle size={21} /></button>
        </header>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                'shrink-0 rounded-lg px-4 py-2 text-xs font-black transition',
                activeFilter === filter.key ? 'bg-pink-600 text-white shadow-sm shadow-pink-100' : 'bg-gray-100 text-gray-500'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredCoupons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center md:py-24">
            <Ticket size={34} className="mx-auto text-gray-200" />
            <p className="mt-3 text-sm font-black text-gray-500">No coupons found</p>
            <button type="button" onClick={() => navigate('/profile/rewards/redeem')} className="mt-4 rounded-lg bg-pink-600 px-5 py-2.5 text-xs font-black text-white">
              Redeem Rewards
            </button>
          </div>
        ) : (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredCoupons.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} onApply={handleApply} />)}
          </section>
        )}
      </div>
    </div>
  )
}
