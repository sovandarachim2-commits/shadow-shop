import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageIcon, ImagePlus, Pencil, Plus, Trash2, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import PageHeader from '@/components/shared/PageHeader'

function compressBannerImage(file, maxWidth = 1600, quality = 0.88) {
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
      qc.invalidateQueries({ queryKey: ['admin-banners'] })
      qc.invalidateQueries({ queryKey: ['home-banners'] })
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
            className="relative mb-5 flex aspect-[2/1] min-h-[160px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-purple-300"
          >
            {preview ? (
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 text-center text-gray-400">
                <ImageIcon size={36} />
                <span className="text-sm font-semibold">Click to upload banner image</span>
                <span className="text-xs font-medium">Recommended 1600×800 (2:1)</span>
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

function CardBackgroundField({ label, hint, imageUrl, fieldName, clearName, gradientClass }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [preview, setPreview] = useState(imageUrl || '')
  const [file, setFile] = useState(null)
  const [compressing, setCompressing] = useState(false)

  useEffect(() => {
    if (!file) setPreview(imageUrl || '')
  }, [imageUrl, file])

  const saveMutation = useMutation({
    mutationFn: (fd) => authApi.siteSettings.update(fd),
    onSuccess: () => {
      setFile(null)
      qc.invalidateQueries({ queryKey: ['site-settings'] })
      qc.invalidateQueries({ queryKey: ['home-feed'] })
      toast.success(`${label} background saved`)
    },
    onError: () => toast.error('Could not save the background'),
  })

  const handleFile = async (event) => {
    const next = event.target.files?.[0]
    if (!next) return
    setPreview(URL.createObjectURL(next))
    setCompressing(true)
    try {
      setFile(await compressBannerImage(next, 1200, 0.86))
    } finally {
      setCompressing(false)
    }
  }

  const save = () => {
    if (!file) return
    const fd = new FormData()
    fd.append(fieldName, file)
    saveMutation.mutate(fd)
  }

  const remove = () => {
    const fd = new FormData()
    fd.append(clearName, '1')
    setPreview('')
    setFile(null)
    saveMutation.mutate(fd)
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-black text-gray-950">{label}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{hint}</p>
      <p className="mt-1 text-xs font-semibold text-gray-400">Recommended 800×640 (5:4)</p>
      <button
        type="button"
        onClick={() => !compressing && fileRef.current?.click()}
        className={`relative mt-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/40 ${gradientClass}`}
      >
        {preview ? <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
        <span className="relative z-10 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-md">
          <ImagePlus size={16} className="text-purple-600" />
          {compressing ? 'Compressing...' : preview ? 'Change background' : 'Add background'}
        </span>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={!file || compressing || saveMutation.isPending} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          {saveMutation.isPending ? 'Saving...' : 'Save background'}
        </button>
        {(preview || imageUrl) && (
          <button type="button" onClick={remove} disabled={saveMutation.isPending} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50">
            <Trash2 size={15} /> Remove
          </button>
        )}
      </div>
    </div>
  )
}

function HomeCardBackgrounds() {
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((response) => response.data),
  })

  return (
    <div className="mb-6">
      <h2 className="text-base font-black text-gray-950">Side card backgrounds</h2>
      <p className="mt-1 text-sm text-gray-500">The photo sits behind the text on the two home page cards. Recommended size is 800×640 (5:4).</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <CardBackgroundField
          label="Flash Sale"
          hint="Limited Time Offers card"
          imageUrl={settings?.flash_card_background_url}
          fieldName="flash_card_background"
          clearName="clear_flash_card_background"
          gradientClass="bg-gradient-to-br from-pink-600 via-rose-500 to-pink-700"
        />
        <CardBackgroundField
          label="VIP Rewards"
          hint="VIP Rewards & Points card"
          imageUrl={settings?.rewards_card_background_url}
          fieldName="rewards_card_background"
          clearName="clear_rewards_card_background"
          gradientClass="bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900"
        />
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-banners'] }); qc.invalidateQueries({ queryKey: ['home-banners'] }); toast.success('Banner deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => {
      const fd = new FormData(); fd.append('is_active', is_active)
      return productsApi.banners.update(id, fd)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-banners'] }); qc.invalidateQueries({ queryKey: ['home-banners'] }) },
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

      <HomeCardBackgrounds />

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
              <div className="h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-pink-50 to-rose-100">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon size={24} className="text-pink-300" />
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
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={banner.is_active}
                  aria-label={banner.is_active ? 'Turn banner off' : 'Turn banner on'}
                  onClick={() => toggleMutation.mutate({ id: banner.id, is_active: !banner.is_active })}
                  disabled={toggleMutation.isPending}
                  className={`relative inline-flex h-9 w-[76px] shrink-0 items-center rounded-full px-2.5 text-[11px] font-black tracking-wide text-white transition disabled:opacity-60 ${banner.is_active ? 'bg-[#22c55e]' : 'bg-gray-300'}`}
                >
                  <span className={banner.is_active ? '' : 'ml-auto'}>{banner.is_active ? 'ON' : 'OFF'}</span>
                  <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-sm transition-all ${banner.is_active ? 'right-1' : 'left-1'}`} />
                </button>
                <button onClick={() => openEdit(banner)} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100">
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={async () => { if (await confirm('Delete this banner?', 'This action cannot be undone.')) deleteMutation.mutate(banner.id) }}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 size={14} /> Delete
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
