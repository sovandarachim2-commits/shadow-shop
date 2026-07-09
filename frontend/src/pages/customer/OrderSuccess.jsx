import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, QrCode } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { formatCurrency } from '@/utils/helpers'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import OrderSuccessModal from '@/components/customer/OrderSuccessModal'

const ONLINE_PAYMENTS = ['bakong', 'aba', 'acleda', 'wing']
const PENDING_PAYMENT_KEY = 'shadow-shop-pending-checkout-payment'

function isPaymentComplete(order, bakongPayment) {
  if (bakongPayment?.status === 'paid' && order) return true
  if (!order) return false
  if (!ONLINE_PAYMENTS.includes(order.payment_method)) return true
  return order.payment_status === 'paid'
}

export default function OrderSuccess() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const orderId = location.state?.orderId
  const orderNumber = location.state?.orderNumber || query.get('order') || query.get('tran_id') || ''
  const checkoutReference = query.get('reference') || ''
  const [bakongPayment, setBakongPayment] = useState(location.state?.bakongPayment || null)
  const removeSelectedItems = useCartStore((s) => s.removeSelectedItems)

  const { data: checkoutStatus, refetch: refetchCheckoutStatus } = useQuery({
    queryKey: ['checkout-status', checkoutReference],
    queryFn: () => ordersApi.orders.checkoutStatus(checkoutReference).then((r) => r.data),
    enabled: !!checkoutReference,
    refetchInterval: (q) => (q.state.data?.order_id ? false : 3000),
  })

  const resolvedOrderId = orderId || checkoutStatus?.order_id
  const resolvedOrderNumber = orderNumber || checkoutStatus?.order_number

  const { data: order, refetch } = useQuery({
    queryKey: ['order-success', resolvedOrderId, resolvedOrderNumber, checkoutReference],
    queryFn: async () => {
      if (checkoutStatus?.order) return checkoutStatus.order
      if (resolvedOrderId) {
        const { data } = await ordersApi.orders.get(resolvedOrderId)
        return data
      }
      if (resolvedOrderNumber) {
        const { data } = await ordersApi.orders.list({ search: resolvedOrderNumber, page_size: 1 })
        const results = data.results ?? data
        if (results[0]?.id) {
          const { data: detail } = await ordersApi.orders.get(results[0].id)
          return detail
        }
      }
      return null
    },
    enabled: !!(resolvedOrderId || resolvedOrderNumber || checkoutStatus?.order),
    refetchInterval: (q) => {
      const current = q.state.data
      if (!current || isPaymentComplete(current, bakongPayment)) return false
      return ONLINE_PAYMENTS.includes(current.payment_method) ? 3000 : false
    },
  })

  const paid = isPaymentComplete(order, bakongPayment) || checkoutStatus?.status === 'paid'
  const isBakongPending = bakongPayment && bakongPayment.status !== 'paid' && !paid
  const isBakongExpired = bakongPayment?.status === 'expired'
  const trackPath = (order?.id || resolvedOrderId) ? `/my-orders/${order?.id || resolvedOrderId}` : '/my-orders'

  useEffect(() => {
    if (!paid) return
    localStorage.removeItem(PENDING_PAYMENT_KEY)
    removeSelectedItems()
  }, [paid, removeSelectedItems])

  useEffect(() => {
    if (!checkoutReference || checkoutStatus?.order_id) return undefined

    const timer = setInterval(() => {
      refetchCheckoutStatus()
    }, 3000)

    return () => clearInterval(timer)
  }, [checkoutReference, checkoutStatus?.order_id, refetchCheckoutStatus])

  useEffect(() => {
    if (!bakongPayment || bakongPayment.status === 'paid') return undefined

    let failures = 0
    const timer = setInterval(async () => {
      try {
        const { data } = await ordersApi.payments.checkBakong(bakongPayment.id)
        failures = 0
        setBakongPayment(data)
        if (data.status === 'paid') {
          clearInterval(timer)
          refetch()
          refetchCheckoutStatus()
        }
      } catch {
        failures += 1
        if (failures >= 5) clearInterval(timer)
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [bakongPayment?.id, bakongPayment?.status, refetch, refetchCheckoutStatus])

  if (paid) {
    return (
      <div className="min-h-[60vh] bg-gray-50">
        <OrderSuccessModal
          open
          onTrack={() => navigate(trackPath)}
          onBack={() => navigate('/shop')}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <section className="rounded-[2rem] border border-yellow-100 bg-gradient-to-br from-white via-yellow-50 to-pink-50 p-6 text-center shadow-soft md:p-10">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-500 text-white shadow-xl shadow-yellow-100 md:h-28 md:w-28">
          <Clock size={52} />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-wide text-pink-600">
          {t('orders.paymentRequired')}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 md:text-4xl">
          {t('orders.completePayment')}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
          {checkoutReference
            ? 'Complete payment to create your order.'
            : t('orders.scanPaymentText')}
        </p>
        {checkoutReference && (
          <p className="mt-2 text-xs font-semibold text-gray-400">Ref: {checkoutReference}</p>
        )}
      </section>

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
            isBakongExpired
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {isBakongExpired ? t('orders.qrExpired') : t('orders.waitingPayment')}
          </p>
        </div>
      )}

      <div className="mt-6">
        <button onClick={() => navigate('/checkout')} className="shop-btn-primary w-full justify-center px-7">
          {t('orders.backToCheckout')}
        </button>
      </div>
    </div>
  )
}
