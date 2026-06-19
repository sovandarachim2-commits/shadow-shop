import { useState } from 'react'
import { Menu, Bell, Search, ChevronDown, Settings, LogOut, UserCircle, Store } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export default function Header({ onMenuToggle, onMobileMenuToggle, sidebarCollapsed }) {
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [confirm, ConfirmDialog] = useConfirm()

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: myPerms = [] } = useQuery({
    queryKey: ['role-perms', user?.role],
    queryFn: () => authApi.rolePermissions(user.role).then((r) => r.data),
    enabled: !!user?.role,
    staleTime: 2 * 60 * 1000,
  })

  const logoUrl = siteSettings?.logo_url || null
  const storeName = siteSettings?.store_name || 'Shadow Shop'
  const initial = (user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()
  const desktopOffset = sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'

  const canVisitStore = ['super_admin', 'admin'].includes(user?.role) ||
    myPerms.some((rp) => rp.permission_detail?.module === 'storefront' && rp.permission_detail?.action === 'view')

  const handleLogout = async () => {
    const ok = await confirm('Logout?', 'Are you sure you want to sign out of your account?', {
      confirmText: 'Logout',
      icon: 'logout',
    })
    if (!ok) return
    setShowUserMenu(false)
    await logout()
  }

  return (
    <>
      {/* ── Mobile header — sticky white (like customer) ─────────── */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur lg:hidden">
        {/* Safe-area spacer for status bar */}
        <div style={{ height: 'env(safe-area-inset-top)' }} />

        <div className="flex items-center gap-2 px-3 py-2">
          {/* Hamburger */}
          <button
            onClick={onMobileMenuToggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 active:bg-gray-100"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          {/* Logo + store name */}
          <Link to="/admin" className="flex flex-1 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={storeName} className="h-8 w-8 rounded-xl object-contain" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <span className="text-xs font-bold text-white">{storeName[0]}</span>
              </div>
            )}
            <p className="text-[15px] font-black text-gray-950">{storeName}</p>
          </Link>

          {/* Bell */}
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 active:bg-gray-100">
            <Bell size={20} />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-pink-500" />
          </button>

          {/* Avatar */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400"
          >
            <span className="text-xs font-bold text-white">{initial}</span>
          </button>
        </div>

        {/* Mobile dropdown */}
        {showUserMenu && (
          <>
            <button className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-3 top-14 z-50 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3">
                <p className="text-sm font-bold text-white">{user?.first_name || user?.username}</p>
                <p className="text-xs capitalize text-white/70">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div className="py-1">
                <Link to="/admin/profile" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <UserCircle size={15} className="text-gray-400" /> My Profile
                </Link>
                <Link to="/admin/settings" onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings size={15} className="text-gray-400" /> Settings
                </Link>
                {canVisitStore && (
                  <Link to="/" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50">
                    <Store size={15} className="text-purple-400" /> Visit Store
                  </Link>
                )}
                <hr className="my-1 border-gray-100" />
                <button onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* ── Desktop header — fixed white ──────────────────────────── */}
      <header className={`fixed left-0 right-0 top-0 z-30 hidden h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 transition-all duration-300 lg:flex ${desktopOffset}`}>
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, products, customers..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{initial}</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{user?.first_name || user?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {showUserMenu && (
              <>
                <button className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-soft">
                  <Link to="/admin/profile" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <UserCircle size={16} /> My Profile
                  </Link>
                  <Link to="/admin/settings" onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings size={16} /> Settings
                  </Link>
                  {canVisitStore && (
                    <Link to="/" onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-purple-600 hover:bg-purple-50">
                      <Store size={16} className="text-purple-500" /> Visit Store
                    </Link>
                  )}
                  <hr className="my-1 border-gray-100" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      {ConfirmDialog}
    </>
  )
}
