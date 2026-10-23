import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, Tag, Plus, Edit, Trash2, Star, X, Minus, Image, Upload, Images, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'

const IMAGE_MAX_SIZE = 1800
const IMAGE_QUALITY = 0.92
const IMAGE_COMPRESS_THRESHOLD = 2 * 1024 * 1024

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}

async function optimizeImage(file) {
  if (!file.type.startsWith('image/') || file.size <= IMAGE_COMPRESS_THRESHOLD) {
    return file
  }

  try {
    const img = await loadImage(file)
    const scale = Math.min(1, IMAGE_MAX_SIZE / Math.max(img.width, img.height))
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/webp', IMAGE_QUALITY)
    })

    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.[^.]+$/, '') || 'product-set-image'
    return new File([blob], `${name}.webp`, { type: 'image/webp' })
  } catch {
    return file
  }
}

function SetForm({ set, onSave, onClose, saving }) {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    name: set?.name || '',
    description: set?.description || '',
    price: set?.price ?? '',
    discount_price: set?.discount_price ?? '',
    is_active: set?.is_active ?? true,
    is_featured: set?.is_featured ?? false,
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(set?.image_url || null)
  const [selectedItems, setSelectedItems] = useState(
    set?.items?.map((i) => ({
      product: i.product,
      product_name: i.product_name,
      product_code: i.product_code,
      product_image: i.product_image,
      quantity: i.quantity,
    })) || []
  )
  const [selectedProductId, setSelectedProductId] = useState('')

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products-for-set'],
    queryFn: () => productsApi.products.list({ page_size: 200, is_active: true }).then((r) => r.data.results ?? r.data),
  })

  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const addProduct = () => {
    if (!selectedProductId) return
    const product = allProducts.find((p) => p.id === parseInt(selectedProductId))
    if (!product) return
    if (selectedItems.find((i) => i.product === product.id)) {
      toast.error('Product already added')
      return
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        product: product.id,
        product_name: product.name,
        product_code: product.code,
        product_image: product.primary_image || null,
        quantity: 1,
      },
    ])
    setSelectedProductId('')
  }

  const removeItem = (productId) => {
    setSelectedItems((prev) => prev.filter((i) => i.product !== productId))
  }

  const changeQty = (productId, delta) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.product === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    )
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Basic info */}
      <div className="grid gap-4">
        <div>
          <label className="label">Set Image</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-purple-300 hover:bg-purple-50"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="" className="h-full w-full object-contain bg-white p-1" />
              ) : (
                <Image size={24} className="text-gray-300" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm"
              >
                <Upload size={15} /> {imagePreview ? 'Change Image' : 'Upload Image'}
              </button>
              <p className="mt-2 text-xs font-semibold text-gray-400">
                PNG, JPG, WEBP. This image appears on Lucky Box and set cards.
              </p>
              <p className="mt-1 text-xs font-semibold text-purple-500">Recommended size: 1200 x 1200 px</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="label">Set Name *</label>
          <input
            className="input-field"
            value={form.name}
            onChange={(e) => f('name', e.target.value)}
            placeholder="e.g. Skincare Starter Kit"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            value={form.description}
            onChange={(e) => f('description', e.target.value)}
            placeholder="Short description..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Price ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              value={form.price}
              onChange={(e) => f('price', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="label">Discount Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              value={form.discount_price}
              onChange={(e) => f('discount_price', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => f('is_active', e.target.checked)}
              className="h-4 w-4 accent-purple-600"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => f('is_featured', e.target.checked)}
              className="h-4 w-4 accent-purple-600"
            />
            <span className="text-sm font-medium text-gray-700">Featured</span>
          </label>
        </div>
      </div>

      {/* Product selection */}
      <div className="border-t border-gray-100 pt-4">
        <label className="label mb-3">Products in Set ({selectedItems.length})</label>

        {/* Select + Add button */}
        <div className="mb-3 flex gap-2">
          <select
            className="select-field flex-1"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="">— Select a product —</option>
            {allProducts
              .filter((p) => !selectedItems.some((i) => i.product === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={addProduct}
            disabled={!selectedProductId}
            className="btn-primary shrink-0 disabled:opacity-50"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {/* Selected products list */}
        {selectedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center">
            <PackageCheck size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-400">No products added yet</p>
          </div>
        ) : (
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {selectedItems.map((item) => (
              <div
                key={item.product}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
              >
                {item.product_image ? (
                  <img src={item.product_image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-200">
                    <Tag size={13} className="text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{item.product_name}</p>
                  <p className="text-xs text-gray-400">{item.product_code}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeQty(item.product, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => changeQty(item.product, +1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.product)}
                  className="ml-1 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-100 pt-2">
        <button
          onClick={() => onSave(form, selectedItems, imageFile)}
          disabled={saving}
          className="btn-primary flex-1 justify-center disabled:opacity-60"
        >
          {saving ? 'Saving...' : set ? 'Update Set' : 'Create Set'}
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">
          Cancel
        </button>
      </div>
    </div>
  )
}

function SetImageLightbox({ images, index, onChange, onClose }) {
  const img = images[index]
  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onChange(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onChange(index + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, hasPrev, hasNext, onChange, onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
        <X size={20} />
      </button>
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">{index + 1} / {images.length}</span>
        {img.is_primary && (
          <span className="flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
            <Star size={10} className="fill-white" /> Primary
          </span>
        )}
      </div>
      {hasPrev && (
        <button onClick={(e) => { e.stopPropagation(); onChange(index - 1) }} className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25">
          <ChevronLeft size={22} />
        </button>
      )}
      <img src={img.image} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl" />
      {hasNext && (
        <button onClick={(e) => { e.stopPropagation(); onChange(index + 1) }} className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  )
}

function SetImageManagerModal({ productSet, onClose }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [confirmImg, ConfirmImgDialog] = useConfirm()

  const { data: detail, isLoading } = useQuery({
    queryKey: ['product-set-images', productSet.id],
    queryFn: () => productsApi.sets.get(productSet.id).then((r) => r.data),
  })

  const images = detail?.images || []

  const refreshImages = () => {
    qc.invalidateQueries({ queryKey: ['product-set-images', productSet.id] })
    qc.invalidateQueries({ queryKey: ['product-sets'] })
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    setUploading(true)
    try {
      const optimized = await Promise.all(files.map(optimizeImage))
      const fd = new FormData()
      optimized.forEach((file) => fd.append('images', file))
      if (images.length === 0 && !detail?.image_url) fd.append('is_primary', 'true')
      await productsApi.sets.uploadImages(productSet.id, fd)
      refreshImages()
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const moveImage = async (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= images.length) return
    const next = images.map((img) => img.id)
    const [moved] = next.splice(index, 1)
    next.splice(nextIndex, 0, moved)
    try {
      await productsApi.sets.reorderImages(productSet.id, next)
      refreshImages()
    } catch {
      toast.error('Could not change image order')
    }
  }

  const setPrimary = async (imageId) => {
    try {
      await productsApi.sets.setPrimaryImage(productSet.id, imageId)
      refreshImages()
    } catch {
      toast.error('Failed to set primary')
    }
  }

  const deleteImage = async (imageId) => {
    if (!await confirmImg('Delete this image?')) return
    try {
      await productsApi.sets.deleteImage(productSet.id, imageId)
      refreshImages()
      toast.success('Image deleted')
    } catch {
      toast.error('Failed to delete image')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-gray-950">Manage Images</h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{productSet.name}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-100" />)}
            </div>
          ) : images.length === 0 ? (
            <div className="py-10 text-center">
              <Image size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No managed images yet</p>
              {detail?.image_url && (
                <p className="mt-1 text-xs font-semibold text-gray-400">
                  This set still has an older form image. Upload here to manage primary and extra images.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => setLightboxIdx(idx)}
                  className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl border-2 bg-white transition hover:shadow-lg"
                  style={{ borderColor: img.is_primary ? '#9333ea' : '#f3f4f6' }}
                >
                  <img src={img.image} alt="" className="h-full w-full object-contain p-2" />

                  {img.is_primary && (
                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-black text-white shadow">
                      <Star size={9} className="fill-white" /> Primary
                    </div>
                  )}

                  <div className="absolute inset-x-1 bottom-1 z-10 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="Move image earlier"
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); moveImage(idx, -1) }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move image later"
                      disabled={idx === images.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveImage(idx, 1) }}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
                    {!img.is_primary && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrimary(img.id) }}
                        className="flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-purple-700"
                      >
                        <Star size={11} /> Set Primary
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteImage(img.id) }}
                      className="flex items-center gap-1 rounded-xl bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-red-600"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={`mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition ${
              uploading ? 'cursor-wait border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
            }`}
          >
            <Upload size={20} className={uploading ? 'animate-bounce text-purple-400' : 'text-gray-400'} />
            <p className="text-sm font-semibold text-gray-500">
              {uploading ? 'Uploading...' : 'Click to upload more images'}
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP - Multiple files supported</p>
            <p className="text-xs font-semibold text-purple-500">Recommended size: 1200 x 1200 px</p>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-400">
            {images.length} image{images.length !== 1 ? 's' : ''} · Click image to preview · Primary is shown first · Use the arrows to change the display order
          </p>
        </div>
      </div>
      {lightboxIdx !== null && images[lightboxIdx] && (
        <SetImageLightbox
          images={images}
          index={lightboxIdx}
          onChange={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
      {ConfirmImgDialog}
    </div>
  )
}

export default function ProductSets() {
  const qc = useQueryClient()
  const [confirm, ConfirmDialog] = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editSet, setEditSet] = useState(null)
  const [imageSet, setImageSet] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['product-sets'],
    queryFn: () => productsApi.sets.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  const buildSetPayload = (form) => ({
      ...form,
      price: parseFloat(form.price),
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
    })

  const uploadSetImage = async (setId, imageFile) => {
    if (!imageFile) return
    try {
      const optimized = await optimizeImage(imageFile)
      const fd = new FormData()
      fd.append('images', optimized)
      fd.append('is_primary', 'true')
      await productsApi.sets.uploadImages(setId, fd)
    } catch {
      toast.error('Set saved but image upload failed')
    }
  }

  const handleSave = async (form, items, imageFile) => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.price) return toast.error('Price is required')

    const data = buildSetPayload(form)

    setSaving(true)
    try {
      let savedSet
      if (editSet) {
        const res = await productsApi.sets.update(editSet.id, data)
        savedSet = res.data
      } else {
        const res = await productsApi.sets.create(data)
        savedSet = res.data
      }

      await productsApi.sets.setItems(savedSet.id, {
        items: items.map((i) => ({ product: i.product, quantity: i.quantity })),
      })
      await uploadSetImage(savedSet.id, imageFile)

      qc.invalidateQueries({ queryKey: ['product-sets'] })
      setShowModal(false)
      toast.success(editSet ? 'Set updated!' : 'Set created!')
    } catch (e) {
      toast.error(e?.response?.data?.name?.[0] || 'Failed to save set')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s) => {
    if (!await confirm(`Delete "${s.name}"?`, 'This cannot be undone.')) return
    try {
      await productsApi.sets.delete(s.id)
      qc.invalidateQueries({ queryKey: ['product-sets'] })
      toast.success('Set deleted!')
    } catch {
      toast.error('Failed to delete set')
    }
  }

  const openEdit = (s) => {
    setEditSet(s)
    setShowModal(true)
  }

  const openCreate = () => {
    setEditSet(null)
    setShowModal(true)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Product Sets"
        subtitle={`${sets.length} sets`}
        breadcrumbs={[{ label: 'Products' }, { label: 'Product Sets' }]}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Set
          </button>
        }
      />

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Set</Th>
              <Th>Products In Set</Th>
              <Th>Price</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={6} />}
            {!isLoading && sets.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState message="No product sets yet" icon={PackageCheck} />
                  <div className="pb-8 text-center">
                    <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
                      <Plus size={15} /> Create First Set
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && sets.map((s, index) => (
              <Tr key={s.id}>
                <Td><span className="text-sm font-semibold text-gray-500">{index + 1}</span></Td>
                <Td>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-purple-50 text-purple-700">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} className="h-full w-full bg-white object-contain p-1" />
                      ) : (
                        <PackageCheck size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {s.is_featured && <Star size={13} className="shrink-0 fill-yellow-400 text-yellow-500" />}
                        <p className="truncate text-sm font-semibold text-gray-900">{s.name}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">{s.items?.length ?? 0} product{s.items?.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  {s.items?.length > 0 ? (
                    <div className="flex max-w-sm flex-col gap-1.5">
                      {s.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex min-w-0 items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
                            {item.product_image ? (
                              <img src={item.product_image} alt={item.product_name} className="h-full w-full object-contain p-0.5" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><Tag size={12} className="text-gray-300" /></div>
                            )}
                          </div>
                          <p className="truncate text-xs font-semibold text-gray-800">{item.product_name} <span className="text-gray-400">x{item.quantity}</span></p>
                        </div>
                      ))}
                      {s.items.length > 3 && <p className="text-xs font-semibold text-purple-600">+{s.items.length - 3} more</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No products added</span>
                  )}
                </Td>
                <Td>
                  {s.discount_price ? (
                    <div>
                      <p className="text-xs text-gray-400 line-through">{formatCurrency(s.price)}</p>
                      <p className="text-sm font-semibold text-purple-600">{formatCurrency(s.discount_price)}</p>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold">{formatCurrency(s.price)}</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={s.is_active ? 'success' : 'default'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    {s.is_featured && <Badge variant="warning">Featured</Badge>}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setImageSet(s)} title="Manage Images" className="rounded-lg p-1.5 text-purple-500 transition-colors hover:bg-purple-50">
                      <Images size={14} />
                    </button>
                    <button onClick={() => openEdit(s)} title="Edit" className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(s)} title="Delete" className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
      {ConfirmDialog}

      <Modal
        isOpen={showModal}
        onClose={() => !saving && setShowModal(false)}
        title={editSet ? 'Edit Product Set' : 'Add Product Set'}
        size="md"
      >
        <SetForm
          key={editSet?.id ?? 'new'}
          set={editSet}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      </Modal>

      {imageSet && (
        <SetImageManagerModal
          productSet={imageSet}
          onClose={() => setImageSet(null)}
        />
      )}
    </div>
  )
}
