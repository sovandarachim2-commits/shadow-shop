import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Component, lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { isSocialProfileIncomplete } from '@/utils/profileCompletion'

// Layouts + critical first-paint pages (eager so refresh does not flash a full-page spinner)
import AdminLayout from '@/components/layout/AdminLayout'
import CustomerLayout from '@/components/layout/CustomerLayout'
import Login from '@/pages/Login'
import Home from '@/pages/customer/Home'

async function clearFrontendCaches() {
  if (!('caches' in window)) return
  const keys = await window.caches.keys()
  await Promise.all(keys.filter((key) => key.startsWith('shadow-shop-')).map((key) => window.caches.delete(key)))
}

function lazyWithReload(importer) {
  return lazy(() =>
    importer()
      .then((module) => {
        sessionStorage.removeItem('shadow-shop-chunk-reload')
        return module
      })
      .catch(async (error) => {
        const message = String(error?.message || error || '')
        const isChunkLoadError =
          message.includes('Failed to fetch dynamically imported module') ||
          message.includes('Importing a module script failed') ||
          message.includes('ChunkLoadError') ||
          message.includes('error loading dynamically imported module') ||
          message.includes('Load failed')

        if (isChunkLoadError && sessionStorage.getItem('shadow-shop-chunk-reload') !== '1') {
          sessionStorage.setItem('shadow-shop-chunk-reload', '1')
          await clearFrontendCaches().catch(() => {})
          window.location.reload()
          return new Promise(() => {})
        }

        throw error
      }),
  )
}

function lazyNamedWithReload(importer, exportName) {
  return lazyWithReload(() => importer().then((module) => ({ default: module[exportName] })))
}

function getAppErrorMessage(error) {
  if (typeof error === 'string' && error.trim()) return error
  if (error?.message) return String(error.message)
  if (error?.response?.data?.detail) return String(error.response.data.detail)
  if (error?.reason?.message) return String(error.reason.message)

  try {
    const serialized = JSON.stringify(error)
    if (serialized && serialized !== '{}') return serialized
  } catch {
    // Fall through to a stable message for non-serializable thrown values.
  }

  return 'The browser could not load this page component. Reload to fetch the latest app files.'
}

