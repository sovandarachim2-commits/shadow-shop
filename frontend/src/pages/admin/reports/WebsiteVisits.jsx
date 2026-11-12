import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Eye,
  Globe,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
  UserCheck,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { authApi } from '@/api/auth'
import { formatDateTime } from '@/utils/helpers'

const DAY_OPTIONS = [
  { value: '1', label: 'Today' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
]

const DEVICE_OPTIONS = [
  { value: 'all', label: 'All Devices' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
]

const DEVICE_ICONS = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
}

export default function WebsiteVisits() {
  const [days, setDays] = useState('7')
  const [device, setDevice] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-website-visits', days, device, search],
    queryFn: () =>
      authApi.visits
        .report({
          days,
          device: device === 'all' ? undefined : device,
          search: search.trim() || undefined,
        })
        .then((res) => res.data),
  })

  const summary = data?.summary || {}
  const daily = data?.daily || []
  const topPages = data?.top_pages || []
  const devices = data?.devices || []
  const recentVisits = data?.recent_visits || []

  const statCards = [
    {
      label: 'Live Visitors (15m)',
      value: summary.live_now ?? 0,
      sub: 'Active right now',
      icon: Activity,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Today Visits',
      value: summary.today_visits ?? 0,
      sub: `${summary.today_unique ?? 0} unique today`,
      icon: Eye,
      tone: 'bg-pink-50 text-pink-600',
    },
    {
      label: `Total Visits (${days === '1' ? 'Today' : `${days}d`})`,
      value: summary.total_visits ?? 0,
      sub: 'Page views recorded',
      icon: Globe,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Unique Visitors',
      value: summary.unique_visitors ?? 0,
      sub: `${summary.logged_in_visitors ?? 0} signed-in users`,
      icon: Users,
      tone: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website User Visits"
        subtitle="Track storefront traffic, unique visitors, top pages, and recent user visits"
        action={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary gap-2"
          >
            <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {card.label}
                </span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900">
                {Number(card.value).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">{card.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {DAY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDays(opt.value)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                days === opt.value
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            className="select-field w-40"
          >
            {DEVICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="w-64">
            <SearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Search page, user, IP..."
            />
          </div>
        </div>
      </div>

      {/* Chart + Top Pages & Devices */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Traffic Overview</h3>
              <p className="text-xs text-gray-500">Total visits vs unique visitors per day</p>
            </div>
          </div>
          {daily.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">
              No visit data in this period yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EC197A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EC197A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    name="Total Visits"
                    stroke="#EC197A"
                    strokeWidth={2}
                    fill="url(#visitGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="unique_visitors"
                    name="Unique Visitors"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#uniqueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Devices & Top Pages */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">Devices</h3>
            <div className="mt-3 space-y-2.5">
              {devices.length === 0 ? (
                <p className="text-xs text-gray-400">No device data yet.</p>
              ) : (
                devices.map((item) => {
                  const Icon = DEVICE_ICONS[item.device_type] || Monitor
                  return (
                    <div
                      key={item.device_type}
                      className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold capitalize text-gray-800">
                        <Icon size={15} className="text-pink-600" />
                        {item.device_type}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{item.visits}</span>
                        <span className="ml-1.5 text-xs text-gray-500">
                          ({item.unique_visitors} unique)
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900">Top Pages</h3>
            <div className="mt-3 space-y-2">
              {topPages.length === 0 ? (
                <p className="text-xs text-gray-400">No page views yet.</p>
              ) : (
                topPages.slice(0, 6).map((page) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between gap-2 border-b border-gray-50 pb-1.5 text-xs last:border-0"
                  >
                    <span className="truncate font-mono text-gray-700" title={page.path}>
                      {page.path}
                    </span>
                    <span className="shrink-0 font-bold text-gray-900">{page.visits}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Visits Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Recent Website Visits</h3>
        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Visitor</Th>
              <Th>Page</Th>
              <Th>Device / Browser</Th>
              <Th>IP Address</Th>
              <Th>Time</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <LoadingRows rows={6} cols={6} />
            ) : recentVisits.length === 0 ? (
              <EmptyState colSpan={6} message="No website visits recorded yet." />
            ) : (
              recentVisits.map((visit, idx) => {
                const Icon = DEVICE_ICONS[visit.device_type] || Monitor
                return (
                  <Tr key={visit.id}>
                    <Td className="text-xs font-semibold text-gray-400">{idx + 1}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full ${
                            visit.user_id
                              ? 'bg-pink-50 text-pink-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <UserCheck size={13} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{visit.user_name}</p>
                          <p className="text-[11px] text-gray-400">
                            {visit.user_email || `Visitor ${visit.visitor_id.slice(0, 8)}`}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-medium text-gray-800">
                        {visit.path}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Badge color={visit.device_type === 'mobile' ? 'pink' : 'info'}>
                          <Icon size={11} className="mr-1 inline" />
                          {visit.device_type}
                        </Badge>
                        <span className="text-xs text-gray-500">{visit.browser || 'Other'}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs text-gray-500">{visit.ip_address || '—'}</Td>
                    <Td className="text-xs text-gray-500">{formatDateTime(visit.created_at)}</Td>
                  </Tr>
                )
              })
            )}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}

