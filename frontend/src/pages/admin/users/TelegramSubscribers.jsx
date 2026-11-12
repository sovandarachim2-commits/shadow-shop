import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, ExternalLink, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { authApi } from '@/api/auth'
import { formatDateTime } from '@/utils/helpers'

const ROLE_COLORS = {
  super_admin: 'danger',
  admin: 'primary',
  seller: 'info',
  cashier: 'success',
  warehouse: 'warning',
  scanner: 'default',
  delivery: 'orange',
  customer: 'pink',
}

function AlertsSwitch({ enabled, disabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold transition disabled:opacity-50 ${
        enabled
          ? 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-sky-500' : 'bg-slate-400'}`} />
      {enabled ? 'Alerts On' : 'Paused'}
    </button>
  )
}

export default function TelegramSubscribers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-telegram-subscribers', search, statusFilter],
    queryFn: () => {
      const params = { telegram_connected: 1, page_size: 200 }
      if (search.trim()) params.search = search.trim()
      if (statusFilter === 'enabled') params.telegram_notifications_enabled = 1
      if (statusFilter === 'paused') params.telegram_notifications_enabled = 0
      return authApi.users.list(params).then((r) => r.data.results ?? r.data ?? [])
    },
  })

  const users = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const stats = useMemo(() => {
    const enabledCount = users.filter((u) => u.telegram_notifications_enabled !== false).length
    const pausedCount = users.length - enabledCount
    return { total: users.length, enabled: enabledCount, paused: pausedCount }
  }, [users])

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }) =>
      authApi.users.update(id, { telegram_notifications_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-telegram-subscribers'] })
      toast.success('Updated Telegram notification status')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to update user')
    },
  })

  return (
    <div>
      <PageHeader
        title="Telegram Notifications"
        subtitle="Users who connected their Telegram account for private bot alerts"
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Send size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Connected Users</p>
            <p className="text-xl font-black text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Bell size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Alerts Enabled</p>
            <p className="text-xl font-black text-gray-900">{stats.enabled}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
            <BellOff size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Paused</p>
            <p className="text-xl font-black text-gray-900">{stats.paused}</p>
          </div>
        </div>
      </div>

      <SearchFilter
        search={search}
        onSearch={setSearch}
        placeholder="Search name, phone, @telegram, or Telegram ID..."
        filters={[
          {
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'all', label: 'All Connected' },
              { value: 'enabled', label: 'Alerts On' },
              { value: 'paused', label: 'Paused' },
            ],
          },
        ]}
      />

      <Table>
        <Thead>
          <Tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Phone</Th>
            <Th>Telegram</Th>
            <Th>Telegram ID</Th>
            <Th>Bot Alerts</Th>
            <Th>Connected / Auth</Th>
          </Tr>
        </Thead>
        <Tbody>
          {isLoading ? (
            <LoadingRows cols={7} />
          ) : users.length === 0 ? (
            <EmptyState cols={7} message="No users connected to Telegram yet" />
          ) : (
            users.map((u) => {
              const alertsOn = u.telegram_notifications_enabled !== false
              const tgUsername = String(u.telegram_username || '').replace(/^@/, '')
              return (
                <Tr key={u.id}>
                  <Td>
                    <div className="font-bold text-gray-900">{u.full_name || u.username}</div>
                    <div className="text-xs text-gray-400">@{u.username}</div>
                  </Td>
                  <Td>
                    <Badge color={ROLE_COLORS[u.role] || 'default'}>{u.role}</Badge>
                  </Td>
                  <Td className="text-gray-600">{u.phone || '-'}</Td>
                  <Td>
                    {tgUsername ? (
                      <a
                        href={`https://t.me/${tgUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline"
                      >
                        @{tgUsername}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </Td>
                  <Td>
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
                      {u.telegram_id}
                    </span>
                  </Td>
                  <Td>
                    <AlertsSwitch
                      enabled={alertsOn}
                      disabled={toggleMutation.isPending}
                      onToggle={() =>
                        toggleMutation.mutate({ id: u.id, enabled: !alertsOn })
                      }
                    />
                  </Td>
                  <Td className="text-xs text-gray-500">
                    {formatDateTime(u.telegram_auth_date || u.created_at)}
                  </Td>
                </Tr>
              )
            })
          )}
        </Tbody>
      </Table>
    </div>
  )
}

