import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  ChevronLeft,
  CheckCircle2,
  Crown,
  Gift,
  HelpCircle,
  History,
  Loader2,
  Package,
  Percent,
  RotateCw,
  Sparkles,
  Star,
  Ticket,
  Truck,
  UserPlus,
  ShoppingCart,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { cn, formatDate } from '@/utils/helpers'

const TYPE_META = {
  voucher: { label: 'Voucher', icon: Ticket, tone: 'bg-pink-50 text-pink-600' },
  discount: { label: 'Coupon', icon: Percent, tone: 'bg-pink-50 text-pink-600' },
  free_delivery: { label: 'Free Delivery', icon: Truck, tone: 'bg-sky-50 text-sky-600' },
  gift: { label: 'Gift', icon: Gift, tone: 'bg-amber-50 text-amber-600' },
  lucky_box: { label: 'Lucky Box', icon: Package, tone: 'bg-violet-50 text-violet-600' },
  manual: { label: 'Manual', icon: BadgeCheck, tone: 'bg-violet-50 text-violet-600' },
}

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'voucher', label: 'Vouchers' },
  { key: 'gift', label: 'Products' },
  { key: 'discount', label: 'Discounts' },
  { key: 'free_delivery', label: 'Shipping' },
]

const SAMPLE_REWARDS = [
  { id: 'sample-1', name: '$1 Discount', description: 'Use for any order', type: 'discount', points_required: 500, preview: true },
  { id: 'sample-2', name: 'Free Delivery', description: 'Free shipping coupon', type: 'free_delivery', points_required: 800, preview: true },
  { id: 'sample-3', name: '5% Off Coupon', description: 'Use for any order', type: 'discount', points_required: 1000, preview: true },
  { id: 'sample-4', name: 'Lucky Box Ticket', description: 'Get a chance to win prizes', type: 'lucky_box', points_required: 1500, preview: true },
]

const EARN_OPTIONS = [
  { title: 'Shopping Reward', icon: ShoppingCart, text: 'Earn points when your paid order is completed.', status: 'Active', tone: 'bg-pink-50 text-pink-600' },
  { title: 'Daily Check-in', icon: CalendarDays, text: 'Give customers a small daily point bonus.', status: 'Soon', tone: 'bg-sky-50 text-sky-600' },
  { title: 'Lucky Spin', icon: RotateCw, text: 'Let customers spin for bonus points or rewards.', status: 'Soon', tone: 'bg-amber-50 text-amber-600' },
  { title: 'Review Reward', icon: Camera, text: 'Reward customers for product reviews with photos.', status: 'Manual', tone: 'bg-violet-50 text-violet-600' },
  { title: 'Invite Friend', icon: UserPlus, text: 'Give points after a friend makes their first order.', status: 'Manual', tone: 'bg-emerald-50 text-emerald-600' },
  { title: 'VIP Level', icon: Crown, text: 'Higher levels can earn faster or unlock special rewards.', status: 'Active', tone: 'bg-rose-50 text-rose-600' },
]

const USE_OPTIONS = [
  { title: 'Exchange Products', icon: Gift, text: 'Use points for gift products selected by admin.', tone: 'bg-amber-50 text-amber-600' },
  { title: 'Free Delivery', icon: Truck, text: 'Exchange points for delivery fee rewards.', tone: 'bg-sky-50 text-sky-600' },
  { title: 'Coupons', icon: Percent, text: 'Redeem points for discount coupon codes.', tone: 'bg-pink-50 text-pink-600' },
  { title: 'Lucky Box', icon: Package, text: 'Use points for surprise boxes when enabled.', tone: 'bg-violet-50 text-violet-600' },
]

