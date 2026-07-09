import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { ChevronLeft, ClipboardList, Heart, Loader2, Printer, ReceiptText, ShoppingCart } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { ProductThumb } from '@/components/customer/CustomerUi'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { useTranslation } from 'react-i18next'

const USD_TO_KHR_RATE = 4100

const STATUS_STYLES = {
  new: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-yellow-50 text-yellow-700',
  printed: 'bg-orange-50 text-orange-700',
  preparing: 'bg-orange-50 text-orange-700',
  packed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-cyan-50 text-cyan-700',
  completed: 'bg-green-50 text-green-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL_KEYS = {
  new: 'orders.status.pending',
  pending: 'orders.status.pending',
  printed: 'orders.status.confirmed',
  preparing: 'orders.status.preparing',
  packed: 'orders.status.packed',
  shipped: 'orders.status.shipped',
  completed: 'orders.status.delivered',
  delivered: 'orders.status.delivered',
  cancelled: 'orders.status.cancelled',
}

const COMPLETED_STATUSES = new Set(['completed', 'delivered', 'cancelled'])

const PAYMENT_METHOD_LABELS = {
  aba: 'ABA Pay',
  bakong: 'Bakong KHQR',
  cod: 'Cash on Delivery',
  cash: 'Cash',
  acleda: 'ACLEDA Bank',
  wing: 'Wing',
}