const Scanner = lazyWithReload(() => import('@/pages/admin/operations/Scanner'))
const ScannerOrders = lazyWithReload(() => import('@/pages/admin/operations/ScannerOrders'))
const PrepareItems = lazyWithReload(() => import('@/pages/admin/operations/PrepareItems'))
const PrepareSet = lazyWithReload(() => import('@/pages/admin/operations/PrepareSet'))
const PrepareSetHistory = lazyWithReload(() => import('@/pages/admin/operations/PrepareSetHistory'))
const PrepareItemsHistory = lazyWithReload(() => import('@/pages/admin/operations/PrepareItemsHistory'))
const OutItems = lazyWithReload(() => import('@/pages/admin/operations/OutItems'))
const OutItemsHistory = lazyWithReload(() => import('@/pages/admin/operations/OutItemsHistory'))
const DeliveryCustomer = lazyWithReload(() => import('@/pages/admin/operations/DeliveryCustomer'))
const DeliveryByConfig = lazyWithReload(() => import('@/pages/admin/operations/DeliveryByConfig'))
const VerifyEmail = lazyWithReload(() => import('@/pages/VerifyEmail'))
const Dashboard = lazyWithReload(() => import('@/pages/admin/Dashboard'))
const NewOrder = lazyWithReload(() => import('@/pages/admin/orders/NewOrder'))
const OrderList = lazyWithReload(() => import('@/pages/admin/orders/OrderList'))
const OrderDetail = lazyWithReload(() => import('@/pages/admin/orders/OrderDetail'))
const Customers = lazyWithReload(() => import('@/pages/admin/customers/Customers'))
const Products = lazyWithReload(() => import('@/pages/admin/products/Products'))
const Categories = lazyWithReload(() => import('@/pages/admin/products/Categories'))
const Brands = lazyWithReload(() => import('@/pages/admin/products/Brands'))
const ProductSets = lazyWithReload(() => import('@/pages/admin/products/ProductSets'))
const FlashSales = lazyWithReload(() => import('@/pages/admin/products/FlashSales'))
const Banners = lazyWithReload(() => import('@/pages/admin/products/Banners'))
const StockDashboard = lazyWithReload(() => import('@/pages/admin/inventory/StockDashboard'))
const StockMovements = lazyWithReload(() => import('@/pages/admin/inventory/StockMovements'))
const StockTransfers = lazyWithReload(() => import('@/pages/admin/inventory/StockTransfers'))
const PrintCenter = lazyWithReload(() => import('@/pages/admin/operations/PrintCenter'))
const PrintHistory = lazyNamedWithReload(() => import('@/pages/admin/operations/PrintCenter'), 'PrintHistory')
const PrintPreviewPage = lazyNamedWithReload(() => import('@/pages/admin/operations/PrintCenter'), 'PrintPreviewPage')
const Delivery = lazyWithReload(() => import('@/pages/admin/operations/Delivery'))
const Revenue = lazyWithReload(() => import('@/pages/admin/finance/Revenue'))
const Expenses = lazyWithReload(() => import('@/pages/admin/finance/Expenses'))
const ProfitReport = lazyWithReload(() => import('@/pages/admin/finance/ProfitReport'))
const RewardDashboardAdmin = lazyWithReload(() => import('@/pages/admin/rewards/RewardsAdmin'))
const RewardItemsAdmin = lazyNamedWithReload(() => import('@/pages/admin/rewards/RewardsAdmin'), 'RewardItemsAdmin')
const RewardPointsAdmin = lazyNamedWithReload(() => import('@/pages/admin/rewards/RewardsAdmin'), 'RewardPointsAdmin')
const RewardRedemptionsAdmin = lazyNamedWithReload(() => import('@/pages/admin/rewards/RewardsAdmin'), 'RewardRedemptionsAdmin')
const RewardSettingsAdmin = lazyNamedWithReload(() => import('@/pages/admin/rewards/RewardsAdmin'), 'RewardSettingsAdmin')
const RewardTransactionsAdmin = lazyNamedWithReload(() => import('@/pages/admin/rewards/RewardsAdmin'), 'RewardTransactionsAdmin')
const SalesReport = lazyWithReload(() => import('@/pages/admin/reports/SalesReport'))
const ProductReport = lazyWithReload(() => import('@/pages/admin/reports/ProductReport'))
const InventoryReport = lazyWithReload(() => import('@/pages/admin/reports/InventoryReport'))
const Users = lazyWithReload(() => import('@/pages/admin/users/Users'))
const Roles = lazyWithReload(() => import('@/pages/admin/users/Roles'))
const ActivityLogs = lazyWithReload(() => import('@/pages/admin/users/ActivityLogs'))
const AdminProfile = lazyWithReload(() => import('@/pages/admin/users/AdminProfile'))
const Settings = lazyWithReload(() => import('@/pages/admin/settings/Settings'))
const ProductList = lazyWithReload(() => import('@/pages/customer/ProductList'))
const ProductDetail = lazyWithReload(() => import('@/pages/customer/ProductDetail'))
const ProductSetDetail = lazyWithReload(() => import('@/pages/customer/ProductSetDetail'))
const Cart = lazyWithReload(() => import('@/pages/customer/Cart'))
const Checkout = lazyWithReload(() => import('@/pages/customer/Checkout'))
const MyOrders = lazyWithReload(() => import('@/pages/customer/MyOrders'))
const OrderSuccess = lazyWithReload(() => import('@/pages/customer/OrderSuccess'))
const Profile = lazyWithReload(() => import('@/pages/customer/Profile'))
const EditProfilePage = lazyNamedWithReload(() => import('@/pages/customer/Profile'), 'EditProfilePage')
const CompleteProfile = lazyWithReload(() => import('@/pages/customer/CompleteProfile'))
const Wishlist = lazyWithReload(() => import('@/pages/customer/Wishlist'))
const OrderTracking = lazyWithReload(() => import('@/pages/customer/OrderTracking'))
const OrderReceipt = lazyWithReload(() => import('@/pages/customer/OrderReceipt'))
const AddressBook = lazyWithReload(() => import('@/pages/customer/AddressBook'))
const ExchangeRewards = lazyWithReload(() => import('@/pages/customer/ExchangeRewards'))
const EarnPoints = lazyWithReload(() => import('@/pages/customer/EarnPoints'))
const PointsHistory = lazyWithReload(() => import('@/pages/customer/PointsHistory'))
const RedeemRewards = lazyWithReload(() => import('@/pages/customer/RedeemRewards'))
const MyCoupons = lazyWithReload(() => import('@/pages/customer/MyCoupons'))
const RewardDetail = lazyWithReload(() => import('@/pages/customer/RewardDetail'))
const LuckyBox = lazyWithReload(() => import('@/pages/customer/LuckyBox'))
const FlashSale = lazyWithReload(() => import('@/pages/customer/FlashSale'))
const SearchPage = lazyWithReload(() => import('@/pages/customer/SearchPage'))

