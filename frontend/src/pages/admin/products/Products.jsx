import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Package, Image, ToggleLeft, ToggleRight, Upload, X, Award, Star, Images, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'

const IMAGE_MAX_SIZE = 1800
const IMAGE_QUALITY = 0.92
const IMAGE_COMPRESS_THRESHOLD = 2 * 1024 * 1024
const AVAILABILITY_OPTIONS = [
  { value: 'auto', label: 'Auto by Stock' },
  { value: 'available', label: 'Available' },
  { value: 'out_of_stock', label: 'Out of Stock' },
]

function isAvailableForSale(product) {
  return product?.is_available_for_sale ?? Number(product?.current_stock || 0) > 0
}

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

    const name = file.name.replace(/\.[^.]+$/, '') || 'product-image'
    return new File([blob], `${name}.webp`, { type: 'image/webp' })
  } catch {
    return file
  }
}

function ProductForm({ product, categories, brands, onSave, onClose, isSaving }) {
  const fileInputRef = useRef(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [errors, setErrors] = useState({})

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setSelectedFiles(files)
    setPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const removePreview = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const [form, setForm] = useState({
    code: product?.code || '',
    name: product?.name || '',
    category: product?.category || '',
    brand: product?.brand || '',
    description: product?.description || '',
    benefits: product?.benefits || '',
    how_to_use: product?.how_to_use || '',
    unit: product?.unit || 'piece',
    cost_price: product?.cost_price || '',
    wholesale_price: product?.wholesale_price || '',
    retail_price: product?.retail_price || '',
    min_order_qty: product?.min_order_qty || 1,
    availability_status: product?.availability_status || 'auto',
    is_active: product?.is_active ?? true,
    is_new_arrival: product?.is_new_arrival ?? false,
    is_best_seller: product?.is_best_seller ?? false,
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()

    const nextErrors = {}
    if (!form.name.trim()) nextErrors.name = 'Product name is required'
    if (!String(form.retail_price).trim()) nextErrors.retail_price = 'Retail price is required'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSave(form, selectedFiles)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5 md:p-6">
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="text-sm font-black text-gray-950">Product Information</h3>
        <p className="mt-1 text-xs font-semibold text-gray-400">Fill the required fields to create the product.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Product Code</label>
          <input className="input-field" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="Auto generated if empty" />
          <p className="mt-1 text-xs font-semibold text-gray-400">Leave empty for auto SKU, or type your own product code.</p>
          {errors.code && <p className="mt-1 text-xs font-semibold text-red-500">{errors.code}</p>}
        </div>
        <div>
          <label className="label">Category</label>
          <select className="select-field" value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Select Category</option>
            {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Brand</label>
          <select className="select-field" value={form.brand} onChange={(e) => set('brand', e.target.value)}>
            <option value="">Select Brand</option>
            {(brands || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.products_count != null ? ` (${b.products_count} products)` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label">Product Name *</label>
          <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full product name" />
          {errors.name && <p className="mt-1 text-xs font-semibold text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="label">Unit</label>
          <select className="select-field" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
            {['piece', 'box', 'set', 'bottle', 'tube', 'jar', 'sachet', 'pack'].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Min Order Qty</label>
          <input type="number" className="input-field" value={form.min_order_qty} onChange={(e) => set('min_order_qty', e.target.value)} min={1} />
        </div>
        <div>
          <label className="label">Customer Availability</label>
          <select className="select-field" value={form.availability_status} onChange={(e) => set('availability_status', e.target.value)}>
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs font-semibold text-gray-400">Controls storefront buying without changing inventory stock.</p>
        </div>
        <div>
          <label className="label">Cost Price ($)</label>
          <input type="number" step="0.01" className="input-field" value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} />
        </div>
        <div>
          <label className="label">Wholesale Price ($)</label>
          <input type="number" step="0.01" className="input-field" value={form.wholesale_price} onChange={(e) => set('wholesale_price', e.target.value)} />
        </div>
        <div>
          <label className="label">Retail Price ($)</label>
          <input type="number" step="0.01" className="input-field" value={form.retail_price} onChange={(e) => set('retail_price', e.target.value)} />
          {errors.retail_price && <p className="mt-1 text-xs font-semibold text-red-500">{errors.retail_price}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Benefits</label>
          <textarea className="input-field resize-none" rows={2} value={form.benefits} onChange={(e) => set('benefits', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">How to Use</label>
          <textarea className="input-field resize-none" rows={3} value={form.how_to_use} onChange={(e) => set('how_to_use', e.target.value)} placeholder="Steps or usage instructions for customers" />
        </div>
        <div className="flex flex-wrap gap-4 md:col-span-2">
          {[['is_active', 'Active'], ['is_new_arrival', 'New Arrival'], ['is_best_seller', 'Best Seller']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} className="w-4 h-4 accent-purple-600" />
              {l}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Product Images</label>
        {product?.images?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {product.images.map((img) => (
              <div key={img.id} className="relative">
                <img src={img.image} alt="" className="h-16 w-16 rounded-xl object-contain border border-gray-200 bg-white p-1" />
                {img.is_primary && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-purple-600 px-1.5 py-0.5 text-[9px] font-black text-white">Primary</span>
                )}
              </div>
            ))}
          </div>
        )}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 text-center hover:border-purple-300 hover:bg-purple-50 transition"
        >
          <Upload size={22} className="text-gray-400" />
          <p className="text-sm font-semibold text-gray-500">Click to upload images</p>
          <p className="text-xs text-gray-400">PNG, JPG, WEBP — first image becomes primary</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        {previews.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-16 w-16 rounded-xl object-contain border border-purple-200 bg-white p-1" />
                <button
                  type="button"
                  onClick={() => removePreview(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
                >
                  <X size={11} />
                </button>
                {i === 0 && <span className="absolute -bottom-1 left-0 right-0 text-center text-[9px] font-black text-purple-600">Primary</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 border-t border-gray-100 bg-white p-5 md:-mx-6 md:-mb-6 md:px-6">
        <button type="submit" disabled={isSaving} className="btn-primary flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-60">
          {isSaving ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </button>
        <button type="button" onClick={onClose} disabled={isSaving} className="btn-secondary flex-1 justify-center disabled:opacity-60">Cancel</button>
      </div>
    </form>
  )
}

function Lightbox({ images, index, onChange, onClose }) {
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={20} />
      </button>

      {/* Counter + Primary badge */}
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white">
          {index + 1} / {images.length}
        </span>
        {img.is_primary && (
          <span className="flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
            <Star size={10} className="fill-white" /> Primary
          </span>
        )}
      </div>

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index - 1) }}
          className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Image */}
      <img
        src={img.image}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
      />

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index + 1) }}
          className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {images.map((t, i) => (
            <button
              key={t.id}
              onClick={(e) => { e.stopPropagation(); onChange(i) }}
              className={`h-12 w-12 overflow-hidden rounded-xl border-2 bg-white/10 transition ${i === index ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-90'}`}
            >
              <img src={t.image} alt="" className="h-full w-full object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ImageManagerModal({ product, onClose }) {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [confirmImg, ConfirmImgDialog] = useConfirm()

  const { data: detail, isLoading } = useQuery({
    queryKey: ['product-images', product.id],
    queryFn: () => productsApi.products.get(product.id).then((r) => r.data),
  })

  const images = detail?.images || []

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId) => productsApi.products.setPrimaryImage(product.id, imageId),
    onSuccess: () => qc.invalidateQueries(['product-images', product.id]),
    onError: () => toast.error('Failed to set primary'),
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId) => productsApi.products.deleteImage(product.id, imageId),
    onSuccess: () => {
      qc.invalidateQueries(['product-images', product.id])
      qc.invalidateQueries(['products'])
      toast.success('Image deleted')
    },
    onError: () => toast.error('Failed to delete image'),
  })

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const optimized = await Promise.all(files.map(optimizeImage))
      const fd = new FormData()
      optimized.forEach((f) => fd.append('images', f))
      if (images.length === 0) fd.append('is_primary', 'true')
      await productsApi.products.uploadImages(product.id, fd)
      qc.invalidateQueries(['product-images', product.id])
      qc.invalidateQueries(['products'])
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-gray-950">Manage Images</h2>
            <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">{product.name}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-100" />)}
            </div>
          ) : images.length === 0 ? (
            <div className="py-10 text-center">
              <Image size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm font-semibold text-gray-400">No images yet</p>
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

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
                    {!img.is_primary && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrimaryMutation.mutate(img.id) }}
                        disabled={setPrimaryMutation.isPending}
                        className="flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-purple-700"
                      >
                        <Star size={11} /> Set Primary
                      </button>
                    )}
                    <button
                      onClick={async (e) => { e.stopPropagation(); if (await confirmImg('Delete this image?')) deleteMutation.mutate(img.id) }}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1 rounded-xl bg-red-500 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-red-600"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={`mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-5 text-center transition
              ${uploading ? 'border-purple-200 bg-purple-50 cursor-wait' : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'}`}
          >
            <Upload size={20} className={uploading ? 'animate-bounce text-purple-400' : 'text-gray-400'} />
            <p className="text-sm font-semibold text-gray-500">
              {uploading ? 'Uploading...' : 'Click to upload more images'}
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP · Multiple files supported</p>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-xs text-gray-400">
            {images.length} image{images.length !== 1 ? 's' : ''} · Click image to preview · Hover to set primary or delete
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <Lightbox
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

export default function Products() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [imageProduct, setImageProduct] = useState(null)
  const [page, setPage] = useState(1)
  const [confirm, ConfirmDialog] = useConfirm()
  const pageSize = 20

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, page],
    queryFn: () => productsApi.products.list({ search, category: categoryFilter || undefined, page, page_size: pageSize }).then((r) => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories.list().then((r) => r.data.results || r.data),
  })

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => productsApi.brands.list({ is_active: true }).then((r) => r.data.results || r.data),
  })

  const createMutation = useMutation({
    mutationFn: productsApi.products.create,
    onError: () => toast.error('Failed to create product'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productsApi.products.update(id, data),
    onError: () => toast.error('Failed to update product'),
  })

  const deleteMutation = useMutation({
    mutationFn: productsApi.products.delete,
    onSuccess: () => { queryClient.invalidateQueries(['products']); toast.success('Product deleted') },
    onError: () => toast.error('Failed to delete product'),
  })

  const uploadImages = async (productId, files) => {
    if (!files?.length) return false
    if (!productId) {
      toast.error('Product saved but image upload could not find the new product ID')
      return false
    }

    const optimizedFiles = await Promise.all(files.map(optimizeImage))
    const fd = new FormData()
    optimizedFiles.forEach((f) => fd.append('images', f))
    fd.append('is_primary', 'true')
    try {
      await productsApi.products.uploadImages(productId, fd)
      return true
    } catch (error) {
      const message = error.code === 'ECONNABORTED'
        ? 'image upload timed out. Please try a smaller image or check R2 connection'
        : error.response?.data?.detail || 'Image upload failed'
      toast.error(`Product saved but ${message.toLowerCase()}`)
      return false
    }
  }

  const uploadImagesInBackground = (productId, files) => {
    if (!files?.length) return

    toast.loading('Uploading product image...', { id: `product-image-${productId}` })
    uploadImages(productId, files).then((uploaded) => {
      queryClient.invalidateQueries(['products'])
      if (uploaded) {
        toast.success('Product image uploaded', { id: `product-image-${productId}` })
      } else {
        toast.dismiss(`product-image-${productId}`)
      }
    }).catch(() => {
      toast.error('Product saved but image upload failed', { id: `product-image-${productId}` })
    })
  }

  const buildProductPayload = (form) => ({
    ...form,
    code: form.code.trim(),
    name: form.name.trim(),
    category: form.category ? Number(form.category) : null,
    brand: form.brand ? Number(form.brand) : null,
    min_order_qty: Number(form.min_order_qty) || 1,
    cost_price: Number(form.cost_price) || 0,
    wholesale_price: Number(form.wholesale_price) || 0,
    retail_price: Number(form.retail_price) || 0,
  })

  const handleSave = async (form, files) => {
    const payload = buildProductPayload(form)

    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, data: payload }, {
        onSuccess: (res) => {
          queryClient.invalidateQueries(['products'])
          setShowModal(false)
          toast.success('Product updated!')
          uploadImagesInBackground(res.data.id, files)
        },
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: (res) => {
          queryClient.invalidateQueries(['products'])
          setShowModal(false)
          toast.success('Product created!')
          uploadImagesInBackground(res.data.id, files)
        },
      })
    }
  }

  const products = data?.results || []
  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Products"
        subtitle={`${data?.count || 0} products`}
        breadcrumbs={[{ label: 'Products' }]}
        actions={
          <button onClick={() => { setEditProduct(null); setShowModal(true) }} className="btn-primary">
            <Plus size={16} /> Add New
          </button>
        }
      />

      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search by name, code...">
            <select className="select-field w-40" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </SearchFilter>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Product</Th>
              <Th>Code</Th>
              <Th>Brand</Th>
              <Th>Category</Th>
              <Th>Cost</Th>
              <Th>Wholesale</Th>
              <Th>Retail</Th>
              <Th>Stock</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={11} />}
            {!isLoading && products.map((p, index) => (
              <Tr key={p.id}>
                <Td>
                  <span className="text-sm font-semibold text-gray-500">{(page - 1) * pageSize + index + 1}</span>
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      {p.primary_image ? (
                        <img src={p.primary_image} alt={p.name} className="w-full h-full object-contain bg-white p-1" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={14} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.unit}</p>
                    </div>
                  </div>
                </Td>
                <Td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{p.code}</span></Td>
                <Td>
                  {p.brand_name ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                        <Award size={13} className="text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">{p.brand_name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </Td>
                <Td><span className="text-sm">{p.category_name || '—'}</span></Td>
                <Td><span className="text-sm">{formatCurrency(p.cost_price)}</span></Td>
                <Td><span className="text-sm font-semibold">{formatCurrency(p.wholesale_price)}</span></Td>
                <Td>
                  <span className="text-sm">{formatCurrency(p.retail_price)}</span>
                </Td>
                <Td>
                  <div className="space-y-1">
                    <span className={`text-sm font-semibold ${p.current_stock <= 0 ? 'text-red-500' : p.current_stock <= 5 ? 'text-yellow-500' : 'text-green-600'}`}>
                      {p.current_stock}
                    </span>
                    {p.availability_status !== 'auto' && (
                      <p className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black ${isAvailableForSale(p) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {p.availability_status === 'available' ? 'Available' : 'Out of Stock'}
                      </p>
                    )}
                  </div>
                </Td>
                <Td>
                  <Badge variant={p.is_active ? 'success' : 'default'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => setImageProduct(p)}
                      title="Manage Images"
                      className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500 transition-colors">
                      <Images size={14} />
                    </button>
                    <button onClick={() => { setEditProduct(p); setShowModal(true) }}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors">
                      <Edit size={14} />
                    </button>
                    <button onClick={async () => { if(await confirm('Delete this product?', 'This action cannot be undone.')) deleteMutation.mutate(p.id) }}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr><td colSpan={11}><EmptyState message="No products found" icon={Package} /></td></tr>
            )}
          </Tbody>
        </Table>

        {(data?.count || 0) > pageSize && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-500">Showing {products.length} of {data?.count}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary py-1.5 text-sm disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={products.length < pageSize} className="btn-secondary py-1.5 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => !isSaving && setShowModal(false)} title={editProduct ? 'Edit Product' : 'Add New Product'} size="xl">
        <ProductForm
          product={editProduct}
          categories={categories}
          brands={brands}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          isSaving={isSaving}
        />
      </Modal>

      {imageProduct && (
        <ImageManagerModal
          product={imageProduct}
          onClose={() => setImageProduct(null)}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}
