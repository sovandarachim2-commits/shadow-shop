import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Cake, CalendarCheck, ChevronLeft, ChevronRight, Edit3, HelpCircle, Loader2,
  Share2, ShoppingBag, Star, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import CheckinSuccessModal from '@/components/rewards/CheckinSuccessModal'

function EarnRow({ icon: Icon, title, description, reward, action, actionLabel, disabled, completed = false }) {
  const { t } = useTranslation()
  const comingSoonLabel = t('rewardsPage.comingSoon')
  const isComingSoon = disabled && (reward === comingSoonLabel || actionLabel === comingSoonLabel)
  const handleClick = () => {
    if (isComingSoon) {
      toast(t('rewardsPage.comingSoon'))
      return
    }
    action?.()
  }

  return (
    <div className="flex min-h-[82px] items-center gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600">
        <Icon size={23} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-black text-gray-950">{title}</h3>
        <p className="mt-0.5 text-xs font-semibold text-gray-500">{description}</p>
        {reward && <span className="mt-1.5 inline-flex rounded-md bg-pink-50 px-2 py-1 text-[10px] font-black text-pink-600">{reward}</span>}
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled && !isComingSoon}
          className={`min-w-[76px] rounded-lg border px-3 py-2 text-xs font-black transition ${
            completed
              ? 'border-gray-200 bg-gray-100 text-gray-500'
              : 'border-pink-500 text-pink-600 disabled:border-gray-200 disabled:text-gray-400'
          }`}
        >
          {actionLabel}
        </button>
      ) : (
        <button type="button" onClick={handleClick} className="flex h-9 w-9 items-center justify-center rounded-full text-pink-600">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}

