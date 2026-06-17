import { useQuery } from '@tanstack/react-query'
import { PieChart, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'
import { financeApi } from '@/api/finance'
import { formatCurrency } from '@/utils/helpers'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'

export default function ProfitReport() {
  const { data: summary } = useQuery({
    queryKey: ['revenue-summary'],
    queryFn: () => financeApi.revenue.summary(),
    select: (r) => r.data,
  })

  const { data: chart } = useQuery({
    queryKey: ['monthly-chart'],
    queryFn: () => financeApi.revenue.monthlyChart(),
    select: (r) => r.data ?? [],
  })

  const { data: daily } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => financeApi.dailySummary({ ordering: '-date' }),
    select: (r) => r.data?.results ?? [],
  })

  const kpis = [
    { label: 'Total Revenue', value: summary?.total_revenue ?? 0, icon: DollarSign, color: 'bg-green-100 text-green-600', positive: true },
    { label: 'Total Cost', value: summary?.total_cost ?? 0, icon: TrendingDown, color: 'bg-red-100 text-red-600', positive: false },
    { label: 'Gross Profit', value: summary?.gross_profit ?? 0, icon: TrendingUp, color: 'bg-purple-100 text-purple-600', positive: true },
    { label: 'Net Profit', value: summary?.net_profit ?? 0, icon: BarChart3, color: 'bg-blue-100 text-blue-600', positive: true },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Profit & Loss Report</h1>
          <p className="text-gray-500 text-sm mt-0.5">Revenue, cost and net profit overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {kpis.map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.positive ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(k.value)}
                </p>
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
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue vs Cost</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="cost" fill="#ec4899" radius={[4, 4, 0, 0]} name="Cost" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(daily ?? []).length > 0 && (
        <div className="form-card mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Daily Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Orders</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Revenue</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Cost</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Expenses</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {(daily ?? []).slice(0, 30).map((d) => (
                  <tr key={d.date} className="data-table-row">
                    <td className="py-3 px-4 font-medium text-gray-900">{d.date}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{d.total_orders}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(d.total_revenue)}</td>
                    <td className="py-3 px-4 text-right text-red-500">{formatCurrency(d.total_cost)}</td>
                    <td className="py-3 px-4 text-right text-orange-500">{formatCurrency(d.total_expenses)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${parseFloat(d.net_profit) >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                      {formatCurrency(d.net_profit)}
                    </td>
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