const QUERY_CACHE_KEY = 'shadow-shop-query-cache'
const QUERY_CACHE_MAX_AGE_MS = 30 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Keep showing last data while a background refetch runs
      placeholderData: (previousData) => previousData,
    },
  },
})

function restoreQueryCache() {
  try {
    const raw = localStorage.getItem(QUERY_CACHE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > QUERY_CACHE_MAX_AGE_MS) {
      localStorage.removeItem(QUERY_CACHE_KEY)
      return
    }
    hydrate(queryClient, parsed.clientState)
  } catch {
    localStorage.removeItem(QUERY_CACHE_KEY)
  }
}

function persistQueryCache() {
  try {
    const clientState = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    })
    localStorage.setItem(
      QUERY_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), clientState }),
    )
  } catch {
    // Ignore quota / private-mode failures
  }
}

restoreQueryCache()

let persistTimer
queryClient.getQueryCache().subscribe(() => {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(persistQueryCache, 800)
})

class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  handleReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
      sessionStorage.removeItem('shadow-shop-chunk-reload')
    } catch {
      // Reload should still work even if cache cleanup is unavailable.
    }

    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-5 shadow-lg">
          <p className="text-lg font-black text-gray-950">App could not load</p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            The page opened, but the app hit an error while starting.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
            {getAppErrorMessage(this.state.error)}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 w-full rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}

function RequireAuth({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (adminOnly && user?.role === 'customer') return <Navigate to="/" replace />
  if (!adminOnly && isSocialProfileIncomplete(user) && location.pathname !== '/profile/complete') {
    return <Navigate to="/profile/complete" replace state={{ from: location.pathname }} />
  }
  return children
}

function RequireRewardsAuth({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-white px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-pink-100 bg-white p-6 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-3xl">
            <span aria-hidden="true">★</span>
          </div>
          <h1 className="mt-5 text-2xl font-black text-gray-950">Login to Use Rewards</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
            Please login or register first to earn points, redeem rewards, and view your coupons.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: '/profile/rewards' } })}
              className="shop-btn-primary h-11 px-4 py-0"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { mode: 'register', from: '/profile/rewards' } })}
              className="shop-btn-outline h-11 px-4 py-0"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isSocialProfileIncomplete(user)) {
    return <Navigate to="/profile/complete" replace state={{ from: '/profile/rewards' }} />
  }

  return children
}