function RewardCard({ reward, currentPoints, onExchange, isExchanging, onView }) {
  const meta = TYPE_META[reward.type] || TYPE_META.discount
  const Icon = meta.icon
  const rewardImage = reward.reward_image_url || reward.gift_product_image
  const hasStock = reward.stock === null || reward.stock === undefined || reward.stock > 0
  const canExchange = !reward.preview && reward.can_exchange && hasStock
  const pointsShort = Math.max(0, reward.points_required - currentPoints)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => !reward.preview && onView(reward)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (!reward.preview) onView(reward)
        }
      }}
      className="rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-[0_6px_18px_rgba(15,23,42,0.05)] transition active:scale-[0.99] md:p-4"
    >
      <div className="flex items-center gap-4">
        <div className={cn('flex h-16 w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-xl md:h-[76px] md:w-[92px] md:rounded-2xl', rewardImage ? 'bg-gray-50' : meta.tone)}>
          {rewardImage ? (
            <img src={rewardImage} alt={reward.gift_product_name || reward.name} className="h-full w-full object-contain p-1" />
          ) : (
            <Icon size={30} strokeWidth={2.2} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-gray-950 md:text-lg">{reward.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-gray-500 md:mt-1 md:text-sm">
            {reward.gift_product_name || reward.description || 'Exchange points for this reward.'}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-black text-gray-950 md:mt-3 md:text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white">
              <Star size={12} fill="currentColor" />
            </span>
            <span>
              {Number(reward.points_required).toLocaleString()} pts
            </span>
          </div>
        </div>
        <button
          type="button"
          disabled={!canExchange || isExchanging}
          onClick={(event) => {
            event.stopPropagation()
            if (canExchange) onExchange(reward.id)
          }}
          className={cn(
            'flex h-10 shrink-0 items-center justify-center rounded-xl px-3 text-xs font-black transition md:h-11 md:px-5 md:text-sm',
            canExchange
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-100 active:scale-[0.98]'
              : 'bg-pink-100 text-pink-400'
          )}
        >
          {isExchanging ? <Loader2 size={17} className="animate-spin" /> : 'Redeem'}
        </button>
      </div>
      {!canExchange && !reward.preview && (
        <p className="mt-3 text-right text-xs font-black text-gray-400">
          {hasStock ? `${pointsShort.toLocaleString()} pts short` : 'Out of stock'}
        </p>
      )}
    </article>
  )
}

