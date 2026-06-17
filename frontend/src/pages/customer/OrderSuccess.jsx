import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  Loader2,
  Package,
  QrCode,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { useTranslation } from 'react-i18next'

const ONLINE_PAYMENTS = ['bakong', 'aba', 'acleda', 'wing']

const PAYMENT_LABEL_KEYS = {
  aba: 'orders.payment.aba',
  bakong: 'orders.payment.bakong',
  cod: 'orders.payment.cashOnDelivery',
  cash: 'orders.payment.cash',
  acleda: 'orders.payment.acleda',
  wing: 'orders.payment.wing',
}

const ORDER_STATUS_LABEL_KEYS = {
  new: 'orders.status.pending',
  pending: 'orders.status.pending',
  printed: 'orders.status.preparingOrder',
  preparing: 'orders.status.preparingOrder',
  packed: 'orders.status.packed',
  shipped: 'orders.status.shipped',
  completed: 'orders.status.delivered',
  cancelled: 'orders.status.cancelled',
}

const ORDER_STATUS_COLORS = {
  new: 'text-yellow-600',
  pending: 'text-yellow-600',
  printed: 'text-orange-500',
  preparing: 'text-orange-500',
  packed: 'text-blue-600',
  shipped: 'text-cyan-600',
  completed: 'text-green-600',
  cancelled: 'text-gray-500',
}

function isPaymentComplete(order, bakongPayment) {
  if (bakongPayment?.status === 'paid') return true
  if (!order) return false
  if (!ONLINE_PAYMENTS.includes(order.payment_method)) return true
  return order.payment_status === 'paid'
}

function DetailItem({ icon: Icon, label, value, valueClass = 'text-gray-950' }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-gray-400">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-black ${valueClass}`}>{value}</p>
      </div>
    </div>
  )
}

