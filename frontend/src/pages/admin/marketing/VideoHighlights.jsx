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
import { compressImageForUpload } from '@/utils/imageUpload'
import {
  AUTO_COMPRESS_ABOVE_BYTES,
  MAX_RAW_VIDEO_BYTES,
  compressVideoForUpload,
  formatFileSize,
} from '@/utils/videoUpload'
import { parseVideoEmbed } from '@/utils/videoEmbed'

const INITIAL_FORM = {
  title: '',
  product_label: '',
  product_label_km: '',
  caption: '',
  caption_km: '',
  button_label: '',
  button_label_km: '',
  button_url: '',
  product: '',
  original_video_url: '',
  display_order: '0',
  status: 'draft',
  videoFile: null,
  coverFile: null,
  clearVideo: false,
}

function extractApiError(error, fallback) {
  const status = error?.response?.status
  const data = error?.response?.data
  if (status === 413 || (typeof data === 'string' && data.includes('413'))) {
    return 'Video is too large for the server (HTTP 413). Keep compression enabled or upload a smaller file.'
  }
  if (typeof data === 'string' && data.trim()) {
    if (data.trim().startsWith('<')) return fallback
    return data
  }
  if (data && typeof data === 'object') {
    if (data.detail) return String(data.detail)
    for (const key of Object.keys(data)) {
      const val = data[key]
      if (Array.isArray(val) && val.length > 0) return `${key}: ${val[0]}`
      if (typeof val === 'string') return `${key}: ${val}`
    }
  }
  return error?.message || fallback
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
  const [compressLargeVideo, setCompressLargeVideo] = useState(true)
  const [uploadStage, setUploadStage] = useState('')

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
      try {
        let videoToUpload = form.videoFile
        if (videoToUpload && compressLargeVideo && videoToUpload.size > AUTO_COMPRESS_ABOVE_BYTES) {
          setUploadStage('Compressing video… 0%')
          const result = await compressVideoForUpload(videoToUpload, {
            onProgress: (pct) => setUploadStage(`Compressing video… ${pct}%`),
          })
          videoToUpload = result.file
          if (result.compressed) {
            toast.success(`Compressed video: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.finalSize)}`)
          }
        }
        if (videoToUpload && videoToUpload.size > MAX_RAW_VIDEO_BYTES) {
          throw new Error('Video file size must be 500 MB or smaller.')
        }

        let coverToUpload = form.coverFile
        if (coverToUpload) {
          setUploadStage('Optimizing cover…')
          coverToUpload = await compressImageForUpload(coverToUpload, {
            maxSize: 1280,
            targetSize: 220 * 1024,
          })
        }

        const fd = new FormData()
        fd.append('title', form.title.trim())
        fd.append('product_label', form.product_label.trim())
        fd.append('product_label_km', form.product_label_km.trim())
        fd.append('caption', form.caption.trim())
        fd.append('caption_km', form.caption_km.trim())
        fd.append('button_label', form.button_label.trim())
        fd.append('button_label_km', form.button_label_km.trim())
        fd.append('button_url', form.button_url.trim())
        if (form.product) fd.append('product', form.product)
        else fd.append('product', '')
        fd.append('original_video_url', form.original_video_url.trim())
        fd.append('display_order', String(Number(form.display_order || 0)))
        fd.append('status', form.status || 'draft')
        if (videoToUpload) fd.append('video', videoToUpload)
        else if (form.clearVideo) fd.append('clear_video', 'true')
        if (coverToUpload) fd.append('cover_image', coverToUpload)

        setUploadStage('Uploading… 0%')
        const uploadConfig = {
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return
            const pct = Math.min(100, Math.round((progressEvent.loaded / progressEvent.total) * 100))
            setUploadStage(pct >= 100 ? 'Processing on server…' : `Uploading… ${pct}%`)
          },
        }

        if (editingVideo) {
          return await productsApi.videoHighlights.update(editingVideo.id, fd, uploadConfig)
        }
        return await productsApi.videoHighlights.create(fd, uploadConfig)
      } finally {
        setUploadStage('')
      }
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
      button_label: item.button_label || '',
      button_label_km: item.button_label_km || '',
      button_url: item.button_url || '',
      product: item.product ? String(item.product) : '',
      original_video_url: item.original_video_url || '',
      display_order: String(item.display_order ?? 0),
      status: item.status || 'draft',
      videoFile: null,
      coverFile: null,
      clearVideo: false,
    })
    setShowFormModal(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    const hasUploadedVideo = Boolean(form.videoFile || (editingVideo?.video_url && !form.clearVideo))
    const hasVideoLink = Boolean(form.original_video_url.trim())
    if (!hasUploadedVideo && !hasVideoLink) {
      return toast.error('Please upload a video file or enter a YouTube, TikTok, Facebook, or Telegram link')
    }
    if (!editingVideo && !form.coverFile) return toast.error('Please upload a cover image')
    if (form.original_video_url.trim() && !form.original_video_url.trim().startsWith('https://')) {
      return toast.error('Video link must start with https://')
    }
    const btnUrl = form.button_url.trim()
    if (btnUrl && (btnUrl.startsWith('//') || (!btnUrl.startsWith('/') && !/^https?:\/\//i.test(btnUrl)))) {
      return toast.error('Button link must start with / or https://')
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
    video_url: form.clearVideo && !videoObjectUrl ? '' : (videoObjectUrl || editingVideo?.video_url || ''),
    cover_image_url: coverObjectUrl || editingVideo?.cover_image_url || '',
    product_label: form.product_label,
    product_label_km: form.product_label_km,
    caption: form.caption,
    caption_km: form.caption_km,
    button_label: form.button_label.trim(),
    button_label_km: form.button_label_km.trim(),
    button_url: form.button_url.trim(),
    resolved_button_url: form.button_url.trim() || (form.product ? `/product/${form.product}` : ''),
    product: form.product ? Number(form.product) : null,
    product_is_available: Boolean(form.product),
    original_video_url: form.original_video_url.trim(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Highlights"
        subtitle="Manage 9:16 storefront video highlights shown after New Arrivals"
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
                  {!item.video_url && item.original_video_url && (
                    <span className="mt-0.5 inline-block rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                      {parseVideoEmbed(item.original_video_url)?.embedUrl ? 'Iframe Embed' : 'External Link'}
                    </span>
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
        backdropClassName="bg-transparent backdrop-blur-none"
        className="border border-gray-200"
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
              <label className="label">Video Upload (optional if embed link added)</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-4 text-center transition hover:border-pink-400 hover:bg-pink-50/40">
                <Upload size={18} className="text-pink-600" />
                <span className="text-xs font-semibold text-gray-700">
                  {form.videoFile
                    ? `${form.videoFile.name} (${formatFileSize(form.videoFile.size)})`
                    : editingVideo?.video_url && !form.clearVideo
                      ? 'Replace current uploaded video'
                      : 'Choose MP4, MOV, WebM'}
                </span>
                <span className="text-[11px] text-gray-400">
                  Portrait 9:16 • Auto-compressed if &gt; 18 MB (max 500 MB raw / 50 MB stored)
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.webm,.m4v"
                  onChange={(e) => setForm({ ...form, videoFile: e.target.files?.[0] || null, clearVideo: false })}
                  className="hidden"
                />
              </label>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600">
                  <input
                    type="checkbox"
                    checked={compressLargeVideo}
                    onChange={(e) => setCompressLargeVideo(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span>Compress large video before upload</span>
                </label>
                {editingVideo?.video_url && !form.clearVideo && !form.videoFile && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, clearVideo: true })}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove uploaded file
                  </button>
                )}
                {form.clearVideo && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, clearVideo: false })}
                    className="text-xs font-semibold text-gray-600 hover:underline"
                  >
                    Keep existing file
                  </button>
                )}
              </div>
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
              <label className="label">Button Name (English, optional)</label>
              <input
                type="text"
                value={form.button_label}
                onChange={(e) => setForm({ ...form, button_label: e.target.value })}
                className="input-field"
                placeholder="Shop Now"
              />
            </div>
            <div>
              <label className="label">Button Name (Khmer, optional)</label>
              <input
                type="text"
                value={form.button_label_km}
                onChange={(e) => setForm({ ...form, button_label_km: e.target.value })}
                className="input-field"
                placeholder="ទិញឥឡូវ"
              />
            </div>
          </div>

          <div>
            <label className="label">Button Link (optional — overrides Linked Product link)</label>
            <input
              type="text"
              value={form.button_url}
              onChange={(e) => setForm({ ...form, button_url: e.target.value })}
              className="input-field"
              placeholder="/shop, /flash-sale, /product/12, or https://..."
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Leave blank to link automatically to the Linked Product page (or hide button if no product is selected).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Linked Product</label>
              <select
                value={form.product}
                onChange={(e) => setForm({ ...form, product: e.target.value })}
                className="select-field"
              >
                <option value="">- None -</option>
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
            <label className="label">Video Link / Iframe Embed (YouTube, TikTok, Facebook, Telegram)</label>
            <input
              type="url"
              value={form.original_video_url}
              onChange={(e) => setForm({ ...form, original_video_url: e.target.value })}
              className="input-field"
              placeholder="https://youtube.com/shorts/..., https://tiktok.com/@user/video/..., https://facebook.com/reel/..., https://t.me/channel/123"
            />
            {form.original_video_url.trim() && (() => {
              const info = parseVideoEmbed(form.original_video_url)
              if (!info) {
                return (
                  <p className="mt-1 text-[11px] font-medium text-amber-600">
                    Enter a valid HTTPS URL (e.g. YouTube, TikTok, Facebook, or public Telegram post).
                  </p>
                )
              }
              return info.embedUrl ? (
                <p className={`mt-1 text-[11px] font-medium ${info.note ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {info.note
                    ? `${info.label} iframe ready — ${info.note}`
                    : `${info.label} iframe embed ready — no server video upload required.`}
                </p>
              ) : (
                <p className="mt-1 text-[11px] font-medium text-amber-600">
                  {info.reason || `${info.label} will open externally when tapped.`}
                </p>
              )
            })()}
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
              {saveMutation.isPending ? (uploadStage || 'Saving...') : editingVideo ? 'Update Video' : 'Create Video'}
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
        backdropClassName="bg-transparent backdrop-blur-none"
        className="border border-gray-200"
      >
        {previewCardItem && (
          <div className="flex flex-col items-center gap-3 p-5">
            <div className="w-[240px]">
              <VideoHighlightCard
                video={previewCardItem}
                isPreview
                onPlay={(item) => setPreviewPlayerItem(item)}
                onShopNow={(item) => {
                  const target = item.resolved_button_url || item.button_url || (item.product ? `/product/${item.product}` : '')
                  toast(target ? `Button opens: ${target}` : 'No button link configured')
                }}
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

