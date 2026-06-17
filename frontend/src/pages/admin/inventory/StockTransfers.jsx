import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, ArrowRight, Plus, Check, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { inventoryApi } from '@/api/inventory'
import { formatDate, cn } from '@/utils/helpers'

const STATUS_COLORS = {
  pending:    'bg-yellow-100 text-yellow-700',
  in_transit: 'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
}

function TransferForm({ onSave, onClose }) {
  const [form, setForm] = useState({ from_warehouse: '', to_warehouse: '', notes: '' })
  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryApi.warehouses.list().then((r) => r.data?.results ?? r.data ?? []),
    staleTime: Infinity,
  })

  const handleSubmit = () => {
    if (!form.from_warehouse) return toast.error('Select source warehouse')
    if (!form.to_warehouse) return toast.error('Select destination warehouse')
    if (form.from_warehouse === form.to_warehouse) return toast.error('Source and destination must be different')
    onSave(form)
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="label">From Warehouse *</label>
        <select className="select-field" value={form.from_warehouse} onChange={(e) => f('from_warehouse', e.target.value)}>
          <option value="">Select source...</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">To Warehouse *</label>
        <select className="select-field" value={form.to_warehouse} onChange={(e) => f('to_warehouse', e.target.value)}>
          <option value="">Select destination...</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input-field resize-none" rows={3} value={form.notes} onChange={(e) => f('notes', e.target.value)} placeholder="Transfer reason or instructions..." />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} className="btn-primary flex-1 justify-center">
          <Truck size={15} /> Create Transfer
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  )
}

export default function StockTransfers() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', statusFilter],
    queryFn: () => inventoryApi.transfers.list({ status: statusFilter || undefined }),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const transfers = data ?? []

  const createMutation = useMutation({
    mutationFn: inventoryApi.transfers.create,
    onSuccess: () => { qc.invalidateQueries(['stock-transfers']); setShowModal(false); toast.success('Transfer created!') },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to create transfer'),
  })

  const completeMutation = useMutation({
    mutationFn: inventoryApi.transfers.complete,
    onSuccess: () => { qc.invalidateQueries(['stock-transfers']); toast.success('Transfer completed!') },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to complete transfer'),
  })

  const cancelMutation = useMutation({
    mutationFn: inventoryApi.transfers.cancel,
    onSuccess: () => { qc.invalidateQueries(['stock-transfers']); toast.success('Transfer cancelled') },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to cancel transfer'),
  })

  const deleteMutation = useMutation({
    mutationFn: inventoryApi.transfers.delete,
    onSuccess: () => { qc.invalidateQueries(['stock-transfers']); toast.success('Transfer deleted') },
    onError: () => toast.error('Failed to delete transfer'),
  })

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stock Transfers"
        subtitle={`${transfers.length} transfers`}
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Transfers' }]}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> New Transfer
          </button>
        }
      />

      <div className="form-card mt-6">
        {/* Filter */}
        <div className="flex justify-end mb-4">
          <select className="select-field w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No stock transfers yet</p>
            <p className="text-sm mt-1">Transfers move stock between your warehouses.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">
              <Plus size={15} /> Create First Transfer
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((t) => (
              <div key={t.id} className="border border-gray-100 rounded-2xl p-4 hover:shadow-card transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <Truck size={18} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">#{t.transfer_number}</p>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                        <span className="truncate max-w-[100px]">{t.from_warehouse_name ?? t.from_warehouse}</span>
                        <ArrowRight size={12} className="shrink-0" />
                        <span className="truncate max-w-[100px]">{t.to_warehouse_name ?? t.to_warehouse}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn('status-badge', STATUS_COLORS[t.status])}>
                      {t.status?.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">{formatDate(t.created_at)}</span>
                  </div>
                </div>

                {t.notes && <p className="text-xs text-gray-500 mt-2 ml-13 pl-1">{t.notes}</p>}

                {/* Actions — only for pending/in_transit */}
                {(t.status === 'pending' || t.status === 'in_transit') && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {t.status === 'pending' && (
                      <button
                        onClick={() => completeMutation.mutate(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <Check size={13} /> Complete
                      </button>
                    )}
                    <button
                      onClick={() => { if (window.confirm('Cancel this transfer?')) cancelMutation.mutate(t.id) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <X size={13} /> Cancel
                    </button>
                    {t.status === 'pending' && (
                      <button
                        onClick={() => { if (window.confirm('Delete this transfer?')) deleteMutation.mutate(t.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Stock Transfer" size="sm">
        <TransferForm onSave={(form) => createMutation.mutate(form)} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
