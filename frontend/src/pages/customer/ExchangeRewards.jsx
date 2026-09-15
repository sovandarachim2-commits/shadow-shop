import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  Gift,
  HelpCircle,
  History,
  Loader2,
  Package,
  Percent,
  Sparkles,
  Star,
  Ticket,
  Truck,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import RewardRedeemedDialog from '@/components/customer/RewardRedeemedDialog'
import { cn, formatDate } from '@/utils/helpers'

const CATEGORY_FILTER_KEYS = ['all', 'voucher', 'gift', 'discount', 'free_delivery']

function getTypeMeta(t) {
  return {
    voucher: { label: t('rewardsPage.type.voucher'), icon: Ticket, tone: 'bg-pink-50 text-pink-600' },
    discount: { label: t('rewardsPage.type.coupon'), icon: Percent, tone: 'bg-pink-50 text-pink-600' },
    free_delivery: { label: t('rewardsPage.type.freeDelivery'), icon: Truck, tone: 'bg-sky-50 text-sky-600' },
    gift: { label: t('rewardsPage.type.gift'), icon: Gift, tone: 'bg-amber-50 text-amber-600' },
    lucky_box: { label: t('rewardsPage.type.luckyBox'), icon: Package, tone: 'bg-violet-50 text-violet-600' },
    manual: { label: t('rewardsPage.type.manual'), icon: BadgeCheck, tone: 'bg-violet-50 text-violet-600' },
  }
}

function getSampleRewards(t) {
  return [
    { id: 'sample-1', name: t('rewardsPage.main.sampleDiscount'), description: t('rewardsPage.main.sampleDiscountDesc'), type: 'discount', points_required: 500, preview: true },
    { id: 'sample-2', name: t('rewardsPage.main.sampleFreeDelivery'), description: t('rewardsPage.main.sampleFreeDeliveryDesc'), type: 'free_delivery', points_required: 800, preview: true },
    { id: 'sample-3', name: t('rewardsPage.main.samplePercentOff'), description: t('rewardsPage.main.samplePercentOffDesc'), type: 'discount', points_required: 1000, preview: true },
    { id: 'sample-4', name: t('rewardsPage.main.sampleLuckyBox'), description: t('rewardsPage.main.sampleLuckyBoxDesc'), type: 'lucky_box', points_required: 1500, preview: true },
  ]
}