function HistoryList({ redemptions }) {
  if (!redemptions.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
        <History size={32} className="mx-auto text-gray-200" />
        <p className="mt-3 text-sm font-black text-gray-900">No exchanges yet</p>
        <p className="mt-1 text-xs font-semibold text-gray-400">Your redeemed coupons and reward status will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {redemptions.map((item) => (
        <div key={item.id} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          {(() => {
            const rewardImage = item.reward_image_url || item.gift_product_image
            return (
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                {rewardImage ? (
                  <img src={rewardImage} alt={item.gift_product_name || item.reward_name} className="h-full w-full object-contain p-1" />
                ) : (
                  <Ticket size={17} className="text-gray-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-gray-950">{item.reward_name}</p>
                {item.gift_product_name && <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">{item.gift_product_name}</p>}
              <p className="mt-1 text-xs font-semibold text-gray-400">{formatDate(item.created_at)} - {item.points_spent.toLocaleString()} pts</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black capitalize text-emerald-600">
              {item.status}
            </span>
          </div>
            )
          })()}
          {item.coupon_code && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
              <span className="text-xs font-black uppercase tracking-wide text-gray-400">Code</span>
              <span className="font-mono text-sm font-black text-gray-950">{item.coupon_code}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ProgramOptionGrid({ title, items }) {
  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-gray-950">{title}</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-start gap-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', item.tone)}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-gray-950">{item.title}</p>
                    {item.status && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-gray-400">
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">{item.text}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function PointActivityList({ transactions, onViewAll }) {
  if (!transactions.length) return null

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History size={18} className="text-pink-500" />
          <h2 className="text-sm font-black text-gray-950">Point activity</h2>
        </div>
        <button type="button" onClick={onViewAll} className="text-xs font-black text-pink-600">View All</button>
      </div>
      <div className="space-y-2">
        {transactions.slice(0, 5).map((item) => {
          const isPositive = Number(item.points) > 0
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-gray-900">{item.note || item.type}</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-400">{formatDate(item.created_at)}</p>
              </div>
              <span className={cn('shrink-0 text-sm font-black', isPositive ? 'text-emerald-600' : 'text-pink-600')}>
                {isPositive ? '+' : ''}{Number(item.points).toLocaleString()} pts
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function ExchangeRewards() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exchangingId, setExchangingId] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((r) => r.data),
  })

  const exchangeMutation = useMutation({
    mutationFn: (rewardId) => ordersApi.rewards.exchange(rewardId).then((r) => r.data),
    onMutate: (rewardId) => setExchangingId(rewardId),
    onSuccess: (nextData) => {
      queryClient.setQueryData(['customer-rewards-summary'], nextData)
      const code = nextData.redemption?.coupon_code
      toast.success(code ? `Reward exchanged. Code: ${code}` : 'Reward exchanged')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Could not exchange reward')
    },
    onSettled: () => setExchangingId(null),
  })

  const rewards = data?.catalog || []
  const redemptions = data?.redemptions || []
  const transactions = data?.transactions || []

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-pink-600" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-sm px-5 pt-16 text-center">
        <Gift size={38} className="mx-auto text-gray-200" />
        <h1 className="mt-4 text-lg font-black text-gray-950">Rewards could not load</h1>
        <button onClick={() => navigate('/profile')} className="mt-5 rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-black text-white">
          Back to Profile
        </button>
      </div>
    )
  }

  const currentPoints = data?.current_points || 0
  const nextTierPoints = data?.next_tier_points || 2000
  const pointsToNext = data?.points_to_next_level ?? Math.max(0, nextTierPoints - currentPoints)
  const memberLevel = data?.member_level || 'Silver'
  const nextMemberLevel = memberLevel === 'Silver' ? 'Gold' : memberLevel === 'Gold' ? 'Platinum' : 'Platinum'
  const progressPct = Math.min(100, data?.progress_pct || Math.round((currentPoints / Math.max(nextTierPoints, 1)) * 100))
  const displayRewards = rewards.length > 0 ? rewards : SAMPLE_REWARDS
  const filteredRewards = displayRewards.filter((reward) => {
    if (activeCategory === 'all') return true
    if (activeCategory === 'voucher') return ['voucher', 'discount'].includes(reward.type)
    return reward.type === activeCategory
  })

  return (
    <div className="min-h-screen bg-white pb-24 md:pb-6">
      <div className="mx-auto flex w-full max-w-[560px] flex-col px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] md:max-w-[1440px] md:px-6 md:pt-6">
        <header className="sticky top-0 z-30 -mx-4 grid min-h-[58px] grid-cols-[44px_1fr_44px] items-center bg-white/95 px-4 backdrop-blur md:static md:mx-0 md:mb-4 md:flex md:min-h-0 md:items-start md:justify-between md:bg-transparent md:px-0">
          <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-950 active:scale-95 md:hidden">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0 text-center md:text-left">
            <h1 className="text-lg font-black text-gray-950 md:text-2xl">Shadow Rewards</h1>
            <p className="mt-1 hidden text-xs font-semibold text-gray-500 md:block">Earn points and redeem rewards.</p>
          </div>
          <button className="flex h-10 w-10 items-center justify-center justify-self-end rounded-full border border-gray-200 bg-white text-gray-950 md:h-11 md:w-11">
            <HelpCircle size={20} />
          </button>
        </header>

        <section className="relative mt-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-pink-500 via-[#EC3F8F] to-pink-800 p-4 text-white shadow-[0_14px_32px_rgba(236,63,143,0.22)] md:mt-5 md:rounded-[22px] md:p-6">
          <div className="absolute right-5 top-8 h-28 w-28 rotate-45 rounded-3xl bg-white/10" />
          <Sparkles className="absolute right-32 top-6 text-white/20" size={28} />
          <Sparkles className="absolute bottom-20 right-36 text-white/15" size={24} />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/90 md:text-lg">My Points</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg shadow-pink-950/20 ring-[3px] ring-white/30 md:h-12 md:w-12 md:ring-4">
                  <Star size={22} fill="currentColor" />
                </span>
                <div className="flex items-end gap-2">
                  <span className="text-[32px] font-black leading-none tracking-tight md:text-[42px]">{currentPoints.toLocaleString()}</span>
                  <span className="pb-0.5 text-sm font-black md:pb-1 md:text-lg">pts</span>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/75 px-3 py-1.5 text-gray-950 shadow-sm backdrop-blur md:mt-5 md:px-4 md:py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-white md:h-7 md:w-7">
                  <Star size={14} fill="currentColor" />
                </span>
                <span className="text-sm font-black md:text-base">{memberLevel} Member</span>
              </div>
            </div>
            <div className="absolute right-5 top-8 flex h-20 w-20 shrink-0 items-center justify-center opacity-90 sm:relative sm:right-auto sm:top-auto sm:mt-5 sm:h-28 sm:w-28">
              <div className="absolute inset-0 rotate-30 rounded-[28px] bg-white/25 shadow-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-[22px] border-[3px] border-white/70 bg-gradient-to-br from-gray-100 to-gray-400 text-white shadow-xl sm:h-24 sm:w-24 sm:rounded-[26px] sm:border-4">
                <Star size={36} fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-5 md:mt-7">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black md:mb-3 md:text-base">
              <span>Next level: <span className="text-yellow-300">{nextMemberLevel} Member</span></span>
              <span>{pointsToNext.toLocaleString()} pts more</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20 md:h-3">
              <div className="h-full rounded-full bg-yellow-300 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-3 text-sm font-black md:mt-4 md:text-lg">{currentPoints.toLocaleString()} / {nextTierPoints.toLocaleString()} pts</p>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-2.5 md:mt-5 md:grid-cols-4 md:gap-4">
          {[
            { title: 'Earn Points', text: 'See how to earn', icon: Star, action: () => navigate('/profile/rewards/earn') },
            { title: 'Redeem Points', text: 'Use your points', icon: Gift, action: () => navigate('/profile/rewards/redeem') },
            { title: 'My Coupons', text: 'View your coupons', icon: Ticket, action: () => navigate('/profile/rewards/coupons') },
            { title: 'Point History', text: 'View your activity', icon: History, action: () => navigate('/profile/rewards/history') },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button onClick={item.action} key={item.title} className="flex min-h-[104px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)] active:scale-[0.98] md:min-h-[132px] md:p-4">
                <Icon size={30} className="text-pink-600 md:h-[42px] md:w-[42px]" fill={item.icon === Star ? 'currentColor' : 'none'} />
                <span className="mt-2 text-sm font-black text-gray-950 md:mt-3 md:text-lg">{item.title}</span>
                <span className="mt-0.5 text-xs font-semibold text-gray-500 md:mt-1 md:text-sm">{item.text}</span>
              </button>
            )
          })}
        </section>

        <section className="mt-4 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 p-3.5 shadow-sm md:mt-6 md:gap-5 md:p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 md:h-24 md:w-24 md:rounded-3xl">
            <span className="text-3xl font-black md:text-5xl">$</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-gray-950 md:text-lg">More Points, More Rewards!</h2>
            <p className="mt-0.5 text-xs font-semibold leading-5 text-gray-700 md:mt-1 md:text-sm md:leading-6">Earn more points and unlock amazing rewards.</p>
            <button className="mt-2 rounded-lg bg-pink-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-pink-100 md:mt-3 md:px-5 md:py-2.5 md:text-sm">Earn Now</button>
          </div>
        </section>

        <section className="mt-5 md:mt-7">
          <div className="mb-3 flex items-center justify-between md:mb-4">
            <h2 className="text-lg font-black text-gray-950 md:text-2xl">Redeem with Points</h2>
            <button className="flex items-center gap-1 text-sm font-black text-pink-600">View All <ChevronLeft size={16} className="rotate-180" /></button>
          </div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:mb-4">
            {CATEGORY_FILTERS.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={cn(
                  'shrink-0 rounded-xl px-4 py-2.5 text-xs font-black transition md:px-5 md:py-3 md:text-sm',
                  activeCategory === category.key ? 'bg-pink-600 text-white shadow-lg shadow-pink-100' : 'bg-gray-100 text-gray-500'
                )}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                currentPoints={currentPoints}
                isExchanging={exchangingId === reward.id}
                onView={(item) => navigate(`/profile/rewards/${item.id}`)}
                onExchange={(rewardId) => exchangeMutation.mutate(rewardId)}
              />
            ))}
          </div>
        </section>

        {redemptions.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <h2 className="text-sm font-black text-gray-950">Recent reward status</h2>
            </div>
            <HistoryList redemptions={redemptions.slice(0, 3)} />
          </section>
        )}

        <PointActivityList transactions={transactions} onViewAll={() => navigate('/profile/rewards/history')} />
      </div>
    </div>
  )
}
