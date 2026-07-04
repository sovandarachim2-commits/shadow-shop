import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Shield, Loader2, Plus, Trash2, CheckSquare, Square, RotateCcw, Save, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'

const PAGE_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', module: 'dashboard' },
  {
    key: 'sales',
    label: 'Sales',
    children: [
      { module: 'orders', label: 'Orders' },
      { module: 'orders', label: 'Customers' },
    ],
  },
  {
    key: 'products',
    label: 'Products',
    children: [
      { module: 'products', label: 'Products' },
      { module: 'product_brands', label: 'Brands' },
      { module: 'product_categories', label: 'Main Category Menu' },
      { module: 'product_sets', label: 'Product Sets' },
      { module: 'product_flash_sale', label: 'Flash Sale' },
      { module: 'product_banners', label: 'Banners' },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    children: [
      { module: 'inventory', label: 'Stock Dashboard' },
      { module: 'inventory', label: 'Stock Movement' },
      { module: 'inventory', label: 'Stock Transfers' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    children: [
      { module: 'print', label: 'Print Center' },
      { module: 'print', label: 'Print History' },
      { module: 'scanner', label: 'Scanner' },
      { module: 'delivery', label: 'Delivery' },
    ],
  },
  {
    key: 'scanner_config',
    label: 'Scanner Config',
    children: [
      { module: 'scanner_delivery_config', label: 'Delivery By Config' },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    children: [
      { module: 'finance', label: 'Revenue' },
      { module: 'finance', label: 'Expenses' },
      { module: 'finance', label: 'Profit Report' },
    ],
  },
  {
    key: 'rewards',
    label: 'Rewards',
    children: [
      { module: 'rewards', label: 'Overview' },
      { module: 'rewards', label: 'Rewards' },
      { module: 'rewards', label: 'Redeem Requests' },
      { module: 'rewards', label: 'Earning & Tiers' },
      { module: 'rewards', label: 'Point Transactions' },
      { module: 'rewards', label: 'Customer Points' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    children: [
      { module: 'reports', label: 'Sales Report' },
      { module: 'reports', label: 'Product Report' },
      { module: 'reports', label: 'Inventory Report' },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    children: [
      { module: 'users', label: 'Users' },
      { module: 'users', label: 'Roles & Permissions' },
      { module: 'users', label: 'Activity Logs' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    children: [
      { module: 'settings', label: 'General Settings' },
      { module: 'settings', label: 'Telegram Settings' },
      { module: 'settings', label: 'Delivery Settings' },
      { module: 'settings', label: 'Payment Methods' },
      { module: 'settings', label: 'Print Logo' },
    ],
  },
  { key: 'storefront', label: 'Store Visit', module: 'storefront' },
]
const ACTION_ORDER = ['view', 'create', 'edit', 'delete']
const slugifyRoleKey = (value) => value.trim().toLowerCase().replace(/[^a-z0-9_\s-]/g, '').replace(/[\s-]+/g, '_').slice(0, 20)

// ─── Add Role Modal ───────────────────────────────────────────────────────────
function AddRoleModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => authApi.roles.create({ name: slugifyRoleKey(name || displayName), display_name: displayName.trim() }),
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
    const slug = slugifyRoleKey(name || displayName)
    if (!/^[a-z][a-z0-9_]{1,18}[a-z0-9]$/.test(slug)) return setError('Role key must be 3-20 characters and start with a letter')
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
                setName(slugifyRoleKey(e.target.value))
              }}
            />
          </div>
          <div>
            <label className="label">Role Key (auto-generated)</label>
            <input
              className="input-field bg-gray-100 text-gray-500"
              readOnly
              value={name || slugifyRoleKey(displayName)}
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

function EditRoleModal({ role, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(role?.display_name || '')
  const [error, setError] = useState('')

  const { mutate: update, isPending } = useMutation({
    mutationFn: () => authApi.roles.update(role.id, { display_name: displayName.trim() }),
    onSuccess: (res) => {
      toast.success(`Role "${res.data.display_name}" updated`)
      onSaved(res.data)
      onClose()
    },
    onError: (err) => setError(err?.response?.data?.display_name?.[0] || err?.response?.data?.detail || 'Failed to update role'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) return setError('Display name is required')
    update()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Edit Role</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Display Name</label>
            <input autoFocus className="input-field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label">Role Key</label>
            <input className="input-field bg-gray-100 text-gray-500" readOnly value={role?.name || ''} />
            <p className="mt-1 text-xs font-semibold text-gray-400">Role key is locked to keep assigned users and permissions correct.</p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
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
  const [draftGrants, setDraftGrants] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRole, setEditRole] = useState(null)
  const [savePending, setSavePending] = useState(false)
  const [expandedPages, setExpandedPages] = useState({})
  const qc = useQueryClient()

  const { data: roles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => authApi.roles.list().then((r) => r.data),
    onSuccess: (data) => { if (!selectedRole && data.length) setSelectedRole(data[0].name) },
  })

  // pick first role once loaded
  const activeRole = selectedRole ?? roles[0]?.name ?? null
  const activeRoleRecord = roles.find((r) => r.name === activeRole) || null

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
  const grantedMap = useMemo(() => {
    const map = {}
    rolePerms.forEach((rp) => {
      const k = `${rp.permission_detail?.module}_${rp.permission_detail?.action}`
      map[k] = rp.id
    })
    return map
  }, [rolePerms])

  const serverGrantState = useMemo(() => {
    const state = {}
    rolePerms.forEach((rp) => {
      const k = `${rp.permission_detail?.module}_${rp.permission_detail?.action}`
      state[k] = true
    })
    return state
  }, [rolePerms])

  useEffect(() => {
    setDraftGrants(serverGrantState)
  }, [serverGrantState, activeRole])

  const dirtyKeys = useMemo(() => {
    const keys = new Set([...Object.keys(serverGrantState), ...Object.keys(draftGrants)])
    return [...keys].filter((key) => Boolean(serverGrantState[key]) !== Boolean(draftGrants[key]))
  }, [draftGrants, serverGrantState])

  const hasUnsavedChanges = dirtyKeys.length > 0

  // map `module_action` → Permission id
  const permIdMap = {}
  allPerms.forEach((p) => { permIdMap[`${p.module}_${p.action}`] = p.id })

  const actions = ACTION_ORDER.filter((a) => allPerms.some((p) => p.action === a))
  const moduleSet = useMemo(() => new Set(allPerms.map((p) => p.module)), [allPerms])
  const visibleGroups = useMemo(() => (
    PAGE_GROUPS.map((group) => {
      const children = (group.children || []).filter((child) => moduleSet.has(child.module))
      const hasParent = group.module && moduleSet.has(group.module)
      if (!hasParent && children.length === 0) return null
      return { ...group, children }
    }).filter(Boolean)
  ), [moduleSet])

  const toggle = (module, action) => {
    const key = `${module}_${action}`
    const permId = permIdMap[key]
    if (!permId) return
    setDraftGrants((current) => ({ ...current, [key]: !current[key] }))
  }

  const togglePage = (key) => {
    setExpandedPages((current) => ({ ...current, [key]: !current[key] }))
  }

  const renderPermissionCells = (module) => actions.map((act) => {
    const key = `${module}_${act}`
    const granted = !!draftGrants[key]
    const changed = Boolean(serverGrantState[key]) !== granted
    const isSaving = false
    return (
      <td key={act} className="py-2 px-3 text-center">
        {isSaving ? (
          <Loader2 size={14} className="mx-auto text-purple-400 animate-spin" />
        ) : (
          <button
            type="button"
            onClick={() => toggle(module, act)}
            disabled={savePending || !permIdMap[key]}
            aria-pressed={granted}
            className={`mx-auto inline-flex h-8 w-[72px] items-center rounded-full p-1 ring-2 transition-all disabled:opacity-40 ${
              granted
                ? 'justify-start bg-green-600 text-white hover:bg-green-700'
                : 'justify-end bg-gray-200 text-gray-500 hover:bg-gray-300'
            } ${changed ? 'ring-purple-300' : 'ring-transparent'}`}
            title={granted ? 'Granted - click to turn off' : 'Not granted - click to turn on'}
          >
            <span className={`px-1.5 text-[11px] font-black uppercase leading-none ${granted ? 'order-1' : 'order-2'}`}>
              {granted ? 'ON' : 'OFF'}
            </span>
            <span className={`h-6 w-6 rounded-full bg-white shadow transition ${granted ? 'order-2 ml-auto' : 'order-1 mr-auto'}`} />
          </button>
        )}
      </td>
    )
  })

  const getGroupPermissionStats = (group) => {
    const modules = new Set()
    if (group.module) modules.add(group.module)
    group.children.forEach((child) => modules.add(child.module))

    let enabled = 0
    let total = 0
    modules.forEach((module) => {
      actions.forEach((action) => {
        const key = `${module}_${action}`
        if (!permIdMap[key]) return
        total += 1
        if (draftGrants[key]) enabled += 1
      })
    })

    return { enabled, total }
  }

  const [bulkPending, setBulkPending] = useState(false)

  const resetDefaults = async () => {
    if (hasUnsavedChanges && !window.confirm('Discard unsaved changes and reset this role to defaults?')) return
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
    const next = {}
    allPerms.forEach((p) => { next[`${p.module}_${p.action}`] = true })
    setDraftGrants(next)
  }

  const revokeAll = async () => {
    setDraftGrants({})
  }

  const discardChanges = () => {
    setDraftGrants(serverGrantState)
  }

  const savePermissions = async () => {
    if (!activeRole || !hasUnsavedChanges) return
    setSavePending(true)
    try {
      const toGrant = dirtyKeys.filter((key) => draftGrants[key])
      const toRevoke = dirtyKeys.filter((key) => !draftGrants[key] && grantedMap[key])

      await Promise.all([
        ...toGrant.map((key) => authApi.rolePermissionGrant({
          role: activeRole,
          permission: permIdMap[key],
          granted: true,
        })),
        ...toRevoke.map((key) => authApi.rolePermissionDelete(grantedMap[key])),
      ])
      await qc.invalidateQueries({ queryKey: ['role-perms', activeRole] })
      toast.success('Permissions saved')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save permissions')
    } finally {
      setSavePending(false)
    }
  }

  const isLoading = loadingPerms || loadingRole || loadingRoles

  const handleDeleteRole = () => {
    if (!activeRoleRecord || activeRoleRecord.is_system) return
    if (!window.confirm(`Delete role "${activeRoleRecord.display_name}"? Users assigned to this role may need a new role.`)) return
    deleteRole(activeRoleRecord.id)
  }

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
      {editRole && (
        <EditRoleModal
          role={editRole}
          onClose={() => setEditRole(null)}
          onSaved={(role) => {
            qc.invalidateQueries({ queryKey: ['roles'] })
            setSelectedRole(role.name)
          }}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Roles &amp; Permissions</h1>
          <p className="text-gray-500 text-sm mt-0.5">Click permissions, then press Save to apply changes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={discardChanges}
            disabled={!hasUnsavedChanges || savePending}
            className="btn-secondary disabled:opacity-50"
          >
            <RotateCcw size={16} /> Discard
          </button>
          <button
            onClick={savePermissions}
            disabled={!hasUnsavedChanges || savePending}
            className="btn-primary disabled:opacity-50"
          >
            {savePending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save{hasUnsavedChanges ? ` (${dirtyKeys.length})` : ''}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={16} /> Add Role
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative">
          <Shield size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
          <select
            className="select-field w-56 pl-9 font-medium"
            value={activeRole ?? ''}
            onChange={(e) => {
              if (hasUnsavedChanges && !window.confirm('Switch role and discard unsaved changes?')) return
              setSelectedRole(e.target.value)
            }}
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
        {activeRoleRecord && (
          <button
            onClick={() => setEditRole(activeRoleRecord)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            <Pencil size={13} /> Edit Role
          </button>
        )}
        {activeRoleRecord && !activeRoleRecord.is_system && (
          <button
            onClick={handleDeleteRole}
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
                <th className="text-left py-3 px-4 text-gray-500 font-medium w-56">Page / Menu</th>
                {actions.map((a) => (
                  <th key={a} className="text-center py-3 px-3 text-gray-500 font-medium capitalize min-w-[60px]">{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map((group) => {
                const hasChildren = group.children.length > 0
                const isExpanded = !!expandedPages[group.key]
                const permissionStats = getGroupPermissionStats(group)

                return (
                  <Fragment key={group.key}>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <td className="py-3 px-4 font-black text-gray-950">
                        <button
                          type="button"
                          onClick={() => hasChildren && togglePage(group.key)}
                          className={`flex w-full items-center gap-2 text-left ${hasChildren ? 'hover:text-purple-700' : ''}`}
                        >
                          {hasChildren ? (
                            isExpanded ? (
                              <ChevronDown size={16} className="text-purple-500" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-400" />
                            )
                          ) : (
                            <span className="w-4" />
                          )}
                          <span className="min-w-0 flex-1">{group.label}</span>
                          {permissionStats.total > 0 && (
                            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-black ${
                              permissionStats.enabled > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              {permissionStats.enabled}/{permissionStats.total} ON
                            </span>
                          )}
                        </button>
                      </td>
                      {group.module ? renderPermissionCells(group.module) : (
                        <td colSpan={actions.length} className="px-4 py-3 text-xs font-semibold text-gray-400">
                          Tap page name to show menus
                        </td>
                      )}
                    </tr>
                    {hasChildren && isExpanded && group.children.map((child) => (
                      <tr key={`${group.key}-${child.label}`} className="data-table-row bg-white">
                        <td className="py-3 pl-11 pr-4 font-semibold text-gray-700">
                          {child.label}
                        </td>
                        {renderPermissionCells(child.module)}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
              {false && [].map((mod) => (
                <tr key={mod} className="data-table-row">
                  <td className="py-3 px-4 font-medium text-gray-900 capitalize">
                    {mod.replace('_', ' ')}
                  </td>
                  {actions.map((act) => {
                    const key = `${mod}_${act}`
                    const granted = !!draftGrants[key]
                    const changed = Boolean(serverGrantState[key]) !== granted
                    const isSaving = false
                    return (
                      <td key={act} className="py-2 px-3 text-center">
                        {isSaving ? (
                          <Loader2 size={14} className="mx-auto text-purple-400 animate-spin" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggle(mod, act)}
                            disabled={savePending}
                            aria-pressed={granted}
                            className={`mx-auto inline-flex h-8 w-[72px] items-center rounded-full p-1 ring-2 transition-all disabled:opacity-60 ${
                              granted
                                ? 'justify-start bg-green-600 text-white hover:bg-green-700'
                                : 'justify-end bg-gray-200 text-gray-500 hover:bg-gray-300'
                            } ${changed ? 'ring-purple-300' : 'ring-transparent'}`}
                            title={granted ? 'Granted — click to turn off' : 'Not granted — click to turn on'}
                          >
                            <span className={`px-1.5 text-[11px] font-black uppercase leading-none ${granted ? 'order-1' : 'order-2'}`}>
                              {granted ? 'ON' : 'OFF'}
                            </span>
                            <span className={`h-6 w-6 rounded-full bg-white shadow transition ${granted ? 'order-2 ml-auto' : 'order-1 mr-auto'}`} />
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
