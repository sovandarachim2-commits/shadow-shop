import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Award,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Crown,
  Edit3,
  FileText,
  Gift,
  Loader2,
  Minus,
  Package,
  Plus,
  Percent,
  RotateCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Truck,
  Upload,
  UserPlus,
  UserRound,
  X,
  ShoppingCart,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn, formatDate } from '@/utils/helpers'

const REWARD_TYPES = [
  { value: 'discount', label: 'Discount Coupon' },
  { value: 'free_delivery', label: 'Free Delivery' },
  { value: 'gift', label: 'Gift Product' },
  { value: 'manual', label: 'Manual Reward' },
]

const DISCOUNT_TYPES = [
  { value: 'amount', label: 'Amount' },
  { value: 'percent', label: 'Percent' },
]

const REDEMPTION_STATUSES = ['active', 'pending', 'prepared', 'completed', 'used', 'rejected', 'cancelled']

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
  starts_at: '',
  ends_at: '',
  is_active: true,
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
  const popularRewards = redemptions.reduce((acc, item) => {
    const key = item.reward_name || 'Reward'
    acc[key] = acc[key] || { name: key, count: 0 }
    acc[key].count += 1
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reward Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Overview of points, customers, rewards, and exchange activity</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Points Issued" value={totalIssued.toLocaleString()} icon={Award} hint="Earn + manual additions" />
        <StatCard title="Total Points Redeemed" value={totalRedeemed.toLocaleString()} icon={Ticket} tone="bg-rose-50 text-rose-600" hint="Rewards and deductions" />
        <StatCard title="Active Reward Users" value={activeUsers.toLocaleString()} icon={UserRound} tone="bg-violet-50 text-violet-600" hint="Customers with balance" />
        <StatCard title="Pending Reward Exchanges" value={pendingExchanges.toLocaleString()} icon={Clock} tone="bg-amber-50 text-amber-600" hint="Need staff action" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <MiniBarChart />
        <RankedListCard title="Top customers by points" items={pointsData} valueKey="points" emptyText="No customer points yet" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <RankedListCard title="Popular reward products" items={Object.values(popularRewards)} valueKey="count" emptyText="No reward exchanges yet" />
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-gray-950">Recent activity</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Action Type</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-500">Points</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Source</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 8).map((item) => {
                  const points = Number(item.points || 0)
                  return (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="px-3 py-3 font-semibold text-gray-900">{item.user_name}</td>
                      <td className="px-3 py-3 text-gray-600">{item.note || typeLabel(item.type)}</td>
                      <td className={cn('px-3 py-3 text-right font-black', points >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {points >= 0 ? '+' : ''}{points.toLocaleString()} points
                      </td>
                      <td className="px-3 py-3 text-gray-500">{item.order_number || typeLabel(item.type)}</td>
                      <td className="px-3 py-3 text-xs text-gray-400">{formatDate(item.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {transactions.length === 0 && <div className="py-12 text-center text-gray-400">No point activity yet</div>}
          </div>
        </div>
      </div>

      {rewards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm font-semibold text-gray-400">
          Create reward products to start showing exchange options to customers.
        </div>
      )}
    </div>
  )
}

export function RewardRulesAdmin() {
  const [form, setForm] = useState({
    purchasePoints: 10,
    paidOnly: true,
    completedOnly: true,
    ignoreCancelled: true,
    ignoreRefunded: true,
    signupBonus: 500,
    productReview: 100,
    photoReview: 200,
    birthdayBonus: 1000,
    referralBonus: 500,
  })
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const saveRules = () => toast.success('Reward rules saved for admin review')

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reward Rules</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage how customers earn points and how they can use them</p>
        </div>
      </div>

      <RewardProgramOverview />

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="form-card">
          <h2 className="text-lg font-black text-navy-900">Purchase Reward Rule</h2>
          <div className="mt-5 rounded-2xl bg-pink-50 p-5">
            <label className="flex flex-wrap items-center gap-3 text-lg font-black text-gray-950">
              <span>$1 =</span>
              <input
                type="number"
                min="0"
                value={form.purchasePoints}
                onChange={(e) => set('purchasePoints', e.target.value)}
                className="h-12 w-28 rounded-xl border border-pink-100 bg-white px-4 text-center text-xl font-black text-[#E91E73] outline-none focus:border-[#E91E73]"
              />
              <span>points</span>
            </label>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ['paidOnly', 'Payment status must be Paid'],
              ['completedOnly', 'Order status must be Completed'],
              ['ignoreCancelled', 'Ignore cancelled orders'],
              ['ignoreRefunded', 'Ignore refunded orders'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="form-card">
          <h2 className="text-lg font-black text-navy-900">Other Earning Rules</h2>
          <div className="mt-5 space-y-3">
            {[
              ['signupBonus', 'Signup Bonus'],
              ['productReview', 'Product Review'],
              ['photoReview', 'Photo Review'],
              ['birthdayBonus', 'Birthday Bonus'],
              ['referralBonus', 'Referral Bonus'],
            ].map(([key, label]) => (
              <label key={key} className="grid grid-cols-[1fr_130px] items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-black text-gray-800">{label}</span>
                <input
                  type="number"
                  min="0"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="input-field h-10 text-right"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={saveRules} className="btn-primary px-6 py-3">
          <Check size={16} /> Save Changes
        </button>
      </div>
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
    enabled: form.type === 'gift',
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
    }
    const payload = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      payload.append(key, value)
    })
    if (form.type === 'gift' && form.gift_product) payload.append('gift_product', Number(form.gift_product))
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
    <Modal isOpen onClose={onClose} title={isEdit ? 'Edit Reward' : 'Create Reward'} size="xl">
      <form onSubmit={handleSubmit} className="grid gap-4 p-6 md:grid-cols-2">
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
        <label>
          <span className="label">Type</span>
          <select className="select-field" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {REWARD_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Points required</span>
          <input className="input-field" type="number" min="1" value={form.points_required} onChange={(e) => set('points_required', e.target.value)} required />
        </label>
        {form.type === 'gift' && (
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
          <span className="label">Start date</span>
          <input className="input-field" type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
        </label>
        <label>
          <span className="label">End date</span>
          <input className="input-field" type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          <span className="text-sm font-semibold text-gray-700">Active</span>
        </label>
        <div className="flex justify-end gap-2 md:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Reward
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function RewardItemsAdmin() {
  const [search, setSearch] = useState('')
  const [editingReward, setEditingReward] = useState(null)
  const [confirm, ConfirmDialog] = useConfirm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reward-items', search],
    queryFn: () => ordersApi.adminRewards.items.list({ search: search || undefined }).then((r) => r.data),
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
    const ok = await confirm('Delete reward?', `Delete "${reward.name}"? Existing redemption history will stay protected.`, {
      confirmText: 'Delete',
      icon: 'delete',
    })
    if (ok) deleteMutation.mutate(reward.id)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reward Products</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage products, coupons, delivery rewards, and lucky boxes customers exchange with points</p>
        </div>
        <button onClick={() => setEditingReward({})} className="btn-primary">
          <Plus size={16} /> Add Reward Product
        </button>
      </div>

      <div className="form-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search reward products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Image</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Required Points</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Redeemed Count</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id} className="data-table-row">
                    <td className="px-4 py-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                        {reward.reward_image_url || reward.gift_product_image ? (
                          <img src={reward.reward_image_url || reward.gift_product_image} alt={reward.gift_product_name || reward.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          <Award size={18} className="text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{reward.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#E91E73]">{reward.type_label}</span>
                        <span className="max-w-sm truncate text-xs text-gray-400">{reward.gift_product_name || reward.description || 'No description'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(reward.points_required).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{reward.stock ?? 'No limit'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{Number(redemptionCounts[reward.id] || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate(reward.id)}
                        className={cn('rounded-full px-2.5 py-1 text-xs font-bold', reward.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500')}
                      >
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingReward(reward)} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-purple-50 hover:text-purple-600">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => deleteReward(reward)} className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rewards.length === 0 && <div className="py-16 text-center text-gray-400">No rewards found</div>}
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
  const [filters, setFilters] = useState({ date_from: '', search: '', type: '' })
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reward-transactions', filters],
    queryFn: () => ordersApi.adminRewards.transactions.list({
      search: filters.search || undefined,
      type: filters.type || undefined,
      date_from: filters.date_from || undefined,
    }).then((r) => r.data),
  })
  const transactions = unwrapList(data)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Point Transaction History</h1>
          <p className="mt-0.5 text-sm text-gray-500">Audit every earn, redeem, manual adjustment, and refund movement</p>
        </div>
      </div>

      <div className="form-card">
        <div className="mb-4 grid gap-3 md:grid-cols-[180px_1fr_220px]">
          <input className="input-field" type="date" value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search customer, reference, or note..." value={filters.search} onChange={(e) => set('search', e.target.value)} />
          </div>
          <select className="select-field" value={filters.type} onChange={(e) => set('type', e.target.value)}>
            <option value="">All transaction types</option>
            <option value="earn">Earn</option>
            <option value="redeem">Redeem</option>
            <option value="adjust">Manual Adjustment</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Transaction ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Points</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Note</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => {
                  const points = Number(item.points || 0)
                  return (
                    <tr key={item.id} className="data-table-row">
                      <td className="px-4 py-3 font-mono text-xs font-black text-gray-700">TX-{String(item.id).padStart(6, '0')}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.user_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-black text-gray-600">{typeLabel(item.type)}</span>
                      </td>
                      <td className={cn('px-4 py-3 text-right font-black', points >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {points >= 0 ? '+' : ''}{points.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.order_number || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{item.note || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {transactions.length === 0 && <div className="py-16 text-center text-gray-400">No transactions found</div>}
          </div>
        )}
      </div>
    </div>
  )
}

export function RewardSettingsAdmin() {
  const [settings, setSettings] = useState({
    expirationEnabled: true,
    expireAfter: 365,
    minimumRedeem: 500,
    maximumPerOrder: 5000,
  })
  const set = (key, value) => setSettings((current) => ({ ...current, [key]: value }))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Reward Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">Configure point expiration and redemption limits</p>
        </div>
      </div>

      <div className="form-card max-w-4xl">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
            <div>
              <p className="text-sm font-black text-gray-900">Point expiration</p>
              <p className="mt-1 text-xs font-semibold text-gray-400">Expire unused points after a period</p>
            </div>
            <input type="checkbox" checked={settings.expirationEnabled} onChange={(e) => set('expirationEnabled', e.target.checked)} />
          </label>
          <label>
            <span className="label">Expire after</span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input className="input-field" type="number" min="1" value={settings.expireAfter} onChange={(e) => set('expireAfter', e.target.value)} />
              <span className="text-sm font-black text-gray-500">days</span>
            </div>
          </label>
          <label>
            <span className="label">Minimum points to redeem</span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input className="input-field" type="number" min="0" value={settings.minimumRedeem} onChange={(e) => set('minimumRedeem', e.target.value)} />
              <span className="text-sm font-black text-gray-500">points</span>
            </div>
          </label>
          <label>
            <span className="label">Maximum points per order</span>
            <div className="grid grid-cols-[1fr_auto] items-center gap-2">
              <input className="input-field" type="number" min="0" value={settings.maximumPerOrder} onChange={(e) => set('maximumPerOrder', e.target.value)} />
              <span className="text-sm font-black text-gray-500">points</span>
            </div>
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => toast.success('Reward settings saved for admin review')} className="btn-primary px-6 py-3">
            <Check size={16} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
