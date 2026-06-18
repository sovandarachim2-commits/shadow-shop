import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer, Truck, Check, X, Package, Clock, DollarSign, Pencil, Search, Plus, Minus, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

const STATUS_FLOW = [
  { key: 'new', label: 'New', icon: Package },
  { key: 'printed', label: 'Printed', icon: Printer },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'packed', label: 'Packed', icon: Check },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'completed', label: 'Completed', icon: Check },
]

const PROVINCES = [
  { value: 'phnom_penh', label: 'Phnom Penh' },
  { value: 'siem_reap', label: 'Siem Reap' },
  { value: 'battambang', label: 'Battambang' },
  { value: 'kampong_cham', label: 'Kampong Cham' },
  { value: 'kandal', label: 'Kandal' },
  { value: 'takeo', label: 'Takeo' },
  { value: 'prey_veng', label: 'Prey Veng' },
  { value: 'other', label: 'Other' },
]

export function EditOrderModal({ order, onClose, onSaved }) {
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', province: 'phnom_penh', notes: '' })
  const [orderForm, setOrderForm] = useState({
    payment_status: 'unpaid',
    payment_method: 'cod',
    delivery_fee: 0,
    discount: 0,
    notes: '',
    is_draft: false,
  })
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!order) return
    setCustomer({
      name: order.customer_detail?.name || '',
      phone: order.customer_detail?.phone || '',
      address: order.customer_detail?.address || '',
      province: order.customer_detail?.province || 'phnom_penh',
      notes: order.customer_detail?.notes || '',
    })
    setOrderForm({
      payment_status: order.payment_status || 'unpaid',
      payment_method: order.payment_method || 'cod',
      delivery_fee: order.delivery_fee || 0,
      discount: order.discount || 0,
      notes: order.notes || '',
      is_draft: !!order.is_draft,
    })
    setItems((order.items || []).map((item) => ({
      product: {
        id: item.product,
        name: item.product_name,
        code: item.product_code,
        primary_image: item.product_image,
      },
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
      discount: item.discount || 0,
    })))
  }, [order])

  const { data: products = [], isLoading: searching } = useQuery({
    queryKey: ['edit-order-products', search],
    queryFn: () => productsApi.products.list({ search, page_size: 8, is_active: true }).then((r) => r.data.results),
    enabled: search.trim().length > 0,
  })

  const subtotal = items.reduce((sum, item) => sum + (Number(item.unit_price || 0) * Number(item.quantity || 0)) - Number(item.discount || 0), 0)
  const grandTotal = subtotal + Number(orderForm.delivery_fee || 0) - Number(orderForm.discount || 0)

  const addProduct = (product) => {
    setItems((prev) => {
      const exists = prev.find((item) => item.product.id === product.id)
      if (exists) {
        return prev.map((item) => item.product.id === product.id ? { ...item, quantity: Number(item.quantity || 0) + 1 } : item)
      }
      return [...prev, {
        product,
        quantity: 1,
        unit_price: product.wholesale_price,
        cost_price: product.cost_price,
        discount: 0,
      }]
    })
    setSearch('')
  }

  const updateItem = (productId, patch) => {
    setItems((prev) => prev.map((item) => item.product.id === productId ? { ...item, ...patch } : item))
  }

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const saveMutation = useMutation({
    mutationFn: () => ordersApi.orders.adminUpdate(order.id, {
      customer_info: customer,
      ...orderForm,
      delivery_fee: Number(orderForm.delivery_fee || 0),
      discount: Number(orderForm.discount || 0),
      items: items.map((item) => ({
        product: item.product.id,
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        cost_price: Number(item.cost_price || 0),
        discount: Number(item.discount || 0),
      })),
    }),
    onSuccess: (res) => {
      toast.success('Order updated')
      onSaved(res.data)
    },
    onError: (err) => {
      const itemError = err?.response?.data?.items?.[0]
      toast.error(itemError || err?.response?.data?.detail || 'Failed to update order')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-3 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">Edit Order</p>
            <h2 className="text-xl font-black text-gray-950">#{order.order_number}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={22} />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-gray-100 p-5">
              <h3 className="section-title mb-4">Customer</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Name</label>
                  <input className="input-field" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input-field" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Address</label>
                  <textarea className="input-field resize-none" rows={2} value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
                </div>
                <div>
                  <label className="label">Province</label>
                  <select className="select-field" value={customer.province} onChange={(e) => setCustomer({ ...customer, province: e.target.value })}>
                    {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Customer Notes</label>
                  <input className="input-field" value={customer.notes} onChange={(e) => setCustomer({ ...customer, notes: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="section-title">Products</h3>
                <div className="relative w-full sm:w-80">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input-field pl-9" placeholder="Search product to add..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  {search.trim() && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-gray-100 bg-white p-1 shadow-xl">
                      {searching && <p className="p-3 text-center text-sm text-gray-400">Searching...</p>}
                      {!searching && products.map((product) => (
                        <button key={product.id} type="button" onClick={() => addProduct(product)}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-purple-50">
                          <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100">
                            {product.primary_image ? <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover" /> : <Package size={16} className="m-3 text-gray-300" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{product.name}</p>
                            <p className="text-xs text-gray-400">{product.code}</p>
                          </div>
                          <span className="text-sm font-bold text-purple-600">{formatCurrency(product.wholesale_price)}</span>
                        </button>
                      ))}
                      {!searching && products.length === 0 && <p className="p-3 text-center text-sm text-gray-400">No products found</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.product.id} className="rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-white">
                        {item.product.primary_image ? <img src={item.product.primary_image} alt={item.product.name} className="h-full w-full object-cover" /> : <Package size={16} className="m-4 text-gray-300" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{item.product.name}</p>
                        <p className="text-xs text-gray-400">{item.product.code}</p>
                      </div>
                      <button onClick={() => removeItem(item.product.id)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_1fr_1fr] sm:items-end">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateItem(item.product.id, { quantity: Math.max(1, Number(item.quantity || 1) - 1) })} className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white"><Minus size={12} /></button>
                        <input className="w-14 rounded-lg border border-gray-200 bg-white py-1.5 text-center text-sm font-semibold" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(item.product.id, { quantity: Number(e.target.value || 1) })} />
                        <button onClick={() => updateItem(item.product.id, { quantity: Number(item.quantity || 1) + 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white"><Plus size={12} /></button>
                      </div>
                      <input className="input-field py-1.5 text-sm" type="number" step="0.01" value={item.unit_price} onChange={(e) => updateItem(item.product.id, { unit_price: e.target.value })} />
                      <input className="input-field py-1.5 text-sm" type="number" step="0.01" value={item.discount} onChange={(e) => updateItem(item.product.id, { discount: e.target.value })} />
                      <p className="text-right text-sm font-bold text-gray-900">{formatCurrency((Number(item.unit_price || 0) * Number(item.quantity || 0)) - Number(item.discount || 0))}</p>
                    </div>
                  </div>
                ))}
                {items.length === 0 && <p className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-400">No products in this order</p>}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 p-5">
              <h3 className="section-title mb-4">Order</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Payment Status</label>
                  <select className="select-field" value={orderForm.payment_status} onChange={(e) => setOrderForm({ ...orderForm, payment_status: e.target.value })}>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select className="select-field" value={orderForm.payment_method} onChange={(e) => setOrderForm({ ...orderForm, payment_method: e.target.value })}>
                    <option value="bakong">Bakong KHQR</option>
                    <option value="aba">ABA Bank</option>
                    <option value="acleda">ACLEDA Bank</option>
                    <option value="wing">Wing</option>
                    <option value="cod">Cash on Delivery</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Delivery Fee</label>
                  <input className="input-field" type="number" step="0.01" value={orderForm.delivery_fee} onChange={(e) => setOrderForm({ ...orderForm, delivery_fee: e.target.value })} />
                </div>
                <div>
                  <label className="label">Discount</label>
                  <input className="input-field" type="number" step="0.01" value={orderForm.discount} onChange={(e) => setOrderForm({ ...orderForm, discount: e.target.value })} />
                </div>
                <div>
                  <label className="label">Order Notes</label>
                  <textarea className="input-field resize-none" rows={3} value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                  <input type="checkbox" checked={orderForm.is_draft} onChange={(e) => setOrderForm({ ...orderForm, is_draft: e.target.checked })} />
                  Save as draft
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery Fee</span><span>{formatCurrency(orderForm.delivery_fee || 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="text-red-500">-{formatCurrency(orderForm.discount || 0)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-black"><span>Grand Total</span><span className="text-purple-600">{formatCurrency(grandTotal)}</span></div>
              </div>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || items.length === 0} className="btn-primary mt-4 w-full justify-center py-3 disabled:opacity-60">
                <Save size={16} />
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [payMethod, setPayMethod] = useState('cash')

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.orders.get(id).then((r) => r.data),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note }) => ordersApi.orders.updateStatus(id, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id])
      toast.success('Status updated!')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const markPaidMutation = useMutation({
    mutationFn: () => ordersApi.orders.markPaid(id, { payment_method: payMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries(['order', id])
      setShowPayModal(false)
      toast.success('Payment recorded!')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  if (!order) return <div className="text-center text-gray-400 py-20">Order not found</div>

  const statusIndex = STATUS_FLOW.findIndex((s) => s.key === order.status)

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Order #${order.order_number}`}
        breadcrumbs={[{ label: 'Orders', path: '/admin/orders' }, { label: `#${order.order_number}` }]}
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowEditModal(true)} className="btn-secondary">
              <Pencil size={15} /> Edit
            </button>
            <button onClick={() => navigate('/admin/print')} className="btn-secondary">
              <Printer size={15} /> Print
            </button>
            {order.payment_status !== 'paid' && (
              <button onClick={() => setShowPayModal(true)} className="btn-primary bg-green-600 hover:bg-green-700">
                <DollarSign size={15} /> Mark Paid
              </button>
            )}
          </div>
        }
      />

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-4">
        <div className="flex items-center justify-between">
          {STATUS_FLOW.map((step, idx) => (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  idx <= statusIndex ? 'bg-purple-600 text-white shadow-lg shadow-purple-300' : 'bg-gray-100 text-gray-400'
                }`}>
                  <step.icon size={16} />
                </div>
                <span className="text-xs mt-1 font-medium text-gray-600">{step.label}</span>
              </div>
              {idx < STATUS_FLOW.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${idx < statusIndex ? 'bg-purple-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            {STATUS_FLOW.map((s) => (
              s.key !== order.status && (
                <button key={s.key} onClick={() => updateStatusMutation.mutate({ status: s.key })}
                  className="text-xs px-3 py-1.5 bg-gray-50 hover:bg-purple-50 hover:text-purple-700 border border-gray-200 hover:border-purple-300 rounded-lg transition-all">
                  → {s.label}
                </button>
              )
            ))}
            <button onClick={() => updateStatusMutation.mutate({ status: 'cancelled' })}
              className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all ml-auto">
              Cancel Order
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h3 className="section-title mb-4">Order Items</h3>
            <div className="space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl overflow-hidden shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={16} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.product_code}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold">x{item.quantity}</p>
                    <p className="text-xs text-gray-400">@ {formatCurrency(item.unit_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery Fee</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-500">-{formatCurrency(order.discount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                <span>Grand Total</span>
                <span className="text-purple-600">{formatCurrency(order.grand_total)}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
            <h3 className="section-title mb-4">Status History</h3>
            <div className="space-y-3">
              {order.status_history?.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <OrderStatusBadge status={h.status} />
                      <span className="text-xs text-gray-400">{formatDateTime(h.created_at)}</span>
                    </div>
                    {h.note && <p className="text-xs text-gray-500 mt-0.5">{h.note}</p>}
                    <p className="text-xs text-gray-400">by {h.changed_by_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="section-title mb-3">Customer</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">{order.customer_detail?.name}</span></div>
              <div className="text-gray-500">{order.customer_detail?.phone}</div>
              <div className="text-gray-500 text-xs">{order.customer_detail?.address}</div>
              <div className="text-gray-500 capitalize text-xs">{order.customer_detail?.province?.replace('_', ' ')}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="section-title mb-3">Payment</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Method</span>
                <span className="capitalize">{order.payment_method || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
            <h3 className="section-title mb-3">Order Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Order #</span>
                <span className="font-mono font-semibold text-purple-700">#{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-xs">{formatDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seller</span>
                <span>{order.seller_name}</span>
              </div>
              {order.notes && (
                <div>
                  <span className="text-gray-500">Notes</span>
                  <p className="text-xs mt-1 text-gray-600 bg-gray-50 p-2 rounded-lg">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditOrderModal
          order={order}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false)
            queryClient.invalidateQueries(['order', id])
            queryClient.invalidateQueries(['orders'])
          }}
        />
      )}

      {/* Pay Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" size="sm">
        <div className="p-6 space-y-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(order.grand_total)}</p>
            <p className="text-sm text-green-600">Amount to receive</p>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select className="select-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bakong">Bakong KHQR</option>
              <option value="aba">ABA Bank</option>
              <option value="acleda">ACLEDA Bank</option>
              <option value="wing">Wing</option>
              <option value="cod">Cash on Delivery</option>
            </select>
          </div>
          <button onClick={() => markPaidMutation.mutate()} className="btn-primary w-full justify-center py-3 bg-green-600 hover:bg-green-700">
            <Check size={16} /> Confirm Payment
          </button>
        </div>
      </Modal>
    </div>
  )
}
