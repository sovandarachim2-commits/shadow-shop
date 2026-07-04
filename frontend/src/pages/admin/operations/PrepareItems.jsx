import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import {
  ArrowLeft, History, Camera, QrCode,
  Phone, Gift, Shield, Save, CheckCircle2, ScanLine,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import { ordersApi } from '@/api/orders'
import { compressImageForUpload } from '@/utils/imageUpload'
import { getListResults } from '@/utils/apiData'
import FullscreenQrScanner, { fullscreenQrBox } from '@/components/scanner/FullscreenQrScanner'

export default function PrepareItems() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [order, setOrder] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [setType, setSetType] = useState('not_set')
  const [invoicePhoto, setInvoicePhoto] = useState(null)
  const [packagePhoto, setPackagePhoto] = useState(null)
  const [invoicePhotoFile, setInvoicePhotoFile] = useState(null)
  const [packagePhotoFile, setPackagePhotoFile] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualOrderNum, setManualOrderNum] = useState('')
  const [searching, setSearching] = useState(false)
  const [lookupStatus, setLookupStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [orderPopup, setOrderPopup] = useState(null)
  const [successPopup, setSuccessPopup] = useState(null)
  const [setQrRows, setSetQrRows] = useState([])
  const [scanningSetRowId, setScanningSetRowId] = useState(null)

  const html5QrRef = useRef(null)
  const setQrRef = useRef(null)
  const preparedAt = useRef(new Date().toISOString().replace('T', ' ').slice(0, 19))

  useEffect(() => {
    return () => {
      html5QrRef.current?.stop().catch(() => {})
      setQrRef.current?.stop().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (setType === 'set' && setQrRows.length === 0) {
      setSetQrRows([{ id: Date.now(), value: '' }])
    }
    if (setType !== 'set' && setQrRows.length > 0) {
      setSetQrRows([])
    }
  }, [setType, setQrRows.length])

  const loadOrder = async (rawText, options = {}) => {
    const orderNum = rawText.replace('SS-ORDER:', '').trim()
    if (!orderNum) return null
    try {
      const { data } = await ordersApi.orders.list({ search: orderNum, page_size: 10 })
      const found = getListResults(data).find((item) => item.order_number === orderNum)
      if (found) {
        setOrder(found)
        setManualOrderNum(found.order_number)
        setPhoneNumber(found.customer_phone || '')
        setLookupStatus(`Loaded order #${found.order_number}`)
        if (!options.silent) setOrderPopup(found)
        return found
      } else {
        setLookupStatus('No existing order found. This will save as manual code.')
        if (!options.silent) toast.error('Order not found')
      }
    } catch {
      setLookupStatus('Could not check order. You can still save as manual code.')
      if (!options.silent) toast.error('Failed to look up order')
    }
    return null
  }

  useEffect(() => {
    const code = manualOrderNum.replace('SS-ORDER:', '').trim()
    if (code.length < 3) return
    if (order?.order_number === code) return

    const timer = setTimeout(() => {
      setSearching(true)
      setLookupStatus('Checking order...')
      loadOrder(code, { silent: true }).finally(() => setSearching(false))
    }, 500)

    return () => clearTimeout(timer)
  }, [manualOrderNum, order?.order_number])

  const startScan = async () => {
    if (isScanning) return
    setIsScanning(true)
    // Wait one tick so the #qr-scan-box div is visible in the DOM
    await new Promise((r) => setTimeout(r, 50))
    try {
      const qr = new Html5Qrcode('qr-scan-box')
      html5QrRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: fullscreenQrBox },
        async (text) => {
          await qr.stop().catch(() => {})
          html5QrRef.current = null
          setIsScanning(false)
          const found = await loadOrder(text, { silent: true })
          if (!found) {
            setManualOrderNum(text.replace('SS-ORDER:', '').trim())
            toast.error('This QR code is not in the system')
          }
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
    const uploadFile = await compressImageForUpload(file, {
      maxSize: 900,
      targetSize: 80 * 1024,
    })
    const url = URL.createObjectURL(uploadFile)
    if (type === 'invoice') {
      setInvoicePhoto(url)
      setInvoicePhotoFile(uploadFile)
    } else {
      setPackagePhoto(url)
      setPackagePhotoFile(uploadFile)
    }
  }

  const addSetQrRow = () => {
    setSetQrRows((rows) => [...rows, { id: Date.now() + rows.length, value: '' }])
  }

  const updateSetQrRow = (id, value) => {
    setSetQrRows((rows) => rows.map((row) => row.id === id ? { ...row, value } : row))
  }

  const removeSetQrRow = (id) => {
    setSetQrRows((rows) => rows.filter((row) => row.id !== id))
  }

  const resetPrepareForm = () => {
    setOrder(null)
    setPhoneNumber('')
    setSetType('not_set')
    setInvoicePhoto(null)
    setPackagePhoto(null)
    setInvoicePhotoFile(null)
    setPackagePhotoFile(null)
    setManualOrderNum('')
    setSetQrRows([])
    preparedAt.current = new Date().toISOString().replace('T', ' ').slice(0, 19)
  }

  const startSetQrScan = async (rowId) => {
    if (scanningSetRowId) return
    setScanningSetRowId(rowId)
    await new Promise((r) => setTimeout(r, 50))
    try {
      const qr = new Html5Qrcode(`set-qr-scan-box-${rowId}`)
      setQrRef.current = qr
      await qr.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: fullscreenQrBox },
        async (text) => {
          updateSetQrRow(rowId, text.trim())
          await qr.stop().catch(() => {})
          setQrRef.current = null
          setScanningSetRowId(null)
          toast.success('Set QR scanned')
        },
        () => {}
      )
    } catch {
      setScanningSetRowId(null)
      toast.error('Camera permission denied')
    }
  }

  const stopSetQrScan = async () => {
    await setQrRef.current?.stop().catch(() => {})
    setQrRef.current = null
    setScanningSetRowId(null)
  }

  const showRequiredAlert = (message) => {
    toast.error(message)
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
      showRequiredAlert('Enter Code')
      return
    }
    if (!phoneNumber.trim()) {
      showRequiredAlert('Enter Phone Number')
      return
    }
    if (!invoicePhotoFile) {
      showRequiredAlert('Take INV Photo')
      return
    }
    if (!packagePhotoFile) {
      showRequiredAlert('Take Full Photo')
      return
    }
    if (setType === 'set') {
      const hasEmptySet = setQrRows.length === 0 || setQrRows.some((row) => !row.value.trim())
      if (hasEmptySet) {
        showRequiredAlert('Enter Set QR')
        return
      }
      const normalizedSetQr = setQrRows.map((row) => row.value.trim()).filter(Boolean)
      const uniqueSetQr = new Set(normalizedSetQr)
      if (uniqueSetQr.size !== normalizedSetQr.length) {
        showRequiredAlert('Set QR cannot be the same')
        return
      }
    }

    setSaving(true)
    try {
      if (!orderToSave && typedCode) {
        setSearching(true)
        orderToSave = await loadOrder(typedCode)
        setSearching(false)
      }
    } catch {
      toast.error('Could not check order')
      setSaving(false)
      return
    }

    try {
      const payload = new FormData()
      const setQrValues = setQrRows.map((row) => row.value.trim()).filter(Boolean)

      if (orderToSave) {
        if (invoicePhotoFile) payload.append('prepare_invoice_photo', invoicePhotoFile)
        if (packagePhotoFile) payload.append('prepare_package_photo', packagePhotoFile)
        payload.append('status', 'preparing')
        payload.append(
          'note',
          [
            `Prepared by ${user?.first_name || user?.username}`,
            setType === 'set' ? `Set QR: ${setQrValues.join(', ') || 'Set'}` : 'Set Type: Not Set',
          ].join(' | ')
        )
        await ordersApi.orders.updateStatus(orderToSave.id, payload, { params: { compact: 1 } })
      } else {
        payload.append('code', typedCode)
        payload.append('phone', phoneNumber)
        payload.append('payment_status', orderToSave?.payment_status || 'unpaid')
        payload.append('amount', orderToSave?.grand_total || '0')
        payload.append('set_type', setType)
        payload.append('set_qr_values', JSON.stringify(setQrValues))
        if (invoicePhotoFile) payload.append('invoice_photo', invoicePhotoFile)
        if (packagePhotoFile) payload.append('package_photo', packagePhotoFile)
        await ordersApi.prepareRecords.create(payload)
      }
      setSuccessPopup({
        title: orderToSave ? 'Prepare Package Saved' : 'Manual Prepare Package Saved',
        code: orderToSave?.order_number || typedCode,
        phone: phoneNumber,
      })
      resetPrepareForm()
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
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white shadow-sm">
        <div
          className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3"
          style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
        >
          <button
            onClick={() => navigate('/admin/scanner')}
            className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="hidden text-base font-black text-gray-900 lg:block">Prepare Package</h1>
          <button
            onClick={() => navigate('/admin/prepare/history')}
            className="flex items-center gap-1.5 rounded-xl border border-purple-200 px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50"
          >
            <History size={14} /> History
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-3 p-3 pb-24 sm:p-4">
        {/* QR Scanner Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 to-purple-900 p-4">
          <div className="pointer-events-none absolute right-4 top-4 grid grid-cols-3 gap-1.5 opacity-20">
            {[...Array(9)].map((_, i) => <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />)}
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 grid grid-cols-3 gap-1.5 opacity-20">
            {[...Array(9)].map((_, i) => <div key={i} className="h-1.5 w-1.5 rounded-full bg-white" />)}
          </div>

          {/* Scanner viewport — always mounted so Html5Qrcode can attach */}
          <div className="flex flex-col gap-3">
            <FullscreenQrScanner
              active={isScanning}
              scannerId="qr-scan-box"
              onClose={stopScan}
              title="Scan package QR"
            />
            {/* QR code / order number input */}
            <div className="w-full space-y-2">
              <div className="relative flex h-12 items-center rounded-2xl border border-white/20 bg-white/10 shadow-inner shadow-white/10 backdrop-blur">
                <QrCode size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-200" />
                <input
                  type="text"
                  value={manualOrderNum}
                  onChange={(e) => {
                    const v = e.target.value
                    const code = v.replace('SS-ORDER:', '').trim()
                    if (order && code !== order.order_number) {
                      setOrder(null)
                    }
                    setLookupStatus('')
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
                  placeholder="Enter or paste QR code here..."
                  className="h-full w-full bg-transparent py-2 pl-12 pr-12 text-sm font-semibold text-white outline-none placeholder:text-purple-200"
                />
                <button
                  type="button"
                  onClick={isScanning ? stopScan : startScan}
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white transition hover:bg-white/10 active:scale-95"
                  aria-label={isScanning ? 'Stop scanning' : 'Scan QR code'}
                >
                  <ScanLine size={22} />
                </button>
              </div>
              {manualOrderNum.trim() && (
                <p className={`text-center text-[11px] font-semibold ${order ? 'text-green-200' : lookupStatus.includes('Checking') ? 'text-purple-100' : 'text-yellow-200'}`}>
                  {searching ? 'Checking order...' : lookupStatus || 'Type an order code to auto-fill if it exists'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Information */}
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
              <QrCode size={13} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">Order Information</h2>
          </div>

          <div className="space-y-3">
            {/* Phone */}
            <div>
              <label className="mb-1.5 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100">
                  <Phone size={12} className="text-purple-600" />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone Number</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
                <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 transition-colors">
                  <Camera size={17} className="text-white" />
                  <input type="file" accept="image/*" capture="environment" className="hidden" />
                </label>
              </div>
            </div>

            {/* Set Type */}
            <div>
              <label className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100">
                  <Gift size={13} className="text-purple-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Set Type</span>
              </label>
              <select
                value={setType}
                onChange={(e) => setSetType(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm font-semibold text-gray-800 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100"
              >
                <option value="not_set">Not Set</option>
                <option value="set">Set</option>
              </select>
            </div>

            {setType === 'set' && (
              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-gray-900">Set QR</p>
                    <p className="text-xs text-gray-500">Scan QR or type any text/code manually</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-purple-600">
                    {setQrRows.length} set{setQrRows.length === 1 ? '' : 's'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={addSetQrRow}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-700 to-purple-900 py-2.5 text-sm font-black text-white shadow-sm shadow-purple-200 hover:opacity-95"
                >
                  <QrCode size={17} /> Add Set
                </button>

                <div className="space-y-3">
                  {setQrRows.map((row, index) => (
                    <div key={row.id} className="rounded-xl border border-white bg-white p-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wide text-purple-700">
                          Set #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSetQrRow(row.id)}
                          disabled={setQrRows.length === 1}
                          className="rounded-lg px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300"
                        >
                          Remove
                        </button>
                      </div>

                      <FullscreenQrScanner
                        active={scanningSetRowId === row.id}
                        scannerId={`set-qr-scan-box-${row.id}`}
                        onClose={stopSetQrScan}
                        title={`Scan Set #${index + 1} QR`}
                      />

                      <div className="relative flex h-12 items-center rounded-2xl border border-purple-200 bg-purple-50 shadow-inner shadow-purple-100">
                        <QrCode size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500" />
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => updateSetQrRow(row.id, e.target.value)}
                          placeholder="Enter or paste QR code here..."
                          className="h-full w-full min-w-0 bg-transparent py-2 pl-12 pr-12 text-sm font-semibold text-gray-900 outline-none placeholder:text-purple-300"
                        />
                        <button
                          type="button"
                          onClick={() => scanningSetRowId === row.id ? stopSetQrScan() : startSetQrScan(row.id)}
                          disabled={!!scanningSetRowId && scanningSetRowId !== row.id}
                          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-purple-700 transition hover:bg-purple-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={scanningSetRowId === row.id ? 'Stop scanning set QR' : 'Scan set QR'}
                        >
                          <ScanLine size={22} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
              <Camera size={13} className="text-purple-700" />
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
                <label className={`flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed transition-colors ${src ? 'border-purple-300' : 'border-gray-200 hover:border-orange-300'}`}>
                  {src ? (
                    <img src={src} alt={label} className="h-full w-full object-cover" />
                  ) : (
                    <>
                      <Camera size={23} className="text-orange-400" />
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
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50">
              <Shield size={13} className="text-purple-700" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-purple-700">System Information</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Prepared By</span>
              <span className="font-semibold text-gray-900">
                {user?.first_name || user?.username || 'admin'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Prepared At</span>
              <span className="font-semibold text-gray-900">{preparedAt.current}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white/80 p-3 backdrop-blur"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto w-full max-w-2xl">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-700 to-purple-900 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-300/40 disabled:opacity-60"
          >
            <Save size={18} /> {saving ? 'Saving...' : 'Save Prepare Package'}
          </button>
        </div>
      </div>
    </div>
  )
}
