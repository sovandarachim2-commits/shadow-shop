import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Shield, Eye, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { authApi } from '@/api/auth'
import { formatDateTime } from '@/utils/helpers'

const ROLE_COLORS = {
  super_admin: 'danger', admin: 'primary', seller: 'info',
  cashier: 'success', warehouse: 'warning', scanner: 'default',
  delivery: 'orange', customer: 'pink',
}

const getApiError = (error, fallback) => {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const firstKey = Object.keys(data)[0]
  const firstValue = firstKey ? data[firstKey] : null
  if (Array.isArray(firstValue)) return `${firstKey}: ${firstValue[0]}`
  if (typeof firstValue === 'string') return `${firstKey}: ${firstValue}`
  return fallback
}

const cleanUsernamePart = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')

const generatedUsernamePreview = (firstName, lastName) => {
  const first = cleanUsernamePart(firstName)
  const last = cleanUsernamePart(lastName)
  const base = first && last ? `${first[0]}${last}` : first || last || 'user'
  return `${base}1048`
}

function StatusSwitch({ active, disabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex h-8 w-[76px] items-center rounded-full p-1 transition disabled:opacity-50 ${
        active ? 'justify-start bg-green-600 text-white' : 'justify-end bg-gray-300 text-gray-600'
      }`}
      title={active ? 'Active - click to turn off' : 'Inactive - click to turn on'}
    >
      <span className={`px-1.5 text-[11px] font-black uppercase leading-none ${active ? 'order-1' : 'order-2'}`}>
        {active ? 'ON' : 'OFF'}
      </span>
      <span className={`h-6 w-6 rounded-full bg-white shadow ${active ? 'order-2 ml-auto' : 'order-1 mr-auto'}`} />
    </button>
  )
}

function UserAvatar({ user, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-lg' : 'h-9 w-9 text-xs'
  const initial = (user?.first_name || user?.username || 'U')[0]?.toUpperCase()

  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.full_name || user.username} className={`${sizeClass} rounded-full object-cover`} />
  }

  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400`}>
      <span className="font-bold text-white">{initial}</span>
    </div>
  )
}

