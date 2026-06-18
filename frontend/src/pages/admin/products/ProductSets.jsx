import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageCheck, Tag, Plus, Edit, Trash2, Star, X, Minus, Image, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'

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
    staleTime: 60000,
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

export default function ProductSets() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editSet, setEditSet] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['product-sets'],
    queryFn: () => productsApi.sets.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  const buildSetPayload = (form, imageFile) => {
    const data = {
      ...form,
      price: parseFloat(form.price),
      discount_price: form.discount_price ? parseFloat(form.discount_price) : null,
    }

    if (!imageFile) return data

    const fd = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value == null || value === '') return
      fd.append(key, value)
    })
    fd.append('image', imageFile)
    return fd
  }

  const handleSave = async (form, items, imageFile) => {
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.price) return toast.error('Price is required')

    const data = buildSetPayload(form, imageFile)

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
    if (!window.confirm(`Delete "${s.name}"? This cannot be undone.`)) return
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
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(220px,1fr)_minmax(320px,1.6fr)_130px_100px_150px]">
                <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-14 animate-pulse rounded-xl bg-gray-100" />
              </div>
            ))}
          </div>
        ) : sets.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <PackageCheck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No product sets yet</p>
            <p className="mt-1 text-sm">Create bundled sets to offer special pricing to customers.</p>
            <button onClick={openCreate} className="btn-primary mx-auto mt-4">
              <Plus size={15} /> Create First Set
            </button>
          </div>
        ) : (
          <div>
            <div className="hidden border-b border-gray-100 bg-gray-50 px-5 py-3 text-[11px] font-black uppercase tracking-wide text-gray-500 md:grid md:grid-cols-[minmax(220px,1fr)_minmax(320px,1.6fr)_130px_100px_150px] md:items-center md:gap-4">
              <div>Set Name</div>
              <div>Products In Set</div>
              <div>Price</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            {sets.map((s) => (
              <div
                key={s.id}
                className="grid gap-4 border-b border-gray-100 px-5 py-4 last:border-b-0 hover:bg-gray-50/70 md:grid-cols-[minmax(220px,1fr)_minmax(320px,1.6fr)_130px_100px_150px] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-purple-50 text-purple-700">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.name} className="h-full w-full object-contain bg-white p-1" />
                      ) : (
                        <PackageCheck size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {s.is_featured && (
                          <Star size={13} className="shrink-0 fill-yellow-400 text-yellow-500" />
                        )}
                        <h3 className="truncate text-sm font-black text-gray-900">{s.name}</h3>
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-gray-400">
                        {s.items?.length ?? 0} product{s.items?.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  {s.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">{s.description}</p>
                  )}
                </div>

                <div>
                  {s.items?.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {s.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-gray-50 px-2.5 py-2">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white">
                            {item.product_image ? (
                              <img src={item.product_image} alt={item.product_name} className="h-full w-full object-contain p-0.5" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Tag size={12} className="text-gray-300" />
                              </div>
                            )}
                            <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[9px] font-black text-white">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black text-gray-900">{item.product_name}</p>
                            <p className="text-[11px] font-semibold text-gray-400">{item.product_code}</p>
                          </div>
                        </div>
                      ))}
                      {s.items.length > 3 && (
                        <div className="rounded-xl bg-purple-50 px-2.5 py-2 text-xs font-black text-purple-700">
                          +{s.items.length - 3} more product{s.items.length - 3 === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs font-semibold text-gray-400">
                      No products added
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0">
                  <span className="text-xs font-bold uppercase text-gray-400 md:hidden">Price</span>
                  <div className="text-right md:text-left">
                    {s.discount_price ? (
                      <>
                        <p className="text-xs font-semibold text-gray-400 line-through">{formatCurrency(s.price)}</p>
                        <p className="text-sm font-black text-purple-600">{formatCurrency(s.discount_price)}</p>
                      </>
                    ) : (
                      <p className="text-sm font-black text-gray-900">{formatCurrency(s.price)}</p>
                    )}
                  </div>
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                      s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {s.is_featured && (
                    <span className="mt-1 inline-flex rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-black text-yellow-700 md:block md:w-fit">
                      Featured
                    </span>
                  )}
                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100 md:flex-none"
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500 transition-colors hover:bg-red-100 md:flex-none"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  )
}
