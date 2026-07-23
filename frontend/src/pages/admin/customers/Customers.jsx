import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Phone, MapPin, ShoppingBag, Search, Plus } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { formatCurrency, formatDate } from '@/utils/helpers'
import { CAMBODIA_PROVINCES } from '@/utils/cambodiaProvinces'

export default function Customers() {
  const [search, setSearch] = useState('')
  const [province, setProvince] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, province],
    queryFn: () => ordersApi.customers.list({ search, province: province || undefined }),
    select: (r) => r.data,
  })

  const customers = data?.results ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage customer profiles and purchase history</p>
        </div>
      </div>

      <div className="form-card mt-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select-field w-44"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
          >
            <option value="">All Provinces</option>
            {CAMBODIA_PROVINCES.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
            <option value="other">Other</option>
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Contact</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Province</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Orders</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Total Spent</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="data-table-row">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-bold">{c.name?.[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Phone size={13} />
                        {c.phone}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <MapPin size={13} />
                        {c.province?.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 text-gray-600">
                        <ShoppingBag size={13} />
                        {c.total_orders}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(c.total_spent)}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(c.created_at)}</td>
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
