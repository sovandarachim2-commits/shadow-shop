import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Component, lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { isSocialProfileIncomplete } from '@/utils/profileCompletion'

// Auth-critical first paint only. Layouts/home are lazy so /login stays light.
import Login from '@/pages/Login'

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

const AdminLayout = lazyWithReload(() => import('@/components/layout/AdminLayout'))
const CustomerLayout = lazyWithReload(() => import('@/components/layout/CustomerLayout'))
const Home = lazyWithReload(() => import('@/pages/customer/Home'))

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
const ForgotPassword = lazyWithReload(() => import('@/pages/ForgotPassword'))
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
      staleTime: 2 * 60 * 1000,
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
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-white text-sm font-semibold text-gray-500">
          Loading…
        </div>
      }
    >
      {children}
    </Suspense>
  )
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
          <Route path="/forgot-password" element={<LazyPage><ForgotPassword /></LazyPage>} />

          {/* Customer App */}
          <Route path="/" element={
            <RequireStorefront>
              <LazyPage><CustomerLayout /></LazyPage>
            </RequireStorefront>
          }>
            <Route index element={<LazyPage><Home /></LazyPage>} />
            <Route path="search" element={<LazyPage><SearchPage /></LazyPage>} />
            <Route path="shop" element={<LazyPage><ProductList /></LazyPage>} />
            <Route path="lucky-box" element={<LazyPage><LuckyBox /></LazyPage>} />
            <Route path="flash-sale" element={<LazyPage><FlashSale /></LazyPage>} />
            <Route path="product/:id" element={<LazyPage><ProductDetail /></LazyPage>} />
            <Route path="product-set/:id" element={<LazyPage><ProductSetDetail /></LazyPage>} />
            <Route path="cart" element={<LazyPage><Cart /></LazyPage>} />
            <Route path="checkout" element={
              <RequireAuth>
                <LazyPage><Checkout /></LazyPage>
              </RequireAuth>
            } />
            <Route path="order-success" element={<LazyPage><OrderSuccess /></LazyPage>} />
            <Route path="my-orders" element={<LazyPage><MyOrders /></LazyPage>} />
            <Route path="my-orders/:id/receipt" element={<LazyPage><OrderReceipt /></LazyPage>} />
            <Route path="my-orders/:id" element={<LazyPage><OrderTracking /></LazyPage>} />
            <Route path="wishlist" element={<LazyPage><Wishlist /></LazyPage>} />
            <Route path="profile" element={<LazyPage><Profile /></LazyPage>} />
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
              <LazyPage><AdminLayout /></LazyPage>
            </RequireAuth>
          }>
            <Route index element={<LazyPage><AdminIndexRedirect /></LazyPage>} />

            {/* Sales */}
            <Route path="orders/new" element={<LazyPage><NewOrder /></LazyPage>} />
            <Route path="orders" element={<LazyPage><OrderList /></LazyPage>} />
            <Route path="orders/:id" element={<LazyPage><OrderDetail /></LazyPage>} />
            <Route path="customers" element={<LazyPage><Customers /></LazyPage>} />

            {/* Products */}
            <Route path="products" element={<LazyPage><Products /></LazyPage>} />
            <Route path="products/brands" element={<LazyPage><Brands /></LazyPage>} />
            <Route path="products/categories" element={<LazyPage><Categories /></LazyPage>} />
            <Route path="products/sets" element={<LazyPage><ProductSets /></LazyPage>} />
            <Route path="products/flash-sale" element={<LazyPage><FlashSales /></LazyPage>} />
            <Route path="products/banners" element={<LazyPage><Banners /></LazyPage>} />

            {/* Inventory */}
            <Route path="inventory" element={<LazyPage><StockDashboard /></LazyPage>} />
            <Route path="inventory/movements" element={<LazyPage><StockMovements /></LazyPage>} />
            <Route path="inventory/transfers" element={<LazyPage><StockTransfers /></LazyPage>} />

            {/* Customer Scanner */}
            <Route path="customer-scanner/delivery" element={<LazyPage><DeliveryCustomer /></LazyPage>} />
            <Route path="customer-scanner/delivery-config" element={<LazyPage><DeliveryByConfig /></LazyPage>} />

            {/* Operations */}
            <Route path="print" element={<LazyPage><PrintCenter /></LazyPage>} />
            <Route path="print/history" element={<LazyPage><PrintHistory /></LazyPage>} />
            <Route path="scanner" element={<LazyPage><Scanner /></LazyPage>} />
            <Route path="scanner/orders" element={<LazyPage><ScannerOrders /></LazyPage>} />
            <Route path="delivery" element={<LazyPage><Delivery /></LazyPage>} />

            {/* Finance */}
            <Route path="finance/revenue" element={<LazyPage><Revenue /></LazyPage>} />
            <Route path="finance/expenses" element={<LazyPage><Expenses /></LazyPage>} />
            <Route path="finance/profit" element={<LazyPage><ProfitReport /></LazyPage>} />

            {/* Rewards */}
            <Route path="rewards" element={<LazyPage><RewardDashboardAdmin /></LazyPage>} />
            <Route path="rewards/rules" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/points" element={<LazyPage><RewardPointsAdmin /></LazyPage>} />
            <Route path="rewards/transactions" element={<LazyPage><RewardTransactionsAdmin /></LazyPage>} />
            <Route path="rewards/products" element={<LazyPage><RewardItemsAdmin /></LazyPage>} />
            <Route path="rewards/exchanges" element={<LazyPage><RewardRedemptionsAdmin /></LazyPage>} />
            <Route path="rewards/tiers" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/coupons" element={<Navigate to="/admin/rewards/products" replace />} />
            <Route path="rewards/campaigns" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/categories" element={<Navigate to="/admin/rewards/products" replace />} />
            <Route path="rewards/settings" element={<LazyPage><RewardSettingsAdmin /></LazyPage>} />
            <Route path="rewards/notifications" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/automation" element={<Navigate to="/admin/rewards/settings" replace />} />
            <Route path="rewards/redemptions" element={<Navigate to="/admin/rewards/exchanges" replace />} />

            {/* Reports */}
            <Route path="reports/sales" element={<LazyPage><SalesReport /></LazyPage>} />
            <Route path="reports/products" element={<LazyPage><ProductReport /></LazyPage>} />
            <Route path="reports/inventory" element={<LazyPage><InventoryReport /></LazyPage>} />

            {/* Administration */}
            <Route path="profile" element={<LazyPage><AdminProfile /></LazyPage>} />
            <Route path="users" element={<LazyPage><Users /></LazyPage>} />
            <Route path="roles" element={<LazyPage><Roles /></LazyPage>} />
            <Route path="activity" element={<LazyPage><ActivityLogs /></LazyPage>} />

            {/* Settings */}
            <Route path="settings" element={<LazyPage><Settings /></LazyPage>} />
            <Route path="settings/telegram" element={<LazyPage><Settings tab="telegram" /></LazyPage>} />
            <Route path="settings/delivery" element={<LazyPage><Settings tab="delivery" /></LazyPage>} />
            <Route path="settings/payment" element={<LazyPage><Settings tab="payment" /></LazyPage>} />
            <Route path="settings/print-logo" element={<LazyPage><Settings tab="printLogo" /></LazyPage>} />
            <Route path="settings/login-logo" element={<LazyPage><Settings tab="loginSplash" /></LazyPage>} />
            <Route path="settings/customer-footer" element={<LazyPage><Settings tab="customerFooter" /></LazyPage>} />
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
