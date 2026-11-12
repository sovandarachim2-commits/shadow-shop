import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Edit2,
  Eye,
  Film,
  Image as ImageIcon,
  Plus,
  Send,
  Trash2,
  Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { VideoHighlightCard } from '@/components/customer/VideoHighlightsSection'
import VideoHighlightModal from '@/components/customer/VideoHighlightModal'
import { productsApi } from '@/api/products'

const INITIAL_FORM = {
  title: '',
  product_label: '',
  product_label_km: '',
  caption: '',
  caption_km: '',
  product: '',
  original_video_url: '',
  display_order: '0',
  status: 'draft',
  videoFile: null,
  coverFile: null,
}

function extractApiError(error, fallback) {
  const data = error?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data && typeof data === 'object') {
    if (data.detail) return String(data.detail)
    for (const key of Object.keys(data)) {
      const val = data[key]
      if (Array.isArray(val) && val.length > 0) return `${key}: ${val[0]}`
      if (typeof val === 'string') return `${key}: ${val}`
    }
  }
  return fallback
}

export default function VideoHighlights() {
  const queryClient = useQueryClient()
  const [confirm, confirmDialog] = useConfirm()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [previewCardItem, setPreviewCardItem] = useState(null)
  const [previewPlayerItem, setPreviewPlayerItem] = useState(null)

  const [videoObjectUrl, setVideoObjectUrl] = useState('')
  const [coverObjectUrl, setCoverObjectUrl] = useState('')

  useEffect(() => {
    if (!form.videoFile) {
      setVideoObjectUrl('')
      return undefined
    }
    const url = URL.createObjectURL(form.videoFile)
    setVideoObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [form.videoFile])

  useEffect(() => {
    if (!form.coverFile) {
      setCoverObjectUrl('')
      return undefined
    }
    const url = URL.createObjectURL(form.coverFile)
    setCoverObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [form.coverFile])

  const { data: videosData, isLoading } = useQuery({
    queryKey: ['admin-video-highlights'],
    queryFn: () => productsApi.videoHighlights.list({ page_size: 200 }).then((res) => res.data?.results || res.data || []),
  })

  const { data: productsData } = useQuery({
    queryKey: ['admin-video-product-picker'],
    queryFn: () => productsApi.list({ page_size: 500, is_active: true }).then((res) => res.data?.results || res.data || []),
  })

  const videos = useMemo(() => (Array.isArray(videosData) ? videosData : []), [videosData])
  const products = useMemo(() => (Array.isArray(productsData) ? productsData : []), [productsData])

  const filteredVideos = useMemo(() => {
    const q = search.trim().toLowerCase()
    return videos.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false
      if (!q) return true
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.product_label || '').toLowerCase().includes(q) ||
        (item.product_name || '').toLowerCase().includes(q)
      )
    })
  }, [videos, search, statusFilter])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-video-highlights'] })
    queryClient.invalidateQueries({ queryKey: ['home-feed'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('product_label', form.product_label.trim())
      fd.append('product_label_km', form.product_label_km.trim())
      fd.append('caption', form.caption.trim())
      fd.append('caption_km', form.caption_km.trim())
      if (form.product) fd.append('product', form.product)
      else fd.append('product', '')
      fd.append('original_video_url', form.original_video_url.trim())
      fd.append('display_order', String(Number(form.display_order || 0)))
      fd.append('status', form.status || 'draft')
      if (form.videoFile) fd.append('video', form.videoFile)
      if (form.coverFile) fd.append('cover_image', form.coverFile)

      if (editingVideo) {
        return productsApi.videoHighlights.update(editingVideo.id, fd)
      }
      return productsApi.videoHighlights.create(fd)
    },
    onSuccess: () => {
      invalidateAll()
      toast.success(editingVideo ? 'Video highlight updated' : 'Video highlight created')
      setShowFormModal(false)
      setEditingVideo(null)
      setForm(INITIAL_FORM)
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'Failed to save video highlight'))
    },
  })

  const publishToggleMutation = useMutation({
    mutationFn: (item) =>
      item.status === 'published'
        ? productsApi.videoHighlights.unpublish(item.id)
        : productsApi.videoHighlights.publish(item.id),
    onSuccess: (_, item) => {
      invalidateAll()
      toast.success(item.status === 'published' ? 'Video unpublished' : 'Video published')
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'Failed to update status'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.videoHighlights.delete(id),
    onSuccess: () => {
      invalidateAll()
      toast.success('Video highlight deleted')
    },
    onError: (error) => {
      toast.error(extractApiError(error, 'Failed to delete video highlight'))
    },
  })

  const openCreate = () => {
    setEditingVideo(null)
    setForm(INITIAL_FORM)
    setShowFormModal(true)
  }

  const openEdit = (item) => {
    setEditingVideo(item)
    setForm({
      title: item.title || '',
      product_label: item.product_label || '',
      product_label_km: item.product_label_km || '',
      caption: item.caption || '',
      caption_km: item.caption_km || '',
      product: item.product ? String(item.product) : '',
      original_video_url: item.original_video_url || '',
      display_order: String(item.display_order ?? 0),
      status: item.status || 'draft',
      videoFile: null,
      coverFile: null,
    })
    setShowFormModal(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    if (!editingVideo && !form.videoFile) return toast.error('Please upload a video file')
    if (!editingVideo && !form.coverFile) return toast.error('Please upload a cover image')
    if (form.original_video_url.trim() && !form.original_video_url.trim().startsWith('https://')) {
      return toast.error('Original video link must start with https://')
    }
    saveMutation.mutate()
  }

  const handleDelete = async (item) => {
    const ok = await confirm(
      'Delete Video Highlight',
      `Are you sure you want to delete "${item.title}"?`,
      { confirmText: 'Delete', tone: 'danger' }
    )
    if (ok) deleteMutation.mutate(item.id)
  }

  const buildFormPreviewItem = () => ({
    id: editingVideo?.id || 'preview',
    title: form.title || 'Preview Video',
    video_url: videoObjectUrl || editingVideo?.video_url || '',
    cover_image_url: coverObjectUrl || editingVideo?.cover_image_url || '',
    product_label: form.product_label,
    product_label_km: form.product_label_km,
    caption: form.caption,
    caption_km: form.caption_km,
    product: form.product ? Number(form.product) : null,
    product_is_available: Boolean(form.product),
    original_video_url: form.original_video_url.trim(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Highlights"
        subtitle="Manage 9:16 storefront video highlights shown between Flash Sale and Best Sellers"
        actions={
          <button type="button" onClick={openCreate} className="btn-primary gap-2">
            <Plus size={16} />
            Add Video
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['all', 'published', 'draft'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize transition ${
                statusFilter === st
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="w-72">
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search title, label, or product..."
          />
        </div>
      </div>

      <Table>
        <Thead>
          <tr>
            <Th>No</Th>
            <Th>Cover</Th>
            <Th>Title</Th>
            <Th>Linked Product</Th>
            <Th>Order</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </Thead>
        <Tbody>
          {isLoading ? (
            <LoadingRows rows={5} cols={7} />
          ) : filteredVideos.length === 0 ? (
            <EmptyState colSpan={7} message="No video highlights found." />
          ) : (
            filteredVideos.map((item, idx) => (
              <Tr key={item.id}>
                <Td className="text-xs font-semibold text-gray-400">{idx + 1}</Td>
                <Td>
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="h-16 w-9 rounded-lg object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div className="flex h-16 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <Film size={16} />
                    </div>
                  )}
                </Td>
                <Td>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  {item.product_label && (
                    <p className="text-xs text-gray-500">{item.product_label}</p>
                  )}
                </Td>
                <Td>
                  {item.product_name ? (
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                      {!item.product_is_available && (
                        <span className="text-[11px] font-semibold text-amber-600">
                          Unavailable on storefront
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">None</span>
                  )}
                </Td>
                <Td className="font-semibold text-gray-800">{item.display_order}</Td>
                <Td>
                  <Badge color={item.status === 'published' ? 'success' : 'default'}>
                    {item.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewCardItem(item)}
                      className="btn-secondary px-2.5 py-1.5 text-xs"
                      title="Preview card & modal"
                    >
                      <Eye size={13} />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => publishToggleMutation.mutate(item)}
                      disabled={publishToggleMutation.isPending}
                      className="btn-secondary px-2.5 py-1.5 text-xs"
                    >
                      <Send size={13} />
                      {item.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="btn-secondary px-2.5 py-1.5 text-xs"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false)
          setEditingVideo(null)
        }}
        title={editingVideo ? 'Edit Video Highlight' : 'Add Video Highlight'}
        size="lg"
        closeOnBackdrop={false}
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
                placeholder="e.g. MURU Skincare Routine"
                required
              />
            </div>
            <div>
              <label className="label">Display Order</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Uploads */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Video Upload {editingVideo ? '(optional)' : '*'}</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-4 text-center transition hover:border-pink-400 hover:bg-pink-50/40">
                <Upload size={18} className="text-pink-600" />
                <span className="text-xs font-semibold text-gray-700">
                  {form.videoFile ? form.videoFile.name : editingVideo?.video_url ? 'Replace current video' : 'Choose MP4, MOV, WebM'}
                </span>
                <span className="text-[11px] text-gray-400">Portrait 9:16 • Max 50 MB</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
                  onChange={(e) => setForm({ ...form, videoFile: e.target.files?.[0] || null })}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="label">Cover Image {editingVideo ? '(optional)' : '*'}</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-4 text-center transition hover:border-pink-400 hover:bg-pink-50/40">
                <ImageIcon size={18} className="text-pink-600" />
                <span className="text-xs font-semibold text-gray-700">
                  {form.coverFile ? form.coverFile.name : editingVideo?.cover_image_url ? 'Replace cover image' : 'Choose PNG, JPG, WebP'}
                </span>
                <span className="text-[11px] text-gray-400">Recommended 9:16 (720×1280) • Max 5 MB</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setForm({ ...form, coverFile: e.target.files?.[0] || null })}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Product Label (English)</label>
              <input
                type="text"
                value={form.product_label}
                onChange={(e) => setForm({ ...form, product_label: e.target.value })}
                className="input-field"
                placeholder="e.g. MURU Night Routine"
              />
            </div>
            <div>
              <label className="label">Product Label (Khmer)</label>
              <input
                type="text"
                value={form.product_label_km}
                onChange={(e) => setForm({ ...form, product_label_km: e.target.value })}
                className="input-field"
                placeholder="ឧ. ឈុតថែរក្សាស្បែក MURU"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Caption (English, optional)</label>
              <input
                type="text"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                className="input-field"
                placeholder="Short highlight above Shop Now"
              />
            </div>
            <div>
              <label className="label">Caption (Khmer, optional)</label>
              <input
                type="text"
                value={form.caption_km}
                onChange={(e) => setForm({ ...form, caption_km: e.target.value })}
                className="input-field"
                placeholder="អក្សរខ្លីលើប៊ូតុងទិញឥឡូវ"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Linked Product</label>
              <select
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                className="select-field"
              >
                <option value="">- None (hide Shop Now) -</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="select-field"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Original Video Link (optional HTTPS)</label>
            <input
              type="url"
              value={form.original_video_url}
              onChange={(e) => setForm({ ...form, original_video_url: e.target.value })}
              className="input-field"
              placeholder="https://www.tiktok.com/... or https://www.instagram.com/..."
            />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setPreviewCardItem(buildFormPreviewItem())}
              className="btn-secondary gap-1.5"
            >
              <Eye size={15} />
              Preview Card &amp; Modal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Saving...' : editingVideo ? 'Update Video' : 'Create Video'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowFormModal(false)
                setEditingVideo(null)
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Card + Modal Preview */}
      <Modal
        isOpen={Boolean(previewCardItem)}
        onClose={() => setPreviewCardItem(null)}
        title="Video Card Preview"
        size="sm"
      >
        {previewCardItem && (
          <div className="flex flex-col items-center gap-3 p-5">
            <div className="w-[240px]">
              <VideoHighlightCard
                video={previewCardItem}
                isPreview
                onPlay={(item) => setPreviewPlayerItem(item)}
                onShopNow={() => toast('Shop Now opens the linked product page')}
              />
            </div>
            <p className="text-center text-xs text-gray-500">
              Tap the cover or play button to preview the video modal.
            </p>
          </div>
        )}
      </Modal>

      <VideoHighlightModal
        video={previewPlayerItem}
        onClose={() => setPreviewPlayerItem(null)}
      />
      {confirmDialog}
    </div>
  )
}

