import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Filter, ShoppingBag, Truck } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import { ProductThumb } from '@/components/customer/CustomerUi'
import { useTranslation } from 'react-i18next'

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

function actionForOrder(order, t) {
  if (order.status === 'completed') return { label: t('orders.buyAgain'), icon: ShoppingBag, outline: true }
  return { label: t('orders.trackOrder'), icon: Truck }
}

export default function MyOrders() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', activeTab],
    queryFn: () => ordersApi.orders.list({ status: activeTab || undefined, page_size: 30 }).then((r) => r.data.results ?? r.data),
  })

  const orders = data || []

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
            const action = actionForOrder(order, t)
            const ActionIcon = action.icon
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

                <div className="mt-3">
                  <button
                    onClick={() => navigate(action.outline ? '/shop' : `/my-orders/${order.id}`)}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black ${
                      action.outline
                        ? 'border border-pink-500 bg-white text-pink-600'
                        : 'bg-pink-600 text-white shadow-lg shadow-pink-100'
                    }`}
                  >
                    <ActionIcon size={17} /> {action.label}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
