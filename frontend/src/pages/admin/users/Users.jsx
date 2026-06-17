import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Shield, UserCheck, UserX, Key } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { authApi } from '@/api/auth'
import { formatDateTime } from '@/utils/helpers'

const ROLE_COLORS = {
  super_admin: 'danger', admin: 'primary', seller: 'info',
  cashier: 'success', warehouse: 'warning', scanner: 'default',
  delivery: 'orange', customer: 'pink',
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
          <label className="label">Username *</label>
          <input className="input-field" value={form.username} onChange={(e) => set('username', e.target.value)} disabled={isEdit} />
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
            {roles.filter((r) => r.name !== 'customer').map((r) => <option key={r.name} value={r.name}>{r.display_name}</option>)}
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
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)

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
    onSuccess: () => { queryClient.invalidateQueries(['users']); setShowModal(false); toast.success('User created!') },
    onError: (e) => toast.error(e.response?.data?.username?.[0] || 'Failed to create user'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.users.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['users']); setShowModal(false); toast.success('User updated!') },
    onError: () => toast.error('Failed to update user'),
  })

  const toggleMutation = useMutation({
    mutationFn: authApi.users.toggleActive,
    onSuccess: () => { queryClient.invalidateQueries(['users']); toast.success('Status toggled!') },
  })

  const handleSave = (form) => {
    if (editUser) {
      const { password, confirm_password, username, ...updateData } = form
      updateMutation.mutate({ id: editUser.id, data: updateData })
    } else {
      createMutation.mutate(form)
    }
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
              <Th>User</Th>
              <Th>Username</Th>
              <Th>Role</Th>
              <Th>Phone</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={7} />}
            {!isLoading && users.map((u) => {
              const roleConf = getRoleConfig(u.role)
              return (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">
                          {(u.first_name || u.username)[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="font-mono text-sm">@{u.username}</span></Td>
                  <Td><Badge variant={roleConf.color}>{roleConf.label}</Badge></Td>
                  <Td><span className="text-sm">{u.phone || '—'}</span></Td>
                  <Td><Badge variant={u.is_active ? 'success' : 'default'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td><span className="text-xs text-gray-500">{formatDateTime(u.created_at)}</span></Td>
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditUser(u); setShowModal(true) }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => toggleMutation.mutate(u.id)}
                        className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`}
                        title={u.is_active ? 'Deactivate' : 'Activate'}>
                        {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
            {!isLoading && users.length === 0 && (
              <tr><td colSpan={7}><EmptyState message="No users found" icon={Shield} /></td></tr>
            )}
          </Tbody>
        </Table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User' : 'Add User'} size="md">
        <UserForm user={editUser} roles={rolesData} onSave={handleSave} onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
