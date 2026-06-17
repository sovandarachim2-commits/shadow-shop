import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { financeApi } from '@/api/finance'
import { formatCurrency, formatDate } from '@/utils/helpers'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function SalesReport() {
  const [range, setRange] = useState('30')

  const { data: chart } = useQuery({
    queryKey: ['monthly-chart'],
    queryFn: () => financeApi.revenue.monthlyChart(),
    select: (r) => r.data ?? [],
  })

  const { data: summary } = useQuery({
    queryKey: ['revenue-summary'],
    queryFn: () => financeApi.revenue.summary(),
    select: (r) => r.data,
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['orders-recent'],
    queryFn: () => ordersApi.orders.list({ status: 'completed', ordering: '-created_at' }),
    select: (r) => r.data?.results ?? [],
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Sales Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">Sales performance and order analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(summary?.total_revenue ?? 0), icon: DollarSign, color: 'text-green-600 bg-green-100' },
          { label: 'Completed Orders', value: summary?.total_orders ?? 0, icon: ShoppingBag, color: 'text-blue-600 bg-blue-100' },
          { label: 'Avg Order Value', value: formatCurrency(summary?.avg_order_value ?? 0), icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
          { label: 'Gross Profit', value: formatCurrency(summary?.gross_profit ?? 0), icon: BarChart3, color: 'text-pink-600 bg-pink-100' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{k.value}</p>
              </div>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${k.color}`}>
                <k.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {chart && chart.length > 0 && (
        <div className="form-card mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Sales Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chart}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2}
                fill="url(#revenueGrad)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {(recentOrders ?? []).length > 0 && (
        <div className="form-card mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Completed Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Order #</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Customer</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Total</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Payment</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {(recentOrders ?? []).slice(0, 20).map((o) => (
                  <tr key={o.id} className="data-table-row">
                    <td className="py-3 px-4 font-mono font-medium text-purple-700">{o.order_number}</td>
                    <td className="py-3 px-4 text-gray-900">{o.customer_name ?? o.customer}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(o.grand_total)}</td>
                    <td className="py-3 px-4 text-gray-500 capitalize">{o.payment_method}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
