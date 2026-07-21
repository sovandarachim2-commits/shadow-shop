import { format, parseISO } from 'date-fns'
import { cn } from './cn'

export { cn }

export function formatCurrency(amount, currency = '$') {
  if (amount === null || amount === undefined) return `${currency}0.00`
  return `${currency}${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function formatDate(dateStr, fmt = 'MMM dd, yyyy') {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), fmt)
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  return formatDate(dateStr, 'MMM dd, yyyy HH:mm')
}

export function getUserContactDefaults(user) {
  if (!user) return { full_name: '', phone: '' }

  const full_name = (
    user.full_name?.trim()
    || [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    || user.username
    || ''
  )

  return {
    full_name,
    phone: user.phone?.trim() || '',
  }
}

export const ORDER_STATUS_COLORS = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  printed: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  preparing: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  packed: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  shipped: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
}

export const PAYMENT_STATUS_COLORS = {
  paid: { bg: 'bg-green-50', text: 'text-green-700' },
  unpaid: { bg: 'bg-red-50', text: 'text-red-700' },
  partial: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  refunded: { bg: 'bg-gray-50', text: 'text-gray-700' },
}

export const DELIVERY_STATUS_COLORS = {
  ready: { bg: 'bg-blue-50', text: 'text-blue-700' },
  shipped: { bg: 'bg-orange-50', text: 'text-orange-700' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700' },
  returned: { bg: 'bg-red-50', text: 'text-red-700' },
  failed: { bg: 'bg-gray-50', text: 'text-gray-700' },
}

export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function truncate(str, maxLen = 50) {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str
}
