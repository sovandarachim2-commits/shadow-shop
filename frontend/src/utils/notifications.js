import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import useAuthStore from '@/store/authStore'

export const READ_IDS_STORAGE_KEY = 'ss_read_notification_order_ids'
const SEEN_REFERRAL_CLAIMS_KEY = 'ss_seen_referral_claim_ids'
const READ_UPDATED_EVENT = 'ss-notifications-read-updated'

export function loadReadIds() {
  try {
    const raw = localStorage.getItem(READ_IDS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveReadIds(ids) {
  try {
    localStorage.setItem(READ_IDS_STORAGE_KEY, JSON.stringify(ids))
    window.dispatchEvent(new Event(READ_UPDATED_EVENT))
  } catch {
    // ignore storage quota errors
  }
}

export function isRecentUnreadCandidate(order) {
  if (!order) return false
  if (!['completed', 'delivered', 'cancelled'].includes(order.status)) return true
  const updatedAt = new Date(order.updated_at || order.created_at).getTime()
  return Number.isFinite(updatedAt) && Date.now() - updatedAt <= 7 * 24 * 60 * 60 * 1000
}

export function isReferralClaimTransaction(tx) {
  if (!tx) return false
  const note = String(tx.note || '').toLowerCase()
  return Number(tx.points || 0) > 0 && note.includes('referral')
}

export function useUnreadNotificationCount() {
  const { isAuthenticated, user } = useAuthStore()
  const isSellerOrStaff = Boolean(isAuthenticated && user?.role && user.role !== 'customer')
  const [readOrderIds, setReadOrderIds] = useState(loadReadIds)

  useEffect(() => {
    const sync = () => setReadOrderIds(loadReadIds())
    window.addEventListener(READ_UPDATED_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(READ_UPDATED_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const { data: ordersData } = useQuery({
    queryKey: ['customer-notifications-orders'],
    queryFn: () => ordersApi.orders.list({ page_size: 10, my_orders: 1 }).then((r) => r.data?.results || r.data || []),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  })

  const { data: sellerOrdersData } = useQuery({
    queryKey: ['seller-notifications-orders'],
    queryFn: () => ordersApi.orders.list({ page_size: 15 }).then((r) => r.data?.results || r.data || []),
    enabled: isSellerOrStaff,
    staleTime: 60 * 1000,
  })

  const { data: rewardsSummary } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  })

  const { data: homeFeed } = useQuery({
    queryKey: ['home-feed-notifications'],
    queryFn: () => productsApi.home.feed().then((r) => r.data),
    staleTime: 60 * 1000,
  })

  return useMemo(() => {
    const orders = Array.isArray(ordersData) ? ordersData.slice(0, 10) : []
    const sellerOrders = Array.isArray(sellerOrdersData) ? sellerOrdersData.slice(0, 15) : []

    const unreadOrders = orders.filter(
      (order) => isRecentUnreadCandidate(order) && !readOrderIds.includes(order.id)
    ).length

    const unreadSeller = isSellerOrStaff
      ? sellerOrders.filter(
          (order) => isRecentUnreadCandidate(order) && !readOrderIds.includes(`seller-${order.id}`)
        ).length
      : 0

    const activeCoupons = (rewardsSummary?.redemptions || []).filter((item) => {
      if (!item.coupon_code || item.status !== 'active') return false
      const exp = item.ends_at || item.expires_at
      return !exp || new Date(exp).getTime() >= Date.now()
    }).length

    const unreadReferrals = (rewardsSummary?.transactions || []).filter((tx) => {
      if (!isReferralClaimTransaction(tx)) return false
      return !readOrderIds.includes(`tx-${tx.id}`)
    }).length

    const flashSales = Array.isArray(homeFeed?.flash_sales) ? homeFeed.flash_sales.length : 0

    return unreadOrders + unreadSeller + activeCoupons + unreadReferrals + flashSales
  }, [ordersData, sellerOrdersData, rewardsSummary?.redemptions, rewardsSummary?.transactions, homeFeed?.flash_sales, readOrderIds, isSellerOrStaff])
}

function loadSeenReferralIds() {
  try {
    const raw = localStorage.getItem(SEEN_REFERRAL_CLAIMS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useUnseenReferralClaim() {
  const { isAuthenticated } = useAuthStore()
  const [seenIds, setSeenIds] = useState(loadSeenReferralIds)

  const { data: rewardsSummary } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  })

  const unseenClaim = useMemo(() => {
    if (!isAuthenticated) return null
    const readIds = loadReadIds()
    const list = rewardsSummary?.transactions || []
    return (
      list.find(
        (tx) =>
          isReferralClaimTransaction(tx) &&
          !seenIds.includes(tx.id) &&
          !readIds.includes(`tx-${tx.id}`)
      ) || null
    )
  }, [isAuthenticated, rewardsSummary?.transactions, seenIds])

  const markClaimSeen = (txId, alsoMarkRead = false) => {
    if (!txId) return
    setSeenIds((prev) => {
      if (prev.includes(txId)) return prev
      const next = [...prev, txId]
      try {
        localStorage.setItem(SEEN_REFERRAL_CLAIMS_KEY, JSON.stringify(next))
      } catch {
        // ignore storage quota errors
      }
      return next
    })
    if (alsoMarkRead) {
      const readIds = loadReadIds()
      const readKey = `tx-${txId}`
      if (!readIds.includes(readKey)) {
        saveReadIds([...readIds, readKey])
      }
    }
  }

  return { unseenClaim, markClaimSeen }
}

