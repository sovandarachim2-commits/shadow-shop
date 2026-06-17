import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, History, QrCode, Search, Truck, UserCheck, Shield, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { ordersApi } from '@/api/orders'

export default function DeliveryCustomer() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [order, setOrder] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualOrderNum, setManualOrderNum] = useState('')
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  const html5QrRef = useRef(null)
  const deliveredAt = useRef(new Date().toLocaleString())

  useEffect(() => {
    return () => { html5QrRef.current?.stop().catch(() => {}) }
  }, [])

  const loadOrder = async (rawText) => {
    const orderNum = rawText.replace('SS-ORDER:', '').trim()
    if (!orderNum) return
    try {
      const { data } = await ordersApi.orders.list({ search: orderNum, page_size: 1 })
      if (data.results?.length > 0) {
        const found = data.results[0]
        setOrder(found)
        toast.success(`Order #${found.order_number} loaded!`)
      } else {
        toast.error('Order not found')
      }
    } catch {
      toast.error('Failed to look up order')
    }
  }

  const startScan = async () => {
    if (isScanning) return
    setIsScanning(true)
    await new Promise((r) => setTimeout(r, 50))
    try {
      const qr = new Html5Qrcode('dc-qr-scan-box')
      html5QrRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 160, height: 160 } },
        async (text) => {
          await qr.stop().catch(() => {})
          html5QrRef.current = null
          setIsScanning(false)
          await loadOrder(text)
        },
        () => {}
      )
    } catch {
      setIsScanning(false)
      toast.error('Camera permission denied')
    }
  }

  const stopScan = async () => {
    await html5QrRef.current?.stop().catch(() => {})
    html5QrRef.current = null
    setIsScanning(false)
  }

  const handleManualSearch = async () => {
    if (!manualOrderNum.trim()) return
    setSearching(true)
    await loadOrder(manualOrderNum.trim())
    setSearching(false)
  }

  const handleSave = async () => {
    if (!order) { toast.error('Please scan an order QR first'); return }
    setSaving(true)
    try {
      await ordersApi.orders.updateStatus(order.id, {
        status: 'delivered',
        note: `Delivered by ${user?.first_name || user?.username}`,
      })
      toast.success('Order marked as Delivered!')
      setOrder(null)
      setManualOrderNum('')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3.5 shadow-sm"
        style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-base font-black text-gray-900">Delivery Customer</h1>
        <button
          onClick={() => navigate('/admin/orders')}
          className="flex items-center gap-1.5 rounded-xl border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50"
        >
          <History size={14} /> History
        </button>
      </div>

      <div className="space-y-4 p-4 pb-32">
        {/* QR Scanner Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 to-purple-900 p-5">
          <div className="pointer-events-none absolute right-4 top-4 grid grid-cols-3 gap-1.5 opacity-20">
            {[...Array(9)].map((_, i) => <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />)}
          </div>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <QrCode size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-widest text-white">SCAN INVOICE QR</p>
              <p className="text-xs text-purple-200">Scan the invoice QR code to confirm delivery</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                id="dc-qr-scan-box"
                className={`overflow-hidden rounded-2xl transition-all ${isScanning ? 'h-48 w-48' : 'h-0 w-0'}`}
              />
              {!isScanning && (
                <button
                  onClick={startScan}
                  className="flex h-44 w-44 flex-col items-center justify-center gap-3 rounded-2xl bg-white shadow-inner transition hover:shadow-md"
                >
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <div className="absolute left-0 top-0 h-5 w-5 border-l-[3px] border-t-[3px] border-purple-600" />
                    <div className="absolute right-0 top-0 h-5 w-5 border-r-[3px] border-t-[3px] border-purple-600" />
                    <div className="absolute bottom-0 left-0 h-5 w-5 border-b-[3px] border-l-[3px] border-purple-600" />
                    <div className="absolute bottom-0 right-0 h-5 w-5 border-b-[3px] border-r-[3px] border-purple-600" />
                    <div className="h-px w-10 bg-purple-400 opacity-60" />
                  </div>
                  <p className="text-xs font-medium text-gray-400">
                    {order ? 'Tap to scan again' : 'Tap to open camera'}
                  </p>
                </button>
              )}
            </div>

            {isScanning && (
              <button
                onClick={stopScan}
                className="rounded-full bg-white/20 px-5 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/30"
              >
                Cancel
              </button>
            )}

            <div className="mt-1 flex w-full gap-2">
              <input
                type="text"
                value={manualOrderNum}
                onChange={(e) => setManualOrderNum(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                placeholder="Or type order number…"
                className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-purple-300 focus:border-white/40 focus:outline-none"
              />
              <button
                onClick={handleManualSearch}
                disabled={searching}
                className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/30 disabled:opacity-50"
              >
                <Search size={14} /> {searching ? '…' : 'Find'}
              </button>
            </div>
          </div>
        </div>

        {/* Order Details */}
        {order && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
                <Truck size={15} className="text-purple-700" />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">Order Details</h2>
            </div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order Number</span>
                <span className="font-bold text-gray-900">#{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Customer</span>
                <span className="font-semibold text-gray-900">{order.customer_name || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Phone</span>
                <span className="font-semibold text-gray-900">{order.customer_phone || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-purple-700">${parseFloat(order.grand_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{order.status}</span>
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
              <Shield size={15} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">System Information</h2>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Delivered By</span>
              <span className="font-semibold text-gray-900">{user?.first_name || user?.username || 'admin'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Delivered At</span>
              <span className="font-semibold text-gray-900">{deliveredAt.current}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 p-4 backdrop-blur"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleSave}
          disabled={saving || !order}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-purple-900 py-4 text-sm font-black text-white shadow-lg shadow-purple-300/40 disabled:opacity-50"
        >
          <UserCheck size={18} /> {saving ? 'Saving...' : 'Confirm Delivery'}
        </button>
      </div>
    </div>
  )
}
