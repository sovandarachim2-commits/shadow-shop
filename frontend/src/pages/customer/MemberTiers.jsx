import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  Crown,
  CheckCircle2,
  Lock,
  Star,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import useAuthStore from '@/store/authStore'
import { cn } from '@/utils/helpers'
import MembershipVisaCard, { MEMBERSHIP_TIER_CONFIG } from '@/components/customer/MembershipVisaCard'
import { getMemberTierImage } from '@/assets/member_shoppee'

const TIERS = [
  { level: 1, key: 'classic', name: 'Classic', defaultPoints: 0 },
  { level: 2, key: 'silver', name: 'Silver', defaultPoints: 500 },
  { level: 3, key: 'gold', name: 'Gold', defaultPoints: 1500 },
  { level: 4, key: 'platinum', name: 'Platinum', defaultPoints: 3000 },
  { level: 5, key: 'diamond', name: 'Diamond', defaultPoints: 6000 },
  { level: 6, key: 'vip', name: 'VIP', defaultPoints: 10000 },
  { level: 7, key: 'elite', name: 'Elite', defaultPoints: 20000 },
  { level: 8, key: 'royal', name: 'Royal', defaultPoints: 50000 },
]

export default function MemberTiers() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
  })

  const currentLevel = data?.member_level || 'Classic'
  const currentPoints = data?.current_points || 0
  const tierThresholds = data?.tier_thresholds || {}
  const tierDescriptions = data?.tier_descriptions || {}
  const tierDescriptionsKm = data?.tier_descriptions_km || {}

  const normalizedCurrentLevel = (currentLevel || 'Classic').toLowerCase()
  const currentTierObj = TIERS.find((t) => t.key === normalizedCurrentLevel) || TIERS[0]
  const currentTierIndex = TIERS.findIndex((t) => t.key === normalizedCurrentLevel)

  const [selectedTierKey, setSelectedTierKey] = useState(normalizedCurrentLevel)

  const isKhmer = i18n?.language === 'km'
  const displayName = useMemo(() => {
    return (
      user?.full_name ||
      [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
      user?.username ||
      'VALUED MEMBER'
    )
  }, [user])

  const selectedTier = TIERS.find((item) => item.key === selectedTierKey) || currentTierObj
  const selectedConfig = MEMBERSHIP_TIER_CONFIG[selectedTier.key] || MEMBERSHIP_TIER_CONFIG.classic
  const selectedIndex = TIERS.findIndex((item) => item.key === selectedTier.key)

  const selectedRequiredPoints = tierThresholds[selectedTier.key] ?? selectedTier.defaultPoints
  const isSelectedUnlocked = currentPoints >= selectedRequiredPoints || selectedIndex <= currentTierIndex
  const selectedPointsNeeded = Math.max(0, selectedRequiredPoints - currentPoints)
  const isSelectedCurrent = selectedTier.key === normalizedCurrentLevel

  const selectedCustomDesc = isKhmer
    ? (tierDescriptionsKm[selectedTier.key] || tierDescriptions[selectedTier.key])
    : (tierDescriptions[selectedTier.key] || tierDescriptionsKm[selectedTier.key])

  const selectedDesc =
    selectedCustomDesc ||
    t(`profile.tierDescriptions.${selectedTier.key}`, {
      defaultValue: selectedConfig.styleLabel || 'Enjoy member perks, rewards, and exclusive privileges.',
    })

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin text-pink-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="mx-auto w-full max-w-[1500px] px-5 md:px-6 md:pt-6">
        {/* Navigation Header */}
        <div className="-mx-5 mb-5 grid min-h-[64px] grid-cols-[44px_1fr_44px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+var(--page-safe-top))] md:mx-0 md:mt-0 md:flex md:min-h-0 md:gap-3 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 transition active:scale-95 md:h-10 md:w-10 md:border md:border-gray-200 md:bg-white hover:bg-gray-100"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 text-center md:flex-1 md:text-left">
            <h1 className="truncate text-base font-black tracking-tight text-gray-950 md:text-2xl">
              {t('rewardsPage.tierModalTitle', 'Membership Levels & Benefits')}
            </h1>
          </div>
          <div className="flex justify-end md:hidden">
            <span className="flex h-11 w-11 items-center justify-center text-pink-600">
              <Crown size={22} />
            </span>
          </div>
        </div>

        {/* Current Tier Quick Summary Strip */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
              <Crown size={16} />
            </span>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('rewardsPage.currentTier', 'Your Tier')}</p>
              <p className="text-sm font-black text-gray-950">
                {t(`profile.tiers.${currentTierObj.key}`, { defaultValue: currentTierObj.name })} Member
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('rewardsPage.yourPoints', 'Points')}</p>
            <p className="text-sm font-black font-mono text-gray-950">
              {currentPoints.toLocaleString()} <span className="text-xs font-normal text-gray-400">PTS</span>
            </p>
          </div>
        </div>

        {/* Horizontal Tier Selector Pills */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-2.5 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {TIERS.map((tierItem) => {
              const isSelected = tierItem.key === selectedTier.key
              const isUserCurrent = tierItem.key === normalizedCurrentLevel

              return (
                <button
                  key={tierItem.key}
                  type="button"
                  onClick={() => setSelectedTierKey(tierItem.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition active:scale-95',
                    isSelected
                      ? 'bg-gray-950 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-950'
                  )}
                >
                  <span>{tierItem.name}</span>
                  {isUserCurrent && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-pink-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Featured Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black text-gray-400 px-1">
              <span className="uppercase tracking-wider flex items-center gap-1.5 text-gray-700">
                <Sparkles size={16} className="text-amber-500" /> {selectedConfig.name} Pass
              </span>
              <span className="font-mono text-gray-600">
                {selectedRequiredPoints === 0
                  ? 'Entry Level'
                  : t('rewardsPage.minPointsRequired', { count: selectedRequiredPoints.toLocaleString() })}
              </span>
            </div>

            <MembershipVisaCard
              tier={selectedTier.key}
              memberName={displayName}
              points={currentPoints}
              isCurrent={isSelectedCurrent}
              isUnlocked={isSelectedUnlocked}
              pointsNeeded={selectedPointsNeeded}
              showStatus={true}
            />

            {/* Description & Perks Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase text-gray-700">
                    {t('rewardsPage.levelBadge', { level: selectedConfig.level })}
                  </span>
                  <h3 className="text-base sm:text-xl font-black text-gray-950">
                    {t(`profile.tiers.${selectedTier.key}`, { defaultValue: selectedTier.name })} Privileges
                  </h3>
                </div>

                <div>
                  {isSelectedCurrent ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs sm:text-sm font-black text-pink-700">
                      <Star size={13} fill="currentColor" />
                      {t('rewardsPage.currentTier', 'Current Level')}
                    </span>
                  ) : isSelectedUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-800">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      {t('rewardsPage.unlocked', 'Unlocked')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs sm:text-sm font-bold text-gray-700">
                      <Lock size={13} />
                      {t('rewardsPage.ptsToUnlock', { count: selectedPointsNeeded.toLocaleString() })}
                    </span>
                  )}
                </div>
              </div>

              <p
                className={cn('mt-4 text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed font-medium', isKhmer && 'font-khmer')}
                style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" } : undefined}
              >
                {selectedDesc}
              </p>

              {/* Benefits Checklist */}
              {selectedConfig.benefits && selectedConfig.benefits.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-400 mb-3.5">
                    Exclusive Tier Benefits
                  </p>
                  <div className="space-y-2.5">
                    {selectedConfig.benefits.map((benefit, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm md:text-base font-semibold text-gray-800">
                        <span className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Check size={13} strokeWidth={3} />
                        </span>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: All 8 Tiers Grid */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-gray-400 px-1">
              All 8 Membership Levels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
              {TIERS.map((tierItem, index) => {
                const cfg = MEMBERSHIP_TIER_CONFIG[tierItem.key] || MEMBERSHIP_TIER_CONFIG.classic
                const reqPoints = tierThresholds[tierItem.key] ?? tierItem.defaultPoints
                const isItemCurrent = tierItem.key === normalizedCurrentLevel
                const isItemUnlocked = currentPoints >= reqPoints || index <= currentTierIndex
                const ptsShort = Math.max(0, reqPoints - currentPoints)
                const isSelected = tierItem.key === selectedTier.key

                return (
                  <button
                    key={tierItem.key}
                    type="button"
                    onClick={() => setSelectedTierKey(tierItem.key)}
                    className={cn(
                      'flex items-center justify-between rounded-2xl p-3.5 sm:p-4 border text-left transition-all active:scale-[0.99] shadow-sm',
                      isSelected
                        ? 'border-pink-500 bg-pink-50/40 ring-2 ring-pink-500/20'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Color Swatch Thumbnail */}
                      <div
                        className="h-12 w-16 sm:h-14 sm:w-20 shrink-0 rounded-xl border shadow-sm relative overflow-hidden flex items-center justify-center"
                        style={{ background: cfg.gradient }}
                      >
                        <img
                          src={getMemberTierImage(tierItem.key)}
                          alt=""
                          className="h-8 w-8 sm:h-9 sm:w-9 object-contain drop-shadow"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm sm:text-base font-black text-gray-950">
                            {tierItem.name}
                          </p>
                          <span className="text-[10px] sm:text-xs font-bold text-gray-400">
                            Lv.{cfg.level}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-gray-500">
                          {reqPoints === 0 ? '0 pts (Free)' : `${reqPoints.toLocaleString()} pts required`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2">
                      {isItemCurrent ? (
                        <span className="rounded-full bg-pink-100 text-pink-700 px-3 py-1 text-xs font-black">
                          Current
                        </span>
                      ) : isItemUnlocked ? (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-bold">
                          Unlocked
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 text-gray-500 px-2.5 py-1 text-xs font-bold">
                          {ptsShort.toLocaleString()} pts
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
