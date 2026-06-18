import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { ClipboardList, Filter, Loader2, Printer, ReceiptText, Truck, X } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { ProductThumb } from '@/components/customer/CustomerUi'
import { useTranslation } from 'react-i18next'

const USD_TO_KHR_RATE = 4100

const STATUS_TABS = [
  { key: '', labelKey: 'common.all' },
  { key: 'new', labelKey: 'orders.status.pending' },
  { key: 'preparing', labelKey: 'orders.status.preparing' },
  { key: 'packed', labelKey: 'orders.status.packed' },
  { key: 'shipped', labelKey: 'orders.status.shipped' },
  { key: 'completed', labelKey: 'orders.status.completed' },
]

const STATUS_STYLES = {
  new: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-yellow-50 text-yellow-700',
  printed: 'bg-orange-50 text-orange-700',
  preparing: 'bg-orange-50 text-orange-700',
  packed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-cyan-50 text-cyan-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL_KEYS = {
  new: 'orders.status.pending',
  pending: 'orders.status.pending',
  printed: 'orders.status.preparing',
  preparing: 'orders.status.preparing',
  packed: 'orders.status.packed',
  shipped: 'orders.status.shipped',
  completed: 'orders.status.delivered',
  cancelled: 'orders.status.cancelled',
}

function formatRiel(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString()}រៀល`
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
    <div className="flex h-[102px] w-[102px] items-center justify-center border-4 border-black bg-white">
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

  return (
    <div className="receipt-paper mx-auto w-full max-w-[454px] bg-white p-5 text-black md:p-6">
      <div className="text-center">
        <PrintLogo printLogoUrl={printLogoUrl} size={printLogoSize} />
        <div className="mt-2 text-xl font-black tracking-[0.18em]">RECEIPT</div>
      </div>

      <div className="mt-7 grid grid-cols-[1fr_104px] items-start gap-4">
        <div className="space-y-2 text-base font-black">
          <p>Seller: {order.seller_name || 'Shadow Shop'}</p>
          <p>Order Code: {order.order_number}</p>
        </div>
        <ReceiptQr orderNumber={order.order_number} />
      </div>

      <div className="my-5 border-t border-dashed border-black" />

      <section>
        <h3 className="mb-4 text-xl font-black tracking-[0.14em]">CUSTOMER</h3>
        <div className="grid grid-cols-[88px_1fr] gap-y-3 text-lg font-black">
          <span>Name:</span>
          <span>{customer.name || order.customer_name || '-'}</span>
          <span>Phone:</span>
          <span>{customer.phone || order.customer_phone || '-'}</span>
          <span>Address:</span>
          <span>{customer.address || customer.province || '-'}</span>
        </div>
      </section>

      <div className="my-5 border-t border-dashed border-black" />

      <div>
        <p className="mb-2 text-sm font-black">ការទូទាត់</p>
        <div className={`inline-flex rotate-[-4deg] rounded-xl border-[3px] px-7 py-2 text-2xl font-black ${
          order.payment_status === 'paid' ? 'border-emerald-700 text-emerald-700' : 'border-red-600 text-red-600'
        }`}>
          {order.payment_status === 'paid' ? 'បានបង់' : 'មិនទាន់បង់'}
        </div>
      </div>

      <div className="my-5 border-t border-dashed border-black" />

      <table className="w-full border-collapse text-center text-sm">
        <thead>
          <tr className="bg-gray-300">
            <th className="w-10 border border-black px-2 py-3">No</th>
            <th className="border border-black px-2 py-3">Product</th>
            <th className="w-12 border border-black px-2 py-3">Qty</th>
            <th className="w-20 border border-black px-2 py-3">Price</th>
            <th className="w-20 border border-black px-2 py-3">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-black px-2 py-3">{index + 1}</td>
              <td className="border border-black px-2 py-3 text-left">{item.product_name} ×{item.quantity}</td>
              <td className="border border-black px-2 py-3 font-black">{item.quantity}</td>
              <td className="border border-black px-2 py-3">{formatCurrency(item.unit_price || 0)}</td>
              <td className="border border-black px-2 py-3 font-black">{formatCurrency(item.total_price || item.subtotal || 0)}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-black px-2 py-3 text-right font-black" colSpan={4}>Subtotal</td>
            <td className="border border-black px-2 py-3 font-black">{formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-3 text-right font-black" colSpan={4}>Delivery Fee</td>
            <td className="border border-black px-2 py-3 font-black">{formatCurrency(deliveryFee)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-3 text-right font-black" colSpan={4}>Discount</td>
            <td className="border border-black px-2 py-3 font-black">{formatCurrency(discount)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-4 text-right text-lg font-black" colSpan={4}>Grand Total</td>
            <td className="border border-black px-2 py-4 text-base font-black">{formatCurrency(grandTotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-4 text-right font-black" colSpan={4}>សរុបជារៀល</td>
            <td className="border border-black px-2 py-4 font-black">{formatRiel(grandTotal * USD_TO_KHR_RATE)}</td>
          </tr>
        </tbody>
      </table>

      <div className="my-5 border-t border-dashed border-black" />
      <div className="space-y-1 text-base font-black">
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
  const [activeTab, setActiveTab] = useState('')
  const [receiptOrderId, setReceiptOrderId] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', activeTab],
    queryFn: () => ordersApi.orders.list({ status: activeTab || undefined, page_size: 30 }).then((r) => r.data.results ?? r.data),
  })

  const orders = data || []

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
    <div className="mx-auto flex min-h-[calc(100vh-180px)] w-full max-w-3xl flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-950">{t('orders.title')}</h1>
          <p className="mt-1 text-xs font-semibold text-gray-500">{t('orders.subtitle')}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-black text-gray-700 shadow-sm">
          <Filter size={15} /> {t('orders.filter')}
        </button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${
              activeTab === tab.key
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-100'
                : 'border border-gray-100 bg-white text-gray-500 shadow-sm'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white px-4 py-20 text-center">
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
        <div className="space-y-4">
          {orders.map((order) => {
            return (
              <article
                key={order.id}
                className="rounded-2xl border border-pink-100 bg-white p-3 shadow-card"
              >
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate(`/my-orders/${order.id}`)}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-pink-50 text-left"
                  >
                    {order.preview_image ? (
                      <img src={order.preview_image} alt={order.preview_name || order.order_number} className="h-full w-full object-cover" />
                    ) : (
                      <ProductThumb product={{ name: order.preview_name || t('common.product') }} size="lg" className="h-20 w-20 rounded-xl" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate(`/my-orders/${order.id}`)} className="block max-w-full truncate text-left font-mono text-sm font-black text-gray-950">
                      #{order.order_number}
                    </button>
                    <p className="mt-1 text-xs font-semibold text-gray-400">{formatDateTime(order.created_at)}</p>
                    <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-xs font-black ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500'}`}>
                      {t(STATUS_LABEL_KEYS[order.status] || 'orders.status.unknown', { status: order.status })}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-xs font-semibold text-gray-500">{order.items_count || 0} {t('cart.items')}</p>
                  <p className="text-xl font-black text-pink-600">{formatCurrency(order.grand_total)}</p>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setReceiptOrderId(order.id)}
                    className="inline-flex min-w-[118px] items-center justify-center gap-2 rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-black text-pink-600 shadow-sm"
                  >
                    <ReceiptText size={17} /> Receipt
                  </button>
                  <button
                    onClick={() => navigate(`/my-orders/${order.id}`)}
                    className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-pink-100"
                  >
                    <Truck size={17} /> {t('orders.trackOrder')}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {receiptOrderId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/55 p-3 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="no-print flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-pink-600">Receipt</p>
                <h3 className="text-base font-black text-gray-950">
                  {receiptOrder?.order_number ? `#${receiptOrder.order_number}` : 'Loading receipt'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={!receiptOrder}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-600 disabled:opacity-50"
                  aria-label="Print receipt"
                >
                  <Printer size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptOrderId(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600"
                  aria-label="Close receipt"
                >
                  <X size={19} />
                </button>
              </div>
            </div>
            <div className="print-preview-window min-h-0 flex-1 overflow-y-auto bg-gray-100 px-3 py-4">
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
