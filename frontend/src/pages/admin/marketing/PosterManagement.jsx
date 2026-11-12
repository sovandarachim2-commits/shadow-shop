import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Edit,
  Eye,
  Image as ImageIcon,
  Monitor,
  PauseCircle,
  PlayCircle,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { productsApi } from '@/api/products'
import useAuthStore from '@/store/authStore'
import OffersForYouModal from '@/components/customer/OffersForYouModal'
import { cn, formatDateTime } from '@/utils/helpers'

const BUTTON_LABELS = ['Shop Now', 'View Flash Sale', 'Redeem Points', 'View Details']

const ACTION_TYPES = [
  { value: 'store', label: 'Selected Store Page' },
  { value: 'flash_sale', label: 'Flash Sale Page' },
  { value: 'rewards', label: 'Membership Rewards Page' },
  { value: 'internal', label: 'Internal Page Path' },
  { value: 'external', label: 'External URL' },
]

const TARGET_AUDIENCES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'guests', label: 'Guest Customers' },
  { value: 'logged_in', label: 'Logged-in Customers' },
  { value: 'membership', label: 'Selected Membership Levels' },
]

const MEMBERSHIP_LEVELS = [
  'classic', 'silver', 'gold', 'platinum', 'diamond', 'vip', 'elite', 'royal',
]

const DISPLAY_FREQUENCIES = [
  { value: 'once_per_session', label: 'Once per session' },
  { value: 'once_per_day', label: 'Once per day' },
  { value: 'once_per_campaign', label: 'Once per campaign' },
]

const STATUS_BADGE = {
  draft: { variant: 'default', label: 'Draft' },
  published: { variant: 'success', label: 'Published' },
  paused: { variant: 'warning', label: 'Paused' },
}

