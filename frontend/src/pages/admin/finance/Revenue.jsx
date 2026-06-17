import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows } from '@/components/ui/Table'
import { financeApi } from '@/api/finance'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

export default function Revenue() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.revenue.summary().then((r) => r.data),
  })

  const { data: chartData } = useQuery({
    queryKey: ['finance-chart'],
    queryFn: () => financeApi.revenue.monthlyChart().then((r) => r.data),
  })

  const { data: revenues, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenues'],
    queryFn: () => financeApi.revenue.list({ page_size: 20 }).then((r) => r.data.results),
  })

  return (
    <div className="animate-fade-in">
      <PageHeader title="Revenue" breadcrumbs={[{ label: 'Finance' }, { label: 'Revenue' }]} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Daily Revenue" value={formatCurrency(summary?.daily_revenue)} icon={DollarSign} color="green" loading={summaryLoading} />
        <KpiCard title="Monthly Revenue" value={formatCurrency(summary?.monthly_revenue)} icon={TrendingUp} color="purple" loading={summaryLoading} />
        <KpiCard title="Daily Expenses" value={formatCurrency(summary?.daily_expenses)} icon={TrendingDown} color="pink" loading={summaryLoading} />
        <KpiCard title="Monthly Profit" value={formatCurrency(summary?.monthly_profit)} icon={PieChart} color="blue" loading={summaryLoading} />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
        <h3 className="section-title mb-6">Revenue vs Expenses (12 Months)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              formatter={(v, n) => [formatCurrency(v), n.charAt(0).toUpperCase() + n.slice(1)]}
            />
            <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="expenses" fill="#ec4899" radius={[4, 4, 0, 0]} name="Expenses" />
            <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="section-title">Recent Transactions</h3>
        </div>
        <Table>
          <Thead>
            <tr>
              <Th>Order #</Th>
              <Th>Amount</Th>
              <Th>Payment Method</Th>
              <Th>Received By</Th>
              <Th>Date</Th>
            </tr>
          </Thead>
          <Tbody>
            {revenueLoading && <LoadingRows cols={5} />}
            {!revenueLoading && (revenues || []).map((r) => (
              <Tr key={r.id}>
                <Td><span className="font-mono text-sm font-semibold text-purple-700">#{r.order_number}</span></Td>
                <Td><span className="font-bold text-green-600">{formatCurrency(r.amount)}</span></Td>
                <Td><span className="capitalize text-sm">{r.payment_method}</span></Td>
                <Td><span className="text-sm">{r.received_by_name}</span></Td>
                <Td><span className="text-xs text-gray-500">{formatDateTime(r.received_at)}</span></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}
