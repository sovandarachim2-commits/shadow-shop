import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Crown, CheckCircle2, Lock, Star, X, Check, ArrowRight } from 'lucide-react'
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

export default function MemberTiersModal({
  isOpen,
  onClose,
  currentLevel = 'Classic',
  currentPoints = 0,
  tierThresholds = {},
  tierDescriptions = {},
  tierDescriptionsKm = {},
  t: propT,
}) {
  const { t: hookT, i18n } = useTranslation()
  const t = propT || hookT
  const { user } = useAuthStore()

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

  if (!isOpen) return null

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
      defaultValue: 'Enjoy member perks, rewards, and exclusive shopping privileges.',
    })

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-200">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white text-gray-900 shadow-2xl sm:max-h-[88vh] sm:rounded-[28px] border border-gray-100">
        {/* Mobile drag handle */}
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-5 pb-4 pt-4 sm:px-6 sm:pt-5 bg-white">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
              <Crown size={22} />
            </span>
            <div>
              <h2
                className={cn('text-lg font-black text-gray-950 sm:text-xl', isKhmer && 'font-khmer')}
                style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" } : undefined}
              >
                {t('rewardsPage.tierModalTitle', 'Membership Levels & Benefits')}
              </h2>
              <p
                className={cn('mt-0.5 text-xs font-semibold text-gray-500 sm:text-sm', isKhmer && 'font-khmer')}
                style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" } : undefined}
              >
                {t('rewardsPage.tierModalSubtitle', 'Earn points on purchases to unlock higher tiers, bigger discounts, and exclusive rewards.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900 active:scale-95"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Tier Quick Summary Strip */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">{t('rewardsPage.currentTier', 'Your Tier')}:</span>
            <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-black text-pink-700">
              {t(`profile.tiers.${currentTierObj.key}`, { defaultValue: currentTierObj.name })}
            </span>
          </div>
          <div className="text-xs font-bold text-gray-600">
            {t('rewardsPage.yourPoints', 'Points')}: <span className="font-mono font-black text-gray-950">{currentPoints.toLocaleString()}</span> pts
          </div>
        </div>

        {/* Tier Selector Pills */}
        <div className="border-b border-gray-100 bg-white px-4 py-2.5 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TIERS.map((tierItem) => {
              const isSelected = tierItem.key === selectedTier.key
              const isUserCurrent = tierItem.key === normalizedCurrentLevel

              return (
                <button
                  key={tierItem.key}
                  type="button"
                  onClick={() => setSelectedTierKey(tierItem.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition active:scale-95',
                    isSelected
                      ? 'bg-gray-950 text-white shadow-sm'
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

        {/* Scrollable Body */}
        <div className="space-y-5 overflow-y-auto px-5 pb-7 pt-5 sm:px-6 sm:pb-8 bg-white">
          {/* Featured Physical Membership Card */}
          <div className="mx-auto w-full max-w-lg">
            <MembershipVisaCard
              tier={selectedTier.key}
              memberName={displayName}
              points={currentPoints}
              isCurrent={isSelectedCurrent}
              isUnlocked={isSelectedUnlocked}
              pointsNeeded={selectedPointsNeeded}
            />
          </div>

          {/* Tier Privileges & Benefits Card */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-50/80 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-200/60">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-gray-700">
                  {t('rewardsPage.levelBadge', { level: selectedConfig.level })}
                </span>
                <h3 className="text-base font-black text-gray-950 sm:text-lg">
                  {t(`profile.tiers.${selectedTier.key}`, { defaultValue: selectedTier.name })} Privileges
                </h3>
              </div>

              <div>
                {isSelectedCurrent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700">
                    <Star size={12} fill="currentColor" />
                    {t('rewardsPage.currentTier', 'Current Level')}
                  </span>
                ) : isSelectedUnlocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    {t('rewardsPage.unlocked', 'Unlocked')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700">
                    <Lock size={12} />
                    {t('rewardsPage.ptsToUnlock', { count: selectedPointsNeeded.toLocaleString() })}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p
              className={cn('mt-3 text-xs sm:text-sm text-gray-600 leading-relaxed font-medium', isKhmer && 'font-khmer')}
              style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" } : undefined}
            >
              {selectedDesc}
            </p>

            {/* Benefits Checklist */}
            {selectedConfig.benefits && selectedConfig.benefits.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200/60">
                <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5">
                  Member Benefits & Perks
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedConfig.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All 8 Tiers Overview */}
          <div>
            <h3 className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">
              All 8 Membership Levels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                      'flex items-center justify-between rounded-xl p-3 border text-left transition-all active:scale-[0.99]',
                      isSelected
                        ? 'border-pink-500 bg-pink-50/40 ring-1 ring-pink-500/30'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color Swatch Thumbnail */}
                      <div
                        className="h-10 w-14 shrink-0 rounded-lg border shadow-sm relative overflow-hidden flex items-center justify-center"
                        style={{ background: cfg.gradient }}
                      >
                        <img
                          src={getMemberTierImage(tierItem.key)}
                          alt=""
                          className="h-6 w-6 object-contain drop-shadow"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-black text-gray-950">
                            {tierItem.name}
                          </p>
                          <span className="text-[10px] font-bold text-gray-400">
                            Lv.{cfg.level}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-500">
                          {reqPoints === 0 ? '0 pts' : `${reqPoints.toLocaleString()} pts`}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isItemCurrent ? (
                        <span className="rounded-full bg-pink-100 text-pink-700 px-2 py-0.5 text-[10px] font-black">
                          Current
                        </span>
                      ) : isItemUnlocked ? (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                          Unlocked
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-[10px] font-bold">
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
