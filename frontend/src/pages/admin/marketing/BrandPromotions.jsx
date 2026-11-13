import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  Tag,
  Building2,
  ShoppingBag,
  Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { productsApi } from '@/api/products'
import { cn, formatDateTime } from '@/utils/helpers'

const DEFAULT_FORM = {
  name: '',
  type: 'buy_x_get_y',
  brand: '',
  buy_quantity: 2,
  get_quantity: 1,
  min_spend: '',
  reward_selection: 'brand_choice',
  specific_reward_product: '',
  badge_text: 'Buy 2 Get 1 Free',
  description: '',
  start_date: new Date().toISOString().slice(0, 16),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  is_active: true,
}

export default function BrandPromotions() {
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('all')
  const [editingPromo, setEditingPromo] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [confirm, ConfirmDialog] = useConfirm()

  const queryClient = useQueryClient()

  // Load promotions
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['admin-brand-promotions'],
    queryFn: async () => {
      const res = await productsApi.promotions.list()
      const data = res.data
      return Array.isArray(data) ? data : (data?.results || [])
    },
  })

  // Load brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands-list-for-promotions'],
    queryFn: async () => {
      const res = await productsApi.brands.list()
      const data = res.data
      return Array.isArray(data) ? data : (data?.results || [])
    },
  })

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingPromo?.id) {
        return productsApi.promotions.update(editingPromo.id, payload)
      }
      return productsApi.promotions.create(payload)
    },
    onSuccess: () => {
      toast.success(editingPromo?.id ? 'Promotion updated!' : 'Promotion created successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-brand-promotions'] })
      queryClient.invalidateQueries({ queryKey: ['active-brand-promotions'] })
      setIsModalOpen(false)
      setEditingPromo(null)
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to save promotion.'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.promotions.delete(id),
    onSuccess: () => {
      toast.success('Promotion deleted.')
      queryClient.invalidateQueries({ queryKey: ['admin-brand-promotions'] })
      queryClient.invalidateQueries({ queryKey: ['active-brand-promotions'] })
    },
    onError: () => toast.error('Failed to delete promotion.'),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }) => productsApi.promotions.update(id, { is_active }),
    onSuccess: () => {
      toast.success('Promotion status updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-brand-promotions'] })
      queryClient.invalidateQueries({ queryKey: ['active-brand-promotions'] })
    },
    onError: () => toast.error('Failed to change status.'),
  })

  const handleDelete = async (promo) => {
    if (await confirm('Delete Promotion?', `Are you sure you want to delete "${promo.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(promo.id)
    }
  }

  // Filtered promotions
  const filteredPromos = useMemo(() => {
    return promotions.filter((p) => {
      const matchesSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.badge_text?.toLowerCase().includes(search.toLowerCase())
      const matchesBrand = filterBrand === 'all' || String(p.brand) === String(filterBrand)
      return matchesSearch && matchesBrand
    })
  }, [promotions, search, filterBrand])

  // Stats
  const activeCount = useMemo(() => {
    const now = new Date().toISOString()
    return promotions.filter((p) => p.is_active && p.start_date <= now && p.end_date >= now).length
  }, [promotions])

  const participatingBrandsCount = useMemo(() => {
    const set = new Set(promotions.map((p) => p.brand).filter(Boolean))
    return set.size
  }, [promotions])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Promotions"
        subtitle="Manage Buy X Get Y Free promotions for customer brand purchases"
        actions={
          <button
            onClick={() => {
              setEditingPromo(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-500/25 transition hover:brightness-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Promotion</span>
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Promos</p>
              <p className="text-2xl font-black text-gray-900">{promotions.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Now</p>
              <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Participating Brands</p>
              <p className="text-2xl font-black text-gray-900">{participatingBrandsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search by promo name, brand, badge..."
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Brand:</span>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm focus:border-pink-500 focus:outline-none"
          >
            <option value="all">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <Table>
          <Thead>
            <Th>Promotion / Badge</Th>
            <Th>Target Brand</Th>
            <Th>Rule (Buy $\rightarrow$ Free)</Th>
            <Th>Customer Choice</Th>
            <Th>Schedule</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </Thead>
          <Tbody>
            {isLoading ? (
              <LoadingRows cols={7} rows={4} />
            ) : filteredPromos.length === 0 ? (
              <EmptyState
                colSpan={7}
                icon={Gift}
                title="No Brand Promotions found"
                description="Click 'New Promotion' above to configure your first Buy X Get Y Free brand campaign."
              />
            ) : (
              filteredPromos.map((promo) => {
                const now = new Date().toISOString()
                const isLive = promo.is_active && promo.start_date <= now && promo.end_date >= now
                const isExpired = promo.end_date < now
                const isUpcoming = promo.start_date > now

                return (
                  <Tr key={promo.id}>
                    <Td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{promo.name}</span>
                          {promo.badge_text && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-black text-pink-600 border border-pink-100">
                              <Sparkles className="h-3 w-3" />
                              {promo.badge_text}
                            </span>
                          )}
                        </div>
                        {promo.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{promo.description}</p>
                        )}
                      </div>
                    </Td>

                    <Td>
                      <div className="flex items-center gap-2">
                        {promo.brand_logo ? (
                          <img
                            src={promo.brand_logo}
                            alt={promo.brand_name || 'Brand'}
                            className="h-7 w-7 rounded-lg object-contain bg-gray-50 p-0.5 border border-gray-100"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                        <span className="font-bold text-gray-900">{promo.brand_name || 'All / Custom'}</span>
                      </div>
                    </Td>

                    <Td>
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-700">
                          <span>Buy {promo.buy_quantity || 2}</span>
                          <span>$\rightarrow$</span>
                          <span className="text-pink-600">Get {promo.get_quantity || 1} FREE</span>
                        </div>
                        <p className="text-[11px] font-semibold text-gray-500">
                          {promo.min_spend ? `Min. spend: $${Number(promo.min_spend).toFixed(2)}` : 'Min. spend: Unlimited'}
                        </p>
                      </div>
                    </Td>

                    <Td>
                      <span className="text-xs font-semibold text-gray-600">
                        {promo.reward_selection === 'brand_choice' && '🎯 Customer Choice (Any Brand Product)'}
                        {promo.reward_selection === 'same_product' && '🔁 Same Product Free'}
                        {promo.reward_selection === 'specific_product' && `🎁 ${promo.specific_reward_product_name || 'Specific Gift'}`}
                      </span>
                    </Td>

                    <Td>
                      <div className="space-y-0.5 text-xs text-gray-500">
                        <p>{formatDateTime(promo.start_date)}</p>
                        <p className="text-gray-400">to {formatDateTime(promo.end_date)}</p>
                      </div>
                    </Td>

                    <Td>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={promo.is_active}
                          onClick={() =>
                            toggleStatusMutation.mutate({ id: promo.id, is_active: !promo.is_active })
                          }
                          className={cn(
                            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none',
                            promo.is_active ? 'bg-emerald-500' : 'bg-gray-200 hover:bg-gray-300'
                          )}
                          title={promo.is_active ? 'Click to turn OFF' : 'Click to turn ON'}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out',
                              promo.is_active ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>

                        <div className="flex flex-col">
                          <span
                            className={cn(
                              'text-xs font-black',
                              promo.is_active ? 'text-emerald-600' : 'text-gray-400'
                            )}
                          >
                            {promo.is_active ? 'ON' : 'OFF'}
                          </span>
                          {isLive && <span className="text-[10px] font-semibold text-emerald-600">Live</span>}
                          {isUpcoming && <span className="text-[10px] font-semibold text-amber-600">Upcoming</span>}
                          {isExpired && <span className="text-[10px] font-semibold text-gray-400">Expired</span>}
                        </div>
                      </div>
                    </Td>

                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingPromo(promo)
                            setIsModalOpen(true)
                          }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Edit promotion"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promo)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete promotion"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                )
              })
            )}
          </Tbody>
        </Table>
      </div>

      {/* Promotion Form Modal */}
      {isModalOpen && (
        <BrandPromotionModal
          promo={editingPromo}
          brands={brands}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingPromo(null)
          }}
          onSave={(data) => saveMutation.mutate(data)}
          isSaving={saveMutation.isPending}
        />
      )}

      {ConfirmDialog}
    </div>
  )
}

function BrandPromotionModal({ promo, brands, isOpen, onClose, onSave, isSaving }) {
  const [form, setForm] = useState(
    promo
      ? {
          name: promo.name || '',
          type: promo.type || 'buy_x_get_y',
          brand: promo.brand || '',
          buy_quantity: promo.buy_quantity || 2,
          get_quantity: promo.get_quantity || 1,
          min_spend: promo.min_spend !== null && promo.min_spend !== undefined ? String(promo.min_spend) : '',
          reward_selection: promo.reward_selection || 'brand_choice',
          specific_reward_product: promo.specific_reward_product || '',
          badge_text: promo.badge_text || 'Buy 2 Get 1 Free',
          description: promo.description || '',
          start_date: promo.start_date ? promo.start_date.slice(0, 16) : DEFAULT_FORM.start_date,
          end_date: promo.end_date ? promo.end_date.slice(0, 16) : DEFAULT_FORM.end_date,
          is_active: promo.is_active ?? true,
        }
      : { ...DEFAULT_FORM }
  )

  const selectedBrand = useMemo(() => {
    return brands.find((b) => String(b.id) === String(form.brand))
  }, [brands, form.brand])

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Please enter a promotion name.')
      return
    }
    if (!form.brand) {
      toast.error('Please select a target brand.')
      return
    }
    if (Number(form.buy_quantity) < 1 || Number(form.get_quantity) < 1) {
      toast.error('Buy and Free quantities must be at least 1.')
      return
    }

    onSave({
      ...form,
      brand: Number(form.brand),
      buy_quantity: Number(form.buy_quantity),
      get_quantity: Number(form.get_quantity),
      min_spend: form.min_spend !== '' && form.min_spend !== null && !isNaN(Number(form.min_spend)) ? Number(form.min_spend) : null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={promo ? 'Edit Brand Promotion' : 'New Brand Promotion'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
        {/* Promotion Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700">
            Promotion Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. COSRX Buy 2 Get 1 Free Super Deal"
            className="input-field mt-1"
          />
        </div>

        {/* Brand Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700">
            Target Brand <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.brand}
            onChange={(e) => set('brand', e.target.value)}
            className="input-field mt-1"
          >
            <option value="">-- Select Brand --</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantities (Buy X -> Get Y) & Spend Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
          <div>
            <label className="block text-xs font-black text-gray-800">
              Buy Quantity (X) <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-gray-500 mb-1.5">Items customer must buy</p>
            <input
              type="number"
              min={1}
              required
              value={form.buy_quantity}
              onChange={(e) => set('buy_quantity', e.target.value)}
              className="input-field bg-white font-black text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-800">
              Free Quantity (Y) <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-gray-500 mb-1.5">Free items given per set</p>
            <input
              type="number"
              min={1}
              required
              value={form.get_quantity}
              onChange={(e) => set('get_quantity', e.target.value)}
              className="input-field bg-white font-black text-pink-600"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-800">
              Min. Spend Amount ($)
            </label>
            <p className="text-[11px] text-gray-500 mb-1.5">Blank = Unlimited</p>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Unlimited"
              value={form.min_spend}
              onChange={(e) => set('min_spend', e.target.value)}
              className="input-field bg-white font-bold text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Reward Selection Option */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">
            Free Gift Selection Mode
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                form.reward_selection === 'brand_choice'
                  ? 'border-pink-500 bg-pink-50/30 ring-1 ring-pink-500'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <input
                type="radio"
                name="reward_selection"
                value="brand_choice"
                checked={form.reward_selection === 'brand_choice'}
                onChange={(e) => set('reward_selection', e.target.value)}
                className="mt-0.5 accent-pink-600"
              />
              <div>
                <span className="block text-xs font-bold text-gray-900">
                  🎯 Customer Choice (Any Brand Product)
                </span>
                <span className="block text-[11px] text-gray-500">
                  Customer gets to pick whatever product they want from this brand in the cart!
                </span>
              </div>
            </label>

            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition',
                form.reward_selection === 'same_product'
                  ? 'border-pink-500 bg-pink-50/30 ring-1 ring-pink-500'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <input
                type="radio"
                name="reward_selection"
                value="same_product"
                checked={form.reward_selection === 'same_product'}
                onChange={(e) => set('reward_selection', e.target.value)}
                className="mt-0.5 accent-pink-600"
              />
              <div>
                <span className="block text-xs font-bold text-gray-900">
                  🔁 Same Product Free
                </span>
                <span className="block text-[11px] text-gray-500">
                  Customer automatically receives an extra free unit of the purchased item.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Badge & Description */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-gray-700">Badge Text</label>
            <input
              type="text"
              value={form.badge_text}
              onChange={(e) => set('badge_text', e.target.value)}
              placeholder="e.g. Buy 2 Get 1 Free"
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">Short Note / Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. Special weekend promotion"
              className="input-field mt-1"
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-gray-700">Start Date & Time</label>
            <input
              type="datetime-local"
              required
              value={form.start_date}
              onChange={(e) => set('start_date', e.target.value)}
              className="input-field mt-1"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700">End Date & Time</label>
            <input
              type="datetime-local"
              required
              value={form.end_date}
              onChange={(e) => set('end_date', e.target.value)}
              className="input-field mt-1"
            />
          </div>
        </div>

        {/* Status Toggle (Green Slider) */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
          <div>
            <span className="block text-xs font-bold text-gray-800">
              Promotion Status:{' '}
              {form.is_active ? (
                <span className="font-black text-emerald-600">Active (ON)</span>
              ) : (
                <span className="font-black text-gray-400">Disabled (OFF)</span>
              )}
            </span>
            <p className="text-[11px] text-gray-500">
              {form.is_active
                ? 'This campaign will be active and customers can unlock free gifts.'
                : 'This campaign is paused/hidden and will not apply in cart.'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={form.is_active}
            onClick={() => set('is_active', !form.is_active)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none',
              form.is_active ? 'bg-emerald-500' : 'bg-gray-200 hover:bg-gray-300'
            )}
            title={form.is_active ? 'Click to disable' : 'Click to activate'}
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out',
                form.is_active ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="rounded-2xl border border-pink-200/80 bg-gradient-to-r from-pink-50/80 via-rose-50/60 to-pink-50/80 p-4 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-wider text-pink-600 mb-2.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-pink-500" />
            Storefront Live Preview
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white p-3.5 border border-pink-100 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1 text-xs font-black text-white shadow-xs">
                <Gift className="h-3.5 w-3.5" />
                {form.badge_text || 'Buy 2 Get 1 Free'}
              </span>
              <span className="text-xs text-gray-800 font-bold">
                Buy {form.buy_quantity} from {selectedBrand?.name || 'Selected Brand'}
                {form.min_spend ? ` (Min. spend $${Number(form.min_spend).toFixed(2)})` : ' (No min. spend)'}, get {form.get_quantity} FREE!
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-fit">
              Customer picks any brand item free
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-500/25 transition hover:brightness-105 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : promo ? 'Save Changes' : 'Create Promotion'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

