import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown, DollarSign, PieChart, Search, TrendingDown, TrendingUp } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { KpiCard } from '@/components/ui/Card'
import { LoadingRows, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { financeApi } from '@/api/finance'
import { authApi } from '@/api/auth'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

const PAYMENT_METHODS = [
  ['bakong', 'Bakong KHQR'],
  ['aba', 'ABA Bank'],
  ['acleda', 'ACLEDA Bank'],
  ['wing', 'Wing'],
  ['cod', 'Cash on Delivery'],
  ['cash', 'Cash'],
  ['contact_sales', 'Contact Sales'],
  ['other', 'Other'],
]

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS)

const SHOP_STATUS = {
  new: 'Pending',
  pending: 'Pending',
  confirmed: 'Confirmed',
  printed: 'Confirmed',
  preparing: 'Preparing',
  packed: 'Packed',
  shipped: 'Shipped',
  completed: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_STYLE = {
  Pending: 'bg-yellow-50 text-yellow-700',
  Confirmed: 'bg-orange-50 text-orange-700',
  Preparing: 'bg-orange-50 text-orange-700',
  Packed: 'bg-blue-50 text-blue-700',
  Shipped: 'bg-cyan-50 text-cyan-700',
  Delivered: 'bg-green-50 text-green-700',
  Cancelled: 'bg-gray-100 text-gray-500',
}

function paymentLabel(method) {
  return PAYMENT_LABELS[method] || method || '-'
}

function shopStatus(status) {
  return SHOP_STATUS[status] || status || '-'
}

function itemSummary(items) {
  if (!items?.length) return '-'
  return items.map((item) => `${item.name} x${item.quantity}`).join(', ')
}

const ORDER_STATUS_FILTERS = [
  ['pending', 'Pending'],
  ['confirmed', 'Confirmed'],
  ['preparing', 'Preparing'],
  ['packed', 'Packed'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
]

const ROW_OPTIONS = [50, 100, 200, 500]

const PAYMENT_COLOR = {
  bakong: 'text-purple-700',
  aba: 'text-blue-700',
  acleda: 'text-sky-700',
  wing: 'text-emerald-700',
  cod: 'text-orange-700',
  cash: 'text-green-700',
  contact_sales: 'text-pink-700',
  other: 'text-gray-600',
}

function shortMonth(value) {
  return String(value || '').replace(' 20', ' ')
}

function moneyTick(value) {
  const amount = Number(value) || 0
  if (Math.abs(amount) >= 1000) return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
  return `$${amount}`
}

export default function Revenue() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [paymentMethods, setPaymentMethods] = useState([])
  const [orderStatuses, setOrderStatuses] = useState([])
  const [sellerIds, setSellerIds] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pageSize, setPageSize] = useState(100)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: () => financeApi.revenue.summary().then((response) => response.data),
  })

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['finance-chart'],
    queryFn: () => financeApi.revenue.monthlyChart().then((response) => response.data),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['revenue-seller-options'],
    queryFn: () => authApi.users.list({ page_size: 200, ordering: 'first_name' })
      .then((response) => (response.data?.results ?? response.data ?? [])
        .filter((user) => user.role !== 'customer' && user.is_active !== false)),
    staleTime: 5 * 60 * 1000,
  })
  const sellerOptions = [
    { id: 'shadow_shop', name: 'Shadow Shop' },
    ...users.map((user) => ({ id: String(user.id), name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username })),
  ]

  const { data: filterCounts } = useQuery({
    queryKey: ['revenue-filter-counts', { search, dateFrom, dateTo, paymentMethods, orderStatuses, sellerIds }],
    queryFn: () => financeApi.revenue.filterCounts({
      search: search || undefined,
      payment_method: paymentMethods.length ? paymentMethods.join(',') : undefined,
      order_status: orderStatuses.length ? orderStatuses.join(',') : undefined,
      seller_ids: sellerIds.length ? sellerIds.join(',') : undefined,
      date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
      date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
    }).then((response) => response.data),
  })

  const { data: revenuePage, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenues', { search, paymentMethods, orderStatuses, sellerIds, dateFrom, dateTo, page, pageSize }],
    queryFn: () => financeApi.revenue.list({
      page,
      page_size: pageSize,
      search: search || undefined,
      payment_method: paymentMethods.length ? paymentMethods.join(',') : undefined,
      order_status: orderStatuses.length ? orderStatuses.join(',') : undefined,
      seller_ids: sellerIds.length ? sellerIds.join(',') : undefined,
      date_from: dateFrom ? `${dateFrom}T00:00:00` : undefined,
      date_to: dateTo ? `${dateTo}T23:59:59` : undefined,
    }).then((response) => response.data),
  })

  const revenues = revenuePage?.results || []
  const total = revenuePage?.count || 0
  const statusCounts = filterCounts?.statuses || {}
  const paymentCounts = filterCounts?.payments || {}
  const sellerCounts = filterCounts?.sellers || {}
  const countForStatus = (status) => status === 'pending'
    ? (statusCounts.new || 0) + (statusCounts.pending || 0)
    : status === 'confirmed'
      ? (statusCounts.confirmed || 0) + (statusCounts.printed || 0)
      : status === 'delivered'
        ? statusCounts.completed || 0
        : statusCounts[status] || 0
  const toggleFilter = (setter, values, value) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
    setPage(1)
  }
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const months = (chartData || []).map((row) => ({ ...row, label: shortMonth(row.month) }))
  const hasChart = months.some((row) => Number(row.revenue) || Number(row.expenses))

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Revenue" subtitle="Money received and this month’s result" />

      <section className="relative overflow-visible rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="grid grid-cols-2 items-end gap-3 border-b border-gray-100 p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
          <div className="relative col-span-2 min-w-0 sm:col-span-3 lg:col-span-2 2xl:col-span-2">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search order, customer, or phone"
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>
          <details className="relative min-w-0">
            <summary className="flex h-10 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
              {orderStatuses.length ? `Status (${orderStatuses.length})` : 'All status'}
              <ChevronDown size={14} className="shrink-0 text-gray-400" />
            </summary>
            <div className="absolute left-0 top-11 z-50 max-h-72 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              {ORDER_STATUS_FILTERS.map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={orderStatuses.includes(value)} onChange={() => toggleFilter(setOrderStatuses, orderStatuses, value)} className="accent-purple-600" />
                  <span className="flex-1">{label}</span><span className="text-xs tabular-nums text-gray-400">{countForStatus(value)}</span>
                </label>
              ))}
            </div>
          </details>
          <details className="relative min-w-0">
            <summary className="flex h-10 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
              {sellerIds.length ? `Sellers (${sellerIds.length})` : 'All sellers'}
              <ChevronDown size={14} className="shrink-0 text-gray-400" />
            </summary>
            <div className="absolute left-0 top-11 z-50 max-h-72 w-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              {sellerOptions.map((seller) => (
                <label key={seller.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={sellerIds.includes(String(seller.id))} onChange={() => toggleFilter(setSellerIds, sellerIds, String(seller.id))} className="accent-purple-600" />
                  <span className="flex-1 truncate">{seller.name}</span><span className="text-xs tabular-nums text-gray-400">{sellerCounts[String(seller.id)] || 0}</span>
                </label>
              ))}
            </div>
          </details>
          <details className="relative min-w-0">
            <summary className="flex h-10 w-full cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
              {paymentMethods.length ? `Payments (${paymentMethods.length})` : 'All payments'}
              <ChevronDown size={14} className="shrink-0 text-gray-400" />
            </summary>
            <div className="absolute left-0 top-11 z-50 max-h-72 w-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              {PAYMENT_METHODS.map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                  <input type="checkbox" checked={paymentMethods.includes(value)} onChange={() => toggleFilter(setPaymentMethods, paymentMethods, value)} className="accent-purple-600" />
                  <span className="flex-1">{label}</span><span className="text-xs tabular-nums text-gray-400">{paymentCounts[value] || 0}</span>
                </label>
              ))}
            </div>
          </details>
          <select
            value={pageSize}
            onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}
            aria-label="Rows"
            className="h-10 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-purple-500"
          >
            {ROW_OPTIONS.map((option) => <option key={option} value={option}>{option} rows</option>)}
          </select>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Order created from</span>
            <input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1) }} className="h-10 min-w-0 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-purple-500" />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Order created to</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1) }} className="h-10 min-w-0 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-purple-500" />
          </label>
          <span className="text-xs font-semibold text-gray-500">{total} orders</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard title="Revenue today" value={formatCurrency(summary?.daily_revenue)} icon={DollarSign} color="green" loading={summaryLoading} />
        <KpiCard title="Revenue this month" value={formatCurrency(summary?.monthly_revenue)} icon={TrendingUp} color="purple" loading={summaryLoading} />
        <KpiCard title="Expenses today" value={formatCurrency(summary?.daily_expenses)} icon={TrendingDown} color="pink" loading={summaryLoading} />
        <KpiCard title="Profit this month" value={formatCurrency(summary?.monthly_profit)} icon={PieChart} color="blue" loading={summaryLoading} />
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Last 12 months</h2>
          <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-purple-600" /> Revenue</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-pink-500" /> Expenses</span>
          </div>
        </div>
        {chartLoading ? (
          <div className="h-[240px] animate-pulse rounded-xl bg-gray-100" />
        ) : !hasChart ? (
          <p className="flex h-[180px] items-center justify-center text-sm font-medium text-gray-400">No revenue or expenses in the last 12 months</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={months} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={moneyTick} width={48} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: 'none' }}
                formatter={(value, name) => [formatCurrency(value), name]}
              />
              <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Revenue" maxBarSize={18} />
              <Bar dataKey="expenses" fill="#ec4899" radius={[4, 4, 0, 0]} name="Expenses" maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Order</Th>
              <Th>Order Date</Th>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th>Seller</Th>
              <Th>Status</Th>
              <Th>Items</Th>
              <Th>Amount</Th>
              <Th>Payment</Th>
              <Th>Date</Th>
            </tr>
          </Thead>
          <Tbody>
            {revenueLoading && <LoadingRows cols={11} />}
            {!revenueLoading && revenues.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-14 text-center text-sm font-semibold text-gray-400">No orders match this filter</td>
              </tr>
            )}
            {!revenueLoading && revenues.map((row, index) => {
              const status = shopStatus(row.order_status)
              return (
                <Tr key={row.id}>
                  <Td><span className="text-sm font-bold text-slate-400">{(page - 1) * pageSize + index + 1}</span></Td>
                  <Td>
                    <p className="font-mono text-sm font-semibold text-purple-700">{row.order_number || row.reference || '-'}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">{row.received_by_name || '-'}</p>
                  </Td>
                  <Td><span className="whitespace-nowrap text-sm font-semibold text-gray-900">{row.order_date ? formatDateTime(row.order_date) : '-'}</span></Td>
                  <Td><span className="text-sm font-semibold text-gray-900">{row.customer_name || '-'}</span></Td>
                  <Td><span className="text-sm font-semibold text-sky-700">{row.customer_phone || '-'}</span></Td>
                  <Td><span className="text-sm font-semibold text-indigo-700">{row.seller_name || '-'}</span></Td>
                  <Td>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>
                  </Td>
                  <Td><span className="block max-w-[240px] truncate text-sm font-medium text-gray-600" title={itemSummary(row.items)}>{itemSummary(row.items)}</span></Td>
                  <Td><span className="font-bold text-green-700">{formatCurrency(row.amount)}</span></Td>
                  <Td><span className={`text-sm font-semibold ${PAYMENT_COLOR[row.payment_method] || 'text-gray-600'}`}>{paymentLabel(row.payment_method)}</span></Td>
                  <Td><span className="whitespace-nowrap text-sm font-semibold text-gray-900">{formatDateTime(row.received_at)}</span></Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="h-9 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-600 disabled:opacity-40">Previous</button>
            <span className="text-xs font-semibold text-gray-500">Page {page} of {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount} className="h-9 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-600 disabled:opacity-40">Next</button>
          </div>
        )}
      </section>
    </div>
  )
}
