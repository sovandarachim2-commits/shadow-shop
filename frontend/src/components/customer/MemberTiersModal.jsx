import { useTranslation } from 'react-i18next'
import { Check, CheckCircle2, Crown, Lock, Shield, Sparkles, Star, Award, X } from 'lucide-react'
import { cn } from '@/utils/helpers'
import { getMemberTierImage } from '@/assets/member_shoppee'

const TIERS = [
  { level: 1, key: 'classic', name: 'Classic', icon: Shield, defaultPoints: 0 },
  { level: 2, key: 'silver', name: 'Silver', icon: Award, defaultPoints: 500 },
  { level: 3, key: 'gold', name: 'Gold', icon: Crown, defaultPoints: 1500 },
  { level: 4, key: 'platinum', name: 'Platinum', icon: Sparkles, defaultPoints: 3000 },
  { level: 5, key: 'diamond', name: 'Diamond', icon: Sparkles, defaultPoints: 6000 },
  { level: 6, key: 'vip', name: 'VIP', icon: Crown, defaultPoints: 10000 },
  { level: 7, key: 'elite', name: 'Elite', icon: Star, defaultPoints: 20000 },
  { level: 8, key: 'royal', name: 'Royal', icon: Crown, defaultPoints: 50000 },
]

const TIER_STYLES = {
  classic: {
    badgeBg: 'bg-slate-100 text-slate-700',
    dotGradient: 'from-slate-400 to-slate-600',
    borderActive: 'border-slate-400 ring-2 ring-slate-200',
    cardBg: 'bg-white',
    accentColor: 'text-slate-700',
  },
  silver: {
    badgeBg: 'bg-gray-100 text-gray-700',
    dotGradient: 'from-gray-300 via-gray-400 to-gray-500',
    borderActive: 'border-gray-400 ring-2 ring-gray-200',
    cardBg: 'bg-white',
    accentColor: 'text-gray-700',
  },
  gold: {
    badgeBg: 'bg-amber-100 text-amber-800',
    dotGradient: 'from-amber-400 to-amber-600',
    borderActive: 'border-amber-400 ring-2 ring-amber-200',
    cardBg: 'bg-gradient-to-br from-amber-50/40 to-white',
    accentColor: 'text-amber-600',
  },
  platinum: {
    badgeBg: 'bg-cyan-100 text-cyan-800',
    dotGradient: 'from-cyan-400 to-blue-500',
    borderActive: 'border-cyan-400 ring-2 ring-cyan-200',
    cardBg: 'bg-gradient-to-br from-cyan-50/40 to-white',
    accentColor: 'text-cyan-600',
  },
  diamond: {
    badgeBg: 'bg-pink-100 text-pink-800',
    dotGradient: 'from-pink-400 to-rose-500',
    borderActive: 'border-pink-400 ring-2 ring-pink-200',
    cardBg: 'bg-gradient-to-br from-pink-50/40 to-white',
    accentColor: 'text-pink-600',
  },
  vip: {
    badgeBg: 'bg-purple-100 text-purple-800',
    dotGradient: 'from-purple-500 to-indigo-600',
    borderActive: 'border-purple-400 ring-2 ring-purple-200',
    cardBg: 'bg-gradient-to-br from-purple-50/40 to-white',
    accentColor: 'text-purple-600',
  },
  elite: {
    badgeBg: 'bg-emerald-100 text-emerald-800',
    dotGradient: 'from-teal-400 to-emerald-600',
    borderActive: 'border-emerald-400 ring-2 ring-emerald-200',
    cardBg: 'bg-gradient-to-br from-emerald-50/40 to-white',
    accentColor: 'text-emerald-600',
  },
  royal: {
    badgeBg: 'bg-gradient-to-r from-amber-200 via-rose-200 to-purple-200 text-purple-950 font-black',
    dotGradient: 'from-amber-400 via-rose-500 to-purple-600',
    borderActive: 'border-rose-400 ring-2 ring-rose-200',
    cardBg: 'bg-gradient-to-br from-purple-50/50 via-rose-50/40 to-amber-50/30',
    accentColor: 'text-rose-600',
  },
}

