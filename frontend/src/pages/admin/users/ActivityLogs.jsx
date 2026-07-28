import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, RefreshCw, Search } from 'lucide-react'
import { authApi } from '@/api/auth'
import { formatDateTime, cn } from '@/utils/helpers'

const ACTION_COLORS = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  view:   'bg-gray-100 text-gray-600',
  login:  'bg-purple-100 text-purple-700',
  logout: 'bg-orange-100 text-orange-700',
  print:  'bg-teal-100 text-teal-700',
  export: 'bg-yellow-100 text-yellow-700',
}

const MODULES = [
  'users', 'orders', 'products', 'inventory', 'print', 'settings',
  'delivery', 'finance', 'reports', 'dashboard', 'scanner',
]

function normalizeActivityResponse(payload) {
  if (Array.isArray(payload)) {
    return { results: payload, count: payload.length }
  }
  if (payload && typeof payload === 'object') {
    const results = Array.isArray(payload.results) ? payload.results : []
    return {
      results,
      count: typeof payload.count === 'number' ? payload.count : results.length,
    }
  }
  return { results: [], count: 0 }
}

export default function ActivityLogs() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, moduleFilter, actionFilter])

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['activity-logs', debouncedSearch, moduleFilter, actionFilter, page],
    queryFn: async () => {
      const response = await authApi.activityLogs({
        search: debouncedSearch || undefined,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        page,
        page_size: pageSize,
        ordering: '-created_at',
      })
      return normalizeActivityResponse(response.data)
    },
    retry: 1,
  })

  const logs = data?.results ?? []
  const total = data?.count ?? 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Activity Logs</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Audit trail of staff logins and admin actions
            {total > 0 ? ` · ${total} records` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="btn-secondary inline-flex items-center gap-2"
          disabled={isFetching}
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="form-card mt-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Search by user or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select-field w-44"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
          >
            <option value="">All Modules</option>
            {MODULES.map((m) => (
              <option key={m} value={m} className="capitalize">{m}</option>
            ))}
          </select>
          <select
            className="select-field w-40"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Actions</option>
            {Object.keys(ACTION_COLORS).map((a) => (
              <option key={a} value={a} className="capitalize">{a}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-10 text-center">
            <p className="font-semibold text-red-700">Could not load activity logs</p>
            <p className="mt-1 text-sm text-red-500">
              {error?.response?.data?.detail || error?.message || 'Please try again'}
            </p>
            <button type="button" onClick={() => refetch()} className="btn-primary mx-auto mt-4">
              Try Again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p>No activity logs found</p>
            <p className="mt-1 text-xs">Log out and log in again, or create an order / edit a product.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">IP</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{log.user_name || 'System'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize',
                          ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600',
                        )}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-gray-500">{log.module}</td>
                      <td className="max-w-md px-4 py-3 text-gray-700">{log.description}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.ip_address || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-400">
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {total > pageSize && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm text-gray-500">
                  Showing {logs.length} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary py-1.5 text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={logs.length < pageSize}
                    className="btn-secondary py-1.5 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
