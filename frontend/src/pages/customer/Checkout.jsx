import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Check, MapPin, QrCode, X, Clock, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { formatCurrency, getUserContactDefaults } from '@/utils/helpers'
import { formatAddressLocationKhmer, KHMER_FONT_FAMILY } from '@/utils/addressHelpers'
import { EmptyState, ProductThumb } from '@/components/customer/CustomerUi'
import OrderSuccessModal from '@/components/customer/OrderSuccessModal'

const PAYMENT_METHOD_KEYS = ['bakong', 'aba', 'acleda', 'wing', 'cod', 'cash']

const DEFAULT_PROVINCE_FEES = {
  phnom_penh: 3, siem_reap: 6, battambang: 6,
  kampong_cham: 5, kandal: 4, takeo: 4, other: 8,
}
const getCartKey = (item) => item.product.cart_key || item.product.id
const PROVINCE_LABELS = {
  phnom_penh: 'Phnom Penh', siem_reap: 'Siem Reap', battambang: 'Battambang',
  kampong_cham: 'Kampong Cham', kandal: 'Kandal', takeo: 'Takeo', other: 'Other',
}

const CART_PROVINCE_MAP = {
  'Phnom Penh': 'phnom_penh',
  'Kandal Province': 'kandal',
  'Siem Reap': 'siem_reap',
  'Battambang': 'battambang',
}
const PENDING_PAYMENT_KEY = 'shadow-shop-pending-checkout-payment'
const ONLINE_PAYMENT_METHODS = ['bakong', 'aba', 'acleda', 'wing']

function mapProvince(text) {
  const value = (text || '').toLowerCase()
  if (value.includes('phnom')) return 'phnom_penh'
  if (value.includes('siem')) return 'siem_reap'
  if (value.includes('battambang')) return 'battambang'
  if (value.includes('kandal')) return 'kandal'
  if (value.includes('kampong cham')) return 'kampong_cham'
  return 'phnom_penh'
}

function readSavedCartAddress() {
  try {
    const saved = localStorage.getItem('shadow-shop-delivery-address')
    if (!saved) return null
    const addr = JSON.parse(saved)
    return {
      name: addr.name || '',
      phone: addr.phone || '',
      email: addr.email || '',
      province: CART_PROVINCE_MAP[addr.province] || mapProvince(addr.province),
      district: addr.district || '',
      address: [addr.address, addr.subdistrict, addr.district, addr.zip].filter(Boolean).join(', '),
    }
  } catch {
    return null
  }
}

function addressToInfo(addr, user) {
  return {
    name: addr.full_name || '',
    phone: addr.phone || '',
    email: user?.email || '',
    province: mapProvince(addr.state || addr.city),
    district: addr.city || addr.state || '',
    address_line1: addr.address_line1 || '',
    address: formatAddressLocationKhmer({
      state: addr.state,
      city: addr.city,
      address_line2: addr.address_line2,
      postal_code: addr.postal_code,
    }),
  }
}

function buildDeliveryInfo(addresses, user) {
  const saved = addresses.find((a) => a.is_default) || addresses[0]
  if (saved) return addressToInfo(saved, user)

  const cartAddress = readSavedCartAddress()
  if (cartAddress?.name && cartAddress?.phone && cartAddress?.address) return cartAddress

  const { full_name, phone } = getUserContactDefaults(user)
  return {
    name: full_name,
    phone,
    email: user?.email || '',
    province: 'phnom_penh',
    district: '',
    address: '',
  }
}

function submitAbaForm(endpoint, params) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = endpoint
  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value)
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const remaining = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

function getCouponDiscount(coupon, subtotal, deliveryFee) {
  if (!coupon) return 0
  if (coupon.reward_type === 'free_delivery') return Math.min(deliveryFee, subtotal + deliveryFee)
  const value = Number(coupon.coupon_value || 0)
  const discount = coupon.discount_type === 'percent' ? subtotal * value / 100 : value
  return Math.min(Math.max(discount, 0), subtotal + deliveryFee)
}