function RewardCard({ reward, currentPoints, onExchange, isExchanging, onView, t, typeMeta }) {
  const meta = typeMeta[reward.type] || typeMeta.discount
  const Icon = meta.icon
  const rewardImage = reward.reward_image_url || reward.gift_product_image
  const hasStock = reward.stock === null || reward.stock === undefined || reward.stock > 0
  const canExchange = !reward.preview && reward.can_exchange && hasStock
  const pointsShort = Math.max(0, reward.points_required - currentPoints)
  const unavailableText = !hasStock
    ? t('rewardsPage.outOfStock')
    : pointsShort > 0
      ? t('rewardsPage.ptsShort', { count: pointsShort.toLocaleString() })
      : t('rewardsPage.unavailable')

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
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-soft"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <div className={cn('flex h-full w-full items-center justify-center', rewardImage ? 'bg-white' : meta.tone)}>
          {rewardImage ? (
            <img src={rewardImage} alt={reward.gift_product_name || reward.name} className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.03]" />
          ) : (
            <Icon size={42} strokeWidth={2.2} />
          )}
        </div>
        {!canExchange && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <span className="rounded-full bg-gray-900/80 px-3 py-1.5 text-[10px] font-black text-white ring-2 ring-white/20">
              {unavailableText}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col p-3">
        <div className="flex items-center gap-1.5">
          <div className={cn('flex h-5 w-5 items-center justify-center rounded-md', meta.tone)}>
            <Icon size={12} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{meta.label}</span>
        </div>
        
        <h3 className="mt-1.5 line-clamp-2 min-h-[36px] text-sm font-black leading-tight text-gray-950 group-hover:text-pink-600">
          {reward.name}
        </h3>

        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
            <Star size={12} fill="currentColor" />
          </span>
          <span className="text-sm font-black text-gray-950">
            {Number(reward.points_required).toLocaleString()}
          </span>
          <span className="text-[11px] font-bold text-gray-500">{t('rewardsPage.pts')}</span>
        </div>

        <div className="mt-3.5 pt-1">
          <button
            type="button"
            disabled={!canExchange || isExchanging}
            onClick={(event) => {
              event.stopPropagation()
              if (canExchange) onExchange(reward.id)
            }}
            className={cn(
              'flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-black transition active:scale-95',
              canExchange
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-100 hover:bg-pink-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {isExchanging ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t('rewardsPage.redeem')
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

function HistoryList({ redemptions, t }) {
  if (!redemptions.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-12 text-center">
        <History size={32} className="mx-auto text-gray-200" />
        <p className="mt-3 text-sm font-black text-gray-900">{t('rewardsPage.noExchangesYet')}</p>
        <p className="mt-1 text-xs font-semibold text-gray-400">{t('rewardsPage.exchangesHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {redemptions.map((item) => {
        const rewardImage = item.reward_image_url || item.gift_product_image
        return (
          <div key={item.id} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
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
                  <p className="mt-1 text-xs font-semibold text-gray-400">{formatDate(item.created_at)} - {item.points_spent.toLocaleString()} {t('rewardsPage.pts')}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black capitalize text-emerald-600">
                {item.status}
              </span>
            </div>
            {item.coupon_code && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-xs font-black uppercase tracking-wide text-gray-400">{t('rewardsPage.code')}</span>
                <span className="font-mono text-sm font-black text-gray-950">{item.coupon_code}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PointActivityList({ transactions, onViewAll, t }) {
  if (!transactions.length) return null

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History size={18} className="text-pink-500" />
          <h2 className="text-sm font-black text-gray-950">{t('rewardsPage.pointActivity')}</h2>
        </div>
        <button type="button" onClick={onViewAll} className="text-xs font-black text-pink-600">{t('rewardsPage.viewAll')}</button>
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
                {isPositive ? '+' : ''}{Number(item.points).toLocaleString()} {t('rewardsPage.pts')}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function ExchangeRewards() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [exchangingId, setExchangingId] = useState(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [redeemedCoupon, setRedeemedCoupon] = useState(null)
  const typeMeta = getTypeMeta(t)
  const sampleRewards = getSampleRewards(t)

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
      if (code) {
        setRedeemedCoupon(nextData.redemption)
      } else {
        toast.success(t('rewardsPage.toast.exchanged'))
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || t('rewardsPage.toast.exchangeFailed'))
    },
    onSettled: () => setExchangingId(null),
  })

  const rewards = data?.catalog || []
  const redemptions = data?.redemptions || []
  const transactions = data?.transactions || []

  if (isLoading && !data) {
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
        <h1 className="mt-4 text-lg font-black text-gray-950">{t('rewardsPage.loadError')}</h1>
        <button onClick={() => navigate('/profile')} className="mt-5 rounded-lg bg-pink-600 px-5 py-2.5 text-sm font-black text-white">
          {t('rewardsPage.backToProfile')}
        </button>
      </div>
    )
  }

  const currentPoints = data?.current_points || 0
  const nextTierPoints = data?.next_tier_points || 2000
  const pointsToNext = data?.points_to_next_level ?? Math.max(0, nextTierPoints - currentPoints)
  const memberLevel = data?.member_level || 'Silver'
  const translatedLevel = t(`profile.tiers.${memberLevel.toLowerCase()}`, { defaultValue: memberLevel })
  const nextMemberLevel = memberLevel === 'Silver' ? 'Gold' : memberLevel === 'Gold' ? 'Platinum' : 'Platinum'
  const progressPct = Math.min(100, data?.progress_pct || Math.round((currentPoints / Math.max(nextTierPoints, 1)) * 100))
  const displayRewards = rewards.length > 0 ? rewards : sampleRewards
  const filteredRewards = displayRewards.filter((reward) => {
    if (activeCategory === 'all') return true
    if (activeCategory === 'voucher') return ['voucher', 'discount'].includes(reward.type)
    return reward.type === activeCategory
  })

  const categoryLabel = (key) => {
    if (key === 'voucher') return t('rewardsPage.filter.vouchers')
    if (key === 'gift') return t('rewardsPage.filter.products')
    if (key === 'discount') return t('rewardsPage.filter.discounts')
    if (key === 'free_delivery') return t('rewardsPage.filter.shipping')
    return t('rewardsPage.filter.all')
  }

  const quickActions = [
    { title: t('rewardsPage.main.earnPoints'), text: t('rewardsPage.main.earnPointsDesc'), icon: Star, action: () => navigate('/profile/rewards/earn') },
    { title: t('rewardsPage.main.redeemPoints'), text: t('rewardsPage.main.redeemPointsDesc'), icon: Gift, action: () => navigate('/profile/rewards/redeem') },
    { title: t('rewardsPage.main.myCoupons'), text: t('rewardsPage.main.myCouponsDesc'), icon: Ticket, action: () => navigate('/profile/rewards/coupons') },
    { title: t('rewardsPage.main.pointHistory'), text: t('rewardsPage.main.pointHistoryDesc'), icon: History, action: () => navigate('/profile/rewards/history') },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
      <RewardRedeemedDialog redemption={redeemedCoupon} onClose={() => setRedeemedCoupon(null)} />
      <div className="mx-auto flex w-full flex-col px-5 pb-6 pt-[max(0.35rem,env(safe-area-inset-top))] max-w-[1500px] md:px-6 md:pt-6">
        <header className="mb-6 flex items-center gap-4">
          <button 
            type="button" 
            onClick={() => navigate('/profile')} 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-slate-950 md:text-[28px]">{t('rewardsPage.main.title')}</h1>
            <p className="text-sm font-semibold text-slate-500">{t('rewardsPage.main.subtitle')}</p>
          </div>
        </header>

        <section className="relative mt-2 overflow-hidden rounded-[22px] bg-gradient-to-br from-pink-500 via-[#EC3F8F] to-pink-800 p-4 text-white shadow-[0_14px_32px_rgba(236,63,143,0.22)] md:mt-4 md:rounded-[22px] md:p-5">
          <div className="absolute right-5 top-8 h-28 w-28 rotate-45 rounded-3xl bg-white/10" />
          <Sparkles className="absolute right-32 top-6 text-white/20" size={24} />
          <Sparkles className="absolute bottom-20 right-36 text-white/15" size={20} />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white/90 md:text-sm">{t('rewardsPage.yourPoints')}</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg shadow-pink-950/20 ring-[3px] ring-white/30 md:h-11 md:w-11">
                  <Star size={20} fill="currentColor" />
                </span>
                <div className="flex items-end gap-1.5">
                  <span className="text-[32px] font-black leading-none tracking-tight md:text-[36px]">{currentPoints.toLocaleString()}</span>
                  <span className="pb-0.5 text-xs font-black md:pb-1 md:text-sm">{t('rewardsPage.pts')}</span>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/75 px-3 py-1.5 text-gray-950 shadow-sm backdrop-blur md:mt-4 md:px-3.5 md:py-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-white md:h-6 md:w-6">
                  <Star size={12} fill="currentColor" />
                </span>
                <span className="text-xs font-black md:text-sm">{t('profile.memberLevel', { level: translatedLevel })}</span>
              </div>
            </div>
            <div className="absolute right-5 top-8 flex h-20 w-20 shrink-0 items-center justify-center opacity-90 sm:relative sm:right-auto sm:top-auto sm:mt-2 sm:h-24 sm:w-24">
              <div className="absolute inset-0 rotate-30 rounded-[28px] bg-white/25 shadow-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] border-[3px] border-white/70 bg-gradient-to-br from-gray-100 to-gray-400 text-white shadow-xl sm:h-20 sm:w-20 sm:rounded-[24px] sm:border-4">
                <Star size={30} fill="currentColor" />
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-5 md:mt-6">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black md:mb-2.5">
              <span>{t('rewardsPage.nextLevel')} <span className="text-yellow-300">{t('profile.memberLevel', { level: nextMemberLevel })}</span></span>
              <span>{t('rewardsPage.ptsMore', { count: pointsToNext.toLocaleString() })}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20 md:h-2">
              <div className="h-full rounded-full bg-yellow-300 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2.5 text-xs font-black md:mt-3 md:text-sm">{t('rewardsPage.ptsProgress', { current: currentPoints.toLocaleString(), total: nextTierPoints.toLocaleString() })}</p>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2.5 md:mt-4 md:grid-cols-4 md:gap-3">
          {quickActions.map((item) => {
            const Icon = item.icon
            return (
              <button type="button" onClick={item.action} key={item.title} className="flex min-h-[86px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-[0_6px_18px_rgba(15,23,42,0.05)] active:scale-[0.98] md:min-h-[104px] md:p-3">
                <Icon size={24} className="text-pink-600 md:h-7 md:w-7" fill={item.icon === Star ? 'currentColor' : 'none'} />
                <span className="mt-1.5 text-[12px] font-black text-gray-950 md:mt-2 md:text-sm">{item.title}</span>
                <span className="mt-0.5 text-[10px] font-semibold text-gray-500 md:text-xs">{item.text}</span>
              </button>
            )
          })}
        </section>

        <section className="mt-3 flex items-center gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-pink-100 md:mt-4 md:gap-4 md:p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 md:h-16 md:w-16 md:rounded-2xl">
            <span className="text-2xl font-black md:text-3xl">$</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-gray-950 md:text-base">{t('rewardsPage.main.promoTitle')}</h2>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed text-gray-700 md:mt-1 md:leading-normal">{t('rewardsPage.main.promoDesc')}</p>
            <button type="button" onClick={() => navigate('/profile/rewards/earn')} className="mt-2 rounded-lg bg-pink-600 px-3.5 py-1.5 text-[11px] font-black text-white shadow-lg shadow-pink-100 md:mt-2.5 md:px-4 md:py-2 md:text-xs">{t('rewardsPage.main.earnNow')}</button>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-3 shadow-sm md:mt-6 md:bg-transparent md:p-0 md:shadow-none">
          <div className="mb-3 flex items-center justify-between md:mb-3.5">
            <h2 className="text-base font-black text-gray-950 md:text-lg">{t('rewardsPage.main.redeemWithPoints')}</h2>
            <button type="button" onClick={() => navigate('/profile/rewards/redeem')} className="flex items-center gap-1 text-xs font-black text-pink-600 md:text-sm">{t('rewardsPage.viewAll')} <ChevronLeft size={14} className="rotate-180" /></button>
          </div>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 pr-2 [scrollbar-width:none] md:mb-3.5 [&::-webkit-scrollbar]:hidden">
            {CATEGORY_FILTER_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(key)}
                className={cn(
                  'shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-black transition md:px-4 md:py-2.5 md:text-xs',
                  activeCategory === key ? 'bg-pink-600 text-white shadow-lg shadow-pink-100' : 'bg-gray-100 text-gray-500'
                )}
              >
                {categoryLabel(key)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 md:gap-4">
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                currentPoints={currentPoints}
                isExchanging={exchangingId === reward.id}
                onView={(item) => navigate(`/profile/rewards/${item.id}`)}
                onExchange={(rewardId) => exchangeMutation.mutate(rewardId)}
                t={t}
                typeMeta={typeMeta}
              />
            ))}
          </div>
        </section>

        {redemptions.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <h2 className="text-sm font-black text-gray-950">{t('rewardsPage.recentRewardStatus')}</h2>
            </div>
            <HistoryList redemptions={redemptions.slice(0, 3)} t={t} />
          </section>
        )}

        <PointActivityList transactions={transactions} onViewAll={() => navigate('/profile/rewards/history')} t={t} />
      </div>
    </div>
  )
}
