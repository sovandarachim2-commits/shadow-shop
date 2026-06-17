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
import { financeApi } from '@/api/finance'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

const CHART_COLORS = ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const MOCK_SALES_DATA = [
  { day: 'Mon', revenue: 1200, orders: 8 },
  { day: 'Tue', revenue: 1890, orders: 12 },
  { day: 'Wed', revenue: 2340, orders: 15 },
  { day: 'Thu', revenue: 1780, orders: 11 },
  { day: 'Fri', revenue: 3200, orders: 20 },
  { day: 'Sat', revenue: 2900, orders: 18 },
  { day: 'Sun', revenue: 1500, orders: 9 },
]

const MOCK_STATUS_DATA = [
  { name: 'New', value: 24, color: '#3b82f6' },
  { name: 'Preparing', value: 18, color: '#f59e0b' },
  { name: 'Packed', value: 12, color: '#7c3aed' },
  { name: 'Shipped', value: 31, color: '#f97316' },
  { name: 'Completed', value: 89, color: '#10b981' },
  { name: 'Cancelled', value: 7, color: '#ef4444' },
]

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => authApi.dashboardStats().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: () => ordersApi.orders.list({ page_size: 8 }).then((r) => r.data.results),
  })

  const { data: financeSummary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.revenue.summary().then((r) => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard title="Today's Orders" value={stats?.today_orders ?? '—'} icon={ShoppingCart} color="blue" loading={isLoading} />
        <KpiCard title="Pending Orders" value={stats?.pending_orders ?? '—'} icon={Clock} color="yellow" loading={isLoading} />
        <KpiCard title="Packing Orders" value={stats?.packing_orders ?? '—'} icon={Package} color="purple" loading={isLoading} />
        <KpiCard title="Ready to Ship" value={stats?.ready_to_ship ?? '—'} icon={Truck} color="orange" loading={isLoading} />
        <KpiCard title="Today's Sales" value={formatCurrency(financeSummary?.daily_revenue)} icon={DollarSign} color="green" loading={isLoading} />
        <KpiCard title="Today's Profit" value={formatCurrency(financeSummary?.daily_profit)} icon={TrendingUp} color="pink" loading={isLoading} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Sales Summary</h3>
              <p className="text-xs text-gray-400">This week overview</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_SALES_DATA}>
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
          <p className="text-xs text-gray-400 mb-4">Distribution overview</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={MOCK_STATUS_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" stroke="none">
                {MOCK_STATUS_DATA.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {MOCK_STATUS_DATA.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-gray-600">{s.name}</span>
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
              <div key={order.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors">
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
              </div>
            ))}
            {(!recentOrders || recentOrders.length === 0) && (
              <div className="py-10 text-center text-gray-400 text-sm">No orders yet today</div>
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
                <span className="text-navy-300">Monthly Revenue</span>
                <span className="font-semibold text-green-400">{formatCurrency(financeSummary?.monthly_revenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
