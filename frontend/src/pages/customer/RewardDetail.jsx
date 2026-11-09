import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  Gift,
  Info,
  Loader2,
  PackageSearch,
  Percent,
  ShieldCheck,
  Sparkles,
  Ticket,
  Truck,
  Zap,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import RewardRedeemedDialog from '@/components/customer/RewardRedeemedDialog'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import { cn, formatDate } from '@/utils/helpers'

function getTypeMeta(t) {
  return {
    discount: { label: t('rewardsPage.type.coupon'), icon: Percent, tone: 'bg-pink-50 text-pink-600' },
    free_delivery: { label: t('rewardsPage.type.freeDelivery'), icon: Truck, tone: 'bg-sky-50 text-sky-600' },
    gift: { label: t('rewardsPage.type.gift'), icon: Gift, tone: 'bg-amber-50 text-amber-600' },
    manual: { label: t('rewardsPage.type.manual'), icon: BadgeCheck, tone: 'bg-violet-50 text-violet-600' },
  }
}

function rewardValueText(reward, meta, t) {
  if (reward.type === 'discount') {
    return reward.coupon_discount_type === 'percent'
      ? t('rewardsPage.detail.percentDiscount', { value: Number(reward.coupon_value) })
      : t('rewardsPage.detail.amountDiscount', { value: Number(reward.coupon_value).toFixed(2) })
  }
  if (reward.type === 'free_delivery') return t('rewardsPage.detail.freeDeliveryReward')
  return reward.gift_product_name || meta.label
}

