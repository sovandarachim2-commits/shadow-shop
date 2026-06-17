import { useQuery } from '@tanstack/react-query'
import { Warehouse, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { cn } from '@/utils/helpers'

export default function InventoryReport() {
  const { data: stockList, isLoading } = useQuery({
    queryKey: ['stock-all'],
    queryFn: () => inventoryApi.stock.list({ ordering: 'quantity' }),
    select: (r) => r.data?.results ?? [],
  })

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => inventoryApi.stock.lowStock(),
    select: (r) => r.data ?? [],
  })

  const { data: outOfStock } = useQuery({
    queryKey: ['out-of-stock'],
    queryFn: () => inventoryApi.stock.outOfStock(),
    select: (r) => r.data ?? [],
  })

  const stocks = stockList ?? []
  const low = lowStock ?? []
  const out = outOfStock ?? []
  const healthy = stocks.filter(s => s.quantity > (s.min_quantity ?? 5))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Inventory Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">Current stock levels across all products</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        {[
          { label: 'Out of Stock', value: out.length, icon: XCircle, color: 'bg-red-100 text-red-600', border: 'border-red-100' },
          { label: 'Low Stock', value: low.length, icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600', border: 'border-yellow-100' },
          { label: 'Healthy Stock', value: healthy.length, icon: CheckCircle, color: 'bg-green-100 text-green-600', border: 'border-green-100' },
        ].map((k) => (
          <div key={k.label} className={`kpi-card border ${k.border}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{k.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${k.color}`}>
                <k.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-card mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Stock Levels</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Warehouse size={40} className="mx-auto mb-3 opacity-30" />
            <p>No stock data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Product</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Qty</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Min</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Location</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => {
                  const isOut = s.quantity <= 0
                  const isLow = !isOut && s.quantity <= (s.min_quantity ?? 5)
                  return (
                    <tr key={s.id} className="data-table-row">
                      <td className="py-3 px-4 font-medium text-gray-900">{s.product_name ?? s.product}</td>
                      <td className={cn('py-3 px-4 text-right font-bold', isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-gray-900')}>
                        {s.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">{s.min_quantity ?? 5}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{s.location || '—'}</td>
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="status-badge bg-red-100 text-red-700">Out of Stock</span>
                        ) : isLow ? (
                          <span className="status-badge bg-yellow-100 text-yellow-700">Low Stock</span>
                        ) : (
                          <span className="status-badge bg-green-100 text-green-700">In Stock</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
