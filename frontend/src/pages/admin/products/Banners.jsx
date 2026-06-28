import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, Pencil, Plus, Trash2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import PageHeader from '@/components/shared/PageHeader'

function compressBannerImage(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' })),
        'image/webp',
        quality
      )
    }
    img.src = url
  })
}

const emptyForm = {
  title: '',
  subtitle: '',
  description: '',
  discount_text: '',
  button_text: 'Shop Now',
  button_link: '/shop',
  order: 0,
  is_active: true,
}

function BannerForm({ banner, onClose, onSaved }) {
  const [form, setForm] = useState(
    banner
      ? { title: banner.title, subtitle: banner.subtitle, description: banner.description, discount_text: banner.discount_text, button_text: banner.button_text, button_link: banner.button_link, order: banner.order, is_active: banner.is_active }
      : { ...emptyForm }
  )
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(banner?.image_url || null)
  const [compressing, setCompressing] = useState(false)
  const fileRef = useRef()
  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (fd) =>
      banner ? productsApi.banners.update(banner.id, fd) : productsApi.banners.create(fd),
    onSuccess: () => {
      qc.invalidateQueries(['admin-banners'])
      qc.invalidateQueries(['home-banners'])
      toast.success(banner ? 'Banner updated' : 'Banner created')
      onSaved()
    },
    onError: () => toast.error('Failed to save banner'),
  })

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setCompressing(true)
    try {
      const compressed = await compressBannerImage(file)
      setImageFile(compressed)
    } finally {
      setCompressing(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (imageFile) fd.append('image', imageFile)
    saveMutation.mutate(fd)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-black text-gray-950">{banner ? 'Edit Banner' : 'New Banner'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          {/* Image upload */}
          <div
            onClick={() => !compressing && fileRef.current.click()}
            className="relative mb-5 flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-purple-300"
          >
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon size={32} />
                <span className="text-sm font-semibold">Click to upload banner image</span>
              </div>
            )}
            {compressing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="text-xs font-bold text-white">Compressing...</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">Title *</span>
                <input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="BEST BEAUTY BEST YOU" className="input-field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">Subtitle</span>
                <input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Limited time offer" className="input-field" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-gray-600">Discount Text</span>
              <input value={form.discount_text} onChange={(e) => set('discount_text', e.target.value)} placeholder="UP TO 50% OFF" className="input-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black text-gray-600">Description</span>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Premium cosmetics for your natural beauty..." className="input-field resize-none" />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">Button Text</span>
                <input value={form.button_text} onChange={(e) => set('button_text', e.target.value)} className="input-field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">Button Link</span>
                <input value={form.button_link} onChange={(e) => set('button_link', e.target.value)} className="input-field" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-gray-600">Order</span>
                <input type="number" value={form.order} onChange={(e) => set('order', Number(e.target.value))} className="input-field" />
              </label>
              <label className="flex cursor-pointer items-center gap-3 pt-5">
                <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="h-4 w-4 accent-purple-600" />
                <span className="text-sm font-bold text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || compressing} className="btn-primary">
              {compressing ? 'Compressing...' : saveMutation.isPending ? 'Saving...' : 'Save Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Banners() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: () => productsApi.banners.list().then((r) => r.data.results ?? r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.banners.delete(id),
    onSuccess: () => { qc.invalidateQueries(['admin-banners']); qc.invalidateQueries(['home-banners']); toast.success('Banner deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => {
      const fd = new FormData(); fd.append('is_active', is_active)
      return productsApi.banners.update(id, fd)
    },
    onSuccess: () => { qc.invalidateQueries(['admin-banners']); qc.invalidateQueries(['home-banners']) },
    onError: () => toast.error('Failed to toggle'),
  })

  const [confirm, ConfirmDialog] = useConfirm()
  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (b) => { setEditing(b); setShowForm(true) }

  return (
    <div>
      <PageHeader
        title="Banners"
        subtitle="Manage hero carousel banners shown on the home page."
        actions={
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Banner
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center">
          <ImageIcon size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-bold text-gray-500">No banners yet</p>
          <button onClick={openNew} className="btn-primary mt-4">Add your first banner</button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <GripVertical size={18} className="shrink-0 cursor-grab text-gray-300" />
              {/* Thumbnail */}
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 to-rose-100">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon size={20} className="text-pink-300" />
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-black text-gray-950">{banner.title}</p>
                {banner.subtitle && <p className="text-xs font-semibold text-pink-600">{banner.subtitle}</p>}
                {banner.discount_text && <p className="text-xs text-gray-500">{banner.discount_text}</p>}
                <p className="mt-1 text-xs text-gray-400">
                  → <span className="font-semibold">{banner.button_text}</span> · {banner.button_link} · order {banner.order}
                </p>
              </div>
              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => toggleMutation.mutate({ id: banner.id, is_active: !banner.is_active })}
                  className={`rounded-xl p-2 transition ${banner.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                  title={banner.is_active ? 'Deactivate' : 'Activate'}
                >
                  {banner.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <button onClick={() => openEdit(banner)} className="rounded-xl p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600">
                  <Pencil size={16} />
                </button>
                <button
                  onClick={async () => { if (await confirm('Delete this banner?', 'This action cannot be undone.')) deleteMutation.mutate(banner.id) }}
                  className="rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BannerForm
          banner={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null) }}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
