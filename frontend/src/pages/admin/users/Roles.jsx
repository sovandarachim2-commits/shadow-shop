import { Fragment, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Shield, Loader2, Plus, Trash2, CheckSquare, Square, RotateCcw, Save, Pencil, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'

const PAGE_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', module: 'dashboard' },
  { key: 'stores', label: 'Stores & Partners', module: 'stores' },
  {
    key: 'sales',
    label: 'Sales',
    children: [
      { module: 'orders', label: 'Orders' },
      { module: 'customers', label: 'Customers' },
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
    key: 'marketing',
    label: 'Marketing',
    children: [
      { module: 'marketing_promotions', label: 'Brand Promotions' },
      { module: 'marketing_announcements', label: 'Announcement Bar' },
      { module: 'marketing_posters', label: 'Poster Management' },
      { module: 'marketing_videos', label: 'Video Highlights' },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    children: [
      { module: 'inventory', label: 'Stock Dashboard' },
      { module: 'inventory_movements', label: 'Stock Movement' },
      { module: 'inventory_storage', label: 'Inventory Storage' },
      { module: 'inventory_transfers', label: 'Stock Transfers' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    children: [
      { module: 'print', label: 'Print Center' },
      { module: 'print_history', label: 'Print History' },
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
      { module: 'finance_expenses', label: 'Expenses' },
      { module: 'finance_profit', label: 'Profit Report' },
    ],
  },
  {
    key: 'rewards',
    label: 'Rewards',
    children: [
      { module: 'rewards_settings', label: 'Earning & Tiers' },
      { module: 'rewards', label: 'Overview' },
      { module: 'rewards_products', label: 'Reward Products' },
      { module: 'rewards_coupons', label: 'Promo Codes' },
      { module: 'rewards_exchanges', label: 'Redeem Requests' },
      { module: 'rewards_transactions', label: 'Point Transactions' },
      { module: 'rewards_points', label: 'Customer Points' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    children: [
      { module: 'reports', label: 'Sales Report' },
      { module: 'reports_products', label: 'Product Report' },
      { module: 'reports_inventory', label: 'Inventory Report' },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    children: [
      { module: 'users', label: 'Users' },
      { module: 'users_roles', label: 'Roles & Permissions' },
      { module: 'users_activity', label: 'Activity Logs' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    children: [
      { module: 'settings', label: 'General Settings' },
      { module: 'settings_telegram', label: 'Telegram Settings' },
      { module: 'settings_delivery', label: 'Delivery Settings' },
      { module: 'settings_payment', label: 'Payment Methods' },
      { module: 'settings_print_logo', label: 'Print Logo' },
      { module: 'settings_login_logo', label: 'Login Logo' },
      { module: 'settings_customer_footer', label: 'Customer Footer' },
      { module: 'settings_about', label: 'About Us' },
    ],
  },
  { key: 'storefront', label: 'Store Visit', module: 'storefront' },
]

export const STORE_OWNER_ALLOWED_MODULES = new Set([
  'dashboard',
  'orders', 'customers',
  'products', 'product_brands', 'product_categories', 'product_sets', 'product_flash_sale', 'product_banners',
  'marketing_promotions', 'marketing_announcements', 'marketing_posters', 'marketing_videos',
  'inventory', 'inventory_movements', 'inventory_storage', 'inventory_transfers',
  'print', 'print_history', 'scanner', 'delivery',
  'scanner_delivery_config',
  'finance', 'finance_expenses', 'finance_profit',
  'reports', 'reports_products', 'reports_inventory',
  'users', 'users_roles',
])

const ACTION_ORDER = ['view', 'create', 'edit', 'delete']
const slugifyRoleKey = (value) => value.trim().toLowerCase().replace(/[^a-z0-9_\s-]/g, '').replace(/[\s-]+/g, '_').slice(0, 20)

// ─── Add Role Modal ───────────────────────────────────────────────────────────
function AddRoleModal({ isStoreOwner, onClose, onCreated }) {
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
    if (isStoreOwner && ['super_admin', 'admin', 'customer', 'store_owner'].includes(slug)) {
      return setError('Cannot use this reserved role name')
    }
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
  const { user: currentUser } = useAuthStore()
  const isStoreOwner = currentUser?.role === 'store_owner'
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
    onSuccess: (data) => {
      if (!selectedRole && data.length) {
        const first = isStoreOwner
          ? data.find((r) => !['super_admin', 'admin', 'customer', 'store_owner'].includes(r.name))?.name
          : data[0].name
        if (first) setSelectedRole(first)
      }
    },
  })

  const filteredRoles = useMemo(() => {
    if (isStoreOwner) {
      return (roles || []).filter((r) => !['super_admin', 'admin', 'customer', 'store_owner'].includes(r.name))
    }
    return roles || []
  }, [roles, isStoreOwner])

  // pick first role once loaded
  const activeRole = selectedRole ?? filteredRoles[0]?.name ?? null
  const activeRoleRecord = filteredRoles.find((r) => r.name === activeRole) || null

  const { data: allPerms = [], isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => authApi.permissions.list().then((r) => r.data),
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
      if (isStoreOwner) {
        const isGroupAllowed = group.module && STORE_OWNER_ALLOWED_MODULES.has(group.module)
        const hasAllowedChild = (group.children || []).some((c) => STORE_OWNER_ALLOWED_MODULES.has(c.module))
        if (!isGroupAllowed && !hasAllowedChild) return null
      }
      const children = (group.children || []).filter((child) => {
        if (isStoreOwner && !STORE_OWNER_ALLOWED_MODULES.has(child.module)) return false
        return moduleSet.has(child.module)
      })
      const hasParent = group.module && moduleSet.has(group.module) && (!isStoreOwner || STORE_OWNER_ALLOWED_MODULES.has(group.module))
      if (!hasParent && children.length === 0) return null
      return { ...group, children }
    }).filter(Boolean)
  ), [moduleSet, isStoreOwner])

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
      await qc.invalidateQueries({ queryKey: ['role-perms'] })
      window.dispatchEvent(new Event('role-permissions-updated'))
      try {
        localStorage.setItem('role_perms_updated_at', String(Date.now()))
      } catch (_) {}
      toast.success('Permissions reset to defaults')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reset defaults')
    } finally { setBulkPending(false) }
  }

  const grantAll = async () => {
    const next = {}
    allPerms.forEach((p) => {
      if (!isStoreOwner || STORE_OWNER_ALLOWED_MODULES.has(p.module)) {
        next[`${p.module}_${p.action}`] = true
      }
    })
    setDraftGrants((curr) => ({ ...curr, ...next }))
  }

  const revokeAll = async () => {
    if (!isStoreOwner) {
      setDraftGrants({})
      return
    }
    setDraftGrants((curr) => {
      const next = { ...curr }
      allPerms.forEach((p) => {
        if (STORE_OWNER_ALLOWED_MODULES.has(p.module)) {
          delete next[`${p.module}_${p.action}`]
        }
      })
      return next
    })
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
      await qc.invalidateQueries({ queryKey: ['role-perms'] })
      window.dispatchEvent(new Event('role-permissions-updated'))
      try {
        localStorage.setItem('role_perms_updated_at', String(Date.now()))
      } catch (_) {}
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
          isStoreOwner={isStoreOwner}
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
          <h1 className="text-2xl font-bold text-navy-900">
            {isStoreOwner ? 'Store Roles & Permissions' : 'Roles & Permissions'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isStoreOwner
              ? 'Configure role permissions for your store staff (displaying your store menus only)'
              : 'Click permissions, then press Save to apply changes'}
          </p>
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
            <Plus size={16} /> {isStoreOwner ? 'Create Staff Role' : 'Add Role'}
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
            {filteredRoles.map((r) => (
              <option key={r.name} value={r.name}>
                {r.display_name} {r.user_count !== undefined ? `(${r.user_count})` : ''}
              </option>
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
        {activeRoleRecord && (!isStoreOwner || !activeRoleRecord.is_system) && (
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

            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
