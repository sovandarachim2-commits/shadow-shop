import { Copy, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'

const labelFromValue = (value) => String(value || '')
  .split('_')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

export default function ContactSalesReceiptModal({ order, message, queued = false, onClose }) {
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message || '')
      toast.success('Receipt copied')
    } catch {
      toast.error('Could not copy receipt')
    }
  }

  return (
    <Modal isOpen={!!message} onClose={onClose} title="Customer Receipt" size="lg">
      <div className="space-y-4 p-6">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-blue-950">
                {order?.order_number ? `Order #${order.order_number} confirmed` : 'Order confirmed'}
              </p>
              <p className="mt-1 text-xs font-semibold text-blue-700">
                {queued
                  ? 'Customer message was queued. Copy this receipt if the seller needs to send it manually.'
                  : 'Copy this receipt if the seller needs to send it manually.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">
                  Status: {labelFromValue(order?.status) || 'Confirmed'}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700 shadow-sm">
                  Payment: {labelFromValue(order?.payment_status) || 'Unpaid'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <pre className="max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800">
          {message}
        </pre>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary justify-center">
            Close
          </button>
          <button type="button" onClick={copyMessage} className="btn-primary justify-center">
            <Copy size={16} /> Copy Receipt
          </button>
        </div>
      </div>
    </Modal>
  )
}
