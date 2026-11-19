import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Crown,
  Sparkles,
  Shield,
  Star,
  Award,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { cn } from '@/utils/helpers'
import { getMemberTierImage } from '@/assets/member_shoppee'

export const MEMBERSHIP_TIER_CONFIG = {
  classic: {
    level: 1,
    key: 'classic',
    name: 'Classic Member',
    shortName: 'Classic',
    subtitle: 'Entry Level',
    styleLabel: 'Clean, simple, elegant',
    gradient: 'linear-gradient(135deg, #F1F2F5 0%, #D8DCE5 50%, #C5C9D3 100%)',
    border: 'border-[#B8BDC9]',
    shadow: 'shadow-[0_14px_30px_rgba(15,23,42,0.12)]',
    isDark: false,
    textPrimary: 'text-[#1E293B]',
    textSecondary: 'text-[#475569]',
    textMuted: 'text-[#64748B]',
    chipType: 'silver',
    passBadge: 'CLASSIC PASS',
    badgeBg: 'bg-[#1E293B]/10 text-[#1E293B] border-[#1E293B]/20',
    progressBg: 'bg-[#CBD5E1]',
    progressFill: 'bg-[#1E293B]',
    accentGlow: 'rgba(197,201,211,0.45)',
    accentColor: '#1E293B',
    defaultPoints: 0,
    icon: Shield,
    benefits: ['1x Reward points on all purchases', 'Standard member discounts', 'Access to member vouchers'],
  },
  silver: {
    level: 2,
    key: 'silver',
    name: 'Silver Member',
    shortName: 'Silver',
    subtitle: 'Silver',
    styleLabel: 'Metallic shine and subtle glow',
    gradient: 'linear-gradient(135deg, #F5F7FA 0%, #E8EAF0 35%, #C9D0DC 70%, #A9B1C2 100%)',
    border: 'border-[#CAD1DF]',
    shadow: 'shadow-[0_16px_34px_rgba(169,177,194,0.35)]',
    isDark: false,
    textPrimary: 'text-[#0F172A]',
    textSecondary: 'text-[#334155]',
    textMuted: 'text-[#64748B]',
    chipType: 'silver',
    passBadge: 'SILVER PASS',
    badgeBg: 'bg-white/80 text-[#0F172A] border-white shadow-sm',
    progressBg: 'bg-[#CBD5E1]',
    progressFill: 'bg-[#0F172A]',
    accentGlow: 'rgba(201,208,220,0.6)',
    accentColor: '#0F172A',
    defaultPoints: 500,
    icon: Award,
    benefits: ['1.1x Points multiplier', 'Silver monthly gift voucher', 'Priority customer support', 'Early access to sales'],
  },
  gold: {
    level: 3,
    key: 'gold',
    name: 'Gold Member',
    shortName: 'Gold',
    subtitle: 'Gold',
    styleLabel: 'Golden glow and elegant highlights',
    gradient: 'linear-gradient(135deg, #FFF0A8 0%, #FFD76A 32%, #E5A800 68%, #D99000 100%)',
    border: 'border-[#FFE67A]/90',
    shadow: 'shadow-[0_16px_36px_rgba(217,144,0,0.32)]',
    isDark: false,
    textPrimary: 'text-[#2B1B00]',
    textSecondary: 'text-[#4E3100]',
    textMuted: 'text-[#7C5500]',
    chipType: 'gold',
    passBadge: 'GOLD PASS',
    badgeBg: 'bg-[#2B1B00]/15 text-[#2B1B00] border-[#2B1B00]/25',
    progressBg: 'bg-[#2B1B00]/20',
    progressFill: 'bg-[#2B1B00]',
    accentGlow: 'rgba(255,215,106,0.6)',
    accentColor: '#D99000',
    defaultPoints: 1500,
    icon: Crown,
    benefits: ['1.25x Points multiplier', 'Birthday bonus reward (300 pts)', 'Free shipping voucher monthly', 'Exclusive Gold flash deals'],
  },
  platinum: {
    level: 4,
    key: 'platinum',
    name: 'Platinum Member',
    shortName: 'Platinum',
    subtitle: 'Platinum',
    styleLabel: 'Premium dark metallic',
    gradient: 'linear-gradient(135deg, #3A537A 0%, #263A57 40%, #16243A 75%, #101B30 100%)',
    border: 'border-[#4A6B99]/70',
    shadow: 'shadow-[0_18px_40px_rgba(16,27,48,0.45)]',
    isDark: true,
    textPrimary: 'text-white',
    textSecondary: 'text-slate-200',
    textMuted: 'text-slate-400',
    chipType: 'silver',
    passBadge: 'PLATINUM PASS',
    badgeBg: 'bg-white/15 text-white border-white/25',
    progressBg: 'bg-white/20',
    progressFill: 'bg-cyan-400',
    accentGlow: 'rgba(56,189,248,0.35)',
    accentColor: '#38BDF8',
    defaultPoints: 3000,
    icon: Sparkles,
    benefits: ['1.5x Points multiplier', 'Free express shipping on all orders', 'Dedicated VIP hotline', 'Platinum secret sales'],
  },
  diamond: {
    level: 5,
    key: 'diamond',
    name: 'Diamond Member',
    shortName: 'Diamond',
    subtitle: 'Diamond',
    styleLabel: 'Crystal reflections and diamond sparkle',
    gradient: 'linear-gradient(135deg, #38A4FF 0%, #168BFF 35%, #0A55D6 70%, #063AAB 100%)',
    border: 'border-sky-300/60',
    shadow: 'shadow-[0_18px_42px_rgba(6,58,171,0.45)]',
    isDark: true,
    textPrimary: 'text-white',
    textSecondary: 'text-sky-100',
    textMuted: 'text-sky-200/80',
    chipType: 'silver',
    passBadge: 'DIAMOND PASS',
    badgeBg: 'bg-white/20 text-white border-white/35 backdrop-blur-sm',
    progressBg: 'bg-white/20',
    progressFill: 'bg-white',
    accentGlow: 'rgba(56,189,248,0.5)',
    accentColor: '#38BDF8',
    defaultPoints: 6000,
    icon: Sparkles,
    benefits: ['1.75x Points multiplier', 'Diamond luxury gift box annually', 'Zero fee returns & exchanges', 'Invitations to private launch events'],
  },
  vip: {
    level: 6,
    key: 'vip',
    name: 'VIP Member',
    shortName: 'VIP',
    subtitle: 'VIP',
    styleLabel: 'Purple glow with gold accents',
    gradient: 'linear-gradient(135deg, #C25EFF 0%, #A52BFF 35%, #6E12B8 75%, #4B087E 100%)',
    border: 'border-[#C084FC]/60',
    shadow: 'shadow-[0_18px_44px_rgba(75,8,126,0.48)]',
    isDark: true,
    textPrimary: 'text-white',
    textSecondary: 'text-purple-100',
    textMuted: 'text-purple-200/80',
    chipType: 'gold',
    passBadge: 'VIP PASS',
    badgeBg: 'bg-[#FDE047]/20 text-[#FEF08A] border-[#FDE047]/40 backdrop-blur-sm',
    progressBg: 'bg-white/20',
    progressFill: 'bg-[#FDE047]',
    accentGlow: 'rgba(165,43,255,0.55)',
    accentColor: '#FDE047',
    defaultPoints: 10000,
    icon: Crown,
    benefits: ['2.0x Points multiplier', 'Gold VIP concierge service', 'Surprise birthday luxury gift', 'Free same-day rush delivery'],
  },
  elite: {
    level: 7,
    key: 'elite',
    name: 'Elite Member',
    shortName: 'Elite',
    subtitle: 'Elite',
    styleLabel: 'Black luxury with bronze borders',
    gradient: 'linear-gradient(135deg, #3A3430 0%, #35302D 35%, #1C1917 72%, #090909 100%)',
    border: 'border-[#C59B6D]/80 ring-1 ring-[#C59B6D]/30',
    shadow: 'shadow-[0_20px_46px_rgba(0,0,0,0.65)]',
    isDark: true,
    textPrimary: 'text-[#F5E6D3]',
    textSecondary: 'text-[#E2CBB7]',
    textMuted: 'text-[#B89F88]',
    chipType: 'bronze',
    passBadge: 'ELITE PASS',
    badgeBg: 'bg-[#C59B6D]/25 text-[#F5E6D3] border-[#C59B6D]/50 backdrop-blur-sm',
    progressBg: 'bg-white/15',
    progressFill: 'bg-[#C59B6D]',
    accentGlow: 'rgba(197,155,109,0.45)',
    accentColor: '#C59B6D',
    defaultPoints: 20000,
    icon: Star,
    benefits: ['2.5x Points multiplier', 'Bronze-gilded membership package', 'Personal fashion & shopping advisor', 'Complimentary VIP store events'],
  },
  royal: {
    level: 8,
    key: 'royal',
    name: 'Royal Member',
    shortName: 'Royal',
    subtitle: 'Highest Tier',
    styleLabel: 'Royal velvet, golden glow and crown details',
    gradient: 'linear-gradient(135deg, #9615EC 0%, #7900C9 35%, #4C007E 70%, #260044 100%)',
    border: 'border-[#F59E0B]/90 ring-1 ring-[#F59E0B]/40',
    shadow: 'shadow-[0_22px_48px_rgba(38,0,68,0.65)]',
    isDark: true,
    textPrimary: 'text-[#FFF2C2]',
    textSecondary: 'text-[#FDE68A]',
    textMuted: 'text-[#E9D5FF]/80',
    chipType: 'gold',
    passBadge: 'ROYAL PASS',
    badgeBg: 'bg-gradient-to-r from-amber-400/25 to-yellow-300/20 text-[#FFF2C2] border-amber-300/60 backdrop-blur-sm',
    progressBg: 'bg-white/20',
    progressFill: 'bg-gradient-to-r from-amber-300 to-yellow-400',
    accentGlow: 'rgba(245,158,11,0.6)',
    accentColor: '#F59E0B',
    defaultPoints: 50000,
    icon: Crown,
    benefits: ['3.0x Maximum points multiplier', 'Exclusive Royal 24/7 personal manager', 'Custom luxury gifts & unreleased products', 'Unlimited free nationwide priority shipping'],
  },
}

