import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Award,
  Archive,
  BellRing,
  Bot,
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
  Layers3,
  Loader2,
  Mail,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  Percent,
  RotateCw,
  Search,
  SlidersHorizontal,
  Ticket,
  Trash2,
  Truck,
  Send,
  Upload,
  UserPlus,
  UserRound,
  X,
  ShoppingCart,
  Tag,
  Zap,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import PageHeader from '@/components/shared/PageHeader'
import { cn, formatDate } from '@/utils/helpers'

const REWARD_TYPES = [
  { value: 'voucher', label: 'Voucher' },
  { value: 'discount', label: 'Discount Coupon' },
  { value: 'free_delivery', label: 'Free Delivery' },
  { value: 'gift', label: 'Gift Product' },
  { value: 'lucky_box', label: 'Lucky Box' },
  { value: 'manual', label: 'Manual Reward' },
]

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
  { title: 'Daily Check-in', icon: CalendarDays, status: 'Plan', text: 'Future customer check-in bonus. Use manual points until automated.', tone: 'bg-sky-50 text-sky-600' },
  { title: 'Lucky Spin', icon: RotateCw, status: 'Plan', text: 'Future spin game for points, coupons, or lucky box entries.', tone: 'bg-amber-50 text-amber-600' },
  { title: 'Review Reward', icon: Camera, status: 'Manual', text: 'Add points from Customer Points after approving a useful review.', tone: 'bg-violet-50 text-violet-600' },
  { title: 'Invite Friend', icon: UserPlus, status: 'Manual', text: 'Add points after the invited friend completes their first order.', tone: 'bg-emerald-50 text-emerald-600' },
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
  { name: 'Silver', range: '0-1,999 pts', color: 'bg-gray-100 text-gray-700', benefits: ['Birthday Gift', 'Exclusive Rewards'] },
  { name: 'Gold', range: '2,000-4,999 pts', color: 'bg-amber-50 text-amber-700', benefits: ['Free Shipping', 'VIP Discount', 'Early Access'] },
  { name: 'Platinum', range: '5,000-9,999 pts', color: 'bg-sky-50 text-sky-700', benefits: ['Birthday Gift', 'Free Shipping', 'Exclusive Rewards'] },
  { name: 'Diamond', range: '10,000+ pts', color: 'bg-pink-50 text-[#EC3F8F]', benefits: ['VIP Discount', 'Early Access', 'Premium Gifts'] },
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
  sku: '',
  weight: '',
  per_customer_limit: '',
  member_tier_requirement: 'all',
  starts_at: '',
  ends_at: '',
  is_active: true,
  featured_reward: false,
}

function unwrapList(data) {
  return data?.results ?? data ?? []
}

function toDateInput(value) {
  if (!value) return ''
  return String(value).slice(0, 16)
}

