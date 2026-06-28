import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Cake, CalendarCheck, ChevronLeft, ChevronRight, Edit3, HelpCircle, Loader2,
  Share2, ShoppingBag, Star, UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'

function EarnRow({ icon: Icon, title, description, reward, action, actionLabel, disabled }) {
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
        <button type="button" onClick={action} disabled={disabled} className="min-w-[76px] rounded-lg border border-pink-500 px-3 py-2 text-xs font-black text-pink-600 disabled:border-gray-200 disabled:text-gray-400">
          {actionLabel}
        </button>
      ) : (
        <button type="button" onClick={action} className="flex h-9 w-9 items-center justify-center rounded-full text-pink-600">
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  )
}

export default function EarnPoints() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((response) => response.data),
  })

  const checkinMutation = useMutation({
    mutationFn: () => ordersApi.rewards.dailyCheckin().then((response) => response.data),
    onSuccess: (nextData) => {
      queryClient.setQueryData(['customer-rewards-summary'], nextData)
      toast.success('Daily check-in points added')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not check in'),
  })

  const shareStore = async () => {
    const shareData = { title: 'Shadow Shop', text: 'Shop with Shadow Shop', url: window.location.origin }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await navigator.clipboard.writeText(window.location.origin)
        toast.success('Store link copied')
      }
    } catch {
      // The user can cancel the native share sheet.
    }
  }

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 size={26} className="animate-spin text-pink-600" /></div>
  if (isError) return <div className="py-20 text-center text-sm font-bold text-gray-500">Earning information could not load.</div>

  const points = data?.current_points || 0
  const memberLevel = data?.member_level || 'Silver'
  const nextLevel = memberLevel === 'Silver' ? 'Gold' : 'Platinum'
  const nextTierPoints = data?.next_tier_points || points
  const pointsToNext = data?.points_to_next_level || 0
  const progress = Math.min(100, data?.progress_pct || 0)
  const rules = data?.earning_rules || {}
  const dailyEnabled = Number(rules.daily_checkin_bonus || 0) > 0

  return (
    <div className="min-h-screen bg-white pb-8">
      <div className="mx-auto w-full max-w-[560px] px-4 md:max-w-[1440px] md:px-6 md:pt-6">
        <header className="sticky top-0 z-30 -mx-4 grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:static md:mx-0 md:mb-4 md:flex md:min-h-0 md:items-start md:justify-between md:bg-transparent md:px-0 md:pt-0">
          <button type="button" onClick={() => navigate('/profile/rewards')} className="flex h-10 w-10 items-center justify-center md:hidden"><ChevronLeft size={23} /></button>
          <div className="min-w-0 text-center md:text-left">
            <h1 className="text-lg font-black text-gray-950 md:text-2xl">Earn Points</h1>
            <p className="mt-1 hidden text-xs font-semibold text-gray-500 md:block">Complete actions and orders to grow your rewards balance.</p>
          </div>
          <button type="button" className="flex h-10 w-10 items-center justify-center justify-self-end rounded-full text-pink-600"><HelpCircle size={21} /></button>
        </header>

        <section className="relative mt-3 overflow-hidden rounded-[20px] bg-gradient-to-br from-pink-500 via-[#EC3F8F] to-pink-800 p-4 text-white shadow-[0_14px_32px_rgba(236,63,143,0.22)] md:mt-0 md:p-6">
          <p className="text-sm font-bold text-white/90">Your Points</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 ring-[3px] ring-white/30"><Star size={22} fill="currentColor" /></span>
            <span className="text-[32px] font-black leading-none">{points.toLocaleString()}</span>
            <span className="self-end pb-0.5 text-sm font-black">pts</span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/75 px-3 py-1.5 text-sm font-black text-gray-950">
            <Star size={14} fill="currentColor" className="text-gray-400" /> {memberLevel} Member
          </div>
          <div className="mt-5 flex justify-between gap-3 text-xs font-black">
            <span>Next level: <span className="text-yellow-300">{nextLevel} Member</span></span>
            <span>{pointsToNext.toLocaleString()} pts more</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-yellow-300" style={{ width: `${progress}%` }} /></div>
          <p className="mt-3 text-sm font-black">{points.toLocaleString()} / {nextTierPoints.toLocaleString()} pts</p>
        </section>

        <h2 className="mb-3 mt-6 text-lg font-black text-gray-950">Ways to Earn Points</h2>
        <section className="grid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm lg:grid-cols-2">
          <EarnRow icon={ShoppingBag} title="Place an Order" description="Earn points for every completed paid order" reward={`1 USD = ${rules.points_per_dollar || 1} Point${Number(rules.points_per_dollar || 1) === 1 ? '' : 's'}`} action={() => navigate('/shop')} />
          <EarnRow icon={Edit3} title="Write a Review" description="Share your experience with purchased products" reward={rules.review_bonus ? `+${rules.review_bonus} Points` : 'Coming soon'} action={() => navigate('/my-orders')} />
          <EarnRow icon={UserPlus} title="Refer a Friend" description="Invite friends to discover Shadow Shop" reward={rules.referral_bonus ? `+${rules.referral_bonus} Points` : 'Coming soon'} action={shareStore} />
          <EarnRow
            icon={CalendarCheck}
            title="Daily Check-in"
            description={data?.checked_in_today ? 'You checked in today' : 'Check in once every day'}
            reward={dailyEnabled ? `+${rules.daily_checkin_bonus} Points` : 'Coming soon'}
            action={() => checkinMutation.mutate()}
            actionLabel={checkinMutation.isPending ? 'Wait...' : data?.checked_in_today ? 'Done' : 'Check In'}
            disabled={!dailyEnabled || data?.checked_in_today || checkinMutation.isPending}
          />
          <EarnRow icon={Cake} title="Birthday Bonus" description="A special reward for your birthday" reward={rules.birthday_bonus ? `+${rules.birthday_bonus} Points` : 'Coming soon'} action={() => navigate('/profile')} />
          <EarnRow icon={Share2} title="Share With Friends" description="Share Shadow Shop with your friends" action={shareStore} actionLabel="Share" />
        </section>

        <section className="mt-5 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 p-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 text-3xl font-black text-pink-600">$</span>
          <div>
            <h2 className="text-sm font-black text-gray-950">More Points, More Rewards!</h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-600">The more points you earn, the more you save.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
