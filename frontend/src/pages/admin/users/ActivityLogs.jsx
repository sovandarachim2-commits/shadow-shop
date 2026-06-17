import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search } from 'lucide-react'
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

export default function ActivityLogs() {
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['activity-logs', search, module],
    queryFn: () => authApi.activityLogs({ search, module: module || undefined }),
    select: (r) => r.data?.results ?? [],
  })

  const logs = data ?? []

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Activity Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">Full audit trail of all user actions</p>
        </div>
      </div>

      <div className="form-card mt-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search by user or description..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select-field w-44" value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">All Modules</option>
            {['dashboard','orders','products','inventory','delivery','finance','reports','users','settings','print','scanner'].map(m => (
              <option key={m} value={m} className="capitalize">{m}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">User</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Action</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Module</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">IP</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="data-table-row">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{log.user_name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn('status-badge capitalize', ACTION_COLORS[log.action])}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 capitalize text-xs">{log.module}</td>
                    <td className="py-3 px-4 text-gray-700 max-w-sm truncate">{log.description}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs font-mono">{log.ip_address || '—'}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatDateTime(log.created_at)}</td>
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
