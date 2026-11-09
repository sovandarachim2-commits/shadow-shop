import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertCircle,
  Award,
  Archive,
  BadgeCheck,
  BellRing,
  Bot,
  Cake,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Copy,
  Crown,
  Eye,
  Diamond,
  Download,
  Edit3,
  FileText,
  FolderKanban,
  Gift,
  Info,
  Layers3,
  Loader2,
  Mail,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  Power,
  Percent,
  RotateCw,
  Save,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  Truck,
  Send,
  Upload,
  UserRound,
  Users,
  Warehouse,
  X,
  DollarSign,
  ShoppingCart,
  Tag,
  Zap,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import PageHeader from '@/components/shared/PageHeader'
import { getMemberTierImage } from '@/assets/member_shoppee'
import { cn, formatCurrency, formatDate } from '@/utils/helpers'

const REWARD_TYPES = [
  { value: 'voucher', label: 'Voucher' },
  { value: 'discount', label: 'Discount Coupon' },
  { value: 'free_delivery', label: 'Free Delivery' },
  { value: 'gift', label: 'Gift Product' },
  { value: 'lucky_box', label: 'Lucky Box' },
  { value: 'manual', label: 'Manual Reward' },
]

const REWARD_TYPE_GUIDE = {
  discount: {
    title: 'Point coupon',
    text: 'Customer spends points and receives a money or percent discount coupon for checkout.',
  },
  free_delivery: {
    title: 'Delivery reward',
    text: 'Customer spends points and receives a free delivery coupon for checkout.',
  },
  gift: {
    title: 'Product reward',
    text: 'Use a reward-only item, or link an existing store product when the item is also sold in the shop.',
  },
  voucher: {
    title: 'Voucher reward',
    text: 'Customer spends points and receives a checkout voucher with optional minimum order.',
  },
  lucky_box: {
    title: 'Lucky box reward',
    text: 'Attach a product as the visible reward item, then fulfill the redemption from reward orders.',
  },
  manual: {
    title: 'Manual reward',
    text: 'Customer spends points and your staff handles the reward manually after redemption.',
  },
}

const DISCOUNT_TYPES = [
  { value: 'amount', label: 'Amount' },
  { value: 'percent', label: 'Percent' },
]

const REDEMPTION_STATUSES = ['pending', 'approved', 'packed', 'shipped', 'completed', 'rejected']

const SAMPLE_MONTHS = [
  { month: 'Jan', earned: 8200, redeemed: 3100 },
  { month: 'Feb', earned: 9600, redeemed: 4300 },
  { month: 'Mar', earned: 12400, redeemed: 5200 },
  { month: 'Apr', earned: 11200, redeemed: 6100 },
  { month: 'May', earned: 14800, redeemed: 7200 },
  { month: 'Jun', earned: 16200, redeemed: 8600 },
]

const ADMIN_EARN_RULES = [
  { title: 'Shopping Reward', icon: ShoppingCart, status: 'Auto', text: 'Paid orders create point transactions. Current rule: $1 = 10 pts.', tone: 'bg-pink-50 text-pink-600' },
  { title: 'Daily Check-in', icon: CalendarDays, status: 'Auto', text: 'Customers can check in once per day when Daily check-in bonus is greater than 0.', tone: 'bg-sky-50 text-sky-600' },
  { title: 'Lucky Spin', icon: RotateCw, status: 'Plan', text: 'Future spin game for points, coupons, or lucky box entries.', tone: 'bg-amber-50 text-amber-600' },
  { title: 'Review Reward', icon: Camera, status: 'Manual', text: 'Add points from Customer Points after approving a useful review.', tone: 'bg-violet-50 text-violet-600' },
  { title: 'Invite Friend', icon: Users, status: 'Manual', text: 'Add points after the invited friend completes their first order.', tone: 'bg-emerald-50 text-emerald-600' },
  { title: 'VIP Level', icon: Crown, status: 'Auto', text: 'Customer level is based on point balance: Silver, Gold, Platinum.', tone: 'bg-rose-50 text-rose-600' },
]

const ADMIN_USE_RULES = [
  { title: 'Exchange Products', icon: Gift, text: 'Create Gift Product rewards and select a product for display.', tone: 'bg-amber-50 text-amber-600' },
  { title: 'Free Delivery', icon: Truck, text: 'Create Free Delivery rewards that generate coupon-style redemptions.', tone: 'bg-sky-50 text-sky-600' },
  { title: 'Coupons', icon: Percent, text: 'Create discount rewards with amount or percent coupon value.', tone: 'bg-pink-50 text-pink-600' },
  { title: 'Lucky Box', icon: Package, text: 'Create a manual reward now, then fulfill it from Redemptions.', tone: 'bg-violet-50 text-violet-600' },
]

const REWARD_DISTRIBUTION = [
  { label: 'Vouchers', value: 40, points: 500000, color: '#EC3F8F' },
  { label: 'Free Shipping', value: 20, points: 250000, color: '#2E8DFB' },
  { label: 'Physical Products', value: 25, points: 312500, color: '#8B5CF6' },
  { label: 'Discount Coupons', value: 10, points: 125000, color: '#FFB547' },
  { label: 'Lucky Box', value: 5, points: 62500, color: '#36C27B' },
]

const BOTTOM_REWARD_METRICS = [
  { title: 'Average Points per Order', value: '250 pts', trend: '+5.6% this month', icon: ShoppingCart, tone: 'bg-pink-50 text-[#EC3F8F]' },
  { title: 'Redemption Rate', value: '68.5%', trend: '+3.4% this month', icon: RotateCw, tone: 'bg-violet-50 text-violet-600' },
  { title: 'Active Members Rate', value: '24.6%', trend: '+2.6% this month', icon: UserRound, tone: 'bg-sky-50 text-sky-600' },
  { title: 'Reward Redemption', value: '15,620', trend: '+10.7% this month', icon: Gift, tone: 'bg-orange-50 text-orange-500' },
  { title: 'Points Liability', value: '$12,502.50', trend: '+8.6% this month', icon: Percent, tone: 'bg-emerald-50 text-emerald-600' },
]

const MEMBER_TIERS = [
  { level: 1, key: 'classic', name: 'Classic', range: 'Level 1', color: 'bg-slate-100 text-slate-700', desc: 'Welcome to our membership programme. Enjoy basic member benefits and earn points on purchases.', benefits: ['Basic member benefits', 'Earn points on purchases'] },
  { level: 2, key: 'silver', name: 'Silver', range: 'Level 2', color: 'bg-gray-100 text-gray-700', desc: 'Enjoy additional rewards, exclusive discounts, and special member promotions.', benefits: ['Additional rewards', 'Exclusive discounts', 'Special member promotions'] },
  { level: 3, key: 'gold', name: 'Gold', range: 'Level 3', color: 'bg-amber-50 text-amber-700', desc: 'Unlock better rewards, higher discounts, and exclusive shopping privileges.', benefits: ['Better rewards', 'Higher discounts', 'Exclusive shopping privileges'] },
  { level: 4, key: 'platinum', name: 'Platinum', range: 'Level 4', color: 'bg-cyan-50 text-cyan-700', desc: 'Enjoy premium benefits, birthday rewards, and priority access to special promotions.', benefits: ['Premium benefits', 'Birthday rewards', 'Priority access to special promotions'] },
  { level: 5, key: 'diamond', name: 'Diamond', range: 'Level 5', color: 'bg-pink-50 text-[#EC3F8F]', desc: 'Experience enhanced privileges, premium vouchers, and exclusive member offers.', benefits: ['Enhanced privileges', 'Premium vouchers', 'Exclusive member offers'] },
  { level: 6, key: 'vip', name: 'VIP', range: 'Level 6', color: 'bg-purple-50 text-purple-700', desc: 'Enjoy VIP-only promotions, personalized rewards, and priority customer support.', benefits: ['VIP-only promotions', 'Personalized rewards', 'Priority customer support'] },
  { level: 7, key: 'elite', name: 'Elite', range: 'Level 7', color: 'bg-indigo-50 text-indigo-700', desc: 'Access elite privileges, exceptional rewards, and exclusive shopping experiences.', benefits: ['Access elite privileges', 'Exceptional rewards', 'Exclusive shopping experiences'] },
  { level: 8, key: 'royal', name: 'Royal', range: 'Level 8', color: 'bg-rose-50 text-rose-700', desc: 'Our highest membership tier, offering the most exclusive rewards, maximum privileges, and personalized VIP experiences.', benefits: ['Highest membership tier', 'Most exclusive rewards', 'Maximum privileges', 'Personalized VIP experiences'] },
]

const COUPONS = [
  { code: 'SHADOW10', type: 'Percent', discount: '10%', usage: '82 / 300', valid: '2026-08-31', status: 'Active' },
  { code: 'FREESHIP', type: 'Delivery', discount: 'Free delivery', usage: '44 / 120', valid: '2026-07-31', status: 'Active' },
  { code: 'WELCOME5', type: 'Amount', discount: '$5', usage: '103 / 500', valid: '2026-09-15', status: 'Active' },
  { code: 'NEWUSER10', type: 'Percent', discount: '10%', usage: '29 / 100', valid: '2026-10-01', status: 'Draft' },
]

const CAMPAIGNS = [
  { name: 'Double Points Weekend', period: 'Jul 05 - Jul 07, 2026', reward: '2x order points', status: 'Scheduled' },
  { name: 'Birthday Reward Campaign', period: 'Always on', reward: '500 pts', status: 'Active' },
  { name: 'Referral Boost', period: 'Jul 01 - Aug 01, 2026', reward: '200 pts', status: 'Active' },
  { name: 'Holiday Rewards', period: 'Dec 01 - Dec 31, 2026', reward: 'Coupons + gifts', status: 'Draft' },
  { name: 'Lucky Box Event', period: 'Aug 10 - Aug 20, 2026', reward: 'Lucky box ticket', status: 'Draft' },
  { name: 'Summer Rewards', period: 'Now - Jul 31, 2026', reward: 'Free delivery', status: 'Active' },
]

const REWARD_CATEGORIES = [
  ['Vouchers', 4, 'Active'],
  ['Free Shipping', 2, 'Active'],
  ['Discount Coupons', 6, 'Active'],
  ['Physical Products', 8, 'Active'],
  ['Lucky Box', 3, 'Active'],
  ['Accessories', 5, 'Active'],
]

const NOTIFICATION_TEMPLATES = [
  ['Points Earned', 'You earned {{points}} Shadow points', 'Active'],
  ['Points Expired', 'Your Shadow points expired', 'Draft'],
  ['Reward Redeemed', 'Reward exchange received', 'Active'],
  ['Reward Approved', 'Your reward is approved', 'Active'],
  ['Birthday Bonus', 'Happy birthday from Shadow Shop', 'Active'],
  ['Referral Bonus', 'Referral reward added', 'Draft'],
]

const AUTOMATION_ITEMS = [
  'Auto issue points after order completed',
  'Auto deduct points when reward redeemed',
  'Low stock alert for rewards',
  'Reward out of stock notification',
  'Points expiration reminder',
  'Birthday reward automation',
  'Referral approval automation',
  'Email notification',
  'Telegram notification',
  'Push notification',
]

const emptyReward = {
  name: '',
  description: '',
  type: 'discount',
  points_required: 100,
  coupon_discount_type: 'amount',
  coupon_value: '0.00',
  minimum_order_amount: '0.00',
  gift_product: '',
  stock: '',
  per_customer_limit: '',
  member_tier_requirement: 'all',
  starts_at: '',
  ends_at: '',
  expires_at: '',
  is_active: true,
}

function getCreateRewardFromSearch(search) {
  const params = new URLSearchParams(search)
  if (params.get('new') !== '1') return null
  return { type: params.get('type') || 'discount' }
}

function unwrapList(data) {
  return data?.results ?? data ?? []
}

function formatApiError(data, fallback = 'Could not save reward') {
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return String(data.detail)
  if (data.message) return String(data.message)
  if (Array.isArray(data)) return data.map((item) => String(item)).join(', ')
  if (typeof data === 'object') {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const label = field.replaceAll('_', ' ')
      if (Array.isArray(value)) return value.map((item) => `${label}: ${item}`)
      if (value && typeof value === 'object') return [`${label}: ${formatApiError(value, '')}`].filter(Boolean)
      return [`${label}: ${value}`]
    })
    return messages.filter(Boolean).join(' | ') || fallback
  }
  return fallback
}

function toDateInput(value) {
  if (!value) return ''
  return String(value).slice(0, 16)
}

function toApiDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function StatCard({ title, value, icon: Icon, tone = 'bg-pink-50 text-pink-600', hint }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-black text-gray-950">{value}</p>
          {hint && <p className="mt-1 text-xs font-semibold text-gray-400">{hint}</p>}
        </div>
        <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', tone)}>
          <Icon size={22} />
        </span>
      </div>
    </div>
  )
}

function PremiumKpiCard({ title, value, trend, icon: Icon, tone, trendTone = 'text-emerald-600', hint }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-5">
        <span className={cn('flex h-16 w-16 shrink-0 items-center justify-center rounded-full', tone)}>
          <Icon size={28} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-500">{title}</p>
          <p className="mt-2 text-[28px] font-black leading-none tracking-tight text-gray-950">{value}</p>
          <p className={cn('mt-3 text-sm font-black', trendTone)}>{trend || hint}</p>
        </div>
      </div>
    </div>
  )
}

function OverviewKpiCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase text-gray-400">{title}</p>
          <p className="mt-2 text-2xl font-black leading-none text-gray-950">{value}</p>
          {subtitle && <p className="mt-2 truncate text-xs font-semibold text-gray-500">{subtitle}</p>}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone)}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  )
}

function RewardThumb({ reward, fallbackIndex = 0 }) {
  const image = reward.reward_image_url || reward.gift_product_image
  const tones = [
    'bg-pink-50 text-[#EC3F8F]',
    'bg-sky-50 text-sky-600',
    'bg-amber-50 text-amber-600',
    'bg-violet-50 text-violet-600',
  ]
  return (
    <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl', image ? 'bg-gray-50' : tones[fallbackIndex % tones.length])}>
      {image ? (
        <img src={image} alt={reward.name} className="h-full w-full object-contain p-1" />
      ) : (
        <Gift size={19} />
      )}
    </div>
  )
}

function PremiumChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-950">{title}</h2>
          <p className="mt-1 text-xs font-semibold text-gray-400">{subtitle}</p>
        </div>
        <button className="rounded-lg bg-gray-50 p-2 text-gray-400 hover:text-[#EC3F8F]">
          <MoreHorizontal size={17} />
        </button>
      </div>
      {children}
    </div>
  )
}

function getMonthlyPointsActivity(transactions) {
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { key, month: date.toLocaleDateString('en', { month: 'short' }), earned: 0, redeemed: 0 }
  })
  const byMonth = new Map(months.map((month) => [month.key, month]))

  transactions.forEach((transaction) => {
    const date = new Date(transaction.created_at)
    if (Number.isNaN(date.getTime())) return
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const month = byMonth.get(key)
    if (!month) return
    const points = Number(transaction.points) || 0
    if (points > 0) month.earned += points
    if (points < 0) month.redeemed += Math.abs(points)
  })
  return months
}

function MiniLineChart({ rows }) {
  const hasPoints = rows.some((row) => row.earned || row.redeemed)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-gray-500">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#EC3F8F]" /> Earned</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-violet-500" /> Redeemed</span>
      </div>
      {hasPoints ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid stroke="#EEF1F6" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8A93A5', fontSize: 12, fontWeight: 700 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8A93A5', fontSize: 11 }} width={42} tickFormatter={(value) => Number(value).toLocaleString()} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #EEF1F6', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
              formatter={(value, name) => [Number(value).toLocaleString(), name === 'earned' ? 'Earned' : 'Redeemed']}
              labelStyle={{ color: '#111827', fontWeight: 800 }}
            />
            <Line type="monotone" dataKey="earned" name="earned" stroke="#EC3F8F" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="redeemed" name="redeemed" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-gray-50 text-sm font-semibold text-gray-400">
          No points activity in the last 6 months
        </div>
      )}
    </div>
  )
}

function DonutDistributionCard({ totalPoints = 0 }) {
  let offset = 0
  const radius = 72
  const circumference = 2 * Math.PI * radius

  return (
    <PremiumChartCard title="Reward Type Distribution" subtitle="">
      <div className="grid items-center gap-7 lg:grid-cols-[260px_1fr]">
        <div className="relative mx-auto h-64 w-64">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            {REWARD_DISTRIBUTION.map((item) => {
              const dash = (item.value / 100) * circumference
              const node = (
                <circle
                  key={item.label}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="28"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              )
              offset += dash
              return node
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-black text-gray-400">Total</p>
            <p className="mt-1 text-3xl font-black text-gray-950">{Number(totalPoints || 0).toLocaleString()}</p>
            <p className="mt-1 text-sm font-bold text-gray-500">Points</p>
          </div>
        </div>
        <div className="space-y-4">
          {REWARD_DISTRIBUTION.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-black text-gray-700">{item.label}</span>
              </div>
              <span className="font-black text-gray-600">{item.value}% ({item.points.toLocaleString()})</span>
            </div>
          ))}
        </div>
      </div>
    </PremiumChartCard>
  )
}

function SettingSummaryCard({ title, icon: Icon, items, action }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-[#EC3F8F]">
          <Icon size={20} />
        </span>
        <button onClick={() => toast.error(`${action} needs backend wiring before it can open`)} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-600 hover:bg-pink-50 hover:text-[#EC3F8F]">
          {action}
        </button>
      </div>
      <h3 className="mt-4 text-base font-black text-gray-950">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <p key={item} className="flex items-center justify-between gap-3 text-sm font-semibold text-gray-600">
            <span>{item}</span>
            <Check size={15} className="shrink-0 text-emerald-500" />
          </p>
        ))}
      </div>
    </div>
  )
}

