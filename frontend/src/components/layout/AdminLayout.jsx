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

  const renderTab = (tab) => {
    if (!canShowTab(tab)) return null
    const isActive = tab.exact
      ? location.pathname === tab.path
      : location.pathname.startsWith(tab.path)
    return (
      <Link
        key={tab.path}
        to={tab.path}
        className={cn(
          'flex flex-col items-center gap-0.5 px-4 py-1.5 text-[10px] font-semibold transition-colors',
          isActive ? 'text-purple-600' : 'text-gray-400'
        )}
      >
        <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
        {tab.label}
      </Link>
    )
  }

  const isScannerActive = location.pathname.startsWith('/admin/scanner')
  const canUseScanner = canView('scanner')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t border-gray-100 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))', paddingTop: '0.375rem' }}
    >
      {LEFT_TABS.map(renderTab)}

      {canUseScanner && (
        <div className="relative -top-4 flex flex-col items-center">
          <div className={cn(
            'rounded-full p-1 transition-all',
            isScannerActive ? 'bg-pink-200/60' : 'bg-pink-100/80'
          )}>
            <button
              onClick={() => navigate('/admin/scanner')}
              className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 shadow-lg shadow-purple-400/50 transition-transform active:scale-95"
              style={{ width: '3.25rem', height: '3.25rem' }}
            >
              <ScanLine size={24} className="text-white" strokeWidth={2.2} />
            </button>
          </div>
          <span className={cn('mt-1 text-[10px] font-semibold', isScannerActive ? 'text-purple-600' : 'text-gray-400')}>
            Scanner
          </span>
        </div>
      )}

      {RIGHT_TABS.map(renderTab)}

      <button
        onClick={onMoreClick}
        className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-[10px] font-semibold text-gray-400 transition-colors"
      >
        <MoreHorizontal size={20} strokeWidth={1.8} />
        More
      </button>
    </nav>
  )
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        <div className="p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </div>
      </main>

      <AdminBottomNav onMoreClick={() => setMobileMenuOpen(true)} />
    </div>
    </AdminPageHeaderProvider>
  )
}