export default function OrderSuccess() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const orderId = location.state?.orderId
  const orderNumber = location.state?.orderNumber || query.get('order') || query.get('tran_id') || ''
  const [bakongPayment, setBakongPayment] = useState(location.state?.bakongPayment || null)

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order-success', orderId, orderNumber],
    queryFn: async () => {
      if (orderId) {
        const { data } = await ordersApi.orders.get(orderId)
        return data
      }
      if (orderNumber) {
        const { data } = await ordersApi.orders.list({ search: orderNumber, page_size: 1 })
        const results = data.results ?? data
        if (results[0]?.id) {
          const { data: detail } = await ordersApi.orders.get(results[0].id)
          return detail
        }
      }
      return null
    },
    enabled: !!(orderId || orderNumber),
    refetchInterval: (q) => {
      const current = q.state.data
      if (!current || isPaymentComplete(current, bakongPayment)) return false
      return ONLINE_PAYMENTS.includes(current.payment_method) ? 3000 : false
    },
  })

  const displayOrderNumber = order?.order_number || orderNumber || '#ORD-PENDING'
  const paid = isPaymentComplete(order, bakongPayment)
  const isBakongPending = bakongPayment && bakongPayment.status !== 'paid' && !paid
  const isBakongExpired = bakongPayment?.status === 'expired'
  const itemsCount = order?.items?.length ?? order?.items_count ?? 0
  const paymentLabel = order?.payment_method ? t(PAYMENT_LABEL_KEYS[order.payment_method] || 'orders.payment.unknown', { method: order.payment_method }) : '-'
  const orderStatusLabel = order?.status ? t(ORDER_STATUS_LABEL_KEYS[order.status] || 'orders.status.unknown', { status: order.status }) : '-'
  const orderStatusColor = ORDER_STATUS_COLORS[order?.status] || 'text-gray-700'
  const paymentStatus = paid ? t('orders.paid') : t('orders.unpaid')
  const trackPath = order?.id ? `/my-orders/${order.id}` : '/my-orders'

  useEffect(() => {
    if (!bakongPayment || bakongPayment.status === 'paid') return undefined

    const timer = setInterval(async () => {
      try {
        const { data } = await ordersApi.payments.checkBakong(bakongPayment.id)
        setBakongPayment(data)
        if (data.status === 'paid') {
          clearInterval(timer)
          refetch()
        }
      } catch {
        clearInterval(timer)
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [bakongPayment?.id, bakongPayment?.status, refetch])

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <section className={`rounded-[2rem] border p-6 text-center shadow-soft md:p-10 ${
        isBakongPending
          ? 'border-yellow-100 bg-gradient-to-br from-white via-yellow-50 to-pink-50'
          : 'border-green-100 bg-gradient-to-br from-white via-green-50 to-pink-50'
      }`}>
        <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl md:h-28 md:w-28 ${
          isBakongPending ? 'bg-yellow-500 shadow-yellow-100' : 'bg-green-500 shadow-green-100'
        }`}>
          {isBakongPending ? <Clock size={52} /> : <CheckCircle size={52} />}
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-wide text-pink-600">
          {isBakongPending ? t('orders.paymentRequired') : t('orders.orderSuccess')}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">
          {isBakongPending ? t('orders.completePayment') : t('orders.thankYou')}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
          {isBakongPending
            ? t('orders.scanPaymentText')
            : t('orders.successText')}
        </p>
      </section>

      <div className="mt-4 rounded-2xl border border-pink-100 bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
            <ShoppingBag size={20} />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs font-bold text-gray-400">{t('orders.orderNumber')}</p>
            <p className="truncate font-mono text-xl font-black text-gray-950">{displayOrderNumber}</p>
          </div>
        </div>
      </div>

      {paid && (
        <div className="mt-4 rounded-2xl border border-pink-100 bg-white p-4 shadow-card">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={28} className="animate-spin text-pink-400" />
            </div>
          ) : order ? (
            <div className="grid grid-cols-2 gap-3">
              <DetailItem icon={Calendar} label={t('orders.orderDate')} value={formatDateTime(order.created_at)} />
              <DetailItem
                icon={ShoppingBag}
                label={t('cart.items')}
                value={`${itemsCount} ${t('cart.items')}`}
                valueClass="text-pink-600"
              />
              <DetailItem
                icon={DollarSign}
                label={t('orders.totalAmount')}
                value={formatCurrency(order.grand_total)}
                valueClass="text-green-600"
              />
              <DetailItem icon={QrCode} label={t('orders.paymentMethod')} value={paymentLabel} />
              <DetailItem
                icon={ShieldCheck}
                label={t('orders.paymentStatus')}
                value={paymentStatus}
                valueClass={paid ? 'text-green-600' : 'text-red-600'}
              />
              <DetailItem
                icon={Package}
                label={t('orders.orderStatus')}
                value={orderStatusLabel}
                valueClass={orderStatusColor}
              />
            </div>
          ) : null}
        </div>
      )}

      {bakongPayment && isBakongPending && (
        <div className="mt-4 rounded-2xl border border-pink-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-center gap-2 text-sm font-black text-gray-950">
            <QrCode size={18} /> Bakong KHQR Payment
          </div>
          <img
            src={bakongPayment.qr_image}
            alt="Bakong KHQR"
            className="mx-auto mt-4 h-56 w-56 rounded-2xl border border-gray-100 bg-white p-2"
          />
          <p className="mt-2 text-center text-sm font-black text-pink-600">
            {formatCurrency(bakongPayment.amount)}
          </p>
          <p className="mt-1 break-all text-center text-[11px] text-gray-400">MD5: {bakongPayment.md5}</p>
          <p className={`mt-3 rounded-full px-4 py-2 text-center text-xs font-black ${
            bakongPayment.status === 'expired'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {isBakongExpired ? t('orders.qrExpired') : t('orders.waitingPayment')}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {paid ? (
          <>
            <button
              onClick={() => navigate(trackPath)}
              className="shop-btn-primary flex-1 justify-center px-7"
              disabled={isLoading}
            >
              <ClipboardList size={17} /> {t('orders.trackOrder')}
            </button>
            <button onClick={() => navigate('/shop')} className="shop-btn-outline flex-1 justify-center px-7">
              <ShoppingBag size={17} /> {t('cart.continueShopping')}
            </button>
          </>
        ) : (
          <button onClick={() => navigate('/checkout')} className="shop-btn-primary w-full justify-center px-7">
            <ShoppingBag size={17} /> {t('orders.backToCheckout')}
          </button>
        )}
      </div>
    </div>
  )
}