// Guards customer routes: staff users must have storefront.view permission
function RequireStorefront({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  const isStaff = isAuthenticated && user?.role !== 'customer'

  const { data: myPerms = [], isLoading } = useQuery({
    queryKey: ['role-perms', user?.role],
    queryFn: () => authApi.rolePermissions(user.role).then((r) => r.data),
    enabled: !!isStaff,
    staleTime: 2 * 60 * 1000,
  })

  // Guests and customers pass through freely
  if (!isStaff) return children
  // Fail-open while loading (avoids flash redirect)
  if (isLoading) return children
  // admin / super_admin always have access
  if (['super_admin', 'admin'].includes(user?.role)) return children
  // Other staff: check storefront.view
  const hasStorefront = myPerms.some(
    (rp) => rp.permission_detail?.module === 'storefront' && rp.permission_detail?.action === 'view'
  )
  if (!hasStorefront) return <Navigate to="/admin" replace />
  return children
}

function AuthBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearSession = useAuthStore((s) => s.clearSession)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      if (isAuthenticated) clearSession()
      return
    }
    if (isAuthenticated) fetchMe()
  }, [])

  return null
}

function LazyPage({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search])

  return null
}

function AppIconSync() {
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    const iconUrl = siteSettings?.favicon_url || siteSettings?.logo_url
    if (!iconUrl) return

    const ensureLink = (selector, rel, sizes) => {
      let link = document.querySelector(selector)
      if (!link) {
        link = document.createElement('link')
        link.rel = rel
        if (sizes) link.sizes = sizes
        document.head.appendChild(link)
      }
      link.href = iconUrl
    }

    ensureLink("link[rel~='icon']", 'icon')
    ensureLink("link[rel='apple-touch-icon']", 'apple-touch-icon')
    ensureLink("link[rel='apple-touch-icon'][sizes='180x180']", 'apple-touch-icon', '180x180')
    ensureLink("link[rel='apple-touch-icon'][sizes='192x192']", 'apple-touch-icon', '192x192')
  }, [siteSettings?.favicon_url, siteSettings?.logo_url])

  return null
}

const ADMIN_FALLBACK_ROUTES = [
  { module: 'dashboard', path: '/admin' },
  { module: 'orders', path: '/admin/orders' },
  { module: 'products', path: '/admin/products' },
  { module: 'product_brands', path: '/admin/products/brands' },
  { module: 'product_categories', path: '/admin/products/categories' },
  { module: 'product_sets', path: '/admin/products/sets' },
  { module: 'product_flash_sale', path: '/admin/products/flash-sale' },
  { module: 'product_banners', path: '/admin/products/banners' },
  { module: 'inventory', path: '/admin/inventory' },
  { module: 'print', path: '/admin/print' },
  { module: 'scanner', path: '/admin/scanner' },
  { module: 'scanner_delivery_config', path: '/admin/customer-scanner/delivery-config' },
  { module: 'delivery', path: '/admin/delivery' },
  { module: 'finance', path: '/admin/finance/revenue' },
  { module: 'rewards', path: '/admin/rewards' },
  { module: 'reports', path: '/admin/reports/sales' },
  { module: 'users', path: '/admin/users' },
  { module: 'settings', path: '/admin/settings' },
]

