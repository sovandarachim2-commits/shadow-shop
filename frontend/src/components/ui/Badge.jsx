import { cn } from '@/utils/helpers'

const variants = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-purple-100 text-purple-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  pink: 'bg-pink-100 text-pink-800',
  orange: 'bg-orange-100 text-orange-800',
  indigo: 'bg-indigo-100 text-indigo-800',
}

export function Badge({ children, variant = 'default', className, dot }) {
  return (
    <span className={cn('status-badge', variants[variant], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', `bg-current`)} />}
      {children}
    </span>
  )
}

export function OrderStatusBadge({ status }) {
  const map = {
    new: { variant: 'info', label: 'New' },
    printed: { variant: 'indigo', label: 'Printed' },
    preparing: { variant: 'warning', label: 'Preparing' },
    packed: { variant: 'primary', label: 'Packed' },
    shipped: { variant: 'orange', label: 'Shipped' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
  }
  const conf = map[status] || { variant: 'default', label: status }
  return <Badge variant={conf.variant} dot>{conf.label}</Badge>
}

export function PaymentStatusBadge({ status }) {
  const map = {
    paid: { variant: 'success', label: 'Paid' },
    unpaid: { variant: 'danger', label: 'Unpaid' },
    partial: { variant: 'warning', label: 'Partial' },
    refunded: { variant: 'default', label: 'Refunded' },
  }
  const conf = map[status] || { variant: 'default', label: status }
  return <Badge variant={conf.variant}>{conf.label}</Badge>
}
