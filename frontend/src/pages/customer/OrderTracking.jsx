import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardList,
  Headphones,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShoppingCart,
  Truck,
  User,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { ProductThumb } from '@/components/customer/CustomerUi'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { useTranslation } from 'react-i18next'

const STATUS_STYLES = {
  new: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-yellow-50 text-yellow-700',
  printed: 'bg-orange-50 text-orange-700',
  preparing: 'bg-orange-50 text-orange-700',
  packed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-cyan-50 text-cyan-700',
  completed: 'bg-green-50 text-green-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
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

const TIMELINE_STEPS = [
  { key: 'new', labelKey: 'orders.timeline.placed', icon: ShoppingCart },
  { key: 'printed', labelKey: 'orders.timeline.confirmed', icon: ClipboardList },
  { key: 'preparing', labelKey: 'orders.timeline.preparing', icon: Package },
  { key: 'shipped', labelKey: 'orders.timeline.shipped', icon: Truck },
  { key: 'completed', labelKey: 'orders.timeline.delivered', icon: Check },
]

const TRACKING_STEP_INDEX = {
  new: 0,
  pending: 0,
  printed: 1,
  preparing: 2,
  packed: 2,
  shipped: 3,
  completed: 4,
  delivered: 4,
}

function stepDone(currentStatus, stepKey) {
  if (currentStatus === 'cancelled') return stepKey === 'new'
  const currentIdx = TRACKING_STEP_INDEX[currentStatus] ?? 0
  const stepIdx = TRACKING_STEP_INDEX[stepKey] ?? 0
  return stepIdx <= currentIdx
}

function Card({ title, children, action }) {
  return (
    <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-gray-950">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function SummaryLine({ label, value, success = false }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="font-semibold text-gray-500">{label}</span>
      <span className={`font-black ${success ? 'text-green-600' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}

function paymentMethodBadge(method, label) {
  if (method === 'contact_sales') return 'Sale'
  if (method === 'aba') return 'ABA'
  if (method === 'bakong') return 'KHQR'
  return label.slice(0, 4)
}

function normalizeTelegramUrl(value = '') {
  const clean = String(value || '').trim()
  if (!clean) return ''
  if (clean.startsWith('@')) return `https://t.me/${clean.slice(1)}`
  if (/^t\.me\//i.test(clean)) return `https://${clean}`
  if (/^telegram\.me\//i.test(clean)) return `https://${clean}`
  return clean
}

export default function OrderTracking() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => ordersApi.orders.get(id).then((r) => r.data),
    enabled: !!id,
  })

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
  })

  if (isLoading && !order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={36} className="animate-spin text-pink-400" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={48} className="text-gray-200" />
        <p className="font-black text-gray-500">{t('orders.orderNotFound')}</p>
        <button onClick={() => navigate('/my-orders')} className="mt-2 rounded-2xl bg-pink-600 px-6 py-2 text-sm font-black text-white">
          {t('orders.backToOrders')}
        </button>
      </div>
    )
  }

  const items = order.items || []
  const subtotal = order.subtotal ?? items.reduce((sum, i) => sum + Number(i.subtotal ?? i.unit_price * i.quantity), 0)
  const deliveryFee = Number(order.delivery_fee ?? 0)
  const discount = Number(order.discount ?? 0)
  const grandTotal = order.grand_total ?? subtotal + deliveryFee - discount
  const statusLabel = t(STATUS_LABEL_KEYS[order.status] || 'orders.status.unknown', { status: order.status })
  const statusStyle = STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500'
  const customer = order.customer_detail || {}
  const paymentLabel = {
    aba: 'ABA Pay',
    bakong: 'Bakong KHQR',
    cod: t('orders.payment.cashOnDelivery'),
    cash: t('orders.payment.cash'),
    acleda: 'ACLEDA Bank',
    wing: 'Wing',
    contact_sales: t('orders.payment.contact_sales'),
  }[order.payment_method] || order.payment_method || t('orders.payment.title')
  const contactSalesUrl = normalizeTelegramUrl(siteSettings?.payment_methods?.contact_sales_url)
  const supportUrl = contactSalesUrl || (siteSettings?.store_phone ? `tel:${siteSettings.store_phone}` : '')
  const openSupport = () => {
    if (supportUrl) window.location.href = supportUrl
  }

  return (
    <div className="mx-auto max-w-3xl pb-24 md:pb-0">
      <div className="-mx-4 -mt-4 mb-4 grid min-h-[48px] grid-cols-[40px_1fr_40px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:mx-0 md:mt-0 md:border-0 md:px-0 md:pt-0">
        <button onClick={() => navigate('/my-orders')} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950">{t('orders.details')}</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <Headphones size={18} />
        </button>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-mono text-base font-black text-gray-950">Order #{order.order_number || id}</h2>
            <p className="mt-1 text-xs font-semibold text-gray-400">{t('orders.placedOn', { date: formatDateTime(order.created_at) })}</p>
          </div>
          <span className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black ${statusStyle}`}>{statusLabel}</span>
        </div>

        <div className="mt-6 grid grid-cols-5 items-start">
          {TIMELINE_STEPS.map((step, index) => {
            const done = stepDone(order.status, step.key)
            return (
              <div key={step.key} className="relative flex flex-col items-center text-center">
                {index < TIMELINE_STEPS.length - 1 && (
                  <div className={`absolute left-1/2 top-4 h-0.5 w-full ${done ? 'bg-pink-500' : 'bg-gray-200'}`} />
                )}
                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                  done ? 'bg-gradient-to-br from-pink-500 to-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <step.icon size={15} />
                </div>
                <p className="mt-2 text-[10px] font-black leading-tight text-gray-700">{t(step.labelKey)}</p>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mt-4 space-y-4">
        <Card
          title={t('orders.deliveryAddress')}
          action={<button className="rounded-xl border border-pink-100 bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-600">{t('common.edit')}</button>}
        >
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500"><User size={18} /></div>
              <div>
                <p className="text-sm font-black text-gray-950">{customer.name || order.customer_name || t('orders.customer')}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">{customer.phone || order.customer_phone || '-'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500"><MapPin size={18} /></div>
              <p className="pt-1 text-xs font-semibold leading-5 text-gray-600">{customer.address || t('orders.noAddress')}</p>
            </div>
          </div>
        </Card>

        <Card title={t('orders.orderItems')}>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id ?? idx} className="flex items-center gap-4">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <ProductThumb product={{ name: item.product_name }} size="lg" className="h-16 w-16 rounded-xl" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-gray-950">{item.product_name || item.product?.name || t('common.product')}</p>
                  <p className="mt-1.5 text-xs font-semibold text-gray-500">{t('product.quantity')}: {item.quantity}</p>
                </div>
                <p className="text-sm font-black text-pink-600">{formatCurrency(item.subtotal ?? item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>
          {items.length > 3 && (
            <button className="mt-5 flex w-full items-center justify-center gap-1 border-t border-gray-100 pt-4 text-sm font-black text-navy-900">
              {t('orders.viewMore', { count: items.length - 3 })} <ChevronRight size={16} className="rotate-90" />
            </button>
          )}
        </Card>

        <Card title={t('cart.orderSummary')}>
          <div className="space-y-3">
            <SummaryLine label={`${t('cart.subtotal')} (${items.length} ${t('cart.items')})`} value={formatCurrency(subtotal)} />
            <SummaryLine label={t('cart.deliveryFee')} value={formatCurrency(deliveryFee)} />
            <SummaryLine label={t('orders.discount')} value={`-${formatCurrency(discount)}`} success />
            <div className="flex justify-between border-t border-dashed border-gray-200 pt-4">
              <span className="font-black text-gray-950">{t('orders.totalAmount')}</span>
              <span className="text-xl font-black text-pink-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </Card>

        <Card title={t('orders.paymentMethod')}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-center text-[11px] font-black leading-tight text-white">
              {paymentMethodBadge(order.payment_method, paymentLabel)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-950">{paymentLabel}</p>
              <p className="mt-1 text-xs font-semibold text-gray-500">
                {order.payment_status === 'paid' ? t('orders.paidOn', { date: formatDateTime(order.updated_at) }) : t('orders.paymentPending')}
              </p>
            </div>
            <p className="text-sm font-black text-gray-700">{formatCurrency(grandTotal)}</p>
          </div>
        </Card>

        <Card title={t('orders.needHelp')}>
          <button
            type="button"
            onClick={openSupport}
            disabled={!supportUrl}
            className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500"><Phone size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-950">{t('orders.contactSupport')}</p>
              <p className="text-xs font-semibold text-gray-400">{t('orders.helpText')}</p>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white px-4 py-3 md:hidden">
        <button className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 rounded-2xl bg-pink-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-100">
          <Truck size={18} /> {t('orders.trackOrder')}
        </button>
      </div>
    </div>
  )
}