export default function RewardDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('instructions')
  const [redeemedCoupon, setRedeemedCoupon] = useState(null)
  const TYPE_META = getTypeMeta(t)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((r) => r.data),
  })

  const exchangeMutation = useMutation({
    mutationFn: (rewardId) => ordersApi.rewards.exchange(rewardId).then((r) => r.data),
    onSuccess: (nextData) => {
      queryClient.setQueryData(['customer-rewards-summary'], nextData)
      const code = nextData.redemption?.coupon_code
      if (code) {
        setRedeemedCoupon(nextData.redemption)
      } else {
        toast.success(t('rewardsPage.toast.exchanged'))
        navigate('/profile/rewards')
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || t('rewardsPage.toast.exchangeFailed'))
    },
  })

  const reward = (data?.catalog || []).find((item) => String(item.id) === String(id))
  const currentPoints = data?.current_points || 0

  if (isLoading && !data) {
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
        <h1 className="text-xl font-black text-gray-950">{t('rewardsPage.detail.notFound')}</h1>
        <p className="mt-2 text-sm font-semibold text-gray-400">{t('rewardsPage.detail.notFoundHint')}</p>
        <button
          onClick={() => navigate('/profile/rewards')}
          className="mt-6 rounded-xl bg-pink-600 px-6 py-3 text-sm font-black text-white shadow-md shadow-pink-200 hover:bg-pink-700 transition"
        >
          {t('rewardsPage.backToRewards')}
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
  const unavailableText = !hasStock
    ? t('rewardsPage.outOfStock')
    : pointsShort > 0
      ? t('rewardsPage.ptsShort', { count: pointsShort.toLocaleString() })
      : t('rewardsPage.unavailable')

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1240px] bg-white px-4 py-4 pb-28 sm:py-6 md:px-6 md:pb-12">
      <RewardRedeemedDialog redemption={redeemedCoupon} onClose={() => setRedeemedCoupon(null)} />

      {/* Top Header matching ProductDetail */}
      <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95"
        >
          <ChevronLeft size={16} />
          <span>{t('rewardsPage.backToRewards', 'Back to Rewards')}</span>
        </button>
        <div className="flex items-center gap-2">
          <HeaderActionIcons />
        </div>
      </div>

      {/* Main Product-Style 2-Column Detail Layout */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10 lg:gap-14 items-start">
        {/* Left Column: Reward Image Card */}
        <section className="relative aspect-square w-full overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
          {/* Points Required Badge */}
          <span className="absolute left-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-[#EC3F8F] px-3.5 py-1.5 text-xs font-black text-white shadow-md shadow-pink-200">
            <Ticket size={13} />
            <span>{Number(reward.points_required).toLocaleString()} {t('rewardsPage.pts')}</span>
          </span>

          <div className="flex h-full w-full items-center justify-center">
            {rewardImage ? (
              <img
                src={rewardImage}
                alt={reward.name}
                className="max-h-[85%] max-w-[85%] object-contain transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <div className={cn('flex h-36 w-36 items-center justify-center rounded-[36px]', meta.tone)}>
                <Icon size={56} />
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Reward Information & Actions */}
        <section className="flex flex-col">
          {/* Category / Type & Stock Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#EC3F8F]">
              <Sparkles size={12} />
              <span>{meta.label}</span>
            </span>
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider',
              hasStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', hasStock ? 'bg-emerald-500' : 'bg-red-500')} />
              <span>{hasStock ? (reward.stock != null ? `${reward.stock} left` : t('rewardsPage.detail.available')) : t('rewardsPage.outOfStock')}</span>
            </span>
            {(reward.starts_at || reward.ends_at) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                <CalendarDays size={12} />
                <span>{reward.ends_at ? formatDate(reward.ends_at) : 'Active'}</span>
              </span>
            )}
            {reward.member_tier_requirement && reward.member_tier_requirement !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                <BadgeCheck size={12} />
                <span>Tier: {reward.member_tier_requirement.split(',').map((t) => t.trim().charAt(0).toUpperCase() + t.trim().slice(1)).join(', ')}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-3 text-2xl font-black text-gray-950 sm:text-3xl md:text-4xl leading-tight">
            {reward.name}
          </h1>

          {/* Price / Points Row matching ProductDetail */}
          <div className="mt-4 flex items-baseline gap-2.5 border-b border-gray-100 pb-4">
            <span className="text-3xl font-black text-[#EC3F8F] sm:text-4xl">
              {Number(reward.points_required).toLocaleString()}
            </span>
            <span className="text-sm font-bold text-gray-400">
              {t('rewardsPage.pts')} {t('rewardsPage.detail.pointsRequired', 'required')}
            </span>
            {Number(reward.minimum_order_amount || 0) > 0 && (
              <span className="ml-auto rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-[#EC3F8F]">
                Min Order: ${Number(reward.minimum_order_amount).toFixed(2)}
              </span>
            )}
          </div>

          {/* Subtitle / Description */}
          <p className="mt-4 text-sm leading-relaxed text-gray-600 sm:text-base">
            {reward.description || reward.gift_product_name || t('rewardsPage.main.exchangeHint')}
          </p>

          {/* 3-Column Clean Info Chips matching ProductDetail */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-2xl bg-gray-50/80 p-3.5 ring-1 ring-gray-100 text-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Type</p>
              <p className="mt-0.5 text-xs font-black text-gray-900 capitalize">{meta.label}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reward Value</p>
              <p className="mt-0.5 text-xs font-black text-gray-900 truncate" title={rewardValueText(reward, meta, t)}>
                {rewardValueText(reward, meta, t)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Stock</p>
              <p className="mt-0.5 text-xs font-black text-gray-900">
                {reward.stock === null || reward.stock === undefined ? t('rewardsPage.detail.noLimit') : `${reward.stock} left`}
              </p>
            </div>
          </div>

          {/* Customer Point Balance Card */}
          <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('rewardsPage.detail.yourPoints')}</p>
                <p className="mt-0.5 text-2xl font-black text-gray-950">
                  {currentPoints.toLocaleString()} <span className="text-xs font-bold text-gray-400">{t('rewardsPage.pts')}</span>
                </p>
              </div>
              {pointsShort > 0 ? (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 border border-amber-100">
                    {pointsShort.toLocaleString()} pts short
                  </span>
                  <p className="mt-1 text-[11px] font-bold text-gray-400">
                    <button
                      type="button"
                      onClick={() => navigate('/profile/rewards/earn')}
                      className="text-[#EC3F8F] hover:underline"
                    >
                      Earn points →
                    </button>
                  </p>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-700 border border-emerald-100">
                  <Check size={14} className="stroke-[3]" />
                  <span>Ready to exchange</span>
                </span>
              )}
            </div>
          </div>

          {/* Desktop Primary Action CTA Button */}
          <div className="mt-6 hidden md:block">
            <button
              type="button"
              disabled={!canExchange || exchangeMutation.isPending}
              onClick={() => exchangeMutation.mutate(reward.id)}
              className={cn(
                'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-black transition active:scale-[0.99]',
                canExchange
                  ? 'bg-[#EC3F8F] text-white shadow-lg shadow-pink-200 hover:bg-[#d92e7d]'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400'
              )}
            >
              {exchangeMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Ticket size={18} />
              )}
              <span>{canExchange ? t('rewardsPage.detail.exchangeReward') : unavailableText}</span>
            </button>
          </div>

          {/* Tabs Section matching ProductDetail */}
          <div className="mt-8 border-t border-gray-100 pt-5">
            <div className="flex border-b border-gray-100 gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('instructions')}
                className={cn(
                  'relative pb-3 text-sm font-bold transition',
                  activeTab === 'instructions'
                    ? 'text-gray-950 font-black border-b-2 border-[#EC3F8F]'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                How to Redeem
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={cn(
                  'relative pb-3 text-sm font-bold transition',
                  activeTab === 'terms'
                    ? 'text-gray-950 font-black border-b-2 border-[#EC3F8F]'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                Terms & Conditions
              </button>
            </div>

            <div className="py-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
              {activeTab === 'instructions' ? (
                <ol className="list-decimal space-y-2 pl-4">
                  <li>Click <strong>Exchange Reward</strong> to redeem using your earned points.</li>
                  <li>A unique voucher or discount coupon code will be generated and saved to your <strong>My Coupons</strong> wallet.</li>
                  <li>Apply the coupon code during checkout to enjoy your gift, free shipping, or discount.</li>
                </ol>
              ) : (
                <ul className="list-disc space-y-2 pl-4">
                  <li>Points used for reward redemptions are non-refundable once confirmed.</li>
                  <li>Vouchers and gift items are subject to availability and cannot be transferred or exchanged for cash.</li>
                  <li>Reward codes expire according to store reward promotion policies.</li>
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Sticky Bottom CTA matching ProductDetail */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-4 py-3 shadow-[0_-8px_25px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
        <button
          type="button"
          disabled={!canExchange || exchangeMutation.isPending}
          onClick={() => exchangeMutation.mutate(reward.id)}
          className={cn(
            'mx-auto flex h-12 w-full max-w-[720px] items-center justify-center gap-2 rounded-xl text-sm font-black transition active:scale-[0.99] disabled:opacity-60',
            canExchange
              ? 'bg-[#EC3F8F] text-white shadow-lg shadow-pink-200'
              : 'bg-gray-100 text-gray-400'
          )}
        >
          {exchangeMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />}
          <span>{canExchange ? t('rewardsPage.detail.exchangeReward') : unavailableText}</span>
        </button>
      </div>
    </div>
  )
}
