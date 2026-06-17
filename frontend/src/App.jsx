import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
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
const Scanner = lazy(() => import('@/pages/admin/operations/Scanner'))
const PrepareItems = lazy(() => import('@/pages/admin/operations/PrepareItems'))
const PrepareSet = lazy(() => import('@/pages/admin/operations/PrepareSet'))
const PrepareSetHistory = lazy(() => import('@/pages/admin/operations/PrepareSetHistory'))
const PrepareItemsHistory = lazy(() => import('@/pages/admin/operations/PrepareItemsHistory'))
const OutItems = lazy(() => import('@/pages/admin/operations/OutItems'))
const OutItemsHistory = lazy(() => import('@/pages/admin/operations/OutItemsHistory'))
const DeliveryCustomer = lazy(() => import('@/pages/admin/operations/DeliveryCustomer'))
const DeliveryByConfig = lazy(() => import('@/pages/admin/operations/DeliveryByConfig'))
import Delivery from '@/pages/admin/operations/Delivery'
import Revenue from '@/pages/admin/finance/Revenue'
import Expenses from '@/pages/admin/finance/Expenses'
import ProfitReport from '@/pages/admin/finance/ProfitReport'
import SalesReport from '@/pages/admin/reports/SalesReport'
import ProductReport from '@/pages/admin/reports/ProductReport'
import InventoryReport from '@/pages/admin/reports/InventoryReport'
import Users from '@/pages/admin/users/Users'
import Roles from '@/pages/admin/users/Roles'
import ActivityLogs from '@/pages/admin/users/ActivityLogs'
import Settings from '@/pages/admin/settings/Settings'

// Customer Pages
import Home from '@/pages/customer/Home'
import ProductList from '@/pages/customer/ProductList'
import ProductDetail from '@/pages/customer/ProductDetail'
import Cart from '@/pages/customer/Cart'
import Checkout from '@/pages/customer/Checkout'
import MyOrders from '@/pages/customer/MyOrders'
import OrderSuccess from '@/pages/customer/OrderSuccess'
import Profile from '@/pages/customer/Profile'
import Wishlist from '@/pages/customer/Wishlist'
import OrderTracking from '@/pages/customer/OrderTracking'
import AddressBook from '@/pages/customer/AddressBook'
import LuckyBox from '@/pages/customer/LuckyBox'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
})

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthBootstrap />
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* Customer App */}
          <Route path="/" element={<RequireStorefront><CustomerLayout /></RequireStorefront>}>
            <Route index element={<Home />} />
            <Route path="shop" element={<ProductList />} />
            <Route path="lucky-box" element={<LuckyBox />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={
              <RequireAuth>
                <Checkout />
              </RequireAuth>
            } />
            <Route path="order-success" element={<OrderSuccess />} />
            <Route path="my-orders" element={<MyOrders />} />
            <Route path="my-orders/:id" element={<OrderTracking />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="profile" element={<Profile />} />
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
            <Route index element={<Dashboard />} />

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
            <Route path="delivery" element={<Delivery />} />

            {/* Finance */}
            <Route path="finance/revenue" element={<Revenue />} />
            <Route path="finance/expenses" element={<Expenses />} />
            <Route path="finance/profit" element={<ProfitReport />} />

            {/* Reports */}
            <Route path="reports/sales" element={<SalesReport />} />
            <Route path="reports/products" element={<ProductReport />} />
            <Route path="reports/inventory" element={<InventoryReport />} />

            {/* Administration */}
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
  )
}
