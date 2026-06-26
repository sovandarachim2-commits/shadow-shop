import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Crown,
  Gift,
  History,
  Loader2,
  Package,
  Percent,
  RotateCw,
  Sparkles,
  Ticket,
  Truck,
  UserPlus,
  ShoppingCart,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { cn, formatDate } from '@/utils/helpers'

const TYPE_META = {
  discount: { label: 'Coupon', icon: Percent, tone: 'bg-pink-50 text-pink-600' },
  free_delivery: { label: 'Free Delivery', icon: Truck, tone: 'bg-sky-50 text-sky-600' },
  gift: { label: 'Gift', icon: Gift, tone: 'bg-amber-50 text-amber-600' },
  manual: { label: 'Manual', icon: BadgeCheck, tone: 'bg-violet-50 text-violet-600' },
}

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
  const canExchange = reward.can_exchange && hasStock
  const pointsShort = Math.max(0, reward.points_required - currentPoints)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onView(reward)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onView(reward)
        }
      }}
      className="block w-full rounded-lg border border-gray-100 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] hover:border-pink-100 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg', rewardImage ? 'bg-gray-50' : meta.tone)}>
          {rewardImage ? (
            <img src={rewardImage} alt={reward.gift_product_name || reward.name} className="h-full w-full object-contain p-1" />
          ) : (
            <Icon size={20} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-gray-950">{reward.name}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-500">
              {meta.label}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-gray-500">
            {reward.gift_product_name || reward.description || 'Exchange points for this reward.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="rounded-full bg-pink-50 px-2.5 py-1 text-pink-600">
              {Number(reward.points_required).toLocaleString()} pts
            </span>
            <span className={cn('rounded-full px-2.5 py-1', hasStock ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400')}>
              {reward.stock === null || reward.stock === undefined ? 'No limit' : `${reward.stock} left`}
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        disabled={!canExchange || isExchanging}
        onClick={(event) => {
          event.stopPropagation()
          onExchange(reward.id)
        }}
        className={cn(
          'mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-black transition',
          canExchange
            ? 'bg-pink-600 text-white shadow-sm shadow-pink-100 hover:bg-pink-700 active:scale-[0.98]'
            : 'cursor-not-allowed bg-gray-100 text-gray-400'
        )}
      >
        {isExchanging ? <Loader2 size={17} className="animate-spin" /> : <Ticket size={17} />}
        {canExchange ? 'Exchange' : hasStock ? `${pointsShort.toLocaleString()} pts short` : 'Out of stock'}
      </button>
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

function PointActivityList({ transactions }) {
  if (!transactions.length) return null

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <History size={18} className="text-pink-500" />
        <h2 className="text-sm font-black text-gray-950">Point activity</h2>
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
  const progressPct = Math.min(100, data?.progress_pct || 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 md:px-6 md:py-6">
        <section className="rounded-lg border border-pink-100 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-gray-400">Current points</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-black text-pink-600">{currentPoints.toLocaleString()}</span>
                <span className="pb-1 text-sm font-black text-gray-400">pts</span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-black text-gray-800">
                <Sparkles size={17} className="text-pink-500" />
                {data.member_level} Member
              </div>
              <p className="mt-1 text-xs font-semibold text-gray-400">
                {data.points_to_next_level > 0
                  ? `${data.points_to_next_level.toLocaleString()} pts to next level`
                  : 'Top level reached'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-black text-gray-400">
              <span>{currentPoints.toLocaleString()} pts</span>
              <span>{data.next_tier_points.toLocaleString()} pts</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-pink-600 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </section>

        <ProgramOptionGrid title="Earn Points" items={EARN_OPTIONS} />
        <ProgramOptionGrid title="Use Points" items={USE_OPTIONS} />

        {rewards.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rewards.map((reward) => (
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
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
            <Package size={34} className="mx-auto text-gray-200" />
            <p className="mt-3 text-sm font-black text-gray-900">No rewards available</p>
            <p className="mt-1 text-xs font-semibold text-gray-400">More exchange options can be added from the reward catalog.</p>
          </div>
        )}

        {redemptions.length > 0 && (
          <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <h2 className="text-sm font-black text-gray-950">Recent reward status</h2>
            </div>
            <HistoryList redemptions={redemptions.slice(0, 3)} />
          </section>
        )}

        <PointActivityList transactions={transactions} />
      </div>
    </div>
  )
}
