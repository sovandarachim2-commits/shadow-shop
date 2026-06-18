import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Boxes, Plus, Pencil, Trash2, ChevronRight, Upload, X } from 'lucide-react'
import { productsApi } from '@/api/products'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'

function CategoryModal({ open, editing, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => editing
    ? { name: editing.name, description: editing.description || '', parent: editing.parent || '' }
    : { name: '', description: '', parent: '' }
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
      qc.invalidateQueries(['admin-categories'])
      qc.invalidateQueries(['categories-home'])
      toast.success(editing ? 'Category updated' : 'Category created')
      setShowModal(false)
      setEditing(null)
    },
    onError: () => toast.error('Failed to save category'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.categories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-categories'])
      qc.invalidateQueries(['categories-home'])
      toast.success('Category deleted')
    },
  })

  const categories = data ?? []
  const topLevel = categories.filter((c) => !c.parent)

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

      <div className="form-card mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Boxes size={40} className="mx-auto mb-3 opacity-30" />
            <p>No categories yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topLevel.map((cat) => {
              const children = categories.filter((c) => c.parent === cat.id)
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-purple-50 border border-gray-100 flex items-center justify-center">
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <Boxes size={16} className="text-purple-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                      </div>
                      {children.length > 0 ? (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          Main category - {children.length} sub
                        </span>
                      ) : (
                        <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-500">
                          Main category
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-gray-400 hover:text-purple-600" onClick={() => openEdit(cat)}>
                        <Pencil size={14} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-500"
                        onClick={async () => { if (await confirm('Delete this category?', 'This action cannot be undone.')) deleteMutation.mutate(cat.id) }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center justify-between p-3 pl-10 rounded-xl hover:bg-gray-50 group">
                      <div className="flex items-center gap-2 text-gray-600">
                        <ChevronRight size={13} className="text-gray-300" />
                        <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-gray-50 border border-gray-100 flex items-center justify-center">
                          {child.image_url ? (
                            <img src={child.image_url} alt={child.name} className="w-full h-full object-cover" />
                          ) : (
                            <Boxes size={12} className="text-gray-300" />
                          )}
                        </div>
                        <span className="text-sm">{child.name}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-400 hover:text-purple-600" onClick={() => openEdit(child)}>
                          <Pencil size={14} />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-500"
                          onClick={async () => { if (await confirm('Delete this category?', 'This action cannot be undone.')) deleteMutation.mutate(child.id) }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  )
}
