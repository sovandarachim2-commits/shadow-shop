import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Send,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import { ProductThumb } from '@/components/customer/CustomerUi'
import { cn, formatCurrency, formatDate } from '@/utils/helpers'
import { resolveAnnouncementPresentation } from '@/utils/announcementUtils'
import { isRecentUnreadCandidate, isReferralClaimTransaction, loadReadIds, saveReadIds } from '@/utils/notifications'

const PREFS_STORAGE_KEY = 'ss_notification_preferences'

const STATUS_STYLES = {
  new: 'bg-amber-50 text-amber-700',
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-orange-50 text-orange-700',
  printed: 'bg-orange-50 text-orange-700',
  preparing: 'bg-orange-50 text-orange-700',
  packed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-cyan-50 text-cyan-700',
  completed: 'bg-emerald-50 text-emerald-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL_KEYS = {
  new: 'orders.status.pending',
  pending: 'orders.status.pending',
  confirmed: 'orders.status.confirmed',
  printed: 'orders.status.confirmed',
  preparing: 'orders.status.preparing',
  packed: 'orders.status.packed',
  shipped: 'orders.status.shipped',
  completed: 'orders.status.delivered',
  delivered: 'orders.status.delivered',
  cancelled: 'orders.status.cancelled',
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return {
      orderUpdates: true,
      promotionsDeals: true,
      newArrivalsNotif: false,
      accountActivity: true,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
    }
  } catch {
    return {
      orderUpdates: true,
      promotionsDeals: true,
      newArrivalsNotif: false,
      accountActivity: true,
    }
  }
}

