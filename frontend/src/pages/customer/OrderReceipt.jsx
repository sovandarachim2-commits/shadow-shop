import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2, Printer, ReceiptText, ShoppingBag } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { formatFullAddressKhmer, KHMER_FONT_FAMILY } from '@/utils/addressHelpers'

function Row({ label, value, strong = false }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="font-semibold text-gray-500">{label}</span>
      <span className={`text-right ${strong ? 'text-base font-black text-gray-950' : 'font-bold text-gray-800'}`}>{value}</span>
    </div>
  )
}

const PAYMENT_METHOD_LABELS = {
  aba: 'ABA Pay',
  bakong: 'Bakong KHQR',
  cod: 'Cash on Delivery',
  cash: 'Cash',
  acleda: 'ACLEDA Bank',
  wing: 'Wing',
}

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '-'
}

export default function OrderReceipt() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order-receipt', id],
    queryFn: () => ordersApi.orders.get(id).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={34} className="animate-spin text-pink-500" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <ReceiptText size={48} className="text-gray-200" />
        <p className="mt-3 font-black text-gray-500">Receipt not found</p>
        <button onClick={() => navigate('/my-orders')} className="mt-4 rounded-2xl bg-pink-600 px-6 py-2.5 text-sm font-black text-white">
          Back to Orders
        </button>
      </div>
    )
  }

  const customer = order.customer_detail || {}
  const customerAddress = formatFullAddressKhmer(customer)
  const items = order.items || []
  const subtotal = Number(order.subtotal || 0)
  const deliveryFee = Number(order.delivery_fee || 0)
  const discount = Number(order.discount || 0)
  const grandTotal = Number(order.grand_total || subtotal + deliveryFee - discount)
  const isPaid = order.payment_status === 'paid'

  return (
    <div className="print-preview-window mx-auto max-w-2xl pb-8">
      <div className="no-print -mx-4 -mt-4 mb-4 grid min-h-[48px] grid-cols-[40px_1fr_40px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:mx-0 md:mt-0 md:border-0 md:px-0 md:pt-0">
        <button onClick={() => navigate('/my-orders')} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-center text-base font-black text-gray-950">Receipt</h1>
        <button onClick={() => window.print()} className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-600 active:scale-95">
          <Printer size={18} />
        </button>
      </div>

      <section className="receipt-paper rounded-3xl border border-pink-100 bg-white p-5 shadow-card md:p-7">
        <div className="border-b border-dashed border-gray-200 pb-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
            <ReceiptText size={28} />
          </div>
          <h2 className="mt-3 text-xl font-black text-gray-950">Shadow Shop</h2>
          <p className="mt-1 text-xs font-semibold text-gray-400">Customer Receipt</p>
        </div>

        <div className="border-b border-dashed border-gray-200 py-4">
          <Row label="Order No" value={`#${order.order_number}`} strong />
          <Row label="Date" value={formatDateTime(order.created_at)} />
        </div>

        <div className="border-b border-dashed border-gray-200 py-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">Payment</p>
          <div className={`rounded-2xl border p-4 ${isPaid ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black text-gray-700">Status</span>
              <span className={`rounded-full px-4 py-1.5 text-xs font-black ${isPaid ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                {isPaid ? 'PAID' : 'UNPAID'}
              </span>
            </div>
            <div className="mt-3 space-y-1">
              <Row label="Method" value={paymentMethodLabel(order.payment_method)} />
              <Row label="Amount" value={formatCurrency(grandTotal)} strong />
              <Row label={isPaid ? 'Paid Date' : 'Created Date'} value={formatDateTime(isPaid ? order.updated_at : order.created_at)} />
            </div>
          </div>
        </div>

        <div className="border-b border-dashed border-gray-200 py-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-gray-400">Customer</p>
          <p className="text-sm font-black text-gray-950">{customer.name || order.customer_name || '-'}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500">{customer.phone || order.customer_phone || '-'}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-gray-500" style={{ fontFamily: KHMER_FONT_FAMILY }}>{customerAddress}</p>
        </div>

        <div className="border-b border-dashed border-gray-200 py-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">Items</p>
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id || index} className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-300">
                  <ShoppingBag size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-gray-950">{item.product_name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-400">Qty {item.quantity} x {formatCurrency(item.unit_price || 0)}</p>
                </div>
                <p className="text-sm font-black text-gray-950">{formatCurrency(item.total_price || item.subtotal || 0)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="py-4">
          <Row label="Subtotal" value={formatCurrency(subtotal)} />
          <Row label="Delivery Fee" value={formatCurrency(deliveryFee)} />
          <Row label="Discount" value={`-${formatCurrency(discount)}`} />
          <div className="mt-3 border-t border-gray-100 pt-3">
            <Row label="Grand Total" value={formatCurrency(grandTotal)} strong />
          </div>
        </div>
      </section>

      <button onClick={() => window.print()} className="no-print mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-100">
        <Printer size={18} /> Print Receipt
      </button>
    </div>
  )
}