function AdminIndexRedirect() {
  const { user } = useAuthStore()
  const { data: myPerms = [], isLoading } = useQuery({
    queryKey: ['role-perms', user?.role],
    queryFn: () => authApi.rolePermissions(user.role).then((r) => r.data),
    enabled: !!user?.role,
    staleTime: 2 * 60 * 1000,
  })

  if (['super_admin', 'admin'].includes(user?.role)) return <Dashboard />
  if (isLoading) return null

  const viewable = new Set(
    myPerms
      .filter((rp) => rp.permission_detail?.action === 'view')
      .map((rp) => rp.permission_detail?.module)
  )
  const firstAllowed = ADMIN_FALLBACK_ROUTES.find((route) => viewable.has(route.module))

  if (!firstAllowed || firstAllowed.path === '/admin') return <Dashboard />
  return <Navigate to={firstAllowed.path} replace />
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthBootstrap />
          <AppIconSync />
          <ScrollToTop />
          <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<LazyPage><VerifyEmail /></LazyPage>} />

          {/* Customer App */}
          <Route path="/" element={<RequireStorefront><CustomerLayout /></RequireStorefront>}>
            <Route index element={<Home />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="shop" element={<ProductList />} />
            <Route path="lucky-box" element={<LuckyBox />} />
            <Route path="flash-sale" element={<FlashSale />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="product-set/:id" element={<ProductSetDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            } />
            <Route path="order-success" element={<OrderSuccess />} />
            <Route path="my-orders" element={<MyOrders />} />
            <Route path="my-orders/:id/receipt" element={<OrderReceipt />} />
            <Route path="my-orders/:id" element={<OrderTracking />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/edit" element={
              <RequireAuth>
                <EditProfilePage />
              </RequireAuth>
            } />
            <Route path="profile/complete" element={
              <RequireAuth>
                <CompleteProfile />
              </RequireAuth>
            } />
            <Route path="profile/rewards" element={
              <RequireRewardsAuth>
                <ExchangeRewards />
              </RequireRewardsAuth>
            } />
            <Route path="profile/rewards/redeem" element={
              <RequireRewardsAuth>
                <RedeemRewards />
              </RequireRewardsAuth>
            } />
            <Route path="profile/rewards/earn" element={
              <RequireRewardsAuth>
                <EarnPoints />
              </RequireRewardsAuth>
            } />
            <Route path="profile/rewards/history" element={
              <RequireRewardsAuth>
                <PointsHistory />
              </RequireRewardsAuth>
            } />
            <Route path="profile/rewards/coupons" element={
              <RequireRewardsAuth>
                <MyCoupons />
              </RequireRewardsAuth>
            } />
            <Route path="profile/rewards/:id" element={
              <RequireRewardsAuth>
                <RewardDetail />
              </RequireRewardsAuth>
            } />
            <Route path="address-book" element={
              <RequireAuth>
                <AddressBook />
              </RequireAuth>
            } />
          </Route>

          {/* Standalone admin pages (no sidebar) */}
          <Route path="/admin/print-preview" element={
            <RequireAuth adminOnly>
              <LazyPage><PrintPreviewPage /></LazyPage>
            </RequireAuth>
          } />
          <Route path="/print/history" element={<Navigate to="/admin/print/history" replace />} />
          <Route path="/print" element={<Navigate to="/admin/print" replace />} />
          <Route path="/admin/prepare" element={
            <RequireAuth adminOnly>
              <LazyPage><PrepareItems /></LazyPage>
            </RequireAuth>
          } />
          <Route path="/admin/prepare/history" element={
            <RequireAuth adminOnly>
              <LazyPage><PrepareItemsHistory /></LazyPage>
            </RequireAuth>
          } />
          <Route path="/admin/prepare-set" element={
            <RequireAuth adminOnly>
              <LazyPage><PrepareSet /></LazyPage>
            </RequireAuth>
          } />
          <Route path="/admin/prepare-set/history" element={
            <RequireAuth adminOnly>
              <LazyPage><PrepareSetHistory /></LazyPage>
            </RequireAuth>
          } />
          <Route path="/admin/out-items" element={
            <RequireAuth adminOnly>
              <LazyPage><OutItems /></LazyPage>
            </RequireAuth>
          } />
          <Route path="/admin/out-items/history" element={
            <RequireAuth adminOnly>
              <LazyPage><OutItemsHistory /></LazyPage>
            </RequireAuth>
          } />

          {/* Admin App */}
          <Route path="/admin" element={
            <RequireAuth adminOnly>
              <AdminLayout />
            </RequireAuth>
          }>
            <Route index element={<AdminIndexRedirect />} />

            {/* Sales */}
            <Route path="orders/new" element={<NewOrder />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="customers" element={<Customers />} />

            {/* Products */}
            <Route path="products" element={<Products />} />
            <Route path="products/brands" element={<Brands />} />
            <Route path="products/categories" element={<Categories />} />
            <Route path="products/sets" element={<ProductSets />} />
            <Route path="products/flash-sale" element={<FlashSales />} />
            <Route path="products/banners" element={<Banners />} />

            {/* Inventory */}
            <Route path="inventory" element={<StockDashboard />} />
            <Route path="inventory/movements" element={<StockMovements />} />
            <Route path="inventory/transfers" element={<StockTransfers />} />

            {/* Customer Scanner */}
            <Route path="customer-scanner/delivery" element={<LazyPage><DeliveryCustomer /></LazyPage>} />
            <Route path="customer-scanner/delivery-config" element={<LazyPage><DeliveryByConfig /></LazyPage>} />

            {/* Operations */}
            <Route path="print" element={<PrintCenter />} />
            <Route path="print/history" element={<PrintHistory />} />
            <Route path="scanner" element={<LazyPage><Scanner /></LazyPage>} />
            <Route path="scanner/orders" element={<LazyPage><ScannerOrders /></LazyPage>} />
            <Route path="delivery" element={<Delivery />} />

            {/* Finance */}
            <Route path="finance/revenue" element={<Revenue />} />
            <Route path="finance/expenses" element={<Expenses />} />
            <Route path="finance/profit" element={<ProfitReport />} />

            {/* Rewards */}
            <Route path="rewards" element={<RewardDashboardAdmin />} />
            <Route path="rewards/rules" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/points" element={<RewardPointsAdmin />} />
            <Route path="rewards/transactions" element={<RewardTransactionsAdmin />} />
            <Route path="rewards/products" element={<RewardItemsAdmin />} />
            <Route path="rewards/exchanges" element={<RewardRedemptionsAdmin />} />
            <Route path="rewards/tiers" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/coupons" element={<Navigate to="/admin/rewards/products" replace />} />
            <Route path="rewards/campaigns" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/categories" element={<Navigate to="/admin/rewards/products" replace />} />
            <Route path="rewards/settings" element={<RewardSettingsAdmin />} />
            <Route path="rewards/notifications" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/automation" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/redemptions" element={<Navigate to="/admin/rewards/exchanges" replace />} />

            {/* Reports */}
            <Route path="reports/sales" element={<SalesReport />} />
            <Route path="reports/products" element={<ProductReport />} />
            <Route path="reports/inventory" element={<InventoryReport />} />

            {/* Administration */}
            <Route path="profile" element={<AdminProfile />} />
            <Route path="users" element={<Users />} />
            <Route path="roles" element={<Roles />} />
            <Route path="activity" element={<ActivityLogs />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/telegram" element={<Settings tab="telegram" />} />
            <Route path="settings/delivery" element={<Settings tab="delivery" />} />
            <Route path="settings/payment" element={<Settings tab="payment" />} />
            <Route path="settings/print-logo" element={<Settings tab="printLogo" />} />
            <Route path="settings/login-logo" element={<Settings tab="loginSplash" />} />
            <Route path="settings/login-splash" element={<Navigate to="/admin/settings/login-logo" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Toaster
            position="top-right"
            containerStyle={{
              top: 'max(1rem, calc(env(safe-area-inset-top) + 1rem))',
              right: '0.75rem',
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '0 0.75rem',
            }}
            toastOptions={{
              className: '',
              style: {
                borderRadius: '12px',
                background: '#1e1b4b',
                color: '#fff',
                fontSize: '14px',
                maxWidth: 'min(92vw, 420px)',
              },
              success: {
                style: { background: '#059669', color: '#fff' },
                iconTheme: { primary: '#fff', secondary: '#059669' },
              },
              error: {
                style: { background: '#dc2626', color: '#fff' },
                iconTheme: { primary: '#fff', secondary: '#dc2626' },
              },
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
