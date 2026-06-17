import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Receipt, Plus, Trash2, Search } from 'lucide-react'
import { financeApi } from '@/api/finance'
import { formatCurrency, formatDate } from '@/utils/helpers'
import toast from 'react-hot-toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export default function Expenses() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [confirm, ConfirmDialog] = useConfirm()
  const [form, setForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), category: '', notes: '' })

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', search],
    queryFn: () => financeApi.expenses.list({ search }),
    select: (r) => r.data?.results ?? [],
  })

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => financeApi.expenseCategories.list(),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const createMutation = useMutation({
    mutationFn: (d) => financeApi.expenses.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['expenses'])
      toast.success('Expense recorded')
      setShowForm(false)
      setForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), category: '', notes: '' })
    },
    onError: () => toast.error('Failed to save expense'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => financeApi.expenses.delete(id),
    onSuccess: () => { qc.invalidateQueries(['expenses']); toast.success('Expense deleted') },
  })

  const total = (expenses ?? []).reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track business expenses and costs</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
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

      {showForm && (
        <div className="form-card mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Record Expense</h3>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Description *</label>
                <input className="input-field" required value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="label">Amount (USD) *</label>
                <input className="input-field" type="number" step="0.01" min="0" required value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Date *</label>
                <input className="input-field" type="date" required value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="select-field" value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">Select category</option>
                  {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Expense'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {(expenses ?? []).map((e) => (
                  <tr key={e.id} className="data-table-row">
                    <td className="py-3 px-4 font-medium text-gray-900">{e.description}</td>
                    <td className="py-3 px-4 text-gray-500">{e.category_name ?? '—'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(e.date)}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-gray-300 hover:text-red-500 transition-colors"
                        onClick={async () => { if (await confirm('Delete expense?', 'This action cannot be undone.')) deleteMutation.mutate(e.id) }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {ConfirmDialog}
    </div>
  )
}
