import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Filter, RefreshCw, Pencil, Package, X, Printer, Clock, Check, Truck, DollarSign, CreditCard, MoreVertical, RotateCcw, Ban, ShoppingCart, CheckCircle2, AlertCircle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { KpiCard } from '@/components/ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Badge, OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { storesApi } from '@/api/stores'
import useAuthStore from '@/store/authStore'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { localizeOrderNote, provinceKhmerLabel } from '@/utils/addressHelpers'
import { KHMER_TEXT_STYLE } from '@/utils/constants'
import { OrderHistoryModal, PaymentHistoryModal, PaymentMethodButton, paymentMethodLabel } from '@/components/orders/PaymentHistory'
import ContactSalesReceiptModal from '@/components/orders/ContactSalesReceiptModal'
import NewOrder from './NewOrder'
import { EditOrderModal } from './OrderDetail'
import { PrintPreview } from '@/pages/admin/operations/PrintCenter'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'printed', label: 'Printed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'returned', label: 'Returned' },
]

const PAGE_SIZE_OPTIONS = [100, 500, 1000]

const STATUS_FLOW = [
  { key: 'new', label: 'New', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'printed', label: 'Printed', icon: Printer },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'packed', label: 'Packed', icon: Check },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'completed', label: 'Completed', icon: Check },
]

const SELLER_STATUS_KEYS = ['new', 'confirmed']
const SELLER_STATUS_FLOW = STATUS_FLOW.filter((status) => SELLER_STATUS_KEYS.includes(status.key))

const isPrintedOrder = (order) => Boolean(order?.printed_at || order?.status === 'printed')

const PAYMENT_METHOD_OPTIONS = [
  'cash',
  'aba',
  'bakong',
  'acleda',
  'wing',
  'cod',
  'contact_sales',
  'other',
]

