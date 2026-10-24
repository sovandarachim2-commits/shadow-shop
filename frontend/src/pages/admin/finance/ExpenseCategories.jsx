import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Tag, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { financeApi } from '@/api/finance'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'

const emptyForm = { name: '', description: '', parent: '' }

export default function ExpenseCategories() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [asSubcategory, setAsSubcategory] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [subForms, setSubForms] = useState([])
  const [search, setSearch] = useState('')
  const [confirm, ConfirmDialog] = useConfirm()

  const { data: categories, isLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => financeApi.expenseCategories.list({ page_size: 200 }),
    select: (response) => response.data?.results ?? response.data ?? [],
  })

  const mainCategories = useMemo(
    () => (categories ?? []).filter((category) => !category.parent),
    [categories],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = [...(categories ?? [])].sort((left, right) => {
      const leftKey = `${left.parent_name || left.name} ${left.parent ? left.name : ''}`
      const rightKey = `${right.parent_name || right.name} ${right.parent ? right.name : ''}`
      return leftKey.localeCompare(rightKey)
    })
    if (!term) return rows
    return rows.filter((category) => `${category.name} ${category.parent_name || ''} ${category.description || ''}`.toLowerCase().includes(term))
  }, [categories, search])

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setAsSubcategory(false)
    setForm(emptyForm)
    setSubForms([])
  }

  const openCreate = (subcategory) => {
    setEditing(null)
    setAsSubcategory(subcategory)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (category) => {
    const main = category.parent
      ? (categories ?? []).find((item) => String(item.id) === String(category.parent)) || {
          id: category.parent,
          name: category.parent_name || '',
          description: '',
        }
      : category
    const children = (categories ?? []).filter((item) => String(item.parent) === String(main.id))
    setEditing(main)
    setAsSubcategory(false)
    setForm({
      name: main.name || '',
      description: main.description || '',
      parent: '',
    })
    setSubForms(children.map((item) => ({
      key: `id-${item.id}`,
      id: item.id,
      name: item.name || '',
      description: item.description || '',
    })))
    setShowForm(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (!payload.tree) {
        return editing
          ? financeApi.expenseCategories.update(editing.id, payload)
          : financeApi.expenseCategories.create(payload)
      }
      await financeApi.expenseCategories.update(payload.id, payload.main)
      const original = (categories ?? []).filter((item) => String(item.parent) === String(payload.id))
      const kept = new Set(payload.subs.filter((sub) => sub.id).map((sub) => String(sub.id)))
      await Promise.all([
        ...original
          .filter((item) => !kept.has(String(item.id)))
          .map((item) => financeApi.expenseCategories.delete(item.id)),
        ...payload.subs
          .filter((sub) => sub.id && sub.name.trim())
          .map((sub) => financeApi.expenseCategories.update(sub.id, {
            name: sub.name.trim(),
            description: sub.description.trim(),
            parent: payload.id,
          })),
        ...payload.subs
          .filter((sub) => !sub.id && sub.name.trim())
          .map((sub) => financeApi.expenseCategories.create({
            name: sub.name.trim(),
            description: sub.description.trim(),
            parent: payload.id,
          })),
      ])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success(editing ? 'Category updated' : 'Category created')
      closeForm()
    },
    onError: () => toast.error(editing ? 'Could not update category' : 'Could not create category'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.expenseCategories.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-categories'] })
      toast.success('Category deleted')
    },
    onError: () => toast.error('Could not delete category'),
  })

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Expense Categories"
        subtitle={`${categories?.length || 0} categories`}
        actions={(
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => openCreate(true)}>
              <Plus size={16} /> Add Subcategory
            </button>
            <button type="button" className="btn-primary" onClick={() => openCreate(false)}>
              <Plus size={16} /> Add Main Category
            </button>
          </div>
        )}
      />

      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editing ? 'Edit Category' : (asSubcategory ? 'Add Subcategory' : 'Add Main Category')}
        size={editing ? 'lg' : 'md'}
      >
        <form
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (editing) {
              saveMutation.mutate({
                tree: true,
                id: editing.id,
                main: { name: form.name.trim(), description: form.description.trim(), parent: null },
                subs: subForms,
              })
              return
            }
            if (asSubcategory && !form.parent) return
            saveMutation.mutate({
              name: form.name.trim(),
              description: form.description.trim(),
              parent: asSubcategory ? Number(form.parent) : null,
            })
          }}
        >
          <div>
            <label className="label">{editing ? 'Main Category' : 'Name'}</label>
            <input
              className="input-field"
              required
              value={form.name}
              placeholder="Rent, Delivery, Supplies"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          {asSubcategory && (
            <div>
              <label className="label">Main Category *</label>
              <select
                className="select-field"
                required
                value={form.parent}
                onChange={(event) => setForm((current) => ({ ...current, parent: event.target.value }))}
              >
                <option value="">Select main category</option>
                {mainCategories
                  .filter((category) => !editing || category.id !== editing.id)
                  .map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.description}
              placeholder="Optional"
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          {editing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="label mb-0">Subcategory</label>
                <button
                  type="button"
                  className="text-sm font-semibold text-purple-700"
                  onClick={() => setSubForms((current) => [...current, { key: `new-${Date.now()}`, id: null, name: '', description: '' }])}
                >
                  Add subcategory
                </button>
              </div>
              {subForms.length === 0 ? (
                <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-slate-400">No subcategories</p>
              ) : subForms.map((sub) => (
                <div key={sub.key} className="flex gap-2">
                  <input
                    className="input-field"
                    value={sub.name}
                    placeholder="Subcategory name"
                    onChange={(event) => setSubForms((current) => current.map((item) => (
                      item.key === sub.key ? { ...item, name: event.target.value } : item
                    )))}
                  />
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove subcategory"
                    onClick={() => setSubForms((current) => current.filter((item) => item.key !== sub.key))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending || !form.name.trim() || (asSubcategory && !form.parent)}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 p-4">
          <div className="relative max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search category"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:bg-white"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Tag size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No categories found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="w-16 px-4 py-3">No</th>
                <th className="px-4 py-3">Main Category</th>
                <th className="px-4 py-3">Subcategory</th>
                <th className="px-4 py-3">Description</th>
                <th className="w-28 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((category, index) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-bold text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-indigo-700">{category.parent_name || category.name}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${category.parent ? 'text-sky-700' : 'text-slate-300'}`}>{category.parent ? category.name : '—'}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${category.description ? 'text-gray-900' : 'text-slate-300'}`}>{category.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => openEdit(category)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${category.name}`}
                        onClick={async () => {
                          if (await confirm('Delete category?', 'Expenses in this category will keep their records.')) {
                            deleteMutation.mutate(category.id)
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {ConfirmDialog}
    </div>
  )
}
