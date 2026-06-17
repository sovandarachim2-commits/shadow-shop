import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Package, AlertTriangle, XCircle, DollarSign, Boxes, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { KpiCard } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { inventoryApi } from '@/api/inventory'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'

function AddStockModal({ onClose }) {
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-for-stock'],
    queryFn: () => productsApi.products.list({ page_size: 200 }).then((r) => r.data.results || r.data),
  })

  const addMutation = useMutation({
    mutationFn: () => inventoryApi.movements.create({
      type: 'stock_in',
      product: productId,
      quantity: qty,
      reference,
      notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock'])
      queryClient.invalidateQueries(['stock-dashboard'])
      queryClient.invalidateQueries(['stock-movements'])
      toast.success('Stock added!')
      onClose()
    },
    onError: () => toast.error('Add stock failed'),
  })

  const canSubmit = productId && qty > 0 && !addMutation.isLoading

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="label">Product</label>
        <select
          className="select-field"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          disabled={isLoading}
        >
          <option value="">{isLoading ? 'Loading products...' : 'Select product'}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.code ? `(${p.code})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Quantity to Add</label>
        <input
          type="number"
          className="input-field"
          value={qty}
          onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
          min={1}
        />
      </div>
      <div>
        <label className="label">Reference</label>
        <input
          className="input-field"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Invoice, supplier bill, or note"
        />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional receiving notes..."
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => addMutation.mutate()}
          disabled={!canSubmit}
          className="btn-primary flex-1 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Add Stock
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  )
}

function AdjustStockModal({ stock, onClose }) {
  const queryClient = useQueryClient()
  const [qty, setQty] = useState(stock?.quantity || 0)
  const [notes, setNotes] = useState('')

  const adjustMutation = useMutation({
    mutationFn: () => inventoryApi.stock.adjust(stock.id, { quantity: qty, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock'])
      queryClient.invalidateQueries(['stock-dashboard'])
      toast.success('Stock adjusted!')
      onClose()
    },
    onError: () => toast.error('Adjustment failed'),
  })

  return (
    <div className="p-6 space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-900">{stock?.product_name}</p>
        <p className="text-xs text-blue-600">Code: {stock?.product_code}</p>
        <p className="text-lg font-bold text-blue-900 mt-1">Current Stock: {stock?.quantity}</p>
      </div>
      <div>
        <label className="label">New Quantity</label>
        <input type="number" className="input-field" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} min={0} />
        {qty !== stock?.quantity && (
          <p className="text-xs mt-1 text-gray-500">
            Change: <span className={qty > stock?.quantity ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
              {qty > stock?.quantity ? '+' : ''}{qty - stock?.quantity}
            </span>
          </p>
        )}
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input-field resize-none" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for adjustment..." />
      </div>
      <div className="flex gap-3">
        <button onClick={() => adjustMutation.mutate()} className="btn-primary flex-1 justify-center">
          Confirm Adjustment
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  )
}

export default function StockDashboard() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [adjustStock, setAdjustStock] = useState(null)
  const [showAddStock, setShowAddStock] = useState(false)

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['stock-dashboard'],
    queryFn: () => inventoryApi.stock.dashboard().then((r) => r.data),
  })

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock', search, filter],
    queryFn: () => {
      if (filter === 'low') return inventoryApi.stock.lowStock().then((r) => r.data)
      if (filter === 'out') return inventoryApi.stock.outOfStock().then((r) => r.data)
      return inventoryApi.stock.list({ search, page_size: 50 }).then((r) => r.data.results || r.data)
    },
  })

  const stocks = Array.isArray(stockData) ? stockData : (stockData?.results || [])

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Stock Dashboard"
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock Dashboard' }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowAddStock(true)} className="btn-primary">
              <Plus size={16} />
              Add Stock
            </button>
            <button onClick={() => window.location.href = '/admin/inventory/movements'} className="btn-secondary">
              Stock Movement
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KpiCard title="Total Products" value={dashData?.total_products ?? '—'} icon={Boxes} color="purple" loading={dashLoading} />
        <KpiCard title="Total Stock" value={dashData?.total_stock ?? '—'} icon={Package} color="blue" loading={dashLoading} />
        <KpiCard title="Low Stock" value={dashData?.low_stock ?? '—'} icon={AlertTriangle} color="yellow" loading={dashLoading} />
        <KpiCard title="Out of Stock" value={dashData?.out_of_stock ?? '—'} icon={XCircle} color="pink" loading={dashLoading} />
        <KpiCard title="Stock Value" value={formatCurrency(dashData?.stock_value)} icon={DollarSign} color="green" loading={dashLoading} />
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search product...">
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'low', label: 'Low Stock' },
                { key: 'out', label: 'Out of Stock' },
              ].map((f) => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filter === f.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </SearchFilter>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>Product</Th>
              <Th>Code</Th>
              <Th>Current Stock</Th>
              <Th>Min Stock</Th>
              <Th>Status</Th>
              <Th>Stock Value</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {stockLoading && <LoadingRows cols={7} />}
            {!stockLoading && stocks.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      {s.product_image ? (
                        <img src={s.product_image} alt={s.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={14} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-sm">{s.product_name}</span>
                  </div>
                </Td>
                <Td><span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{s.product_code}</span></Td>
                <Td>
                  <span className={`font-bold text-lg ${s.quantity <= 0 ? 'text-red-500' : s.is_low_stock ? 'text-yellow-500' : 'text-green-600'}`}>
                    {s.quantity}
                  </span>
                </Td>
                <Td><span className="text-sm text-gray-500">{s.min_quantity}</span></Td>
                <Td>
                  {s.quantity <= 0 ? (
                    <span className="status-badge bg-red-50 text-red-700">Out of Stock</span>
                  ) : s.is_low_stock ? (
                    <span className="status-badge bg-yellow-50 text-yellow-700">Low Stock</span>
                  ) : (
                    <span className="status-badge bg-green-50 text-green-700">In Stock</span>
                  )}
                </Td>
                <Td><span className="text-sm font-semibold">{formatCurrency(0)}</span></Td>
                <Td>
                  <button onClick={() => setAdjustStock(s)} className="btn-secondary py-1 px-3 text-xs">
                    Adjust
                  </button>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <Modal isOpen={!!adjustStock} onClose={() => setAdjustStock(null)} title="Adjust Stock" size="sm">
        {adjustStock && <AdjustStockModal stock={adjustStock} onClose={() => setAdjustStock(null)} />}
      </Modal>
      <Modal isOpen={showAddStock} onClose={() => setShowAddStock(false)} title="Add Stock" size="md">
        <AddStockModal onClose={() => setShowAddStock(false)} />
      </Modal>
    </div>
  )
}
