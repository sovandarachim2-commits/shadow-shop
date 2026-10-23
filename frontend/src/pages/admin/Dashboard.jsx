import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  ShoppingCart, DollarSign, TrendingUp, Package,
  Clock, CheckCircle, Truck, AlertTriangle,
  Plus, Printer, ScanLine, ArrowRight, Users,
  Zap
} from 'lucide-react'
import { KpiCard } from '@/components/ui/Card'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { formatCurrency } from '@/utils/helpers'

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
]

const PERIOD_TITLES = {
  today: "Today's",
  week: "This Week's",
  month: "This Month's",
  year: "This Year's",
  custom: 'Selected',
}

const EMPTY_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
  day, revenue: 0, orders: 0,
}))

export default function Dashboard() {
  const [period, setPeriod] = useState('week')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const customReady = period !== 'custom' || (dateFrom && dateTo)
  const statsParams = {
    period: customReady ? period : 'week',
    ...(period === 'custom' && dateFrom && dateTo ? { date_from: dateFrom, date_to: dateTo } : {}),
  }
  const periodTitle = PERIOD_TITLES[statsParams.period] || "This Week's"

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', statsParams],
    queryFn: () => authApi.dashboardStats(statsParams).then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders', stats?.date_from, stats?.date_to],
    queryFn: () => ordersApi.orders.list({
      page_size: 8,
      date_from: stats?.date_from,
      date_to: stats?.date_to,
    }).then((r) => r.data.results),
    enabled: Boolean(stats?.date_from && stats?.date_to),
  })

  const salesWeek = stats?.sales_week?.length ? stats.sales_week : EMPTY_WEEK
  const orderStatus = (stats?.order_status || []).filter((item) => item.value > 0)
  const statusList = stats?.order_status || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <p className="text-xs text-gray-400">
            {stats?.date_from && stats?.date_to ? `${stats.date_from} to ${stats.date_to}` : 'Choose a period'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                period === item.id ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-200'
              }`}
            >
              {item.label}
            </button>
          ))}
          {period === 'custom' && (
            <>
              <input type="date" className="input-field w-auto py-1.5 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <input type="date" className="input-field w-auto py-1.5 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </>
          )}
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title={`${periodTitle} Orders`} value={stats?.today_orders ?? '—'} icon={ShoppingCart} color="blue" loading={isLoading} />
        <KpiCard title="Pending Orders" value={stats?.pending_orders ?? '—'} icon={Clock} color="yellow" loading={isLoading} />
        <KpiCard title="Packing Orders" value={stats?.packing_orders ?? '—'} icon={Package} color="purple" loading={isLoading} />
        <KpiCard title="Ready to Ship" value={stats?.ready_to_ship ?? '—'} icon={Truck} color="orange" loading={isLoading} />
        <KpiCard title={`${periodTitle} Sales`} value={formatCurrency(stats?.today_sales)} icon={DollarSign} color="green" loading={isLoading} />
        <KpiCard title={`${periodTitle} Profit`} value={formatCurrency(stats?.today_profit)} icon={TrendingUp} color="pink" loading={isLoading} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900">Sales Summary</h3>
            <p className="text-xs text-gray-400">Paid sales for the selected period</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesWeek}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(v) => [formatCurrency(v), 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} fill="url(#revenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Order Status</h3>
          <p className="text-xs text-gray-400 mb-4">Orders in the selected period</p>
          {orderStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={orderStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  dataKey="value" stroke="none">
                  {orderStatus.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">No orders yet</div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {statusList.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-gray-600">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(recentOrders || []).slice(0, 6).map((order) => (
              <Link key={order.id} to={`/admin/orders/${order.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <ShoppingCart size={14} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">#{order.order_number}</p>
                  <p className="text-xs text-gray-400 truncate">{order.customer_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.grand_total)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            ))}
            {(!recentOrders || recentOrders.length === 0) && (
              <div className="py-10 text-center text-gray-400 text-sm">No orders yet</div>
            )}
          </div>
        </div>

        {/* Quick Actions & Store Info */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-purple-600" />
              <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'New Order', icon: Plus, path: '/admin/orders/new', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
                { label: 'Print', icon: Printer, path: '/admin/print', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
                { label: 'Scanner', icon: ScanLine, path: '/admin/scanner', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
                { label: 'Delivery', icon: Truck, path: '/admin/delivery', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
              ].map((a) => (
                <Link key={a.label} to={a.path}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors cursor-pointer ${a.color}`}>
                  <a.icon size={20} />
                  <span className="text-xs font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Store Info */}
          <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                <Package size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Shadow Shop</h3>
                <p className="text-navy-300 text-xs">Wholesale Cosmetics</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-navy-300">Low Stock Items</span>
                <span className="font-semibold text-yellow-400">{stats?.low_stock ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-300">Out of Stock</span>
                <span className="font-semibold text-red-400">{stats?.out_of_stock ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-300">Total Customers</span>
                <span className="font-semibold text-white">{stats?.total_customers ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-300">Period Sales</span>
                <span className="font-semibold text-green-400">{formatCurrency(stats?.today_sales)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