export default function MemberTiersModal({
  isOpen,
  onClose,
  currentLevel = 'Classic',
  currentPoints = 0,
  tierThresholds = {},
  tierDescriptions = {},
  tierDescriptionsKm = {},
  t,
}) {
  const { i18n } = useTranslation()
  if (!isOpen) return null

  const isKhmer = i18n?.language === 'km'
  const normalizedCurrentLevel = (currentLevel || 'Classic').toLowerCase()
  const currentTierObj = TIERS.find((t) => t.key === normalizedCurrentLevel) || TIERS[0]
  const currentTierIndex = TIERS.findIndex((t) => t.key === normalizedCurrentLevel)

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-gray-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in duration-200">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-[28px]">
        {/* Mobile drag handle */}
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-5 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
              <Crown size={22} />
            </span>
            <div>
              <h2
                className={cn("text-lg font-black text-gray-950 sm:text-xl", isKhmer && "font-khmer")}
                style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" } : undefined}
              >
                {t('rewardsPage.tierModalTitle', 'Membership Levels & Benefits')}
              </h2>
              <p
                className={cn("mt-0.5 text-xs font-semibold text-gray-500 sm:text-sm", isKhmer && "font-khmer")}
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

        {/* Current Level Status Banner */}
        <div className="bg-gradient-to-r from-pink-500 via-[#EC3F8F] to-pink-700 px-5 py-3 text-white sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1 shadow">
                <img
                  src={getMemberTierImage(currentTierObj.key)}
                  alt={currentTierObj.name}
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  {t('rewardsPage.currentTier', 'Current Tier')}
                </p>
                <p className="text-sm font-black">
                  {t('rewardsPage.levelBadge', { level: currentTierObj.level })}: {t(`profile.tiers.${currentTierObj.key}`, { defaultValue: currentTierObj.name })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-white/80">{t('rewardsPage.yourPoints', 'Your Points')}</p>
              <p className="text-base font-black leading-tight sm:text-lg">
                {currentPoints.toLocaleString()} <span className="text-xs font-bold text-white/90">pts</span>
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Tier List */}
        <div className="space-y-3.5 overflow-y-auto px-5 pb-7 pt-5 sm:px-6 sm:pb-8 sm:pt-6">
          {TIERS.map((tier, index) => {
            const style = TIER_STYLES[tier.key] || TIER_STYLES.classic
            const Icon = tier.icon
            const requiredPoints = tierThresholds[tier.key] ?? tier.defaultPoints
            const isCurrent = tier.key === normalizedCurrentLevel
            const isUnlocked = currentPoints >= requiredPoints || index <= currentTierIndex
            const pointsNeeded = Math.max(0, requiredPoints - currentPoints)
            const translatedName = t(`profile.tiers.${tier.key}`, { defaultValue: tier.name })
            const customDesc = isKhmer
              ? (tierDescriptionsKm[tier.key] || tierDescriptions[tier.key])
              : (tierDescriptions[tier.key] || tierDescriptionsKm[tier.key])
            const translatedDesc =
              customDesc ||
              t(`profile.tierDescriptions.${tier.key}`, {
                defaultValue: 'Enjoy member perks, rewards, and exclusive shopping privileges.',
              })

            return (
              <div
                key={tier.key}
                className={cn(
                  'relative rounded-2xl border p-4 transition-all',
                  style.cardBg,
                  isCurrent
                    ? `${style.borderActive} shadow-md shadow-pink-500/10`
                    : isUnlocked
                    ? 'border-gray-200'
                    : 'border-gray-100 opacity-80'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1 border border-pink-100 shadow-sm">
                      <img
                        src={getMemberTierImage(tier.key)}
                        alt={translatedName}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide', style.badgeBg)}>
                          {t('rewardsPage.levelBadge', { level: tier.level })}
                        </span>
                        <h3 className="text-base font-black text-gray-950 sm:text-lg">
                          {translatedName}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-gray-500">
                        {requiredPoints === 0
                          ? '0 pts'
                          : t('rewardsPage.minPointsRequired', { count: requiredPoints.toLocaleString() })}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700 shadow-sm">
                        <Star size={12} fill="currentColor" />
                        {t('rewardsPage.currentTier', 'Current Tier')}
                      </span>
                    ) : isUnlocked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        {t('rewardsPage.unlocked', 'Unlocked')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
                        <Lock size={12} />
                        {t('rewardsPage.ptsToUnlock', { count: pointsNeeded.toLocaleString() })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p
                  className={cn(
                    'mt-3 text-xs font-medium leading-relaxed text-gray-600 sm:text-sm',
                    isKhmer && 'font-khmer'
                  )}
                  style={isKhmer ? { fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" } : undefined}
                >
                  {translatedDesc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