export function getTierConfig(tierKey) {
  if (!tierKey) return MEMBERSHIP_TIER_CONFIG.classic
  const normalized = String(tierKey).trim().toLowerCase()
  return MEMBERSHIP_TIER_CONFIG[normalized] || MEMBERSHIP_TIER_CONFIG.classic
}

/**
 * Realistic EMV Microchip
 */
function EmvChip({ type = 'gold' }) {
  if (type === 'silver') {
    return (
      <div className="relative h-7 w-9 sm:h-8 sm:w-11 md:h-9 md:w-12 lg:h-10 lg:w-14 rounded-[5px] sm:rounded-[6px] overflow-hidden border border-slate-300/90 bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 p-[1.5px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.12)] shrink-0">
        <div className="h-full w-full rounded-[3px] border border-slate-400/60 flex flex-col justify-between p-[1.5px] bg-gradient-to-tr from-slate-200/50 to-white/40">
          <div className="flex justify-between h-[30%]">
            <div className="w-[32%] border-r border-b border-slate-500/40 rounded-br-[1.5px]" />
            <div className="w-[32%] border-l border-b border-slate-500/40 rounded-bl-[1.5px]" />
          </div>
          <div className="h-[26%] border-t border-b border-slate-500/40" />
          <div className="flex justify-between h-[30%]">
            <div className="w-[32%] border-r border-t border-slate-500/40 rounded-tr-[1.5px]" />
            <div className="w-[32%] border-l border-t border-slate-500/40 rounded-tl-[1.5px]" />
          </div>
        </div>
      </div>
    )
  }

  if (type === 'bronze') {
    return (
      <div className="relative h-7 w-9 sm:h-8 sm:w-11 md:h-9 md:w-12 lg:h-10 lg:w-14 rounded-[5px] sm:rounded-[6px] overflow-hidden border border-[#B88746]/90 bg-gradient-to-br from-[#E2B078] via-[#C59052] to-[#8C5E28] p-[1.5px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_5px_rgba(0,0,0,0.3)] shrink-0">
        <div className="h-full w-full rounded-[3px] border border-[#7A4B17]/60 flex flex-col justify-between p-[1.5px] bg-gradient-to-tr from-[#C59052]/40 to-white/30">
          <div className="flex justify-between h-[30%]">
            <div className="w-[32%] border-r border-b border-[#5E360D]/50 rounded-br-[1.5px]" />
            <div className="w-[32%] border-l border-b border-[#5E360D]/50 rounded-bl-[1.5px]" />
          </div>
          <div className="h-[26%] border-t border-b border-[#5E360D]/50" />
          <div className="flex justify-between h-[30%]">
            <div className="w-[32%] border-r border-t border-[#5E360D]/50 rounded-tr-[1.5px]" />
            <div className="w-[32%] border-l border-t border-[#5E360D]/50 rounded-tl-[1.5px]" />
          </div>
        </div>
      </div>
    )
  }

  // Gold chip
  return (
    <div className="relative h-7 w-9 sm:h-8 sm:w-11 md:h-9 md:w-12 lg:h-10 lg:w-14 rounded-[5px] sm:rounded-[6px] overflow-hidden border border-amber-400/90 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 p-[1.5px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.2)] shrink-0">
      <div className="h-full w-full rounded-[3px] border border-amber-600/60 flex flex-col justify-between p-[1.5px] bg-gradient-to-tr from-amber-300/40 to-white/40">
        <div className="flex justify-between h-[30%]">
          <div className="w-[32%] border-r border-b border-amber-800/50 rounded-br-[1.5px]" />
          <div className="w-[32%] border-l border-b border-amber-800/50 rounded-bl-[1.5px]" />
        </div>
        <div className="h-[26%] border-t border-b border-amber-800/50" />
        <div className="flex justify-between h-[30%]">
          <div className="w-[32%] border-r border-t border-amber-800/50 rounded-tr-[1.5px]" />
          <div className="w-[32%] border-l border-t border-amber-800/50 rounded-tl-[1.5px]" />
        </div>
      </div>
    </div>
  )
}