function toApiDate(value) {
  if (!value) return null
  return new Date(value).toISOString()
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

function MiniLineChart() {
  const points = [
    [0, 48],
    [95, 94],
    [190, 138],
    [285, 92],
    [380, 112],
    [475, 70],
    [570, 138],
    [665, 174],
    [760, 206],
  ]
  const line = points.map(([x, y]) => `${x},${250 - y}`).join(' ')
  const area = `0,250 ${points.map(([x, y]) => `${x},${250 - y}`).join(' ')} 760,250`
  return (
    <div className="h-[330px]">
      <svg viewBox="0 0 820 290" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="rewardLineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#EC3F8F" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#EC3F8F" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((lineIndex) => (
          <g key={lineIndex}>
            <text x="0" y={38 + lineIndex * 52} fill="#8A93A5" fontSize="14" fontWeight="700">{['100K', '80K', '60K', '40K', '20K'][lineIndex]}</text>
            <line x1="54" x2="810" y1={34 + lineIndex * 52} y2={34 + lineIndex * 52} stroke="#EEF1F6" strokeWidth="1" />
          </g>
        ))}
        <polygon points={area} fill="url(#rewardLineFill)" transform="translate(54 0)" />
        <polyline points={line} fill="none" stroke="#EC3F8F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" transform="translate(54 0)" />
        {points.map(([x, y], index) => (
          <circle key={index} cx={x + 54} cy={250 - y} r="6" fill="#fff" stroke="#EC3F8F" strokeWidth="4" />
        ))}
      </svg>
      <div className="ml-12 grid grid-cols-6 text-center text-sm font-black text-gray-400">
        {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map((month) => <span key={month}>{month}</span>)}
      </div>
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
  const topRewards = Object.values(popularRewards)
  const topRewardMax = Math.max(...topRewards.map((item) => Number(item.count ?? item.redeemed ?? 0)), 1)
  const recentRequests = redemptions.slice(0, 5)
  const expiringCustomers = pointsData.filter((customer) => Number(customer.points || 0) > 0).slice(0, 5)

  return (
    <div className="min-h-screen space-y-5 bg-[#F8F9FC]">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <PremiumKpiCard title="Total Points Issued" value={dashboardValues.totalPointsIssued.toLocaleString()} trend="+12.5% this month" icon={Gift} tone="bg-pink-50 text-[#EC3F8F]" />
        <PremiumKpiCard title="Total Points Redeemed" value={dashboardValues.totalPointsRedeemed.toLocaleString()} trend="+9.3% this month" icon={Award} tone="bg-orange-50 text-orange-500" />
        <PremiumKpiCard title="Active Members" value={dashboardValues.activeMembers.toLocaleString()} trend="+8.7% this month" icon={UserRound} tone="bg-violet-50 text-violet-600" />
        <PremiumKpiCard title="Pending Requests" value={dashboardValues.pendingRequests.toLocaleString()} trend="-3.2% this month" trendTone="text-pink-600" icon={FileText} tone="bg-sky-50 text-sky-600" />
        <PremiumKpiCard title="Expiring Points" value={dashboardValues.expiringPoints.toLocaleString()} trend="This month" trendTone="text-gray-500" icon={Clock} tone="bg-pink-50 text-[#EC3F8F]" />
        <PremiumKpiCard title="Physical Rewards Left" value={dashboardValues.physicalRewardsLeft.toLocaleString()} trend="In Stock" trendTone="text-gray-500" icon={ShoppingCart} tone="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.24fr_1fr_0.78fr]">
        <PremiumChartCard title="Points Activity (Last 6 Months)" subtitle="">
          <div className="mb-4 flex justify-end">
            <button className="rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-black text-gray-600 shadow-sm">Last 6 Months</button>
          </div>
          <MiniLineChart />
        </PremiumChartCard>
        <DonutDistributionCard totalPoints={dashboardValues.totalPointsIssued} />
        <PremiumChartCard title="Top Redeemed Rewards" subtitle="">
          <div className="mb-5 flex justify-end">
            <button className="rounded-xl border border-gray-100 bg-white px-4 py-2 text-sm font-black text-gray-600 shadow-sm">This Month</button>
          </div>
          <div className="space-y-6">
            {topRewards.map((item, index) => {
              const Icon = [Ticket, Truck, ShoppingCart, Percent, Package][index] || Gift
              const value = Number(item.count ?? item.redeemed ?? 0)
              return (
                <div key={item.name} className="grid grid-cols-[24px_48px_1fr_auto] items-center gap-4">
                  <span className="text-lg font-black text-gray-800">{index + 1}</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-[#EC3F8F]">
                    <Icon size={24} />
                  </span>
                  <span className="font-black text-gray-900">{item.name}</span>
                  <span className="font-black text-gray-700">{value.toLocaleString()}</span>
                </div>
              )
            })}
            {topRewards.length === 0 && <p className="py-8 text-center text-sm font-semibold text-gray-400">No redeemed rewards yet.</p>}
          </div>
        </PremiumChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.75fr_0.5fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-gray-950">Recent Redeem Requests</h2>
              <p className="mt-1 text-xs font-semibold text-gray-400">Latest customer exchange activity</p>
            </div>
            <button className="text-xs font-black text-[#EC3F8F]">View All</button>
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
            <button className="text-xs font-black text-[#EC3F8F]">View All</button>
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
        <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black text-gray-950">Quick Actions</h2>
          <div className="mt-8 space-y-5">
            {[
              ['Add Reward', Gift, 'bg-[#EC3F8F] text-white shadow-lg shadow-pink-100'],
              ['Create Campaign', Send, 'bg-pink-50 text-[#EC3F8F]'],
              ['Manage Tiers', Crown, 'bg-pink-50 text-[#EC3F8F]'],
              ['Export Report', Download, 'bg-pink-50 text-[#EC3F8F]'],
            ].map(([label, Icon, cls]) => (
              <button key={label} onClick={() => toast.error(`${label} needs route wiring before it can open from this card`)} className={cn('flex h-16 w-full items-center gap-5 rounded-xl px-6 text-lg font-black transition active:scale-[0.99]', cls)}>
                <Icon size={26} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        {BOTTOM_REWARD_METRICS.map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="flex items-center gap-4 border-gray-100 xl:border-r xl:last:border-r-0">
              <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', metric.tone)}>
                <Icon size={25} />
              </span>
              <div>
                <p className="text-sm font-black text-gray-500">{metric.title}</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{metric.value}</p>
                <p className="mt-1 text-sm font-black text-emerald-600">{metric.trend}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RewardRulesAdmin() {
  const earningRules = [
    { id: 1, name: 'Points per Purchase', description: 'Earn 1 point per $1 spent', type: 'Purchase', points: '1 pt per $1', conditions: 'Min. spend $1', tier: 'All Tiers', priority: 1, status: 'Active', icon: ShoppingCart, tone: 'bg-pink-50 text-[#EC3F8F]' },
    { id: 2, name: 'Signup Bonus', description: 'Welcome points after account creation', type: 'Signup', points: '500 pts', conditions: 'First time signup', tier: 'All Tiers', priority: 2, status: 'Active', icon: UserPlus, tone: 'bg-orange-50 text-orange-500' },
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
  const isEdit = Boolean(reward?.id)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState(() => ({
    ...emptyReward,
    ...reward,
    sku: reward?.gift_product_code || '',
    weight: reward?.weight || '',
    featured_reward: reward?.featured_reward || false,
    points_required: reward?.points_required ?? emptyReward.points_required,
    coupon_value: reward?.coupon_value ?? emptyReward.coupon_value,
    minimum_order_amount: reward?.minimum_order_amount ?? emptyReward.minimum_order_amount,
    gift_product: reward?.gift_product ?? '',
    stock: reward?.stock ?? '',
    per_customer_limit: reward?.per_customer_limit ?? '',
    starts_at: toDateInput(reward?.starts_at),
    ends_at: toDateInput(reward?.ends_at),
  }))
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(reward?.reward_image_url || null)
  const [clearRewardImage, setClearRewardImage] = useState(false)

  const { data: productsData } = useQuery({
    queryKey: ['reward-gift-products'],
    queryFn: () => productsApi.products.list({ page_size: 300 }).then((r) => r.data),
    enabled: ['gift', 'lucky_box'].includes(form.type),
  })
  const products = unwrapList(productsData)
  const selectedProduct = products.find((product) => String(product.id) === String(form.gift_product))

  const saveMutation = useMutation({
    mutationFn: (payload) => isEdit
      ? ordersApi.adminRewards.items.update(reward.id, payload)
      : ordersApi.adminRewards.items.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reward-items'] })
      toast.success(isEdit ? 'Reward updated' : 'Reward created')
      onClose()
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not save reward'),
  })

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

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

  const handleSubmit = (event) => {
    event.preventDefault()
    const values = {
      name: form.name,
      description: form.description || '',
      type: form.type,
      is_active: form.is_active,
      coupon_discount_type: form.coupon_discount_type,
      points_required: Number(form.points_required || 0),
      coupon_value: form.coupon_value || '0.00',
      minimum_order_amount: form.minimum_order_amount || '0.00',
      member_tier_requirement: form.member_tier_requirement || 'all',
    }
    const payload = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      payload.append(key, value)
    })
    if (['gift', 'lucky_box'].includes(form.type) && form.gift_product) payload.append('gift_product', Number(form.gift_product))
    if (form.stock !== '') payload.append('stock', Number(form.stock))
    if (form.per_customer_limit !== '') payload.append('per_customer_limit', Number(form.per_customer_limit))
    if (form.starts_at) payload.append('starts_at', toApiDate(form.starts_at))
    if (form.ends_at) payload.append('ends_at', toApiDate(form.ends_at))
    if (imageFile) {
      payload.append('reward_image', imageFile)
    }
    if (clearRewardImage) {
      payload.append('clear_reward_image', 'true')
    }
    saveMutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close reward form" />
      <section className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="border-b border-gray-100 bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#EC3F8F]">Shadow Shop Rewards Admin</p>
              <h2 className="mt-1 text-xl font-black text-gray-950">{isEdit ? 'Edit Reward' : 'Create New Reward'}</h2>
              <p className="mt-1 text-sm font-semibold text-gray-400">Fill the reward details below, then save. Required fields are name, type, and points.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]">
              <X size={18} />
            </button>
          </div>
        </div>
      <form onSubmit={handleSubmit} className="grid flex-1 gap-4 overflow-y-auto bg-[#F8F9FC] p-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-gray-400">Basic Information</h3>
        </div>
        <label className="md:col-span-2">
          <span className="label">Reward name</span>
          <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        <label className="md:col-span-2">
          <span className="label">Description</span>
          <textarea className="input-field min-h-24" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <div className="md:col-span-2">
          <span className="label">Reward image</span>
          <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-white transition hover:border-purple-400"
            >
              {displayImage ? (
                <img src={displayImage} alt="Reward preview" className="h-full w-full object-contain p-1" />
              ) : (
                <Upload size={24} className="text-gray-300" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary px-4 py-2 text-sm">
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
                  className="ml-3 inline-flex items-center gap-1 text-xs font-bold text-red-500"
                >
                  <X size={13} /> Remove
                </button>
              )}
              <p className="mt-2 text-xs font-semibold text-gray-400">Shown on customer exchange rewards. PNG or JPG works best.</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
          </div>
        </div>
        <div className="md:col-span-2">
          <h3 className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-gray-400">Reward Setup</h3>
        </div>
        <div className="md:col-span-2">
          <span className="label">Reward Type</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { value: 'voucher', label: 'Voucher' },
              { value: 'gift', label: 'Physical Product' },
              { value: 'free_delivery', label: 'Shipping Reward' },
              { value: 'discount', label: 'Discount Coupon' },
              { value: 'lucky_box', label: 'Lucky Box' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => set('type', type.value)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-black transition',
                  form.type === type.value ? 'border-[#EC3F8F] bg-pink-50 text-[#EC3F8F]' : 'border-gray-200 bg-white text-gray-600 hover:border-pink-200'
                )}
              >
                <span className={cn('h-3 w-3 rounded-full border', form.type === type.value ? 'border-[#EC3F8F] bg-[#EC3F8F]' : 'border-gray-300')} />
                {type.label}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="label">Points required</span>
          <input className="input-field" type="number" min="1" value={form.points_required} onChange={(e) => set('points_required', e.target.value)} required />
        </label>
        <label>
          <span className="label">SKU</span>
          <input className="input-field" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Optional display SKU" />
        </label>
        <label>
          <span className="label">Weight (kg)</span>
          <input className="input-field" type="number" min="0" step="0.01" value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="Optional shipping weight" />
        </label>
        <label className="md:col-span-2">
          <span className="label">Gallery</span>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm font-bold text-gray-500 hover:border-[#EC3F8F] hover:text-[#EC3F8F]">
            <Upload size={16} /> Add gallery images
          </button>
        </label>
        <div className="md:col-span-2">
          <h3 className="mt-2 text-sm font-black uppercase tracking-[0.14em] text-gray-400">Conditions and Availability</h3>
        </div>
        {['gift', 'lucky_box'].includes(form.type) && (
          <label className="md:col-span-2">
            <span className="label">Gift product for display</span>
            <div className="grid gap-3 md:grid-cols-[1fr_220px]">
              <select className="select-field" value={form.gift_product || ''} onChange={(e) => set('gift_product', e.target.value)}>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>
              <div className="flex min-h-[58px] items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                  {selectedProduct?.primary_image ? (
                    <img src={selectedProduct.primary_image} alt={selectedProduct.name} className="h-full w-full object-contain p-1" />
                  ) : (
                    <Award size={18} className="text-gray-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-gray-800">{selectedProduct?.name || 'No product selected'}</p>
                  <p className="text-[11px] font-semibold text-gray-400">{selectedProduct?.code || 'Shown to customers'}</p>
                </div>
              </div>
            </div>
          </label>
        )}
        <label>
          <span className="label">Coupon amount / percent</span>
          <div className="grid grid-cols-[130px_1fr] gap-2">
            <select className="select-field" value={form.coupon_discount_type} onChange={(e) => set('coupon_discount_type', e.target.value)}>
              {DISCOUNT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <input className="input-field" type="number" min="0" step="0.01" value={form.coupon_value} onChange={(e) => set('coupon_value', e.target.value)} />
          </div>
        </label>
        <label>
          <span className="label">Minimum order amount</span>
          <input className="input-field" type="number" min="0" step="0.01" value={form.minimum_order_amount} onChange={(e) => set('minimum_order_amount', e.target.value)} />
        </label>
        <label>
          <span className="label">Stock quantity</span>
          <input className="input-field" type="number" min="0" placeholder="Blank means no limit" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
        </label>
        <label>
          <span className="label">Per-customer limit</span>
          <input className="input-field" type="number" min="0" placeholder="Blank means no limit" value={form.per_customer_limit} onChange={(e) => set('per_customer_limit', e.target.value)} />
        </label>
        <label>
          <span className="label">Member tier requirement</span>
          <select className="select-field" value={form.member_tier_requirement} onChange={(e) => set('member_tier_requirement', e.target.value)}>
            <option value="all">All members</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
        </label>
        <label>
          <span className="label">Start date</span>
          <input className="input-field" type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
        </label>
        <label>
          <span className="label">End date</span>
          <input className="input-field" type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          <span className="text-sm font-semibold text-gray-700">Visible</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
          <input type="checkbox" checked={form.featured_reward} onChange={(e) => set('featured_reward', e.target.checked)} />
          <span className="text-sm font-semibold text-gray-700">Featured Reward</span>
        </label>
        <label>
          <span className="label">Status</span>
          <select className="select-field" value={form.is_active ? 'active' : 'archived'} onChange={(e) => set('is_active', e.target.value === 'active')}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4 md:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saveMutation.isPending} className="rounded-xl bg-[#EC3F8F] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 disabled:opacity-50">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Reward
          </button>
        </div>
      </form>
      </section>
    </div>
  )
}

export function RewardItemsAdmin() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingReward, setEditingReward] = useState(() => (
    new URLSearchParams(window.location.search).get('new') === '1' ? {} : null
  ))
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })
  const importInputRef = useRef(null)
  const [confirm, ConfirmDialog] = useConfirm()
  const queryClient = useQueryClient()

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
      return matchesSearch && matchesType && matchesStatus && matchesCategory
    })
    return [...filtered].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]
      if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * direction
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction
    })
  }, [displayRewards, search, typeFilter, statusFilter, categoryFilter, sortConfig])

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

  return (
    <div className="space-y-5 bg-[#F8F9FC]">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { title: 'Total Rewards', value: stats.total.toLocaleString(), subtitle: 'All time', icon: Gift, tone: 'bg-pink-50 text-[#EC3F8F]' },
          { title: 'Active Rewards', value: stats.active.toLocaleString(), subtitle: `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% visible`, icon: Package, tone: 'bg-sky-50 text-sky-600' },
          { title: 'Total Redeemed', value: stats.redeemed.toLocaleString(), subtitle: 'All time', icon: Eye, tone: 'bg-rose-50 text-rose-600' },
          { title: 'Out of Stock', value: stats.outOfStock.toLocaleString(), subtitle: `${Math.round((stats.outOfStock / Math.max(stats.total, 1)) * 100)}% attention`, icon: ShoppingCart, tone: 'bg-orange-50 text-orange-500' },
          { title: 'Categories', value: stats.categories.toLocaleString(), subtitle: 'Reward groups', icon: Tag, tone: 'bg-emerald-50 text-emerald-600' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-4">
              <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', item.tone)}>
                <item.icon size={22} />
              </span>
              <div>
                <p className="text-xs font-black text-gray-500">{item.title}</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{item.value}</p>
                <p className="mt-1 text-xs font-semibold text-gray-400">{item.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_160px_160px_170px_150px_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field h-11 bg-[#F8F9FC] pl-9" placeholder="Search reward..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="select-field h-11 bg-[#F8F9FC]" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
            <option value="">All Types</option>
            {REWARD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {rewardCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option value="">All Tiers</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="diamond">Diamond</option>
          </select>
          <button onClick={() => toast.success('Filters applied')} className="btn-secondary h-11 justify-center"><SlidersHorizontal size={16} /> Filter</button>
          <button onClick={exportRewards} className="btn-secondary h-11 justify-center"><Download size={16} /> Export</button>
          <button onClick={() => importInputRef.current?.click()} className="btn-secondary h-11 justify-center"><Upload size={16} /> Import</button>
          <button onClick={() => setEditingReward({})} className="h-11 justify-center rounded-xl bg-[#EC3F8F] px-4 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600">
            <Plus size={16} className="inline" /> Add Reward
          </button>
          <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h1 className="text-xl font-black text-gray-950">Rewards Management</h1>
            <p className="mt-1 text-xs font-semibold text-gray-400">Manage vouchers, coupons, shipping, lucky boxes, and physical reward products</p>
          </div>
          <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-[#EC3F8F]">{visibleRewards.length} rewards</span>
        </div>
        {selectedRewards.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 bg-pink-50 px-5 py-3">
            <p className="text-sm font-black text-[#EC3F8F]">{selectedRewards.length} selected</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => bulkSetActive(true)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-600 shadow-sm"><Check size={14} className="inline" /> Activate</button>
              <button type="button" onClick={() => bulkSetActive(false)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-gray-600 shadow-sm"><Archive size={14} className="inline" /> Deactivate</button>
              <button type="button" onClick={bulkDelete} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-red-500 shadow-sm"><Trash2 size={14} className="inline" /> Delete</button>
            </div>
          </div>
        )}
        {isError && (
          <div className="m-5 rounded-2xl border border-red-100 bg-red-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-red-700">Rewards could not load</p>
                <p className="mt-1 text-xs font-semibold text-red-500">Check the API connection and retry.</p>
              </div>
              <button type="button" onClick={() => refetch()} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-red-600 shadow-sm">
                <RotateCw size={15} className="inline" /> Retry
              </button>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-[#FBFCFE]">
                  <th className="w-12 px-5 py-4 text-left">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all rewards" />
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-gray-400">Image</th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-gray-400"><button type="button" onClick={() => sortBy('name')}>Reward Name</button></th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-gray-400"><button type="button" onClick={() => sortBy('category')}>Category</button></th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-gray-400"><button type="button" onClick={() => sortBy('points_required')}>Points Required</button></th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-gray-400"><button type="button" onClick={() => sortBy('stock')}>Stock</button></th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-gray-400"><button type="button" onClick={() => sortBy('redeemed_count')}>Redeemed</button></th>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase text-gray-400">Status</th>
                  <th className="px-5 py-4 text-right text-xs font-black uppercase text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRewards.map((reward, index) => (
                  <tr key={reward.id} className="border-b border-gray-50 transition hover:bg-pink-50/30">
                    <td className="px-5 py-4">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]" checked={selectedIds.includes(String(reward.id))} onChange={() => toggleSelection(reward.id)} aria-label={`Select ${reward.name}`} />
                    </td>
                    <td className="px-5 py-4"><RewardThumb reward={reward} fallbackIndex={index} /></td>
                    <td className="px-5 py-4">
                      <p className="font-black text-gray-950">{reward.name}</p>
                      <p className="mt-1 text-xs font-semibold text-gray-400">{reward.gift_product_name || 'Shadow Shop Rewards Admin'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-600">{reward.category}</span>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-gray-900">{reward.points_required.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-600">{reward.stock}</td>
                    <td className="px-5 py-4 text-right font-semibold text-gray-700">{reward.redeemed_count.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => reward.raw ? toggleMutation.mutate(reward.raw.id) : toast.error('Reward status cannot be changed without a server record')}
                        className={cn('rounded-full px-2.5 py-1 text-xs font-bold', reward.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}
                      >
                        {reward.is_active ? 'Active' : 'Archived'}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => reward.raw ? setEditingReward(reward.raw) : toast.error('Reward detail is not available')} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="View"><Eye size={15} /></button>
                        <button onClick={() => reward.raw ? setEditingReward(reward.raw) : toast.error('Reward edit is not available')} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="Edit"><Edit3 size={15} /></button>
                        <button onClick={() => deleteReward(reward)} className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100">
                          <Trash2 size={15} />
                        </button>
                        <button onClick={() => duplicateReward(reward)} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="Duplicate"><Copy size={15} /></button>
                        <button onClick={() => reward.raw ? toggleMutation.mutate(reward.raw.id) : toast.error('Reward archive is not available')} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-amber-50 hover:text-amber-600" title="Archive"><Archive size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRewards.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-[#EC3F8F]"><Gift size={30} /></span>
                <h2 className="mt-4 text-lg font-black text-gray-950">No rewards found</h2>
                <p className="mt-1 max-w-sm text-sm font-semibold text-gray-400">Create a voucher, coupon, shipping reward, lucky box, or physical product reward for members.</p>
                <button type="button" onClick={() => setEditingReward({})} className="mt-5 rounded-xl bg-[#EC3F8F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-200">
                  <Plus size={16} className="inline" /> Create Reward
                </button>
              </div>
            )}
            {(data?.previous || data?.next) && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4">
                <p className="text-xs font-semibold text-gray-400">{data?.count || 0} rewards</p>
                <div className="flex gap-2">
                  <button className="btn-secondary px-4 py-2 text-sm" disabled={!data?.previous} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
                  <span className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white">{page}</span>
                  <button className="btn-secondary px-4 py-2 text-sm" disabled={!data?.next} onClick={() => setPage((value) => value + 1)}>Next</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editingReward && <RewardFormModal reward={editingReward.id ? editingReward : null} onClose={() => setEditingReward(null)} />}
      {ConfirmDialog}
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

export function RewardPointsAdmin() {
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
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
                {data.map((customer) => {
                  const stats = transactionStats[String(customer.user)] || { earned: 0, redeemed: 0 }
                  const isActive = Number(customer.points || 0) > 0 || stats.earned > 0
                  return (
                    <tr key={customer.user} className="data-table-row">
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
                          <button onClick={() => toast.success(`${customer.name} history`)} className="btn-secondary ml-auto">
                            <FileText size={15} /> View History
                          </button>
                          <button onClick={() => setSelectedCustomer(customer)} className="btn-secondary ml-auto">
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
    </div>
  )
}

export function RewardTransactionsAdmin() {
  const [filters, setFilters] = useState({ date_from: '', search: '', type: '', status: '', tier: '', reward: '' })
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reward-transactions', filters],
    queryFn: () => ordersApi.adminRewards.transactions.list({
      search: filters.search || undefined,
      type: filters.type || undefined,
      date_from: filters.date_from || undefined,
    }).then((r) => r.data),
  })
  const apiTransactions = unwrapList(data)
  const transactions = apiTransactions.map((item) => {
    const points = Number(item.points || 0)
    const normalizedType = String(item.type || (points < 0 ? 'redeem' : 'earn')).toLowerCase()
    const isExpired = item.expires_at && new Date(item.expires_at) < new Date() && points > 0
    return {
      id: item.id,
      transactionId: `TXN-${String(item.id).padStart(5, '0')}`,
      customer: item.user_name || item.customer_name || 'Shadow Customer',
      tier: item.tier || item.member_tier || 'Member',
      type: isExpired ? 'Expired' : normalizedType === 'redeem' ? 'Redeemed' : normalizedType === 'adjust' ? 'Adjusted' : 'Earned',
      description: item.note || item.order_number || 'Point transaction',
      points,
      balanceAfter: Number(item.balance_after ?? item.balance ?? 0),
      balanceBefore: Number(item.before ?? (Number(item.balance_after ?? 0) - points)),
      date: item.created_at || new Date().toISOString(),
      status: isExpired ? 'Expired' : 'Completed',
      source: item.source || (item.order_number ? 'Order' : 'System'),
      reference: item.order_number || item.reference || '-',
      email: item.email || item.user_email || '',
      phone: item.phone || '',
      order: item.order,
      expiresAt: item.expires_at,
      orderTotal: item.order_total || '-',
      raw: item,
    }
  }).filter((item) => {
    const haystack = `${item.customer} ${item.transactionId} ${item.reference} ${item.description} ${item.source}`.toLowerCase()
    const matchesSearch = !filters.search.trim() || haystack.includes(filters.search.trim().toLowerCase())
    const selectedType = filters.type === 'earn' ? 'Earned' : filters.type === 'redeem' ? 'Redeemed' : filters.type === 'adjust' ? 'Adjusted' : ''
    const matchesType = !filters.type || item.type === selectedType
    const matchesStatus = !filters.status || item.status === filters.status
    const matchesTier = !filters.tier || item.tier.includes(filters.tier)
    const matchesReward = !filters.reward || item.source === filters.reward
    return matchesSearch && matchesType && matchesStatus && matchesTier && matchesReward
  })
  const selectedRows = transactions.filter((item) => selectedIds.includes(String(item.id)))
  const allSelected = transactions.length > 0 && selectedRows.length === transactions.length
  const transactionStats = {
    issued: transactions.filter((item) => item.points > 0).reduce((sum, item) => sum + item.points, 0),
    redeemed: Math.abs(transactions.filter((item) => item.points < 0).reduce((sum, item) => sum + item.points, 0)),
    net: transactions.reduce((sum, item) => sum + item.points, 0),
    total: data?.count ?? transactions.length,
    averageEarn: transactions.filter((item) => item.points > 0).length
      ? Math.round(transactions.filter((item) => item.points > 0).reduce((sum, item) => sum + item.points, 0) / transactions.filter((item) => item.points > 0).length)
      : 0,
    expired: transactions.filter((item) => item.status === 'Expired').reduce((sum, item) => sum + Math.abs(item.points), 0),
  }
  const typeSummary = ['Earned', 'Redeemed', 'Expired', 'Adjusted', 'Bonus'].map((type) => ({
    label: type,
    count: transactions.filter((item) => item.type === type).length,
  })).filter((item) => item.count > 0)
  const sourceSummary = Object.entries(transactions.reduce((acc, item) => {
    acc[item.source] = (acc[item.source] || 0) + Math.abs(item.points)
    return acc
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const dailySummary = Object.entries(transactions.reduce((acc, item) => {
    const key = String(item.date || '').slice(0, 10) || 'Unknown'
    acc[key] = (acc[key] || 0) + Math.abs(item.points)
    return acc
  }, {})).sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
  const maxDailyPoints = Math.max(...dailySummary.map(([, points]) => points), 1)
  const maxSourcePoints = Math.max(...sourceSummary.map(([, points]) => points), 1)
  const typeTone = (type) => ({
    Earned: 'bg-emerald-50 text-emerald-700',
    Redeemed: 'bg-rose-50 text-rose-600',
    Expired: 'bg-amber-50 text-amber-700',
    Adjusted: 'bg-blue-50 text-blue-600',
    Bonus: 'bg-violet-50 text-violet-600',
  }[type] || 'bg-gray-100 text-gray-600')
  const statusTone = (status) => ({
    Completed: 'bg-emerald-50 text-emerald-700',
    Pending: 'bg-amber-50 text-amber-700',
    Failed: 'bg-red-50 text-red-600',
    Expired: 'bg-orange-50 text-orange-600',
    Cancelled: 'bg-gray-100 text-gray-500',
  }[status] || 'bg-gray-100 text-gray-500')
  const exportTransactions = (format) => {
    const columns = ['Transaction ID', 'Customer', 'Tier', 'Type', 'Description', 'Points', 'Balance After', 'Date', 'Status', 'Source']
    const rows = transactions.map((item) => [item.transactionId, item.customer, item.tier, item.type, item.description, item.points, item.balanceAfter, formatDate(item.date), item.status, item.source])
    const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `shadow-shop-point-transactions.${format === 'excel' ? 'xls' : 'csv'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(format === 'excel' ? 'Excel export downloaded' : 'CSV export downloaded')
  }

  return (
    <div className="space-y-5 bg-[#F8F9FC]">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total Points Issued', transactionStats.issued.toLocaleString(), 'Loaded transactions', Percent, 'bg-pink-50 text-[#EC3F8F]'],
          ['Total Points Redeemed', transactionStats.redeemed.toLocaleString(), 'Loaded transactions', Download, 'bg-orange-50 text-orange-500'],
          ['Net Points This Month', `${transactionStats.net >= 0 ? '+' : ''}${transactionStats.net.toLocaleString()}`, 'Current filter', RotateCw, 'bg-violet-50 text-violet-600'],
          ['Total Transactions', transactionStats.total.toLocaleString(), 'Server count', UserRound, 'bg-blue-50 text-blue-600'],
          ['Average Points Per Order', transactionStats.averageEarn.toLocaleString(), 'Average earn row', Clock, 'bg-emerald-50 text-emerald-600'],
          ['Expired Points', transactionStats.expired.toLocaleString(), 'Loaded transactions', CalendarDays, 'bg-amber-50 text-amber-700'],
        ].map(([title, value, trend, Icon, tone]) => (
          <div key={title} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
            <span className={cn('flex h-12 w-12 items-center justify-center rounded-full', tone)}><Icon size={22} /></span>
            <p className="mt-4 text-xs font-black text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-black text-gray-950">{value}</p>
            <p className={cn('mt-2 text-xs font-black', String(trend).startsWith('-') ? 'text-red-500' : 'text-emerald-600')}>{trend}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="grid gap-3 border-b border-gray-100 p-5 xl:grid-cols-[1.4fr_150px_150px_150px_150px_160px_auto_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field h-11 bg-[#F8F9FC] pl-9" placeholder="Search by customer, order ID or txn ID..." value={filters.search} onChange={(e) => set('search', e.target.value)} />
          </div>
          <select className="select-field h-11 bg-[#F8F9FC]" value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">All Types</option>
            <option value="earn">Earned</option>
            <option value="redeem">Redeemed</option>
            <option value="adjust">Adjusted</option>
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All Status</option>
            {['Completed', 'Pending', 'Failed', 'Expired', 'Cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={filters.tier} onChange={(e) => set('tier', e.target.value)}>
            <option value="">All Members</option>
            {['Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </select>
          <select className="select-field h-11 bg-[#F8F9FC]" value={filters.reward} onChange={(e) => set('reward', e.target.value)}>
            <option value="">All Sources</option>
            {['Order', 'Redeem', 'System', 'Review', 'Coupon', 'Referral', 'Admin'].map((source) => <option key={source} value={source}>{source}</option>)}
          </select>
          <input className="input-field h-11 bg-[#F8F9FC]" type="date" value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} />
          <button onClick={() => toast.success('Filters applied')} className="btn-secondary h-11 justify-center"><SlidersHorizontal size={16} /> Filter</button>
          <button onClick={() => refetch()} className="btn-secondary h-11 justify-center"><RotateCw size={16} /> Refresh</button>
          <button onClick={() => exportTransactions('csv')} className="btn-secondary h-11 justify-center"><Download size={16} /> Export CSV</button>
          <button onClick={() => exportTransactions('excel')} className="btn-secondary h-11 justify-center"><FileText size={16} /> Export Excel</button>
        </div>
        {selectedRows.length > 0 && (
          <div className="border-b border-pink-100 bg-pink-50 px-5 py-3 text-sm font-black text-[#EC3F8F]">{selectedRows.length} selected</div>
        )}
        {isLoading ? (
          <div className="space-y-3 p-5">{[...Array(8)].map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-100 bg-[#FBFCFE]">
                  <th className="w-12 px-5 py-4 text-left"><input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : transactions.map((item) => String(item.id)))} className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]" /></th>
                  {['Transaction ID', 'Customer', 'Transaction Type', 'Description', 'Points', 'Balance After', 'Date & Time', 'Status', 'Source', 'Actions'].map((head) => (
                    <th key={head} className={cn('px-5 py-4 text-xs font-black uppercase text-gray-400', ['Points', 'Balance After', 'Actions'].includes(head) ? 'text-right' : 'text-left')}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => {
                  return (
                    <tr key={item.id} className="border-b border-gray-50 transition hover:bg-pink-50/30">
                      <td className="px-5 py-4"><input type="checkbox" checked={selectedIds.includes(String(item.id))} onChange={() => setSelectedIds((current) => current.includes(String(item.id)) ? current.filter((id) => id !== String(item.id)) : [...current, String(item.id)])} className="h-4 w-4 rounded border-gray-300 accent-[#EC3F8F]" /></td>
                      <td className="px-5 py-4 font-mono text-xs font-black text-gray-800">{item.transactionId}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-xs font-black text-[#EC3F8F]">{item.customer.slice(0, 1)}</span>
                          <div><p className="font-black text-gray-950">{item.customer}</p><p className="text-xs font-semibold text-gray-400">{item.tier}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className={cn('rounded-lg px-3 py-1 text-xs font-black', typeTone(item.type))}>{item.type}</span></td>
                      <td className="px-5 py-4"><p className="font-black text-gray-800">{item.description.split(' ').slice(0, 3).join(' ')}</p><p className="text-xs font-semibold text-gray-400">{item.description.split(' ').slice(3).join(' ') || item.source}</p></td>
                      <td className={cn('px-5 py-4 text-right font-black', item.points >= 0 ? 'text-emerald-600' : 'text-[#EC3F8F]')}>{item.points >= 0 ? '+' : ''}{item.points.toLocaleString()}</td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-700">{item.balanceAfter.toLocaleString()}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-gray-600">{formatDate(item.date)}</td>
                      <td className="px-5 py-4"><span className={cn('rounded-lg px-3 py-1 text-xs font-black', statusTone(item.status))}>{item.status}</span></td>
                      <td className="px-5 py-4 font-semibold text-gray-700">{item.source}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setSelectedTransaction(item)} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="View Details"><Eye size={15} /></button>
                          <button onClick={() => item.order ? toast.success(`Order ${item.reference} is linked`) : toast.error('No order is linked to this transaction')} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="View Order"><ShoppingCart size={15} /></button>
                          <button onClick={() => toast.error('Customer detail navigation is not wired for this endpoint yet')} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="View Customer"><UserRound size={15} /></button>
                          <button onClick={() => window.print()} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="Print"><FileText size={15} /></button>
                          <button onClick={() => toast.error('No additional transaction actions are available from the API yet')} className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]" title="More"><MoreHorizontal size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-[#EC3F8F]"><FileText size={30} /></span>
                <h2 className="mt-4 text-lg font-black text-gray-950">No transactions found</h2>
                <p className="mt-1 max-w-sm text-sm font-semibold text-gray-400">Try changing filters or refresh reward transaction data.</p>
                <button type="button" onClick={() => refetch()} className="mt-5 rounded-xl bg-[#EC3F8F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-200"><RotateCw size={16} className="inline" /> Refresh Data</button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
              <p className="text-xs font-semibold text-gray-400">Showing {transactions.length ? 1 : 0} to {transactions.length} of {data?.count ?? transactions.length} transactions</p>
              <div className="flex items-center gap-2">{[1, 2, 3].map((page) => <button key={page} className={cn('h-10 w-10 rounded-xl text-sm font-black', page === 1 ? 'bg-[#EC3F8F] text-white shadow-lg shadow-pink-100' : 'bg-gray-100 text-gray-600')}>{page}</button>)}<button className="btn-secondary h-10 px-4 text-sm">10 / page</button></div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.75fr_1fr_0.9fr_0.9fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Transactions by Type</h2>
          {typeSummary.length ? (
            <>
              <div className="mx-auto mt-6 flex h-36 w-36 items-center justify-center rounded-full bg-pink-50 text-center text-sm font-black text-[#EC3F8F]">{transactions.length}<br />rows</div>
              <div className="mt-5 space-y-2">{typeSummary.map((item) => <p key={item.label} className="flex justify-between text-sm font-black text-gray-600"><span>{item.label}</span><span>{item.count}</span></p>)}</div>
            </>
          ) : <p className="mt-8 text-sm font-semibold text-gray-400">No transaction type data yet.</p>}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Daily Point Transactions</h2>
          {dailySummary.length ? (
            <div className="mt-6 flex h-48 items-end gap-3 border-b border-l border-gray-100 px-4">
              {dailySummary.map(([date, points]) => <div key={date} className="flex flex-1 items-end"><span className="w-full rounded-t-lg bg-[#EC3F8F]" title={`${date}: ${points} pts`} style={{ height: `${Math.max(8, (points / maxDailyPoints) * 100)}%`, opacity: 0.65 }} /></div>)}
            </div>
          ) : <p className="mt-8 text-sm font-semibold text-gray-400">No daily transaction data yet.</p>}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Top Point Sources</h2>
          {sourceSummary.length ? (
            <div className="mt-5 space-y-3">{sourceSummary.map(([source, points], index) => <div key={source}><div className="mb-2 flex justify-between text-sm font-black text-gray-700"><span>{index + 1}. {source}</span><span>{points.toLocaleString()}</span></div><div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-[#EC3F8F]" style={{ width: `${Math.max(8, (points / maxSourcePoints) * 100)}%` }} /></div></div>)}</div>
          ) : <p className="mt-8 text-sm font-semibold text-gray-400">No source data yet.</p>}
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-gray-950">Points Expiring This Month</h2>
          <div className="mt-5 space-y-3">
            {transactions.filter((item) => item.expiresAt).slice(0, 5).map((item, index) => (
              <div key={item.id} className="flex justify-between text-sm font-black text-gray-700"><span>{index + 1}. {item.customer}</span><span>{formatDate(item.expiresAt)}</span></div>
            ))}
            {!transactions.some((item) => item.expiresAt) && <p className="text-sm font-semibold text-gray-400">No expiring point rows in the current result.</p>}
          </div>
        </div>
      </div>

      {selectedTransaction && <TransactionDetailsDrawer transaction={selectedTransaction} onClose={() => setSelectedTransaction(null)} />}
    </div>
  )
}

function exportTextReceipt(transaction) {
  const lines = [
    'Shadow Shop Point Transaction Receipt',
    `Transaction ID: ${transaction.transactionId}`,
    `Customer: ${transaction.customer}`,
    `Type: ${transaction.type}`,
    `Description: ${transaction.description}`,
    `Points: ${transaction.points >= 0 ? '+' : ''}${transaction.points.toLocaleString()}`,
    `Balance After: ${transaction.balanceAfter.toLocaleString()}`,
    `Date: ${formatDate(transaction.date)}`,
    `Reference: ${transaction.reference}`,
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
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-gray-950/35 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close transaction details" />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div><h2 className="text-xl font-black text-gray-950">Transaction Details</h2><p className="mt-1 text-xs font-black text-gray-400">{transaction.transactionId}</p></div>
          <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 p-2 text-gray-500 hover:bg-pink-50 hover:text-[#EC3F8F]"><X size={18} /></button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section>
            <h3 className="text-sm font-black text-gray-950">Overview</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['Transaction ID', transaction.transactionId],
                ['Status', transaction.status],
                ['Type', transaction.type],
                ['Created Date', formatDate(transaction.date)],
                ['Completed Date', formatDate(transaction.date)],
                ['Source', transaction.source],
                ['Reference Number', transaction.reference],
              ].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><span className="font-semibold text-gray-500">{label}</span><span className="text-right font-black text-gray-900">{value}</span></div>)}
            </div>
          </section>
          <section className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-black text-gray-950">Customer Information</h3>
            <div className="mt-4 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-lg font-black text-[#EC3F8F]">{transaction.customer.slice(0, 1)}</span>
              <div><p className="font-black text-gray-950">{transaction.customer}</p><p className="text-xs font-semibold text-gray-400">{transaction.email || 'Email not provided'}</p><p className="text-xs font-semibold text-gray-400">{transaction.phone || 'Phone not provided'}</p></div>
              <span className="ml-auto rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-black text-violet-600">{transaction.tier}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#F8F9FC] p-3"><p className="text-xs font-semibold text-gray-400">Current Balance</p><p className="font-black text-gray-950">{transaction.balanceAfter.toLocaleString()} pts</p></div><div className="rounded-xl bg-[#F8F9FC] p-3"><p className="text-xs font-semibold text-gray-400">Lifetime Points</p><p className="font-black text-gray-950">Not available</p></div></div>
          </section>
          <section className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-black text-gray-950">Transaction Information</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['Description', transaction.description],
                ['Points Earned', `${transaction.points >= 0 ? '+' : ''}${transaction.points.toLocaleString()} pts`],
                ['Balance Before', `${transaction.balanceBefore.toLocaleString()} pts`],
                ['Balance After', `${transaction.balanceAfter.toLocaleString()} pts`],
                ['Expiry Date', transaction.expiresAt ? formatDate(transaction.expiresAt) : '-'],
                ['Campaign', '-'],
                ['Rule Applied', transaction.source],
                ['Created By', transaction.source === 'Admin' ? 'Admin' : 'System'],
                ['Notes', '-'],
              ].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><span className="font-semibold text-gray-500">{label}</span><span className="text-right font-black text-gray-900">{value}</span></div>)}
            </div>
          </section>
          <section className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-black text-gray-950">Order Information</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['Order ID', transaction.reference],
                ['Order Total', transaction.orderTotal],
                ['Payment Method', 'Not available'],
                ['Items Purchased', 'Not available'],
                ['Order Status', transaction.order ? 'Linked' : 'No linked order'],
              ].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><span className="font-semibold text-gray-500">{label}</span><span className="text-right font-black text-gray-900">{value}</span></div>)}
            </div>
          </section>
        </div>
        <div className="grid gap-2 border-t border-gray-100 bg-white p-6">
          <div className="grid grid-cols-2 gap-2"><button onClick={() => transaction.order ? toast.success(`Order ${transaction.reference} is linked`) : toast.error('No order is linked to this transaction')} className="btn-secondary justify-center">View Order</button><button onClick={() => toast.error('Customer detail navigation is not wired for this endpoint yet')} className="btn-secondary justify-center">View Customer</button></div>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => exportTextReceipt(transaction)} className="btn-secondary justify-center">Download Receipt</button><button onClick={() => window.print()} className="btn-secondary justify-center">Print</button></div>
          <button onClick={() => toast.error('Full history needs a customer transaction-history endpoint first')} className="rounded-xl bg-[#EC3F8F] px-5 py-3 text-sm font-black text-white shadow-lg shadow-pink-200">View Full History</button>
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
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Coupons</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage reward coupon codes, usage limits, and validity</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PlaceholderActionButton icon={Download}>Export</PlaceholderActionButton>
          <PlaceholderActionButton icon={Copy}>Bulk Generate</PlaceholderActionButton>
          <PlaceholderActionButton icon={Plus}>Create Coupon</PlaceholderActionButton>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="form-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Coupon Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Discount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Usage</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Valid Until</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {COUPONS.map((coupon) => (
                <tr key={coupon.code} className="data-table-row">
                  <td className="px-4 py-3 font-mono text-xs font-black text-gray-800">{coupon.code}</td>
                  <td className="px-4 py-3 text-gray-600">{coupon.type}</td>
                  <td className="px-4 py-3 font-black text-[#EC3F8F]">{coupon.discount}</td>
                  <td className="px-4 py-3 text-gray-600">{coupon.usage}</td>
                  <td className="px-4 py-3 text-gray-500">{coupon.valid}</td>
                  <td className="px-4 py-3"><StatusBadge value={coupon.status} /></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => toast.error('Coupon editing needs a backend endpoint before it can save')} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-pink-50 hover:text-[#EC3F8F]"><Edit3 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-gray-950">Coupon usage</h2>
          <div className="mx-auto mt-8 flex h-44 w-44 items-center justify-center rounded-full border-[22px] border-pink-500 border-r-gray-100 border-t-pink-200">
            <div className="text-center">
              <p className="text-3xl font-black text-gray-950">64%</p>
              <p className="text-xs font-bold text-gray-400">Used</p>
            </div>
          </div>
        </div>
      </div>
    </div>
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

export function RewardSettingsAdmin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reward-settings'],
    queryFn: () => ordersApi.adminRewards.settings.get().then((r) => r.data),
  })
  const [settings, setSettings] = useState(null)
  const values = settings || data
  const set = (key, value) => setSettings((current) => ({ ...(current || data), [key]: value }))
  const saveMutation = useMutation({
    mutationFn: () => ordersApi.adminRewards.settings.update(values),
    onSuccess: (response) => {
      queryClient.setQueryData(['admin-reward-settings'], response.data)
      setSettings(null)
      toast.success('Reward settings saved')
    },
    onError: () => toast.error('Could not save reward settings'),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reward Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">Configure earning rules, tiers, expiry, and reward automation</p>
        </div>
        <button type="button" onClick={() => navigate('/admin/rewards/products?new=1')} className="btn-primary h-11 px-5">
          <Plus size={16} /> Add Reward
        </button>
      </div>

      <div className="max-w-6xl">
        {isLoading || !values ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-purple-500" /></div>
        ) : (
        <>
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-black text-gray-950">Earning and bonus amounts</h2>
          <p className="mt-1 text-xs font-semibold text-gray-400">Purchase points are automatic. Manual bonus amounts are available when adjusting customer points.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <span className="label">Points per dollar</span>
            <input className="input-field" type="number" min="1" value={values.points_per_dollar} onChange={(e) => set('points_per_dollar', Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Signup bonus amount (manual)</span>
            <input className="input-field" type="number" min="0" value={values.signup_bonus} onChange={(e) => set('signup_bonus', Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Referral bonus amount (manual)</span>
            <input className="input-field" type="number" min="0" value={values.referral_bonus} onChange={(e) => set('referral_bonus', Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Birthday bonus amount (manual)</span>
            <input className="input-field" type="number" min="0" value={values.birthday_bonus} onChange={(e) => set('birthday_bonus', Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Review bonus amount (manual)</span>
            <input className="input-field" type="number" min="0" value={values.review_bonus} onChange={(e) => set('review_bonus', Number(e.target.value))} />
          </label>
          <label>
            <span className="label">Daily check-in bonus</span>
            <input className="input-field" type="number" min="0" value={values.daily_checkin_bonus} onChange={(e) => set('daily_checkin_bonus', Number(e.target.value))} />
          </label>
        </div>
        </section>
        <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-black text-gray-950">Redemption and expiration</h2>
          <p className="mt-1 text-xs font-semibold text-gray-400">Control redemption limits and how long unused earning balances remain available.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
            <div>
              <p className="text-sm font-black text-gray-900">Point expiration</p>
              <p className="mt-1 text-xs font-semibold text-gray-400">Expire unused points after a period</p>
            </div>
            <input type="checkbox" checked={values.expiration_enabled} onChange={(e) => set('expiration_enabled', e.target.checked)} />
          </label>
          <label>
            <span className="label">Expire after</span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input className="input-field" type="number" min="1" value={values.points_expiry_days} onChange={(e) => set('points_expiry_days', Number(e.target.value))} />
              <span className="text-sm font-black text-gray-500">days</span>
            </div>
          </label>
          <label>
            <span className="label">Minimum points to redeem</span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input className="input-field" type="number" min="0" value={values.minimum_redeem_points} onChange={(e) => set('minimum_redeem_points', Number(e.target.value))} />
              <span className="text-sm font-black text-gray-500">points</span>
            </div>
          </label>
          <label>
            <span className="label">Maximum points per order</span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input className="input-field" type="number" min="0" value={values.maximum_points_per_order} onChange={(e) => set('maximum_points_per_order', Number(e.target.value))} />
              <span className="text-sm font-black text-gray-500">points</span>
            </div>
          </label>
          <label>
            <span className="label">Expiry reminder</span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input className="input-field" type="number" min="0" value={values.expiry_reminder_days} onChange={(e) => set('expiry_reminder_days', Number(e.target.value))} />
              <span className="text-sm font-black text-gray-500">days before</span>
            </div>
          </label>
        </div>
        </section>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="font-black text-gray-950">Member tiers</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label><span className="label">Silver starts</span><input className="input-field" type="number" min="0" value={values.silver_min_points} onChange={(e) => set('silver_min_points', Number(e.target.value))} /></label>
              <label><span className="label">Gold starts</span><input className="input-field" type="number" min="0" value={values.gold_min_points} onChange={(e) => set('gold_min_points', Number(e.target.value))} /></label>
              <label><span className="label">Platinum starts</span><input className="input-field" type="number" min="0" value={values.platinum_min_points} onChange={(e) => set('platinum_min_points', Number(e.target.value))} /></label>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="font-black text-gray-950">Automation</h3>
            <div className="mt-4 space-y-3">
              {[
                ['auto_approve_points', 'Auto approve points'],
                ['auto_apply_on_completed', 'Auto apply points after order completed'],
                ['low_stock_alert_enabled', 'Low stock alert'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm font-bold text-gray-700">{label}</span>
                  <input type="checkbox" checked={Boolean(values[key])} onChange={(e) => set(key, e.target.checked)} />
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-4 z-10 mt-6 flex justify-end rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-lg backdrop-blur">
          <button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary px-6 py-3 disabled:opacity-50">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Settings
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  )
}
