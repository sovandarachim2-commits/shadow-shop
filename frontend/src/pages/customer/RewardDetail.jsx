import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  Gift,
  Loader2,
  PackageSearch,
  Percent,
  Sparkles,
  Ticket,
  Truck,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import { cn, formatDate } from '@/utils/helpers'

const TYPE_META = {
  discount: { label: 'Coupon', icon: Percent, tone: 'bg-pink-50 text-pink-600' },
  free_delivery: { label: 'Free Delivery', icon: Truck, tone: 'bg-sky-50 text-sky-600' },
  gift: { label: 'Gift', icon: Gift, tone: 'bg-amber-50 text-amber-600' },
  manual: { label: 'Manual', icon: BadgeCheck, tone: 'bg-violet-50 text-violet-600' },
}

function rewardValueText(reward, meta) {
  if (reward.type === 'discount') {
    return reward.coupon_discount_type === 'percent'
      ? `${Number(reward.coupon_value)}% discount`
      : `$${Number(reward.coupon_value).toFixed(2)} discount`
  }
  if (reward.type === 'free_delivery') return 'Free delivery reward'
  return reward.gift_product_name || meta.label
}

export default function RewardDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((r) => r.data),
  })

  const exchangeMutation = useMutation({
    mutationFn: (rewardId) => ordersApi.rewards.exchange(rewardId).then((r) => r.data),
    onSuccess: (nextData) => {
      queryClient.setQueryData(['customer-rewards-summary'], nextData)
      const code = nextData.redemption?.coupon_code
      toast.success(code ? `Reward exchanged. Code: ${code}` : 'Reward exchanged')
      navigate('/profile/rewards')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Could not exchange reward')
    },
  })

  const reward = (data?.catalog || []).find((item) => String(item.id) === String(id))
  const currentPoints = data?.current_points || 0

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-white">
        <Loader2 size={28} className="animate-spin text-pink-600" />
      </div>
    )
  }

  if (isError || !reward) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <PackageSearch size={52} className="mx-auto mb-4 text-gray-200" />
        <h1 className="text-xl font-black text-gray-950">Reward not found</h1>
        <p className="mt-2 text-sm font-semibold text-gray-400">This reward may no longer be available.</p>
        <button onClick={() => navigate('/profile/rewards')} className="mt-6 rounded-lg bg-pink-600 px-6 py-3 text-sm font-black text-white">
          Back to Rewards
        </button>
      </div>
    )
  }

  const meta = TYPE_META[reward.type] || TYPE_META.discount
  const Icon = meta.icon
  const rewardImage = reward.reward_image_url || reward.gift_product_image
  const hasStock = reward.stock === null || reward.stock === undefined || reward.stock > 0
  const canExchange = reward.can_exchange && hasStock
  const pointsShort = Math.max(0, reward.points_required - currentPoints)

  return (
    <div className="mx-auto w-full max-w-[760px] bg-white pb-24 md:max-w-[1440px] md:px-6 md:pb-0 md:pt-6">
      <div className="mb-4 grid min-h-[64px] grid-cols-[44px_1fr_auto] items-center gap-2 border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 truncate text-center text-lg font-black leading-tight text-gray-950">Reward Detail</h1>
        <HeaderActionIcons />
      </div>

      <button onClick={() => navigate(-1)} className="mb-4 hidden items-center gap-3 text-sm font-black text-gray-600 hover:text-pink-600 md:inline-flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-700">
          <ChevronLeft size={20} />
        </span>
        Back to Rewards
      </button>

      <div className="grid gap-7 px-4 md:px-0 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl bg-white md:border md:border-pink-100 md:bg-gradient-to-br md:from-pink-50 md:to-white md:p-4 md:shadow-card">
          <div className="relative overflow-hidden rounded-3xl bg-white">
            <span className="absolute left-4 top-4 z-10 rounded-full bg-pink-600 px-3 py-1.5 text-xs font-black text-white shadow-lg shadow-pink-200">
              {Number(reward.points_required).toLocaleString()} pts
            </span>
            <div className="flex aspect-[1/0.82] max-h-[520px] items-center justify-center md:aspect-square">
              {rewardImage ? (
                <img src={rewardImage} alt={reward.name} className="h-full w-full object-contain p-4" />
              ) : (
                <div className={cn('flex h-36 w-36 items-center justify-center rounded-[36px]', meta.tone)}>
                  <Icon size={58} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3.5 py-2 text-[11px] font-black uppercase text-pink-600">
              <Sparkles size={14} /> {meta.label}
            </span>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black uppercase', hasStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
              <span className={cn('h-2 w-2 rounded-full', hasStock ? 'bg-green-500' : 'bg-red-500')} />
              {hasStock ? 'Available' : 'Out of stock'}
            </span>
          </div>

          <h1 className="text-[28px] font-black leading-[1.12] text-gray-950 md:text-5xl">{reward.name}</h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-8 text-gray-600 md:text-base md:leading-7">
            {reward.description || reward.gift_product_name || 'Exchange points for this reward.'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-pink-50 p-5">
              <p className="text-[11px] font-black uppercase leading-none text-pink-500">Points required</p>
              <p className="mt-3 text-[34px] font-black leading-none text-pink-600">{Number(reward.points_required).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-[11px] font-black uppercase leading-none text-gray-400">Reward value</p>
              <p className="mt-3 text-base font-black leading-tight text-gray-900">{rewardValueText(reward, meta)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="text-[11px] font-black uppercase leading-none text-gray-400">Stock</p>
              <p className="mt-3 text-base font-black leading-tight text-gray-900">
                {reward.stock === null || reward.stock === undefined ? 'No limit' : `${reward.stock} left`}
              </p>
            </div>
            {Number(reward.minimum_order_amount || 0) > 0 && (
              <div className="rounded-2xl bg-gray-50 p-5">
                <p className="text-[11px] font-black uppercase leading-none text-gray-400">Minimum order</p>
                <p className="mt-3 text-base font-black leading-tight text-gray-900">${Number(reward.minimum_order_amount).toFixed(2)}</p>
              </div>
            )}
            {(reward.starts_at || reward.ends_at) && (
              <div className="rounded-2xl bg-gray-50 p-5 sm:col-span-2">
                <p className="flex items-center gap-1.5 text-[11px] font-black uppercase leading-none text-gray-400"><CalendarDays size={13} /> Available</p>
                <p className="mt-3 text-base font-black leading-tight text-gray-900">
                  {reward.starts_at ? formatDate(reward.starts_at) : 'Now'} - {reward.ends_at ? formatDate(reward.ends_at) : 'No end date'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-7 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-base font-black text-gray-950">Your points</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[42px] font-black leading-none text-pink-600">{currentPoints.toLocaleString()}</span>
              <span className="pb-1 text-sm font-black text-gray-400">pts</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!canExchange || exchangeMutation.isPending}
            onClick={() => exchangeMutation.mutate(reward.id)}
            className={cn(
              'mt-6 hidden h-14 items-center justify-center gap-2 rounded-lg text-base font-black transition md:flex',
              canExchange ? 'bg-pink-600 text-white shadow-lg shadow-pink-100 active:scale-[0.98]' : 'cursor-not-allowed bg-gray-100 text-gray-400'
            )}
          >
            {exchangeMutation.isPending ? <Loader2 size={19} className="animate-spin" /> : <Ticket size={19} />}
            {canExchange ? 'Exchange Reward' : hasStock ? `${pointsShort.toLocaleString()} pts short` : 'Out of stock'}
          </button>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-4 pb-4 pt-2 shadow-[0_-8px_25px_rgba(15,23,42,0.08)] md:hidden">
        <button
          type="button"
          disabled={!canExchange || exchangeMutation.isPending}
          onClick={() => exchangeMutation.mutate(reward.id)}
          className={cn(
            'mx-auto flex h-12 w-full max-w-[720px] items-center justify-center gap-2 rounded-2xl text-sm font-black shadow-lg disabled:opacity-60',
            canExchange ? 'bg-pink-600 text-white shadow-pink-200' : 'bg-gray-100 text-gray-400 shadow-gray-100'
          )}
        >
          {exchangeMutation.isPending ? <Loader2 size={19} className="animate-spin" /> : <Ticket size={19} />}
          {canExchange ? 'Exchange Reward' : hasStock ? `${pointsShort.toLocaleString()} pts short` : 'Out of stock'}
        </button>
      </div>
    </div>
  )
}