/**
 * Contactless NFC symbol
 */
function ContactlessIcon({ className = 'text-current opacity-70' }) {
  return (
    <svg className={cn('h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 rotate-90', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M7 17a6 6 0 0 1 0-10" />
      <path d="M11 19a9 9 0 0 1 0-14" />
      <path d="M15 21a12 12 0 0 1 0-18" />
    </svg>
  )
}

/**
 * Luxury Brand Card Badge (Replaces Visa with authentic Shadow Pass branding)
 */
function CardBrandBadge({ passBadge = 'MEMBER PASS', isDark = false }) {
  return (
    <div className="flex flex-col items-end leading-none select-none">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Crown size={15} className={cn('shrink-0 sm:scale-110 md:scale-125', isDark ? 'text-amber-400' : 'text-amber-600')} />
        <span
          className={cn(
            'text-xs sm:text-sm md:text-base lg:text-lg font-black tracking-widest uppercase font-sans',
            isDark ? 'text-white' : 'text-[#1E293B]'
          )}
        >
          SHADOW
        </span>
      </div>
      <span
        className={cn(
          'mt-1 text-[8px] sm:text-[10px] md:text-xs font-black tracking-[0.24em] uppercase',
          isDark ? 'text-white/75' : 'text-slate-600'
        )}
      >
        {passBadge}
      </span>
    </div>
  )
}

/**
 * Main Membership Credit Card Component
 */
export default function MembershipVisaCard({
  tier = 'classic',
  memberName = 'VALUED MEMBER',
  cardNumber,
  memberId,
  points = 0,
  nextTierPoints,
  nextTierName,
  pointsToNext = 0,
  progressPct = 0,
  isCurrent = false,
  isUnlocked = true,
  pointsNeeded = 0,
  showStatus = true,
  showProgress = false,
  interactive = false,
  onClick,
  actionButton,
  className,
}) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const config = getTierConfig(tier)

  const formattedCardNumber = useMemo(() => {
    if (cardNumber) return cardNumber
    const joinYear = user?.date_joined
      ? new Date(user.date_joined).getFullYear()
      : (user?.created_at ? new Date(user.created_at).getFullYear() : 2026)
    const effectiveId = memberId ?? user?.id ?? 42
    const paddedId = String(effectiveId).padStart(4, '0')
    return `MEMBER NO. SHDW-${joinYear}-${paddedId}`
  }, [cardNumber, memberId, user?.id, user?.date_joined, user?.created_at])

  const translatedTierName = t(`profile.tiers.${config.key}`, { defaultValue: config.name })
  const translatedNextTier = nextTierName
    ? t(`profile.tiers.${nextTierName.toLowerCase()}`, { defaultValue: nextTierName })
    : ''

  return (
    <div className={cn('w-full space-y-3.5', className)}>
      {/* Top Progress Frame (Cut from bottom with clean gap) */}
      {showProgress && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs sm:text-sm md:text-base font-bold text-gray-700 mb-2 sm:mb-2.5">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <span>{t('rewardsPage.nextLevel', 'Next level:')}</span>{' '}
              {nextTierName ? (
                <span className="font-black text-pink-600 underline decoration-pink-500/40">
                  {translatedNextTier}
                </span>
              ) : (
                <span className="font-black text-gray-950">
                  {t('profile.maxTierReached', 'Top Tier Achieved')}
                </span>
              )}
            </span>
            <span className="font-mono font-black text-pink-600">
              {pointsToNext > 0
                ? t('rewardsPage.ptsMore', { count: pointsToNext.toLocaleString() })
                : t('profile.topTier', 'Maximum privileges')}
            </span>
          </div>
          <div className="h-2 sm:h-2.5 md:h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-[#EC3F8F] transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
        </div>
      )}

      {/* The Physical Membership Card */}
      <div
        onClick={interactive ? onClick : undefined}
        className={cn(
          'group relative w-full overflow-hidden rounded-[20px] sm:rounded-[24px] border p-4 sm:p-6 md:p-8 transition-all duration-300 min-h-[190px] sm:min-h-[230px] md:min-h-[270px] lg:min-h-[300px] flex flex-col justify-between',
          config.border,
          config.shadow,
          interactive && 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl active:scale-[0.99]'
        )}
        style={{
          background: config.gradient,
        }}
      >
      {/* ── Background Luxury Specular Lighting ── */}
      <div
        className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full blur-2xl transition duration-500 group-hover:scale-110"
        style={{
          background: `radial-gradient(circle, ${config.accentGlow} 0%, transparent 70%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/0 via-white/10 to-transparent mix-blend-overlay" />
      <div className="pointer-events-none absolute -right-12 -bottom-12 h-44 w-44 rounded-full border border-current opacity-[0.06]" />

      {/* Top Header: Brand Name, Tier Badge & Contactless */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div
            className={cn(
              'flex h-10 w-10 sm:h-13 sm:w-13 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-full p-1.5 sm:p-2.5 shadow-md transition-transform duration-300 group-hover:scale-105',
              config.isDark
                ? 'bg-gradient-to-br from-white/20 via-white/10 to-white/5 border border-white/30 backdrop-blur-md'
                : 'bg-gradient-to-br from-white via-slate-50 to-slate-200 border border-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            )}
          >
            <img
              src={getMemberTierImage(config.key)}
              alt={config.shortName}
              className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={cn('text-xs sm:text-base md:text-xl font-black tracking-wider uppercase', config.textPrimary)}>
                SHADOW SHOP
              </span>
            </div>
            <p className={cn('text-[10px] sm:text-xs md:text-sm lg:text-base font-bold tracking-wider uppercase opacity-75', config.textMuted)}>
              {config.subtitle} • {t('rewardsPage.levelBadge', { level: config.level })}
            </p>
          </div>
        </div>

        {/* Right: Contactless & Unlock Status Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {showStatus && isCurrent && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 text-white px-2.5 sm:px-4 py-0.5 sm:py-1 text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider shadow-sm ring-1 ring-white/30">
              <Star size={12} fill="currentColor" />
              {t('rewardsPage.currentTier', 'Current Tier')}
            </span>
          )}
          {showStatus && !isCurrent && !isUnlocked && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 text-white px-2.5 sm:px-4 py-0.5 sm:py-1 text-[10px] sm:text-xs md:text-sm font-bold backdrop-blur-md">
              <Lock size={12} />
              {pointsNeeded > 0 ? t('rewardsPage.ptsToUnlock', { count: pointsNeeded.toLocaleString() }) : t('rewardsPage.locked', 'Locked')}
            </span>
          )}
          {showStatus && !isCurrent && isUnlocked && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-2.5 sm:px-4 py-0.5 sm:py-1 text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wider">
              <CheckCircle2 size={12} />
              {t('rewardsPage.unlocked', 'Unlocked')}
            </span>
          )}
          <ContactlessIcon className={cn('h-4 w-4 sm:h-6 sm:w-6 md:h-7 md:w-7', config.textPrimary)} />
        </div>
      </div>

      {/* Middle Row: EMV Chip + Tier Badge Emblem */}
      <div className="relative z-10 my-auto py-3 sm:py-4 md:py-6 flex items-center justify-between">
        <EmvChip type={config.chipType} />

        <div className={cn('rounded-full px-3.5 sm:px-5 py-1 sm:py-2 border text-xs sm:text-sm md:text-base font-black tracking-wide flex items-center gap-2 shadow-sm', config.badgeBg)}>
          <config.icon size={16} className="shrink-0" />
          <span>{translatedTierName}</span>
        </div>
      </div>

      {/* Clean Member ID */}
      <div className="relative z-10 mb-2 sm:mb-3 md:mb-4">
        <p
          className={cn(
            'font-mono text-xs sm:text-lg md:text-2xl lg:text-3xl font-black tracking-[0.08em] sm:tracking-[0.14em] md:tracking-[0.18em] uppercase select-all',
            config.textPrimary,
            config.isDark ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]' : 'drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
          )}
        >
          {formattedCardNumber}
        </p>
      </div>

      {/* Bottom Row: Cardholder Name, Points Balance & Brand Badge */}
      <div className="relative z-10 flex items-end justify-between gap-3 pt-2 sm:pt-3 md:pt-4 border-t border-current/10">
        {/* Left: Cardholder Info */}
        <div className="min-w-0">
          <p className={cn('text-[9px] sm:text-[11px] md:text-xs lg:text-sm font-black tracking-widest uppercase opacity-70', config.textPrimary)}>
            CARDHOLDER
          </p>
          <p className={cn('truncate text-xs sm:text-base md:text-xl font-black tracking-wide uppercase', config.textPrimary)}>
            {memberName || 'VALUED MEMBER'}
          </p>
        </div>

        {/* Center: Points Balance */}
        <div className="text-center px-1">
          <p className={cn('text-[9px] sm:text-[11px] md:text-xs lg:text-sm font-black tracking-widest uppercase opacity-70 mb-0.5', config.textPrimary)}>
            {t('rewardsPage.yourPoints', 'YOUR POINTS')}
          </p>
          <div className={cn('inline-flex items-baseline justify-center gap-1 leading-none', config.textPrimary)}>
            <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black font-mono tracking-tight drop-shadow-xs">
              {Number(points || 0).toLocaleString()}
            </span>
            <span className="text-[10px] sm:text-xs md:text-sm font-black uppercase opacity-75">
              PTS
            </span>
          </div>
        </div>

        {/* Right: Shadow Pass Brand Badge (No Visa!) */}
        <CardBrandBadge
          passBadge={config.passBadge}
          isDark={config.isDark}
        />
      </div>

      {/* Optional Action Button */}
      {actionButton && (
        <div className="relative z-10 mt-3 pt-2">
          {actionButton}
        </div>
      )}
    </div>
  </div>
  )
}