function UserProfileModal({ user, roleConfig, onClose }) {
  if (!user) return null

  const rows = [
    ['Full Name', user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username],
    ['Username', `@${user.username}`],
    ['Email', user.email || '-'],
    ['Phone', user.phone || '-'],
    ['Telegram', user.telegram_username ? `@${user.telegram_username}` : user.telegram_id || '-'],
    ['Joined', formatDateTime(user.created_at)],
  ]

  return (
    <Modal isOpen={!!user} onClose={onClose} title="User Profile" size="md">
      <div className="p-6">
        <div className="flex items-center gap-4 rounded-2xl bg-gray-50 p-4">
          <UserAvatar user={user} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-gray-950">{rows[0][1]}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={roleConfig.color}>{roleConfig.label}</Badge>
              <Badge variant={user.is_active ? 'success' : 'default'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
        </div>
        <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-100">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-sm">
              <span className="font-semibold text-gray-500">{label}</span>
              <span className="min-w-0 break-words text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function UserForm({ user, roles, onSave, onClose }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || (roles[0]?.name ?? 'seller'),
    password: '',
    confirm_password: '',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = !!user
  const usernamePreview = isEdit
    ? form.username
    : generatedUsernamePreview(form.first_name, form.last_name)
  const hasCurrentRole = roles.some((r) => r.name === form.role)
  const roleOptions = hasCurrentRole
    ? roles
    : [{ name: form.role, display_name: form.role || 'Current Role' }, ...roles]

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">First Name</label>
          <input className="input-field" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input className="input-field" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Username</label>
          <input className="input-field font-mono" value={usernamePreview} disabled />
          {!isEdit && <p className="mt-1 text-xs font-semibold text-gray-400">Auto-generated like dsok1048</p>}
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input-field" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Email</label>
          <input type="email" className="input-field" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Role</label>
          <select className="select-field" value={form.role} onChange={(e) => set('role', e.target.value)}>
            {roleOptions.map((r) => <option key={r.name} value={r.name}>{r.display_name}</option>)}
          </select>
        </div>
        {!isEdit && (
          <>
            <div>
              <label className="label">Password *</label>
              <input type="password" className="input-field" value={form.password} onChange={(e) => set('password', e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <input type="password" className="input-field" value={form.confirm_password} onChange={(e) => set('confirm_password', e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(form)} className="btn-primary flex-1 justify-center">
          {isEdit ? 'Update User' : 'Create User'}
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  )
}

export default function Users() {
  const queryClient = useQueryClient()
  const [confirm, ConfirmDialog] = useConfirm()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [profileUser, setProfileUser] = useState(null)

  const { data: rolesData = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.roles.list().then((r) => r.data),
    staleTime: Infinity,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => authApi.users.list({ search, role: roleFilter || undefined, page_size: 30 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: authApi.users.create,
    onSuccess: () => { queryClient.invalidateQueries(['users']); closeUserModal(); toast.success('User created!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to create user')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.users.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['users']); closeUserModal(); toast.success('User updated!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to update user')),
  })

  const toggleMutation = useMutation({
    mutationFn: authApi.users.toggleActive,
    onSuccess: () => { queryClient.invalidateQueries(['users']); toast.success('Status toggled!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to update status')),
  })

  const deleteMutation = useMutation({
    mutationFn: authApi.users.delete,
    onSuccess: () => { queryClient.invalidateQueries(['users']); toast.success('User deleted!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to delete user')),
  })

  const closeUserModal = () => {
    setShowModal(false)
    setEditUser(null)
  }

  const handleSave = (form) => {
    if (editUser) {
      const { password, confirm_password, username, ...updateData } = form
      updateMutation.mutate({ id: editUser.id, data: updateData })
    } else {
      const { username, ...createData } = form
      createMutation.mutate(createData)
    }
  }

  const handleDelete = async (userToDelete) => {
    const ok = await confirm('Delete user?', `Delete ${userToDelete.full_name || userToDelete.username}? This action cannot be undone.`, {
      confirmText: 'Delete',
      icon: 'delete',
      danger: true,
    })
    if (ok) deleteMutation.mutate(userToDelete.id)
  }

  const users = data?.results || []

  const getRoleConfig = (role) => {
    const found = rolesData.find((r) => r.name === role)
    return { label: found?.display_name ?? role, color: ROLE_COLORS[role] ?? 'default' }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Users"
        subtitle={`${data?.count || 0} users`}
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
        actions={
          <button onClick={() => { setEditUser(null); setShowModal(true) }} className="btn-primary">
            <Plus size={16} /> Add User
          </button>
        }
      />

      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search users...">
            <select className="select-field w-36" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {rolesData.map((r) => <option key={r.name} value={r.name}>{r.display_name}</option>)}
            </select>
          </SearchFilter>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th className="w-16">No</Th>
              <Th>User</Th>
              <Th>Email</Th>
              <Th>Username</Th>
              <Th>Role</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={9} />}
            {!isLoading && users.map((u, index) => {
              const roleConf = getRoleConfig(u.role)
              return (
                <Tr key={u.id}>
                  <Td className="font-semibold text-gray-500">{index + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} />
                      <div>
                        <p className="font-medium text-sm text-gray-900">{u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-sm">{u.email || '-'}</span></Td>
                  <Td><span className="font-mono text-sm">@{u.username}</span></Td>
                  <Td><Badge variant={roleConf.color}>{roleConf.label}</Badge></Td>
                  <Td><span className="text-sm">{u.phone || '—'}</span></Td>
                  <Td>
                    <StatusSwitch
                      active={u.is_active}
                      disabled={toggleMutation.isPending}
                      onToggle={() => toggleMutation.mutate(u.id)}
                    />
                  </Td>
                  <Td><span className="text-xs text-gray-500">{formatDateTime(u.created_at)}</span></Td>
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => setProfileUser(u)}
                        className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-500 transition-colors" title="View profile">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => { setEditUser(u); setShowModal(true) }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDelete(u)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors disabled:opacity-50" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={9}><EmptyState message="No users found" icon={Shield} /></td></tr>
            )}
          </Tbody>
        </Table>
      </div>

      <UserProfileModal
        user={profileUser}
        roleConfig={profileUser ? getRoleConfig(profileUser.role) : { label: '', color: 'default' }}
        onClose={() => setProfileUser(null)}
      />

      <Modal isOpen={showModal} onClose={closeUserModal} title={editUser ? 'Edit User' : 'Add User'} size="md">
        <UserForm user={editUser} roles={rolesData} onSave={handleSave} onClose={closeUserModal} />
      </Modal>
      {ConfirmDialog}
    </div>
  )
}
