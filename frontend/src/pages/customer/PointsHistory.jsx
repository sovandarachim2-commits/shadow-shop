import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck, ChevronLeft, Edit3, Gift, HelpCircle, Loader2,
  ShoppingBag, Star, Ticket, UserPlus,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { cn } from '@/utils/helpers'

const FILTER_KEYS = ['all', 'earned', 'used', 'expired']

function transactionMeta(item, t) {
  const note = (item.note || '').toLowerCase()
  if (item.order_number) return { icon: ShoppingBag, title: t('rewardsPage.history.orderNumber', { number: item.order_number }), tone: 'bg-emerald-50 text-emerald-600' }
  if (note.includes('check-in')) return { icon: CalendarCheck, title: t('rewardsPage.history.dailyCheckin'), tone: 'bg-emerald-50 text-emerald-600' }
  if (note.includes('review')) return { icon: Edit3, title: t('rewardsPage.history.writeReview'), tone: 'bg-emerald-50 text-emerald-600' }
  if (note.includes('referral') || note.includes('friend')) return { icon: UserPlus, title: t('rewardsPage.history.referralBonus'), tone: 'bg-pink-50 text-pink-600' }
  if (note.includes('birthday')) return { icon: Gift, title: t('rewardsPage.history.birthdayBonus'), tone: 'bg-amber-50 text-amber-600' }
  if (Number(item.points) < 0) return { icon: Ticket, title: item.note || t('rewardsPage.history.rewardRedeemed'), tone: 'bg-violet-50 text-violet-600' }
  return { icon: Star, title: item.note || t('rewardsPage.history.pointsEarned'), tone: 'bg-pink-50 text-pink-600' }
}

function formatTransactionDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatTransactionTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export default function PointsHistory() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState('all')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
  })
  const { data: historyData, isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: ['customer-points-history'],
    queryFn: () => ordersApi.rewards.history().then((response) => response.data),
  })

  const transactions = historyData || []
  const filteredTransactions = useMemo(() => {
    const now = Date.now()
    return transactions.filter((item) => {
      const expired = Number(item.points) > 0 && item.expires_at && new Date(item.expires_at).getTime() < now
      if (activeFilter === 'earned') return Number(item.points) > 0 && !expired
      if (activeFilter === 'used') return Number(item.points) < 0
      if (activeFilter === 'expired') return expired
      return true
    })
  }, [activeFilter, transactions])

  if ((isLoading && !data) || (historyLoading && !historyData)) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 size={26} className="animate-spin text-pink-600" /></div>
  if (isError || historyError) return <div className="py-20 text-center text-sm font-bold text-gray-500">{t('rewardsPage.pointsLoadError')}</div>

  const points = data?.current_points || 0
  const memberLevel = data?.member_level || 'Silver'
  const nextLevel = memberLevel === 'Silver' ? 'Gold' : 'Platinum'
  const nextTierPoints = data?.next_tier_points || points
  const pointsToNext = data?.points_to_next_level || 0
  const progress = Math.min(100, data?.progress_pct || 0)

  const filterLabel = activeFilter === 'all' ? '' : ` ${t(`rewardsPage.filter.${activeFilter}`).toLowerCase()} `

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="mx-auto w-full max-w-[560px] px-4 md:max-w-[1440px] md:px-6 md:pt-6">
        <header className="sticky top-0 z-30 -mx-4 grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:mx-0 md:mb-4 md:flex md:min-h-0 md:items-start md:justify-between md:bg-transparent md:px-0 md:pt-0">
          <button type="button" onClick={() => navigate('/profile/rewards')} className="flex h-10 w-10 items-center justify-center md:hidden"><ChevronLeft size={23} /></button>
          <div className="min-w-0 text-center md:text-left">
            <h1 className="text-lg font-black text-gray-950 md:text-2xl">{t('rewardsPage.history.title')}</h1>
            <p className="mt-1 hidden text-xs font-semibold text-gray-500 md:block">{t('rewardsPage.history.subtitle')}</p>
          </div>
          <button type="button" className="flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-pink-600"><HelpCircle size={21} /></button>
        </header>

        <section className="relative mt-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-pink-500 via-[#EC3F8F] to-pink-800 p-4 text-white shadow-[0_14px_32px_rgba(236,63,143,0.22)] md:mt-0 md:p-6">
          <p className="text-sm font-bold text-white/90">{t('rewardsPage.yourPoints')}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 ring-[3px] ring-white/30"><Star size={22} fill="currentColor" /></span>
            <span className="text-[32px] font-black leading-none">{points.toLocaleString()}</span>
            <span className="self-end pb-0.5 text-sm font-black">{t('rewardsPage.pts')}</span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/75 px-3 py-1.5 text-sm font-black text-gray-950">
            <Star size={14} fill="currentColor" className="text-gray-400" /> {t('profile.memberLevel', { level: memberLevel })}
          </div>
          <div className="mt-5 flex justify-between gap-3 text-xs font-black">
            <span>{t('rewardsPage.nextLevel')} <span className="text-yellow-300">{t('profile.memberLevel', { level: nextLevel })}</span></span>
            <span>{t('rewardsPage.ptsMore', { count: pointsToNext.toLocaleString() })}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-yellow-300" style={{ width: `${progress}%` }} /></div>
          <p className="mt-3 text-sm font-black">{t('rewardsPage.ptsProgress', { current: points.toLocaleString(), total: nextTierPoints.toLocaleString() })}</p>
        </section>

        <h2 className="mb-3 mt-6 text-lg font-black text-gray-950">{t('rewardsPage.history.howYouEarn')}</h2>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key)}
              className={cn(
                'shrink-0 rounded-xl border px-4 py-2 text-xs font-black',
                activeFilter === key ? 'border-pink-600 bg-pink-600 text-white' : 'border-gray-200 bg-white text-gray-500'
              )}
            >
              {t(`rewardsPage.filter.${key}`)}
            </button>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {filteredTransactions.map((item) => {
            const meta = transactionMeta(item, t)
            const Icon = meta.icon
            const pointsValue = Number(item.points)
            const expired = pointsValue > 0 && item.expires_at && new Date(item.expires_at).getTime() < Date.now()
            return (
              <div key={item.id} className="flex min-h-[76px] items-center gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', meta.tone)}><Icon size={20} /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-black text-gray-950">{meta.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-gray-500">{formatTransactionDate(item.created_at)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn('text-sm font-black', expired ? 'text-gray-400' : pointsValue >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                    {pointsValue > 0 ? '+' : ''}{pointsValue.toLocaleString()} {t('rewardsPage.pts')}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-gray-400">{expired ? t('rewardsPage.filter.expired') : formatTransactionTime(item.created_at)}</p>
                </div>
              </div>
            )
          })}
          {filteredTransactions.length === 0 && (
            <div className="py-14 text-center">
              <Star size={30} className="mx-auto text-gray-200" />
              <p className="mt-3 text-sm font-black text-gray-500">{t('rewardsPage.history.noActivity', { filter: filterLabel })}</p>
            </div>
          )}
        </section>

        <section className="mt-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 p-4">
          <div>
            <h2 className="text-sm font-black text-gray-950">{t('rewardsPage.history.keepEarning')}</h2>
            <p className="mt-1 text-xs font-semibold text-gray-600">{t('rewardsPage.history.keepEarningDesc')}</p>
            <button type="button" onClick={() => navigate('/profile/rewards/redeem')} className="mt-3 rounded-lg bg-pink-600 px-4 py-2 text-xs font-black text-white">{t('rewardsPage.history.exploreRewards')}</button>
          </div>
          <Gift size={58} className="text-pink-500" />
        </section>
      </div>
    </div>
  )
}
