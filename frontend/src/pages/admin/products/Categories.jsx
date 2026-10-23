import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Boxes, Plus, Pencil, Trash2, Upload, X } from 'lucide-react'
import { productsApi } from '@/api/products'
import toast from 'react-hot-toast'
import { Badge } from '@/components/ui/Badge'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { useConfirm } from '@/components/ui/ConfirmDialog'

function CategoryModal({ open, editing, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => editing
    ? { name: editing.name, description: editing.description || '', parent: editing.parent || '', is_active: editing.is_active !== false }
    : { name: '', description: '', parent: '', is_active: true }
  )
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef()

  const currentImage = imagePreview || editing?.image_url || null

  const pickImage = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description || '')
    fd.append('is_active', form.is_active ? 'true' : 'false')
    if (form.parent) fd.append('parent', form.parent)
    if (imageFile) fd.append('image', imageFile)
    onSave(fd)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-base font-bold text-gray-900">{editing ? 'Edit Category' : 'New Category'}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image upload */}
          <div>
            <label className="label">Category Image</label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-purple-400 transition bg-gray-50 shrink-0"
              >
                {currentImage ? (
                  <img src={currentImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload size={18} className="text-gray-300" />
                    <span className="text-xs text-gray-300">Upload</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm px-4 py-2">
                  {currentImage ? 'Change Image' : 'Upload Image'}
                </button>
                {imagePreview && (
                  <button type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                    <X size={11} /> Remove
                  </button>
                )}
                <p className="text-xs text-gray-400">PNG, JPG recommended</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label">Name <span className="text-red-400">*</span></label>
            <input className="input-field" required value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">Active on shop</span>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 accent-purple-600"
            />
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
            <button type="button" className="btn-secondary px-6" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Categories() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, ConfirmDialog] = useConfirm()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => productsApi.categories.list(),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const saveMutation = useMutation({
    mutationFn: (fd) =>
      editing ? productsApi.categories.update(editing.id, fd) : productsApi.categories.create(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories-home'] })
      toast.success(editing ? 'Category updated' : 'Category created')
      setShowModal(false)
      setEditing(null)
    },
    onError: () => toast.error('Failed to save category'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.categories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      qc.invalidateQueries({ queryKey: ['categories-home'] })
      toast.success('Category deleted')
    },
  })

  const categories = data ?? []
  const topLevel = categories.filter((c) => !c.parent)
  const rows = topLevel.flatMap((cat) => {
    const children = categories.filter((item) => item.parent === cat.id)
    return [
      { ...cat, parentName: '—' },
      ...children.map((child) => ({ ...child, parentName: cat.name })),
    ]
  })
  const listedIds = new Set(rows.map((row) => row.id))
  categories.filter((cat) => !listedIds.has(cat.id)).forEach((cat) => {
    const parent = categories.find((item) => item.id === cat.parent)
    rows.push({ ...cat, parentName: parent?.name || '—' })
  })

  const openAdd = () => { setEditing(null); setShowModal(true) }
  const openEdit = (cat) => { setEditing(cat); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Category Menu</h1>
          <p className="text-gray-500 text-sm mt-0.5">Create product categories for the shop.</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      <CategoryModal
        key={editing?.id ?? 'new'}
        open={showModal}
        editing={editing}
        onClose={closeModal}
        onSave={(fd) => saveMutation.mutate(fd)}
        saving={saveMutation.isPending}
      />

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Image</Th>
              <Th>Category</Th>
              <Th>Type</Th>
              <Th>Parent</Th>
              <Th>Description</Th>
              <Th>Products</Th>
              <Th>Order</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={10} />}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <EmptyState message="No categories yet" icon={Boxes} />
                </td>
              </tr>
            )}
            {!isLoading && rows.map((cat, index) => (
              <Tr key={cat.id}>
                <Td><span className="text-sm font-semibold text-gray-500">{index + 1}</span></Td>
                <Td>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-purple-50">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                    ) : (
                      <Boxes size={17} className="text-purple-400" />
                    )}
                  </div>
                </Td>
                <Td>
                  <span className={`font-semibold text-gray-900 ${cat.parent ? 'pl-4' : ''}`}>{cat.name}</span>
                </Td>
                <Td>
                  <Badge variant={cat.parent ? 'default' : 'pink'}>
                    {cat.parent ? 'Sub category' : 'Main category'}
                  </Badge>
                </Td>
                <Td><span className="text-sm text-gray-600">{cat.parentName}</span></Td>
                <Td><span className="line-clamp-2 max-w-xs text-sm text-gray-500">{cat.description || '—'}</span></Td>
                <Td><span className="font-semibold">{cat.products_count || 0}</span></Td>
                <Td><span className="text-sm text-gray-600">{cat.order ?? 0}</span></Td>
                <Td>
                  <Badge variant={cat.is_active ? 'success' : 'default'}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Edit"
                      aria-label="Edit category"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete category"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={async () => { if (await confirm('Delete this category?', 'This action cannot be undone.')) deleteMutation.mutate(cat.id) }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
      {ConfirmDialog}
    </div>
  )
}
