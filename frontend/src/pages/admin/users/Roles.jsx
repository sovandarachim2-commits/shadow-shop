import { useState, useCallback } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Shield, Loader2, Check, X, Plus, Trash2, CheckSquare, Square, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'

const MODULE_ORDER = ['dashboard', 'orders', 'products', 'inventory', 'delivery', 'finance', 'reports', 'users', 'settings', 'print', 'scanner', 'storefront']
const ACTION_ORDER = ['view', 'create', 'edit', 'delete', 'export', 'print']

// ─── Add Role Modal ───────────────────────────────────────────────────────────
function AddRoleModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => authApi.roles.create({ name: name.trim().toLowerCase().replace(/\s+/g, '_'), display_name: displayName.trim() }),
    onSuccess: (res) => {
      toast.success(`Role "${res.data.display_name}" created`)
      onCreated(res.data)
      onClose()
    },
    onError: (err) => {
      setError(err?.response?.data?.name?.[0] || err?.response?.data?.detail || 'Failed to create role')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) return setError('Display name is required')
    const slug = displayName.trim().toLowerCase().replace(/\s+/g, '_')
    if (!/^[a-z][a-z0-9_]{1,28}[a-z0-9]$/.test(slug) && slug.length < 2) return setError('Name too short')
    create()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Add New Role</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Display Name</label>
            <input
              autoFocus
              className="input-field"
              placeholder="e.g. Marketing Manager"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))
              }}
            />
          </div>
          <div>
            <label className="label">Role Key (auto-generated)</label>
            <input
              className="input-field bg-gray-100 text-gray-500"
              readOnly
              value={name || displayName.toLowerCase().replace(/\s+/g, '_')}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Roles() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [saving, setSaving] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const qc = useQueryClient()

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.roles.list().then((r) => r.data),
    onSuccess: (data) => { if (!selectedRole && data.length) setSelectedRole(data[0].name) },
  })

  // pick first role once loaded
  const activeRole = selectedRole ?? roles[0]?.name ?? null

  const { data: allPerms = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => authApi.permissions.list().then((r) => r.data),
    staleTime: Infinity,
  })

  const { data: rolePerms = [], isLoading: loadingRole } = useQuery({
    queryKey: ['role-perms', activeRole],
    queryFn: () => authApi.rolePermissions(activeRole).then((r) => r.data),
    enabled: !!activeRole,
  })

  const { mutate: deleteRole } = useMutation({
    mutationFn: (id) => authApi.roles.delete(id),
    onSuccess: (_, id) => {
      const deleted = roles.find((r) => r.id === id)
      if (deleted && activeRole === deleted.name) setSelectedRole(roles.find((r) => r.id !== id)?.name ?? null)
      qc.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role deleted')
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Cannot delete role'),
  })

  // map `module_action` → granted RolePermission id
  const grantedMap = {}
  rolePerms.forEach((rp) => {
    const k = `${rp.permission_detail?.module}_${rp.permission_detail?.action}`
    grantedMap[k] = rp.id
  })

  // map `module_action` → Permission id
  const permIdMap = {}
  allPerms.forEach((p) => { permIdMap[`${p.module}_${p.action}`] = p.id })

  const modules = MODULE_ORDER.filter((m) => allPerms.some((p) => p.module === m))
  const actions = ACTION_ORDER.filter((a) => allPerms.some((p) => p.action === a))

  const toggle = useCallback(async (module, action) => {
    const key = `${module}_${action}`
    if (saving[key]) return
    const permId = permIdMap[key]
    if (!permId) return
    const grantedId = grantedMap[key]

    setSaving((s) => ({ ...s, [key]: true }))
    try {
      if (grantedId) {
        await authApi.rolePermissionDelete(grantedId)
      } else {
        await authApi.rolePermissionGrant({ role: activeRole, permission: permId, granted: true })
      }
      await qc.invalidateQueries({ queryKey: ['role-perms', activeRole] })
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update permission')
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }, [saving, grantedMap, permIdMap, activeRole, qc])

  const [bulkPending, setBulkPending] = useState(false)

  const resetDefaults = async () => {
    setBulkPending(true)
    try {
      await authApi.rolePermissionResetDefaults(activeRole)
      await qc.invalidateQueries({ queryKey: ['role-perms', activeRole] })
      toast.success('Permissions reset to defaults')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reset defaults')
    } finally { setBulkPending(false) }
  }

  const grantAll = async () => {
    setBulkPending(true)
    try {
      const missing = allPerms.filter((p) => !grantedMap[`${p.module}_${p.action}`])
      await Promise.all(missing.map((p) => authApi.rolePermissionGrant({ role: activeRole, permission: p.id, granted: true })))
      await qc.invalidateQueries({ queryKey: ['role-perms', activeRole] })
      toast.success('All permissions granted')
    } catch { toast.error('Failed to grant all') } finally { setBulkPending(false) }
  }

  const revokeAll = async () => {
    setBulkPending(true)
    try {
      await Promise.all(Object.values(grantedMap).map((id) => authApi.rolePermissionDelete(id)))
      await qc.invalidateQueries({ queryKey: ['role-perms', activeRole] })
      toast.success('All permissions revoked')
    } catch { toast.error('Failed to revoke all') } finally { setBulkPending(false) }
  }

  const isLoading = loadingPerms || loadingRole || loadingRoles

  return (
    <div>
      {showAddModal && (
        <AddRoleModal
          onClose={() => setShowAddModal(false)}
          onCreated={(role) => {
            qc.invalidateQueries({ queryKey: ['roles'] })
            setSelectedRole(role.name)
          }}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Roles &amp; Permissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Click a cell to grant or revoke a permission</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus size={16} /> Add Role
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative">
          <Shield size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
          <select
            className="select-field w-56 pl-9 font-medium"
            value={activeRole ?? ''}
            onChange={(e) => setSelectedRole(e.target.value)}
            disabled={loadingRoles}
          >
            {roles.map((r) => (
              <option key={r.name} value={r.name}>{r.display_name}</option>
            ))}
          </select>
        </div>
        {activeRole && (
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={resetDefaults}
              disabled={bulkPending}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              {bulkPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={13} />}
              Reset to Default
            </button>
            <button
              onClick={grantAll}
              disabled={bulkPending || !activeRole}
              className="flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
            >
              {bulkPending ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={13} />}
              Grant All
            </button>
            <button
              onClick={revokeAll}
              disabled={bulkPending || !activeRole}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {bulkPending ? <Loader2 size={12} className="animate-spin" /> : <Square size={13} />}
              Revoke All
            </button>
          </div>
        )}
        {activeRole && !roles.find((r) => r.name === activeRole)?.is_system && (
          <button
            onClick={() => deleteRole(roles.find((r) => r.name === activeRole)?.id)}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
          >
            <Trash2 size={13} /> Delete Role
          </button>
        )}
      </div>

      <div className="form-card mt-4 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-gray-500 font-medium w-32">Module</th>
                {actions.map((a) => (
                  <th key={a} className="text-center py-3 px-3 text-gray-500 font-medium capitalize min-w-[60px]">{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <tr key={mod} className="data-table-row">
                  <td className="py-3 px-4 font-medium text-gray-900 capitalize">
                    {mod === 'storefront' ? 'Store Visit' : mod.replace('_', ' ')}
                  </td>
                  {actions.map((act) => {
                    const key = `${mod}_${act}`
                    const granted = !!grantedMap[key]
                    const isSaving = !!saving[key]
                    return (
                      <td key={act} className="py-2 px-3 text-center">
                        {isSaving ? (
                          <Loader2 size={14} className="mx-auto text-purple-400 animate-spin" />
                        ) : (
                          <button
                            onClick={() => toggle(mod, act)}
                            className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                              granted
                                ? 'bg-green-100 text-green-600 hover:bg-red-50 hover:text-red-400'
                                : 'bg-gray-100 text-gray-300 hover:bg-green-50 hover:text-green-500'
                            }`}
                            title={granted ? 'Granted — click to revoke' : 'Not granted — click to grant'}
                          >
                            {granted ? <Check size={13} /> : <X size={13} />}
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
