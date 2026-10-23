import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, ArrowRight, Plus, Check, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { inventoryApi } from '@/api/inventory'
import { productsApi } from '@/api/products'
import { getListResults } from '@/utils/apiData'
import { formatDate, cn } from '@/utils/helpers'

const STATUS_COLORS = {
  pending:    'bg-yellow-100 text-yellow-700',
  in_transit: 'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
}

function emptyTransferItem() {
  return { key: `${Date.now()}-${Math.random()}`, product: '', query: '', open: false, requested_qty: '1' }
}

function TransferForm({ onSave, onClose }) {
  const [form, setForm] = useState({ from_warehouse: '', to_warehouse: '', notes: '' })
  const [items, setItems] = useState([emptyTransferItem()])
  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryApi.warehouses.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['transfer-products'],
    queryFn: () => productsApi.products.list({ page_size: 500, is_active: true }).then((r) => getListResults(r.data)),
  })

  const activeWarehouses = warehouses.filter((w) => w.is_active !== false)
  const sourceWarehouse = activeWarehouses.find((warehouse) => String(warehouse.id) === String(form.from_warehouse))
  const sourceStock = new Map((sourceWarehouse?.stock_levels || []).map((row) => [String(row.product), Number(row.quantity || 0)]))
  const stockOf = (product) => sourceStock.get(String(product?.id)) || 0
  const updateItem = (key, patch) => setItems((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const addItem = () => setItems((current) => [...current, emptyTransferItem()])

  const removeItem = (key) => {
    setItems((current) => {
      const next = current.filter((row) => row.key !== key)
      return next.length > 0 ? next : [emptyTransferItem()]
    })
  }

  const matchesFor = (item) => {
    const query = item.query.trim().toLowerCase()
    const taken = new Set(items.filter((row) => row.key !== item.key && row.product).map((row) => String(row.product)))
    return products.filter((product) => {
      if (taken.has(String(product.id))) return false
      if (!query) return true
      return `${product.name || ''} ${product.code || ''}`.toLowerCase().includes(query)
    }).slice(0, 8)
  }

  const handleSubmit = () => {
    if (!form.from_warehouse) return toast.error('Select source warehouse')
    if (!form.to_warehouse) return toast.error('Select destination warehouse')
    if (form.from_warehouse === form.to_warehouse) return toast.error('Source and destination must be different')
    const chosen = items.filter((item) => item.product)
    if (chosen.length === 0) return toast.error('Select a product')
    if (chosen.length !== items.length) return toast.error('Select a product on every row')
    for (const item of chosen) {
      const quantity = Number(item.requested_qty)
      const product = products.find((row) => String(row.id) === String(item.product))
      const available = stockOf(product)
      if (!Number.isInteger(quantity) || quantity < 1) return toast.error('Enter a quantity of at least 1')
      if (quantity > available) return toast.error(`${product?.name || 'Product'} only has ${available} in the source storage`)
    }
    onSave({
      from_warehouse: Number(form.from_warehouse),
      to_warehouse: Number(form.to_warehouse),
      notes: form.notes,
      items_input: chosen.map((item) => ({
        product: Number(item.product),
        requested_qty: Number(item.requested_qty),
      })),
    })
  }

  return (
    <div className="space-y-4 p-6">
      {activeWarehouses.length === 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          No storage locations yet.{' '}
          <Link to="/admin/inventory/storage" className="font-bold underline">
            Add storage
          </Link>{' '}
          first.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="label mb-0">Products *</label>
          <button type="button" onClick={addItem} className="btn-secondary py-1.5 text-sm">
            <Plus size={14} /> Add product
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => {
            const selected = products.find((product) => String(product.id) === String(item.product))
            const matches = matchesFor(item)
            return (
              <div key={item.key} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      className="input-field"
                      placeholder="Search name or code, then select"
                      value={item.open ? item.query : (selected ? selected.name : item.query)}
                      onFocus={() => updateItem(item.key, { open: true, query: '' })}
                      onBlur={() => updateItem(item.key, { open: false, query: '' })}
                      onChange={(event) => updateItem(item.key, { query: event.target.value, open: true, product: '' })}
                      aria-label={`Product ${index + 1}`}
                    />
                    {selected && !item.open && (
                      <p className={`mt-1 text-xs ${Number(item.requested_qty) > stockOf(selected) ? 'text-red-500' : 'text-gray-400'}`}>
                        Stock {stockOf(selected)}
                      </p>
                    )}
                    {item.open && (
                      <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50">
                        {matches.length === 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">No matching products</p>
                        )}
                        {matches.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              if (!form.from_warehouse) {
                                toast.error('Select the source storage first')
                                return
                              }
                              if (stockOf(product) < 1) {
                                toast.error(`${product.name} has no stock in the source storage`)
                                return
                              }
                              updateItem(item.key, { product: product.id, open: false, query: '' })
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white"
                          >
                            <span className="truncate font-medium text-gray-900">{product.name}</span>
                            <span className={`shrink-0 text-xs font-medium ${stockOf(product) > 0 ? 'text-gray-600' : 'text-red-500'}`}>
                              Stock {stockOf(product)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={selected ? stockOf(selected) : undefined}
                    step="1"
                    value={item.requested_qty}
                    onChange={(event) => updateItem(item.key, { requested_qty: event.target.value })}
                    className="input-field w-20"
                    aria-label={`Quantity ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="mt-1 rounded-lg p-2 text-red-500 hover:bg-red-50"
                    title="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
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

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryApi.warehouses.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  const transfers = data ?? []
  const warehouseMap = Object.fromEntries(warehouses.map((w) => [String(w.id), w]))

  const createMutation = useMutation({
    mutationFn: inventoryApi.transfers.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); setShowModal(false); toast.success('Transfer created!') },
    onError: (e) => {
      const detail = e?.response?.data?.detail
      const message = Array.isArray(detail) ? detail[0] : detail
      toast.error(typeof message === 'string' ? message : 'Failed to create transfer')
    },
  })

  const completeMutation = useMutation({
    mutationFn: inventoryApi.transfers.complete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-transfers'] })
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Transfer completed!')
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to complete transfer'),
  })

  const cancelMutation = useMutation({
    mutationFn: inventoryApi.transfers.cancel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Transfer cancelled') },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to cancel transfer'),
  })

  const deleteMutation = useMutation({
    mutationFn: inventoryApi.transfers.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-transfers'] }); toast.success('Transfer deleted') },
    onError: () => toast.error('Failed to delete transfer'),
  })

  const warehouseName = (id, fallback) => warehouseMap[String(id)]?.name || fallback || '—'

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
        <div className="mb-4 flex items-center justify-between">
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
            <p className="mt-1 text-sm">Move products between storage locations.</p>
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

                {t.items?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.items.map((item) => (
                      <span key={item.id} className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {item.product_name} × {item.requested_qty}
                      </span>
                    ))}
                  </div>
                )}

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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Stock Transfer" size="lg">
        <TransferForm
          onSave={(form) => createMutation.mutate(form)}
          onClose={() => setShowModal(false)}
        />
      </Modal>
    </div>
  )
}
