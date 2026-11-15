import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Shield, Eye, EyeOff, Trash2, Loader2, KeyRound, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { authApi } from '@/api/auth'
import { storesApi } from '@/api/stores'
import useAuthStore from '@/store/authStore'
import { formatDateTime } from '@/utils/helpers'

const ROLE_COLORS = {
  super_admin: 'danger', admin: 'primary',
  store_owner: 'purple', store_manager: 'info', seller: 'info',
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

function UserProfileModal({ user, roleConfig, isStorePartner, onClose }) {
  if (!user) return null

  const rows = [
    ['Full Name', user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username],
    ['Username', `@${user.username}`],
    ['Email', user.email || '-'],
    ['Phone', user.phone || '-'],
    ...(isStorePartner ? [] : [
      ['Telegram ID', user.telegram_id || '-'],
      ['Telegram Username', user.telegram_username ? `@${user.telegram_username}` : '-'],
      ['Telegram Login', user.telegram_auth_date ? formatDateTime(user.telegram_auth_date) : '-'],
    ]),
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
            <div key={label} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-3 text-sm">
              <span className="font-semibold text-gray-500">{label}</span>
              <span className="min-w-0 break-words text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function UserForm({ user, roles, stores, isStorePartner, assignedStore, onSave, onClose, isSaving }) {
  const initialStore = user
    ? (user.store_id || user.assigned_stores?.[0]?.store_id || '')
    : (isStorePartner && assignedStore ? assignedStore.store_id : '')

  const [isCustomUsername, setIsCustomUsername] = useState(Boolean(user?.username))
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    username: user?.username || (user ? '' : generatedUsernamePreview('', '')),
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || (roles[0]?.name ?? 'seller'),
    store: initialStore,
    password: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = !!user

  const handleFirstNameChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, first_name: val }
      if (!isEdit && !isCustomUsername) {
        next.username = generatedUsernamePreview(val, prev.last_name)
      }
      return next
    })
  }

  const handleLastNameChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, last_name: val }
      if (!isEdit && !isCustomUsername) {
        next.username = generatedUsernamePreview(prev.first_name, val)
      }
      return next
    })
  }

  const handleUsernameChange = (val) => {
    setIsCustomUsername(true)
    set('username', val.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))
  }

  const handleAutoGenerateUsername = () => {
    setIsCustomUsername(false)
    const auto = generatedUsernamePreview(form.first_name, form.last_name)
    set('username', auto)
  }

  const availableRoles = useMemo(() => {
    if (isStorePartner) {
      return (roles || []).filter((r) => !['super_admin', 'admin', 'customer', 'store_owner'].includes(r.name))
    }
    return roles || []
  }, [roles, isStorePartner])
  const hasCurrentRole = availableRoles.some((r) => r.name === form.role)
  const roleOptions = hasCurrentRole
    ? availableRoles
    : (form.role ? [{ name: form.role, display_name: form.role || 'Current Role' }, ...availableRoles] : availableRoles)

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">First Name</label>
          <input className="input-field" value={form.first_name} onChange={(e) => handleFirstNameChange(e.target.value)} />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input className="input-field" value={form.last_name} onChange={(e) => handleLastNameChange(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Username</label>
            {!isEdit && (
              <button
                type="button"
                onClick={handleAutoGenerateUsername}
                className="text-[11px] font-bold text-pink-600 hover:text-pink-700"
              >
                Auto Generate
              </button>
            )}
          </div>
          <input
            className="input-field font-mono"
            value={form.username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder={generatedUsernamePreview(form.first_name, form.last_name)}
          />
          <p className="mt-1 text-xs text-gray-400">
            {isEdit
              ? 'Username for this account'
              : 'Can be edited or left as auto-generated'}
          </p>
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
        {form.role !== 'customer' && (
          <div className="col-span-2">
            <label className="label flex items-center justify-between">
              <span>Store / Partner</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isStorePartner && assignedStore
                  ? 'text-blue-700 bg-blue-50 border border-blue-200'
                  : 'text-purple-600 bg-purple-50'
              }`}>
                {isStorePartner && assignedStore ? 'Auto-Assigned' : 'Default: Official Store'}
              </span>
            </label>
            {isStorePartner && assignedStore ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 px-3.5 py-2.5">
                <span className="text-lg">🏪</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{assignedStore.store_name}</p>
                  <p className="text-xs text-blue-700 font-semibold">{assignedStore.store_code || assignedStore.store_slug || 'Partner Store'}</p>
                </div>
                <span className="text-[11px] font-medium text-gray-500 bg-white/80 px-2 py-0.5 rounded border border-blue-100">
                  Your Store
                </span>
              </div>
            ) : (
              <select
                className="select-field"
                value={form.store || ''}
                onChange={(e) => set('store', e.target.value)}
              >
                <option value="">🏢 Shadow Shop (Official Website Store)</option>
                {(stores || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    🏪 {s.name} ({s.code || s.slug || 'Store'})
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-400">
              {isStorePartner
                ? 'Staff user will be assigned to your store.'
                : 'Select the store this staff user belongs to, or leave as Official Store.'}
            </p>
          </div>
        )}
        {!isEdit && (
          <>
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={form.confirm_password}
                  onChange={(e) => set('confirm_password', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      {isEdit && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound size={17} className="text-amber-600" />
              <p className="font-bold text-gray-900">Change Password</p>
            </div>
            <span className="text-[11px] font-medium text-gray-500">Leave blank to keep unchanged</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="New password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="Confirm password"
                value={form.confirm_password}
                onChange={(e) => set('confirm_password', e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="btn-secondary min-w-[100px] justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={isSaving}
          className="btn-primary min-w-[130px] justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          {isSaving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </button>
      </div>
    </div>
  )
}

export default function Users() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const isStorePartner = ['store_owner', 'store_manager'].includes(currentUser?.role)
  const assignedStore = Array.isArray(currentUser?.assigned_stores) && currentUser.assigned_stores.length > 0
    ? currentUser.assigned_stores[0]
    : null

  const [confirm, ConfirmDialog] = useConfirm()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [profileUser, setProfileUser] = useState(null)

  const { data: rolesData = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.roles.list().then((r) => r.data),
  })

  const { data: storesData } = useQuery({
    queryKey: ['stores-list'],
    queryFn: () => storesApi.admin.listStores({ page_size: 200 }).then((r) => r.data?.results || r.data || []),
    enabled: !isStorePartner,
  })
  const storesList = Array.isArray(storesData) ? storesData : (storesData?.results || [])

  const { data: storeCountsData } = useQuery({
    queryKey: ['users-store-counts'],
    queryFn: () => authApi.users.storeCounts().then((r) => r.data),
    enabled: !isStorePartner,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter, storeFilter],
    queryFn: () => authApi.users.list({
      search,
      role: roleFilter || undefined,
      store: storeFilter || undefined,
      page_size: 30,
    }).then((r) => r.data),
  })

  const invalidateUserQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['roles'] })
    queryClient.invalidateQueries({ queryKey: ['users-store-counts'] })
  }

  const createMutation = useMutation({
    mutationFn: authApi.users.create,
    onSuccess: () => { invalidateUserQueries(); closeUserModal(); toast.success('User created!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to create user')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => authApi.users.update(id, data),
    onSuccess: () => { invalidateUserQueries(); closeUserModal(); toast.success('User updated!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to update user')),
  })

  const toggleMutation = useMutation({
    mutationFn: authApi.users.toggleActive,
    onSuccess: () => { invalidateUserQueries(); toast.success('Status toggled!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to update status')),
  })

  const deleteMutation = useMutation({
    mutationFn: authApi.users.delete,
    onSuccess: () => { invalidateUserQueries(); toast.success('User deleted!') },
    onError: (e) => toast.error(getApiError(e, 'Failed to delete user')),
  })

  const closeUserModal = () => {
    setShowModal(false)
    setEditUser(null)
  }

  const handleSave = (form) => {
    const finalStore = isStorePartner && assignedStore ? assignedStore.store_id : (form.store || null)
    if (editUser) {
      if (form.password) {
        if (form.password.length < 6) {
          toast.error('Password must be at least 6 characters.')
          return
        }
        if (form.password !== form.confirm_password) {
          toast.error('Passwords do not match.')
          return
        }
      }
      const { confirm_password, ...updateData } = form
      const payload = { ...updateData, store: finalStore }
      if (!payload.password) {
        delete payload.password
      }
      updateMutation.mutate({ id: editUser.id, data: payload })
    } else {
      if (!form.password) {
        toast.error('Password is required.')
        return
      }
      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters.')
        return
      }
      if (form.password !== form.confirm_password) {
        toast.error('Passwords do not match.')
        return
      }
      const finalUsername = (form.username || '').trim() || generatedUsernamePreview(form.first_name, form.last_name)
      createMutation.mutate({
        ...form,
        username: finalUsername,
        store: finalStore,
      })
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
  const totalUsersCount = (rolesData || []).reduce((sum, r) => sum + (Number(r.user_count) || 0), 0)

  const getRoleConfig = (role) => {
    const found = rolesData.find((r) => r.name === role)
    const label = found?.display_name ?? (
      role === 'store_owner' ? 'Store Owner' :
      role === 'store_manager' ? 'Store Manager' :
      role
    )
    return { label, color: ROLE_COLORS[role] ?? 'default' }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={isStorePartner ? 'Store Staff' : 'Users'}
        subtitle={`${data?.count || 0} ${isStorePartner ? 'staff members' : 'users'}`}
        breadcrumbs={[{ label: 'Administration' }, { label: isStorePartner ? 'Store Staff' : 'Users' }]}
        actions={
          <button onClick={() => { setEditUser(null); setShowModal(true) }} className="btn-primary">
            <Plus size={16} /> {isStorePartner ? 'Add Staff' : 'Add User'}
          </button>
        }
      />

      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isStorePartner ? 'Search staff...' : 'Search users...'}
                className="input-field pl-9 w-full"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            <select className="select-field w-52 shrink-0" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">{isStorePartner ? 'All Staff Roles' : 'All Roles'} ({totalUsersCount})</option>
              {rolesData.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.display_name} ({r.user_count ?? 0})
                </option>
              ))}
            </select>

            {!isStorePartner && (
              <select className="select-field w-56 shrink-0" value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
                <option value="">All Stores ({storeCountsData?.total ?? totalUsersCount})</option>
                <option value="direct">🏢 Official Store ({storeCountsData?.official ?? 0})</option>
                {storesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏪 {s.name} ({storeCountsData?.stores?.[s.id] ?? s.staff_count ?? 0})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th className="w-16">No</Th>
              <Th>User</Th>
              <Th>Store</Th>
              <Th>Role</Th>
              <Th>Email</Th>
              <Th>Username</Th>
              <Th>Phone</Th>
              {!isStorePartner && <Th>Telegram</Th>}
              {!isStorePartner && <Th>Telegram Subscribe</Th>}
              <Th>Status</Th>
              <Th>Joined</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={isStorePartner ? 10 : 12} />}
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
                  <Td>
                    {Array.isArray(u.assigned_stores) && u.assigned_stores.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 whitespace-nowrap">
                        🏪 {u.assigned_stores[0].store_name}
                      </span>
                    ) : u.role === 'customer' ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 whitespace-nowrap">
                        🏢 Official Store
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Badge variant={roleConf.color}>{roleConf.label}</Badge>
                  </Td>
                  <Td><span className="text-sm">{u.email || '-'}</span></Td>
                  <Td><span className="font-mono text-sm">@{u.username}</span></Td>
                  <Td><span className="text-sm">{u.phone || '—'}</span></Td>
                  {!isStorePartner && (
                    <Td>
                      <div className="min-w-[120px] text-sm">
                        <p>{u.telegram_username ? `@${u.telegram_username}` : '-'}</p>
                        {u.telegram_id && <p className="mt-1 font-mono text-xs text-gray-500">ID: {u.telegram_id}</p>}
                      </div>
                    </Td>
                  )}
                  {!isStorePartner && (
                    <Td>
                      {!u.telegram_id ? (
                        <Badge variant="default">Not Connected</Badge>
                      ) : u.telegram_notifications_enabled ? (
                        <Badge variant="success">Subscribed</Badge>
                      ) : (
                        <Badge variant="warning">Paused</Badge>
                      )}
                    </Td>
                  )}
                  <Td>
                    {u.role === 'store_owner' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <StatusSwitch
                        active={u.is_active}
                        disabled={toggleMutation.isPending}
                        onToggle={() => toggleMutation.mutate(u.id)}
                      />
                    )}
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
              <tr><td colSpan={isStorePartner ? 10 : 12}><EmptyState message="No users found" icon={Shield} /></td></tr>
            )}
          </Tbody>
        </Table>
      </div>

      <UserProfileModal
        user={profileUser}
        roleConfig={profileUser ? getRoleConfig(profileUser.role) : { label: '', color: 'default' }}
        isStorePartner={isStorePartner}
        onClose={() => setProfileUser(null)}
      />

      <Modal isOpen={showModal} onClose={closeUserModal} title={editUser ? (isStorePartner ? 'Edit Staff' : 'Edit User') : (isStorePartner ? 'Add Staff' : 'Add User')} size="md">
        <UserForm
          user={editUser}
          roles={rolesData}
          stores={storesList}
          isStorePartner={isStorePartner}
          assignedStore={assignedStore}
          onSave={handleSave}
          onClose={closeUserModal}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
      {ConfirmDialog}
    </div>
  )
}