function MiniBarChart({ rows = SAMPLE_MONTHS }) {
  const max = Math.max(...rows.flatMap((row) => [row.earned, row.redeemed]), 1)
  return (
    <div className="h-72 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-gray-950">Monthly points earned vs redeemed</h2>
          <p className="mt-0.5 text-xs font-semibold text-gray-400">Last 6 months overview</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-black text-gray-500">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#E91E73]" /> Earned</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> Redeemed</span>
        </div>
      </div>
      <div className="flex h-44 items-end justify-between gap-3">
        {rows.map((row) => (
          <div key={row.month} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-36 items-end gap-1.5">
              <div className="w-4 rounded-t-full bg-[#E91E73]" style={{ height: `${Math.max(8, (row.earned / max) * 144)}px` }} />
              <div className="w-4 rounded-t-full bg-gray-300" style={{ height: `${Math.max(8, (row.redeemed / max) * 144)}px` }} />
            </div>
            <span className="text-xs font-black text-gray-400">{row.month}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankedListCard({ title, items, valueKey, emptyText }) {
  const max = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1)
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-base font-black text-gray-950">{title}</h2>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-gray-400">{emptyText}</p>
        ) : items.slice(0, 5).map((item, index) => {
          const value = Number(item[valueKey] || 0)
          return (
            <div key={item.id || item.user || item.name || index}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-black text-gray-900">{item.name || item.reward_name || item.user_name}</span>
                <span className="shrink-0 font-black text-[#E91E73]">{value.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[#E91E73]" style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function typeLabel(type) {
  if (type === 'earn') return 'Earn'
  if (type === 'redeem') return 'Redeem'
  if (type === 'adjust') return 'Manual Adjustment'
  return type || '-'
}

function RewardProgramOverview() {
  const groups = [
    { title: 'Earn Points', items: ADMIN_EARN_RULES },
    { title: 'Use Points', items: ADMIN_USE_RULES },
  ]

  return (
    <div className="mb-4 grid gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <div key={group.title} className="form-card">
          <div className="mb-3 flex items-center gap-2">
            <Award size={18} className="text-purple-600" />
            <h2 className="text-base font-black text-navy-900">{group.title}</h2>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-start gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', item.tone)}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-gray-900">{item.title}</p>
                        {item.status && (
                          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-gray-400">
                            {item.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">{item.text}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function RewardDashboardAdmin() {
  const navigate = useNavigate()
  const { data: stats } = useQuery({
    queryKey: ['admin-reward-stats'],
    queryFn: () => ordersApi.adminRewards.items.stats().then((r) => r.data),
  })
  const { data: pointsData = [] } = useQuery({
    queryKey: ['admin-reward-points', 'dashboard'],
    queryFn: () => ordersApi.adminRewards.points.list().then((r) => r.data),
  })
  const { data: rewardsRaw } = useQuery({
    queryKey: ['admin-reward-items', 'dashboard'],
    queryFn: () => ordersApi.adminRewards.items.list({ page_size: 300 }).then((r) => r.data),
  })
  const { data: redemptionsRaw } = useQuery({
    queryKey: ['admin-reward-redemptions', 'dashboard'],
    queryFn: () => ordersApi.adminRewards.redemptions.list({ page_size: 300 }).then((r) => r.data),
  })
  const { data: transactionsRaw } = useQuery({
    queryKey: ['admin-reward-transactions', 'dashboard'],
    queryFn: () => ordersApi.adminRewards.transactions.list({ page_size: 100 }).then((r) => r.data),
  })

  const rewards = unwrapList(rewardsRaw)
  const redemptions = unwrapList(redemptionsRaw)
  const transactions = unwrapList(transactionsRaw)
  const pointsActivity = getMonthlyPointsActivity(transactions)
  const totalIssued = transactions.filter((item) => Number(item.points) > 0).reduce((sum, item) => sum + Number(item.points || 0), 0)
  const totalRedeemed = Math.abs(transactions.filter((item) => Number(item.points) < 0).reduce((sum, item) => sum + Number(item.points || 0), 0))
  const activeUsers = pointsData.filter((customer) => Number(customer.points || 0) > 0).length
  const pendingExchanges = redemptions.filter((item) => ['pending', 'prepared'].includes(item.status)).length
  const availablePhysicalRewards = rewards
    .filter((item) => ['gift', 'lucky_box', 'manual'].includes(item.type))
    .reduce((sum, item) => sum + Number(item.stock || 0), 0)
  const popularRewards = redemptions.reduce((acc, item) => {
    const key = item.reward_name || 'Reward'
    acc[key] = acc[key] || { name: key, count: 0 }
    acc[key].count += 1
    return acc
  }, {})
  const displayRewards = rewards.map((reward) => ({
    id: reward.id,
    name: reward.name,
    category: reward.type_label || reward.type || reward.category || 'Reward',
    type: reward.type || 'gift',
    points_required: Number(reward.points_required ?? reward.points ?? 0),
    stock: reward.stock ?? reward.inventory ?? 'No limit',
    redeemed_count: Number(reward.redeemed_count ?? reward.redeemed ?? 0),
    is_active: reward.is_active ?? reward.status === 'Active',
    created_at: reward.created_at || '2026-06-28',
    reward_image_url: reward.reward_image_url,
    gift_product_image: reward.gift_product_image,
    gift_product_name: reward.gift_product_name,
    raw: reward,
  }))
  const dashboardValues = {
    totalPointsIssued: Number(stats?.total_points_issued ?? totalIssued) || 0,
    totalPointsRedeemed: Number(stats?.total_points_redeemed ?? totalRedeemed) || 0,
    activeMembers: Number(stats?.active_members ?? activeUsers) || 0,
    pendingRequests: Number(stats?.pending_redemptions ?? pendingExchanges) || 0,
    expiringPoints: Number(stats?.expiring_points || 0) || 0,
    physicalRewardsLeft: Number(availablePhysicalRewards || 0) || 0,
  }
  const topRewards = Object.values(popularRewards).sort((a, b) => Number(b.count || 0) - Number(a.count || 0)).slice(0, 5)
  const topRewardMax = Math.max(...topRewards.map((item) => Number(item.count ?? item.redeemed ?? 0)), 1)
  const recentRequests = redemptions.slice(0, 5)
  const expiringCustomers = pointsData.filter((customer) => Number(customer.points || 0) > 0).slice(0, 5)

  return (
    <div className="min-h-screen space-y-5 bg-[#F8F9FC]">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#EC3F8F]">Rewards Overview</p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">Points, redemptions, and reward health</h1>
            <p className="mt-1 text-sm font-semibold text-gray-500">A quick operational view of what needs attention today.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/admin/rewards/products?new=1')} className="btn-primary h-11">
              <Plus size={16} /> Reward Item
            </button>
            <button type="button" onClick={() => navigate('/admin/rewards/redemptions')} className="btn-secondary h-11">
              <FileText size={16} /> Redemptions
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <OverviewKpiCard title="Issued" value={dashboardValues.totalPointsIssued.toLocaleString()} subtitle="Total points" icon={Gift} tone="bg-pink-50 text-[#EC3F8F]" />
        <OverviewKpiCard title="Redeemed" value={dashboardValues.totalPointsRedeemed.toLocaleString()} subtitle="Spent by members" icon={Award} tone="bg-orange-50 text-orange-500" />
        <OverviewKpiCard title="Members" value={dashboardValues.activeMembers.toLocaleString()} subtitle="With balance" icon={UserRound} tone="bg-violet-50 text-violet-600" />
        <OverviewKpiCard title="Pending" value={dashboardValues.pendingRequests.toLocaleString()} subtitle="Need review" icon={FileText} tone="bg-sky-50 text-sky-600" />
        <OverviewKpiCard title="Expiring" value={dashboardValues.expiringPoints.toLocaleString()} subtitle="This month" icon={Clock} tone="bg-amber-50 text-amber-600" />
        <OverviewKpiCard title="Stock Left" value={dashboardValues.physicalRewardsLeft.toLocaleString()} subtitle="Physical rewards" icon={ShoppingCart} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <PremiumChartCard title="Points Activity" subtitle="Last 6 months">
          <MiniLineChart rows={pointsActivity} />
        </PremiumChartCard>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-gray-950">Top Redeemed Rewards</h2>
              <p className="mt-1 text-xs font-semibold text-gray-400">Most exchanged reward items</p>
            </div>
            <button type="button" onClick={() => navigate('/admin/rewards/redemptions')} className="text-xs font-black text-[#EC3F8F]">View All</button>
          </div>
          <div className="space-y-3">
            {topRewards.map((item, index) => {
              const Icon = [Ticket, Truck, ShoppingCart, Percent, Package][index] || Gift
              const value = Number(item.count ?? item.redeemed ?? 0)
              return (
                <div key={item.name} className="flex items-center gap-3 rounded-xl bg-[#F8F9FC] px-3 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-gray-500">{index + 1}</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-[#EC3F8F]">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-gray-900">{item.name}</span>
                  <span className="shrink-0 text-sm font-black text-gray-700">{value.toLocaleString()}</span>
                </div>
              )
            })}
            {topRewards.length === 0 && <p className="py-8 text-center text-sm font-semibold text-gray-400">No redeemed rewards yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-950">Recent Redeem Requests</h2>
              <p className="mt-1 text-xs font-semibold text-gray-400">Latest customer exchange activity</p>
            </div>
            <button type="button" onClick={() => navigate('/admin/rewards/redemptions')} className="text-xs font-black text-[#EC3F8F]">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#FBFCFE]">
                  <th className="px-3 py-3 text-left text-xs font-black uppercase text-gray-400">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase text-gray-400">Customer</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase text-gray-400">Reward</th>
                  <th className="px-3 py-3 text-right text-xs font-black uppercase text-gray-400">Points</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase text-gray-400">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-black uppercase text-gray-400">Status</th>
                  <th className="px-3 py-3 text-right text-xs font-black uppercase text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="px-3 py-3 font-mono text-xs font-black text-gray-500">#{String(item.id).padStart(5, '0')}</td>
                    <td className="px-3 py-3 font-semibold text-gray-900">{item.user_name}</td>
                    <td className="px-3 py-3 text-gray-600">{item.reward_name}</td>
                    <td className="px-3 py-3 text-right font-black text-[#EC3F8F]">{Number(item.points_spent || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-gray-500">{item.date || formatDate(item.created_at)}</td>
                    <td className="px-3 py-3"><StatusBadge value={item.status || 'Pending'} /></td>
                    <td className="px-3 py-3 text-right">
                      <button className="rounded-lg border border-gray-100 bg-white p-2 text-gray-500 hover:text-[#EC3F8F]"><Eye size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentRequests.length === 0 && <div className="py-12 text-center text-sm font-semibold text-gray-400">No redeem requests yet.</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-950">Points Expiring Soon</h2>
              <p className="mt-1 text-xs font-semibold text-gray-400">Customers needing reminder follow-up</p>
            </div>
            <button type="button" onClick={() => navigate('/admin/rewards/points')} className="text-xs font-black text-[#EC3F8F]">View All</button>
          </div>
          <div className="space-y-3">
            {expiringCustomers.map((customer, index) => (
              <div key={customer.user || index} className="flex items-center justify-between rounded-xl bg-[#F8F9FC] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-50 text-xs font-black text-[#EC3F8F]">
                    {(customer.name || 'C').slice(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{customer.name}</p>
                    <p className="text-xs font-semibold text-gray-400">{customer.date || `Jun ${20 + index}, 2026`}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-gray-950">{Number(customer.points || 0).toLocaleString()} pts</p>
                <button className="rounded-lg border border-gray-100 bg-white p-2 text-gray-500 hover:text-[#EC3F8F]"><Mail size={15} /></button>
              </div>
            ))}
            {expiringCustomers.length === 0 && <div className="rounded-xl bg-[#F8F9FC] px-4 py-8 text-center text-sm font-semibold text-gray-400">No customers with points to remind.</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RewardRulesAdmin() {
  const earningRules = [
    { id: 1, name: 'Points per Purchase', description: 'Earn 1 point per $1 spent', type: 'Purchase', points: '1 pt per $1', conditions: 'Min. spend $1', tier: 'All Tiers', priority: 1, status: 'Active', icon: ShoppingCart, tone: 'bg-pink-50 text-[#EC3F8F]' },
    { id: 2, name: 'Signup Bonus', description: 'Welcome points after account creation', type: 'Signup', points: '500 pts', conditions: 'First time signup', tier: 'All Tiers', priority: 2, status: 'Active', icon: Users, tone: 'bg-orange-50 text-orange-500' },
    { id: 3, name: 'Birthday Bonus', description: 'Annual customer birthday reward', type: 'Birthday', points: '300 pts', conditions: 'Once per year', tier: 'All Tiers', priority: 3, status: 'Active', icon: Gift, tone: 'bg-emerald-50 text-emerald-600' },
    { id: 4, name: 'Product Review', description: 'Points for approved product review', type: 'Review', points: '100 pts', conditions: 'Min. 4 stars review', tier: 'All Tiers', priority: 4, status: 'Active', icon: Award, tone: 'bg-blue-50 text-blue-600' },
    { id: 5, name: 'Refer a Friend', description: 'Friend places first order', type: 'Referral', points: '1,000 pts', conditions: 'Friend places order', tier: 'All Tiers', priority: 5, status: 'Active', icon: UserRound, tone: 'bg-violet-50 text-violet-600' },
    { id: 6, name: 'Instagram Follow', description: 'Social follow verification', type: 'Social Media', points: '50 pts', conditions: 'Follow our account', tier: 'All Tiers', priority: 6, status: 'Active', icon: Camera, tone: 'bg-rose-50 text-rose-600' },
    { id: 7, name: 'First Order Bonus', description: 'Bonus on first successful order', type: 'Purchase', points: '200 pts', conditions: 'First order only', tier: 'All Tiers', priority: 7, status: 'Active', icon: Package, tone: 'bg-amber-50 text-amber-600' },
    { id: 8, name: 'Double Points Day', description: 'Campaign multiplier rule', type: 'Campaign', points: '2x points', conditions: 'During campaign', tier: 'Gold+', priority: 8, status: 'Scheduled', icon: Zap, tone: 'bg-teal-50 text-teal-600' },
    { id: 9, name: 'Newsletter Signup', description: 'Email subscription reward', type: 'Signup', points: '100 pts', conditions: 'Email subscription', tier: 'All Tiers', priority: 9, status: 'Active', icon: Mail, tone: 'bg-green-50 text-green-600' },
    { id: 10, name: 'Spend Over $100', description: 'Bonus for high-value orders', type: 'Bonus', points: '500 pts', conditions: 'Min. spend $100', tier: 'Silver+', priority: 10, status: 'Active', icon: ShoppingCart, tone: 'bg-sky-50 text-sky-600' },
  ]
  const [rules, setRules] = useState(earningRules)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [editingRule, setEditingRule] = useState(null)
  const importRulesRef = useRef(null)

  const filteredRules = rules.filter((rule) => {
    const haystack = `${rule.name} ${rule.description} ${rule.type} ${rule.conditions} ${rule.tier}`.toLowerCase()
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase())
    const matchesType = !typeFilter || rule.type === typeFilter
    const matchesStatus = !statusFilter || rule.status === statusFilter
    const matchesTier = !tierFilter || rule.tier === tierFilter || rule.tier === 'All Tiers'
    const matchesCampaign = !campaignFilter || (campaignFilter === 'Campaign Rules' ? rule.type === 'Campaign' : rule.type !== 'Campaign')
    return matchesSearch && matchesType && matchesStatus && matchesTier && matchesCampaign
  })
  const selectedRules = filteredRules.filter((rule) => selectedIds.includes(rule.id))
  const allSelected = filteredRules.length > 0 && selectedRules.length === filteredRules.length
  const activeRules = rules.filter((rule) => rule.status === 'Active').length
  const pendingRules = rules.filter((rule) => ['Scheduled', 'Draft'].includes(rule.status)).length
  const toggleSelect = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const toggleAll = () => setSelectedIds(allSelected ? [] : filteredRules.map((rule) => rule.id))
  const saveRule = (rule) => {
    setRules((current) => {
      if (rule.id) return current.map((item) => item.id === rule.id ? { ...item, ...rule } : item)
      const Icon = rule.type === 'Purchase' ? ShoppingCart : rule.type === 'Referral' ? UserRound : rule.type === 'Birthday' ? Gift : rule.type === 'Review' ? Award : rule.type === 'Social Media' ? Camera : Zap
      return [{ ...rule, id: Date.now(), icon: Icon, tone: 'bg-pink-50 text-[#EC3F8F]' }, ...current]
    })
    setEditingRule(null)
    toast.success(rule.id ? 'Earning rule updated' : 'Earning rule created')
  }
  const duplicateRule = (rule) => {
    setRules((current) => [{ ...rule, id: Date.now(), name: `${rule.name} Copy`, status: 'Draft' }, ...current])
    toast.success('Rule duplicated as draft')
  }
  const toggleRuleStatus = (rule) => {
    setRules((current) => current.map((item) => item.id === rule.id ? { ...item, status: item.status === 'Active' ? 'Disabled' : 'Active' } : item))
  }
  const deleteRule = (rule) => {
    setRules((current) => current.filter((item) => item.id !== rule.id))
    setSelectedIds((current) => current.filter((id) => id !== rule.id))
    toast.success('Rule deleted')
  }
  const exportRules = () => {
    const columns = ['Rule Name', 'Rule Type', 'Points Reward', 'Conditions', 'Member Tier', 'Priority', 'Status']
    const rows = filteredRules.map((rule) => [rule.name, rule.type, rule.points, rule.conditions, rule.tier, rule.priority, rule.status])
    const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'shadow-shop-earning-rules.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Earning rules exported')
  }
  const statusClass = (status) => ({
    Active: 'bg-emerald-50 text-emerald-700',
    Scheduled: 'bg-amber-50 text-amber-700',
    Draft: 'bg-gray-100 text-gray-500',
    Disabled: 'bg-red-50 text-red-600',
  }[status] || 'bg-gray-100 text-gray-500')

  return (
    <div className="space-y-5 bg-[#F8F9FC]">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total Rules', rules.length, '+ 12.5% this month', Gift, 'bg-pink-50 text-[#EC3F8F]'],
          ['Active Rules', activeRules, '+ 75% of total', Zap, 'bg-orange-50 text-orange-500'],
          ['Points Issued This Month', '0', 'Connect earning-rule stats API', Check, 'bg-emerald-50 text-emerald-600'],
          ['Pending Rules', pendingRules, 'Review required', Clock, 'bg-violet-50 text-violet-600'],
          ['Average Points Per Order', '78', '+ 8.3% vs last month', ShoppingCart, 'bg-blue-50 text-blue-600'],
          ['Active Campaign Rules', rules.filter((rule) => rule.type === 'Campaign').length, '+ 2 active campaigns', CalendarDays, 'bg-teal-50 text-teal-600'],
        ].map(([title, value, trend, Icon, tone]) => (
          <div key={title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <span className={cn('flex h-12 w-12 items-center justify-center rounded-full', tone)}><Icon size={22} /></span>
            <p className="mt-4 text-xs font-black text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-black text-gray-950">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="mt-2 text-xs font-black text-emerald-600">{trend}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="grid gap-3 border-b border-gray-100 p-5 xl:grid-cols-[1.3fr_150px_150px_150px_170px_auto_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field h-11 bg-[#F8F9FC] pl-9" placeholder="Search rules..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="select-field h-11 bg-[#F8F9FC]" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All Types</option>
            {['Purchase', 'Signup', 'Referral', 'Review', 'Birthday', 'Social Media', 'Campaign', 'Bonus', 'Custom'].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All Status</option>
            {['Active', 'Scheduled', 'Draft', 'Disabled'].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}>
            <option value="">All Tiers</option>
            {['All Tiers', 'Silver+', 'Gold+', 'Platinum', 'Diamond'].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
            <option value="">All Campaigns</option>
            <option value="Campaign Rules">Campaign Rules</option>
            <option value="Standard Rules">Standard Rules</option>
          </select>
          <button onClick={() => toast.success('Filters applied')} className="btn-secondary h-11 justify-center"><SlidersHorizontal size={16} /> Filter</button>
          <button onClick={exportRules} className="btn-secondary h-11 justify-center"><Download size={16} /> Export Rules</button>
          <button onClick={() => importRulesRef.current?.click()} className="btn-secondary h-11 justify-center"><Upload size={16} /> Import Rules</button>
          <button onClick={() => setEditingRule({})} className="h-11 rounded-xl bg-[#EC3F8F] px-4 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600"><Plus size={16} className="inline" /> Add Rule</button>
          <input ref={importRulesRef} type="file" accept=".csv" className="hidden" onChange={(event) => { if (event.target.files?.[0]) toast.success(`${event.target.files[0].name} selected`) }} />
        </div>

        {selectedRules.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 bg-pink-50 px-5 py-3">
            <p className="text-sm font-black text-[#EC3F8F]">{selectedRules.length} selected</p>
            <button onClick={() => { setRules((current) => current.filter((rule) => !selectedIds.includes(rule.id))); setSelectedIds([]); toast.success('Selected rules deleted') }} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-red-500 shadow-sm"><Trash2 size={14} className="inline" /> Delete Selected</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-[#FBFCFE]">
                <th className="w-12 px-5 py-4 text-left"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]" aria-label="Select all earning rules" /></th>
                {['Rule Name', 'Rule Type', 'Points Reward', 'Conditions', 'Member Tier', 'Priority', 'Status', 'Actions'].map((head) => (
                  <th key={head} className={cn('px-5 py-4 text-xs font-black uppercase text-gray-400', head === 'Actions' ? 'text-right' : 'text-left')}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => {
                const Icon = rule.icon
                return (
                  <tr key={rule.id} className="border-b border-gray-50 transition hover:bg-pink-50/30">
                    <td className="px-5 py-4"><input type="checkbox" checked={selectedIds.includes(rule.id)} onChange={() => toggleSelect(rule.id)} className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]" aria-label={`Select ${rule.name}`} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', rule.tone)}><Icon size={19} /></span>
                        <div><p className="font-black text-gray-950">{rule.name}</p><p className="text-xs font-semibold text-gray-400">{rule.description}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="rounded-lg bg-pink-50 px-3 py-1 text-xs font-black text-[#EC3F8F]">{rule.type}</span></td>
                    <td className="px-5 py-4 font-black text-gray-900">{rule.points}</td>
                    <td className="px-5 py-4 font-semibold text-gray-600">{rule.conditions}</td>
                    <td className="px-5 py-4"><span className="rounded-lg bg-violet-50 px-3 py-1 text-xs font-black text-violet-600">{rule.tier}</span></td>
                    <td className="px-5 py-4 font-black text-gray-800">{rule.priority}</td>
                    <td className="px-5 py-4"><span className={cn('rounded-lg px-3 py-1 text-xs font-black', statusClass(rule.status))}>{rule.status}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setEditingRule(rule)} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="View"><Eye size={15} /></button>
                        <button onClick={() => setEditingRule(rule)} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="Edit"><Edit3 size={15} /></button>
                        <button onClick={() => duplicateRule(rule)} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="Duplicate"><Copy size={15} /></button>
                        <button onClick={() => toggleRuleStatus(rule)} className={cn('rounded-full px-3 py-2 text-xs font-black', rule.status === 'Active' ? 'bg-[#EC3F8F] text-white' : 'bg-gray-100 text-gray-500')}>{rule.status === 'Active' ? 'On' : 'Off'}</button>
                        <button onClick={() => deleteRule(rule)} className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100" title="Delete"><Trash2 size={15} /></button>
                        <button onClick={() => toast.error('No more rule actions are available until earning rules have a backend API')} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="More"><MoreHorizontal size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-400">Showing 1 to {filteredRules.length} of {rules.length} rules</p>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((page) => <button key={page} className={cn('h-10 w-10 rounded-xl text-sm font-black', page === 1 ? 'bg-[#EC3F8F] text-white shadow-lg shadow-pink-100' : 'bg-gray-100 text-gray-600')}>{page}</button>)}
            <button className="btn-secondary h-10 px-4 text-sm">10 / page</button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr_0.8fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Points Earned by Rule</h2>
          <div className="mt-6 flex h-64 items-end gap-4 border-b border-l border-gray-100 px-4">
            {[28, 46, 38, 65, 52, 82, 74, 96].map((height, index) => <div key={index} className="flex flex-1 items-end"><span className="w-full rounded-t-xl bg-gradient-to-t from-[#EC3F8F] to-pink-200" style={{ height: `${height}%` }} /></div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Most Used Rules</h2>
          <div className="mt-6 space-y-4">
            {rules.slice(0, 5).map((rule, index) => (
              <div key={rule.id}>
                <div className="mb-2 flex justify-between text-sm font-black text-gray-700"><span>{index + 1}. {rule.name}</span><span>{[4250, 3250, 1320, 960, 600][index]}</span></div>
                <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-[#EC3F8F]" style={{ width: `${92 - index * 13}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Top Customers</h2>
          <div className="mt-6 space-y-3">
            {['Dara', 'Tha seyha', 'Sophia Davis', 'Noah Wilson', 'Ava Martinez'].map((name, index) => (
              <div key={name} className="flex items-center justify-between rounded-xl bg-[#F8F9FC] px-4 py-3">
                <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-50 text-xs font-black text-[#EC3F8F]">{name.slice(0, 1)}</span><p className="text-sm font-black text-gray-900">{name}</p></div>
                <p className="text-sm font-black text-gray-950">{[12500, 9800, 7200, 6400, 5300][index].toLocaleString()} pts</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {editingRule && <EarningRuleDrawer rule={editingRule.id ? editingRule : null} onClose={() => setEditingRule(null)} onSave={saveRule} />}
    </div>
  )
}

function EarningRuleDrawer({ rule, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    id: rule?.id,
    name: rule?.name || '',
    description: rule?.description || '',
    type: rule?.type || 'Purchase',
    points: rule?.points || '10 pts',
    pointsAmount: rule?.pointsAmount || '10',
    per: rule?.per || '$1 Spent',
    conditions: rule?.conditions || 'Min. spend $1',
    tier: rule?.tier || 'All Tiers',
    priority: rule?.priority || 1,
    status: rule?.status || 'Active',
    minimumSpend: '1',
    maximumReward: '',
    dailyLimit: '',
    weeklyLimit: '',
    monthlyLimit: '',
    lifetimeLimit: '',
    cooldown: 'No Cooldown',
    startDate: '',
    endDate: '',
    auto: true,
    approval: false,
    expire: true,
    repeat: true,
    featured: false,
  }))
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const save = () => {
    if (!form.name.trim()) {
      toast.error('Rule name is required')
      return
    }
    onSave({
      ...rule,
      ...form,
      points: form.per === '$1 Spent' ? `${form.pointsAmount} pt per $1` : `${Number(form.pointsAmount || 0).toLocaleString()} pts`,
      conditions: form.conditions || (form.minimumSpend ? `Min. spend $${form.minimumSpend}` : 'No conditions'),
      icon: rule?.icon || ShoppingCart,
      tone: rule?.tone || 'bg-pink-50 text-[#EC3F8F]',
    })
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close earning rule form" />
      <section className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="border-b border-gray-100 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EC3F8F]">Shadow Shop Rewards Admin</p>
              <h2 className="mt-1 text-xl font-black text-gray-950">Add / Edit Earning Rule</h2>
              <p className="mt-1 text-sm font-semibold text-gray-400">Fill the rule details below, then save. Required field is rule name.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]"><X size={18} /></button>
          </div>
        </div>
        <div className="grid flex-1 gap-4 overflow-y-auto bg-[#F8F9FC] p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-gray-400">Basic Rule Setup</h3>
          </div>
          <div className="md:col-span-2">
            <span className="label">Rule Type</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {['Purchase', 'Signup', 'Referral', 'Review', 'Birthday', 'Social Media', 'Campaign', 'Custom'].map((type) => (
                <button key={type} type="button" onClick={() => set('type', type)} className={cn('rounded-xl border px-3 py-3 text-left text-xs font-black transition', form.type === type ? 'border-[#EC3F8F] bg-pink-50 text-[#EC3F8F]' : 'border-gray-200 bg-white text-gray-600 hover:border-pink-200')}>{type}</button>
              ))}
            </div>
          </div>
          <label className="md:col-span-2"><span className="label">Rule Name</span><input className="input-field" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Enter rule name" /></label>
          <label className="md:col-span-2"><span className="label">Description</span><textarea className="input-field min-h-20" value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Enter rule description" /></label>
          <div className="md:col-span-2">
            <h3 className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-gray-400">Points and Limits</h3>
          </div>
          <div className="md:col-span-2">
            <span className="label">Points Configuration</span>
            <div className="grid gap-2 md:grid-cols-[120px_1fr_150px]">
              <select className="select-field" defaultValue="Earn"><option>Earn</option><option>Multiply</option></select>
              <input className="input-field" type="number" min="0" value={form.pointsAmount} onChange={(event) => set('pointsAmount', event.target.value)} />
              <select className="select-field"><option>Points</option><option>Multiplier</option></select>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-[90px_1fr]">
              <input className="input-field" value="Per" readOnly />
              <select className="select-field" value={form.per} onChange={(event) => set('per', event.target.value)}>
                {['$1 Spent', 'Order', 'Review', 'Referral', 'Signup', 'Birthday', 'Social Action'].map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
          {[
            ['minimumSpend', 'Minimum Spend', '$'],
            ['maximumReward', 'Maximum Reward', 'No limit'],
            ['dailyLimit', 'Daily Limit', 'No limit'],
            ['weeklyLimit', 'Weekly Limit', 'No limit'],
            ['monthlyLimit', 'Monthly Limit', 'No limit'],
            ['lifetimeLimit', 'Lifetime Limit', 'No limit'],
          ].map(([key, label, placeholder]) => (
            <label key={key}><span className="label">{label}</span><input className="input-field" value={form[key]} onChange={(event) => set(key, event.target.value)} placeholder={placeholder} /></label>
          ))}
          <label><span className="label">Cooldown Period</span><select className="select-field" value={form.cooldown} onChange={(event) => set('cooldown', event.target.value)}><option>No Cooldown</option><option>1 Day</option><option>7 Days</option><option>30 Days</option></select></label>
          <label><span className="label">Member Tier Restriction</span><select className="select-field" value={form.tier} onChange={(event) => set('tier', event.target.value)}><option>All Tiers</option><option>Silver+</option><option>Gold+</option><option>Platinum</option><option>Diamond</option></select></label>
          <label><span className="label">Start Date</span><input className="input-field" type="date" value={form.startDate} onChange={(event) => set('startDate', event.target.value)} /></label>
          <label><span className="label">End Date</span><input className="input-field" type="date" value={form.endDate} onChange={(event) => set('endDate', event.target.value)} /></label>
          <div className="md:col-span-2">
            <h3 className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-gray-400">Applicability and Automation</h3>
          </div>
          {['Applicable Categories', 'Applicable Products', 'Applicable Brands', 'Applicable Payment Methods'].map((label) => <label key={label} className="md:col-span-2"><span className="label">{label}</span><input className="input-field" placeholder="All" /></label>)}
          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
            {[
              ['auto', 'Enable Automatically'],
              ['approval', 'Approval Required'],
              ['expire', 'Auto Expire'],
              ['repeat', 'Repeat Rule'],
              ['featured', 'Featured Rule'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl bg-[#F8F9FC] px-4 py-3 text-sm font-black text-gray-700">
                {label}<input type="checkbox" checked={form[key]} onChange={(event) => set(key, event.target.checked)} className="accent-[#EC3F8F]" />
              </label>
            ))}
          </div>
          <label><span className="label">Priority</span><input className="input-field" type="number" min="1" value={form.priority} onChange={(event) => set('priority', Number(event.target.value || 1))} /></label>
          <label><span className="label">Status</span><select className="select-field" value={form.status} onChange={(event) => set('status', event.target.value)}><option>Active</option><option>Scheduled</option><option>Draft</option><option>Disabled</option></select></label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="button" onClick={() => toast.error('Rule preview needs backend validation before it can be accurate')} className="btn-secondary">Preview Rule</button>
          <button type="button" onClick={save} className="rounded-xl bg-[#EC3F8F] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600"><Check size={16} className="inline" /> Save Rule</button>
        </div>
      </section>
    </div>
  )
}

function RewardFormModal({ reward, onClose }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isEdit = Boolean(reward?.id)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(() => ({
    ...emptyReward,
    ...reward,
    points_required: reward?.points_required ?? emptyReward.points_required,
    coupon_value: reward?.coupon_value ?? emptyReward.coupon_value,
    minimum_order_amount: reward?.minimum_order_amount ?? emptyReward.minimum_order_amount,
    gift_product: reward?.gift_product ?? '',
    stock: reward?.stock ?? '',
    per_customer_limit: reward?.per_customer_limit ?? '',
    starts_at: toDateInput(reward?.starts_at),
    ends_at: toDateInput(reward?.ends_at),
    expires_at: toDateInput(reward?.expires_at),
  }))
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(reward?.reward_image_url || null)
  const [clearRewardImage, setClearRewardImage] = useState(false)
  const [physicalSource, setPhysicalSource] = useState(reward?.gift_product ? 'store_product' : 'reward_only')
  const [saveError, setSaveError] = useState('')

  const { data: productsData } = useQuery({
    queryKey: ['reward-gift-products'],
    queryFn: () => productsApi.products.list({ page_size: 300 }).then((r) => r.data),
    enabled: ['gift', 'lucky_box'].includes(form.type),
  })
  const products = unwrapList(productsData)
  const selectedProduct = products.find((product) => String(product.id) === String(form.gift_product))
  const isPhysicalReward = ['gift', 'lucky_box'].includes(form.type)
  const isCouponReward = ['voucher', 'discount'].includes(form.type)
  const isDeliveryReward = form.type === 'free_delivery'
  const usesOrderCondition = isCouponReward || isDeliveryReward

  const saveMutation = useMutation({
    mutationFn: (payload) => isEdit
      ? ordersApi.adminRewards.items.update(reward.id, payload)
      : ordersApi.adminRewards.items.create(payload),
    onMutate: () => setSaveError(''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reward-items'] })
      toast.success(isEdit ? 'Reward updated successfully' : 'Reward created successfully')
      onClose()
    },
    onError: (error) => {
      const message = formatApiError(error.response?.data)
      setSaveError(message)
      toast.error(message)
    },
  })

  const set = (key, value) => {
    setSaveError('')
    setForm((current) => ({ ...current, [key]: value }))
  }

  const setRewardType = (value) => {
    setSaveError('')
    setForm((current) => ({
      ...current,
      type: value,
      gift_product: ['gift', 'lucky_box'].includes(value) ? current.gift_product : '',
      coupon_value: ['voucher', 'discount'].includes(value) ? current.coupon_value : '0.00',
    }))
  }

  const setRewardSource = (source) => {
    setPhysicalSource(source)
    if (source === 'reward_only') set('gift_product', '')
  }

  const displayImage = imagePreview || selectedProduct?.primary_image || null

  const pickImage = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setClearRewardImage(false)
    const reader = new FileReader()
    reader.onload = (readerEvent) => setImagePreview(readerEvent.target.result)
    reader.readAsDataURL(file)
  }

  const selectedTiersList = useMemo(() => {
    const raw = (form.member_tier_requirement || 'all').trim()
    if (raw === 'all' || !raw) return MEMBER_TIERS.map((t) => t.key)
    const list = raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    return list.length ? list : MEMBER_TIERS.map((t) => t.key)
  }, [form.member_tier_requirement])

  const isAllTiers = form.member_tier_requirement === 'all' || !form.member_tier_requirement || selectedTiersList.length === MEMBER_TIERS.length

  const toggleTier = (tierKey) => {
    setSaveError('')
    if (isAllTiers) {
      set('member_tier_requirement', tierKey)
      return
    }
    const current = new Set(selectedTiersList)
    if (current.has(tierKey)) {
      current.delete(tierKey)
    } else {
      current.add(tierKey)
    }
    if (current.size === 0 || current.size === MEMBER_TIERS.length) {
      set('member_tier_requirement', 'all')
    } else {
      const ordered = MEMBER_TIERS.map((t) => t.key).filter((k) => current.has(k))
      set('member_tier_requirement', ordered.join(','))
    }
  }

  const setAllTiers = () => {
    setSaveError('')
    set('member_tier_requirement', 'all')
  }

  const setVipAboveTiers = () => {
    setSaveError('')
    set('member_tier_requirement', 'vip,elite,royal')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSaveError('')
    const values = {
      name: form.name,
      description: form.description || '',
      type: form.type,
      is_active: form.is_active,
      coupon_discount_type: isCouponReward ? form.coupon_discount_type : 'amount',
      points_required: Number(form.points_required || 0),
      coupon_value: isCouponReward ? form.coupon_value || '0.00' : '0.00',
      minimum_order_amount: usesOrderCondition ? form.minimum_order_amount || '0.00' : '0.00',
      member_tier_requirement: form.member_tier_requirement || 'all',
    }
    const payload = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      payload.append(key, value)
    })
    if (isPhysicalReward && form.gift_product) payload.append('gift_product', Number(form.gift_product))
    if (form.stock !== '') payload.append('stock', Number(form.stock))
    if (form.per_customer_limit !== '') payload.append('per_customer_limit', Number(form.per_customer_limit))
    const startsAt = toApiDate(form.starts_at)
    const endsAt = toApiDate(form.ends_at)
    const expiresAt = toApiDate(form.expires_at)
    payload.append('starts_at', startsAt || '')
    payload.append('ends_at', endsAt || '')
    payload.append('expires_at', expiresAt || '')
    if (imageFile) {
      payload.append('reward_image', imageFile)
    }
    if (clearRewardImage) {
      payload.append('clear_reward_image', 'true')
    }
    saveMutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm animate-fade-in">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close reward form" />
      <section className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-[#EC3F8F]">
                <Gift size={16} />
              </span>
              <h2 className="text-lg font-black text-gray-950">{isEdit ? 'Edit Reward Item' : 'Create Reward Item'}</h2>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-gray-400">
              Configure point cost, reward type, and availability rules.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F] transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-gray-50/50 p-5 sm:p-6 space-y-5">
          {/* Top Row: Basic Info & Reward Image */}
          <div className="grid gap-5 lg:grid-cols-12 items-start">
            {/* Basic Info (7 cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-[#EC3F8F]">
                  <Ticket size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-gray-950">Basic Information</h3>
                  <p className="text-[11px] font-semibold text-gray-400">Customer-facing title and description</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Reward Name <span className="text-red-500">*</span></label>
                <input
                  className="input-field mt-1.5 h-11 bg-white text-xs sm:text-sm font-semibold"
                  placeholder="e.g. $5 Off Voucher, Pepsi 330ml Can, Free Delivery..."
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Description (Optional)</label>
                <textarea
                  rows={3}
                  className="input-field mt-1.5 min-h-[88px] resize-none bg-white p-3 text-xs sm:text-sm font-medium leading-relaxed"
                  placeholder="Describe reward perks, restrictions, or instructions for the customer..."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </div>

            {/* Reward Image (5 cols) */}
            <div className="lg:col-span-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Camera size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-black text-gray-950">Reward Image</h3>
                  <p className="text-[11px] font-semibold text-gray-400">Shown on card and reward details</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-4 transition hover:border-[#EC3F8F]/50">
                {displayImage ? (
                  <div className="relative flex aspect-square w-32 items-center justify-center overflow-hidden rounded-xl bg-white p-2 border border-gray-100 shadow-sm">
                    <img src={displayImage} alt="Reward preview" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-gray-300 border border-gray-100 shadow-sm">
                    <Upload size={28} className="text-[#EC3F8F]/60" />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary h-9 px-3.5 text-xs font-bold"
                  >
                    {displayImage ? 'Change Image' : 'Upload Image'}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null)
                        setImagePreview(null)
                        setClearRewardImage(Boolean(reward?.reward_image_url))
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
              </div>
            </div>
          </div>

          {/* Card 2: Reward Type & Configuration */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-[#EC3F8F]">
                <Sparkles size={15} />
              </span>
              <div>
                <h3 className="text-sm font-black text-gray-950">Reward Setup & Type</h3>
                <p className="text-[11px] font-semibold text-gray-400">Choose how points are redeemed and reward value</p>
              </div>
            </div>

            {/* Type Cards Grid */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Reward Type</label>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { value: 'gift', label: 'Gift Product', note: 'Physical gift or product reward', icon: Gift },
                  { value: 'discount', label: 'Discount Coupon', note: 'Fixed dollar or % off purchase', icon: Percent },
                  { value: 'free_delivery', label: 'Free Delivery', note: 'Zero-cost shipping coupon', icon: Truck },
                  { value: 'voucher', label: 'Voucher Code', note: 'Digital coupon code', icon: Ticket },
                  { value: 'lucky_box', label: 'Lucky Box', note: 'Mystery box physical reward', icon: Package },
                  { value: 'manual', label: 'Manual Action', note: 'Staff handled special reward', icon: BadgeCheck },
                ].map((type) => {
                  const isSelected = form.type === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setRewardType(type.value)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                        isSelected
                          ? 'border-[#EC3F8F] bg-pink-50/50 shadow-sm shadow-pink-100 ring-1 ring-[#EC3F8F]'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <span className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        isSelected ? 'bg-[#EC3F8F] text-white' : 'bg-gray-100 text-gray-500'
                      )}>
                        <type.icon size={16} />
                      </span>
                      <div>
                        <span className="block text-xs font-black text-gray-900">{type.label}</span>
                        <span className="mt-0.5 block text-[11px] font-semibold text-gray-400">{type.note}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dynamic Type Configs */}
            {isCouponReward && (
              <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-4">
                <h4 className="text-xs font-black text-gray-900 mb-2.5">Coupon Value Settings</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">Discount Type</label>
                    <select
                      className="select-field mt-1 h-10 bg-white text-xs font-bold"
                      value={form.coupon_discount_type}
                      onChange={(e) => set('coupon_discount_type', e.target.value)}
                    >
                      <option value="amount">Fixed Amount ($)</option>
                      <option value="percent">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">
                      {form.coupon_discount_type === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount ($)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-field mt-1 h-10 bg-white text-xs font-bold"
                      value={form.coupon_value}
                      onChange={(e) => set('coupon_value', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700">Minimum Order ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="input-field mt-1 h-10 bg-white text-xs font-bold"
                      value={form.minimum_order_amount}
                      onChange={(e) => set('minimum_order_amount', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {isPhysicalReward && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900">Physical Item Source</h4>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/products')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EC3F8F] hover:underline"
                  >
                    <Package size={12} /> View Products
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRewardSource('reward_only')}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border p-3 text-left transition',
                      physicalSource === 'reward_only'
                        ? 'border-[#EC3F8F] bg-white ring-1 ring-[#EC3F8F] shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full border flex items-center justify-center', physicalSource === 'reward_only' ? 'border-[#EC3F8F] bg-[#EC3F8F]' : 'border-gray-300')} />
                    <div>
                      <p className="text-xs font-black text-gray-900">Standalone Reward Gift</p>
                      <p className="text-[11px] font-semibold text-gray-400">Exclusive reward not listed in shop</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRewardSource('store_product')}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border p-3 text-left transition',
                      physicalSource === 'store_product'
                        ? 'border-[#EC3F8F] bg-white ring-1 ring-[#EC3F8F] shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    )}
                  >
                    <span className={cn('h-3.5 w-3.5 rounded-full border flex items-center justify-center', physicalSource === 'store_product' ? 'border-[#EC3F8F] bg-[#EC3F8F]' : 'border-gray-300')} />
                    <div>
                      <p className="text-xs font-black text-gray-900">Link Store Product</p>
                      <p className="text-[11px] font-semibold text-gray-400">Deducts from store inventory</p>
                    </div>
                  </button>
                </div>

                {physicalSource === 'store_product' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Select Store Product</label>
                    <select
                      className="select-field h-10 bg-white text-xs font-bold"
                      value={form.gift_product || ''}
                      onChange={(e) => set('gift_product', e.target.value)}
                    >
                      <option value="">-- Choose a product from catalog --</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.code ? `[${product.code}] ` : ''}{product.name} ({formatCurrency(product.price || 0)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Points & Status Row */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700">Points Required to Redeem <span className="text-red-500">*</span></label>
                <div className="relative mt-1.5 flex h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-[#EC3F8F]">
                  <input
                    type="number"
                    min="1"
                    className="h-full w-full border-0 bg-transparent px-3.5 text-base font-black text-gray-900 outline-none"
                    value={form.points_required}
                    onChange={(e) => set('points_required', e.target.value)}
                    required
                  />
                  <span className="shrink-0 bg-gray-50 px-3.5 py-3 text-xs font-bold text-gray-500 border-l border-gray-100">
                    pts
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Reward Status</label>
                <select
                  className="select-field mt-1.5 h-11 bg-white text-xs sm:text-sm font-bold"
                  value={form.is_active ? 'active' : 'archived'}
                  onChange={(e) => set('is_active', e.target.value === 'active')}
                >
                  <option value="active">Active (Visible to customers)</option>
                  <option value="archived">Archived (Hidden from catalog)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Eligibility, Limits & Schedule */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-50 text-[#EC3F8F]">
                <CalendarDays size={15} />
              </span>
              <div>
                <h3 className="text-sm font-black text-gray-950">Rules, Limits & Schedule</h3>
                <p className="text-[11px] font-semibold text-gray-400">Stock limits, member rank requirement, and dates</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-gray-700">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Unlimited if empty"
                  className="input-field mt-1.5 h-11 bg-white text-xs font-semibold"
                  value={form.stock}
                  onChange={(e) => set('stock', e.target.value)}
                />
                <p className="mt-1 text-[11px] font-medium text-gray-400">Total units available to redeem</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Per-Customer Limit</label>
                <input
                  type="number"
                  min="0"
                  placeholder="No limit if empty"
                  className="input-field mt-1.5 h-11 bg-white text-xs font-semibold"
                  value={form.per_customer_limit}
                  onChange={(e) => set('per_customer_limit', e.target.value)}
                />
                <p className="mt-1 text-[11px] font-medium text-gray-400">Max redemptions per customer account</p>
              </div>
            </div>

            {/* Multiple Member Tier Selector */}
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black text-gray-900">Member Tier Requirement</label>
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-black border',
                      isAllTiers
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-pink-50 text-[#EC3F8F] border-pink-200'
                    )}>
                      {isAllTiers ? 'All Members Eligible (8/8)' : `${selectedTiersList.length} Tiers Selected`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-gray-400">
                    Select which membership ranks can redeem this reward. Click tiers to toggle.
                  </p>
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={setAllTiers}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-bold transition border',
                      isAllTiers
                        ? 'bg-[#EC3F8F] text-white border-[#EC3F8F] shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    All Members
                  </button>
                  <button
                    type="button"
                    onClick={setVipAboveTiers}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-bold transition border',
                      !isAllTiers && selectedTiersList.join(',') === 'vip,elite,royal'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    VIP & Above
                  </button>
                </div>
              </div>

              {/* 8-Tier Multi-Select Cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MEMBER_TIERS.map((tier) => {
                  const isSelected = isAllTiers || selectedTiersList.includes(tier.key)
                  return (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => toggleTier(tier.key)}
                      className={cn(
                        'relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition',
                        isSelected
                          ? 'border-[#EC3F8F] bg-white ring-1 ring-[#EC3F8F] shadow-xs'
                          : 'border-gray-200 bg-white/60 hover:border-gray-300 opacity-60 hover:opacity-100'
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-1 border border-gray-100">
                        <img
                          src={getMemberTierImage(tier.key)}
                          alt={tier.name}
                          className="h-full w-full object-contain drop-shadow-xs"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">Lvl {tier.level}</p>
                        <p className="text-xs font-black text-gray-900 truncate mt-0.5">{tier.name}</p>
                      </div>
                      <span className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-md border text-white transition',
                        isSelected ? 'border-[#EC3F8F] bg-[#EC3F8F]' : 'border-gray-300 bg-white'
                      )}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700">Exchange Start Date</label>
                <input
                  type="datetime-local"
                  className="input-field mt-1.5 h-11 bg-white text-xs font-semibold"
                  value={form.starts_at}
                  onChange={(e) => set('starts_at', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Exchange End Date</label>
                <input
                  type="datetime-local"
                  className="input-field mt-1.5 h-11 bg-white text-xs font-semibold"
                  value={form.ends_at}
                  onChange={(e) => set('ends_at', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700">Voucher Expiry Date</label>
                <input
                  type="datetime-local"
                  className="input-field mt-1.5 h-11 bg-white text-xs font-semibold"
                  value={form.expires_at}
                  onChange={(e) => set('expires_at', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-100">
              <AlertCircle size={16} className="shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </form>

        {/* Modal Sticky Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary h-11 px-5 text-xs font-bold sm:text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveMutation.isPending || !form.name || !form.points_required}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#EC3F8F] px-6 text-xs font-bold sm:text-sm text-white shadow-md shadow-pink-200 transition hover:bg-[#d92e7d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saveMutation.isPending ? 'Saving...' : 'Save Reward'}</span>
          </button>
        </div>
      </section>
    </div>
  )
}

export function RewardItemsAdmin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingReward, setEditingReward] = useState(() => getCreateRewardFromSearch(location.search))
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })
  const importInputRef = useRef(null)
  const [confirm, ConfirmDialog] = useConfirm()
  const queryClient = useQueryClient()

  useEffect(() => {
    const createReward = getCreateRewardFromSearch(location.search)
    if (createReward) setEditingReward(createReward)
  }, [location.search])

  const closeRewardForm = () => {
    setEditingReward(null)
    const params = new URLSearchParams(location.search)
    if (params.get('new') === '1') {
      params.delete('new')
      params.delete('type')
      navigate({
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      }, { replace: true })
    }
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-reward-items', search, typeFilter, page],
    queryFn: () => ordersApi.adminRewards.items.list({
      search: search || undefined,
      type: typeFilter || undefined,
      page,
      page_size: 10,
    }).then((r) => r.data),
  })
  const rewards = unwrapList(data)
  const { data: redemptionsRaw } = useQuery({
    queryKey: ['admin-reward-redemptions', 'product-counts'],
    queryFn: () => ordersApi.adminRewards.redemptions.list({ page_size: 300 }).then((r) => r.data),
  })
  const redemptionCounts = unwrapList(redemptionsRaw).reduce((acc, item) => {
    acc[item.reward_item] = (acc[item.reward_item] || 0) + 1
    return acc
  }, {})
  const displayRewards = rewards.map((reward) => ({
    id: reward.id,
    name: reward.name,
    category: reward.type_label || reward.type || reward.category || 'Reward',
    type: reward.type || '',
    points_required: Number(reward.points_required ?? reward.points ?? 0),
    stock: reward.stock ?? 'Unlimited',
    redeemed_count: Number(redemptionCounts[reward.id] ?? reward.redeemed_count ?? reward.redeemed ?? 0),
    is_active: reward.is_active ?? reward.status === 'Active',
    member_tier_requirement: reward.member_tier_requirement || 'all',
    created_at: reward.created_at || '2026-06-28',
    reward_image_url: reward.reward_image_url,
    gift_product_image: reward.gift_product_image,
    gift_product_name: reward.gift_product_name,
    raw: reward,
  }))
  const rewardCategories = useMemo(() => {
    const categories = [...new Set(displayRewards.map((reward) => reward.category).filter(Boolean))]
    return categories.length ? categories : ['Voucher', 'Shipping', 'Product', 'Lucky Box']
  }, [displayRewards])
  const visibleRewards = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = displayRewards.filter((reward) => {
      const haystack = `${reward.name} ${reward.category} ${reward.type} ${reward.gift_product_name || ''}`.toLowerCase()
      const typeName = REWARD_TYPES.find((type) => type.value === typeFilter)?.label?.toLowerCase()
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
      const matchesType = !typeFilter || haystack.includes(typeFilter.replace('_', ' ')) || (typeName && haystack.includes(typeName))
      const matchesStatus = !statusFilter || (statusFilter === 'active' ? reward.is_active : !reward.is_active)
      const matchesCategory = !categoryFilter || reward.category === categoryFilter
      const matchesTier = !tierFilter || (() => {
        const req = (reward.member_tier_requirement || 'all').toLowerCase()
        if (tierFilter === 'all') return req === 'all'
        if (req === 'all') return true
        const list = req.split(',').map((t) => t.trim())
        return list.includes(tierFilter.toLowerCase())
      })()
      return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesTier
    })
    return [...filtered].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * direction
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction
    })
  }, [displayRewards, search, typeFilter, statusFilter, categoryFilter, tierFilter, sortConfig])

  const selectedRewards = visibleRewards.filter((reward) => selectedIds.includes(String(reward.id)))
  const allVisibleSelected = visibleRewards.length > 0 && selectedRewards.length === visibleRewards.length
  const stats = {
    total: data?.count ?? displayRewards.length,
    active: displayRewards.filter((reward) => reward.is_active).length,
    redeemed: displayRewards.reduce((sum, reward) => sum + reward.redeemed_count, 0),
    outOfStock: displayRewards.filter((reward) => reward.stock !== 'Unlimited' && Number(reward.stock || 0) <= 0).length,
    categories: rewardCategories.length,
  }

  const sortBy = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleSelection = (id) => {
    const value = String(id)
    setSelectedIds((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  const toggleAllVisible = () => {
    setSelectedIds(allVisibleSelected ? [] : visibleRewards.map((reward) => String(reward.id)))
  }

  const toggleMutation = useMutation({
    mutationFn: (id) => ordersApi.adminRewards.items.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reward-items'] })
      toast.success('Reward status updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => ordersApi.adminRewards.items.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reward-items'] })
      toast.success('Reward deleted')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not delete reward'),
  })

  const deleteReward = async (reward) => {
    if (!reward.raw) {
      toast.error('This reward is not available from the server.')
      return
    }
    const ok = await confirm('Delete reward?', `Delete "${reward.name}"? Existing redemption history will stay protected.`, {
      confirmText: 'Delete',
      icon: 'delete',
    })
    if (ok) deleteMutation.mutate(reward.raw.id)
  }

  const bulkSetActive = async (active) => {
    const realRewards = selectedRewards.filter((reward) => reward.raw && reward.is_active !== active)
    if (!realRewards.length) {
      toast('Selected rewards already have that status')
      setSelectedIds([])
      return
    }
    await Promise.all(realRewards.map((reward) => ordersApi.adminRewards.items.toggleActive(reward.raw.id)))
    queryClient.invalidateQueries({ queryKey: ['admin-reward-items'] })
    toast.success(active ? 'Selected rewards activated' : 'Selected rewards deactivated')
    setSelectedIds([])
  }

  const bulkDelete = async () => {
    const ok = await confirm('Delete selected rewards?', `Delete ${selectedRewards.length} selected reward${selectedRewards.length === 1 ? '' : 's'}? Existing redemption history will stay protected.`, {
      confirmText: 'Delete',
      icon: 'delete',
    })
    if (!ok) return
    const realRewards = selectedRewards.filter((reward) => reward.raw)
    if (!realRewards.length) {
      toast.error('No server rewards selected')
      setSelectedIds([])
      return
    }
    await Promise.all(realRewards.map((reward) => ordersApi.adminRewards.items.delete(reward.raw.id)))
    queryClient.invalidateQueries({ queryKey: ['admin-reward-items'] })
    toast.success('Selected rewards deleted')
    setSelectedIds([])
  }

  const exportRewards = () => {
    const columns = ['Reward Name', 'Category', 'Points Required', 'Stock', 'Redeemed', 'Status']
    const rows = visibleRewards.map((reward) => [
      reward.name,
      reward.category,
      reward.points_required,
      reward.stock,
      reward.redeemed_count,
      reward.is_active ? 'Active' : 'Archived',
    ])
    const csv = [columns, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'shadow-shop-rewards.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Rewards exported')
  }

  const handleImport = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    toast.error('Reward import needs a backend import endpoint before it can save data.')
    event.target.value = ''
  }

  const duplicateReward = (reward) => {
    if (!reward.raw) {
      toast.error('This reward is not available from the server.')
      return
    }
    const { id, created_at, updated_at, reward_image_url, gift_product_image, type_label, can_exchange, ...copy } = reward.raw
    setEditingReward({ ...copy, name: `${reward.name} Copy`, is_active: false })
  }

  const hasActiveFilters = Boolean(search || typeFilter || statusFilter || categoryFilter || tierFilter)
  const resetFilters = () => {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setCategoryFilter('')
    setTierFilter('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward Catalog"
        subtitle="Manage reward items, vouchers, discount coupons, and gifts customers can exchange with points"
        breadcrumbs={[{ label: 'Marketing' }, { label: 'Rewards' }, { label: 'Reward Catalog' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="btn-secondary h-10 text-xs font-bold sm:text-sm"
              title="Go to product catalog"
            >
              <Package size={15} />
              <span>Products ↗</span>
            </button>
            <button
              type="button"
              onClick={exportRewards}
              className="btn-secondary h-10 text-xs font-bold sm:text-sm"
              title="Export reward items as CSV"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingReward({})}
              className="btn-primary h-10 text-xs font-bold sm:text-sm shadow-md shadow-pink-200"
            >
              <Plus size={16} />
              <span>New Reward</span>
            </button>
          </div>
        }
      />

      {/* 4 Clean Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Rewards</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-[#EC3F8F]">
              <Gift size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-950">{stats.total.toLocaleString()} <span className="text-xs font-bold text-gray-400">items</span></p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">In reward inventory</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Rewards</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Check size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600">{stats.active.toLocaleString()} <span className="text-xs font-bold text-gray-400">active</span></p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">Visible for customer exchange</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Redeemed</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Eye size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-purple-700">{stats.redeemed.toLocaleString()} <span className="text-xs font-bold text-gray-400">times</span></p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">Claimed by members</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Out of Stock</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
              <ShoppingCart size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-950">{stats.outOfStock.toLocaleString()} <span className="text-xs font-bold text-gray-400">items</span></p>
          <p className="mt-1 text-[11px] font-semibold text-orange-500">Needs inventory restock</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
        {/* Filters Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field h-10 pl-9 text-xs sm:text-sm"
                placeholder="Search reward name or product..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            <select
              className="select-field h-10 w-36 text-xs sm:text-sm"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            >
              <option value="">All Types</option>
              {REWARD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              className="select-field h-10 w-32 text-xs sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>

            <select
              className="select-field h-10 w-36 text-xs sm:text-sm"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="">All Tiers</option>
              <option value="classic">Classic</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
              <option value="diamond">Diamond</option>
              <option value="vip">VIP</option>
              <option value="elite">Elite</option>
              <option value="royal">Royal</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">
              Showing <strong className="text-gray-900 font-bold">{visibleRewards.length}</strong> rewards
            </span>
          </div>
        </div>

        {selectedRewards.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 bg-pink-50 px-5 py-3">
            <p className="text-xs font-black text-[#EC3F8F]">{selectedRewards.length} reward{selectedRewards.length === 1 ? '' : 's'} selected</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => bulkSetActive(true)}
                className="btn-secondary h-8 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
              >
                <Check size={13} /> Activate
              </button>
              <button
                type="button"
                onClick={() => bulkSetActive(false)}
                className="btn-secondary h-8 px-3 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                <Archive size={13} /> Deactivate
              </button>
              <button
                type="button"
                onClick={bulkDelete}
                className="btn-secondary h-8 px-3 text-xs font-bold text-red-600 hover:bg-red-50 border-red-200"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}

        {isError && (
          <div className="m-5 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-red-700">Rewards could not load</p>
                <p className="text-xs font-semibold text-red-500">Check the API connection and retry.</p>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="btn-secondary h-9 px-4 text-xs font-bold text-red-700"
              >
                <RotateCw size={14} className="inline mr-1" /> Retry
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-[#EC3F8F]" />
            <p className="mt-3 text-xs font-bold">Loading rewards catalog...</p>
          </div>
        ) : visibleRewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-[#EC3F8F]">
              <Gift size={28} />
            </span>
            <h3 className="mt-3 text-base font-bold text-gray-950">No rewards found</h3>
            <p className="mt-1 text-xs text-gray-400 max-w-sm">
              {hasActiveFilters ? 'Try clearing filters or search term.' : 'Create discounts, gift items, or vouchers for customers to redeem with points.'}
            </p>
            <button
              type="button"
              onClick={() => setEditingReward({})}
              className="btn-primary mt-4 h-10 px-5 text-xs font-bold"
            >
              <Plus size={15} /> Create Reward
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="w-12 px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select all rewards"
                    />
                  </th>
                  <th className="w-12 px-3 py-3.5 text-center">No</th>
                  <th className="w-16 px-3 py-3.5 text-center">Image</th>
                  <th className="px-4 py-3.5">
                    <button type="button" onClick={() => sortBy('name')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Reward Name
                    </button>
                  </th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5 text-right">
                    <button type="button" onClick={() => sortBy('points_required')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                      Points Required
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    <button type="button" onClick={() => sortBy('stock')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                      Stock
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-right">
                    <button type="button" onClick={() => sortBy('redeemed_count')} className="inline-flex items-center gap-1 hover:text-gray-900 ml-auto">
                      Redeemed
                    </button>
                  </th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="w-28 px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleRewards.map((reward, index) => (
                  <tr key={reward.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]"
                        checked={selectedIds.includes(String(reward.id))}
                        onChange={() => toggleSelection(reward.id)}
                        aria-label={`Select ${reward.name}`}
                      />
                    </td>
                    <td className="px-3 py-3.5 text-center text-xs font-bold text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <RewardThumb reward={reward} fallbackIndex={index} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-gray-950">{reward.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-medium text-gray-400">
                          {reward.gift_product_name || 'Point Reward Item'}
                        </span>
                        {reward.member_tier_requirement && reward.member_tier_requirement !== 'all' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200" title={`Allowed tiers: ${reward.member_tier_requirement}`}>
                            <Crown size={10} />
                            {reward.member_tier_requirement.split(',').map((t) => t.trim().toUpperCase()).join(', ')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                            All Tiers
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-bold text-[#EC3F8F] border border-pink-100">
                        {reward.category}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-black text-gray-900">
                      {reward.points_required.toLocaleString()} <span className="text-xs font-bold text-gray-400">pts</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-bold text-gray-700">
                      {reward.stock === 'Unlimited' ? (
                        <span className="text-gray-400">Unlimited</span>
                      ) : Number(reward.stock) <= 0 ? (
                        <span className="text-red-500 font-black">Out of stock</span>
                      ) : (
                        <span>{reward.stock}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-gray-600">
                      {reward.redeemed_count.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => reward.raw ? toggleMutation.mutate(reward.raw.id) : toast.error('Reward status cannot be changed without a server record')}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border transition',
                          reward.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        )}
                        title="Click to toggle status"
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', reward.is_active ? 'bg-emerald-500' : 'bg-gray-400')} />
                        <span>{reward.is_active ? 'Active' : 'Archived'}</span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => reward.raw ? setEditingReward(reward.raw) : toast.error('Reward edit is not available')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F] transition"
                          title="Edit Reward"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateReward(reward)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-purple-50 hover:text-purple-600 transition"
                          title="Duplicate Reward"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteReward(reward)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                          title="Delete Reward"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {(data?.previous || data?.next) && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <p className="text-xs font-semibold text-gray-400">Total {data?.count || 0} rewards</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs font-bold"
                disabled={!data?.previous}
                onClick={() => setPage((v) => Math.max(1, v - 1))}
              >
                Previous
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EC3F8F] text-xs font-bold text-white shadow-sm">
                {page}
              </span>
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs font-bold"
                disabled={!data?.next}
                onClick={() => setPage((v) => v + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {editingReward && <RewardFormModal reward={editingReward} onClose={closeRewardForm} />}
      {ConfirmDialog}

      {editingReward && <RewardFormModal reward={editingReward} onClose={closeRewardForm} />}
      {ConfirmDialog}
    </div>
  )
}

export function RewardStockAdmin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [draftStocks, setDraftStocks] = useState({})
  const [savingId, setSavingId] = useState(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-reward-stock'],
    queryFn: () => ordersApi.adminRewards.items.list({ page_size: 300 }).then((r) => r.data),
  })

  const rewardItems = unwrapList(data).filter((reward) => ['gift', 'lucky_box', 'manual'].includes(reward.type))
  const stockRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return rewardItems
      .map((reward) => {
        const currentStock = reward.stock === null || reward.stock === undefined ? null : Number(reward.stock || 0)
        const stockStatus = currentStock === null ? 'unlimited' : currentStock <= 0 ? 'out' : currentStock <= 5 ? 'low' : 'healthy'
        return {
          ...reward,
          currentStock,
          stockStatus,
          image: reward.reward_image_url || reward.gift_product_image,
          productLabel: reward.gift_product_name || reward.type_label || 'Reward item',
        }
      })
      .filter((reward) => {
        const haystack = `${reward.name} ${reward.productLabel} ${reward.gift_product_code || ''}`.toLowerCase()
        const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)
        const matchesStatus = !statusFilter || reward.stockStatus === statusFilter
        return matchesSearch && matchesStatus
      })
  }, [rewardItems, search, statusFilter])

  const stats = {
    tracked: rewardItems.filter((reward) => reward.stock !== null && reward.stock !== undefined).length,
    unlimited: rewardItems.filter((reward) => reward.stock === null || reward.stock === undefined).length,
    low: rewardItems.filter((reward) => reward.stock !== null && reward.stock !== undefined && Number(reward.stock || 0) > 0 && Number(reward.stock || 0) <= 5).length,
    out: rewardItems.filter((reward) => reward.stock !== null && reward.stock !== undefined && Number(reward.stock || 0) <= 0).length,
  }

  const updateMutation = useMutation({
    mutationFn: ({ reward, stock }) => {
      const payload = { stock: stock === null ? null : Math.max(0, Number(stock || 0)) }
      return ordersApi.adminRewards.items.update(reward.id, payload)
    },
    onMutate: ({ reward }) => setSavingId(reward.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reward-stock'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reward-items'] })
      toast.success('Reward stock updated')
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Could not update reward stock'),
    onSettled: () => setSavingId(null),
  })

  const displayStock = (reward) => {
    if (Object.prototype.hasOwnProperty.call(draftStocks, reward.id)) return draftStocks[reward.id]
    return reward.currentStock === null ? '' : String(reward.currentStock)
  }

  const setDraftStock = (reward, value) => {
    setDraftStocks((current) => ({ ...current, [reward.id]: value }))
  }

  const saveStock = (reward, stockValue = displayStock(reward)) => {
    const nextStock = stockValue === '' || stockValue === null ? null : Number(stockValue)
    if (nextStock !== null && (Number.isNaN(nextStock) || nextStock < 0)) {
      toast.error('Stock must be 0 or more')
      return
    }
    updateMutation.mutate({ reward, stock: nextStock })
  }

  const adjustStock = (reward, delta) => {
    const base = reward.currentStock === null ? 0 : Number(displayStock(reward) || 0)
    const nextStock = Math.max(0, base + delta)
    setDraftStock(reward, String(nextStock))
    saveStock(reward, nextStock)
  }

  return (
    <div className="space-y-5 bg-[#F8F9FC]">
      <div className="rounded-2xl border border-pink-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EC3F8F]">Reward Stock</p>
            <h1 className="mt-1 text-2xl font-black text-gray-950">Control stock for point reward products</h1>
            <p className="mt-1 text-sm font-semibold text-gray-500">Use this page for exchange stock only. Normal shop stock still stays in Products.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/admin/rewards/products?new=1&type=gift')} className="btn-primary h-11">
              <Plus size={16} /> Add Reward Product
            </button>
            <button type="button" onClick={() => navigate('/admin/rewards/products')} className="btn-secondary h-11">
              <Gift size={16} /> Reward Products
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: 'Tracked Stock', value: stats.tracked, icon: Warehouse, tone: 'bg-pink-50 text-[#EC3F8F]' },
          { title: 'Unlimited', value: stats.unlimited, icon: Package, tone: 'bg-sky-50 text-sky-600' },
          { title: 'Low Stock', value: stats.low, icon: AlertCircle, tone: 'bg-amber-50 text-amber-600' },
          { title: 'Out of Stock', value: stats.out, icon: ShoppingCart, tone: 'bg-red-50 text-red-600' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', item.tone)}>
                <item.icon size={22} />
              </span>
              <div>
                <p className="text-xs font-black text-gray-500">{item.title}</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{Number(item.value || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field h-11 bg-[#F8F9FC] pl-9" placeholder="Search reward stock..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select-field h-11 bg-[#F8F9FC]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Stock</option>
            <option value="healthy">Healthy</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
            <option value="unlimited">Unlimited</option>
          </select>
          <button type="button" onClick={() => refetch()} className="btn-secondary h-11">
            <RotateCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-gray-950">Reward Stock Items</h2>
            <p className="mt-1 text-xs font-semibold text-gray-400">Add, deduct, or set unlimited exchange stock.</p>
          </div>
          <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-[#EC3F8F]">{stockRows.length} items</span>
        </div>

        {isError && (
          <div className="m-5 rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-black text-red-700">Reward stock could not load</p>
            <button type="button" onClick={() => refetch()} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-black text-red-600 shadow-sm">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(6)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#FBFCFE]">
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-gray-400">Reward Product</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-gray-400">Type</th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-gray-400">Points</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-gray-400">Status</th>
                  <th className="px-5 py-4 text-center text-xs font-black uppercase text-gray-400">Stock</th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stockRows.map((reward, index) => {
                  const isUnlimited = reward.currentStock === null && !Object.prototype.hasOwnProperty.call(draftStocks, reward.id)
                  const statusStyles = {
                    healthy: 'bg-emerald-50 text-emerald-700',
                    low: 'bg-amber-50 text-amber-700',
                    out: 'bg-red-50 text-red-700',
                    unlimited: 'bg-sky-50 text-sky-700',
                  }
                  const statusLabel = {
                    healthy: 'Healthy',
                    low: 'Low Stock',
                    out: 'Out of Stock',
                    unlimited: 'Unlimited',
                  }
                  return (
                    <tr key={reward.id} className="border-b border-gray-50 transition hover:bg-pink-50/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <RewardThumb reward={reward} fallbackIndex={index} />
                          <div className="min-w-0">
                            <p className="truncate font-black text-gray-950">{reward.name}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-gray-400">{reward.productLabel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-600">{reward.type_label || reward.type}</span></td>
                      <td className="px-5 py-4 text-right font-black text-gray-900">{Number(reward.points_required || 0).toLocaleString()}</td>
                      <td className="px-5 py-4"><span className={cn('rounded-full px-3 py-1 text-xs font-black', statusStyles[reward.stockStatus])}>{statusLabel[reward.stockStatus]}</span></td>
                      <td className="px-5 py-4">
                        <div className="mx-auto grid w-[190px] grid-cols-[38px_1fr_38px] items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                          <button type="button" disabled={savingId === reward.id} onClick={() => adjustStock(reward, -1)} className="flex h-10 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"><Minus size={15} /></button>
                          <input
                            className="h-10 min-w-0 border-x border-gray-200 text-center text-sm font-black text-gray-950 outline-none"
                            type="number"
                            min="0"
                            placeholder="Unlimited"
                            value={displayStock(reward)}
                            onChange={(e) => setDraftStock(reward, e.target.value)}
                          />
                          <button type="button" disabled={savingId === reward.id} onClick={() => adjustStock(reward, 1)} className="flex h-10 items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"><Plus size={15} /></button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" disabled={savingId === reward.id} onClick={() => saveStock(reward)} className="rounded-xl bg-[#EC3F8F] px-3 py-2 text-xs font-black text-white shadow-sm disabled:opacity-50">
                            {savingId === reward.id ? <Loader2 size={14} className="inline animate-spin" /> : <Check size={14} className="inline" />} Save
                          </button>
                          <button type="button" disabled={savingId === reward.id || isUnlimited} onClick={() => saveStock(reward, '')} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 disabled:opacity-50">Unlimited</button>
                          <button type="button" onClick={() => navigate(`/admin/rewards/products?new=0`)} className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-black text-gray-600">Products</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {stockRows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-[#EC3F8F]"><Warehouse size={30} /></span>
                <h2 className="mt-4 text-lg font-black text-gray-950">No reward stock items found</h2>
                <p className="mt-1 max-w-sm text-sm font-semibold text-gray-400">Create a Gift Product, Lucky Box, or Manual reward first.</p>
                <button type="button" onClick={() => navigate('/admin/rewards/products?new=1&type=gift')} className="mt-5 rounded-xl bg-[#EC3F8F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-200">
                  <Plus size={16} className="inline" /> Add Reward Product
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function RewardRedemptionsAdmin() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reward-redemptions', status, search],
    queryFn: () => ordersApi.adminRewards.redemptions.list({ status: status || undefined, search: search || undefined }).then((r) => r.data),
  })
  const redemptions = unwrapList(data)

  const statusMutation = useMutation({
    mutationFn: ({ id, nextStatus }) => ordersApi.adminRewards.redemptions.updateStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reward-redemptions'] })
      toast.success('Redemption status updated')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not update status'),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reward Exchange Orders</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage customer reward exchanges, fulfillment, delivery, and status updates</p>
        </div>
      </div>
      <div className="form-card">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search reward order, customer, item, or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select-field w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {REDEMPTION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reward Order ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reward Item</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Points Used</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Delivery Address</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((item) => (
                  <tr key={item.id} className="data-table-row">
                    <td className="px-4 py-3 font-mono text-xs font-black text-gray-700">RW-{String(item.id).padStart(5, '0')}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{item.user_name}</p>
                      <p className="text-xs text-gray-400">{item.user_phone || item.user_email || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                          {item.reward_image_url || item.gift_product_image ? (
                            <img src={item.reward_image_url || item.gift_product_image} alt={item.gift_product_name || item.reward_name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <Award size={16} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{item.reward_name}</p>
                          {item.gift_product_name && <p className="truncate text-xs text-gray-400">{item.gift_product_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{item.points_spent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">Customer address</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        className="select-field w-36 capitalize"
                        value={item.status}
                        onChange={(e) => statusMutation.mutate({ id: item.id, nextStatus: e.target.value })}
                      >
                        {REDEMPTION_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toast.success(`Reward order RW-${String(item.id).padStart(5, '0')}`)}
                          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-pink-50 hover:text-[#E91E73]"
                        >
                          View Detail
                        </button>
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ id: item.id, nextStatus: 'cancelled' })}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {redemptions.length === 0 && <div className="py-16 text-center text-gray-400">No redemptions found</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function PointsAdjustModal({ customer, onClose }) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState('add')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const adjustMutation = useMutation({
    mutationFn: () => ordersApi.adminRewards.points.adjust({
      user: customer.user,
      points: mode === 'deduct' ? -Math.abs(Number(amount)) : Math.abs(Number(amount)),
      note,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reward-points'] })
      toast.success('Points adjusted')
      onClose()
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not adjust points'),
  })

  return (
    <Modal isOpen onClose={onClose} title={`Adjust Points - ${customer.name}`} size="md">
      <div className="space-y-4 p-6">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-500">Current balance</p>
          <p className="mt-1 text-3xl font-black text-purple-600">{customer.points.toLocaleString()} pts</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setMode('add')} className={cn('rounded-xl px-4 py-3 text-sm font-bold', mode === 'add' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
            <Plus size={15} className="mx-auto mb-1" /> Add
          </button>
          <button onClick={() => setMode('deduct')} className={cn('rounded-xl px-4 py-3 text-sm font-bold', mode === 'deduct' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500')}>
            <Minus size={15} className="mx-auto mb-1" /> Deduct
          </button>
        </div>
        <label>
          <span className="label">Points</span>
          <input className="input-field" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          <span className="label">Note</span>
          <textarea className="input-field min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for this manual adjustment" />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => adjustMutation.mutate()} disabled={!amount || adjustMutation.isPending} className="btn-primary disabled:opacity-50">
            {adjustMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <SlidersHorizontal size={16} />}
            Apply
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CustomerPointsHistoryModal({ customer, onClose, onOpenAdjust }) {
  const [filterType, setFilterType] = useState('all') // 'all', 'earned', 'redeemed'
  const { data: rawTx, isLoading } = useQuery({
    queryKey: ['admin-customer-transactions', customer?.user],
    queryFn: () => ordersApi.adminRewards.transactions.list({ user: customer.user, page_size: 100 }).then((r) => r.data),
    enabled: Boolean(customer?.user),
  })

  const transactions = useMemo(() => {
    const list = unwrapList(rawTx)
    if (filterType === 'earned') return list.filter((t) => Number(t.points) > 0)
    if (filterType === 'redeemed') return list.filter((t) => Number(t.points) < 0)
    return list
  }, [rawTx, filterType])

  const totalEarned = customer?.stats?.earned ?? 0
  const totalRedeemed = customer?.stats?.redeemed ?? 0

  return (
    <Modal isOpen onClose={onClose} title={`Point History - ${customer?.name || 'Customer'}`} size="lg">
      <div className="space-y-4 p-6">
        {/* Customer Points Summary Header */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-pink-100 bg-pink-50/50 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Current Balance</p>
            <p className="mt-1 text-2xl font-black text-[#EC3F8F]">
              {Number(customer?.points || 0).toLocaleString()} <span className="text-xs font-bold text-gray-500">pts</span>
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Earned</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">
              +{totalEarned.toLocaleString()} <span className="text-xs font-bold text-gray-500">pts</span>
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Redeemed</p>
            <p className="mt-1 text-2xl font-black text-red-500">
              -{totalRedeemed.toLocaleString()} <span className="text-xs font-bold text-gray-500">pts</span>
            </p>
          </div>
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Transactions' },
              { id: 'earned', label: 'Earned (+)' },
              { id: 'redeemed', label: 'Redeemed (-)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition',
                  filterType === tab.id
                    ? 'bg-[#EC3F8F] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {onOpenAdjust && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenAdjust(customer)
              }}
              className="btn-secondary h-8 px-3 text-xs font-bold"
            >
              <SlidersHorizontal size={13} />
              <span>Adjust Points</span>
            </button>
          )}
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin text-[#EC3F8F]" />
            <p className="mt-2 text-xs font-bold">Loading point history...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm font-bold text-gray-600">No point transactions found</p>
            <p className="text-xs text-gray-400">This customer has not earned or redeemed any points yet.</p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto rounded-xl border border-gray-100 shadow-inner">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500 shadow-sm">
                <tr>
                  <th className="w-12 px-3 py-2.5 text-center">No</th>
                  <th className="px-3 py-2.5">Date & Time</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Order / Ref</th>
                  <th className="px-3 py-2.5 text-right">Points</th>
                  <th className="px-3 py-2.5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {transactions.map((tx, idx) => {
                  const pts = Number(tx.points || 0)
                  const isPositive = pts > 0
                  return (
                    <tr key={tx.id || idx} className="hover:bg-gray-50/80 transition">
                      <td className="px-3 py-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-600">
                        {tx.created_at ? formatDate(tx.created_at) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
                          tx.type === 'purchase' ? 'bg-blue-50 text-blue-700' :
                          tx.type === 'signup' ? 'bg-emerald-50 text-emerald-700' :
                          tx.type === 'daily_checkin' ? 'bg-cyan-50 text-cyan-700' :
                          tx.type === 'review' ? 'bg-amber-50 text-amber-700' :
                          tx.type === 'referral' ? 'bg-indigo-50 text-indigo-700' :
                          tx.type === 'adjust' ? 'bg-purple-50 text-purple-700' :
                          tx.type === 'redeem' ? 'bg-rose-50 text-rose-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {tx.type || 'Transaction'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-bold text-gray-800">
                        {tx.order_number ? `#${tx.order_number}` : '-'}
                      </td>
                      <td className={cn(
                        'whitespace-nowrap px-3 py-2.5 text-right font-black',
                        isPositive ? 'text-emerald-600' : 'text-red-500'
                      )}>
                        {isPositive ? `+${pts.toLocaleString()}` : pts.toLocaleString()} pts
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-gray-500" title={tx.note || ''}>
                        {tx.note || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-xs font-bold">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function RewardPointsAdmin() {
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [historyCustomer, setHistoryCustomer] = useState(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-reward-points', search],
    queryFn: () => ordersApi.adminRewards.points.list({ search: search || undefined }).then((r) => r.data),
  })
  const { data: transactionRaw } = useQuery({
    queryKey: ['admin-reward-transactions', 'customer-points'],
    queryFn: () => ordersApi.adminRewards.transactions.list({ page_size: 1000 }).then((r) => r.data),
  })
  const transactionStats = unwrapList(transactionRaw).reduce((acc, item) => {
    const userId = String(item.user)
    acc[userId] = acc[userId] || { earned: 0, redeemed: 0 }
    const points = Number(item.points || 0)
    if (points > 0) acc[userId].earned += points
    if (points < 0) acc[userId].redeemed += Math.abs(points)
    return acc
  }, {})

  const totals = useMemo(() => ({
    customers: data.length,
    points: data.reduce((sum, item) => sum + Number(item.points || 0), 0),
  }), [data])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Customer Points</h1>
          <p className="mt-0.5 text-sm text-gray-500">View point balances and manually add or deduct points</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-purple-100 bg-purple-50/60 p-4">
        <div className="flex items-start gap-3">
          <SlidersHorizontal size={18} className="mt-0.5 text-purple-600" />
          <div>
            <p className="text-sm font-black text-purple-900">Manual earn rewards</p>
            <p className="mt-1 text-sm leading-6 text-purple-700">
              Use Adjust to add points for review rewards, invite friend bonuses, daily check-in campaigns, VIP gifts, or lucky spin wins until those flows are automated.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="kpi-card flex items-center gap-4">
          <UserRound className="text-purple-500" />
          <div><p className="text-sm text-gray-500">Customers</p><p className="text-2xl font-black text-gray-900">{totals.customers}</p></div>
        </div>
        <div className="kpi-card flex items-center gap-4">
          <Award className="text-pink-500" />
          <div><p className="text-sm text-gray-500">Total Points</p><p className="text-2xl font-black text-gray-900">{totals.points.toLocaleString()}</p></div>
        </div>
      </div>

      <div className="form-card">
        <div className="relative mb-4 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-14 px-4 py-3 text-center font-medium text-gray-500">No</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Current Points</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Earned</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total Redeemed</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((customer, index) => {
                  const stats = transactionStats[String(customer.user)] || { earned: 0, redeemed: 0 }
                  const isActive = Number(customer.points || 0) > 0 || stats.earned > 0
                  return (
                    <tr key={customer.user} className="data-table-row">
                      <td className="px-4 py-3 text-center text-xs font-semibold text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{customer.name}</td>
                      <td className="px-4 py-3 text-gray-500">{customer.email || customer.phone || '-'}</td>
                      <td className="px-4 py-3 text-right font-black text-[#E91E73]">{customer.points.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600">{stats.earned.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">{stats.redeemed.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-black', isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setHistoryCustomer({ ...customer, stats })}
                            className="btn-secondary ml-auto"
                            title="View points transaction history"
                          >
                            <FileText size={15} /> View History
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="btn-secondary ml-auto"
                            title="Adjust customer point balance"
                          >
                            <SlidersHorizontal size={15} /> Adjust Points
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {data.length === 0 && <div className="py-16 text-center text-gray-400">No customers found</div>}
          </div>
        )}
      </div>

      {selectedCustomer && <PointsAdjustModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
      {historyCustomer && (
        <CustomerPointsHistoryModal
          customer={historyCustomer}
          onClose={() => setHistoryCustomer(null)}
          onOpenAdjust={(c) => setSelectedCustomer(c)}
        />
      )}
    </div>
  )
}

export function RewardTransactionsAdmin() {
  const [filters, setFilters] = useState({ date_from: '', search: '', type: '' })
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reward-transactions', filters],
    queryFn: () => ordersApi.adminRewards.transactions.list({
      search: filters.search || undefined,
      type: filters.type || undefined,
      date_from: filters.date_from || undefined,
      page_size: 200,
    }).then((r) => r.data),
  })

  const apiTransactions = unwrapList(data)
  const transactions = useMemo(() => {
    return apiTransactions.map((item) => {
      const points = Number(item.points || 0)
      const rawType = String(item.type || (points < 0 ? 'redeem' : 'purchase')).toLowerCase()
      const isExpired = item.expires_at && new Date(item.expires_at) < new Date() && points > 0
      return {
        id: item.id,
        transactionId: `TXN-${String(item.id).padStart(5, '0')}`,
        customer: item.user_name || item.customer_name || 'Customer',
        user: item.user,
        type: isExpired ? 'expired' : rawType,
        note: item.note || '-',
        points,
        date: item.created_at || new Date().toISOString(),
        reference: item.order_number || (item.order ? `#${item.order}` : '-'),
        order: item.order,
        expiresAt: item.expires_at,
        raw: item,
      }
    })
  }, [apiTransactions])

  const stats = useMemo(() => {
    const issued = transactions.filter((t) => t.points > 0).reduce((sum, t) => sum + t.points, 0)
    const redeemed = Math.abs(transactions.filter((t) => t.points < 0).reduce((sum, t) => sum + t.points, 0))
    const net = issued - redeemed
    return {
      issued,
      redeemed,
      net,
      total: data?.count ?? transactions.length,
    }
  }, [transactions, data])

  const exportTransactions = (format) => {
    const columns = ['No', 'Transaction ID', 'Customer', 'Type', 'Points', 'Order Reference', 'Date', 'Note']
    const rows = transactions.map((t, idx) => [
      idx + 1,
      t.transactionId,
      t.customer,
      t.type,
      t.points,
      t.reference,
      formatDate(t.date),
      t.note,
    ])
    const csv = [columns, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reward-transactions.${format === 'excel' ? 'xls' : 'csv'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(format === 'excel' ? 'Excel file downloaded' : 'CSV file downloaded')
  }

  const hasActiveFilters = Boolean(filters.search || filters.type || filters.date_from)
  const resetFilters = () => setFilters({ date_from: '', search: '', type: '' })

  const getTypeBadge = (type) => {
    switch (type) {
      case 'purchase':
        return { label: 'Purchase Order', color: 'bg-blue-50 text-blue-700 border-blue-100' }
      case 'signup':
        return { label: 'Sign-up Bonus', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
      case 'daily_checkin':
        return { label: 'Daily Check-in', color: 'bg-cyan-50 text-cyan-700 border-cyan-100' }
      case 'review':
        return { label: 'Review Reward', color: 'bg-amber-50 text-amber-700 border-amber-100' }
      case 'referral':
        return { label: 'Referral Bonus', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' }
      case 'adjust':
        return { label: 'Manual Adjust', color: 'bg-purple-50 text-purple-700 border-purple-100' }
      case 'redeem':
        return { label: 'Reward Redeem', color: 'bg-rose-50 text-rose-700 border-rose-100' }
      case 'expired':
        return { label: 'Expired', color: 'bg-gray-100 text-gray-600 border-gray-200' }
      default:
        return { label: type || 'Transaction', color: 'bg-gray-100 text-gray-700 border-gray-200' }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reward Transactions"
        subtitle="Audit ledger of all customer point earnings, redemptions, and manual adjustments"
        breadcrumbs={[{ label: 'Marketing' }, { label: 'Rewards' }, { label: 'Transactions' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary h-10 text-xs font-bold sm:text-sm"
              title="Refresh transaction data"
            >
              <RotateCw size={15} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => exportTransactions('csv')}
              className="btn-secondary h-10 text-xs font-bold sm:text-sm"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportTransactions('excel')}
              className="btn-secondary h-10 text-xs font-bold sm:text-sm"
            >
              <FileText size={15} />
              <span>Export Excel</span>
            </button>
          </div>
        }
      />

      {/* 4 Clean Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Points Issued</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Plus size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-950">+{stats.issued.toLocaleString()} <span className="text-xs font-bold text-gray-400">pts</span></p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">Accumulated earned points</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Points Redeemed</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <Minus size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-950">-{stats.redeemed.toLocaleString()} <span className="text-xs font-bold text-gray-400">pts</span></p>
          <p className="mt-1 text-[11px] font-semibold text-rose-500">Spent on vouchers & rewards</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Net Circulation</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Award size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-purple-700">{stats.net >= 0 ? `+${stats.net.toLocaleString()}` : stats.net.toLocaleString()} <span className="text-xs font-bold text-gray-400">pts</span></p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">Current active customer balance</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Transactions</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Clock size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-950">{stats.total.toLocaleString()} <span className="text-xs font-bold text-gray-400">events</span></p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">Logged in audit system</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
        {/* Filters Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field h-10 pl-9 text-xs sm:text-sm"
                placeholder="Search by customer, order #, or note..."
                value={filters.search}
                onChange={(e) => set('search', e.target.value)}
              />
            </div>

            <select
              className="select-field h-10 w-44 text-xs sm:text-sm"
              value={filters.type}
              onChange={(e) => set('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="purchase">Purchase Orders</option>
              <option value="signup">Sign-up Bonuses</option>
              <option value="daily_checkin">Daily Check-in</option>
              <option value="review">Review Rewards</option>
              <option value="referral">Referral Bonuses</option>
              <option value="adjust">Manual Adjustments</option>
              <option value="redeem">Reward Redemptions</option>
            </select>

            <input
              type="date"
              className="input-field h-10 w-40 text-xs sm:text-sm"
              value={filters.date_from}
              onChange={(e) => set('date_from', e.target.value)}
              title="Filter from date"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
              >
                <X size={14} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-gray-400">
            Showing <strong className="text-gray-900 font-bold">{transactions.length}</strong> transactions
          </div>
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-[#EC3F8F]" />
            <p className="mt-3 text-xs font-bold">Loading point transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
              <FileText size={28} />
            </span>
            <h3 className="mt-3 text-base font-bold text-gray-900">No transactions found</h3>
            <p className="mt-1 text-xs text-gray-400">
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Points transactions will appear here as customers earn and redeem rewards.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="w-14 px-4 py-3.5 text-center">No</th>
                  <th className="px-4 py-3.5">Txn ID</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Order / Ref</th>
                  <th className="px-4 py-3.5 text-right">Points</th>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Note</th>
                  <th className="w-20 px-4 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx, idx) => {
                  const badge = getTypeBadge(tx.type)
                  const isPositive = tx.points > 0
                  return (
                    <tr key={tx.id || idx} className="hover:bg-gray-50/70 transition">
                      <td className="px-4 py-3.5 text-center text-xs font-bold text-gray-400">{idx + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs font-bold text-gray-700">
                        {tx.transactionId}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {tx.customer}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold', badge.color)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-gray-600">
                        {tx.reference !== '-' ? (
                          <span className="font-mono text-xs font-bold text-gray-800">{tx.reference}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className={cn(
                        'whitespace-nowrap px-4 py-3.5 text-right font-black',
                        isPositive ? 'text-emerald-600' : 'text-rose-500'
                      )}>
                        {isPositive ? `+${tx.points.toLocaleString()}` : tx.points.toLocaleString()} pts
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-gray-500">
                        {formatDate(tx.date)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3.5 text-xs text-gray-500" title={tx.note}>
                        {tx.note}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTransaction(tx)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F] transition"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTransaction && (
        <TransactionDetailsDrawer
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  )
}

function exportTextReceipt(transaction) {
  const lines = [
    '========================================',
    '       SHADOW SHOP REWARD RECEIPT       ',
    '========================================',
    `Transaction ID : ${transaction.transactionId}`,
    `Customer       : ${transaction.customer}`,
    `Type           : ${transaction.type}`,
    `Points         : ${transaction.points >= 0 ? '+' : ''}${transaction.points.toLocaleString()} pts`,
    `Date           : ${formatDate(transaction.date)}`,
    `Reference      : ${transaction.reference}`,
    `Note           : ${transaction.note || '-'}`,
    '========================================',
    'Thank you for being a valued member!',
  ]
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${transaction.transactionId}-receipt.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('Receipt downloaded')
}

function TransactionDetailsDrawer({ transaction, onClose }) {
  const isPositive = transaction.points > 0

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-gray-950/35 backdrop-blur-sm animate-fade-in">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Transaction Details</h2>
            <p className="font-mono text-xs font-semibold text-gray-400">{transaction.transactionId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Main Points Card */}
          <div className={cn(
            'rounded-2xl border p-4 text-center',
            isPositive ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'
          )}>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Points Transacted</p>
            <p className={cn('mt-1 text-3xl font-black', isPositive ? 'text-emerald-600' : 'text-rose-500')}>
              {isPositive ? `+${transaction.points.toLocaleString()}` : transaction.points.toLocaleString()} <span className="text-sm font-bold text-gray-500">pts</span>
            </p>
            <p className="mt-1 text-xs font-semibold capitalize text-gray-500">
              Type: {transaction.type}
            </p>
          </div>

          {/* Customer Overview */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Customer</h3>
            <p className="mt-1 text-base font-bold text-gray-900">{transaction.customer}</p>
          </div>

          {/* Details breakdown */}
          <div className="space-y-3 rounded-xl border border-gray-100 p-4 text-xs sm:text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Date & Time</span>
              <span className="font-semibold text-gray-900 text-right">{formatDate(transaction.date)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Order Reference</span>
              <span className="font-mono font-bold text-gray-900 text-right">{transaction.reference}</span>
            </div>
            {transaction.expiresAt && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Expires At</span>
                <span className="font-semibold text-amber-600 text-right">{formatDate(transaction.expiresAt)}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-3">
              <span className="block text-gray-500">Note / Reason</span>
              <p className="mt-1 text-gray-800 font-medium leading-relaxed">{transaction.note || '-'}</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 p-4">
          <button
            type="button"
            onClick={() => exportTextReceipt(transaction)}
            className="btn-secondary h-9 px-3 text-xs font-bold"
          >
            <Download size={14} />
            <span>Download Receipt</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary h-9 px-4 text-xs font-bold"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  )
}

function StatusBadge({ value }) {
  const normalized = String(value || '').toLowerCase()
  const active = ['active', 'approved', 'completed', 'scheduled', 'delivered'].includes(normalized)
  const pending = ['pending', 'packed', 'shipped'].includes(normalized)
  return (
    <span className={cn(
      'rounded-full px-2.5 py-1 text-xs font-black capitalize',
      active ? 'bg-emerald-50 text-emerald-700' : pending ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'
    )}>
      {value}
    </span>
  )
}

function PlaceholderActionButton({ icon: Icon = Plus, children }) {
  return (
    <button type="button" onClick={() => toast.error(`${children} is not connected to a backend endpoint yet`)} className="btn-primary">
      <Icon size={16} /> {children}
    </button>
  )
}

export function RewardMemberTiersAdmin() {
  return (
    <div className="space-y-5">
      <PageHeader title="Member Tiers" subtitle="Define VIP levels, thresholds, and benefits for loyal customers" />
      <div className="grid gap-4 xl:grid-cols-4">
        {MEMBER_TIERS.map((tier) => {
          const Icon = tier.name === 'Diamond' ? Diamond : Crown
          return (
            <div key={tier.name} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <span className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', tier.color)}>
                <Icon size={22} />
              </span>
              <h2 className="mt-4 text-xl font-black text-gray-950">{tier.name}</h2>
              <p className="mt-1 text-sm font-bold text-gray-400">{tier.range}</p>
              <div className="mt-4 space-y-2">
                {tier.benefits.map((benefit) => (
                  <p key={benefit} className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <Check size={15} className="text-emerald-500" /> {benefit}
                  </p>
                ))}
              </div>
              <button type="button" onClick={() => toast.error('Member tier editing needs a backend endpoint before it can save')} className="mt-5 w-full rounded-xl bg-gray-100 px-4 py-3 text-sm font-black text-gray-700 hover:bg-pink-50 hover:text-[#EC3F8F]">
                Edit Tier
              </button>
            </div>
          )
        })}
      </div>
      <div className="form-card">
        <h2 className="text-base font-black text-gray-950">Tier comparison</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Benefit</th>
                {MEMBER_TIERS.map((tier) => <th key={tier.name} className="px-4 py-3 text-center font-medium text-gray-500">{tier.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {['Birthday Gift', 'Free Shipping', 'VIP Discount', 'Exclusive Rewards', 'Early Access'].map((benefit) => (
                <tr key={benefit} className="data-table-row">
                  <td className="px-4 py-3 font-semibold text-gray-900">{benefit}</td>
                  {MEMBER_TIERS.map((tier) => (
                    <td key={`${tier.name}-${benefit}`} className="px-4 py-3 text-center">
                      {tier.benefits.includes(benefit) ? <Check size={17} className="mx-auto text-emerald-500" /> : <span className="text-gray-300">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function RewardCouponsAdmin() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingPromo, setEditingPromo] = useState(null)
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [confirm, ConfirmDialog] = useConfirm()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-promo-codes', search],
    queryFn: () => ordersApi.adminRewards.promoCodes.list({
      search: search || undefined,
      page_size: 500,
    }).then((r) => r.data),
  })
  const promoCodes = unwrapList(data)
  const activePromos = promoCodes.filter((item) => item.is_active)
  const usedCount = promoCodes.reduce((sum, item) => sum + Number(item.usage_count || 0), 0)
  const usageLimit = promoCodes.reduce((sum, item) => sum + Number(item.usage_limit || 0), 0)
  const percentUsed = usageLimit ? Math.round((usedCount / usageLimit) * 100) : 0

  const toggleMutation = useMutation({
    mutationFn: (id) => ordersApi.adminRewards.promoCodes.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] })
      toast.success('Promo status updated')
    },
    onError: (error) => toast.error(formatApiError(error.response?.data, 'Could not update promo code')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => ordersApi.adminRewards.promoCodes.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] })
      toast.success('Promo code deleted')
    },
    onError: (error) => toast.error(formatApiError(error.response?.data, 'Could not delete promo code')),
  })

  const copyCoupon = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(`Copied ${code}`)
    } catch {
      toast.error('Copy failed')
    }
  }

  const requestDelete = async (promo) => {
    const ok = await confirm('Delete promo code?', `Delete ${promo.code}? Used order history will stay protected.`, {
      confirmText: 'Delete',
      cancelText: 'Keep',
      tone: 'danger',
      icon: 'warning',
    })
    if (ok) deleteMutation.mutate(promo.id)
  }

  const exportCoupons = () => {
    const header = ['Coupon Code', 'Name', 'Type', 'Apply Scope', 'Value', 'Minimum Order', 'Max Discount', 'Usage', 'Per Customer', 'Start Date', 'End Date', 'Status']
    const rows = promoCodes.map((promo) => [
      promo.code,
      promo.name,
      promoLabel(promo),
      applyScopeLabel(promo),
      promoValue(promo),
      formatCurrency(promo.minimum_order_amount || 0),
      promo.max_discount_amount ? formatCurrency(promo.max_discount_amount) : '',
      `${promo.usage_count || 0}/${promo.usage_limit || 'unlimited'}`,
      promo.per_customer_limit || 'unlimited',
      promo.starts_at ? formatDate(promo.starts_at) : '',
      promo.ends_at ? formatDate(promo.ends_at) : '',
      promo.is_active ? 'Active' : 'Inactive',
    ])
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `promo-codes-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Promo codes exported')
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Promo Codes</h1>
          <p className="mt-0.5 text-sm text-gray-500">Create public cart codes for product discounts, delivery discounts, and free delivery.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportCoupons} disabled={!promoCodes.length} className="btn-secondary h-11">
            <Download size={16} /> Export
          </button>
          <button type="button" onClick={() => { setEditingPromo(null); setShowPromoModal(true) }} className="btn-primary h-11">
            <Plus size={16} /> New Coupon Code
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PremiumKpiCard title="Promo Codes" value={promoCodes.length.toLocaleString()} trend="Admin-created cart codes" icon={Ticket} tone="bg-pink-50 text-[#EC3F8F]" />
        <PremiumKpiCard title="Active Codes" value={activePromos.length.toLocaleString()} trend="Ready for checkout" icon={Check} tone="bg-emerald-50 text-emerald-600" />
        <PremiumKpiCard title="Uses" value={usedCount.toLocaleString()} trend={usageLimit ? `${percentUsed}% of total limit` : 'No total limit set'} icon={Percent} tone="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="form-card overflow-hidden">
          <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-9" placeholder="Search code or name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button type="button" onClick={() => refetch()} className="btn-secondary h-11">
              <RotateCw size={16} /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Coupon Code</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Benefit</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Apply Scope</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Min Order</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Usage</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Valid Until</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((promo) => (
                  <tr key={promo.id} className="data-table-row">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => copyCoupon(promo.code)} className="font-mono text-xs font-black text-gray-800 underline-offset-2 hover:text-[#EC3F8F] hover:underline">
                        {promo.code}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{promo.name}</td>
                    <td className="px-4 py-3 font-black text-[#EC3F8F]">{promoValue(promo)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="font-semibold">{applyScopeLabel(promo)}</p>
                      {promo.apply_scope === 'categories' && promo.target_category_names?.length > 0 && (
                        <p className="mt-0.5 max-w-[180px] truncate text-xs text-gray-400">{promo.target_category_names.join(', ')}</p>
                      )}
                      {promo.apply_scope === 'products' && promo.target_product_names?.length > 0 && (
                        <p className="mt-0.5 max-w-[180px] truncate text-xs text-gray-400">{promo.target_product_names.join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(promo.minimum_order_amount || 0)}</td>
                    <td className="px-4 py-3 text-gray-600">{promo.usage_count || 0} / {promo.usage_limit || 'Unlimited'}</td>
                    <td className="px-4 py-3 text-gray-500">{promo.ends_at ? formatDate(promo.ends_at) : 'No expiry'}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleMutation.mutate(promo.id)} disabled={toggleMutation.isPending} className="disabled:opacity-60">
                        <StatusBadge value={promo.is_active ? 'Active' : 'Inactive'} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => copyCoupon(promo.code)} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-pink-50 hover:text-[#EC3F8F]" title="Copy code">
                          <Copy size={15} />
                        </button>
                        <button onClick={() => { setEditingPromo(promo); setShowPromoModal(true) }} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => requestDelete(promo)} className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isLoading && <p className="py-8 text-center text-sm font-semibold text-gray-400">Loading promo codes...</p>}
          {isError && (
            <div className="py-8 text-center">
              <p className="text-sm font-black text-red-600">Promo codes could not load.</p>
              <button onClick={() => refetch()} className="mt-3 btn-secondary">Retry</button>
            </div>
          )}
          {!isLoading && !isError && promoCodes.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pink-50 text-[#EC3F8F]">
                <Ticket size={24} />
              </div>
              <p className="mt-4 text-sm font-black text-gray-800">No promo codes yet</p>
              <p className="mt-1 text-xs font-semibold text-gray-400">Create a public cart promo code for product or delivery discounts.</p>
              <button onClick={() => { setEditingPromo(null); setShowPromoModal(true) }} className="btn-primary mx-auto mt-4">
                <Plus size={16} /> New Coupon Code
              </button>
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-gray-950">Coupon usage</h2>
          <div className="mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full border-[22px] border-pink-500 border-r-gray-100 border-t-pink-200">
            <div className="text-center">
              <p className="text-3xl font-black text-gray-950">{percentUsed}%</p>
              <p className="text-xs font-bold text-gray-400">Used</p>
            </div>
          </div>
          <div className="mt-7 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-500">Active</span>
              <span className="font-black text-emerald-600">{activePromos.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-500">Total Uses</span>
              <span className="font-black text-[#EC3F8F]">{usedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-500">Total</span>
              <span className="font-black text-gray-900">{promoCodes.length}</span>
            </div>
          </div>
        </div>
      </div>

      {showPromoModal && (
        <PromoCodeModal
          promo={editingPromo}
          onClose={() => {
            setShowPromoModal(false)
            setEditingPromo(null)
          }}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}

function formatCouponDiscount(coupon) {
  if (coupon.reward_type === 'free_delivery') return 'Free delivery'
  const value = Number(coupon.coupon_value || 0)
  return coupon.coupon_discount_type === 'percent' ? `${value}%` : formatCurrency(value)
}

const emptyPromoCode = {
  name: '',
  code: '',
  discount_type: 'percent',
  value: '10.00',
  apply_to: 'products',
  apply_scope: 'all_products',
  target_categories: [],
  target_products: [],
  minimum_order_amount: '0.00',
  max_discount_amount: '',
  usage_limit: '',
  per_customer_limit: '1',
  customer_scope: 'all',
  starts_at: '',
  ends_at: '',
  priority: 1,
  is_active: true,
}

function promoValue(promo) {
  if (promo.discount_type === 'free_delivery') return 'Free delivery'
  const value = Number(promo.value || 0)
  return promo.discount_type === 'percent' ? `${value}%` : formatCurrency(value)
}

function promoLabel(promo) {
  if (promo.discount_type === 'free_delivery') return 'Free Delivery'
  return promo.discount_type === 'percent' ? 'Percentage' : 'Fixed Amount'
}

function applyToLabel(value) {
  if (value === 'delivery') return 'Delivery Fee'
  if (value === 'order') return 'Products + Delivery'
  return 'Products Only'
}

function applyScopeLabel(promoOrScope) {
  const value = typeof promoOrScope === 'string' ? promoOrScope : promoOrScope?.apply_scope
  if (value === 'categories') return 'Selected Categories'
  if (value === 'products') return 'Selected Products'
  if (value === 'delivery') return 'Delivery Fee'
  if (value === 'order') return 'Products + Delivery'
  return 'All Products'
}

function applyToFromScope(scope) {
  if (scope === 'delivery') return 'delivery'
  if (scope === 'order') return 'order'
  return 'products'
}

function generatePromoCode() {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SHADOW-${part}`
}

function PromoCodeModal({ promo, onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => ({
    ...emptyPromoCode,
    ...(promo || {}),
    apply_scope: promo?.apply_scope || (promo?.apply_to === 'delivery' ? 'delivery' : promo?.apply_to === 'order' ? 'order' : 'all_products'),
    target_categories: (promo?.target_categories || []).map(String),
    target_products: (promo?.target_products || []).map(String),
    starts_at: toDateInput(promo?.starts_at),
    ends_at: toDateInput(promo?.ends_at),
    max_discount_amount: promo?.max_discount_amount || '',
    usage_limit: promo?.usage_limit || '',
    per_customer_limit: promo?.per_customer_limit ?? '1',
  }))
  const { data: categoriesData } = useQuery({
    queryKey: ['promo-target-categories'],
    queryFn: () => productsApi.categories.list({ page_size: 300 }).then((r) => r.data),
  })
  const { data: productsData } = useQuery({
    queryKey: ['promo-target-products'],
    queryFn: () => productsApi.products.list({ page_size: 300, is_active: true }).then((r) => r.data),
  })
  const categories = unwrapList(categoriesData)
  const products = unwrapList(productsData)
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const setApplyScope = (value) => {
    setForm((current) => ({
      ...current,
      apply_scope: value,
      apply_to: applyToFromScope(value),
      target_categories: value === 'categories' ? current.target_categories : [],
      target_products: value === 'products' ? current.target_products : [],
    }))
  }
  const toggleTarget = (key, value) => {
    const id = String(value)
    setForm((current) => {
      const selected = current[key] || []
      return {
        ...current,
        [key]: selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id],
      }
    })
  }
  const effectiveScope = form.discount_type === 'free_delivery' ? 'delivery' : form.apply_scope
  const isDeliveryPromo = effectiveScope === 'delivery'
  const missingTargets = (effectiveScope === 'categories' && form.target_categories.length === 0) || (effectiveScope === 'products' && form.target_products.length === 0)
  const preview = form.discount_type === 'free_delivery'
    ? `${form.code || 'CODE'} gives free delivery on orders over ${formatCurrency(form.minimum_order_amount || 0)}.`
    : `${form.code || 'CODE'} gives ${form.discount_type === 'percent' ? `${Number(form.value || 0)}%` : formatCurrency(form.value || 0)} off ${applyScopeLabel(effectiveScope).toLowerCase()} over ${formatCurrency(form.minimum_order_amount || 0)}.`

  const saveMutation = useMutation({
    mutationFn: () => {
      const applyScope = form.discount_type === 'free_delivery' ? 'delivery' : form.apply_scope
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        starts_at: toApiDate(form.starts_at),
        ends_at: toApiDate(form.ends_at),
        max_discount_amount: form.max_discount_amount === '' ? null : form.max_discount_amount,
        usage_limit: form.usage_limit === '' ? null : form.usage_limit,
        per_customer_limit: form.per_customer_limit === '' ? null : form.per_customer_limit,
        value: form.discount_type === 'free_delivery' ? '0.00' : form.value,
        apply_scope: applyScope,
        apply_to: applyToFromScope(applyScope),
        target_categories: applyScope === 'categories' ? form.target_categories.map(Number) : [],
        target_products: applyScope === 'products' ? form.target_products.map(Number) : [],
      }
      return promo
        ? ordersApi.adminRewards.promoCodes.update(promo.id, payload)
        : ordersApi.adminRewards.promoCodes.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promo-codes'] })
      toast.success(promo ? 'Promo code updated' : 'Promo code created')
      onClose()
    },
    onError: (error) => toast.error(formatApiError(error.response?.data, 'Could not save promo code')),
  })

  return (
    <Modal isOpen onClose={onClose} title={promo ? 'Edit Coupon Code' : 'New Coupon Code'} size="xl">
      <div className="space-y-5 p-6">
        <div>
          <label className="label">Name</label>
          <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Summer Sale 10% OFF" />
          <p className="mt-1 text-xs font-semibold text-gray-400">Internal name for this promotion</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Discount Type</label>
            <select
              className="select-field"
              value={form.discount_type}
              onChange={(e) => {
                set('discount_type', e.target.value)
                if (e.target.value === 'free_delivery') setApplyScope('delivery')
              }}
            >
              <option value="percent">Percentage %</option>
              <option value="amount">Fixed Amount</option>
              <option value="free_delivery">Free Delivery</option>
            </select>
          </div>
          <div>
            <label className="label">{form.discount_type === 'percent' ? 'Value (%)' : 'Value (USD)'}</label>
            <input className="input-field" type="number" min="0" max={form.discount_type === 'percent' ? 100 : undefined} step="0.01" disabled={form.discount_type === 'free_delivery'} value={form.discount_type === 'free_delivery' ? '0.00' : form.value} onChange={(e) => set('value', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Coupon Code</label>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input className="input-field font-mono font-black uppercase" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="SUMMER10" />
            <button type="button" onClick={() => set('code', generatePromoCode())} className="btn-secondary h-11">
              <RotateCw size={16} /> Generate
            </button>
          </div>
          <p className="mt-1 text-xs font-semibold text-gray-400">Must be unique. Use letters, numbers, hyphen, or underscore.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Apply Scope</label>
            <select className="select-field" disabled={form.discount_type === 'free_delivery'} value={effectiveScope} onChange={(e) => setApplyScope(e.target.value)}>
              <option value="all_products">All Products</option>
              <option value="categories">Selected Categories</option>
              <option value="products">Selected Products</option>
              <option value="delivery">Delivery Fee</option>
              <option value="order">Products + Delivery</option>
            </select>
            <p className="mt-1 text-xs font-semibold text-gray-400">Choose where this coupon can discount.</p>
          </div>
          <div>
            <label className="label">Max Discount Amount (USD)</label>
            <input className="input-field" type="number" min="0" step="0.01" disabled={isDeliveryPromo} value={isDeliveryPromo ? '' : form.max_discount_amount} onChange={(e) => set('max_discount_amount', e.target.value)} placeholder="Optional" />
          </div>
        </div>

        {effectiveScope === 'categories' && (
          <div>
            <label className="label">Category Targeting</label>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
              {categories.map((category) => (
                <label key={category.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 hover:bg-pink-50">
                  <input
                    type="checkbox"
                    checked={form.target_categories.includes(String(category.id))}
                    onChange={() => toggleTarget('target_categories', category.id)}
                    className="h-4 w-4 accent-[#EC3F8F]"
                  />
                  <span>{category.name}</span>
                </label>
              ))}
              {categories.length === 0 && <p className="px-3 py-4 text-center text-sm font-semibold text-gray-400">No categories found</p>}
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-400">Select one or more categories.</p>
          </div>
        )}

        {effectiveScope === 'products' && (
          <div>
            <label className="label">Product Targeting</label>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
              {products.map((product) => (
                <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 hover:bg-pink-50">
                  <input
                    type="checkbox"
                    checked={form.target_products.includes(String(product.id))}
                    onChange={() => toggleTarget('target_products', product.id)}
                    className="h-4 w-4 accent-[#EC3F8F]"
                  />
                  <span className="min-w-0 truncate">{product.code} - {product.name}</span>
                </label>
              ))}
              {products.length === 0 && <p className="px-3 py-4 text-center text-sm font-semibold text-gray-400">No products found</p>}
            </div>
            <p className="mt-1 text-xs font-semibold text-gray-400">Only selected product lines receive this discount.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Min Order Amount (USD)</label>
            <input className="input-field" type="number" min="0" step="0.01" value={form.minimum_order_amount} onChange={(e) => set('minimum_order_amount', e.target.value)} />
            <p className="mt-1 text-xs font-semibold text-gray-400">Minimum product subtotal to use this coupon</p>
          </div>
          <div>
            <label className="label">Customer Scope</label>
            <select className="select-field" value={form.customer_scope} onChange={(e) => set('customer_scope', e.target.value)}>
              <option value="all">All Customers</option>
              <option value="new">New Customers Only</option>
              <option value="staff">Staff Only</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Usage Limit (total)</label>
            <input className="input-field" type="number" min="0" value={form.usage_limit} onChange={(e) => set('usage_limit', e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Limit per Customer</label>
            <input className="input-field" type="number" min="0" value={form.per_customer_limit} onChange={(e) => set('per_customer_limit', e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Start Date</label>
            <input className="input-field" type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input className="input-field" type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Priority</label>
            <input className="input-field" type="number" min="0" value={form.priority} onChange={(e) => set('priority', e.target.value)} />
          </div>
          <label className="mt-7 flex items-center gap-3 text-sm font-black text-gray-800">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-5 w-5 accent-[#EC3F8F]" />
            Active - enforce at checkout
          </label>
        </div>

        <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-pink-500">Preview</p>
          <p className="mt-1 text-sm font-bold text-gray-800">{preview}</p>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <button type="button" onClick={onClose} className="btn-secondary h-11">Cancel</button>
          <button type="button" disabled={saveMutation.isPending || !form.name.trim() || !form.code.trim() || missingTargets} onClick={() => saveMutation.mutate()} className="btn-primary h-11 disabled:opacity-60">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {promo ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function RewardCampaignsAdmin() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Campaigns</h1>
          <p className="mt-0.5 text-sm text-gray-500">Plan double-points events, referral boosts, and seasonal rewards</p>
        </div>
        <PlaceholderActionButton icon={Plus}>Create Campaign</PlaceholderActionButton>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CAMPAIGNS.map((campaign) => (
          <div key={campaign.name} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-[#EC3F8F]"><Zap size={20} /></span>
              <StatusBadge value={campaign.status} />
            </div>
            <h2 className="mt-4 text-lg font-black text-gray-950">{campaign.name}</h2>
            <p className="mt-1 text-sm font-semibold text-gray-400">{campaign.period}</p>
            <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm font-black text-gray-700">{campaign.reward}</p>
            <button type="button" onClick={() => toast.error('Campaign editing needs a backend endpoint before it can save')} className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-pink-50 hover:text-[#EC3F8F]">
              Edit Campaign
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RewardCategoriesAdmin() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reward Categories</h1>
          <p className="mt-0.5 text-sm text-gray-500">Organize customer rewards into clear exchange groups</p>
        </div>
        <PlaceholderActionButton icon={FolderKanban}>Add Category</PlaceholderActionButton>
      </div>
      <div className="form-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category Name</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Reward Count</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {REWARD_CATEGORIES.map(([name, count, status]) => (
              <tr key={name} className="data-table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-[#EC3F8F]"><Layers3 size={18} /></span>
                    <span className="font-semibold text-gray-900">{name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-black text-gray-800">{count}</td>
                <td className="px-4 py-3"><StatusBadge value={status} /></td>
                <td className="px-4 py-3 text-right"><button className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-pink-50 hover:text-[#EC3F8F]"><Edit3 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RewardNotificationsAdmin() {
  return (
    <div className="space-y-5">
      <PageHeader title="Email & Notifications" subtitle="Control reward lifecycle templates for email, Telegram, and app notifications" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="form-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Template Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Subject</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_TEMPLATES.map(([name, subject, status]) => (
                <tr key={name} className="data-table-row">
                  <td className="px-4 py-3 font-semibold text-gray-900">{name}</td>
                  <td className="px-4 py-3 text-gray-500">{subject}</td>
                  <td className="px-4 py-3"><StatusBadge value={status} /></td>
                  <td className="px-4 py-3 text-right"><button className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-pink-50 hover:text-[#EC3F8F]"><Edit3 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-gray-950">Notification Settings</h2>
          <div className="mt-4 space-y-3">
            {[['Email', Mail], ['Telegram', Send], ['Push notification', BellRing]].map(([label, Icon]) => (
              <label key={label} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-bold text-gray-700"><Icon size={16} className="text-[#EC3F8F]" /> {label}</span>
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RewardAutomationAdmin() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Automation Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">Automate reward issuing, deductions, alerts, reminders, and notifications</p>
        </div>
        <PlaceholderActionButton icon={Check}>Save Settings</PlaceholderActionButton>
      </div>
      <div className="form-card grid gap-3 md:grid-cols-2">
        {AUTOMATION_ITEMS.map((item, index) => (
          <label key={item} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-4">
            <span className="flex items-center gap-3 text-sm font-black text-gray-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#EC3F8F] shadow-sm">
                {index < 2 ? <Bot size={17} /> : <BellRing size={17} />}
              </span>
              {item}
            </span>
            <input type="checkbox" defaultChecked={index < 5} />
          </label>
        ))}
      </div>
    </div>
  )
}

function AdminToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-[#EC3F8F]' : 'bg-gray-200'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

export function RewardSettingsAdmin() {
  const queryClient = useQueryClient()
  const [activeSection, setActiveSection] = useState('earning')
  const [editingTier, setEditingTier] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reward-settings'],
    queryFn: () => ordersApi.adminRewards.settings.get().then((r) => r.data),
  })
  const [settings, setSettings] = useState(null)
  const values = settings || data
  const hasChanges = settings !== null
  const set = (key, value) => setSettings((current) => ({ ...(current || data), [key]: value }))

  const saveMutation = useMutation({
    mutationFn: () => ordersApi.adminRewards.settings.update(values),
    onSuccess: (response) => {
      queryClient.setQueryData(['admin-reward-settings'], response.data)
      setSettings(null)
      toast.success('Reward settings saved successfully')
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Could not save reward settings'),
  })

  const tierLadder = useMemo(() => [
    {
      key: 'classic_min_points',
      descKey: 'classic_description',
      descKmKey: 'classic_description_km',
      tierKey: 'classic',
      lvl: 1,
      name: 'Classic',
      defaultPoints: 0,
      defaultDesc: 'Welcome to our membership programme. Enjoy basic member benefits and earn points on purchases.',
      defaultDescKm: 'សូមស្វាគមន៍មកកាន់កម្មវិធីសមាជិករបស់យើង។ រីករាយជាមួយអត្ថប្រយោជន៍ជាមូលដ្ឋាន និងសន្សំពិន្ទុរាល់ពេលទិញទំនិញ។',
      color: 'text-slate-700 bg-slate-100 border-slate-200'
    },
    {
      key: 'silver_min_points',
      descKey: 'silver_description',
      descKmKey: 'silver_description_km',
      tierKey: 'silver',
      lvl: 2,
      name: 'Silver',
      defaultPoints: 500,
      defaultDesc: 'Enjoy additional rewards, exclusive discounts, and special member promotions.',
      defaultDescKm: 'ទទួលបានរង្វាន់បន្ថែម ការបញ្ចុះតម្លៃពិសេស និងប្រូម៉ូសិនផ្ដាច់មុខសម្រាប់សមាជិក។',
      color: 'text-gray-700 bg-gray-100 border-gray-200'
    },
    {
      key: 'gold_min_points',
      descKey: 'gold_description',
      descKmKey: 'gold_description_km',
      tierKey: 'gold',
      lvl: 3,
      name: 'Gold',
      defaultPoints: 1500,
      defaultDesc: 'Unlock better rewards, higher discounts, and exclusive shopping privileges.',
      defaultDescKm: 'ដោះសោរង្វាន់កាន់តែប្រសើរ ការបញ្ចុះតម្លៃកាន់តែខ្ពស់ និងសិទ្ធិទិញទំនិញផ្តាច់មុខ។',
      color: 'text-amber-800 bg-amber-100 border-amber-200'
    },
    {
      key: 'platinum_min_points',
      descKey: 'platinum_description',
      descKmKey: 'platinum_description_km',
      tierKey: 'platinum',
      lvl: 4,
      name: 'Platinum',
      defaultPoints: 3000,
      defaultDesc: 'Enjoy premium benefits, birthday rewards, and priority access to special promotions.',
      defaultDescKm: 'រីករាយជាមួយអត្ថប្រយោជន៍កម្រិតខ្ពស់ រង្វាន់ថ្ងៃកំណើត និងសិទ្ធិចូលមើលការលក់ពិសេសមុនគេ។',
      color: 'text-cyan-800 bg-cyan-100 border-cyan-200'
    },
    {
      key: 'diamond_min_points',
      descKey: 'diamond_description',
      descKmKey: 'diamond_description_km',
      tierKey: 'diamond',
      lvl: 5,
      name: 'Diamond',
      defaultPoints: 6000,
      defaultDesc: 'Experience enhanced privileges, premium vouchers, and exclusive member offers.',
      defaultDescKm: 'ទទួលបានបទពិសោធន៍ឯកសិទ្ធិពិសេស ប័ណ្ណបញ្ចុះតម្លៃប្រណិត និងការផ្ដល់ជូនផ្តាច់មុខ។',
      color: 'text-pink-800 bg-pink-100 border-pink-200'
    },
    {
      key: 'vip_min_points',
      descKey: 'vip_description',
      descKmKey: 'vip_description_km',
      tierKey: 'vip',
      lvl: 6,
      name: 'VIP',
      defaultPoints: 10000,
      defaultDesc: 'Enjoy VIP-only promotions, personalized rewards, and priority customer support.',
      defaultDescKm: 'រីករាយជាមួយប្រូម៉ូសិនសម្រាប់តែ VIP រង្វាន់ផ្ទាល់ខ្លួន និងសេវាបម្រើអតិថិជនអាទិភាព។',
      color: 'text-purple-800 bg-purple-100 border-purple-200'
    },
    {
      key: 'elite_min_points',
      descKey: 'elite_description',
      descKmKey: 'elite_description_km',
      tierKey: 'elite',
      lvl: 7,
      name: 'Elite',
      defaultPoints: 20000,
      defaultDesc: 'Access elite privileges, exceptional rewards, and exclusive shopping experiences.',
      defaultDescKm: 'ទទួលបានសិទ្ធិកម្រិត Elite រង្វាន់ដ៏អស្ចារ្យ និងបទពិសោធន៍ទិញទំនិញផ្តាច់មុខបំផុត។',
      color: 'text-emerald-800 bg-emerald-100 border-emerald-200'
    },
    {
      key: 'royal_min_points',
      descKey: 'royal_description',
      descKmKey: 'royal_description_km',
      tierKey: 'royal',
      lvl: 8,
      name: 'Royal',
      defaultPoints: 50000,
      defaultDesc: 'Our highest membership tier, offering the most exclusive rewards, maximum privileges, and personalized VIP experiences.',
      defaultDescKm: 'កម្រិតសមាជិកខ្ពស់បំផុតរបស់យើង ផ្ដល់រង្វាន់ផ្តាច់មុខបំផុត អត្ថប្រយោជន៍អតិបរមា និងបទពិសោធន៍ VIP ផ្ទាល់ខ្លួន។',
      color: 'text-rose-900 bg-rose-100 border-rose-200'
    },
  ], [])

  const tierValidationErrors = useMemo(() => {
    if (!values) return {}
    const errors = {}
    for (let i = 1; i < tierLadder.length; i++) {
      const prevKey = tierLadder[i - 1].key
      const currKey = tierLadder[i].key
      const prevVal = Number(values[prevKey] ?? tierLadder[i - 1].defaultPoints)
      const currVal = Number(values[currKey] ?? tierLadder[i].defaultPoints)
      if (currVal < prevVal) {
        errors[currKey] = `Must be ≥ ${prevVal.toLocaleString()} pts (${tierLadder[i - 1].name})`
      }
    }
    return errors
  }, [values, tierLadder])

  const hasTierErrors = Object.keys(tierValidationErrors).length > 0

  const applyDefaultTierLadder = () => {
    setSettings((current) => ({
      ...(current || data),
      classic_min_points: 0,
      silver_min_points: 500,
      gold_min_points: 1500,
      platinum_min_points: 3000,
      diamond_min_points: 6000,
      vip_min_points: 10000,
      elite_min_points: 20000,
      royal_min_points: 50000,
      classic_description: 'Welcome to our membership programme. Enjoy basic member benefits and earn points on purchases.',
      silver_description: 'Enjoy additional rewards, exclusive discounts, and special member promotions.',
      gold_description: 'Unlock better rewards, higher discounts, and exclusive shopping privileges.',
      platinum_description: 'Enjoy premium benefits, birthday rewards, and priority access to special promotions.',
      diamond_description: 'Experience enhanced privileges, premium vouchers, and exclusive member offers.',
      vip_description: 'Enjoy VIP-only promotions, personalized rewards, and priority customer support.',
      elite_description: 'Access elite privileges, exceptional rewards, and exclusive shopping experiences.',
      royal_description: 'Our highest membership tier, offering the most exclusive rewards, maximum privileges, and personalized VIP experiences.',
      classic_description_km: 'សូមស្វាគមន៍មកកាន់កម្មវិធីសមាជិករបស់យើង។ រីករាយជាមួយអត្ថប្រយោជន៍ជាមូលដ្ឋាន និងសន្សំពិន្ទុរាល់ពេលទិញទំនិញ។',
      silver_description_km: 'ទទួលបានរង្វាន់បន្ថែម ការបញ្ចុះតម្លៃពិសេស និងប្រូម៉ូសិនផ្ដាច់មុខសម្រាប់សមាជិក។',
      gold_description_km: 'ដោះសោរង្វាន់កាន់តែប្រសើរ ការបញ្ចុះតម្លៃកាន់តែខ្ពស់ និងសិទ្ធិទិញទំនិញផ្តាច់មុខ។',
      platinum_description_km: 'រីករាយជាមួយអត្ថប្រយោជន៍កម្រិតខ្ពស់ រង្វាន់ថ្ងៃកំណើត និងសិទ្ធិចូលមើលការលក់ពិសេសមុនគេ។',
      diamond_description_km: 'ទទួលបានបទពិសោធន៍ឯកសិទ្ធិពិសេស ប័ណ្ណបញ្ចុះតម្លៃប្រណិត និងការផ្ដល់ជូនផ្តាច់មុខ។',
      vip_description_km: 'រីករាយជាមួយប្រូម៉ូសិនសម្រាប់តែ VIP រង្វាន់ផ្ទាល់ខ្លួន និងសេវាបម្រើអតិថិជនអាទិភាព។',
      elite_description_km: 'ទទួលបានសិទ្ធិកម្រិត Elite រង្វាន់ដ៏អស្ចារ្យ និងបទពិសោធន៍ទិញទំនិញផ្តាច់មុខបំផុត។',
      royal_description_km: 'កម្រិតសមាជិកខ្ពស់បំផុតរបស់យើង ផ្ដល់រង្វាន់ផ្តាច់មុខបំផុត អត្ថប្រយោជន៍អតិបរមា និងបទពិសោធន៍ VIP ផ្ទាល់ខ្លួន។',
    }))
    toast.success('Applied standard tier ladder & default bilingual descriptions')
  }

  const handleSave = () => {
    if (hasTierErrors) {
      setActiveSection('tiers')
      toast.error('Tier points must increase progressively from Classic up to Royal')
      return
    }
    saveMutation.mutate()
  }

  const sections = [
    { id: 'earning', label: 'Earning Rules', shortLabel: 'Earn', icon: Award, count: '6 Rules' },
    { id: 'tiers', label: 'Membership Tiers', shortLabel: 'Tiers', icon: Crown, count: '8 Levels', badge: hasTierErrors ? '⚠️' : null },
    { id: 'redemption', label: 'Redeem & Expiry', shortLabel: 'Redeem', icon: Gift, count: 'Limits & Expiry' },
    { id: 'automation', label: 'Automation', shortLabel: 'Auto', icon: Zap, count: '3 Tasks' },
  ]

  const earningCards = [
    {
      statusKey: 'purchase_points_enabled',
      valueKey: 'points_per_dollar',
      title: 'Purchase Points',
      subtitle: 'Earned on every $1 spent',
      description: 'Customers earn reward points automatically when their orders are completed.',
      footnote: `Example: Spend $20 → Earn ${Number(values?.points_per_dollar || 0) * 20} points`,
      icon: DollarSign,
      unit: 'pts / $1',
      min: 1,
    },
    {
      statusKey: 'signup_bonus_enabled',
      valueKey: 'signup_bonus',
      title: 'New Member Welcome Bonus',
      subtitle: 'Awarded on account creation',
      description: 'One-time points given to new customers immediately upon registering an account.',
      footnote: 'Awarded once per new customer account',
      icon: Users,
      unit: 'points',
      min: 0,
    },
    {
      statusKey: 'referral_bonus_enabled',
      valueKey: 'referral_bonus',
      title: 'Friend Referral Bonus',
      subtitle: 'Awarded on successful referral',
      description: 'Points awarded to existing customers when their invited friend joins and places an order.',
      footnote: 'Requires friend to complete their first order',
      icon: Users,
      unit: 'points',
      min: 0,
    },
    {
      statusKey: 'birthday_bonus_enabled',
      valueKey: 'birthday_bonus',
      title: 'Birthday Celebration Bonus',
      subtitle: 'Awarded on customer birthday',
      description: 'Delight customers with bonus points automatically on their birthday.',
      footnote: 'Requires birthday date in customer profile',
      icon: Cake,
      unit: 'points',
      min: 0,
    },
    {
      statusKey: 'review_bonus_enabled',
      valueKey: 'review_bonus',
      title: 'Product Review Bonus',
      subtitle: 'Awarded for approved reviews',
      description: 'Incentivize customers to write helpful reviews on verified purchases.',
      footnote: 'Awarded once per purchased item review',
      icon: Star,
      unit: 'points',
      min: 0,
    },
    {
      statusKey: 'daily_checkin_enabled',
      valueKey: 'daily_checkin_bonus',
      title: 'Daily Check-in Bonus',
      subtitle: 'Awarded once per 24 hours',
      description: 'Encourage daily engagement by awarding bonus points on the rewards page.',
      footnote: 'Limited to one claim per customer every 24h',
      icon: CalendarCheck,
      unit: 'points',
      min: 0,
    },
  ]

  return (
    <div className="space-y-6 pb-20">
      {/* Standard Admin PageHeader */}
      <PageHeader
        title="Reward Program Settings"
        subtitle="Configure earning rules, 8 membership tier thresholds, redemption rules, and automated workflows."
        breadcrumbs={[{ label: 'Rewards', path: '/admin/rewards' }, { label: 'Settings' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open('/profile/rewards', '_blank')}
              className="btn-secondary h-10 text-xs font-bold sm:text-sm"
            >
              <Gift size={15} />
              <span>Customer View ↗</span>
            </button>
            {hasChanges && (
              <button
                type="button"
                onClick={() => setSettings(null)}
                disabled={saveMutation.isPending}
                className="btn-secondary h-10 text-xs font-bold sm:text-sm"
              >
                Discard
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges || hasTierErrors}
              className={cn(
                "btn-primary h-10 text-xs font-bold sm:text-sm",
                !hasChanges && "opacity-50 cursor-not-allowed"
              )}
            >
              {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{saveMutation.isPending ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        }
      />

      {isLoading || !values ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="mt-3 text-sm font-bold">Loading reward configurations...</p>
        </div>
      ) : (
        <>
          {/* Sleek Master Switch & Program Overview Card */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition',
                  values.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'
                )}>
                  <Power size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-gray-900">Reward Program Status</h2>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold',
                      values.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', values.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400')} />
                      {values.is_active ? 'Active & Live' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {values.is_active
                      ? 'Customers earn points on purchases, level up their membership tier, and redeem coupons.'
                      : 'Earning points, daily check-in bonuses, and reward exchanges are currently disabled store-wide.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs font-bold text-gray-400">
                  {values.is_active ? 'Program Enabled' : 'Program Disabled'}
                </span>
                <AdminToggleSwitch
                  checked={Boolean(values.is_active)}
                  onChange={(val) => set('is_active', val)}
                />
              </div>
            </div>

            {/* Clean summary chips */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
                <DollarSign size={13} className="text-[#EC3F8F]" />
                Earning Rate: <strong className="font-bold text-gray-900">$1 = {values.points_per_dollar || 1} pts</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
                <Crown size={13} className="text-amber-500" />
                Membership: <strong className="font-bold text-gray-900">8 Levels (0 → 50k pts)</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
                <Clock size={13} className="text-sky-500" />
                Expiry: <strong className="font-bold text-gray-900">{values.expiration_enabled ? `${values.points_expiry_days || 365} Days` : 'No Expiry'}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 font-medium text-gray-600">
                <Zap size={13} className="text-purple-500" />
                Auto-Approve: <strong className="font-bold text-gray-900">{values.auto_approve_points ? 'Enabled' : 'Manual'}</strong>
              </span>
            </div>
          </div>

          {/* Clean Segmented Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-card">
            {sections.map(({ id, label, icon: Icon, count, badge }) => {
              const isActive = activeSection === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    'flex flex-1 min-w-[130px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all sm:text-sm',
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
                  )}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
                  <span>{label}</span>
                  {badge ? (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white font-black">{badge}</span>
                  ) : (
                    <span className={cn('text-[11px] font-semibold', isActive ? 'text-white/80' : 'text-gray-400')}>
                      ({count})
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ═══════════════════════════════════════════
              TAB 1: EARNING RULES
          ═══════════════════════════════════════════ */}
          {activeSection === 'earning' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-gray-950">How Customers Earn Points</h2>
                  <p className="text-xs font-semibold text-gray-500">Toggle each channel on or off and set custom point amounts.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {earningCards.map((item) => {
                  const isOn = values[item.statusKey] !== false
                  const Icon = item.icon
                  return (
                    <div
                      key={item.valueKey}
                      className={cn(
                        'flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-sm',
                        isOn ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/70 opacity-75'
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition',
                              isOn ? 'bg-pink-50 text-[#EC3F8F]' : 'bg-gray-100 text-gray-400'
                            )}>
                              <Icon size={20} />
                            </span>
                            <div>
                              <h3 className="text-sm font-black text-gray-950 sm:text-base">{item.title}</h3>
                              <p className="text-xs font-bold text-gray-400">{item.subtitle}</p>
                            </div>
                          </div>
                          <AdminToggleSwitch
                            checked={isOn}
                            onChange={(checked) => set(item.statusKey, checked)}
                          />
                        </div>

                        <p className="mt-3 text-xs font-semibold leading-relaxed text-gray-600">
                          {item.description}
                        </p>
                      </div>

                      <div className="mt-4 border-t border-gray-100 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-gray-500">Reward amount:</span>
                          <div className={cn(
                            'flex h-10 w-36 items-center overflow-hidden rounded-xl border bg-white shadow-sm transition',
                            isOn ? 'border-gray-200' : 'border-gray-100 bg-gray-100 opacity-60'
                          )}>
                            <input
                              type="number"
                              min={item.min}
                              disabled={!isOn}
                              value={values[item.valueKey] ?? 0}
                              onChange={(e) => set(item.valueKey, Math.max(item.min, Number(e.target.value)))}
                              className="h-full w-full border-0 bg-transparent px-3 text-right text-sm font-black text-gray-950 outline-none disabled:cursor-not-allowed"
                            />
                            <span className="shrink-0 bg-gray-50 px-2.5 py-2 text-[11px] font-black text-gray-400 border-l border-gray-100">
                              {item.unit}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] font-bold text-gray-400">{item.footnote}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              TAB 2: MEMBERSHIP TIERS (8 LEVELS)
          ═══════════════════════════════════════════ */}
          {activeSection === 'tiers' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                      <Crown size={15} />
                    </span>
                    <h2 className="text-base font-bold text-gray-900 sm:text-lg">8-Level Membership Ladder</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Configure minimum points needed to unlock each rank and customize customer-facing tier perks in English & Khmer.
                  </p>
                </div>
              </div>

              {hasTierErrors && (
                <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-black text-rose-700">
                  <AlertCircle size={17} className="shrink-0" />
                  <span>Validation Warning: Point requirements must increase progressively (Classic ≤ Silver ≤ Gold ≤ Platinum ≤ Diamond ≤ VIP ≤ Elite ≤ Royal).</span>
                </div>
              )}

              {/* 8 Tier Levels - Clean List View with Edit Modal */}
              <div className="space-y-3">
                {tierLadder.map((tier, index) => {
                  const error = tierValidationErrors[tier.key]
                  const tierVal = values[tier.key] ?? tier.defaultPoints
                  const descEn = values[tier.descKey] ?? tier.defaultDesc
                  const descKm = values[tier.descKmKey] ?? tier.defaultDescKm

                  return (
                    <div
                      key={tier.key}
                      className={cn(
                        'group relative flex flex-col gap-4 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 shadow-card transition-all duration-200 hover:shadow-soft',
                        error ? 'border-rose-300 ring-2 ring-rose-100' : 'border-gray-100'
                      )}
                    >
                      {/* 1. Shopee Badge & Tier Identity */}
                      <div className="flex items-center gap-3.5 sm:w-64 shrink-0">
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-1.5 shadow-sm transition group-hover:scale-105">
                          <img
                            src={getMemberTierImage(tier.tierKey)}
                            alt={tier.name}
                            className="h-full w-full object-contain drop-shadow-sm"
                          />
                          <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-black text-white shadow">
                            {tier.lvl}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{tier.name}</h3>
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', tier.color)}>
                              Level {tier.lvl}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                            <span className="font-semibold">Unlock:</span>
                            <span className="font-bold text-purple-600">
                              {index === 0 ? '0 pts (Base Free)' : `${tierVal.toLocaleString()} pts`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Descriptions Preview (English & Khmer) */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="inline-flex shrink-0 items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-100">
                            EN
                          </span>
                          <p className="line-clamp-1 text-xs text-gray-700 font-medium">
                            {descEn}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex shrink-0 items-center rounded-md bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-700 border border-pink-100">
                            KM
                          </span>
                          <p
                            className="line-clamp-1 text-xs text-gray-600 font-medium font-khmer"
                            style={{ fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" }}
                          >
                            {descKm}
                          </p>
                        </div>
                      </div>

                      {/* 3. Actions (Edit Button) */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {error && (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">
                            ⚠️ Points Invalid
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingTier(tier)}
                          className="btn-secondary h-9 px-3.5 text-xs font-bold gap-1.5 hover:border-purple-200"
                        >
                          <Edit3 size={14} className="text-purple-600" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Edit Tier Modal (Bilingual Description & Points) */}
              {editingTier && (
                <Modal
                  isOpen={Boolean(editingTier)}
                  onClose={() => setEditingTier(null)}
                  title={`Edit Tier — Level ${editingTier.lvl}: ${editingTier.name}`}
                  size="lg"
                >
                  <div className="space-y-5 p-5 sm:p-6">
                    {/* Header preview */}
                    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
                        <img
                          src={getMemberTierImage(editingTier.tierKey)}
                          alt={editingTier.name}
                          className="h-full w-full object-contain drop-shadow-sm"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{editingTier.name}</h3>
                          <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', editingTier.color)}>
                            Level {editingTier.lvl}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Set required points and customize member benefit descriptions in both English and Khmer.
                        </p>
                      </div>
                    </div>

                    {/* Points Needed */}
                    <div>
                      <label className="label">
                        <span className="text-xs font-bold text-gray-700">Points Needed to Unlock</span>
                        {editingTier.lvl === 1 && (
                          <span className="ml-2 text-xs font-normal text-emerald-600">(Level 1 is the default entry tier at 0 pts)</span>
                        )}
                      </label>
                      <div className="relative mt-1 flex h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-purple-500">
                        <input
                          type="number"
                          min="0"
                          disabled={editingTier.lvl === 1}
                          value={values[editingTier.key] ?? editingTier.defaultPoints}
                          onChange={(e) => set(editingTier.key, Math.max(0, Number(e.target.value)))}
                          className="h-full w-full border-0 bg-transparent px-3.5 text-sm font-bold text-gray-900 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <span className="shrink-0 bg-gray-50 px-3.5 py-2.5 text-xs font-bold text-gray-500 border-l border-gray-100">
                          pts
                        </span>
                      </div>
                      {tierValidationErrors[editingTier.key] && (
                        <p className="mt-1.5 text-xs font-bold text-rose-600">
                          ⚠️ {tierValidationErrors[editingTier.key]}
                        </p>
                      )}
                    </div>

                    {/* English Description */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-700 border border-blue-100">EN</span>
                          <span>Description (English)</span>
                        </label>
                        <span className="text-[11px] text-gray-400">Shown when language is English</span>
                      </div>
                      <textarea
                        rows={3}
                        value={values[editingTier.descKey] ?? editingTier.defaultDesc}
                        onChange={(e) => set(editingTier.descKey, e.target.value)}
                        placeholder={`Describe benefits and perks for ${editingTier.name} members in English...`}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:bg-white focus:outline-none transition leading-relaxed"
                      />
                    </div>

                    {/* Khmer Description */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                          <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-black text-pink-700 border border-pink-100">KM</span>
                          <span className="font-khmer" style={{ fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" }}>
                            ការពិពណ៌នាជាភាសាខ្មែរ (Description in Khmer)
                          </span>
                        </label>
                        <span className="text-[11px] text-gray-400 font-khmer" style={{ fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" }}>
                          បង្ហាញនៅពេលជ្រើសរើសភាសាខ្មែរ
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={values[editingTier.descKmKey] ?? editingTier.defaultDescKm}
                        onChange={(e) => set(editingTier.descKmKey, e.target.value)}
                        placeholder={`រៀបរាប់ពីអត្ថប្រយោជន៍ និងការបញ្ចុះតម្លៃសម្រាប់កម្រិត ${editingTier.name} ជាភាសាខ្មែរ...`}
                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:bg-white focus:outline-none transition leading-relaxed font-khmer"
                        style={{ fontFamily: "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif" }}
                      />
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingTier(null)}
                        className="btn-secondary h-10 px-4 text-xs font-bold sm:text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (tierValidationErrors[editingTier.key]) {
                            toast.error(tierValidationErrors[editingTier.key])
                            return
                          }
                          setEditingTier(null)
                          handleSave()
                        }}
                        disabled={saveMutation.isPending || Boolean(tierValidationErrors[editingTier.key])}
                        className="btn-primary h-10 px-5 text-xs font-bold sm:text-sm"
                      >
                        {saveMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        <span>{saveMutation.isPending ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                </Modal>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              TAB 3: REDEMPTION & EXPIRY
          ═══════════════════════════════════════════ */}
          {activeSection === 'redemption' && (
            <div className="grid gap-5 md:grid-cols-2">
              {/* Card A: Points Expiration */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-gray-950">Points Expiration Policy</h3>
                    <p className="text-xs font-semibold text-gray-500">Automatically expire unused points after a set timeframe.</p>
                  </div>
                  <AdminToggleSwitch
                    checked={Boolean(values.expiration_enabled)}
                    onChange={(checked) => set('expiration_enabled', checked)}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Expire unused points after</label>
                    <div className={cn(
                      'mt-1.5 flex h-11 items-center overflow-hidden rounded-xl border bg-white shadow-sm transition',
                      values.expiration_enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-50'
                    )}>
                      <input
                        type="number"
                        min="1"
                        disabled={!values.expiration_enabled}
                        value={values.points_expiry_days ?? 365}
                        onChange={(e) => set('points_expiry_days', Math.max(1, Number(e.target.value)))}
                        className="h-full w-full border-0 bg-transparent px-3 text-sm font-black text-gray-950 outline-none disabled:cursor-not-allowed"
                      />
                      <span className="shrink-0 bg-gray-50 px-3 py-2 text-xs font-black text-gray-400 border-l border-gray-100">
                        days
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Default is 365 days (1 year from earning date).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700">Send expiry reminder alert</label>
                    <div className={cn(
                      'mt-1.5 flex h-11 items-center overflow-hidden rounded-xl border bg-white shadow-sm transition',
                      values.expiration_enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-50'
                    )}>
                      <input
                        type="number"
                        min="0"
                        disabled={!values.expiration_enabled}
                        value={values.expiry_reminder_days ?? 30}
                        onChange={(e) => set('expiry_reminder_days', Math.max(0, Number(e.target.value)))}
                        className="h-full w-full border-0 bg-transparent px-3 text-sm font-black text-gray-950 outline-none disabled:cursor-not-allowed"
                      />
                      <span className="shrink-0 bg-gray-50 px-3 py-2 text-xs font-black text-gray-400 border-l border-gray-100">
                        days before
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Customer receives notification before points expire.</p>
                  </div>
                </div>
              </div>

              {/* Card B: Checkout & Order Limits */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <div className="border-b border-gray-100 pb-3">
                  <h3 className="text-base font-black text-gray-950">Checkout Redemption Limits</h3>
                  <p className="text-xs font-semibold text-gray-500">Prevent fraud and control maximum point utilization per order.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Minimum points required to redeem</label>
                    <div className="mt-1.5 flex h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <input
                        type="number"
                        min="0"
                        value={values.minimum_redeem_points ?? 100}
                        onChange={(e) => set('minimum_redeem_points', Math.max(0, Number(e.target.value)))}
                        className="h-full w-full border-0 bg-transparent px-3 text-sm font-black text-gray-950 outline-none"
                      />
                      <span className="shrink-0 bg-gray-50 px-3 py-2 text-xs font-black text-gray-400 border-l border-gray-100">
                        points
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Customer must hold at least this balance before exchanging rewards.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700">Maximum points per order</label>
                    <div className="mt-1.5 flex h-11 items-center overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <input
                        type="number"
                        min="0"
                        value={values.maximum_points_per_order ?? 0}
                        onChange={(e) => set('maximum_points_per_order', Math.max(0, Number(e.target.value)))}
                        className="h-full w-full border-0 bg-transparent px-3 text-sm font-black text-gray-950 outline-none"
                      />
                      <span className="shrink-0 bg-gray-50 px-3 py-2 text-xs font-black text-gray-400 border-l border-gray-100">
                        points
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">Set to 0 for unlimited points per order.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              TAB 4: AUTOMATION & WORKFLOWS
          ═══════════════════════════════════════════ */}
          {activeSection === 'automation' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-950">Reward Automation Rules</h3>
                <p className="text-xs font-semibold text-gray-500">Enable automatic point awarding and inventory notifications.</p>
              </div>

              <div className="mt-4 divide-y divide-gray-100">
                {[
                  {
                    key: 'auto_approve_points',
                    title: 'Auto-approve earned points',
                    desc: 'Automatically approve points from completed customer orders without manual staff review.',
                    icon: Check,
                  },
                  {
                    key: 'auto_apply_on_completed',
                    title: 'Auto-credit points on order completion',
                    desc: 'Instantly dispatches points to customer balance when order status transitions to Completed.',
                    icon: Zap,
                  },
                  {
                    key: 'low_stock_alert_enabled',
                    title: 'Low reward inventory alert',
                    desc: 'Notify staff when physical reward items or vouchers drop below minimum reserve threshold.',
                    icon: AlertCircle,
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-4 first:pt-2 last:pb-2">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                        <item.icon size={18} />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-gray-950">{item.title}</h4>
                        <p className="mt-0.5 text-xs font-semibold text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                    <AdminToggleSwitch
                      checked={Boolean(values[item.key])}
                      onChange={(checked) => set(item.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
