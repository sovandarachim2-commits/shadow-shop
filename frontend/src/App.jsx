import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Component, lazy, Suspense, useEffect, useLayoutEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'

// Layouts
import AdminLayout from '@/components/layout/AdminLayout'
import CustomerLayout from '@/components/layout/CustomerLayout'

// Auth
import Login from '@/pages/Login'

// Admin Pages
import Dashboard from '@/pages/admin/Dashboard'
import NewOrder from '@/pages/admin/orders/NewOrder'
import OrderList from '@/pages/admin/orders/OrderList'
import OrderDetail from '@/pages/admin/orders/OrderDetail'
import Customers from '@/pages/admin/customers/Customers'
import Products from '@/pages/admin/products/Products'
import Categories from '@/pages/admin/products/Categories'
import Brands from '@/pages/admin/products/Brands'
import ProductSets from '@/pages/admin/products/ProductSets'
import FlashSales from '@/pages/admin/products/FlashSales'
import Banners from '@/pages/admin/products/Banners'
import StockDashboard from '@/pages/admin/inventory/StockDashboard'
import StockMovements from '@/pages/admin/inventory/StockMovements'
import StockTransfers from '@/pages/admin/inventory/StockTransfers'
import PrintCenter, { PrintHistory, PrintPreviewPage } from '@/pages/admin/operations/PrintCenter'
function lazyWithReload(importer) {
  return lazy(() =>
    importer()
      .then((module) => {
        sessionStorage.removeItem('shadow-shop-chunk-reload')
        return module
      })
      .catch((error) => {
        const message = String(error?.message || error || '')
        const isChunkLoadError =
          message.includes('Failed to fetch dynamically imported module') ||
          message.includes('Importing a module script failed') ||
          message.includes('ChunkLoadError') ||
          message.includes('error loading dynamically imported module') ||
          message.includes('Load failed')

        if (isChunkLoadError && sessionStorage.getItem('shadow-shop-chunk-reload') !== '1') {
          sessionStorage.setItem('shadow-shop-chunk-reload', '1')
          window.location.reload()
        }

        throw error
      }),
  )
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
import Delivery from '@/pages/admin/operations/Delivery'
import Revenue from '@/pages/admin/finance/Revenue'
import Expenses from '@/pages/admin/finance/Expenses'
import ProfitReport from '@/pages/admin/finance/ProfitReport'
import RewardDashboardAdmin, {
  RewardAutomationAdmin,
  RewardCampaignsAdmin,
  RewardCategoriesAdmin,
  RewardCouponsAdmin,
  RewardItemsAdmin,
  RewardMemberTiersAdmin,
  RewardNotificationsAdmin,
  RewardPointsAdmin,
  RewardRedemptionsAdmin,
  RewardRulesAdmin,
  RewardSettingsAdmin,
  RewardTransactionsAdmin,
} from '@/pages/admin/rewards/RewardsAdmin'
import SalesReport from '@/pages/admin/reports/SalesReport'
import ProductReport from '@/pages/admin/reports/ProductReport'
import InventoryReport from '@/pages/admin/reports/InventoryReport'
import Users from '@/pages/admin/users/Users'
import Roles from '@/pages/admin/users/Roles'
import ActivityLogs from '@/pages/admin/users/ActivityLogs'
import AdminProfile from '@/pages/admin/users/AdminProfile'
import Settings from '@/pages/admin/settings/Settings'

// Customer Pages
import Home from '@/pages/customer/Home'
import ProductList from '@/pages/customer/ProductList'
import ProductDetail from '@/pages/customer/ProductDetail'
import ProductSetDetail from '@/pages/customer/ProductSetDetail'
import Cart from '@/pages/customer/Cart'
import Checkout from '@/pages/customer/Checkout'
import MyOrders from '@/pages/customer/MyOrders'
import OrderSuccess from '@/pages/customer/OrderSuccess'
import Profile, { EditProfilePage } from '@/pages/customer/Profile'
import Wishlist from '@/pages/customer/Wishlist'
import OrderTracking from '@/pages/customer/OrderTracking'
import OrderReceipt from '@/pages/customer/OrderReceipt'
import AddressBook from '@/pages/customer/AddressBook'
import ExchangeRewards from '@/pages/customer/ExchangeRewards'
import EarnPoints from '@/pages/customer/EarnPoints'
import PointsHistory from '@/pages/customer/PointsHistory'
import RedeemRewards from '@/pages/customer/RedeemRewards'
import MyCoupons from '@/pages/customer/MyCoupons'
import RewardDetail from '@/pages/customer/RewardDetail'
import LuckyBox from '@/pages/customer/LuckyBox'
import FlashSale from '@/pages/customer/FlashSale'
import SearchPage from '@/pages/customer/SearchPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
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

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-100 border-t-purple-700" />
    </div>
  )
}

function LazyPage({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search])

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
  if (isLoading) return <PageLoader />

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
          <ScrollToTop />
          <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />

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
            <Route path="profile/rewards" element={
              <RequireAuth>
                <ExchangeRewards />
              </RequireAuth>
            } />
            <Route path="profile/rewards/redeem" element={
              <RequireAuth>
                <RedeemRewards />
              </RequireAuth>
            } />
            <Route path="profile/rewards/earn" element={
              <RequireAuth>
                <EarnPoints />
              </RequireAuth>
            } />
            <Route path="profile/rewards/history" element={
              <RequireAuth>
                <PointsHistory />
              </RequireAuth>
            } />
            <Route path="profile/rewards/coupons" element={
              <RequireAuth>
                <MyCoupons />
              </RequireAuth>
            } />
            <Route path="profile/rewards/:id" element={
              <RequireAuth>
                <RewardDetail />
              </RequireAuth>
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
              <PrintPreviewPage />
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