export default function Notifications() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuthStore()
  const isSellerOrStaff = Boolean(isAuthenticated && user?.role && user.role !== 'customer')
  const cartCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0))
  const lang = i18n.language?.startsWith('km') ? 'km' : 'en'

  const [activeTab, setActiveTab] = useState('my')
  const [readOrderIds, setReadOrderIds] = useState(loadReadIds)
  const [showPrefs, setShowPrefs] = useState(false)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [waitingForTelegram, setWaitingForTelegram] = useState(false)
  const [telegramBusy, setTelegramBusy] = useState(false)
  const [telegramDeepLink, setTelegramDeepLink] = useState('')

  const { data: telegramStatus } = useQuery({
    queryKey: ['telegram-connect'],
    queryFn: () => authApi.telegramConnect.get().then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: waitingForTelegram ? 2500 : false,
  })

  useEffect(() => {
    if (waitingForTelegram && telegramStatus?.connected) {
      setWaitingForTelegram(false)
      setTelegramDeepLink('')
      toast.success(t('notificationsPage.telegramConnectedToast'))
    }
  }, [waitingForTelegram, telegramStatus?.connected, t])

  useEffect(() => {
    if (!isAuthenticated || !telegramStatus || telegramStatus.connected || telegramDeepLink) return
    let cancelled = false
    authApi.telegramConnect
      .createLink()
      .then((res) => {
        if (!cancelled && res.data?.deep_link) {
          setTelegramDeepLink(res.data.deep_link)
        }
      })
      .catch(() => {
        // fallback to on-demand link creation when tapped
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, telegramStatus, telegramDeepLink])

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-notifications-orders'],
    queryFn: () => ordersApi.orders.list({ page_size: 10, my_orders: 1 }).then((r) => r.data?.results || r.data || []),
    enabled: isAuthenticated,
  })

  const { data: sellerOrdersData, isLoading: sellerOrdersLoading } = useQuery({
    queryKey: ['seller-notifications-orders'],
    queryFn: () => ordersApi.orders.list({ page_size: 15 }).then((r) => r.data?.results || r.data || []),
    enabled: isSellerOrStaff,
  })

  const { data: rewardsSummary } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((r) => r.data),
    enabled: isAuthenticated,
  })

  const { data: announcements = [] } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => productsApi.announcements.public().then((r) => (Array.isArray(r.data) ? r.data : [])),
  })

  const { data: homeFeed } = useQuery({
    queryKey: ['home-feed-notifications'],
    queryFn: () => productsApi.home.feed().then((r) => r.data),
  })

  const orders = useMemo(
    () => (Array.isArray(ordersData) ? ordersData.slice(0, 10) : []),
    [ordersData]
  )

  const sellerOrders = useMemo(
    () => (Array.isArray(sellerOrdersData) ? sellerOrdersData.slice(0, 15) : []),
    [sellerOrdersData]
  )

  const activeCouponsCount = useMemo(() => {
    const list = rewardsSummary?.redemptions || []
    return list.filter((item) => {
      if (!item.coupon_code || item.status !== 'active') return false
      const exp = item.ends_at || item.expires_at
      return !exp || new Date(exp).getTime() >= Date.now()
    }).length
  }, [rewardsSummary?.redemptions])

  const flashSalesCount = useMemo(
    () => (Array.isArray(homeFeed?.flash_sales) ? homeFeed.flash_sales.length : 0),
    [homeFeed?.flash_sales]
  )

  const latestAnnouncement = useMemo(() => {
    for (const item of announcements) {
      const resolved = resolveAnnouncementPresentation(item, { device: 'mobile', language: lang })
      if (resolved.visible && resolved.message) return resolved.message
    }
    return ''
  }, [announcements, lang])

  const referralClaims = useMemo(
    () => (rewardsSummary?.transactions || []).filter(isReferralClaimTransaction),
    [rewardsSummary?.transactions]
  )

  const unreadReferralCount = useMemo(
    () => referralClaims.filter((tx) => !readOrderIds.includes(`tx-${tx.id}`)).length,
    [referralClaims, readOrderIds]
  )

  const unreadOrdersCount = useMemo(
    () => orders.filter((order) => isRecentUnreadCandidate(order) && !readOrderIds.includes(order.id)).length,
    [orders, readOrderIds]
  )

  const unreadSellerCount = useMemo(
    () => sellerOrders.filter((order) => isRecentUnreadCandidate(order) && !readOrderIds.includes(`seller-${order.id}`)).length,
    [sellerOrders, readOrderIds]
  )

  const myTabBadge = flashSalesCount + activeCouponsCount + unreadOrdersCount + unreadReferralCount

  const markOrderRead = (orderId) => {
    setReadOrderIds((prev) => {
      if (prev.includes(orderId)) return prev
      const next = [...prev, orderId]
      saveReadIds(next)
      return next
    })
  }

  const handleReadAll = () => {
    const targetIds = activeTab === 'seller'
      ? sellerOrders.map((o) => `seller-${o.id}`)
      : [...orders.map((o) => o.id), ...referralClaims.map((tx) => `tx-${tx.id}`)]
    if (targetIds.length === 0) return
    const allIds = Array.from(new Set([...readOrderIds, ...targetIds]))
    setReadOrderIds(allIds)
    saveReadIds(allIds)
    toast.success(t('notificationsPage.markedAllRead'))
  }

  const togglePref = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage quota errors
      }
      return next
    })
  }

  const handleConnectTelegram = async () => {
    if (!isAuthenticated) {
      toast.error(t('notificationsPage.telegramSignInRequired'))
      return
    }
    setTelegramBusy(true)
    try {
      const res = await authApi.telegramConnect.createLink()
      const deepLink = res.data?.deep_link
      if (deepLink) {
        setTelegramDeepLink(deepLink)
        setWaitingForTelegram(true)
        const opened = window.open(deepLink, '_blank', 'noopener,noreferrer')
        if (!opened) {
          window.location.assign(deepLink)
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('common.error', 'Something went wrong'))
    } finally {
      setTelegramBusy(false)
    }
  }

  const handleToggleTelegramNotifications = async () => {
    if (!telegramStatus?.connected || telegramBusy) return
    setTelegramBusy(true)
    try {
      const nextEnabled = !telegramStatus.telegram_notifications_enabled
      const res = await authApi.telegramConnect.setNotifications(nextEnabled)
      queryClient.setQueryData(['telegram-connect'], res.data)
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('common.error', 'Something went wrong'))
    } finally {
      setTelegramBusy(false)
    }
  }

  const categoryRows = [
    {
      key: 'promotions',
      icon: Tag,
      iconTone: 'bg-amber-50 text-amber-600',
      title: t('notificationsPage.promotions'),
      subtitle:
        flashSalesCount > 0
          ? t('notificationsPage.flashDealsCount', { count: flashSalesCount })
          : t('notificationsPage.promotionsEmpty'),
      badge: flashSalesCount,
      onClick: () => navigate('/shop?filter=flash_sale'),
    },
    {
      key: 'rewards',
      icon: Gift,
      iconTone: 'bg-purple-50 text-purple-600',
      title: t('notificationsPage.rewardsCoupons'),
      subtitle: isAuthenticated
        ? t('notificationsPage.rewardsSubtitle', {
            points: Number(rewardsSummary?.current_points ?? rewardsSummary?.points_balance ?? 0).toLocaleString(),
            count: activeCouponsCount,
          })
        : t('notificationsPage.rewardsGuest'),
      badge: activeCouponsCount,
      onClick: () => navigate('/profile/rewards/coupons'),
    },
    {
      key: 'updates',
      icon: Sparkles,
      iconTone: 'bg-pink-50 text-pink-600',
      title: t('notificationsPage.storeUpdates'),
      subtitle: latestAnnouncement || t('notificationsPage.storeUpdatesEmpty'),
      badge: 0,
      onClick: () => navigate('/shop?filter=new_arrival'),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto grid min-h-[60px] max-w-[960px] grid-cols-[44px_1fr_auto] items-center gap-2 px-4 pb-2.5 pt-[calc(0.6rem+var(--page-safe-top))] md:px-6 md:pt-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t('common.back')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-gray-800 transition hover:bg-gray-100 active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="truncate text-center text-base font-black text-gray-950 md:text-lg">
            {t('notificationsPage.title')}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPrefs(true)}
              aria-label={t('notificationsPage.preferences')}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 active:scale-95"
            >
              <Settings size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              aria-label={t('nav.cart')}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-pink-600 transition hover:bg-pink-50 active:scale-95 md:hidden"
            >
              <ShoppingCart size={19} />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] font-black text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {isSellerOrStaff && (
          <div className="mx-auto grid max-w-[960px] grid-cols-2 border-t border-gray-100">
            {[
              { key: 'my', label: t('notificationsPage.myNotifications'), badge: myTabBadge },
              { key: 'seller', label: t('notificationsPage.sellerUpdates'), badge: unreadSellerCount },
            ].map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-black transition sm:text-sm',
                    isActive
                      ? 'border-pink-600 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="flex h-4 min-w-[18px] items-center justify-center rounded-full bg-pink-600 px-1 text-[10px] font-black text-white">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </header>

      <div className="mx-auto max-w-[960px] md:px-6 md:pt-5">
        {isSellerOrStaff && activeTab === 'seller' ? (
          <section className="md:mt-0">
            <div className="flex items-center justify-between px-4 py-2.5 md:px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">
                {t('notificationsPage.sellerOrderUpdates')}
              </h2>
              {unreadSellerCount > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  className="text-xs font-bold text-pink-600 transition hover:underline"
                >
                  {t('notificationsPage.readAll')}
                </button>
              )}
            </div>

            {sellerOrdersLoading ? (
              <div className="space-y-2 px-4 md:px-0">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-white p-4 shadow-sm" />
                ))}
              </div>
            ) : sellerOrders.length === 0 ? (
              <div className="mx-4 mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center md:mx-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                  <ShoppingBag size={30} />
                </div>
                <p className="mt-4 text-sm font-bold text-gray-500">{t('notificationsPage.noSellerUpdates')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/admin/orders')}
                  className="mt-5 rounded-xl border border-pink-500 bg-white px-6 py-2.5 text-sm font-black text-pink-600 transition hover:bg-pink-50 active:scale-95"
                >
                  {t('notificationsPage.goToSellerOrders')}
                </button>
              </div>
            ) : (
              <div className="overflow-hidden border-y border-gray-100 bg-white md:rounded-2xl md:border md:shadow-sm">
                {sellerOrders.map((order) => {
                  const readKey = `seller-${order.id}`
                  const isUnread = isRecentUnreadCandidate(order) && !readOrderIds.includes(readKey)
                  const statusKey = STATUS_LABEL_KEYS[order.status] || 'orders.status.pending'
                  const statusLabel = t(statusKey, { defaultValue: order.status })
                  const statusTone = STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'
                  const itemCount = Number(order.items_count || 1)
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        markOrderRead(readKey)
                        navigate(`/admin/orders/${order.id}`)
                      }}
                      className={cn(
                        'flex w-full items-center gap-3.5 border-b border-gray-100 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-gray-50/80',
                        isUnread ? 'bg-pink-50/20' : 'bg-white'
                      )}
                    >
                      <ProductThumb
                        product={{
                          name: order.preview_name || order.order_number || t('common.product'),
                          primary_image: order.preview_image || order.items_preview?.[0]?.product_image || '',
                        }}
                        size="md"
                        className="h-12 w-12 shrink-0 rounded-xl"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-black text-gray-950">
                            {order.customer_name || order.preview_name || t('notificationsPage.orderNumber', { number: order.order_number })}
                          </span>
                          <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black', statusTone)}>
                            {statusLabel}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-xs font-semibold text-gray-500">
                          <span className="font-mono text-[11px] text-gray-400">#{order.order_number}</span>
                          <span>·</span>
                          <span>
                            {itemCount > 1 ? `${itemCount} ${t('common.items', 'items')} · ` : ''}
                            {formatCurrency(order.grand_total)}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium text-gray-400">
                          {formatDate(order.updated_at || order.created_at)}
                        </span>
                      </span>
                      {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-pink-600" />}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
        <>
        {isAuthenticated && (
          <section className="mb-3 flex items-center gap-3.5 border-b border-gray-100 bg-white px-4 py-3.5 md:mb-4 md:rounded-2xl md:border md:shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
              <Send size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-gray-900">
                {telegramStatus?.connected
                  ? (telegramStatus.telegram_username
                      ? t('notificationsPage.telegramConnectedAs', { username: telegramStatus.telegram_username })
                      : t('notificationsPage.telegramTitle'))
                  : t('notificationsPage.telegramTitle')}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-gray-500">
                {telegramStatus?.connected
                  ? (telegramStatus.telegram_notifications_enabled
                      ? t('notificationsPage.telegramConnectedDesc')
                      : t('notificationsPage.telegramPausedDesc'))
                  : waitingForTelegram
                    ? t('notificationsPage.telegramWaiting')
                    : t('notificationsPage.telegramConnectDesc')}
              </p>
            </div>
            {telegramStatus?.connected ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(telegramStatus.telegram_notifications_enabled)}
                  disabled={telegramBusy}
                  onClick={handleToggleTelegramNotifications}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    telegramStatus.telegram_notifications_enabled ? 'bg-sky-500' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                      telegramStatus.telegram_notifications_enabled ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            ) : telegramDeepLink ? (
              <a
                href={telegramDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWaitingForTelegram(true)}
                className="shrink-0 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-sky-600 active:scale-95"
              >
                {waitingForTelegram ? t('notificationsPage.telegramOpenBot') : t('notificationsPage.telegramConnectBtn')}
              </a>
            ) : (
              <button
                type="button"
                disabled={telegramBusy}
                onClick={handleConnectTelegram}
                className="shrink-0 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-black text-white shadow-sm transition hover:bg-sky-600 active:scale-95 disabled:opacity-60"
              >
                {waitingForTelegram ? t('notificationsPage.telegramOpenBot') : t('notificationsPage.telegramConnectBtn')}
              </button>
            )}
          </section>
        )}

        <section className="overflow-hidden border-b border-gray-100 bg-white md:rounded-2xl md:border md:shadow-sm">
          {categoryRows.map(({ key, icon: Icon, iconTone, title, subtitle, badge, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className="flex w-full items-center gap-3.5 border-b border-gray-100 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-gray-50/80 active:bg-gray-100/70"
            >
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconTone)}>
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-gray-900">{title}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-gray-500">{subtitle}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pink-600 px-1.5 text-[11px] font-black text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                <ChevronRight size={17} className="text-gray-300" />
              </span>
            </button>
          ))}
        </section>

        {isAuthenticated && referralClaims.length > 0 && (
          <section className="mt-3 md:mt-5">
            <div className="flex items-center justify-between px-4 py-2.5 md:px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">
                {t('notificationsPage.referralClaims')}
              </h2>
              {unreadReferralCount > 0 && (
                <button
                  type="button"
                  onClick={handleReadAll}
                  className="text-xs font-bold text-pink-600 transition hover:underline"
                >
                  {t('notificationsPage.readAll')}
                </button>
              )}
            </div>
            <div className="overflow-hidden border-y border-gray-100 bg-white md:rounded-2xl md:border md:shadow-sm">
              {referralClaims.map((tx) => {
                const readKey = `tx-${tx.id}`
                const isUnread = !readOrderIds.includes(readKey)
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      markOrderRead(readKey)
                      navigate('/profile/rewards/referral')
                    }}
                    className={cn(
                      'flex w-full items-center gap-3.5 border-b border-gray-100 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-gray-50/80',
                      isUnread ? 'bg-emerald-50/30' : 'bg-white'
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Users size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-gray-900">
                        {t('notificationsPage.referralBonusEarned', { points: Number(tx.points || 0).toLocaleString() })}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-gray-500">
                        {tx.note}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-gray-400">
                        {formatDate(tx.created_at)}
                      </span>
                    </span>
                    {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-pink-600" />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="mt-3 md:mt-5">
          <div className="flex items-center justify-between px-4 py-2.5 md:px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-400">
              {t('notificationsPage.orderUpdates')}
            </h2>
            {unreadOrdersCount > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                className="text-xs font-bold text-pink-600 transition hover:underline"
              >
                {t('notificationsPage.readAll')}
              </button>
            )}
          </div>

          {ordersLoading ? (
            <div className="space-y-2 px-4 md:px-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-white p-4 shadow-sm" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="mx-4 mt-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center md:mx-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                <ShoppingBag size={30} />
              </div>
              <p className="mt-4 text-sm font-bold text-gray-500">{t('notificationsPage.noOrderUpdates')}</p>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="mt-5 rounded-xl border border-pink-500 bg-white px-6 py-2.5 text-sm font-black text-pink-600 transition hover:bg-pink-50 active:scale-95"
              >
                {t('notificationsPage.goShoppingNow')}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden border-y border-gray-100 bg-white md:rounded-2xl md:border md:shadow-sm">
              {orders.map((order) => {
                const isUnread = isRecentUnreadCandidate(order) && !readOrderIds.includes(order.id)
                const statusKey = STATUS_LABEL_KEYS[order.status] || 'orders.status.pending'
                const statusLabel = t(statusKey, { defaultValue: order.status })
                const statusTone = STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'
                const itemCount = Number(order.items_count || 1)
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => {
                      markOrderRead(order.id)
                      navigate(`/my-orders/${order.id}`)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3.5 border-b border-gray-100 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-gray-50/80',
                      isUnread ? 'bg-pink-50/20' : 'bg-white'
                    )}
                  >
                    <ProductThumb
                      product={{
                        name: order.preview_name || order.order_number || t('common.product'),
                        primary_image: order.preview_image || order.items_preview?.[0]?.product_image || '',
                      }}
                      size="md"
                      className="h-12 w-12 shrink-0 rounded-xl"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-black text-gray-950">
                          {order.preview_name || t('notificationsPage.orderNumber', { number: order.order_number })}
                        </span>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-black', statusTone)}>
                          {statusLabel}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-xs font-semibold text-gray-500">
                        <span className="font-mono text-[11px] text-gray-400">#{order.order_number}</span>
                        <span>·</span>
                        <span>
                          {itemCount > 1 ? `${itemCount} ${t('common.items', 'items')} · ` : ''}
                          {formatCurrency(order.grand_total)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium text-gray-400">
                        {formatDate(order.updated_at || order.created_at)}
                      </span>
                    </span>
                    {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-pink-600" />}
                  </button>
                )
              })}
            </div>
          )}
        </section>
        </>
        )}
      </div>

      {showPrefs && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={() => setShowPrefs(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-950">{t('notificationsPage.preferences')}</h3>
              <button
                type="button"
                onClick={() => setShowPrefs(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { key: 'orderUpdates', titleKey: 'profile.orderUpdates', descKey: 'profile.orderUpdatesDesc' },
                { key: 'promotionsDeals', titleKey: 'profile.promotionsDeals', descKey: 'profile.promotionsDealsDesc' },
                { key: 'newArrivalsNotif', titleKey: 'profile.newArrivalsNotif', descKey: 'profile.newArrivalsNotifDesc' },
                { key: 'accountActivity', titleKey: 'profile.accountActivity', descKey: 'profile.accountActivityDesc' },
              ].map(({ key, titleKey, descKey }) => {
                const enabled = Boolean(prefs[key])
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePref(key)}
                    className="flex w-full items-center justify-between gap-4 py-3.5 text-left"
                  >
                    <div>
                      <p className="text-sm font-black text-gray-950">{t(titleKey)}</p>
                      <p className="text-xs text-gray-400">{t(descKey)}</p>
                    </div>
                    <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition', enabled ? 'bg-pink-600' : 'bg-gray-200')}>
                      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', enabled ? 'right-0.5' : 'left-0.5')} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
