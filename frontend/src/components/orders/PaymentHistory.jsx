import { CreditCard, History } from 'lucide-react'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDateTime } from '@/utils/helpers'

const PAYMENT_METHOD_LABELS = {
  bakong: 'Bakong KHQR',
  aba: 'ABA Bank',
  acleda: 'ACLEDA Bank',
  wing: 'Wing',
  cod: 'Cash on Delivery',
  cash: 'Cash',
  contact_sales: 'Contact Sales',
  other: 'Other',
}

const PAYMENT_HISTORY_PATTERN = /(payment|paid|contact sales order confirmed|marked paid|method)/i

export function paymentMethodLabel(method) {
  return PAYMENT_METHOD_LABELS[method] || method || '-'
}

export function getPaymentHistory(order) {
  return (order?.status_history || []).filter((entry) => (
    PAYMENT_HISTORY_PATTERN.test(entry.note || '')
  ))
}

function formatPaymentHistoryNote(note = '') {
  return String(note).replace(
    /\bmethod ([a-z_]+|-)\s*->\s*([a-z_]+|-)/gi,
    (_match, from, to) => `method ${paymentMethodLabel(from)} -> ${paymentMethodLabel(to)}`
  )
}

function formatValue(type, value) {
  if (type === 'method') return paymentMethodLabel(value)
  if (!value || value === '-') return '-'
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function parsePaymentHistoryNote(note = '') {
  const cleanNote = formatPaymentHistoryNote(note)
  const changes = []
  String(note).replace(
    /\b(status|method)\s+([a-z_]+|-)\s*->\s*([a-z_]+|-)/gi,
    (_match, type, from, to) => {
      const key = type.toLowerCase()
      changes.push({
        label: key === 'method' ? 'Payment Method' : 'Payment Status',
        from: formatValue(key, from),
        to: formatValue(key, to),
      })
      return _match
    }
  )

  return {
    title: /^payment recorded/i.test(cleanNote)
      ? 'Payment Recorded'
      : /^payment updated/i.test(cleanNote)
        ? 'Payment Updated'
        : 'Payment Event',
    note: cleanNote,
    changes,
  }
}

function historyTitle(note = '') {
  const text = String(note || '').trim()
  if (/^order placed/i.test(text)) return 'Order Created'
  if (/^order created/i.test(text)) return 'Order Created'
  if (/^order edited/i.test(text)) return 'Order Updated'
  if (/^status updated/i.test(text)) return 'Status Updated'
  if (/^payment recorded/i.test(text)) return 'Payment Recorded'
  if (/^payment updated/i.test(text)) return 'Payment Updated'
  if (/cancel/i.test(text)) return 'Order Cancelled'
  return text || 'Order Event'
}

export function PaymentMethodButton({ order, logoUrls = {}, onClick, compact = false }) {
  const method = order?.payment_method
  const label = paymentMethodLabel(method)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 ${compact ? '' : 'max-w-full'}`}
      title="View payment history"
    >
      {logoUrls[method] ? (
        <img src={logoUrls[method]} alt="" className="h-4 w-4 rounded-full object-contain" />
      ) : (
        <CreditCard size={14} className="text-gray-400" />
      )}
      <span>{label}</span>
      <History size={12} className="text-gray-400" />
    </button>
  )
}

export function OrderHistoryModal({ order, onClose }) {
  const history = order?.status_history || []

  return (
    <Modal
      isOpen={!!order}
      onClose={onClose}
      title={order ? `Order History #${order.order_number}` : 'Order History'}
      size="lg"
    >
      {order && (
        <div className="space-y-4 p-6">
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-400">Created Date</p>
                <p className="mt-1 font-bold text-gray-900">{formatDateTime(order.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-400">Last Update</p>
                <p className="mt-1 font-bold text-gray-900">{formatDateTime(order.updated_at)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                    <History size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-gray-950">{historyTitle(entry.note)}</p>
                      <OrderStatusBadge status={entry.status} />
                    </div>
                    {entry.note && <p className="mt-1 text-sm font-semibold text-gray-600">{formatPaymentHistoryNote(entry.note)}</p>}
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="font-black uppercase tracking-wide text-gray-400">Date</p>
                        <p className="mt-1 font-bold text-gray-900">{formatDateTime(entry.created_at)}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="font-black uppercase tracking-wide text-gray-400">User</p>
                        <p className="mt-1 font-bold text-gray-900">{entry.changed_by_name || 'System'}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 px-3 py-2">
                        <p className="font-black uppercase tracking-wide text-gray-400">Status</p>
                        <p className="mt-1 font-bold capitalize text-gray-900">{entry.status || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-sm font-bold text-gray-900">No order history recorded yet</p>
                <p className="mt-1 text-xs text-gray-400">Create and update events will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

export function PaymentHistoryModal({ order, onClose }) {
  const history = getPaymentHistory(order)

  return (
    <Modal
      isOpen={!!order}
      onClose={onClose}
      title={order ? `Payment History #${order.order_number}` : 'Payment History'}
      size="lg"
    >
      {order && (
        <div className="space-y-5 p-6">
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gray-400">Current Payment</p>
                <p className="mt-1 text-sm font-black text-gray-950">{paymentMethodLabel(order.payment_method)}</p>
              </div>
              <PaymentStatusBadge status={order.payment_status} />
            </div>
          </div>

          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                  <History size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  {(() => {
                    const parsed = parsePaymentHistoryNote(entry.note || 'Payment updated')
                    return (
                      <>
                        <p className="text-sm font-bold text-gray-900">{parsed.title}</p>
                        {parsed.changes.length > 0 ? (
                          <ul className="mt-2 space-y-1.5">
                            {parsed.changes.map((change) => (
                              <li key={`${entry.id}-${change.label}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-xs">
                                <span className="font-black uppercase tracking-wide text-gray-400">{change.label}</span>
                                  <span className="font-bold text-gray-900">{change.from} {'->'} {change.to}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-gray-700">{parsed.note}</p>
                        )}
                      </>
                    )
                  })()}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span>{formatDateTime(entry.created_at)}</span>
                    <span>by {entry.changed_by_name || 'System'}</span>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-sm font-bold text-gray-900">No payment history recorded yet</p>
                <p className="mt-1 text-xs text-gray-400">Future payment method/status updates will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
