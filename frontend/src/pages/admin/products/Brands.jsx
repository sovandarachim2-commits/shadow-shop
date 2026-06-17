import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, ImageIcon, Pencil, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'

const emptyForm = {
  name: '',
  description: '',
  order: 0,
  is_active: true,
}

function BrandFormModal({ brand, onClose, onSaved }) {
  const [form, setForm] = useState(
    brand
      ? {
          name: brand.name || '',
          description: brand.description || '',
          order: brand.order || 0,
          is_active: brand.is_active ?? true,
        }
      : { ...emptyForm }
  )
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(brand?.logo_url || brand?.logo || null)
  const fileRef = useRef(null)
  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      brand ? productsApi.brands.update(brand.id, payload) : productsApi.brands.create(payload),
    onSuccess: () => {
      qc.invalidateQueries(['admin-brands'])
      qc.invalidateQueries(['brands-home'])
      qc.invalidateQueries(['brands-shop'])
      toast.success(brand ? 'Brand updated' : 'Brand created')
      onSaved()
    },
    onError: (error) => {
      const message = error.response?.data?.name?.[0] || 'Failed to save brand'
      toast.error(message)
    },
  })

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', form.name.trim())
    fd.append('description', form.description || '')
    fd.append('order', String(Number(form.order) || 0))
    fd.append('is_active', form.is_active ? 'true' : 'false')
    if (logoFile) fd.append('logo', logoFile)
    saveMutation.mutate(fd)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-black text-gray-950">{brand ? 'Edit Brand' : 'New Brand'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          <div
            onClick={() => fileRef.current?.click()}
            className="mb-5 flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-purple-300"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Brand logo preview" className="h-full w-full object-contain p-4" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon size={32} />
                <span className="text-sm font-semibold">Click to upload brand logo</span>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1 block text-xs font-black text-gray-600">Brand Name *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. COSRX"
                  className="input-field"
                />
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1 block text-xs font-black text-gray-600">Display Order</span>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => set('order', e.target.value)}
                  min={0}
                  className="input-field"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-black text-gray-600">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Short note about this brand"
                className="input-field resize-none"
              />
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
                className="h-4 w-4 accent-purple-600"
              />
              <span className="text-sm font-bold text-gray-700">Active</span>
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? 'Saving...' : 'Save Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Brands() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [confirm, ConfirmDialog] = useConfirm()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: () => productsApi.brands.list(),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.brands.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-brands'])
      qc.invalidateQueries(['brands-home'])
      toast.success('Brand deleted')
    },
    onError: () => toast.error('Failed to delete brand'),
  })

  const brands = data ?? []

  const openNew = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (brand) => {
    setEditing(brand)
    setShowForm(true)
  }

  const closeForm = () => {
    setEditing(null)
    setShowForm(false)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Brands</h1>
          <p className="mt-0.5 text-sm text-gray-500">Create and manage product brands with logos</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openNew}>
          <Plus size={16} /> Add Brand
        </button>
      </div>

      {showForm && (
        <BrandFormModal
          brand={editing}
          onClose={closeForm}
          onSaved={closeForm}
        />
      )}

      <div className="form-card mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : brands.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Award size={42} className="mx-auto mb-3 opacity-30" />
            <p>No brands yet</p>
            <button onClick={openNew} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus size={16} /> Add Brand
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {brands.map((brand) => (
              <div key={brand.id} className="group flex items-center justify-between rounded-xl p-3 hover:bg-gray-50">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-purple-50">
                    {brand.logo_url || brand.logo ? (
                      <img src={brand.logo_url || brand.logo} alt={brand.name} className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Award size={17} className="text-purple-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">{brand.name}</p>
                      <Badge variant={brand.is_active ? 'success' : 'default'}>
                        {brand.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {brand.products_count || 0} products
                      {brand.description ? ` - ${brand.description}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="p-1.5 text-gray-400 hover:text-purple-600" onClick={() => openEdit(brand)}>
                    <Pencil size={14} />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-500"
                    onClick={async () => { if (await confirm('Delete this brand?', 'This action cannot be undone.')) deleteMutation.mutate(brand.id) }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  )
}