export default function EarnPoints() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCheckinSuccess, setShowCheckinSuccess] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
  })

  const checkinMutation = useMutation({
    mutationFn: () => ordersApi.rewards.dailyCheckin().then((response) => response.data),
    onSuccess: (nextData) => {
      queryClient.setQueryData(['customer-rewards-summary'], nextData)
      setShowCheckinSuccess(true)
    },
    onError: (error) => toast.error(error.response?.data?.detail || t('rewardsPage.toast.checkinFailed')),
  })

  const shareStore = async () => {
    const shareData = { title: 'Shadow Shop', text: 'Shop with Shadow Shop', url: window.location.origin }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await navigator.clipboard.writeText(window.location.origin)
        toast.success(t('rewardsPage.toast.linkCopied'))
      }
    } catch {
      // The user can cancel the native share sheet.
    }
  }

  if (isLoading && !data) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 size={26} className="animate-spin text-pink-600" /></div>
  if (isError) return <div className="py-20 text-center text-sm font-bold text-gray-500">{t('rewardsPage.earnLoadError')}</div>

  const points = data?.current_points || 0
  const memberLevel = data?.member_level || 'Silver'
  const translatedLevel = t(`profile.tiers.${memberLevel.toLowerCase()}`, { defaultValue: memberLevel })
  const nextLevelRaw = memberLevel === 'Silver' ? 'Gold' : 'Platinum'
  const nextLevel = t(`profile.tiers.${nextLevelRaw.toLowerCase()}`, { defaultValue: nextLevelRaw })
  const nextTierPoints = data?.next_tier_points || points
  const pointsToNext = data?.points_to_next_level || 0
  const progress = Math.min(100, data?.progress_pct || 0)
  const rules = data?.earning_rules || {}
  const purchaseEnabled = rules.is_active !== false && rules.purchase_points_enabled !== false
  const reviewEnabled = rules.is_active !== false && rules.review_bonus_enabled !== false
  const referralEnabled = rules.is_active !== false && rules.referral_bonus_enabled !== false
  const birthdayEnabled = rules.is_active !== false && rules.birthday_bonus_enabled !== false
  const dailyEnabled = rules.is_active !== false && rules.daily_checkin_enabled !== false && Number(rules.daily_checkin_bonus || 0) > 0
  const pointsPerDollar = Number(rules.points_per_dollar || 1)
  const pointUnit = pointsPerDollar === 1 ? t('rewardsPage.pointSingular') : t('rewardsPage.pointsPlural')

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto w-full max-w-[1500px] px-5 md:px-6 md:pt-6">
        <header className="sticky top-0 z-30 -mx-5 flex min-h-[60px] items-center gap-3 bg-white/95 px-5 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:mx-0 md:mb-6 md:min-h-0 md:bg-transparent md:px-0 md:pt-0">
          <button 
            type="button" 
            onClick={() => navigate('/profile/rewards')} 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-950 shadow-sm transition hover:bg-gray-50 active:scale-95"
          >
            <ChevronLeft size={23} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black text-gray-950 md:text-2xl">{t('rewardsPage.earn.title')}</h1>
            <p className="mt-0.5 text-xs font-semibold text-gray-500">{t('rewardsPage.earn.subtitle')}</p>
          </div>
          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-pink-600 shadow-sm transition hover:bg-gray-50">
            <HelpCircle size={19} />
          </button>
        </header>

        <section className="relative mt-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-pink-500 via-[#EC3F8F] to-pink-800 p-4 text-white shadow-[0_14px_32px_rgba(236,63,143,0.22)] md:mt-0 md:p-5">
          <p className="text-xs font-bold text-white/90 md:text-sm">{t('rewardsPage.yourPoints')}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 ring-[3px] ring-white/30"><Star size={20} fill="currentColor" /></span>
            <span className="text-[28px] font-black leading-none md:text-[32px]">{points.toLocaleString()}</span>
            <span className="self-end pb-0.5 text-xs font-black md:text-sm">{t('rewardsPage.pts')}</span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/75 px-3 py-1.5 text-xs font-black text-gray-950 md:mt-4 md:px-3.5 md:py-1.5">
            <Star size={12} fill="currentColor" className="text-gray-400" /> {t('profile.memberLevel', { level: translatedLevel })}
          </div>
          <div className="mt-5 flex justify-between gap-3 text-[11px] font-black md:mt-6 md:text-xs">
            <span>{t('rewardsPage.nextLevel')} <span className="text-yellow-300">{t('profile.memberLevel', { level: nextLevel })}</span></span>
            <span>{t('rewardsPage.ptsMore', { count: pointsToNext.toLocaleString() })}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20 md:h-2"><div className="h-full rounded-full bg-yellow-300" style={{ width: `${progress}%` }} /></div>
          <p className="mt-2.5 text-xs font-black md:mt-3 md:text-sm">{t('rewardsPage.ptsProgress', { current: points.toLocaleString(), total: nextTierPoints.toLocaleString() })}</p>
        </section>

        <h2 className="mb-2.5 mt-5 text-base font-black text-gray-950 md:text-lg">{t('rewardsPage.earn.waysToEarn')}</h2>
        <section className="grid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:grid-cols-2">
          <EarnRow
            icon={ShoppingBag}
            title={t('rewardsPage.earn.placeOrder')}
            description={t('rewardsPage.earn.placeOrderDesc')}
            reward={purchaseEnabled ? t('rewardsPage.earn.pointsPerDollar', { count: pointsPerDollar, unit: pointUnit }) : t('rewardsPage.comingSoon')}
            action={() => navigate('/shop')}
            disabled={!purchaseEnabled}
          />
          <EarnRow
            icon={Edit3}
            title={t('rewardsPage.earn.writeReview')}
            description={t('rewardsPage.earn.writeReviewDesc')}
            reward={reviewEnabled && rules.review_bonus ? t('rewardsPage.pointsReward', { count: rules.review_bonus }) : t('rewardsPage.comingSoon')}
            action={() => navigate('/my-orders')}
            disabled={!reviewEnabled || !rules.review_bonus}
          />
          <EarnRow
            icon={Users}
            title={t('rewardsPage.earn.referFriend')}
            description={t('rewardsPage.earn.referFriendDesc')}
            reward={referralEnabled && rules.referral_bonus ? t('rewardsPage.pointsReward', { count: rules.referral_bonus }) : t('rewardsPage.comingSoon')}
            action={() => navigate('/profile/rewards/referral')}
            disabled={!referralEnabled || !rules.referral_bonus}
          />
          <EarnRow
            icon={CalendarCheck}
            title={t('rewardsPage.earn.dailyCheckin')}
            description={data?.checked_in_today ? t('rewardsPage.earn.checkedInToday') : t('rewardsPage.earn.checkInOnce')}
            reward={dailyEnabled ? t('rewardsPage.pointsReward', { count: rules.daily_checkin_bonus }) : t('rewardsPage.comingSoon')}
            action={() => checkinMutation.mutate()}
            actionLabel={!dailyEnabled ? t('rewardsPage.comingSoon') : checkinMutation.isPending ? t('rewardsPage.earn.wait') : data?.checked_in_today ? t('rewardsPage.earn.done') : t('rewardsPage.earn.checkIn')}
            disabled={!dailyEnabled || data?.checked_in_today || checkinMutation.isPending}
            completed={dailyEnabled && data?.checked_in_today}
          />
          <EarnRow
            icon={Cake}
            title={t('rewardsPage.earn.birthdayBonus')}
            description={t('rewardsPage.earn.birthdayDesc')}
            reward={birthdayEnabled && rules.birthday_bonus ? t('rewardsPage.pointsReward', { count: rules.birthday_bonus }) : t('rewardsPage.comingSoon')}
            action={() => navigate('/profile')}
            disabled={!birthdayEnabled || !rules.birthday_bonus}
          />
          <EarnRow
            icon={Share2}
            title={t('rewardsPage.earn.shareFriends')}
            description={t('rewardsPage.earn.shareFriendsDesc')}
            action={shareStore}
            actionLabel={t('rewardsPage.earn.share')}
          />
        </section>

        <section className="mt-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 p-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 text-3xl font-black text-pink-600">$</span>
          <div>
            <h2 className="text-sm font-black text-gray-950">{t('rewardsPage.main.promoTitle')}</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-600">{t('rewardsPage.earn.promoDesc')}</p>
          </div>
        </section>
      </div>

      <CheckinSuccessModal
        isOpen={showCheckinSuccess}
        onClose={() => setShowCheckinSuccess(false)}
        points={rules.daily_checkin_bonus}
      />
    </div>
  )
}
