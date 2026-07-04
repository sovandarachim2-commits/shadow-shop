import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/utils/helpers'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse, Printer,
  Scan, Truck, DollarSign, BarChart3, Users, Settings,
  ChevronDown, ChevronRight, LogOut, Store, FileText,
  TrendingUp, ArrowLeftRight, ScanLine, PackageCheck,
  UserCircle, Bell, Shield, Sliders, MessageCircle,
  MapPin, CreditCard, Tag, Boxes, Receipt,
  PieChart, Activity, ClipboardList, Award, Image, UserCheck,
  Flame, Gift, Ticket, SlidersHorizontal,
} from 'lucide-react'

// `module` maps to the Permission.module value — used to check `view` access
const navItems = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard,
    exact: true,
    module: 'dashboard',
  },
  {
    label: 'Sales',
    icon: ShoppingCart,
    children: [
      { label: 'Orders',     path: '/admin/orders',     icon: ClipboardList, module: 'orders' },
      { label: 'Customers',  path: '/admin/customers',  icon: Users,         module: 'orders' },
    ],
  },
  {
    label: 'Products',
    icon: Package,
    children: [
      { label: 'Products',          path: '/admin/products',            icon: Tag,          module: 'products' },
      { label: 'Brands',            path: '/admin/products/brands',     icon: Award,        module: 'product_brands' },
      { label: 'Main Category Menu',path: '/admin/products/categories', icon: Boxes,        module: 'product_categories' },
      { label: 'Product Sets',      path: '/admin/products/sets',       icon: PackageCheck, module: 'product_sets' },
      { label: 'Flash Sale',        path: '/admin/products/flash-sale', icon: Flame,        module: 'product_flash_sale' },
      { label: 'Banners',           path: '/admin/products/banners',    icon: Image,        module: 'product_banners' },
    ],
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    children: [
      { label: 'Stock Dashboard', path: '/admin/inventory',           icon: LayoutDashboard, module: 'inventory' },
      { label: 'Stock Movement',  path: '/admin/inventory/movements', icon: ArrowLeftRight,  module: 'inventory' },
      { label: 'Stock Transfers', path: '/admin/inventory/transfers', icon: Truck,           module: 'inventory' },
    ],
  },
  {
    label: 'Operations',
    icon: Printer,
    children: [
      { label: 'Print Center',  path: '/admin/print',         icon: Printer,  module: 'print'    },
      { label: 'Print History', path: '/admin/print/history', icon: FileText, module: 'print'    },
      { label: 'Scanner',       path: '/admin/scanner',       icon: ScanLine, module: 'scanner'  },
      { label: 'Delivery',      path: '/admin/delivery',      icon: Truck,    module: 'delivery' },
    ],
  },
  {
    label: 'Scanner Config',
    icon: UserCheck,
    children: [
      { label: 'Delivery By Config', path: '/admin/customer-scanner/delivery-config', icon: Settings, module: 'scanner_delivery_config' },
    ],
  },
  {
    label: 'Finance',
    icon: DollarSign,
    children: [
      { label: 'Revenue',      path: '/admin/finance/revenue',   icon: TrendingUp, module: 'finance' },
      { label: 'Expenses',     path: '/admin/finance/expenses',  icon: Receipt,    module: 'finance' },
      { label: 'Profit Report',path: '/admin/finance/profit',    icon: PieChart,   module: 'finance' },
    ],
  },
  {
    label: 'Rewards',
    icon: Gift,
    children: [
      { label: 'Overview', path: '/admin/rewards', icon: LayoutDashboard, module: 'rewards' },
      { label: 'Rewards', path: '/admin/rewards/products', icon: Gift, module: 'rewards' },
      { label: 'Redeem Requests', path: '/admin/rewards/exchanges', icon: Ticket, module: 'rewards' },
      { label: 'Earning & Tiers', path: '/admin/rewards/settings', icon: Sliders, module: 'rewards' },
      { label: 'Point Transactions', path: '/admin/rewards/transactions', icon: Activity, module: 'rewards' },
      { label: 'Customer Points', path: '/admin/rewards/points', icon: Award, module: 'rewards' },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    children: [
      { label: 'Sales Report',     path: '/admin/reports/sales',     icon: BarChart3, module: 'reports' },
      { label: 'Product Report',   path: '/admin/reports/products',  icon: Package,   module: 'reports' },
      { label: 'Inventory Report', path: '/admin/reports/inventory', icon: Warehouse, module: 'reports' },
    ],
  },
  {
    label: 'Administration',
    icon: Shield,
    children: [
      { label: 'Users',              path: '/admin/users',    icon: Users,    module: 'users' },
      { label: 'Roles & Permissions',path: '/admin/roles',    icon: Shield,   module: 'users' },
      { label: 'Activity Logs',      path: '/admin/activity', icon: Activity, module: 'users' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    children: [
      { label: 'General Settings',  path: '/admin/settings',          icon: Sliders,       module: 'settings' },
      { label: 'Telegram Settings', path: '/admin/settings/telegram', icon: MessageCircle, module: 'settings' },
      { label: 'Delivery Settings', path: '/admin/settings/delivery', icon: MapPin,        module: 'settings' },
      { label: 'Payment Methods',   path: '/admin/settings/payment',  icon: CreditCard,    module: 'settings' },
      { label: 'Print Logo',        path: '/admin/settings/print-logo', icon: Image,       module: 'settings' },
    ],
  },
]

function isChildActive(childPath, siblings, pathname) {
  if (pathname === childPath) return true
  if (childPath && pathname.startsWith(childPath + '/')) {
    const moreSpecific = siblings.some(
      (s) => s.path !== childPath && pathname.startsWith(s.path)
    )
    return !moreSpecific
  }
  return false
}

function NavItem({ item, collapsed, onNavigate }) {
  const location = useLocation()
  const anyChildActive = item.children
    ? item.children.some((c) => isChildActive(c.path, item.children, location.pathname))
    : false

  const [open, setOpen] = useState(() => anyChildActive)

  useEffect(() => {
    if (anyChildActive) setOpen(true)
  }, [anyChildActive])

  const isActive = item.exact
    ? location.pathname === item.path
    : item.path && location.pathname.startsWith(item.path)

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'sidebar-nav-item w-full',
            anyChildActive ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/10 hover:text-white'
          )}
        >
          <item.icon size={18} className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <Link
                key={child.path}
                to={child.path}
                onClick={onNavigate}
                className={cn(
                  'sidebar-nav-item text-xs',
                  isChildActive(child.path, item.children, location.pathname) ? 'active' : ''
                )}
              >
                <child.icon size={14} className="shrink-0" />
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link to={item.path} onClick={onNavigate} className={cn('sidebar-nav-item', isActive ? 'active' : '')}>
      <item.icon size={18} className="shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export default function Sidebar({ collapsed, onToggle, onNavigate, className }) {
  const { user, logout } = useAuthStore()
  const [confirm, ConfirmDialog] = useConfirm()

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  // Fetch this user's granted permissions
  const { data: myPerms = [], isLoading: permsLoading, isError: permsError } = useQuery({
    queryKey: ['role-perms', user?.role],
    queryFn: () => authApi.rolePermissions(user.role).then((r) => r.data),
    enabled: !!user?.role,
    staleTime: 2 * 60 * 1000,
  })

  const logoUrl = siteSettings?.logo_url || null
  const storeName = siteSettings?.store_name || 'Shadow Shop'

  // admin + super_admin always see everything
  const isFullAccess = ['super_admin', 'admin'].includes(user?.role)

  // Build set of modules the user can view
  const viewableModules = new Set(
    myPerms
      .filter((rp) => rp.permission_detail?.action === 'view')
      .map((rp) => rp.permission_detail?.module)
  )

  const canView = (module) => isFullAccess || !module || viewableModules.has(module)

  const handleLogout = async () => {
    const ok = await confirm('Logout?', 'Are you sure you want to sign out of your account?', {
      confirmText: 'Logout',
      icon: 'logout',
    })
    if (ok) await logout()
  }

  // Show all items while loading, on error (fail-open), or for full-access roles
  const visibleItems = permsLoading || permsError || isFullAccess
    ? navItems
    : navItems.map((item) => {
        if (item.children) {
          const visibleChildren = item.children.filter((c) => canView(c.module))
          return visibleChildren.length > 0 ? { ...item, children: visibleChildren } : null
        }
        return canView(item.module) ? item : null
      }).filter(Boolean)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-navy-800 flex flex-col transition-all duration-300 z-40',
        className,
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Safe-area spacer for mobile status bar */}
      <div className="shrink-0 lg:hidden" style={{ height: 'env(safe-area-inset-top)' }} />

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        {logoUrl ? (
          <img src={logoUrl} alt={storeName} className="w-9 h-9 rounded-xl object-contain shrink-0 bg-white/10" />
        ) : (
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <Store size={18} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <div>
            <h1 className="text-white font-bold text-base leading-tight">{storeName}</h1>
            <p className="text-navy-300 text-xs">Wholesale Cosmetics</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {visibleItems.map((item) => (
          <NavItem key={item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.first_name?.[0] || user?.username?.[0] || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.first_name || user?.username}
              </p>
              <p className="text-navy-300 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="text-navy-300 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
      {ConfirmDialog}
    </aside>
  )
}
