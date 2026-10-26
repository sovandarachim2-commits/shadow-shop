import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, Copy, Share2, Users, Gift, Star,
  CheckCircle2, Loader2, Info, X,
  ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { cn } from '@/utils/helpers'

function copyWithTextarea(text) {
  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.top = '0'
  input.style.left = '0'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.focus()
  input.select()
  input.setSelectionRange(0, text.length)
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  document.body.removeChild(input)
  return copied
}

async function copyText(value) {
  const text = String(value || '')
  if (!text) return false
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return copyWithTextarea(text)
    }
  }
  return copyWithTextarea(text)
}

function getReferralErrorMessage(error, fallback) {
  const data = error?.response?.data
  const fieldError = data?.friend_referral_code
  const message = Array.isArray(fieldError) ? fieldError[0] : fieldError
  if (typeof message === 'string' && message.trim()) return message
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail
  return fallback
}

export default function Referral() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [friendReferralCode, setFriendReferralCode] = useState('')
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me().then(res => res.data),
  })

  const saveFriendCode = useMutation({
    mutationFn: (code) => authApi.updateMe({ friend_referral_code: code }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(['me'], data)
      toast.success(t('rewardsPage.referral.friendCodeSaved'))
      setFriendReferralCode('')
    },
    onError: (error) => {
      toast.error(getReferralErrorMessage(error, t('rewardsPage.referral.friendCodeSaveFailed')))
    },
  })

  const { data: summary, isLoading } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then(res => res.data),
  })

  const referralCode = user?.referral_code || ''
  const referralLink = `${window.location.origin}/login?mode=register&ref=${referralCode}`
  const referralBonus = summary?.earning_rules?.referral_bonus || 100

  const handleCopyCode = async () => {
    const copied = await copyText(referralCode)
    if (!copied) {
      toast.error(t('rewardsPage.toast.copyFailed'), { id: 'referral-copy' })
      return
    }
    setCopiedCode(true)
    toast.success(t('rewardsPage.referral.copied'), { id: 'referral-copy' })
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleCopyLink = async () => {
    const copied = await copyText(referralLink)
    if (!copied) {
      toast.error(t('rewardsPage.toast.copyFailed'), { id: 'referral-copy' })
      return
    }
    setCopiedLink(true)
    toast.success(t('rewardsPage.referral.copied'), { id: 'referral-copy' })
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleSaveFriendCode = (event) => {
    event.preventDefault()
    const code = friendReferralCode.trim().toUpperCase()
    if (!code) return toast.error(t('rewardsPage.referral.friendCodeRequired'))
    saveFriendCode.mutate(code)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin text-pink-600" />
      </div>
    )
  }

  const stats = [
    { label: t('rewardsPage.referral.friendsInvited'), value: user?.referrals_count || 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: t('rewardsPage.referral.successfulReferrals'), value: user?.successful_referrals_count || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: t('rewardsPage.referral.pointsEarned'), value: (user?.successful_referrals_count || 0) * referralBonus, icon: Star, color: 'text-pink-600', bg: 'bg-pink-50' },
  ]
  const steps = [
    { icon: Share2, title: t('rewardsPage.referral.step1Title'), desc: t('rewardsPage.referral.step1Desc') },
    { icon: Users, title: t('rewardsPage.referral.step2Title'), desc: t('rewardsPage.referral.step2Desc') },
    { icon: Gift, title: t('rewardsPage.referral.step3Title'), desc: t('rewardsPage.referral.step3Desc') },
  ]

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#f6f7f9] pb-[calc(11rem+env(safe-area-inset-bottom))] md:pb-10">
      <div className="w-full min-w-0 max-w-full px-4 pb-8 md:px-6 md:pt-6">
        <div className="-mx-4 mb-5 grid min-h-[64px] grid-cols-[44px_1fr_44px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:mx-0 md:mt-0 md:flex md:min-h-0 md:gap-3 md:border-0 md:px-0 md:pb-0 md:pt-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95 md:h-10 md:w-10 md:border md:border-gray-200 md:bg-white"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 text-center md:text-left">
            <h1 className="truncate text-base font-black tracking-tight text-gray-950 md:text-2xl">{t('rewardsPage.referral.heroTitle')}</h1>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowHowItWorks(true)}
              aria-label={t('rewardsPage.referral.howItWorks')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95 md:h-10 md:w-10 md:border md:border-gray-200 md:bg-white lg:hidden"
            >
              <Info size={20} />
            </button>
          </div>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <section className="min-w-0 max-w-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                <Share2 size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-6 text-slate-950">{t('rewardsPage.referral.yourCode')}</h2>
                <p className="text-sm font-medium leading-5 text-slate-500">{t('rewardsPage.referral.yourCodeSubtitle')}</p>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 items-center gap-2 overflow-hidden rounded-xl bg-slate-50 p-2 pl-3 ring-1 ring-slate-200/80 sm:pl-4">
              <span className="min-w-0 flex-1 truncate text-xl font-black tracking-[0.12em] text-slate-950 sm:text-2xl sm:tracking-[0.16em]">
                {referralCode || '-------'}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className={cn(
                  'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-4 text-base font-bold text-white transition active:scale-95',
                  copiedCode ? 'bg-emerald-500' : 'bg-[#EC197A] hover:bg-[#D9166F]'
                )}
              >
                {copiedCode ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                {copiedCode ? t('rewardsPage.referral.copied') : t('rewardsPage.referral.copy')}
              </button>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-pink-600">
                  <Gift size={16} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black leading-6 text-slate-950">{t('rewardsPage.referral.friendCodeTitle')}</h2>
                  <p className="text-sm font-medium leading-5 text-slate-500">{t('rewardsPage.referral.friendCodeSubtitle')}</p>
                </div>
              </div>
              {user?.referred_by ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">
                  <CheckCircle2 size={16} /> {t('rewardsPage.referral.friendCodeAlreadySaved')}
                </div>
              ) : (
                <form onSubmit={handleSaveFriendCode} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={friendReferralCode}
                    onChange={(event) => setFriendReferralCode(event.target.value.toUpperCase())}
                    placeholder={t('rewardsPage.referral.friendCodePlaceholder')}
                    maxLength={20}
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-semibold uppercase tracking-wider text-slate-900 outline-none placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
                  />
                  <button
                    type="submit"
                    disabled={saveFriendCode.isPending || !friendReferralCode.trim()}
                    className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#EC197A] px-4 text-base font-bold text-white transition hover:bg-[#D9166F] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
                  >
                    {saveFriendCode.isPending && <Loader2 size={15} className="animate-spin" />}
                    {t('rewardsPage.referral.saveFriendCode')}
                  </button>
                </form>
              )}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <h2 className="text-lg font-black leading-6 text-slate-950">{t('rewardsPage.referral.yourLink')}</h2>
              <div className="mt-2 flex min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:items-center">
                <span className="block w-full min-w-0 max-w-full truncate rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-600 ring-1 ring-slate-200/80">{referralLink}</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-sm font-bold transition active:scale-95 sm:h-10 sm:w-auto',
                    copiedLink ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50'
                  )}
                >
                  {copiedLink ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedLink ? t('rewardsPage.referral.copied') : t('rewardsPage.referral.copy')}
                </button>
              </div>
            </div>
          </section>

          <section className="min-w-0 max-w-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 md:p-5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-lg font-black leading-6 text-slate-950">{t('rewardsPage.referral.statsTitle')}</h2>
              <button
                type="button"
                onClick={() => navigate('/profile/rewards/history')}
                className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-pink-600"
              >
                {t('rewardsPage.referral.viewAll')}
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 text-left ring-1 ring-slate-100 sm:flex-col sm:px-2 sm:text-center">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:mx-auto', stat.bg)}>
                    <stat.icon size={16} className={stat.color} />
                  </div>
                  <div className="min-w-0 sm:w-full">
                    <p className="text-xl font-black leading-none text-slate-950 sm:text-2xl">{stat.value.toLocaleString()}</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-pink-50 px-3 py-3 ring-1 ring-pink-100">
              <p className="text-base font-black leading-6 text-slate-950">{t('rewardsPage.referral.rewardMessage')}</p>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{t('rewardsPage.referral.rewardMessageDesc')}</p>
            </div>
          </section>
        </div>

        <section className="mt-4 hidden min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 lg:block">
          <h2 className="text-lg font-black leading-6 text-slate-950">{t('rewardsPage.referral.howItWorks')}</h2>
          <p className="mt-0.5 text-sm font-medium leading-5 text-slate-500">{t('rewardsPage.referral.howItWorksSubtitle')}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {steps.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-pink-600 ring-1 ring-pink-100">
                  <step.icon size={16} />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EC197A] text-[10px] font-black text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black leading-6 text-slate-950">{step.title}</h3>
                  <p className="mt-0.5 text-sm font-medium leading-6 text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 flex min-w-0 items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/80">
          <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <div>
            <h2 className="text-base font-black leading-6 text-slate-950">{t('rewardsPage.referral.noteTitle')}</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{t('rewardsPage.referral.noteDesc')}</p>
          </div>
        </section>
      </div>

      {showHowItWorks && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-8 sm:p-4 lg:hidden" onClick={() => setShowHowItWorks(false)}>
          <div
            role="dialog"
            aria-labelledby="referral-how-title"
            className="max-h-[85vh] w-full max-w-[320px] overflow-y-auto rounded-2xl bg-white p-3.5 shadow-xl sm:max-w-lg sm:rounded-3xl sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="referral-how-title" className="text-base font-black leading-5 text-slate-950 sm:text-lg sm:leading-6">{t('rewardsPage.referral.howItWorks')}</h2>
                <p className="mt-0.5 text-xs font-medium leading-4 text-slate-500 sm:text-sm sm:leading-5">{t('rewardsPage.referral.howItWorksSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                aria-label="Close"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:h-9 sm:w-9"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-2.5 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100 sm:gap-3 sm:p-3">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-pink-600 ring-1 ring-pink-100 sm:h-10 sm:w-10 sm:rounded-xl">
                    <step.icon size={14} />
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#EC197A] text-[9px] font-black text-white sm:h-4 sm:w-4 sm:text-[10px]">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black leading-5 text-slate-950 sm:text-base sm:leading-6">{step.title}</h3>
                    <p className="mt-0.5 text-xs font-medium leading-4 text-slate-500 sm:text-sm sm:leading-6">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

