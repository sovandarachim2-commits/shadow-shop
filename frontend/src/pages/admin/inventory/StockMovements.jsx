import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { formatDateTime, cn } from '@/utils/helpers'

const TYPE_COLORS = {
  stock_in:     'bg-green-100 text-green-700',
  stock_out:    'bg-red-100 text-red-700',
  transfer:     'bg-blue-100 text-blue-700',
  adjustment:   'bg-yellow-100 text-yellow-700',
  damaged:      'bg-orange-100 text-orange-700',
  offline_team: 'bg-purple-100 text-purple-700',
  return:       'bg-teal-100 text-teal-700',
}

const TYPE_LABELS = {
  stock_in: 'Stock In', stock_out: 'Stock Out', transfer: 'Transfer',
  adjustment: 'Adjustment', damaged: 'Damaged', offline_team: 'Offline Team', return: 'Return',
}

export default function StockMovements() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', search, type],
    queryFn: () => inventoryApi.movements.list({ search, type: type || undefined }),
    select: (r) => r.data,
  })

  const movements = data?.results ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Stock Movements</h1>
          <p className="text-gray-500 text-sm mt-0.5">Full audit trail of all inventory changes</p>
        </div>
      </div>

      <div className="form-card mt-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search product..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select-field w-44" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
            <p>No stock movements found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Type</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Qty</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Before</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">After</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Reference</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="data-table-row">
                    <td className="py-3 px-4 font-medium text-gray-900">{m.product_name ?? m.product}</td>
                    <td className="py-3 px-4">
                      <span className={cn('status-badge', TYPE_COLORS[m.type])}>
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className={cn('flex items-center justify-end gap-1 font-semibold',
                        m.quantity > 0 ? 'text-green-600' : 'text-red-600')}>
                        {m.quantity > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">{m.before_qty}</td>
                    <td className="py-3 px-4 text-right text-gray-900 font-medium">{m.after_qty}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{m.reference || '—'}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDateTime(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