function formatRiel(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString()}រៀល`
}

function getOrderItems(order) {
  if (order.items_preview?.length) return order.items_preview
  return [{
    id: `${order.id}-preview`,
    product_name: order.preview_name || 'Product',
    product_image: order.preview_image,
    quantity: order.items_count || 1,
    total_price: order.grand_total,
  }]
}

function getItemPrice(order, item) {
  const price = item.total_price ?? item.subtotal ?? item.unit_price
  if (price !== undefined && price !== null) return price
  const count = Math.max(1, order.items_count || getOrderItems(order).length || 1)
  return Number(order.grand_total || 0) / count
}

function compactStatusLabel(status, t) {
  const label = t(STATUS_LABEL_KEYS[status] || 'orders.status.unknown', { status })
  if (status === 'shipped') return 'In Transit'
  if (status === 'preparing') return 'Packing'
  if (status === 'printed' || status === 'packed') return 'Picked'
  return label
}

function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '-'
}

function PrintLogo({ printLogoUrl, size = 78 }) {
  if (printLogoUrl) {
    return (
      <img
        src={printLogoUrl}
        alt="Shadow Shop"
        className="mx-auto mb-2 w-full object-contain"
        style={{ maxHeight: `${size}px` }}
      />
    )
  }

  return (
    <div className="mb-2 text-center">
      <div className="text-5xl leading-none">✿</div>
      <div className="font-serif text-5xl italic leading-none">shadow</div>
    </div>
  )
}

function ReceiptQr({ orderNumber }) {
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (!orderNumber) return undefined
    let cancelled = false
    QRCode.toDataURL(orderNumber, { width: 170, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setQr(url)
      })
      .catch(() => {
        if (!cancelled) setQr('')
      })
    return () => {
      cancelled = true
    }
  }, [orderNumber])

  return (
    <div className="flex h-20 w-20 items-center justify-center border-[3px] border-black bg-white sm:h-[102px] sm:w-[102px] sm:border-4">
      {qr ? <img src={qr} alt={`QR ${orderNumber}`} className="h-full w-full object-contain" /> : <span className="text-xs font-black">QR</span>}
    </div>
  )
}

function ReceiptPreview({ order, printLogoUrl, printLogoSize = 78 }) {
  const customer = order.customer_detail || {}
  const items = order.items?.length ? order.items : [{
    id: 'preview',
    product_name: order.preview_name || 'Product',
    quantity: order.items_count || 1,
    unit_price: order.grand_total || 0,
    total_price: order.grand_total || 0,
  }]
  const subtotal = Number(order.subtotal ?? items.reduce((sum, item) => sum + Number(item.total_price || 0), 0))
  const deliveryFee = Number(order.delivery_fee || 0)
  const discount = Number(order.discount || 0)
  const grandTotal = Number(order.grand_total || subtotal + deliveryFee - discount)
  const isPaid = order.payment_status === 'paid'

  return (
    <div className="receipt-paper mx-auto w-full max-w-[454px] bg-white p-4 text-black sm:p-5 md:p-6">
      <div className="text-center">
        <PrintLogo printLogoUrl={printLogoUrl} size={printLogoSize} />
        <div className="mt-2 text-lg font-black tracking-[0.18em] sm:text-xl">RECEIPT</div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_82px] items-start gap-3 sm:mt-7 sm:grid-cols-[1fr_104px] sm:gap-4">
        <div className="min-w-0 space-y-2 text-sm font-black leading-6 sm:text-base">
          <p>Seller: {order.seller_name || 'Shadow Shop'}</p>
          <p className="break-words">Order Code: {order.order_number}</p>
        </div>
        <ReceiptQr orderNumber={order.order_number} />
      </div>

      <div className="my-4 border-t border-dashed border-black sm:my-5" />

      <section>
        <h3 className="mb-3 text-lg font-black tracking-[0.14em] sm:mb-4 sm:text-xl">CUSTOMER</h3>
        <div className="grid grid-cols-[74px_1fr] gap-x-2 gap-y-2 text-sm font-black leading-6 sm:grid-cols-[88px_1fr] sm:gap-y-3 sm:text-lg">
          <span>Name:</span>
          <span className="min-w-0 break-words">{customer.name || order.customer_name || '-'}</span>
          <span>Phone:</span>
          <span className="min-w-0 break-words">{customer.phone || order.customer_phone || '-'}</span>
          <span>Address:</span>
          <span className="min-w-0 break-words">{customer.address || customer.province || '-'}</span>
        </div>
      </section>

      <div className="my-4 border-t border-dashed border-black sm:my-5" />

      <section>
        <h3 className="mb-3 text-lg font-black tracking-[0.14em] sm:mb-4 sm:text-xl">PAYMENT</h3>
        <div className={`rounded-xl border-[3px] p-3 ${isPaid ? 'border-emerald-700' : 'border-red-600'}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-black">Status</span>
            <span className={`rounded-full px-4 py-1.5 text-base font-black ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
              {isPaid ? 'PAID' : 'UNPAID'}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[86px_1fr] gap-y-2 text-sm font-black leading-6 sm:grid-cols-[104px_1fr] sm:text-base">
            <span>Method:</span>
            <span className="text-right">{paymentMethodLabel(order.payment_method)}</span>
            <span>Amount:</span>
            <span className="text-right">{formatCurrency(grandTotal)}</span>
            <span>Date:</span>
            <span className="text-right">{formatDateTime(isPaid ? order.updated_at : order.created_at)}</span>
          </div>
        </div>
      </section>

      <div className="hidden">
        <p className="mb-2 text-xs font-black sm:text-sm">ការទូទាត់</p>
        <div className={`inline-flex rotate-[-4deg] rounded-xl border-[3px] px-7 py-2 text-2xl font-black ${
          order.payment_status === 'paid' ? 'border-emerald-700 text-emerald-700' : 'border-red-600 text-red-600'
        }`}>
          {order.payment_status === 'paid' ? 'បានបង់' : 'មិនទាន់បង់'}
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-black sm:my-5" />

      <table className="w-full table-fixed border-collapse text-center text-[11px] sm:text-sm">
        <thead>
          <tr className="bg-gray-300">
            <th className="w-8 border border-black px-1 py-2 sm:w-10 sm:px-2 sm:py-3">No</th>
            <th className="border border-black px-1 py-2 sm:px-2 sm:py-3">Product</th>
            <th className="w-9 border border-black px-1 py-2 sm:w-12 sm:px-2 sm:py-3">Qty</th>
            <th className="w-14 border border-black px-1 py-2 sm:w-20 sm:px-2 sm:py-3">Price</th>
            <th className="w-16 border border-black px-1 py-2 sm:w-20 sm:px-2 sm:py-3">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-black px-1 py-2 sm:px-2 sm:py-3">{index + 1}</td>
              <td className="break-words border border-black px-1 py-2 text-left sm:px-2 sm:py-3">{item.product_name} ×{item.quantity}</td>
              <td className="border border-black px-1 py-2 font-black sm:px-2 sm:py-3">{item.quantity}</td>
              <td className="border border-black px-1 py-2 sm:px-2 sm:py-3">{formatCurrency(item.unit_price || 0)}</td>
              <td className="border border-black px-1 py-2 font-black sm:px-2 sm:py-3">{formatCurrency(item.total_price || item.subtotal || 0)}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-black px-2 py-2 text-right font-black sm:py-3" colSpan={4}>Subtotal</td>
            <td className="border border-black px-1 py-2 font-black sm:px-2 sm:py-3">{formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 text-right font-black sm:py-3" colSpan={4}>Delivery Fee</td>
            <td className="border border-black px-1 py-2 font-black sm:px-2 sm:py-3">{formatCurrency(deliveryFee)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-2 text-right font-black sm:py-3" colSpan={4}>Discount</td>
            <td className="border border-black px-1 py-2 font-black sm:px-2 sm:py-3">{formatCurrency(discount)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-3 text-right text-base font-black sm:py-4 sm:text-lg" colSpan={4}>Grand Total</td>
            <td className="border border-black px-1 py-3 text-sm font-black sm:px-2 sm:py-4 sm:text-base">{formatCurrency(grandTotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-4 text-right font-black" colSpan={4}>សរុបជារៀល</td>
            <td className="border border-black px-1 py-3 font-black sm:px-2 sm:py-4">{formatRiel(grandTotal * USD_TO_KHR_RATE)}</td>
          </tr>
        </tbody>
      </table>

      <div className="my-4 border-t border-dashed border-black sm:my-5" />
      <div className="space-y-1 text-sm font-black leading-6 sm:text-base">
        <p>អត្រាប្ដូរប្រាក់: 1 USD = {formatRiel(USD_TO_KHR_RATE)}</p>
        <p>Created: {formatDateTime(order.created_at)}</p>
        <p>Powered by : One Night Solution</p>
      </div>
    </div>
  )
}

export default function MyOrders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const activeTab = new URLSearchParams(location.search).get('tab') === 'completed' ? 'completed' : 'ongoing'
  const [receiptOrderId, setReceiptOrderId] = useState(null)
  const cartItems = useCartStore((s) => s.items)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const wishlistCount = useWishlistStore((s) => s.items.length)

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.orders.list({ page_size: 100 }).then((r) => r.data.results ?? r.data),
  })

  const orders = (data || []).filter((order) => (
    activeTab === 'completed'
      ? COMPLETED_STATUSES.has(order.status)
      : !COMPLETED_STATUSES.has(order.status)
  ))

  const { data: receiptOrder, isLoading: receiptLoading } = useQuery({
    queryKey: ['my-order-receipt', receiptOrderId],
    queryFn: () => ordersApi.orders.get(receiptOrderId).then((r) => r.data),
    enabled: !!receiptOrderId,
  })

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col bg-white pb-24 md:min-h-[calc(100vh-180px)] md:rounded-[28px] md:shadow-card">
      <div className="hidden px-4 pb-4 pt-6 md:block">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-[28px] font-black leading-tight text-gray-950">{t('orders.title')}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/wishlist')}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:scale-95"
              aria-label="Wishlist"
            >
              <Heart size={21} strokeWidth={2.2} />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-0.5 text-[9px] font-black text-white ring-[1.5px] ring-white">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white shadow-sm shadow-pink-100 transition active:scale-95"
              aria-label="Cart"
            >
              <ShoppingCart size={21} strokeWidth={2.4} />
              {totalItems > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-0.5 text-[9px] font-black text-white ring-[1.5px] ring-white">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 rounded-lg bg-gray-200 p-1">
          {[
            { key: 'ongoing', label: 'Ongoing' },
            { key: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.key === 'completed' ? '/my-orders?tab=completed' : '/my-orders')}
              className={`rounded-md py-2.5 text-sm font-black transition ${
                activeTab === tab.key ? 'bg-pink-600 text-white shadow-lg shadow-pink-100' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 px-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[94px] animate-pulse rounded-lg border border-gray-100 bg-gray-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mx-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-20 text-center">
          <div>
            <ClipboardList size={52} className="mx-auto mb-4 text-gray-200" />
            <p className="text-lg font-black text-gray-500">{t('orders.noOrdersFound')}</p>
            <p className="mt-1 text-sm font-semibold text-gray-400">{t('orders.noOrdersText')}</p>
            <button onClick={() => navigate('/shop')} className="mt-5 rounded-2xl bg-pink-600 px-6 py-3 text-sm font-black text-white">
              {t('orders.startShopping')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {orders.map((order) => {
            const orderItems = getOrderItems(order)
            const statusLabel = compactStatusLabel(order.status, t)
            const statusStyle = STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500'
            return (
              <section key={order.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3 px-1">
                  <button onClick={() => navigate(`/my-orders/${order.id}`)} className="min-w-0 text-left">
                    <p className="truncate font-mono text-xs font-black text-gray-900">Order #{order.order_number}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-gray-400">{formatDateTime(order.created_at)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptOrderId(order.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 active:scale-95"
                    aria-label="Receipt"
                  >
                    <ReceiptText size={15} />
                  </button>
                </div>
                {orderItems.map((item, index) => (
                  <article key={item.id || `${order.id}-${index}`} className="flex min-h-[94px] gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                    <button onClick={() => navigate(`/my-orders/${order.id}`)} className="h-[70px] w-[70px] shrink-0 overflow-hidden rounded-md bg-gray-100 text-left">
                      {item.product_image || (index === 0 && order.preview_image) ? (
                        <img
                          src={item.product_image || order.preview_image}
                          alt={item.product_name || order.preview_name || order.order_number}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ProductThumb product={{ name: item.product_name || order.preview_name || t('common.product') }} size="lg" className="h-[70px] w-[70px] rounded-md" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <button onClick={() => navigate(`/my-orders/${order.id}`)} className="block max-w-full truncate text-left text-sm font-black text-gray-950">
                            {item.product_name || order.preview_name || t('common.product')}
                          </button>
                          <p className="mt-1 text-xs text-gray-400">
                            {item.product_code ? item.product_code : `Qty ${item.quantity || 1}`}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-bold ${statusStyle}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <p className="text-sm font-black text-gray-950">{formatCurrency(getItemPrice(order, item))}</p>
                        <button
                          onClick={() => navigate(`/my-orders/${order.id}`)}
                          className="rounded-md bg-gray-950 px-5 py-2 text-[11px] font-black text-white active:scale-95"
                        >
                          {t('orders.trackOrder')}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )
          })}
        </div>
      )}

      {receiptOrderId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white p-0 sm:bg-gray-950/55 sm:p-3 sm:backdrop-blur-sm">
          <div className="flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[94vh] sm:rounded-3xl">
            <div className="no-print grid grid-cols-[44px_1fr_44px] items-center gap-3 border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:flex sm:justify-between sm:pt-3">
              <button
                type="button"
                onClick={() => setReceiptOrderId(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-700"
                aria-label="Back to orders"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-xs font-black uppercase tracking-wide text-pink-600">Receipt</p>
                <h3 className="truncate text-base font-black text-gray-950">
                  {receiptOrder?.order_number ? `#${receiptOrder.order_number}` : 'Loading receipt'}
                </h3>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!receiptOrder}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-600 disabled:opacity-50"
                  aria-label="Print receipt"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
            <div className="print-preview-window min-h-0 flex-1 overflow-y-auto bg-gray-100 px-2 py-3 sm:px-3 sm:py-4">
              {receiptLoading || !receiptOrder ? (
                <div className="flex min-h-[420px] items-center justify-center">
                  <Loader2 size={34} className="animate-spin text-pink-500" />
                </div>
              ) : (
                <ReceiptPreview
                  order={receiptOrder}
                  printLogoUrl={siteSettings?.print_logo_url}
                  printLogoSize={siteSettings?.print_logo_size || 78}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