const APPROVAL_BADGE = {
  pending: { variant: 'warning', label: 'Pending Approval' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger', label: 'Rejected' },
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function toLocalInputValue(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getApiError(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const firstKey = Object.keys(data)[0]
  const firstVal = firstKey ? data[firstKey] : null
  if (Array.isArray(firstVal)) return `${firstKey}: ${firstVal[0]}`
  if (typeof firstVal === 'string') return `${firstKey}: ${firstVal}`
  return fallback
}

function validateImageFile(file, label) {
  if (!file) return null
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `${label} must be PNG, JPG, JPEG, or WebP.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${label} must be 5 MB or smaller.`
  }
  return null
}

function PosterForm({ poster, brands, onSubmit, onClose, isSaving, uploadProgress }) {
  const [form, setForm] = useState(() => ({
    title: poster?.title || '',
    description: poster?.description || '',
    store: poster?.store ? String(poster.store) : '',
    button_label: poster?.button_label || 'Shop Now',
    action_type: poster?.action_type || 'store',
    action_url: poster?.action_url || '',
    target_audience: poster?.target_audience || 'everyone',
    membership_levels: Array.isArray(poster?.membership_levels) ? poster.membership_levels : [],
    priority: poster?.priority ?? 0,
    start_at: toLocalInputValue(poster?.start_at),
    end_at: toLocalInputValue(poster?.end_at),
    display_frequency: poster?.display_frequency || 'once_per_session',
    status: poster?.status || 'published',
    send_notification: false,
  }))

  const [posterFile, setPosterFile] = useState(null)
  const [posterPreview, setPosterPreview] = useState(poster?.image_url || poster?.mobile_image_url || '')
  const [removeImage, setRemoveImage] = useState(false)

  const handleFilePick = (file) => {
    if (!file) return
    const err = validateImageFile(file, 'Poster image')
    if (err) {
      toast.error(err)
      return
    }
    setPosterFile(file)
    setPosterPreview(URL.createObjectURL(file))
    setRemoveImage(false)
  }

  const toggleTier = (tier) => {
    setForm((prev) => {
      const exists = prev.membership_levels.includes(tier)
      return {
        ...prev,
        membership_levels: exists
          ? prev.membership_levels.filter((item) => item !== tier)
          : [...prev.membership_levels, tier],
      }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Poster title is required.')
      return
    }
    if (form.target_audience === 'membership' && form.membership_levels.length === 0) {
      toast.error('Select at least one membership level.')
      return
    }

    const fd = new FormData()
    fd.append('title', form.title.trim())
    fd.append('description', form.description.trim())
    fd.append('store', form.store || '')
    fd.append('button_label', form.button_label)
    fd.append('action_type', form.action_type)
    fd.append('action_url', form.action_url.trim())
    fd.append('target_audience', form.target_audience)
    fd.append('membership_levels', JSON.stringify(form.membership_levels))
    fd.append('priority', String(Number(form.priority) || 0))
    fd.append('start_at', form.start_at ? new Date(form.start_at).toISOString() : '')
    fd.append('end_at', form.end_at ? new Date(form.end_at).toISOString() : '')
    fd.append('display_frequency', form.display_frequency)
    fd.append('status', form.status)
    if (form.send_notification) fd.append('send_notification', 'true')

    if (posterFile) fd.append('image', posterFile)
    if (removeImage && !posterFile) fd.append('remove_image', 'true')

    onSubmit(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Poster Title *</label>
          <input
            className="input-field"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Weekend Glow Sale — Up to 30% Off"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Short Description</label>
          <textarea
            className="input-field min-h-[76px]"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief promotional highlight shown below the poster..."
            rows={2}
          />
        </div>

        {/* Poster Image */}
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <label className="label mb-0">
              Poster Image <span className="font-normal text-gray-400">(Recommended: 1200 × 800 px)</span>
            </label>
            {posterPreview && (
              <button
                type="button"
                onClick={() => {
                  setPosterFile(null)
                  setPosterPreview('')
                  setRemoveImage(true)
                }}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-4 text-center transition hover:border-pink-300 hover:bg-pink-50/30">
            {posterPreview ? (
              <img
                src={posterPreview}
                alt="Poster preview"
                className="max-h-48 w-full rounded-lg object-contain"
              />
            ) : (
              <div className="py-4 text-gray-400">
                <Upload size={22} className="mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-gray-600">Upload PNG, JPG, JPEG, WebP</p>
                <p className="text-[11px] text-gray-400">Recommended: 1200 × 800 px (3:2) • Max 5 MB • Keeps aspect ratio</p>
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files?.[0])}
            />
          </label>
        </div>

        <div>
          <label className="label">Store (Optional)</label>
          <select
            className="select-field"
            value={form.store}
            onChange={(e) => setForm({ ...form, store: e.target.value })}
          >
            <option value="">All Stores</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Display Priority</label>
          <input
            type="number"
            min={0}
            className="input-field"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Action Button Label</label>
          <select
            className="select-field"
            value={form.button_label}
            onChange={(e) => setForm({ ...form, button_label: e.target.value })}
          >
            {BUTTON_LABELS.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Action Destination</label>
          <select
            className="select-field"
            value={form.action_type}
            onChange={(e) => setForm({ ...form, action_type: e.target.value })}
          >
            {ACTION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {(form.action_type === 'internal' || form.action_type === 'external') && (
          <div className="sm:col-span-2">
            <label className="label">
              {form.action_type === 'external' ? 'External URL (https://...)' : 'Internal Page Path (/shop...)'}
            </label>
            <input
              className="input-field"
              value={form.action_url}
              onChange={(e) => setForm({ ...form, action_url: e.target.value })}
              placeholder={form.action_type === 'external' ? 'https://example.com/promo' : '/shop?category=skincare'}
              required
            />
          </div>
        )}

        <div>
          <label className="label">Start Date & Time</label>
          <input
            type="datetime-local"
            className="input-field"
            value={form.start_at}
            onChange={(e) => setForm({ ...form, start_at: e.target.value })}
          />
        </div>

        <div>
          <label className="label">End Date & Time</label>
          <input
            type="datetime-local"
            className="input-field"
            value={form.end_at}
            onChange={(e) => setForm({ ...form, end_at: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Target Audience</label>
          <select
            className="select-field"
            value={form.target_audience}
            onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
          >
            {TARGET_AUDIENCES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Display Frequency</label>
          <select
            className="select-field"
            value={form.display_frequency}
            onChange={(e) => setForm({ ...form, display_frequency: e.target.value })}
          >
            {DISPLAY_FREQUENCIES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {form.target_audience === 'membership' && (
          <div className="sm:col-span-2">
            <label className="label">Membership Levels</label>
            <div className="flex flex-wrap gap-2">
              {MEMBERSHIP_LEVELS.map((tier) => {
                const selected = form.membership_levels.includes(tier)
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggleTier(tier)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-bold capitalize transition',
                      selected
                        ? 'border-pink-500 bg-pink-50 text-pink-600'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {tier}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <label className="label">Status</label>
          <select
            className="select-field"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        <div className="flex items-end pb-1">
          <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50/70 px-3.5 py-2.5 text-sm font-medium text-gray-700 select-none hover:bg-gray-50">
            <input
              type="checkbox"
              checked={form.send_notification}
              onChange={(e) => setForm({ ...form, send_notification: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[#EC4899] focus:ring-[#EC4899]"
            />
            <span>Send Telegram notification</span>
          </label>
        </div>
      </div>

      {isSaving && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-semibold text-gray-600">
            <span>Uploading poster...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSaving} className="btn-primary">
          {isSaving ? 'Saving...' : poster ? 'Save Changes' : 'Create Poster'}
        </button>
      </div>
    </form>
  )
}

export default function PosterManagement() {
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = Boolean(user?.is_superuser || user?.role === 'super_admin')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [ordering, setOrdering] = useState('priority')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPoster, setEditingPoster] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [previewPoster, setPreviewPoster] = useState(null)
  const [previewDevice, setPreviewDevice] = useState('desktop')

  const queryParams = useMemo(() => {
    const params = { page, ordering }
    if (search.trim()) params.search = search.trim()
    if (statusFilter) params.status = statusFilter
    if (approvalFilter) params.approval_status = approvalFilter
    if (storeFilter) params.store = storeFilter
    return params
  }, [page, ordering, search, statusFilter, approvalFilter, storeFilter])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-offer-posters', queryParams],
    queryFn: () => productsApi.offerPosters.list(queryParams).then((r) => r.data),
  })

  const { data: brandsData } = useQuery({
    queryKey: ['brands-dropdown'],
    queryFn: () => productsApi.brands.list({ page_size: 200 }).then((r) => r.data?.results || r.data || []),
  })

  const posters = data?.results || (Array.isArray(data) ? data : [])
  const totalCount = data?.count ?? posters.length
  const brands = Array.isArray(brandsData) ? brandsData : []

  const invalidatePosters = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-offer-posters'] })
    queryClient.invalidateQueries({ queryKey: ['public-offer-posters'] })
  }

  const createMutation = useMutation({
    mutationFn: (formData) =>
      productsApi.offerPosters.create(formData, {
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
        },
      }),
    onSuccess: () => {
      invalidatePosters()
      setModalOpen(false)
      setEditingPoster(null)
      setUploadProgress(0)
      toast.success('Poster created!')
    },
    onError: (err) => {
      setUploadProgress(0)
      toast.error(getApiError(err, 'Failed to create poster'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }) =>
      productsApi.offerPosters.update(id, formData, {
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
        },
      }),
    onSuccess: () => {
      invalidatePosters()
      setModalOpen(false)
      setEditingPoster(null)
      setUploadProgress(0)
      toast.success('Poster updated!')
    },
    onError: (err) => {
      setUploadProgress(0)
      toast.error(getApiError(err, 'Failed to update poster'))
    },
  })

  const actionMutation = useMutation({
    mutationFn: ({ type, id, reason }) => {
      if (type === 'publish') return productsApi.offerPosters.publish(id)
      if (type === 'pause') return productsApi.offerPosters.pause(id)
      if (type === 'approve') return productsApi.offerPosters.approve(id)
      if (type === 'reject') return productsApi.offerPosters.reject(id, reason)
      return productsApi.offerPosters.delete(id)
    },
    onSuccess: (_, vars) => {
      invalidatePosters()
      const labels = {
        publish: 'Poster published!',
        pause: 'Poster paused!',
        approve: 'Poster approved!',
        reject: 'Poster rejected!',
        delete: 'Poster deleted!',
      }
      toast.success(labels[vars.type] || 'Updated!')
    },
    onError: (err) => toast.error(getApiError(err, 'Action failed')),
  })

  const handleDelete = async (poster) => {
    const ok = await confirm({
      title: 'Delete Poster',
      message: `Delete "${poster.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    })
    if (ok) actionMutation.mutate({ type: 'delete', id: poster.id })
  }

  const handleSave = (formData) => {
    if (editingPoster) {
      updateMutation.mutate({ id: editingPoster.id, formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Poster Management"
        subtitle="Manage Offers for You promotional posters displayed on the customer storefront"
        breadcrumbs={[{ label: 'Marketing' }, { label: 'Poster Management' }]}
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingPoster(null)
              setUploadProgress(0)
              setModalOpen(true)
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Add Poster
          </button>
        }
      />

      <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 px-6 py-4">
          <SearchFilter
            value={search}
            onChange={(val) => {
              setSearch(val)
              setPage(1)
            }}
            placeholder="Search posters by title, description, store..."
          >
            <select
              className="select-field w-36"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="paused">Paused</option>
            </select>
            <select
              className="select-field w-40"
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Approval</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              className="select-field w-40"
              value={storeFilter}
              onChange={(e) => {
                setStoreFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All Stores</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <select
              className="select-field w-40"
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value)
                setPage(1)
              }}
            >
              <option value="priority">Priority (Low → High)</option>
              <option value="-created_at">Newest First</option>
              <option value="start_at">Start Date</option>
              <option value="end_at">End Date</option>
              <option value="title">Title (A → Z)</option>
            </select>
          </SearchFilter>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th className="w-16">No</Th>
              <Th>Poster</Th>
              <Th>Store</Th>
              <Th>Action Button</Th>
              <Th>Position</Th>
              <Th>Schedule</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={9} />}
            {!isLoading && posters.map((poster, index) => {
              const statusConf = STATUS_BADGE[poster.status] || STATUS_BADGE.draft
              const approvalConf = APPROVAL_BADGE[poster.approval_status] || APPROVAL_BADGE.pending
              return (
                <Tr key={poster.id}>
                  <Td className="font-semibold text-gray-500">{(page - 1) * 20 + index + 1}</Td>
                  <Td>
                    <div className="flex max-w-[280px] items-center gap-3">
                      {poster.image_url || poster.mobile_image_url ? (
                        <img
                          src={poster.image_url || poster.mobile_image_url}
                          alt={poster.title}
                          className="h-14 w-20 shrink-0 rounded-xl border border-gray-100 bg-gray-50 object-contain"
                        />
                      ) : (
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{poster.title}</p>
                        <p className="line-clamp-2 text-xs text-gray-500">
                          {poster.description || '—'}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-sm font-medium text-gray-700">
                      {poster.store_name || 'All Stores'}
                    </span>
                  </Td>
                  <Td>
                    <div className="text-xs">
                      <span className="inline-flex rounded-lg bg-pink-50 px-2 py-0.5 font-bold text-pink-600">
                        {poster.button_label}
                      </span>
                      <p className="mt-1 truncate max-w-[160px] text-gray-400">
                        {poster.resolved_action_url || poster.action_url || '—'}
                      </p>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono text-sm font-semibold text-gray-700">#{poster.priority}</span>
                  </Td>
                  <Td>
                    <div className="text-xs text-gray-500">
                      <p>Start: {poster.start_at ? formatDateTime(poster.start_at) : 'Immediate'}</p>
                      <p>End: {poster.end_at ? formatDateTime(poster.end_at) : 'No expiry'}</p>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      <Badge variant={approvalConf.variant}>{approvalConf.label}</Badge>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs text-gray-500">{formatDateTime(poster.created_at)}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewDevice('desktop')
                          setPreviewPoster(poster)
                        }}
                        className="rounded-lg p-1.5 text-purple-600 transition hover:bg-purple-50"
                        title="Preview popup"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPoster(poster)
                          setUploadProgress(0)
                          setModalOpen(true)
                        }}
                        className="rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit size={15} />
                      </button>
                      {poster.status !== 'published' ? (
                        <button
                          type="button"
                          onClick={() => actionMutation.mutate({ type: 'publish', id: poster.id })}
                          className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50"
                          title="Publish"
                        >
                          <PlayCircle size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => actionMutation.mutate({ type: 'pause', id: poster.id })}
                          className="rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50"
                          title="Pause"
                        >
                          <PauseCircle size={15} />
                        </button>
                      )}
                      {isSuperAdmin && poster.approval_status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => actionMutation.mutate({ type: 'approve', id: poster.id })}
                          className="rounded-lg p-1.5 text-emerald-600 transition hover:bg-emerald-50"
                          title="Approve"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {isSuperAdmin && poster.approval_status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => actionMutation.mutate({ type: 'reject', id: poster.id, reason: 'Needs revision' })}
                          className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50"
                          title="Reject"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(poster)}
                        className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
            {!isLoading && posters.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState message="No offer posters yet" icon={Sparkles} />
                </td>
              </tr>
            )}
          </Tbody>
        </Table>

        {(data?.previous || data?.next) && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3 text-sm text-gray-500">
            <span>Showing {posters.length} of {totalCount} posters</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!data?.previous}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!data?.next}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        closeOnBackdrop={false}
        onClose={() => {
          setModalOpen(false)
          setEditingPoster(null)
        }}
        title={editingPoster ? 'Edit Offer Poster' : 'Add Offer Poster'}
        size="lg"
      >
        <PosterForm
          poster={editingPoster}
          brands={brands}
          onSubmit={handleSave}
          onClose={() => {
            setModalOpen(false)
            setEditingPoster(null)
          }}
          isSaving={createMutation.isPending || updateMutation.isPending}
          uploadProgress={uploadProgress}
        />
      </Modal>

      {/* Preview Device Bar + OffersForYouModal */}
      {previewPoster && (
        <div className="fixed left-1/2 top-4 z-[130] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-white shadow-xl">
          <button
            type="button"
            onClick={() => setPreviewDevice('desktop')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition',
              previewDevice === 'desktop' ? 'bg-[#EC4899] text-white' : 'text-slate-300 hover:text-white',
            )}
          >
            <Monitor size={13} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setPreviewDevice('mobile')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition',
              previewDevice === 'mobile' ? 'bg-[#EC4899] text-white' : 'text-slate-300 hover:text-white',
            )}
          >
            <Smartphone size={13} /> Mobile
          </button>
          <button
            type="button"
            onClick={() => setPreviewPoster(null)}
            className="ml-1 rounded-full p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
            aria-label="Close preview"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <OffersForYouModal
        previewMode
        previewPosters={previewPoster ? [previewPoster] : []}
        previewDevice={previewDevice}
        isOpenOverride={Boolean(previewPoster)}
        onCloseOverride={() => setPreviewPoster(null)}
      />

      {ConfirmDialog}
    </div>
  )
}

