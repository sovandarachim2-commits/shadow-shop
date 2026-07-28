import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, ArrowRight, Plus, Check, X, Trash2, Warehouse, Pencil } from 'lucide-react'
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

function WarehouseForm({ warehouse, onSave, onClose, isSaving }) {
  const [form, setForm] = useState({
    name: warehouse?.name || '',
    code: warehouse?.code || '',
    address: warehouse?.address || '',
    is_active: warehouse?.is_active ?? true,
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Warehouse name is required')
    if (!form.code.trim()) return toast.error('Warehouse code is required')
    onSave({
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <label className="label">Name *</label>
        <input
          className="input-field"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Main Warehouse"
        />
      </div>
      <div>
        <label className="label">Code *</label>
        <input
          className="input-field font-mono uppercase"
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
          placeholder="WH01"
          disabled={Boolean(warehouse)}
        />
      </div>
      <div>
        <label className="label">Address</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Warehouse address..."
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
          className="h-4 w-4 accent-purple-600"
        />
        Active
      </label>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSaving} className="btn-primary flex-1 justify-center disabled:opacity-60">
          {isSaving ? 'Saving...' : warehouse ? 'Update Warehouse' : 'Create Warehouse'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </form>
  )
}

function TransferForm({ onSave, onClose, onCreateWarehouse }) {
  const [form, setForm] = useState({ from_warehouse: '', to_warehouse: '', notes: '' })
  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryApi.warehouses.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  const activeWarehouses = warehouses.filter((w) => w.is_active !== false)

  const handleSubmit = () => {
    if (!form.from_warehouse) return toast.error('Select source warehouse')
    if (!form.to_warehouse) return toast.error('Select destination warehouse')
    if (form.from_warehouse === form.to_warehouse) return toast.error('Source and destination must be different')
    onSave(form)
  }

  return (
    <div className="space-y-4 p-6">
      {activeWarehouses.length === 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          No warehouses yet.{' '}
          <button type="button" onClick={onCreateWarehouse} className="font-bold underline">
            Create a warehouse
          </button>{' '}
          first.
        </div>
      )}
      <div>
        <label className="label">From Warehouse *</label>
        <select className="select-field" value={form.from_warehouse} onChange={(e) => f('from_warehouse', e.target.value)}>
          <option value="">Select source...</option>
          {activeWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
        </select>
      </div>
      <div>
        <label className="label">To Warehouse *</label>
        <select className="select-field" value={form.to_warehouse} onChange={(e) => f('to_warehouse', e.target.value)}>
          <option value="">Select destination...</option>
          {activeWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
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
  const [showWarehouseModal, setShowWarehouseModal] = useState(false)
  const [editWarehouse, setEditWarehouse] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['stock-transfers', statusFilter],
    queryFn: () => inventoryApi.transfers.list({ status: statusFilter || undefined }),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryApi.warehouses.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  const transfers = data ?? []
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [String(w.id), w]))

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

  const saveWarehouseMutation = useMutation({
    mutationFn: (payload) => (
      editWarehouse
        ? inventoryApi.warehouses.update(editWarehouse.id, payload)
        : inventoryApi.warehouses.create(payload)
    ),
    onSuccess: () => {
      qc.invalidateQueries(['warehouses'])
      setShowWarehouseModal(false)
      setEditWarehouse(null)
      toast.success(editWarehouse ? 'Warehouse updated!' : 'Warehouse created!')
    },
    onError: (e) => {
      const data = e?.response?.data
      const message = data?.code?.[0] || data?.detail || data?.name?.[0] || 'Failed to save warehouse'
      toast.error(message)
    },
  })

  const deleteWarehouseMutation = useMutation({
    mutationFn: inventoryApi.warehouses.delete,
    onSuccess: () => {
      qc.invalidateQueries(['warehouses'])
      toast.success('Warehouse deleted')
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to delete warehouse'),
  })

  const openCreateWarehouse = () => {
    setEditWarehouse(null)
    setShowWarehouseModal(true)
  }

  const warehouseName = (id, fallback) => warehouseMap[String(id)]?.name || fallback || '—'

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stock Transfers"
        subtitle={`${transfers.length} transfers · ${warehouses.length} warehouses`}
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Transfers' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={openCreateWarehouse} className="btn-secondary">
              <Warehouse size={16} /> New Warehouse
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={16} /> New Transfer
            </button>
          </div>
        }
      />

      <div className="form-card mt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-gray-950">Warehouses</h2>
          <button onClick={openCreateWarehouse} className="btn-secondary py-1.5 text-sm">
            <Plus size={14} /> Add Warehouse
          </button>
        </div>

        {loadingWarehouses ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
        ) : warehouses.length === 0 ? (
          <div className="mb-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-400">
            <Warehouse size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No warehouses yet</p>
            <button onClick={openCreateWarehouse} className="btn-primary mx-auto mt-3">
              <Plus size={14} /> Create Warehouse
            </button>
          </div>
        ) : (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((w) => (
              <div key={w.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{w.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{w.code}</p>
                    {w.address ? <p className="mt-2 line-clamp-2 text-xs text-gray-500">{w.address}</p> : null}
                  </div>
                  <span className={cn('status-badge shrink-0', w.is_active === false ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700')}>
                    {w.is_active === false ? 'Off' : 'Active'}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
                  <button
                    type="button"
                    onClick={() => { setEditWarehouse(w); setShowWarehouseModal(true) }}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete warehouse "${w.name}"?`)) deleteWarehouseMutation.mutate(w.id)
                    }}
                    className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <h2 className="text-base font-black text-gray-950">Transfers</h2>
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
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No stock transfers yet</p>
            <p className="mt-1 text-sm">Create warehouses first, then move stock between them.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mx-auto mt-4">
              <Plus size={15} /> Create First Transfer
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((t) => (
              <div key={t.id} className="rounded-2xl border border-gray-100 p-4 transition-shadow hover:shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <Truck size={18} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">#{t.transfer_number}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                        <span className="max-w-[120px] truncate">{warehouseName(t.from_warehouse, t.from_warehouse_name)}</span>
                        <ArrowRight size={12} className="shrink-0" />
                        <span className="max-w-[120px] truncate">{warehouseName(t.to_warehouse, t.to_warehouse_name)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn('status-badge', STATUS_COLORS[t.status])}>
                      {t.status?.replace('_', ' ')}
                    </span>
                    <span className="hidden text-xs text-gray-400 sm:block">{formatDate(t.created_at)}</span>
                  </div>
                </div>

                {t.notes && <p className="mt-2 pl-1 text-xs text-gray-500">{t.notes}</p>}

                {(t.status === 'pending' || t.status === 'in_transit') && (
                  <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                    {t.status === 'pending' && (
                      <button
                        onClick={() => completeMutation.mutate(t.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                      >
                        <Check size={13} /> Complete
                      </button>
                    )}
                    <button
                      onClick={() => { if (window.confirm('Cancel this transfer?')) cancelMutation.mutate(t.id) }}
                      className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-100"
                    >
                      <X size={13} /> Cancel
                    </button>
                    {t.status === 'pending' && (
                      <button
                        onClick={() => { if (window.confirm('Delete this transfer?')) deleteMutation.mutate(t.id) }}
                        className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100"
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
        <TransferForm
          onSave={(form) => createMutation.mutate(form)}
          onClose={() => setShowModal(false)}
          onCreateWarehouse={() => {
            setShowModal(false)
            openCreateWarehouse()
          }}
        />
      </Modal>

      <Modal
        isOpen={showWarehouseModal}
        onClose={() => { setShowWarehouseModal(false); setEditWarehouse(null) }}
        title={editWarehouse ? 'Edit Warehouse' : 'New Warehouse'}
        size="sm"
      >
        <WarehouseForm
          key={editWarehouse?.id || 'new'}
          warehouse={editWarehouse}
          onSave={(payload) => saveWarehouseMutation.mutate(payload)}
          onClose={() => { setShowWarehouseModal(false); setEditWarehouse(null) }}
          isSaving={saveWarehouseMutation.isPending}
        />
      </Modal>
    </div>
  )
}