export default function Checkout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, selectedProductIds, selectAll, removeSelectedItems, appliedCoupon } = useCartStore()
  const { user } = useAuthStore()
  const [paymentMethod, setPaymentMethod] = useState('aba')
  const [submitting, setSubmitting] = useState(false)
  const [bakongOrder, setBakongOrder] = useState(null)
  const [bakongPayment, setBakongPayment] = useState(null)
  const [showBakongPopup, setShowBakongPopup] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(300)
  const [abaLoading, setAbaLoading] = useState(false)
  const [checkingBakong, setCheckingBakong] = useState(false)
  const [pendingReturnPayment, setPendingReturnPayment] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PENDING_PAYMENT_KEY) || 'null')
    } catch {
      return null
    }
  })

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => authApi.addresses.list().then((r) => r.data.results ?? r.data),
  })

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
  })

  const paymentMethods = useMemo(() => {
    const base = PAYMENT_METHOD_KEYS.map((key) => ({
      key,
      label: t(`checkout.paymentMethods.${key}.label`),
      badge: t(`checkout.paymentMethods.${key}.badge`),
      desc: t(`checkout.paymentMethods.${key}.desc`),
    }))
    const settings = siteSettings?.payment_methods
    if (!settings || Object.keys(settings).length === 0) return base
    return base.filter((m) => settings[m.key] !== false)
  }, [siteSettings, t])

  const provinces = useMemo(() => {
    const fees = (siteSettings?.delivery_fees && Object.keys(siteSettings.delivery_fees).length > 0)
      ? siteSettings.delivery_fees
      : DEFAULT_PROVINCE_FEES
    return Object.entries(fees)
      .map(([value, config]) => {
        const isObjectConfig = config && typeof config === 'object'
        return {
          value,
          label: isObjectConfig ? (config.label || PROVINCE_LABELS[value] || value) : (PROVINCE_LABELS[value] || value),
          fee: parseFloat(isObjectConfig ? config.fee : config) || 0,
          enabled: isObjectConfig ? config.enabled !== false : true,
          is_default: isObjectConfig ? config.is_default === true : false,
        }
      })
      .filter((province) => province.enabled)
  }, [siteSettings])

  const info = useMemo(() => buildDeliveryInfo(addresses, user), [addresses, user])
  const checkoutItems = items.filter((item) => selectedProductIds.includes(getCartKey(item)))
  const hasAddress = Boolean(info.name && info.phone && (info.address || info.address_line1))
  const province = hasAddress
    ? (provinces.find((p) => p.value === info.province) || provinces.find((p) => p.is_default) || provinces[0])
    : null
  const subtotal = checkoutItems.reduce((sum, i) => sum + i.product.retail_price * i.quantity, 0)
  const deliveryFee = checkoutItems.length > 0 && hasAddress ? Number(province?.fee || 0) : 0
  const couponDiscount = getCouponDiscount(appliedCoupon, subtotal, deliveryFee)
  const grandTotal = subtotal + deliveryFee - couponDiscount

  useEffect(() => {
    if (items.length > 0 && selectedProductIds.length === 0) {
      selectAll()
    }
  }, [])

  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.find((m) => m.key === paymentMethod)) {
      setPaymentMethod(paymentMethods[0].key)
    }
  }, [paymentMethods])

  useEffect(() => {
    const reference = pendingReturnPayment?.reference
    const orderId = pendingReturnPayment?.orderId
    if (!reference && !orderId) return undefined

    let stopped = false
    const checkOrderPayment = async () => {
      try {
        if (reference) {
          const { data } = await ordersApi.orders.checkoutStatus(reference)
          if (stopped) return
          if (data.order_id && data.order) {
            localStorage.removeItem(PENDING_PAYMENT_KEY)
            setPendingReturnPayment(null)
            removeSelectedItems()
            navigate('/order-success', {
              replace: true,
              state: {
                orderId: data.order_id,
                orderNumber: data.order_number,
              },
            })
          }
          return
        }

        const { data: order } = await ordersApi.orders.get(orderId)
        if (stopped) return
        if (order.payment_status === 'paid') {
          localStorage.removeItem(PENDING_PAYMENT_KEY)
          setPendingReturnPayment(null)
          removeSelectedItems()
          navigate('/order-success', {
            replace: true,
            state: {
              orderId: order.id,
              orderNumber: order.order_number,
            },
          })
        }
      } catch {
        if (!stopped) {
          localStorage.removeItem(PENDING_PAYMENT_KEY)
          setPendingReturnPayment(null)
        }
      }
    }

    checkOrderPayment()
    const timer = setInterval(checkOrderPayment, 2500)

    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [pendingReturnPayment?.reference, pendingReturnPayment?.orderId, navigate, removeSelectedItems])

  useEffect(() => {
    if (!bakongPayment || bakongPayment.status === 'paid' || bakongPayment.status === 'expired') {
      return undefined
    }

    let stopped = false
    let failures = 0
    let notifiedFailure = false
    const checkPayment = async () => {
      setCheckingBakong(true)
      try {
        const { data } = await ordersApi.payments.checkBakong(bakongPayment.id)
        if (stopped) return
        failures = 0
        setBakongPayment(data)
        if (data.status === 'paid') {
          stopped = true
          if (data.order) setBakongOrder(data.order)
          setShowBakongPopup(false)
          setShowSuccessModal(true)
          removeSelectedItems()
        }
      } catch {
        failures += 1
        if (failures >= 5 && !notifiedFailure) {
          notifiedFailure = true
          toast.error(t('checkout.paymentCheckFailed'))
        }
      } finally {
        if (!stopped) setCheckingBakong(false)
      }
    }

    checkPayment()
    const timer = setInterval(checkPayment, 2000)

    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [bakongPayment?.id, bakongPayment?.status, removeSelectedItems, t])

  useEffect(() => {
    if (!showBakongPopup || !bakongPayment || bakongPayment.status !== 'pending') {
      return undefined
    }

    const getRemainingSeconds = () => {
      if (!bakongPayment.expires_at) return 300
      return Math.max(0, Math.floor((new Date(bakongPayment.expires_at).getTime() - Date.now()) / 1000))
    }

    setPaymentSecondsLeft(getRemainingSeconds())
    const timer = setInterval(() => {
      setPaymentSecondsLeft(getRemainingSeconds())
    }, 1000)

    return () => clearInterval(timer)
  }, [showBakongPopup, bakongPayment?.id, bakongPayment?.expires_at, bakongPayment?.status])

  const buildCheckoutPayload = () => ({
    name: info.name,
    phone: info.phone,
    email: info.email,
    address: info.address,
    address_detail: info.address_line1 || '',
    province: info.province,
    district: info.district,
    payment_method: paymentMethod,
    payment_status: 'unpaid',
    delivery_fee: deliveryFee,
    coupon_code: appliedCoupon?.coupon_code || '',
    notes: `Home Delivery. ${info.district ? `${info.district}, ${province.label}` : province.label}`,
    items: checkoutItems.map((i) => ({
      product: i.product.item_type === 'set' ? undefined : i.product.id,
      product_set: i.product.item_type === 'set' ? i.product.product_set_id : undefined,
      quantity: i.quantity,
      unit_price: i.product.retail_price,
      cost_price: i.product.cost_price || 0,
    })),
  })

  const handlePlaceOrder = async () => {
    if (paymentMethod === 'bakong' && bakongPayment && bakongPayment.status !== 'paid') {
      setShowBakongPopup(true)
      return
    }

    if (!hasAddress) {
      toast.error(t('checkout.addAddressFirst'))
      navigate('/address-book')
      return
    }

    setSubmitting(true)
    try {
      const checkoutPayload = buildCheckoutPayload()
      const { data: result } = await ordersApi.orders.checkout(checkoutPayload)

      if (ONLINE_PAYMENT_METHODS.includes(paymentMethod)) {
        const pending = result.pending_checkout
        if (paymentMethod === 'bakong') {
          const payment = result.bakong_payment
          if (!payment) throw new Error('Missing Bakong payment')
          setBakongOrder(null)
          setBakongPayment(payment)
          setShowBakongPopup(true)
          toast.success(t('checkout.scanQrToast'))
          return
        }

        if (paymentMethod === 'aba') {
          const abaData = result.aba_payment
          if (!abaData) throw new Error('Missing ABA payment')
          setAbaLoading(true)
          const pendingState = {
            reference: pending.reference,
            paymentMethod: 'aba',
            createdAt: Date.now(),
          }
          localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(pendingState))
          setPendingReturnPayment(pendingState)
          submitAbaForm(abaData.endpoint, abaData.params)
          return
        }

        toast.error(t('checkout.paymentUnavailable'))
        return
      }

      const order = result
      removeSelectedItems()
      navigate('/order-success', { state: { orderId: order.id, orderNumber: order.order_number } })
    } catch (error) {
      const detail = error?.response?.data?.coupon_code || error?.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0] : detail || t('checkout.placeOrderFailed'))
    } finally {
      setSubmitting(false)
      setAbaLoading(false)
    }
  }

  const successModal = (
    <OrderSuccessModal
      open={showSuccessModal}
      onTrack={() => navigate(bakongOrder?.id ? `/my-orders/${bakongOrder.id}` : '/my-orders')}
      onBack={() => navigate('/shop')}
    />
  )

  if ((items.length === 0 || checkoutItems.length === 0) && !showSuccessModal) {
    return (
      <div className="flex min-h-[calc(100svh-9rem)] items-center justify-center py-6 md:min-h-[520px]">
        <div className="w-full max-w-xl">
          <EmptyState
            title={t('checkout.emptyTitle')}
            description={t('checkout.emptyText')}
            action={
              <button onClick={() => navigate(items.length > 0 ? '/cart' : '/shop')} className="shop-btn-primary mt-6 px-8">
                {items.length > 0 ? t('checkout.backToCart') : t('checkout.shopProducts')}
              </button>
            }
          />
        </div>
      </div>
    )
  }

  if (showSuccessModal && (items.length === 0 || checkoutItems.length === 0)) {
    return (
      <>
        <div className="flex min-h-[calc(100svh-9rem)] items-center justify-center bg-white py-6 md:min-h-[520px]" />
        {successModal}
      </>
    )
  }

  return (
    <div className="bg-white pb-28 md:pb-0">
      <div className="-mx-4 -mt-4 mb-5 grid min-h-[64px] grid-cols-[44px_1fr_44px] items-center border-b border-gray-100 bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:mx-0 md:mt-0 md:flex md:min-h-0 md:gap-3 md:border-0 md:px-0 md:pb-0 md:pt-0">
        <button onClick={() => navigate('/cart')} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95 md:h-10 md:w-10 md:border md:border-gray-200 md:bg-white">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-pink-600">{t('checkout.title')}</p>
          <h1 className="truncate text-base font-black tracking-tight text-gray-950 md:text-2xl">{t('checkout.secureTitle')}</h1>
        </div>
        <div className="md:hidden" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          {/* Delivery address */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-950">{t('checkout.deliveryAddress')}</h2>
              <button
                onClick={() => navigate('/address-book')}
                className="text-sm font-bold text-pink-600"
              >
                {t('checkout.change')}
              </button>
            </div>

            {addressesLoading ? (
              <div className="mt-4 h-24 animate-pulse rounded-2xl bg-gray-100" />
            ) : hasAddress ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-950">{info.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{info.phone}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600" style={{ fontFamily: KHMER_FONT_FAMILY }}>
                    {[info.address_line1, info.address].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-center">
                <p className="text-sm font-semibold text-gray-600">{t('checkout.noAddress')}</p>
                <button
                  onClick={() => navigate('/address-book')}
                  className="mt-4 rounded-full bg-pink-600 px-6 py-2.5 text-sm font-bold text-white"
                >
                  {t('checkout.addAddress')}
                </button>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-gray-950">{t('checkout.paymentMethod')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.key}
                  onClick={() => setPaymentMethod(method.key)}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                    paymentMethod === method.key ? 'border-pink-500 bg-pink-50' : 'border-gray-100 bg-white hover:border-pink-200'
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#08172f] text-xs font-bold text-white">
                    {method.badge}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-gray-950">{method.label}</span>
                    <span className="text-xs text-gray-400">{method.desc}</span>
                  </span>
                  {paymentMethod === method.key && <Check className="shrink-0 text-pink-600" size={18} />}
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-card lg:hidden">
            <h2 className="text-sm font-bold text-gray-950">{t('checkout.orderItems')}</h2>
            <div className="mt-4 space-y-3">
              {checkoutItems.map((item) => (
                <div key={getCartKey(item)} className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <ProductThumb product={item.product} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-gray-950">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{t('checkout.qty')} {item.quantity}</p>
                  </div>
                  <p className="text-sm font-black text-gray-950">{formatCurrency(item.product.retail_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-3xl border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-5 shadow-soft lg:sticky lg:top-36">
          <h2 className="text-lg font-black text-gray-950">{t('checkout.orderSummary')}</h2>
          <div className="mt-4 hidden space-y-3 lg:block">
            {checkoutItems.map((item) => (
              <div key={getCartKey(item)} className="flex items-center gap-3">
                <ProductThumb product={item.product} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-950">{item.product.name}</p>
                  <p className="text-xs text-gray-400">{t('checkout.qty')} {item.quantity}</p>
                </div>
                <p className="text-sm font-black text-gray-950">{formatCurrency(item.product.retail_price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t border-pink-100 pt-5 text-sm">
            <SummaryLine label={t('checkout.subtotal')} value={formatCurrency(subtotal)} />
            <SummaryLine label={t('checkout.deliveryFee')} value={formatCurrency(deliveryFee)} />
            <SummaryLine label={t('checkout.discount')} value={`-${formatCurrency(couponDiscount)}`} success />
          </div>
          <div className="mt-5 flex justify-between border-t border-pink-100 pt-5">
            <span className="font-black text-gray-950">{t('checkout.totalAmount')}</span>
            <span className="text-xl font-black text-pink-600">{formatCurrency(grandTotal)}</span>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={submitting || abaLoading || !hasAddress}
            className="shop-btn-primary mt-6 hidden w-full py-4 disabled:cursor-not-allowed disabled:opacity-60 md:block"
          >
            {(submitting || abaLoading) ? t('checkout.pleaseWait') : ONLINE_PAYMENT_METHODS.includes(paymentMethod) ? t('checkout.payNow') : t('checkout.placeOrder')}
          </button>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white px-4 pb-5 pt-3 shadow-[0_-8px_25px_rgba(15,23,42,0.08)] md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black text-gray-950">{formatCurrency(grandTotal)}</p>
            <p className="text-xs text-gray-400">{checkoutItems.length} {checkoutItems.length === 1 ? t('checkout.item') : t('checkout.items')}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={submitting || abaLoading || !hasAddress}
            className="rounded-full bg-pink-600 px-6 py-2.5 text-base font-black text-white shadow-lg shadow-pink-200 disabled:opacity-60"
          >
            {(submitting || abaLoading) ? t('checkout.pleaseWait') : ONLINE_PAYMENT_METHODS.includes(paymentMethod) ? t('checkout.payNow') : t('checkout.placeOrder')}
          </button>
        </div>
      </div>

      {bakongPayment && showBakongPopup && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-gray-950/55 px-4 py-5 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-[340px] rounded-[1.5rem] bg-white p-4 shadow-2xl md:max-w-sm md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                  <QrCode size={19} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-pink-600">{t('checkout.bakong.title')}</p>
                  <h2 className="mt-0.5 text-xl font-black text-gray-950">{t('checkout.bakong.scanTitle')}</h2>
                  <p className="mt-0.5 text-xs font-semibold text-gray-500">
                    {bakongPayment.reference
                      ? t('checkout.bakong.paymentRef', { ref: bakongPayment.reference })
                      : bakongOrder?.order_number
                        ? t('checkout.bakong.orderNumber', { number: bakongOrder.order_number })
                        : t('checkout.bakong.waitingPayment')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBakongPopup(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-pink-50 p-3.5 text-center">
              <img
                src={bakongPayment.qr_image}
                alt="Bakong KHQR"
                className="mx-auto h-48 w-48 rounded-2xl bg-white p-2 shadow-xl shadow-pink-100"
              />
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500">
                <ShieldCheck size={14} className="text-pink-600" />
                {t('checkout.bakong.securedBy')}
              </div>
            </div>

            <div className="py-3.5 text-center">
              <p className="text-xs font-bold text-gray-500">{t('checkout.totalAmount')}</p>
              <p className="mt-0.5 text-3xl font-black text-pink-600">{formatCurrency(bakongPayment.amount)}</p>
            </div>

            <div className={`border-t border-dashed pt-3 ${
              bakongPayment.status === 'paid'
                ? 'border-green-100'
                : bakongPayment.status === 'expired'
                  ? 'border-red-100'
                  : 'border-pink-100'
            }`}>
              <div className={`flex items-center gap-3 rounded-2xl border p-3 ${
                bakongPayment.status === 'paid'
                  ? 'border-green-100 bg-green-50 text-green-700'
                  : bakongPayment.status === 'expired'
                    ? 'border-red-100 bg-red-50 text-red-700'
                    : 'border-pink-100 bg-pink-50 text-pink-600'
              }`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                  {bakongPayment.status === 'paid' ? <Check size={21} /> : <Clock size={21} className={checkingBakong ? 'animate-spin' : ''} />}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black">
                      {bakongPayment.status === 'paid'
                        ? t('checkout.bakong.paymentReceived')
                        : bakongPayment.status === 'expired'
                          ? t('checkout.bakong.qrExpired')
                          : checkingBakong ? t('checkout.bakong.checkingPayment') : t('checkout.bakong.waitingPayment')}
                    </p>
                    {bakongPayment.status === 'pending' && (
                      <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-sm font-black text-pink-600">
                        {formatTimer(paymentSecondsLeft)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {bakongPayment.status === 'paid'
                      ? t('checkout.bakong.paidSuccess')
                      : bakongPayment.status === 'expired'
                        ? t('checkout.bakong.qrExpiredHint')
                        : checkingBakong ? t('checkout.bakong.confirmingPayment') : t('checkout.bakong.payToCreate')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setShowBakongPopup(false)}
                className="w-full rounded-full border border-gray-200 px-4 py-3 text-sm font-black text-gray-600"
              >
                {t('checkout.bakong.cancelPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal}

    </div>
  )
}

function SummaryLine({ label, value, success = false }) {
  return (
    <div className="flex justify-between">
      <span className="font-semibold text-gray-500">{label}</span>
      <span className={`font-black ${success ? 'text-green-600' : 'text-gray-950'}`}>{value}</span>
    </div>
  )
}