export default function OrderList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const isSeller = currentUser?.role === 'seller'
  const isStorePartner = ['store_owner', 'store_manager'].includes(currentUser?.role)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [deliveryBy, setDeliveryBy] = useState('')
  const [storeFilter, setStoreFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [editOrder, setEditOrder] = useState(null)
  const [actionDropdownId, setActionDropdownId] = useState(null)
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [payOrder, setPayOrder] = useState(null)
  const [paymentHistoryOrder, setPaymentHistoryOrder] = useState(null)
  const [orderHistoryOrder, setOrderHistoryOrder] = useState(null)
  const [contactSalesReceipt, setContactSalesReceipt] = useState(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash')
  const [transactionReference, setTransactionReference] = useState('')
  const [confirm, ConfirmDialog] = useConfirm()

  useEffect(() => {
    if (!actionDropdownId) return
    const handleClickOutside = () => setActionDropdownId(null)
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [actionDropdownId])

  const { data: storesData } = useQuery({
    queryKey: ['admin-stores-filter'],
    queryFn: () => storesApi.admin.listStores({ page_size: 200 }).then((r) => r.data?.results || r.data || []),
    enabled: !isStorePartner,
  })
  const stores = Array.isArray(storesData) ? storesData : (storesData?.results || [])

  const { data: storeCountsData } = useQuery({
    queryKey: ['orders-store-counts'],
    queryFn: () => ordersApi.orders.storeCounts().then((r) => r.data),
    enabled: !isStorePartner,
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['orders-stats', search, storeFilter],
    queryFn: () => ordersApi.orders.statistics({
      search: search || undefined,
      store: storeFilter || undefined,
    }).then((r) => r.data),
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', search, status, paymentStatus, paymentMethod, deliveryBy, storeFilter, page, pageSize],
    queryFn: () => ordersApi.orders.list({
      search,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      payment_method: paymentMethod || undefined,
      delivery_by: deliveryBy || undefined,
      store: storeFilter || undefined,
      page,
      page_size: pageSize,
    }).then((r) => r.data),
  })

  const { data: detailOrder, isLoading: detailLoading } = useQuery({
    queryKey: ['order', viewOrder?.id || editOrder?.id],
    queryFn: () => ordersApi.orders.get(viewOrder?.id || editOrder?.id).then((r) => r.data),
    enabled: !!(viewOrder?.id || editOrder?.id),
  })

  const { data: paymentHistoryDetail } = useQuery({
    queryKey: ['order', paymentHistoryOrder?.id, 'payment-history'],
    queryFn: () => ordersApi.orders.get(paymentHistoryOrder.id).then((r) => r.data),
    enabled: !!paymentHistoryOrder?.id,
  })

  const { data: orderHistoryDetail } = useQuery({
    queryKey: ['order', orderHistoryOrder?.id, 'order-history'],
    queryFn: () => ordersApi.orders.get(orderHistoryOrder.id).then((r) => r.data),
    enabled: !!orderHistoryOrder?.id,
  })

  const { data: receiptDetail, isLoading: isReceiptLoading } = useQuery({
    queryKey: ['order', receiptOrder?.id, 'receipt-detail'],
    queryFn: () => ordersApi.orders.get(receiptOrder.id).then((r) => r.data),
    enabled: !!receiptOrder?.id,
  })

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
  })

  const orders = data?.results || []
  const total = data?.count || 0
  const popupOrder = detailOrder || viewOrder
  const visibleStatusOptions = isSeller
    ? STATUS_OPTIONS.filter((option) => !option.value || SELLER_STATUS_KEYS.includes(option.value))
    : STATUS_OPTIONS
  const visibleStatusFlow = isSeller ? SELLER_STATUS_FLOW : STATUS_FLOW
  const popupStatusIndex = popupOrder ? visibleStatusFlow.findIndex((s) => s.key === popupOrder.status) : -1
  const paymentLogoUrls = siteSettings?.payment_methods?.logo_urls || {}
  const deliveryByOptions = Array.from(new Set(
    [
      deliveryBy,
      ...orders.map((order) => order.delivery_by || order.out_delivery_by || ''),
    ].filter(Boolean)
  )).sort((a, b) => a.localeCompare(b))
  const isNewContactSalesOrder = (order) => (
    order?.payment_method === 'contact_sales' &&
    order?.status === 'new'
  )

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }) => ordersApi.orders.updateStatus(id, { status, note }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['orders-store-counts'] })
      queryClient.invalidateQueries({ queryKey: ['orders-stats'] })
      refetch()
      toast.success('Status updated')
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update status'),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ order, paymentMethod, transactionReference: reference }) => ordersApi.orders.markPaid(order.id, {
      payment_method: paymentMethod,
      transaction_reference: reference.trim(),
    }),
    onSuccess: (_, { order }) => {
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      queryClient.invalidateQueries({ queryKey: ['orders-store-counts'] })
      queryClient.invalidateQueries({ queryKey: ['orders-stats'] })
      setPayOrder(null)
      setTransactionReference('')
      refetch()
      toast.success('Payment recorded')
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to mark order as paid'),
  })

  const handleCancelOrder = async (order) => {
    const reason = await confirm(
      'Cancel this order?',
      `Order #${order.order_number} will be marked as cancelled.`,
      {
        confirmText: 'Cancel Order',
        cancelText: 'Keep Order',
        tone: 'danger',
        icon: 'warning',
        reasonLabel: 'Reason',
        reasonPlaceholder: 'Why is this order cancelled?',
        reasonRequired: true,
      },
    )
    if (!reason) return
    updateStatusMutation.mutate({ id: order.id, status: 'cancelled', note: reason })
  }

  const handleReturnOrder = async (order) => {
    const reason = await confirm(
      'Return this order?',
      `Order #${order.order_number} will be marked as returned and items will be restored to inventory.`,
      {
        confirmText: 'Confirm Return',
        cancelText: 'Keep Order',
        tone: 'warning',
        icon: 'warning',
        reasonLabel: 'Return Reason',
        reasonPlaceholder: 'Why is this order being returned?',
        reasonRequired: false,
      },
    )
    if (reason === false || reason === null) return
    const note = typeof reason === 'string' && reason.trim() ? reason.trim() : 'Customer returned order'
    updateStatusMutation.mutate({ id: order.id, status: 'returned', note })
  }

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader
        title="Orders"
        subtitle={`${total} total orders`}
        breadcrumbs={[{ label: 'Sales' }, { label: 'Orders' }]}
        actions={
          <button type="button" onClick={() => setShowNewOrder(true)} className="btn-primary">
            <Plus size={16} /> New Order
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          compact
          title="Total Orders"
          value={statsData?.total_orders ?? total}
          subtitle={storeFilter ? 'Filtered store' : (isStorePartner ? 'Your store' : 'All stores')}
          icon={ShoppingCart}
          color="blue"
          loading={statsLoading}
          onClick={() => {
            setStatus('')
            setPaymentStatus('')
            setPage(1)
          }}
          className={!status && !paymentStatus ? 'ring-2 ring-blue-500/20' : ''}
        />
        <KpiCard
          compact
          title="Total Revenue"
          value={formatCurrency(statsData?.total_revenue || 0)}
          subtitle="Gross sales"
          icon={DollarSign}
          color="green"
          loading={statsLoading}
        />
        <KpiCard
          compact
          title="Pending Orders"
          value={statsData?.pending_orders ?? 0}
          subtitle={statsData?.unprinted_orders ? `${statsData.unprinted_orders} awaiting print` : 'New & confirmed'}
          icon={Clock}
          color="yellow"
          loading={statsLoading}
          onClick={() => {
            setStatus(status === 'new' ? '' : 'new')
            setPage(1)
          }}
          className={status === 'new' ? 'ring-2 ring-yellow-500/20' : ''}
        />
        <KpiCard
          compact
          title="Completed"
          value={statsData?.completed_orders ?? 0}
          subtitle="Delivered & fulfilled"
          icon={CheckCircle2}
          color="purple"
          loading={statsLoading}
          onClick={() => {
            setStatus(status === 'completed' ? '' : 'completed')
            setPage(1)
          }}
          className={status === 'completed' ? 'ring-2 ring-purple-500/20' : ''}
        />
        <KpiCard
          compact
          title="Unpaid Orders"
          value={statsData?.unpaid_orders ?? 0}
          subtitle="Payment pending"
          icon={AlertCircle}
          color="pink"
          loading={statsLoading}
          onClick={() => {
            setPaymentStatus(paymentStatus === 'unpaid' ? '' : 'unpaid')
            setPage(1)
          }}
          className={paymentStatus === 'unpaid' ? 'ring-2 ring-pink-500/20' : ''}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <SearchFilter
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search orders, customers..."
          >
            {!isStorePartner && (
              <select className="select-field w-56 shrink-0" value={storeFilter} onChange={(e) => { setStoreFilter(e.target.value); setPage(1) }}>
                <option value="">All Stores ({storeCountsData?.total ?? orders.length})</option>
                <option value="official">🏢 Official Store ({storeCountsData?.official ?? 0})</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏪 {s.name} ({storeCountsData?.stores?.[s.id] ?? storeCountsData?.stores?.[String(s.id)] ?? 0})
                  </option>
                ))}
              </select>
            )}
            <select className="select-field w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              {visibleStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="select-field w-36" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }}>
              <option value="">All Payment</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <select className="select-field w-44" value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1) }}>
              <option value="">All Methods</option>
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>{paymentMethodLabel(method)}</option>
              ))}
            </select>
            <select className="select-field w-44" value={deliveryBy} onChange={(e) => { setDeliveryBy(e.target.value); setPage(1) }}>
              <option value="">All Delivery By</option>
              {deliveryByOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button onClick={() => refetch()} className="btn-secondary py-2">
              <RefreshCw size={15} />
            </button>
          </SearchFilter>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Order Code</Th>
              {!isStorePartner && <Th>Store</Th>}
              <Th>Customer Name</Th>
              <Th>Customer Phone</Th>
              <Th>Seller</Th>
              <Th>Print Status</Th>
              <Th>Print Date</Th>
              <Th>Amount</Th>
              <Th>Payment Method</Th>
              <Th>Payment Status</Th>
              <Th>Status</Th>
              <Th>Delivery By</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={!isStorePartner ? 15 : 14} />}
            {!isLoading && orders.map((order, index) => {
              const needsSellerConfirm = isNewContactSalesOrder(order)
              const sellerReadOnlyPrinted = isSeller && isPrintedOrder(order)
              const isOrderPrinted = Boolean(order.printed_at || ['printed', 'preparing', 'packed', 'shipped', 'completed'].includes(order.status) || isPrintedOrder(order))
              const isNearBottom = orders.length > 2 && index >= orders.length - 2
              const canCancel = !isOrderPrinted && !['completed', 'cancelled', 'returned'].includes(order.status)
              const canReturn = isOrderPrinted && order.status !== 'returned' && order.status !== 'cancelled'
              return (
              <Tr
                key={order.id}
                onClick={() => setViewOrder(order)}
                className={needsSellerConfirm ? 'border-l-4 border-red-500 bg-red-50 hover:bg-red-100/80' : ''}
              >
                <Td><span className="text-sm font-semibold text-gray-500">{(page - 1) * pageSize + index + 1}</span></Td>
                <Td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setReceiptOrder(order)
                    }}
                    className={`font-mono text-sm font-semibold transition hover:underline underline-offset-2 ${
                      needsSellerConfirm ? 'text-red-700 hover:text-red-800' : 'text-purple-700 hover:text-purple-900'
                    }`}
                    title="Click to view receipt"
                  >
                    #{order.order_number}
                  </button>
                  {order.is_draft && <span className="ml-2 text-xs text-gray-400">(Draft)</span>}
                </Td>
                {!isStorePartner && (
                  <Td>
                    {order.store_name ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 whitespace-nowrap">
                        🏪 {order.store_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 whitespace-nowrap">
                        🏢 Official Store
                      </span>
                    )}
                  </Td>
                )}
                <Td><span className="text-sm font-medium text-gray-900">{order.customer_name}</span></Td>
                <Td>
                  <span className="text-sm text-gray-600">{order.customer_phone}</span>
                </Td>
                <Td><span className="text-sm">{order.seller_name}</span></Td>
                <Td>
                  {order.printed_at || order.status === 'printed' ? (
                    <Badge variant="indigo" dot>Printed</Badge>
                  ) : (
                    <Badge variant="warning" dot>Unprinted</Badge>
                  )}
                </Td>
                <Td>
                  {order.printed_at ? (
                    <span className="text-xs font-semibold text-gray-600">
                      {formatDateTime(order.printed_at)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </Td>
                <Td><span className="font-semibold">{formatCurrency(order.grand_total)}</span></Td>
                <Td>
                  <PaymentMethodButton
                    order={order}
                    logoUrls={paymentLogoUrls}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPaymentHistoryOrder(order)
                    }}
                    compact
                  />
                </Td>
                <Td><PaymentStatusBadge status={order.payment_status} /></Td>
                <Td><OrderStatusBadge status={order.status} /></Td>
                <Td><span className="text-sm text-gray-600">{order.delivery_by || order.out_delivery_by || '-'}</span></Td>
                <Td>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOrderHistoryOrder(order)
                    }}
                    className="text-left text-xs font-semibold text-gray-500 underline-offset-2 transition hover:text-purple-700 hover:underline"
                    title="View order history"
                  >
                    {formatDateTime(order.created_at)}
                  </button>
                </Td>
                <Td>
                  <div className="relative flex items-center gap-1.5">
                    {!isSeller && order.payment_status !== 'paid' && (
                      <button
                        type="button"
                        disabled={markPaidMutation.isPending}
                        title="Mark Paid"
                        aria-label="Mark order as paid"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPaymentMethod(order.payment_method || 'cash')
                          setTransactionReference('')
                          setPayOrder(order)
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 transition-colors hover:border-green-300 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <DollarSign size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      title="View"
                      aria-label="View order"
                      onClick={(e) => {
                        e.stopPropagation()
                        setViewOrder(order)
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <Eye size={16} />
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        title="More actions"
                        aria-label="More actions"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionDropdownId(actionDropdownId === order.id ? null : order.id)
                        }}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                          actionDropdownId === order.id
                            ? 'border-purple-300 bg-purple-50 text-purple-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {actionDropdownId === order.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute right-0 z-50 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg ring-1 ring-black/5 ${
                            isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionDropdownId(null)
                              setEditOrder(order)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            <Pencil size={14} className="text-blue-600" />
                            <span>Edit</span>
                          </button>
                          {canReturn && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionDropdownId(null)
                                handleReturnOrder(order)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                            >
                              <RotateCcw size={14} className="text-amber-600" />
                              <span>Return</span>
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionDropdownId(null)
                                handleCancelOrder(order)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              <Ban size={14} className="text-red-600" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Td>
              </Tr>
              )
            })}
            {!isLoading && orders.length === 0 && (
              <tr><td colSpan={!isStorePartner ? 15 : 14}><EmptyState message="No orders found" icon={Filter} /></td></tr>
            )}
          </Tbody>
        </Table>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-gray-500">
              Showing {orders.length} of {total}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select-field w-32 py-1.5 text-sm"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} rows</option>
                ))}
              </select>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 text-sm disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= total} className="btn-secondary py-1.5 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {viewOrder && popupOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-3 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-7xl overflow-y-auto rounded-2xl bg-gray-50 p-5 shadow-2xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-black text-gray-950">Order #{popupOrder.order_number}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewOrder(null)
                    setEditOrder(popupOrder)
                  }}
                  className="btn-secondary py-2"
                >
                  <Pencil size={15} />
                  Edit
                </button>
                {!isSeller && (
                  <button type="button" onClick={() => navigate('/admin/print')} className="btn-secondary py-2">
                    <Printer size={15} />
                    Print
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewOrder(null)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close order detail"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div className="space-y-4 p-5">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2">
                    {visibleStatusFlow.map((step, idx) => (
                      <div key={step.key} className="flex min-w-[96px] flex-1 flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          idx <= popupStatusIndex ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <step.icon size={16} />
                        </div>
                        <span className="mt-1 text-xs font-medium text-gray-600">{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h3 className="section-title mb-4">Order Items</h3>
                      <div className="space-y-3">
                        {(popupOrder.items || []).map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                              {item.product_image ? (
                                <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Package size={16} className="text-gray-300" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-900">{item.product_name}</p>
                              <p className="text-xs text-gray-400">{item.product_code}</p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="font-bold text-gray-900">x{item.quantity}</p>
                              <p className="text-xs text-gray-400">@ {formatCurrency(item.unit_price)}</p>
                            </div>
                            <p className="w-24 text-right text-sm font-bold text-gray-900">{formatCurrency(item.total_price)}</p>
                          </div>
                        ))}
                        {(!popupOrder.items || popupOrder.items.length === 0) && (
                          <p className="rounded-xl bg-gray-50 px-3 py-8 text-center text-sm text-gray-400">No order items found</p>
                        )}
                      </div>
                      <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(popupOrder.subtotal || 0)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Delivery Fee</span><span>{formatCurrency(popupOrder.delivery_fee || 0)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span className="text-red-500">-{formatCurrency(popupOrder.discount || 0)}</span></div>
                        <div className="flex justify-between border-t border-gray-100 pt-3 text-lg font-black">
                          <span>Grand Total</span>
                          <span className="text-purple-600">{formatCurrency(popupOrder.grand_total || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h3 className="section-title mb-4">Status History</h3>
                      <div className="space-y-3">
                        {(popupOrder.status_history || []).map((h) => (
                          <div key={h.id} className="flex items-start gap-3">
                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <OrderStatusBadge status={h.status} />
                                <span className="text-xs text-gray-400">{formatDateTime(h.created_at)}</span>
                              </div>
                              {h.note && <p className="mt-0.5 text-xs text-gray-500">{h.note}</p>}
                              <p className="text-xs text-gray-400">by {h.changed_by_name}</p>
                            </div>
                          </div>
                        ))}
                        {(!popupOrder.status_history || popupOrder.status_history.length === 0) && (
                          <p className="text-sm text-gray-400">No status history.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h3 className="section-title mb-3">Customer</h3>
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold text-gray-900">{popupOrder.customer_detail?.name || popupOrder.customer_name || '-'}</p>
                        <p className="text-gray-500">{popupOrder.customer_detail?.phone || popupOrder.customer_phone || '-'}</p>
                        <p className="text-xs text-gray-500">{popupOrder.customer_detail?.address || '-'}</p>
                        <p className="text-xs text-gray-500" style={KHMER_TEXT_STYLE}>{provinceKhmerLabel(popupOrder.customer_detail?.province) || '-'}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h3 className="section-title mb-3">Payment</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><PaymentStatusBadge status={popupOrder.payment_status} /></div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-gray-500">Method</span>
                          <PaymentMethodButton
                            order={popupOrder}
                            logoUrls={paymentLogoUrls}
                            onClick={() => setPaymentHistoryOrder(popupOrder)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h3 className="section-title mb-3">Order Info</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-3"><span className="text-gray-500">Order #</span><span className="font-mono font-bold text-purple-700">#{popupOrder.order_number}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-gray-500">Created</span><span className="text-right text-xs">{formatDateTime(popupOrder.created_at)}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-gray-500">Seller</span><span className="text-right">{popupOrder.seller_name}</span></div>
                        {popupOrder.notes && (
                          <div>
                            <span className="text-gray-500">Notes</span>
                            <p className="mt-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-600" style={KHMER_TEXT_STYLE}>{localizeOrderNote(popupOrder.notes)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {editOrder && (
        detailLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
              <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
              </div>
            </div>
          </div>
        ) : (
          <EditOrderModal
            order={detailOrder}
            onClose={() => setEditOrder(null)}
            onSaved={(savedOrder) => {
              if (savedOrder?.id) {
                queryClient.setQueryData(['order', savedOrder.id], savedOrder)
                setViewOrder((current) => current?.id === savedOrder.id ? savedOrder : current)
              }
              if (savedOrder?.contact_sales_receipt_message) {
                setContactSalesReceipt({
                  order: savedOrder,
                  message: savedOrder.contact_sales_receipt_message,
                  queued: !!savedOrder.contact_sales_customer_message_queued,
                })
              }
              setEditOrder(null)
              refetch()
            }}
          />
        )
      )}

      <Modal
        isOpen={showNewOrder}
        onClose={() => setShowNewOrder(false)}
        title="Create New Order"
        size="full"
        className="max-h-[92vh] overflow-hidden"
      >
        <NewOrder
          embedded
          onCreated={(order) => {
            setShowNewOrder(false)
            refetch()
            navigate(`/admin/orders/${order.id}`)
          }}
        />
      </Modal>

      <Modal
        isOpen={!!payOrder}
        onClose={() => {
          if (!markPaidMutation.isPending) setPayOrder(null)
        }}
        title="Mark Order As Paid"
        size="sm"
      >
        {payOrder && (
          <div className="space-y-5 p-6">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Order</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-purple-700">#{payOrder.order_number}</span>
                <span className="text-sm font-black text-gray-950">{formatCurrency(payOrder.grand_total)}</span>
              </div>
            </div>

            <div>
              <label className="label">Payment Method</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {paymentLogoUrls[selectedPaymentMethod] ? (
                    <img
                      src={paymentLogoUrls[selectedPaymentMethod]}
                      alt={`${paymentMethodLabel(selectedPaymentMethod)} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <CreditCard size={18} className="text-gray-400" />
                  )}
                </div>
                <select
                  className="select-field"
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <option key={method} value={method}>{paymentMethodLabel(method)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Transaction ID / Reference <span className="font-normal text-gray-400">(optional)</span></label>
              <input
                type="text"
                maxLength={100}
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="input-field"
                placeholder="Bank transaction or receipt reference"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setPayOrder(null)}
                disabled={markPaidMutation.isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => markPaidMutation.mutate({ order: payOrder, paymentMethod: selectedPaymentMethod, transactionReference })}
                disabled={markPaidMutation.isPending || !selectedPaymentMethod}
                className="btn-primary bg-green-600 hover:bg-green-700 disabled:opacity-60"
              >
                <DollarSign size={16} />
                {markPaidMutation.isPending ? 'Saving...' : 'Mark Paid'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PaymentHistoryModal
        order={paymentHistoryOrder ? (paymentHistoryDetail || paymentHistoryOrder) : null}
        onClose={() => setPaymentHistoryOrder(null)}
      />
      <OrderHistoryModal
        order={orderHistoryOrder ? (orderHistoryDetail || orderHistoryOrder) : null}
        onClose={() => setOrderHistoryOrder(null)}
      />
      <ContactSalesReceiptModal
        order={contactSalesReceipt?.order}
        message={contactSalesReceipt?.message}
        queued={contactSalesReceipt?.queued}
        onClose={() => setContactSalesReceipt(null)}
      />
      {receiptOrder && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
          onClick={() => setReceiptOrder(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="no-print flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
              <div>
                <h3 className="text-base font-bold text-gray-900">Receipt Preview</h3>
                <p className="text-xs font-mono font-semibold text-purple-700">#{receiptOrder.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="print-preview-window flex max-h-[calc(92vh-64px)] flex-col items-center overflow-auto bg-gray-50 p-4 text-gray-950">
              {isReceiptLoading || !receiptDetail ? (
                <div className="w-full rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <Printer size={28} className="mx-auto mb-2 text-gray-300 animate-pulse" />
                  <p className="text-sm font-semibold text-gray-500">Loading receipt...</p>
                </div>
              ) : (
                <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                  <PrintPreview
                    order={receiptDetail}
                    type="receipt"
                    printLogoUrl={siteSettings?.print_logo_url || null}
                    printLogoSize={siteSettings?.print_logo_size || 64}
                    printQrSize={siteSettings?.print_qr_size || 68}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}
