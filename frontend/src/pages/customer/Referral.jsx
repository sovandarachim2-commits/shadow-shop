import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, Copy, Share2, Users, Gift, Star, 
  CheckCircle2, Loader2, Info, ArrowRight,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { cn } from '@/utils/helpers'

export default function Referral() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then(res => res.data),
  })

  const { data: summary, isLoading } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then(res => res.data),
  })

  const referralCode = user?.referral_code || ''
  const referralLink = `${window.location.origin}/login?mode=register&ref=${referralCode}`
  const referralBonus = summary?.earning_rules?.referral_bonus || 100

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      setCopiedCode(true)
      toast.success(t('rewardsPage.toast.linkCopied'))
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (err) {
      toast.error('Could not copy code')
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      toast.success(t('rewardsPage.toast.linkCopied'))
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      toast.error('Could not copy link')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin text-pink-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      <div className="mx-auto w-full max-w-[1500px] px-5 pt-6 md:px-6">
        {/* Page Header */}
        <header className="mb-6 flex items-center gap-4">
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-slate-950 md:text-[28px]">{t('rewardsPage.referral.heroTitle')}</h1>
            <p className="text-sm font-semibold text-slate-500">{t('rewardsPage.referral.subtitle')}</p>
          </div>
        </header>

        {/* Main Referral Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,420px]">
          {/* Left Column — Referral Card */}
          <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                  <Share2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">{t('rewardsPage.referral.yourCode')}</h3>
                  <p className="text-sm font-semibold text-slate-500">{t('rewardsPage.referral.yourCodeSubtitle')}</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-2 pl-6 ring-1 ring-slate-200/60">
                <span className="text-2xl font-black tracking-[0.2em] text-slate-900">
                  {referralCode || '-------'}
                </span>
                <button
                  onClick={handleCopyCode}
                  className={cn(
                    "flex h-12 px-8 items-center gap-2 rounded-xl text-[13px] font-black transition-all duration-300 shadow-sm",
                    copiedCode ? "bg-emerald-500 text-white" : "bg-pink-600 text-white hover:bg-pink-700 active:scale-95"
                  )}
                >
                  {copiedCode ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copiedCode ? "Copied" : t('rewardsPage.referral.copy')}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950">{t('rewardsPage.referral.yourLink')}</h3>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-2 pl-6 ring-1 ring-slate-200/60">
                <span className="truncate text-sm font-bold text-slate-600">
                  {referralLink}
                </span>
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    "flex h-10 px-6 items-center gap-2 rounded-xl text-[13px] font-black transition-all duration-300",
                    copiedLink ? "bg-emerald-500 text-white" : "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 active:scale-95"
                  )}
                >
                  {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedLink ? "Copied" : t('rewardsPage.referral.copy')}
                </button>
              </div>
            </div>
          </section>

          {/* Right Column — Stats Card */}
          <section className="flex flex-col rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                  <Star size={18} />
                </div>
                <h3 className="text-lg font-black text-slate-950">{t('rewardsPage.referral.statsTitle')}</h3>
              </div>
              <button 
                onClick={() => navigate('/points-history')}
                className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400 transition hover:text-pink-600"
              >
                {t('rewardsPage.referral.viewAll')}
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              {[
                { label: t('rewardsPage.referral.friendsInvited'), value: user?.referrals_count || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: t('rewardsPage.referral.successfulReferrals'), value: user?.successful_referrals_count || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: t('rewardsPage.referral.pointsEarned'), value: (user?.successful_referrals_count || 0) * referralBonus, icon: Star, color: 'text-pink-600', bg: 'bg-pink-50' },
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center text-center min-w-0">
                  <div className={cn("mb-2 flex h-10 w-10 items-center justify-center rounded-2xl shrink-0", stat.bg)}>
                    <stat.icon size={16} className={stat.color} />
                  </div>
                  <p className="text-lg font-black text-slate-900 truncate w-full">{stat.value.toLocaleString()}</p>
                  <p className="text-[9px] font-black uppercase tracking-tight text-slate-400 break-words w-full line-clamp-2 leading-tight h-[24px]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-1 items-start gap-4 rounded-2xl bg-pink-50 p-5 ring-1 ring-pink-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-600 shadow-sm">
                <Gift size={20} />
              </div>
              <div>
                <h4 className="text-[13px] font-black text-slate-950 text-slate-900 leading-none">{t('rewardsPage.referral.rewardMessage')}</h4>
                <p className="mt-2 text-[12px] font-semibold text-slate-500 leading-snug">
                  {t('rewardsPage.referral.rewardMessageDesc')}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* How It Works */}
        <section className="mt-8 rounded-[20px] border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="mb-12 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
              <Info size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950">{t('rewardsPage.referral.howItWorks')}</h3>
              <p className="text-sm font-semibold text-slate-500">{t('rewardsPage.referral.howItWorksSubtitle')}</p>
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {[
              { 
                icon: Share2, 
                title: t('rewardsPage.referral.step1Title'), 
                desc: t('rewardsPage.referral.step1Desc') 
              },
              { 
                icon: Users, 
                title: t('rewardsPage.referral.step2Title'), 
                desc: t('rewardsPage.referral.step2Desc') 
              },
              { 
                icon: Gift, 
                title: t('rewardsPage.referral.step3Title'), 
                desc: t('rewardsPage.referral.step3Desc') 
              },
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition-all duration-300 hover:ring-pink-200 hover:bg-white hover:shadow-md group">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-xs font-black text-white shadow-lg shadow-pink-200 ring-4 ring-white">
                    {i + 1}
                  </span>
                  <step.icon size={28} className="transition-colors duration-300 group-hover:text-pink-600" />
                </div>
                <h4 className="text-base font-black text-slate-950">{step.title}</h4>
                <p className="mt-3 text-[14px] font-semibold text-slate-500 leading-relaxed px-4">
                  {step.desc}
                </p>
                
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 text-slate-200">
                    <ArrowRight size={24} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Important Note */}
        <section className="mt-8 rounded-2xl bg-blue-50 p-5 ring-1 ring-blue-100/50">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-500 shadow-sm">
              <Info size={20} />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-[0.15em] text-blue-900">
                {t('rewardsPage.referral.noteTitle')}
              </h4>
              <p className="mt-1.5 text-[13px] font-semibold text-blue-800/70 leading-relaxed">
                {t('rewardsPage.referral.noteDesc')}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

