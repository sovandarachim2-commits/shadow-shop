import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Html5Qrcode } from 'html5-qrcode'
import {
  ArrowLeft, History, Camera, QrCode,
  Phone, DollarSign, Gift, Shield,
  PackageCheck, Home, UserCircle, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { ordersApi } from '@/api/orders'
import { deliveryApi } from '@/api/delivery'
import { compressImageForUpload } from '@/utils/imageUpload'
import { getListResults } from '@/utils/apiData'

export default function OutItems() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [order, setOrder] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState('')
  const [setType, setSetType] = useState('')
  const [invoicePhoto, setInvoicePhoto] = useState(null)
  const [packagePhoto, setPackagePhoto] = useState(null)
  const [invoicePhotoFile, setInvoicePhotoFile] = useState(null)
  const [packagePhotoFile, setPackagePhotoFile] = useState(null)
  const [deliveryBy, setDeliveryBy] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [manualOrderNum, setManualOrderNum] = useState('')
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orderPopup, setOrderPopup] = useState(null)
  const [successPopup, setSuccessPopup] = useState(null)

  const html5QrRef = useRef(null)
  const outAt = useRef(new Date().toLocaleString())

  const { data: deliveryConfigs = [] } = useQuery({
    queryKey: ['delivery-by-config'],
    queryFn: () => deliveryApi.byConfig.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  useEffect(() => {
    return () => { html5QrRef.current?.stop().catch(() => {}) }
  }, [])

  const loadOrder = async (rawText) => {
    const orderNum = rawText.replace('SS-ORDER:', '').trim()
    if (!orderNum) return null
    try {
      // Run both lookups in parallel to avoid sequential round-trips
      const [ordersRes, prepareRes] = await Promise.all([
        ordersApi.orders.list({ search: orderNum, page_size: 10 }),
        ordersApi.prepareRecords.list({ search: orderNum, page_size: 10 }),
      ])

      const found = getListResults(ordersRes.data).find((item) => item.order_number === orderNum)
      if (found) {
        if (found.status !== 'preparing') {
          setOrder(null)
          setPaymentStatus('')
          setSetType('')
          toast.error('This barcode is not in Prepare Package yet')
          return null
        }
        setOrder(found)
        setManualOrderNum(found.order_number)
        setPaymentStatus(found.payment_status)
        setOrderPopup(found)
        return found
      }

      const manualRecord = getListResults(prepareRes.data).find((item) => item.code === orderNum)
      if (manualRecord) {
        const manualOrder = {
          id: manualRecord.id,
          source: 'manual',
          order_number: manualRecord.code,
          customer_phone: manualRecord.phone,
          payment_status: manualRecord.payment_status,
          grand_total: manualRecord.amount,
          status: 'preparing',
        }
        setOrder(manualOrder)
        setManualOrderNum(manualOrder.order_number)
        setPaymentStatus(manualOrder.payment_status)
        setOrderPopup(manualOrder)
        return manualOrder
      }

      setOrder(null)
      setPaymentStatus('')
      setSetType('')
      toast.error('This QR is not in Prepare Package')
    } catch {
      toast.error('Failed to look up order')
    }
    return null
  }

  const startScan = async () => {
    if (isScanning) return
    setIsScanning(true)
    await new Promise((r) => setTimeout(r, 50))
    try {
      const qr = new Html5Qrcode('out-qr-scan-box')
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

  const capturePhoto = async (type, file) => {
    if (!file) return
    const uploadFile = await compressImageForUpload(file)
    const url = URL.createObjectURL(uploadFile)
    if (type === 'invoice') {
      setInvoicePhoto(url)
      setInvoicePhotoFile(uploadFile)
    } else {
      setPackagePhoto(url)
      setPackagePhotoFile(uploadFile)
    }
  }

  const showSaveError = (error) => {
    const detail = error?.response?.data?.detail
    const code = error?.response?.data?.code
    if (detail) {
      toast.error(detail)
      return
    }
    if (Array.isArray(code) && code[0]) {
      toast.error(code[0])
      return
    }
    if (typeof code === 'string') {
      toast.error(code)
      return
    }
    toast.error('Failed to save')
  }

  const handleSave = async () => {
    let orderToSave = order
    const typedCode = manualOrderNum.trim()

    if (!typedCode) {
      toast.error('Enter Code')
      return
    }
    if (!deliveryBy) { toast.error('Please select delivery by'); return }
    if (!invoicePhotoFile) { toast.error('Take INV Photo'); return }
    if (!packagePhotoFile) { toast.error('Take Full Photo'); return }
    setSaving(true)
    try {
      if (!orderToSave || orderToSave.order_number !== typedCode.replace('SS-ORDER:', '').trim()) {
        setSearching(true)
        orderToSave = await loadOrder(typedCode)
        setSearching(false)
      }
      if (!orderToSave) return
      if (orderToSave.status !== 'preparing') {
        toast.error('This barcode is not in Prepare Package yet')
        return
      }

      const selectedDelivery = deliveryConfigs.find((item) => String(item.id) === String(deliveryBy))
      const payload = new FormData()
      if (orderToSave.source === 'manual') {
        payload.append('code', orderToSave.order_number)
        payload.append('phone', orderToSave.customer_phone || '')
        payload.append('delivery_by', selectedDelivery?.name || deliveryBy)
        if (invoicePhotoFile) payload.append('invoice_photo', invoicePhotoFile)
        if (packagePhotoFile) payload.append('package_photo', packagePhotoFile)
        await ordersApi.outRecords.create(payload)
      } else {
        payload.append('status', 'shipped')
        payload.append('note', `Out by ${user?.first_name || user?.username}`)
        payload.append('out_delivery_by', selectedDelivery?.name || deliveryBy)
        if (invoicePhotoFile) payload.append('out_invoice_photo', invoicePhotoFile)
        if (packagePhotoFile) payload.append('out_package_photo', packagePhotoFile)
        await ordersApi.orders.updateStatus(orderToSave.id, payload)
      }
      setSuccessPopup({
        title: 'Out Package Saved',
        code: orderToSave.order_number,
        phone: orderToSave.customer_phone || '',
        deliveryBy: selectedDelivery?.name || deliveryBy,
      })
      setOrder(null)
      setPaymentStatus('')
      setSetType('')
      setInvoicePhoto(null)
      setPackagePhoto(null)
      setInvoicePhotoFile(null)
      setPackagePhotoFile(null)
      setDeliveryBy('')
      setManualOrderNum('')
      outAt.current = new Date().toLocaleString()
    } catch (error) {
      showSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Order loaded popup */}
      {orderPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 size={36} className="text-green-500" />
              </div>
              <p className="text-lg font-black text-gray-900">Order Loaded!</p>
            </div>
            <div className="mb-5 space-y-2.5 rounded-2xl bg-gray-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Order #</span>
                <span className="font-bold text-gray-900">{orderPopup.order_number}</span>
              </div>
              {(orderPopup.customer_name || orderPopup.customer) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-bold text-gray-900">{orderPopup.customer_name || orderPopup.customer}</span>
                </div>
              )}
              {orderPopup.customer_phone && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-bold text-gray-900">{orderPopup.customer_phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">${parseFloat(orderPopup.grand_total || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  orderPopup.payment_status === 'paid' ? 'bg-green-100 text-green-700'
                  : orderPopup.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                  {orderPopup.payment_status || 'unpaid'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setOrderPopup(null)}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-700 to-purple-900 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-200/50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Save success popup */}
      {successPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={38} className="text-green-500" />
            </div>
            <p className="text-xl font-black text-gray-900">{successPopup.title}</p>
            <p className="mt-1 text-sm font-medium text-gray-400">Data saved successfully</p>

            <div className="my-5 space-y-2 rounded-2xl bg-gray-50 p-4 text-left">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Code</span>
                <span className="truncate font-bold text-gray-900">{successPopup.code}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Phone</span>
                <span className="font-bold text-gray-900">{successPopup.phone || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Delivery</span>
                <span className="truncate font-bold text-gray-900">{successPopup.deliveryBy || '-'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccessPopup(null)}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-700 to-purple-900 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-200/50"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3.5 shadow-sm"
        style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => navigate('/admin/scanner')}
          className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-base font-black text-gray-900">Out Package</h1>
        <button
          onClick={() => navigate('/admin/out-items/history')}
          className="flex items-center gap-1.5 rounded-xl border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50"
        >
          <History size={14} /> History
        </button>
      </div>

      <div className="space-y-4 p-4 pb-44">
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
              <p className="text-xs text-purple-200">Scan the invoice QR code to load order details</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                id="out-qr-scan-box"
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

            {/* QR code / order number input */}
            <div className="mt-1 w-full space-y-2">
              <div className="relative">
                <QrCode size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                <input
                  type="text"
                  value={manualOrderNum}
                  onChange={(e) => {
                    const v = e.target.value
                    const code = v.replace('SS-ORDER:', '').trim()
                    if (order && code !== order.order_number) {
                      setOrder(null)
                      setPaymentStatus('')
                      setSetType('')
                    }
                    setManualOrderNum(v)
                    if (v.includes('SS-ORDER:') && v.replace('SS-ORDER:', '').trim()) {
                      loadOrder(v.trim())
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSearch()
                    }
                  }}
                  placeholder="Fill or scan QR code here…"
                  className="w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-8 pr-3 text-sm text-white placeholder-purple-300 focus:border-white/40 focus:outline-none"
                />
              </div>
              <p className="text-center text-[11px] text-purple-300">
                Use camera above · type order number · or plug in a QR scanner
              </p>
            </div>
          </div>
        </div>

        {/* Delivery By */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
              <UserCircle size={16} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">Delivery By</h2>
          </div>
          <select
            value={deliveryBy}
            onChange={(e) => setDeliveryBy(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-base text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          >
            <option value="">- Please select -</option>
            {deliveryConfigs.filter((c) => c.is_active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Photos */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
              <Camera size={15} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">Photos</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'invoice', label: 'Invoice Photo (INV)', hint: 'Take photo of invoice', src: invoicePhoto },
              { key: 'package', label: 'Package Photo (Full)', hint: 'Take photo of package', src: packagePhoto },
            ].map(({ key, label, hint, src }) => (
              <div key={key}>
                <p className="mb-0.5 text-xs font-bold text-gray-700">{label}</p>
                <p className="mb-2 text-[11px] text-gray-400">{hint}</p>
                <label className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition-colors ${src ? 'border-purple-300' : 'border-purple-200 hover:border-orange-300'}`}>
                  {src ? (
                    <img src={src} alt={label} className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <Camera size={26} className="text-orange-400" />
                      <span className="text-xs font-semibold text-orange-500">Take Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => capturePhoto(key, e.target.files?.[0])}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

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
              <span className="text-gray-500">Out By</span>
              <span className="font-semibold text-gray-900">{user?.first_name || user?.username || 'admin'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Out At</span>
              <span className="font-semibold text-gray-900">{outAt.current}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 p-4 backdrop-blur"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-purple-900 py-4 text-sm font-black text-white shadow-lg shadow-purple-300/40 disabled:opacity-60"
        >
          <PackageCheck size={18} /> {saving ? 'Saving...' : 'Save Out Package'}
        </button>
      </div>
    </div>
  )
}
