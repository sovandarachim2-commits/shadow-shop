import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt, Plus, Trash2, Search, Pencil } from 'lucide-react'
import { financeApi } from '@/api/finance'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/helpers'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'

export default function Expenses() {
  const qc = useQueryClient()
  const emptyForm = { description: '', amount: '', date: new Date().toISOString().slice(0, 10), category: '', subcategory: '' }
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [confirm, ConfirmDialog] = useConfirm()
  const [historyExpense, setHistoryExpense] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', search],
    queryFn: () => financeApi.expenses.list({ search }),
    select: (r) => r.data?.results ?? [],
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => financeApi.expenseCategories.list({ page_size: 200 }),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (expense) => {
    const selected = (categories ?? []).find((item) => String(item.id) === String(expense.category))
    setEditing(expense)
    setForm({
      description: expense.description || '',
      amount: expense.amount ?? '',
      date: expense.date || '',
      category: selected?.parent ? String(selected.parent) : (selected ? String(selected.id) : ''),
      subcategory: selected?.parent ? String(selected.id) : '',
    })
    setShowForm(true)
  }

  const saveMutation = useMutation({
    mutationFn: (d) => {
      const payload = {
        description: d.description,
        amount: d.amount,
        date: d.date,
        category: d.subcategory,
      }
      return editing
        ? financeApi.expenses.update(editing.id, payload)
        : financeApi.expenses.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['expense-history'] })
      toast.success(editing ? 'Expense updated' : 'Expense recorded')
      closeForm()
    },
    onError: () => toast.error(editing ? 'Could not update expense' : 'Failed to save expense'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.expenses.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense deleted') },
  })

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['expense-history', historyExpense?.id],
    queryFn: () => financeApi.expenses.history(historyExpense.id),
    enabled: Boolean(historyExpense?.id),
    select: (response) => response.data ?? [],
  })

  const mainCategories = (categories ?? []).filter((category) => !category.parent)
  const subcategories = (categories ?? []).filter((category) => String(category.parent) === String(form.category))
  const total = (expenses ?? []).reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track business expenses and costs</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <div className="kpi-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expenses Shown</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(total)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <Receipt size={22} className="text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={closeForm} title={editing ? 'Edit Expense' : 'Add Expense'} size="lg">
        <form onSubmit={(e) => { e.preventDefault(); if (!form.category || !form.subcategory) return; saveMutation.mutate(form) }} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Amount (USD) *</label>
              <input className="input-field" type="number" step="0.01" min="0" required value={form.amount} placeholder="0.00"
                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input-field" type="date" required value={form.date}
                onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Main Category *</label>
              <select className="select-field" required value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}>
                <option value="">Select main category</option>
                {mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Subcategory *</label>
              <select className="select-field" required value={form.subcategory} disabled={!form.category}
                onChange={(e) => setForm(f => ({ ...f, subcategory: e.target.value }))}>
                <option value="">{form.category ? 'Select subcategory' : 'Select a main category first'}</option>
                {subcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {form.category && subcategories.length === 0 && (
                <p className="mt-1 text-xs font-semibold text-red-600">Add a subcategory for this main category first.</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <textarea className="input-field" rows={3} required value={form.description} placeholder="What was this expense for?"
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending || !form.category || !form.subcategory}>
              {saveMutation.isPending ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="form-card mt-6">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search expenses..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (expenses ?? []).length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Receipt size={40} className="mx-auto mb-3 opacity-30" />
            <p>No expenses recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-16 px-4 py-3">No</th>
                  <th className="px-4 py-3">Main Category</th>
                  <th className="px-4 py-3">Subcategory</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Created by</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(expenses ?? []).map((e, index) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-slate-400">{index + 1}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${e.category_name ? 'text-indigo-700' : 'text-slate-300'}`}>{e.category_name || '—'}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${e.subcategory_name ? 'text-sky-700' : 'text-slate-300'}`}>{e.subcategory_name || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{e.description}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">{formatDate(e.date)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-sm font-semibold text-purple-700 hover:underline"
                        onClick={() => setHistoryExpense(e)}
                      >
                        {e.created_by_name || 'System'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50"
                          aria-label={`Edit ${e.description}`}
                          onClick={() => openEdit(e)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${e.description}`}
                          onClick={async () => { if (await confirm('Delete expense?', 'This action cannot be undone.')) deleteMutation.mutate(e.id) }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal isOpen={Boolean(historyExpense)} onClose={() => setHistoryExpense(null)} title="Audit history" size="lg">
        <div className="space-y-3 p-6">
          <p className="text-sm font-semibold text-gray-700">{historyExpense?.description}</p>
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
          ) : (history ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No history yet</p>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {(history ?? []).map((item, index) => (
                <div key={item.id ?? `created-${index}`} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {item.action === 'updated' ? 'Updated by' : 'Created by'}
                      <span className="ml-2 font-semibold text-purple-700">{item.user_name || 'System'}</span>
                    </p>
                    <p className="whitespace-nowrap text-sm font-semibold text-gray-900">{formatDateTime(item.created_at)}</p>
                  </div>
                  {(item.changes ?? []).length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm text-gray-700">
                      {item.changes.map((change) => (
                        <li key={change.field}>
                          <span className="font-semibold text-gray-900">{change.field}:</span>{' '}
                          {change.from
                            ? <><span className="text-red-600">{change.from}</span> → <span className="font-semibold text-green-700">{change.to || '—'}</span></>
                            : <span className="font-semibold text-gray-900">{change.to || '—'}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
      {ConfirmDialog}
    </div>
  )
}
