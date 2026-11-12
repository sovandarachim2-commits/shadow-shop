import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  Globe,
  GripVertical,
  Lock,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Send,
  Smartphone,
  Trash2,
  Undo2,
  Laptop,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { AnnouncementBarStage } from '@/components/customer/AnnouncementBar'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useRolePermission } from '@/utils/permissions'
import { formatAnnouncementDate, resolveAnnouncementPresentation } from '@/utils/announcementUtils'
import { cn } from '@/utils/helpers'
import AnnouncementEditor from './AnnouncementEditor'

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live Now' },
  { key: 'published', label: 'Published' },
  { key: 'draft', label: 'Drafts' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'expired', label: 'Expired' },
]

function QuickPreviewModal({ announcement, onClose }) {
  const [device, setDevice] = useState('desktop')
  const [lang, setLang] = useState('en')

  if (!announcement) return null
  const pres = resolveAnnouncementPresentation(announcement, { device, language: lang })

  return (
    <Modal isOpen={Boolean(announcement)} onClose={onClose} title="Announcement Preview" size="lg">
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black text-gray-950">{announcement.title || 'Untitled Announcement'}</p>
            <p className="text-xs text-gray-500">Previewing saved settings across device sizes and languages.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              {[
                { key: 'desktop', label: 'Desktop', Icon: Laptop },
                { key: 'mobile', label: 'Mobile', Icon: Smartphone },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
                    device === key ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'
                  )}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-xl bg-gray-100 p-1">
              {[
                { key: 'en', label: 'EN' },
                { key: 'km', label: 'KH' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setLang(item.key)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold',
                    lang === item.key ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'
                  )}
                >
                  <Globe size={12} /> {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center rounded-2xl border border-gray-200 bg-slate-100 p-4">
          <div className={cn('w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md', device === 'mobile' && 'max-w-[360px]')}>
            {pres.visible ? (
              <AnnouncementBarStage
                announcements={[announcement]}
                device={device}
                language={lang}
                isPreview
              />
            ) : (
              <div className="bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-800">
                {pres.hiddenReason}
              </div>
            )}
            <div className="p-4">
              <div className="h-8 rounded-lg bg-gray-100" />
              <div className="mt-3 h-20 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function AnnouncementBarAdmin() {
  const qc = useQueryClient()
  const [confirm, ConfirmDialog] = useConfirm()
  const { allowed: canView, isLoading: loadingPerm } = useRolePermission('marketing_announcements', 'view')
  const { allowed: canCreate } = useRolePermission('marketing_announcements', 'create')
  const { allowed: canEdit } = useRolePermission('marketing_announcements', 'edit')
  const { allowed: canDelete } = useRolePermission('marketing_announcements', 'delete')

  const [editorMode, setEditorMode] = useState(null) // null | { item: object | null }
  const [previewItem, setPreviewItem] = useState(null)
  const [filterTab, setFilterTab] = useState('all')
  const [search, setSearch] = useState('')
  const [draggedId, setDraggedId] = useState(null)

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => productsApi.announcements.list().then((r) => (Array.isArray(r.data) ? r.data : r.data?.results || [])),
    enabled: canView,
  })

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-announcements'] })
    qc.invalidateQueries({ queryKey: ['public-announcements'] })
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => productsApi.announcements.toggleActive(id, is_active),
    onSuccess: (_, { is_active }) => {
      invalidateAll()
      toast.success(is_active ? 'Announcement enabled' : 'Announcement disabled')
    },
    onError: () => toast.error('Update failed'),
  })

  const publishMutation = useMutation({
    mutationFn: ({ id, publish }) =>
      publish ? productsApi.announcements.publish(id) : productsApi.announcements.unpublish(id),
    onSuccess: (_, { publish }) => {
      invalidateAll()
      toast.success(publish ? 'Announcement published' : 'Moved to draft')
    },
    onError: () => toast.error('Publish failed'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id) => productsApi.announcements.duplicate(id),
    onSuccess: () => {
      invalidateAll()
      toast.success('Duplicated as draft')
    },
    onError: () => toast.error('Duplicate failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.announcements.delete(id),
    onSuccess: () => {
      invalidateAll()
      toast.success('Announcement deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  const reorderMutation = useMutation({
    mutationFn: (orderedIds) => productsApi.announcements.reorder(orderedIds),
    onSuccess: (res) => {
      qc.setQueryData(['admin-announcements'], res.data)
      qc.invalidateQueries({ queryKey: ['public-announcements'] })
      toast.success('Priority updated')
    },
    onError: () => {
      invalidateAll()
      toast.error('Reorder failed')
    },
  })

  const stats = useMemo(() => {
    const total = announcements.length
    const live = announcements.filter((a) => a.is_currently_live).length
    const drafts = announcements.filter((a) => a.status === 'draft').length
    const scheduledOrExpired = announcements.filter((a) => ['scheduled', 'expired'].includes(a.schedule_state)).length
    return { total, live, drafts, scheduledOrExpired }
  }, [announcements])

  const filteredAnnouncements = useMemo(() => {
    const q = search.trim().toLowerCase()
    return announcements.filter((item) => {
      if (filterTab === 'live' && !item.is_currently_live) return false
      if (filterTab === 'published' && item.status !== 'published') return false
      if (filterTab === 'draft' && item.status !== 'draft') return false
      if (filterTab === 'scheduled' && item.schedule_state !== 'scheduled') return false
      if (filterTab === 'expired' && item.schedule_state !== 'expired') return false

      if (!q) return true
      return [item.title, item.message_en, item.message_km, item.link_url]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    })
  }, [announcements, filterTab, search])

  const commitOrder = (nextList) => {
    const orderedIds = nextList.map((item) => item.id)
    qc.setQueryData(['admin-announcements'], nextList.map((item, idx) => ({ ...item, priority: idx })))
    reorderMutation.mutate(orderedIds)
  }

  const handleDropOnRow = (targetId) => {
    if (!canEdit || !draggedId || draggedId === targetId) {
      setDraggedId(null)
      return
    }
    const list = [...announcements]
    const fromIdx = list.findIndex((item) => item.id === draggedId)
    const toIdx = list.findIndex((item) => item.id === targetId)
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null)
      return
    }
    const [moved] = list.splice(fromIdx, 1)
    list.splice(toIdx, 0, moved)
    setDraggedId(null)
    commitOrder(list)
  }

  const moveByStep = (id, delta) => {
    if (!canEdit) return
    const list = [...announcements]
    const idx = list.findIndex((item) => item.id === id)
    const targetIdx = idx + delta
    if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return
    const [moved] = list.splice(idx, 1)
    list.splice(targetIdx, 0, moved)
    commitOrder(list)
  }

  if (loadingPerm) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <Lock size={22} />
        </div>
        <h2 className="text-lg font-black text-gray-900">Access Restricted</h2>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          You do not have permission to manage Marketing Announcement Bars.
        </p>
      </div>
    )
  }

  if (editorMode !== null) {
    return (
      <AnnouncementEditor
        key={editorMode.item?.id || 'new'}
        announcement={editorMode.item}
        canEdit={editorMode.item ? canEdit : canCreate}
        onBack={() => setEditorMode(null)}
        onSaved={(saved) => setEditorMode({ item: saved })}
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Announcement Bar"
        subtitle="Manage storefront top announcements, styling, animations, scheduling, and live previews."
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setEditorMode({ item: null })}
              className="btn-primary text-sm"
            >
              <Plus size={16} /> Create Announcement
            </button>
          )
        }
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-gray-400">Total Announcements</p>
          <p className="mt-1 text-2xl font-black text-gray-950">{stats.total}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-gray-400">Live on Storefront</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">{stats.live}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-gray-400">Drafts</p>
          <p className="mt-1 text-2xl font-black text-amber-600">{stats.drafts}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs font-bold uppercase text-gray-400">Scheduled / Expired</p>
          <p className="mt-1 text-2xl font-black text-purple-600">{stats.scheduledOrExpired}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterTab(tab.key)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                filterTab === tab.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements..."
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Megaphone size={42} className="mx-auto mb-3 text-gray-200" />
          <p className="font-bold text-gray-600">No announcements found</p>
          <p className="mt-1 text-xs text-gray-400">
            Create an announcement bar to highlight promotions, shipping offers, or store updates.
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setEditorMode({ item: null })}
              className="btn-primary mx-auto mt-4 text-xs"
            >
              <Plus size={15} /> Create Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {canEdit && filterTab === 'all' && !search && announcements.length > 1 && (
            <p className="text-xs font-semibold text-gray-400">
              Drag cards by the handle (or use arrows) to set display priority. Top items show first on the storefront.
            </p>
          )}

          {filteredAnnouncements.map((item, idx) => {
            const swatchStyle = item.use_gradient && item.gradient_css
              ? { backgroundImage: item.gradient_css, color: item.text_color }
              : { backgroundColor: item.background_color, color: item.text_color }
            const startFmt = formatAnnouncementDate(item.start_at)
            const endFmt = formatAnnouncementDate(item.end_at)
            const publishedFmt = formatAnnouncementDate(item.published_at)
            const canDrag = canEdit && filterTab === 'all' && !search

            return (
              <div
                key={item.id}
                draggable={canDrag}
                onDragStart={() => setDraggedId(item.id)}
                onDragOver={(e) => { if (canDrag) e.preventDefault() }}
                onDrop={() => handleDropOnRow(item.id)}
                onDragEnd={() => setDraggedId(null)}
                className={cn(
                  'flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm transition lg:flex-row lg:items-center',
                  draggedId === item.id ? 'border-purple-400 opacity-60' : 'border-gray-100 hover:shadow-md'
                )}
              >
                {/* Priority & Drag Handle */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={cn('text-gray-300', canDrag ? 'cursor-grab active:cursor-grabbing' : 'opacity-40')}>
                    <GripVertical size={18} />
                  </div>
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-gray-100 px-2 text-xs font-black text-gray-600">
                    #{item.priority + 1}
                  </span>
                  {canDrag && (
                    <div className="flex flex-col gap-0.5 lg:hidden">
                      <button
                        type="button"
                        disabled={idx === 0 || reorderMutation.isPending}
                        onClick={() => moveByStep(item.id, -1)}
                        className="rounded bg-gray-100 p-0.5 text-gray-600 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === filteredAnnouncements.length - 1 || reorderMutation.isPending}
                        onClick={() => moveByStep(item.id, 1)}
                        className="rounded bg-gray-100 p-0.5 text-gray-600 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Color Swatch + Info */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-gray-950">
                      {item.title || 'Untitled Announcement'}
                    </span>

                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                        item.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      )}
                    >
                      {item.status === 'published' ? 'Published' : 'Draft'}
                    </span>

                    {item.is_currently_live && (
                      <span className="rounded-full bg-green-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                        Live
                      </span>
                    )}

                    {item.schedule_state === 'scheduled' && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                        Scheduled
                      </span>
                    )}

                    {item.schedule_state === 'expired' && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-bold text-gray-500">
                        Expired
                      </span>
                    )}

                    {item.has_unpublished_changes && (
                      <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                        Draft edits pending
                      </span>
                    )}
                  </div>

                  {/* Mini Bar Preview Pill */}
                  <div
                    className="flex items-center gap-2 truncate rounded-lg px-3 py-1.5 text-xs font-semibold"
                    style={swatchStyle}
                  >
                    <span className="truncate">{item.message_en || item.message_km || item.mobile_message_en}</span>
                    {item.message_km && item.message_en && (
                      <span className="hidden truncate opacity-80 khmer-font sm:inline">· {item.message_km}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span className="capitalize">Animation: <strong>{item.animation_type}</strong></span>
                    <span>Language: <strong>{item.language_rule.toUpperCase()}</strong></span>
                    <span>Pages: <strong>{item.page_display_mode === 'all' ? 'All' : `${item.target_pages?.length || 0} selected`}</strong></span>
                    {publishedFmt && (
                      <span>
                        Published: <strong>{publishedFmt}</strong>
                      </span>
                    )}
                    {(startFmt || endFmt) && (
                      <span>
                        Schedule: <strong>{startFmt || 'Now'} → {endFmt || 'No end'}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.is_active}
                      aria-label={item.is_active ? 'Disable announcement' : 'Enable announcement'}
                      onClick={() => toggleMutation.mutate({ id: item.id, is_active: !item.is_active })}
                      disabled={toggleMutation.isPending}
                      className={cn(
                        'relative inline-flex h-8 w-[68px] shrink-0 items-center rounded-full px-2 text-[10px] font-black tracking-wide text-white transition disabled:opacity-60',
                        item.is_active ? 'bg-[#22c55e]' : 'bg-gray-300'
                      )}
                    >
                      <span className={item.is_active ? '' : 'ml-auto'}>{item.is_active ? 'ON' : 'OFF'}</span>
                      <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all', item.is_active ? 'right-1' : 'left-1')} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-2.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                    title="Preview"
                  >
                    <Eye size={14} /> Preview
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => publishMutation.mutate({ id: item.id, publish: item.status !== 'published' || item.has_unpublished_changes })}
                      disabled={publishMutation.isPending}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold transition',
                        item.status === 'published' && !item.has_unpublished_changes
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      )}
                    >
                      {item.status === 'published' && !item.has_unpublished_changes ? (
                        <><Undo2 size={14} /> Unpublish</>
                      ) : (
                        <><Send size={14} /> Publish</>
                      )}
                    </button>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setEditorMode({ item })}
                      className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  )}

                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => duplicateMutation.mutate(item.id)}
                      disabled={duplicateMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-xl bg-purple-50 px-2.5 py-2 text-xs font-semibold text-purple-600 hover:bg-purple-100"
                      title="Duplicate"
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm(
                          'Delete Announcement?',
                          'This announcement will be permanently deleted.'
                        )
                        if (ok) deleteMutation.mutate(item.id)
                      }}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <QuickPreviewModal announcement={previewItem} onClose={() => setPreviewItem(null)} />
      {ConfirmDialog}
    </div>
  )
}
