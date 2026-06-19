import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Award,
  Check,
  Edit3,
  Loader2,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn, formatCurrency, formatDate } from '@/utils/helpers'

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

function RewardFormModal({ reward, onClose }) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(reward?.id)
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

  const handleSubmit = (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      points_required: Number(form.points_required || 0),
      coupon_value: form.coupon_value || '0.00',
      minimum_order_amount: form.minimum_order_amount || '0.00',
      gift_product: form.type === 'gift' && form.gift_product ? Number(form.gift_product) : null,
      stock: form.stock === '' ? null : Number(form.stock),
      per_customer_limit: form.per_customer_limit === '' ? null : Number(form.per_customer_limit),
      starts_at: toApiDate(form.starts_at),
      ends_at: toApiDate(form.ends_at),
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
          <h1 className="text-2xl font-bold text-navy-900">Rewards</h1>
          <p className="mt-0.5 text-sm text-gray-500">Create rewards, set points, stock, limits, and active dates</p>
        </div>
        <button onClick={() => setEditingReward({})} className="btn-primary">
          <Plus size={16} /> Create Reward
        </button>
      </div>

      <div className="form-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search rewards..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reward</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Points</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Coupon</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id} className="data-table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                          {reward.gift_product_image ? (
                            <img src={reward.gift_product_image} alt={reward.gift_product_name || reward.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <Award size={18} className="text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{reward.name}</p>
                          <p className="max-w-sm truncate text-xs text-gray-400">
                            {reward.gift_product_name || reward.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{reward.type_label}</td>
                    <td className="px-4 py-3 text-right font-semibold">{Number(reward.points_required).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {reward.coupon_discount_type === 'percent' ? `${reward.coupon_value}%` : formatCurrency(reward.coupon_value)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{reward.stock ?? 'No limit'}</td>
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
          <h1 className="text-2xl font-bold text-navy-900">Reward Redemptions</h1>
          <p className="mt-0.5 text-sm text-gray-500">Track coupon codes, points spent, and gift fulfillment status</p>
        </div>
      </div>
      <div className="form-card">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search customer, reward, or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reward</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Coupon Code</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Points</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((item) => (
                  <tr key={item.id} className="data-table-row">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{item.user_name}</p>
                      <p className="text-xs text-gray-400">{item.user_phone || item.user_email || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                          {item.gift_product_image ? (
                            <img src={item.gift_product_image} alt={item.gift_product_name || item.reward_name} className="h-full w-full object-contain p-1" />
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
                    <td className="px-4 py-3 font-mono text-gray-700">{item.coupon_code || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{item.points_spent.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select
                        className="select-field w-36 capitalize"
                        value={item.status}
                        onChange={(e) => statusMutation.mutate({ id: item.id, nextStatus: e.target.value })}
                      >
                        {REDEMPTION_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(item.created_at)}</td>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Contact</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Orders</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Spent</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Points</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((customer) => (
                  <tr key={customer.user} className="data-table-row">
                    <td className="px-4 py-3 font-semibold text-gray-900">{customer.name}</td>
                    <td className="px-4 py-3 text-gray-500">{customer.phone || customer.email || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{customer.total_orders}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(customer.total_spent)}</td>
                    <td className="px-4 py-3 text-right font-black text-purple-600">{customer.points.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedCustomer(customer)} className="btn-secondary ml-auto">
                        <SlidersHorizontal size={15} /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
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

export default RewardItemsAdmin
