import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ClipboardList, UserCircle, MoreHorizontal, ScanLine } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { AdminPageHeaderProvider } from './AdminPageHeaderContext'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { cn } from '@/utils/helpers'

const LEFT_TABS = [
  { label: 'Dashboard', path: '/admin',        icon: LayoutDashboard, module: 'dashboard', exact: true },
  { label: 'Orders',    path: '/admin/orders', icon: ClipboardList,   module: 'orders' },
]
const RIGHT_TABS = [
  { label: 'Profile', path: '/admin/profile', icon: UserCircle, module: 'profile' },
]

function AdminBottomNav({ onMoreClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: myPerms = [] } = useQuery({
    queryKey: ['role-perms', user?.role],
    queryFn: () => authApi.rolePermissions(user.role).then((r) => r.data),
    enabled: !!user?.role,
    staleTime: 2 * 60 * 1000,
  })

  const isFullAccess = ['super_admin', 'admin'].includes(user?.role)
  const viewable = new Set(
    myPerms.filter((rp) => rp.permission_detail?.action === 'view').map((rp) => rp.permission_detail?.module)
  )
  const canView = (mod) => isFullAccess || viewable.has(mod)
  const canShowTab = (tab) => tab.module === 'profile' || canView(tab.module)
  const visibleTabs = [
    ...LEFT_TABS.filter(canShowTab),
    ...(canView('scanner') ? [{ label: 'Scanner', path: '/admin/scanner', icon: ScanLine, module: 'scanner', special: true }] : []),
    ...RIGHT_TABS.filter(canShowTab),
    { label: 'More', path: '#more', icon: MoreHorizontal, module: 'more', action: onMoreClick },
  ]

  const renderTab = (tab) => {
    const isActive = tab.exact
      ? location.pathname === tab.path
      : location.pathname.startsWith(tab.path)
    const Icon = tab.icon

    if (tab.special) {
      return (
        <button
          key={tab.path}
          type="button"
          onClick={() => navigate(tab.path)}
          className="relative -mt-8 flex min-w-0 flex-col items-center justify-center gap-1"
        >
          <span className={cn(
            'grid h-16 w-16 place-items-center rounded-full border-[6px] border-white bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 text-white shadow-xl shadow-purple-500/35 transition active:scale-95',
            isActive ? 'ring-4 ring-purple-100' : ''
          )}>
            <Icon size={26} strokeWidth={2.4} />
          </span>
          <span className={cn('text-[11px] font-black', isActive ? 'text-purple-700' : 'text-gray-500')}>
            {tab.label}
          </span>
        </button>
      )
    }

    const content = (
      <>
        <span className={cn(
          'grid h-9 w-9 place-items-center rounded-2xl transition',
          isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-400'
        )}>
          <Icon size={20} strokeWidth={isActive ? 2.5 : 1.9} />
        </span>
        <span className="truncate text-[11px] font-black">{tab.label}</span>
      </>
    )

    if (tab.action) {
      return (
        <button
          key={tab.label}
          type="button"
          onClick={tab.action}
          className="flex min-w-0 flex-col items-center justify-center gap-0.5 text-gray-400 transition active:scale-95"
        >
          {content}
        </button>
      )
    }

    return (
      <Link
        key={tab.path}
        to={tab.path}
        className={cn(
          'flex min-w-0 flex-col items-center justify-center gap-0.5 transition active:scale-95',
          isActive ? 'text-purple-700' : 'text-gray-400'
        )}
      >
        {content}
      </Link>
    )
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.55rem,env(safe-area-inset-bottom))] lg:hidden"
      aria-label="Admin bottom navigation"
    >
      <div
        className="mx-auto grid min-h-[72px] max-w-md items-end gap-1 rounded-[28px] border border-gray-100 bg-white/95 px-3 pb-2 pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur"
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
      >
        {visibleTabs.map(renderTab)}
      </div>
    </nav>
  )
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const hideBottomNav = location.pathname === '/admin/scanner/orders'

  return (
    <AdminPageHeaderProvider>
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile sidebar drawer overlay */}
      {mobileMenuOpen && (
        <button
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
      <div className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <Sidebar
          collapsed={false}
          onToggle={() => setMobileMenuOpen(false)}
          onNavigate={() => setMobileMenuOpen(false)}
          className="z-50 shadow-2xl"
        />
      </div>

      <Header
        onMenuToggle={() => setCollapsed(!collapsed)}
        onMobileMenuToggle={() => setMobileMenuOpen(true)}
        sidebarCollapsed={collapsed}
      />

      <main className={`min-h-screen lg:pt-16 transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Extra bottom padding on mobile so content isn't hidden behind bottom nav */}
        <div className={`p-4 md:p-6 md:pb-6 ${hideBottomNav ? 'pb-6' : 'pb-24'}`}>
          <Outlet />
        </div>
      </main>

      {!hideBottomNav && <AdminBottomNav onMoreClick={() => setMobileMenuOpen(true)} />}
    </div>
    </AdminPageHeaderProvider>
  )
}
