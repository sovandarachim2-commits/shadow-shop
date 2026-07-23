import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Filter, RefreshCw, Pencil, Package, X, Printer, Clock, Check, Truck, DollarSign, CreditCard } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Badge, OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import NewOrder from './NewOrder'
import { EditOrderModal } from './OrderDetail'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'printed', label: 'Printed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAGE_SIZE_OPTIONS = [100, 500, 1000]

const STATUS_FLOW = [
  { key: 'new', label: 'New', icon: Package },
  { key: 'printed', label: 'Printed', icon: Printer },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'packed', label: 'Packed', icon: Check },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'completed', label: 'Completed', icon: Check },
]

const PAYMENT_METHOD_LABELS = {
  bakong: 'Bakong KHQR',
  aba: 'ABA Bank',
  acleda: 'ACLEDA Bank',
  wing: 'Wing',
  cod: 'Cash on Delivery',
  cash: 'Cash',
  contact_sales: 'Contact Sales',
  other: 'Other',
}

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

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '-'
}

export default function OrderList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [editOrder, setEditOrder] = useState(null)
  const [payOrder, setPayOrder] = useState(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', search, status, paymentStatus, page, pageSize],
    queryFn: () => ordersApi.orders.list({
      search,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      page,
      page_size: pageSize,
    }).then((r) => r.data),
  })

  const { data: detailOrder, isLoading: detailLoading } = useQuery({
    queryKey: ['order', viewOrder?.id || editOrder?.id],
    queryFn: () => ordersApi.orders.get(viewOrder?.id || editOrder?.id).then((r) => r.data),
    enabled: !!(viewOrder?.id || editOrder?.id),
  })

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
  })

  const orders = data?.results || []
  const total = data?.count || 0
  const popupOrder = detailOrder || viewOrder
  const popupStatusIndex = popupOrder ? STATUS_FLOW.findIndex((s) => s.key === popupOrder.status) : -1
  const paymentLogoUrls = siteSettings?.payment_methods?.logo_urls || {}

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => ordersApi.orders.updateStatus(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] })
      refetch()
      toast.success('Status updated')
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to update status'),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ order, paymentMethod }) => ordersApi.orders.markPaid(order.id, {
      payment_method: paymentMethod,
    }),
    onSuccess: (_, { order }) => {
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
      setPayOrder(null)
      refetch()
      toast.success('Payment recorded')
    },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Failed to mark order as paid'),
  })

  return (
    <div className="animate-fade-in">
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
            <select className="select-field w-36" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="select-field w-36" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }}>
              <option value="">All Payment</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
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
              <Th>Customer Name</Th>
              <Th>Customer Phone</Th>
              <Th>Seller</Th>
              <Th>Print Status</Th>
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
            {isLoading && <LoadingRows cols={13} />}
            {!isLoading && orders.map((order, index) => (
              <Tr key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)}>
                <Td><span className="text-sm font-semibold text-gray-500">{(page - 1) * pageSize + index + 1}</span></Td>
                <Td>
                  <span className="font-mono font-semibold text-purple-700 text-sm">#{order.order_number}</span>
                  {order.is_draft && <span className="ml-2 text-xs text-gray-400">(Draft)</span>}
                </Td>
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
                <Td><span className="font-semibold">{formatCurrency(order.grand_total)}</span></Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {paymentLogoUrls[order.payment_method] && (
                      <img
                        src={paymentLogoUrls[order.payment_method]}
                        alt=""
                        className="h-4 w-4 rounded-full object-contain"
                      />
                    )}
                    {paymentMethodLabel(order.payment_method)}
                  </span>
                </Td>
                <Td><PaymentStatusBadge status={order.payment_status} /></Td>
                <Td><OrderStatusBadge status={order.status} /></Td>
                <Td><span className="text-sm text-gray-600">{order.delivery_by || order.out_delivery_by || '-'}</span></Td>
                <Td><span className="text-xs text-gray-500">{formatDateTime(order.created_at)}</span></Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    {order.payment_status !== 'paid' && (
                      <button
                        type="button"
                        disabled={markPaidMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedPaymentMethod(order.payment_method || 'cash')
                          setPayOrder(order)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:border-green-300 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <DollarSign size={14} />
                        Mark Paid
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setViewOrder(order)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditOrder(order)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
            {!isLoading && orders.length === 0 && (
              <tr><td colSpan={13}><EmptyState message="No orders found" icon={Filter} /></td></tr>
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
                <button type="button" onClick={() => navigate('/admin/print')} className="btn-secondary py-2">
                  <Printer size={15} />
                  Print
                </button>
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
                    {STATUS_FLOW.map((step, idx) => (
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
                  {popupOrder.status !== 'completed' && popupOrder.status !== 'cancelled' && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                      {STATUS_FLOW.filter((s) => s.key !== popupOrder.status).map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => updateStatusMutation.mutate({ id: popupOrder.id, status: s.key })}
                          disabled={updateStatusMutation.isPending}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-60"
                        >
                          → {s.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateStatusMutation.mutate({ id: popupOrder.id, status: 'cancelled' })}
                        disabled={updateStatusMutation.isPending}
                        className="ml-auto rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}
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
                        <p className="text-xs capitalize text-gray-500">{popupOrder.customer_detail?.province?.replace('_', ' ') || '-'}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <h3 className="section-title mb-3">Payment</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><PaymentStatusBadge status={popupOrder.payment_status} /></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">Method</span><span className="capitalize">{popupOrder.payment_method || '-'}</span></div>
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
                            <p className="mt-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{popupOrder.notes}</p>
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
            onSaved={() => {
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
                      className="h-full w-full object-contain p-1.5"
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
                onClick={() => markPaidMutation.mutate({ order: payOrder, paymentMethod: selectedPaymentMethod })}
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
    </div>
  )
}
