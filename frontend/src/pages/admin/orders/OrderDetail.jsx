import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Printer, Truck, Check, X, ArrowLeft, Package, Clock, QrCode, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ordersApi } from '@/api/orders'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

const STATUS_FLOW = [
  { key: 'new', label: 'New', icon: Package },
  { key: 'printed', label: 'Printed', icon: Printer },
  { key: 'preparing', label: 'Preparing', icon: Clock },
  { key: 'packed', label: 'Packed', icon: Check },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'completed', label: 'Completed', icon: Check },
]

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
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
