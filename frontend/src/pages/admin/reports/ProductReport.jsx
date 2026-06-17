import { useQuery } from '@tanstack/react-query'
import { Package, Tag, Star } from 'lucide-react'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'

export default function ProductReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['products-report'],
    queryFn: () => productsApi.products.list({ ordering: '-review_count', is_active: true }),
    select: (r) => r.data?.results ?? [],
  })

  const products = data ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Product Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">Product performance and catalogue overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { label: 'Total Products', value: products.length, color: 'bg-purple-100 text-purple-600' },
          { label: 'Featured', value: products.filter(p => p.is_featured).length, color: 'bg-pink-100 text-pink-600' },
          { label: 'New Arrivals', value: products.filter(p => p.is_new_arrival).length, color: 'bg-blue-100 text-blue-600' },
          { label: 'Best Sellers', value: products.filter(p => p.is_best_seller).length, color: 'bg-green-100 text-green-600' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{k.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k.color}`}>
                <Package size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="form-card mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">All Products</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Product</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Code</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Category</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Cost</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Wholesale</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Retail</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Rating</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="data-table-row">
                    <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{p.code}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{p.category_name ?? '—'}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(p.cost_price)}</td>
                    <td className="py-3 px-4 text-right text-purple-700 font-medium">{formatCurrency(p.wholesale_price)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(p.retail_price)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 text-yellow-500">
                        <Star size={12} fill="currentColor" />
                        <span className="text-gray-700 text-xs">{p.rating ?? 0}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {p.is_best_seller && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Best</span>}
                        {p.is_new_arrival && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">New</span>}
                        {p.is_featured && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Featured</span>}
                      </div>
                    </td>
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
