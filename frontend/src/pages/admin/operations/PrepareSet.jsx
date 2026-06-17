import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Html5Qrcode } from 'html5-qrcode'
import {
  ArrowLeft, Camera, CheckCircle2, Gift, History,
  PackageCheck, QrCode, Save, Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import useAuthStore from '@/store/authStore'
import { compressImageForUpload } from '@/utils/imageUpload'
import { getListResults } from '@/utils/apiData'

function normalizeCode(value) {
  return value.replace('SS-ORDER:', '').trim()
}

function showSaveError(error) {
  const detail = error?.response?.data?.detail
  const code = error?.response?.data?.code
  if (detail) return toast.error(detail)
  if (Array.isArray(code) && code[0]) return toast.error(code[0])
  if (typeof code === 'string') return toast.error(code)
  return toast.error('Failed to save prepare set')
}

export default function PrepareSet() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const scannerRef = useRef(null)
  const preparedAt = useRef(new Date().toLocaleString())

  const [code, setCode] = useState('')
  const [selectedSetId, setSelectedSetId] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [orderInfo, setOrderInfo] = useState(null)
  const [successPopup, setSuccessPopup] = useState(null)

  const { data: productSets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['prepare-set-product-sets'],
    queryFn: () => productsApi.sets.list({ page_size: 200, is_active: true }).then((r) => getListResults(r.data)),
    staleTime: 60000,
  })

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  const lookupOrder = async (rawCode) => {
    const orderNum = normalizeCode(rawCode)
    if (!orderNum) return null
    try {
      const { data } = await ordersApi.orders.list({ search: orderNum, page_size: 10 })
      const found = getListResults(data).find((item) => item.order_number === orderNum)
      setOrderInfo(found || null)
      return found || null
    } catch {
      setOrderInfo(null)
      return null
    }
  }

  const handleCodeChange = (value) => {
    setCode(value)
    const clean = normalizeCode(value)
    if (clean.length >= 3) lookupOrder(clean)
    if (clean.length < 3) setOrderInfo(null)
  }

  const startScan = async () => {
    if (isScanning) return
    setIsScanning(true)
    await new Promise((resolve) => setTimeout(resolve, 50))
    try {
      const qr = new Html5Qrcode('prepare-set-scan-box')
      scannerRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 160, height: 160 } },
        async (text) => {
          await qr.stop().catch(() => {})
          scannerRef.current = null
          setIsScanning(false)
          handleCodeChange(text)
        },
        () => {}
      )
    } catch {
      setIsScanning(false)
      toast.error('Camera permission denied')
    }
  }

  const stopScan = async () => {
    await scannerRef.current?.stop().catch(() => {})
    scannerRef.current = null
    setIsScanning(false)
  }

  const capturePhoto = async (file) => {
    if (!file) return
    const uploadFile = await compressImageForUpload(file)
    setPhoto(URL.createObjectURL(uploadFile))
    setPhotoFile(uploadFile)
  }

  const resetForm = () => {
    setCode('')
    setSelectedSetId('')
    setPhoto(null)
    setPhotoFile(null)
    setOrderInfo(null)
    preparedAt.current = new Date().toLocaleString()
  }

  const handleSave = async () => {
    const cleanCode = normalizeCode(code)
    const selectedSet = productSets.find((item) => String(item.id) === String(selectedSetId))

    if (!cleanCode) return toast.error('Enter INV Barcode / QR')
    if (!selectedSet) return toast.error('Please select set')
    if (!photoFile) return toast.error('Take photo')

    setSaving(true)
    try {
      const latestOrder = orderInfo || await lookupOrder(cleanCode)
      const payload = new FormData()
      payload.append('code', cleanCode)
      payload.append('phone', latestOrder?.customer_phone || '')
      payload.append('payment_status', latestOrder?.payment_status || 'unpaid')
      payload.append('amount', latestOrder?.grand_total || '0')
      payload.append('set_type', 'set')
      payload.append('set_qr_values', JSON.stringify([selectedSet.name]))
      payload.append('invoice_photo', photoFile)
      payload.append('package_photo', photoFile)
      await ordersApi.prepareRecords.create(payload)
      setSuccessPopup({ code: cleanCode, setName: selectedSet.name })
      resetForm()
    } catch (error) {
      showSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {successPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={38} className="text-green-500" />
            </div>
            <p className="text-xl font-black text-gray-900">Prepare Set Saved</p>
            <p className="mt-1 text-sm font-medium text-gray-400">Data saved successfully</p>
            <div className="my-5 space-y-2 rounded-2xl bg-gray-50 p-4 text-left">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Code</span>
                <span className="truncate font-bold text-gray-900">{successPopup.code}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Set</span>
                <span className="truncate font-bold text-gray-900">{successPopup.setName}</span>
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
        <h1 className="text-base font-black text-gray-900">Prepare Set</h1>
        <button
          onClick={() => navigate('/admin/prepare-set/history')}
          className="flex items-center gap-1.5 rounded-xl border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50"
        >
          <History size={14} /> History
        </button>
      </div>

      <div className="space-y-4 p-4 pb-44">
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
              <p className="text-xs text-purple-200">Scan the invoice QR code to create a prepared set</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div
                id="prepare-set-scan-box"
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
                    {code ? 'Tap to scan again' : 'Tap to open camera'}
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

            <div className="mt-1 w-full space-y-2">
              <div className="relative">
                <QrCode size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onBlur={() => lookupOrder(code)}
                  placeholder="Fill or scan QR code here..."
                  className="w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-8 pr-3 text-sm text-white placeholder-purple-300 focus:border-white/40 focus:outline-none"
                />
              </div>
              <p className="text-center text-[11px] text-purple-300">
                Use camera above - type order number - or plug in a QR scanner
              </p>
              {orderInfo && (
                <p className="text-center text-[11px] font-semibold text-green-200">
                  Loaded order {orderInfo.order_number} - {orderInfo.customer_phone || 'No phone'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
              <Gift size={16} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">Set</h2>
          </div>
          <select
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-base text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          >
            <option value="">- Please select -</option>
            {productSets.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          {!setsLoading && productSets.length === 0 && (
            <p className="mt-3 text-sm font-semibold text-yellow-600">
              No product sets found. Create sets in Product Sets first.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
              <Camera size={15} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">Photos</h2>
          </div>

          <div>
            <p className="mb-0.5 text-xs font-bold text-gray-700">Photo</p>
            <p className="mb-2 text-[11px] text-gray-400">Take photo for this set</p>
            <label className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition-colors ${photo ? 'border-purple-300' : 'border-purple-200 hover:border-orange-300'}`}>
              {photo ? (
                <img src={photo} alt="Prepare set" className="h-full w-full object-cover" />
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
                onChange={(e) => capturePhoto(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50">
              <Shield size={15} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">System Information</h2>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Prepared By</span>
              <span className="font-semibold text-gray-900">{user?.first_name || user?.username || 'admin'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Prepared At</span>
              <span className="font-semibold text-gray-900">{preparedAt.current}</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 p-4 backdrop-blur"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-purple-900 py-4 text-sm font-black text-white shadow-lg shadow-purple-300/40 disabled:opacity-60"
        >
          <PackageCheck size={18} /> {saving ? 'Saving...' : 'Save Prepare Set'}
        </button>
      </div>
    </div>
  )
}
