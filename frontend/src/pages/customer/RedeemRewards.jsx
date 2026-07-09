import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Gift, Loader2, Package, Percent, ShoppingCart, Star, Ticket, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import useCartStore from '@/store/cartStore'
import { cn } from '@/utils/helpers'

const FILTER_KEYS = ['all', 'vouchers', 'products', 'discounts', 'shipping']

const TYPE_ICON = {
  voucher: Ticket,
  discount: Percent,
  free_delivery: Truck,
  gift: Gift,
  lucky_box: Package,
  manual: Gift,
}

function RewardTile({ reward, currentPoints, busy, onRedeem, onView, t }) {
  const Icon = TYPE_ICON[reward.type] || Gift
  const image = reward.reward_image_url || reward.gift_product_image
  const hasStock = reward.stock == null || reward.stock > 0
  const canRedeem = reward.can_exchange && hasStock

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_5px_18px_rgba(15,23,42,0.06)]">
      <button type="button" onClick={onView} className="flex aspect-[1.12] w-full items-center justify-center bg-gray-50 p-2">
        {image ? (
          <img src={image} alt={reward.gift_product_name || reward.name} className="h-full w-full object-contain" />
        ) : (
          <Icon size={48} className="text-pink-500" strokeWidth={1.8} />
        )}
      </button>
      <div className="p-3">
        <h3 className="truncate text-sm font-black text-gray-950">{reward.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-gray-400">
          {reward.gift_product_name || reward.description || t('rewardsPage.redeem.redeemThisReward')}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-black text-gray-950">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white">
            <Star size={10} fill="currentColor" />
          </span>
          {Number(reward.points_required).toLocaleString()} {t('rewardsPage.pts')}
        </div>
        <button
          type="button"
          disabled={!canRedeem || busy}
          onClick={onRedeem}
          className="mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-pink-600 text-xs font-black text-white shadow-sm shadow-pink-100 disabled:bg-gray-100 disabled:text-gray-400"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : canRedeem ? t('rewardsPage.redeemBtn') : currentPoints < reward.points_required ? t('rewardsPage.morePointsNeeded') : t('rewardsPage.unavailable')}
        </button>
      </div>
    </article>
  )
}

export default function RedeemRewards() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cartCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0))
  const [activeFilter, setActiveFilter] = useState('all')
  const [redeemingId, setRedeemingId] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
  })

  const redeemMutation = useMutation({
    mutationFn: (rewardId) => ordersApi.rewards.exchange(rewardId).then((response) => response.data),
    onMutate: setRedeemingId,
    onSuccess: (nextData) => {
      queryClient.setQueryData(['customer-rewards-summary'], nextData)
      const code = nextData.redemption?.coupon_code
      toast.success(code ? t('rewardsPage.toast.redeemedWithCode', { code }) : t('rewardsPage.toast.redeemed'))
    },
    onError: (error) => toast.error(error.response?.data?.detail || t('rewardsPage.toast.redeemFailed')),
    onSettled: () => setRedeemingId(null),
  })

  const catalog = data?.catalog || []
  const sections = useMemo(() => {
    const vouchers = catalog.filter((reward) => ['voucher', 'discount', 'free_delivery'].includes(reward.type))
    const products = catalog.filter((reward) => ['gift', 'lucky_box'].includes(reward.type))
    const other = catalog.filter((reward) => !['voucher', 'discount', 'free_delivery', 'gift', 'lucky_box'].includes(reward.type))
    if (activeFilter === 'vouchers') return [{ title: t('rewardsPage.redeem.sectionVouchers'), rewards: vouchers }]
    if (activeFilter === 'products') return [{ title: t('rewardsPage.redeem.sectionProducts'), rewards: products }]
    if (activeFilter === 'discounts') return [{ title: t('rewardsPage.redeem.sectionDiscounts'), rewards: catalog.filter((reward) => ['voucher', 'discount'].includes(reward.type)) }]
    if (activeFilter === 'shipping') return [{ title: t('rewardsPage.redeem.sectionShipping'), rewards: catalog.filter((reward) => reward.type === 'free_delivery') }]
    return [
      { title: t('rewardsPage.redeem.sectionVouchers'), rewards: vouchers, filterKey: 'vouchers' },
      { title: t('rewardsPage.redeem.sectionProducts'), rewards: products, filterKey: 'products' },
      { title: t('rewardsPage.redeem.sectionOther'), rewards: other, filterKey: 'all' },
    ]
  }, [activeFilter, catalog, t])

  if (isLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 size={26} className="animate-spin text-pink-600" /></div>
  }

  if (isError) {
    return <div className="px-5 py-20 text-center text-sm font-bold text-gray-500">{t('rewardsPage.loadError')}</div>
  }

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="mx-auto w-full max-w-[620px] px-4 md:max-w-[1440px] md:px-6 md:pt-6">
        <header className="sticky top-0 z-30 -mx-4 grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:mx-0 md:mb-4 md:flex md:min-h-0 md:items-start md:justify-between md:bg-transparent md:px-0 md:pt-0">
          <button type="button" onClick={() => navigate('/profile/rewards')} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-950 md:hidden">
            <ChevronLeft size={23} />
          </button>
          <div className="min-w-0 text-center md:text-left">
            <h1 className="text-lg font-black text-gray-950 md:text-2xl">{t('rewardsPage.redeem.title')}</h1>
            <p className="mt-1 hidden text-xs font-semibold text-gray-500 md:block">{t('rewardsPage.redeem.subtitle')}</p>
          </div>
          <button type="button" onClick={() => navigate('/cart')} className="relative flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-gray-950">
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-600 px-1 text-[9px] font-black text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </header>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:mb-4 md:mt-0 [&::-webkit-scrollbar]:hidden">
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={cn(
                'shrink-0 rounded-xl px-4 py-2.5 text-xs font-black transition',
                activeFilter === key ? 'bg-pink-600 text-white shadow-sm shadow-pink-100' : 'bg-gray-50 text-gray-500'
              )}
            >
              {t(`rewardsPage.filter.${key}`)}
            </button>
          ))}
        </nav>

        <div className="mt-6 space-y-7">
          {sections.filter((section) => section.rewards.length > 0).map((section) => (
            <section key={section.title}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-950">{section.title}</h2>
                <button type="button" onClick={() => setActiveFilter(section.filterKey || 'all')} className="flex items-center gap-0.5 text-xs font-black text-pink-600">
                  {t('rewardsPage.viewAll')} <ChevronRight size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {section.rewards.map((reward) => (
                  <RewardTile
                    key={reward.id}
                    reward={reward}
                    currentPoints={data?.current_points || 0}
                    busy={redeemingId === reward.id}
                    onView={() => navigate(`/profile/rewards/${reward.id}`)}
                    onRedeem={() => redeemMutation.mutate(reward.id)}
                    t={t}
                  />
                ))}
              </div>
            </section>
          ))}
          {catalog.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center md:py-24">
              <Gift size={34} className="mx-auto text-gray-200" />
              <p className="mt-3 text-sm font-black text-gray-500">{t('rewardsPage.redeem.noRewards')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
