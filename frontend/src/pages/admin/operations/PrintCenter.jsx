import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { AlertTriangle, Printer, FileText, Truck, X } from 'lucide-react'
import SearchFilter from '@/components/shared/SearchFilter'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import { PaymentStatusBadge } from '@/components/ui/Badge'
import { EmptyState, LoadingRows, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import toast from 'react-hot-toast'

const PRINT_TYPES = [
  { key: 'receipt', label: 'Receipt', icon: FileText, desc: 'Customer payment receipt' },
  { key: 'invoice', label: 'Invoice', icon: FileText, desc: 'Full order invoice' },
  { key: 'delivery_note', label: 'Delivery Note', icon: Truck, desc: 'Packing & delivery info' },
]

const USD_TO_KHR_RATE = 4100

function StockAlertCard({ alert, onClose }) {
  if (!alert?.issues?.length) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-50 px-5 py-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-red-700">Cannot Print: Stock Not Enough</h3>
              <p className="mt-1 text-sm font-semibold text-red-500">Add stock or update the selected order before printing.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-500 hover:bg-red-100" aria-label="Close stock warning">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-5">
          {alert.issues.map((issue, index) => (
            <div key={`${issue.product_id}-${index}`} className="rounded-2xl border border-red-100 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-red-500">
                {(issue.order_numbers || [issue.order_number]).filter(Boolean).map((number) => `#${number}`).join(', ')}
              </p>
              <h4 className="mt-1 text-base font-black text-gray-950">{issue.product_name}</h4>
              <p className="text-xs font-semibold text-gray-400">{issue.product_code}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-gray-400">Required</p>
                  <p className="text-lg font-black text-gray-950">{issue.required}</p>
                </div>
                <div className="rounded-xl bg-red-50 px-3 py-2">
                  <p className="text-[11px] font-bold text-red-400">Available</p>
                  <p className="text-lg font-black text-red-600">{issue.available}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-right">
          <button type="button" onClick={onClose} className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-black text-white hover:bg-red-700">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

function formatRiel(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString()}រៀល`
}

function formatProductQty(item) {
  return `${item.product_name || '-'} x${item.quantity || 0}`
}

function orderProductItems(order) {
  if (order.items_preview?.length) return order.items_preview
  if (order.items?.length) return order.items
  return [{ id: 'preview', product_name: order.preview_name || '-', quantity: order.items_count || 1 }]
}

function ProductListCell({ order, className = 'max-w-[240px]' }) {
  return (
    <div className={`${className} space-y-1 text-sm font-medium text-gray-800`}>
      {orderProductItems(order).map((item, itemIndex) => (
        <div key={item.id || itemIndex} className="truncate">
          {formatProductQty(item)}
        </div>
      ))}
    </div>
  )
}

function PrintLogo({ printLogoUrl, size = 64 }) {
  if (printLogoUrl) {
    return (
      <img
        src={printLogoUrl}
        alt="Print logo"
        className="mx-auto mb-2 w-full object-contain"
        style={{ maxHeight: `${size}px` }}
      />
    )
  }

  return (
    <>
      <div className="leading-none" style={{ fontSize: `${Math.max(20, Math.round(size * 0.47))}px` }}>✿</div>
      <div className="font-serif italic leading-none" style={{ fontSize: `${Math.max(28, Math.round(size * 0.63))}px` }}>shadow</div>
    </>
  )
}

function PrintPreview({ order, type, printLogoUrl, printLogoSize, printQrSize }) {
  if (!order) return null
  if (type === 'receipt') return <ReceiptSlip order={order} printLogoUrl={printLogoUrl} printLogoSize={printLogoSize} printQrSize={printQrSize} />
  if (type === 'delivery_note') return <DeliverySlip order={order} printLogoUrl={printLogoUrl} printLogoSize={printLogoSize} printQrSize={printQrSize} />

  const customerName = order.customer_name || order.customer_detail?.name || '-'
  const customerPhone = order.customer_phone || order.customer_detail?.phone || '-'

  return (
    <div className="print-preview rounded-xl border-2 border-dashed border-gray-200 bg-white p-6 text-sm">
      <div className="mb-4 border-b pb-4 text-center">
        <h2 className="text-xl font-bold">SHADOW SHOP</h2>
        <p className="text-xs text-gray-500">Wholesale Cosmetics Distribution</p>
        <p className="mt-2 text-lg font-bold capitalize">{type.replace('_', ' ')}</p>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Order #:</span>
          <span className="ml-1 font-bold">{order.order_number}</span>
        </div>
        <div>
          <span className="text-gray-500">Date:</span>
          <span className="ml-1">{formatDateTime(order.created_at)}</span>
        </div>
        <div>
          <span className="text-gray-500">Customer:</span>
          <span className="ml-1 font-semibold">{customerName}</span>
        </div>
        <div>
          <span className="text-gray-500">Phone:</span>
          <span className="ml-1">{customerPhone}</span>
        </div>
      </div>
      <div className="mb-3 rounded-lg bg-gray-50 p-3">
        <p className="mb-2 text-xs text-gray-400">Items</p>
        {order.items?.map((item) => (
          <div key={item.id} className="flex justify-between py-1 text-xs">
            <span>{item.product_name} x{item.quantity}</span>
            <span className="font-semibold">{formatCurrency(item.total_price)}</span>
          </div>
        ))}
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500">Total: <span className="text-base font-bold">{formatCurrency(order.grand_total)}</span></p>
      </div>
    </div>
  )
}

function PaymentStatusStamp({ status }) {
  const paid = status === 'paid'

  return (
    <div>
      <p className="mb-1 text-[12px] font-black">ការទូទាត់</p>
      <div
        className={`inline-flex rotate-[-4deg] rounded-md border-2 px-5 py-1 text-lg font-black tracking-wide ${
          paid ? 'border-emerald-700 text-emerald-700' : 'border-red-600 text-red-600'
        }`}
      >
        {paid ? 'បានបង់' : 'មិនទាន់បង់'}
      </div>
    </div>
  )
}

function PrintQr({ order, size = 68 }) {
  const qrSrc = order.qr_code || order.qr_url
  const [generatedQr, setGeneratedQr] = useState('')

  useEffect(() => {
    if (!order?.order_number) return
    let cancelled = false
    setGeneratedQr('')
    QRCode.toDataURL(order.order_number, {
      width: Math.max(size * 2, 160),
      margin: 1,
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) setGeneratedQr(url)
    }).catch(() => {
      if (!cancelled) setGeneratedQr('')
    })
    return () => {
      cancelled = true
    }
  }, [order?.order_number, size])

  return (
    <div className="justify-self-end text-center">
      <div
        className="flex items-center justify-center border-2 border-black bg-white text-center text-[8px] font-bold"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        {generatedQr || qrSrc ? (
          <img src={generatedQr || qrSrc} alt={`QR ${order.order_number}`} className="h-full w-full object-contain" />
        ) : (
          <span>QR</span>
        )}
      </div>
    </div>
  )
}

function ReceiptSlip({ order, printLogoUrl, printLogoSize, printQrSize = 68 }) {
  const customer = order.customer_detail || {}
  const customerName = order.customer_name || customer.name || '-'
  const customerPhone = order.customer_phone || customer.phone || '-'
  const customerAddress = customer.address || customer.province || '-'
  const items = order.items?.length
    ? order.items
    : [{
        id: 'preview',
        product_name: order.preview_name || '-',
        quantity: order.items_count || 1,
        unit_price: order.grand_total || 0,
        total_price: order.grand_total || 0,
      }]
  const subtotal = Number(order.subtotal ?? items.reduce((sum, item) => sum + Number(item.total_price || 0), 0))
  const deliveryFee = Number(order.delivery_fee || 0)
  const discount = Number(order.discount || 0)
  const grandTotal = Number(order.grand_total || subtotal + deliveryFee - discount)
  const grandTotalKhr = grandTotal * USD_TO_KHR_RATE

  return (
    <div className="delivery-slip bg-white p-3 text-black">
      <div className="text-center">
        <PrintLogo printLogoUrl={printLogoUrl} size={printLogoSize} />
        <div className="mt-2 text-sm font-black tracking-[0.14em]">RECEIPT</div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_72px] items-start gap-2">
        <div className="space-y-1 text-[11px] font-bold">
          <p>Seller: {order.seller_name || 'Shadow Shop'}</p>
          <p>Order Code: {order.order_number}</p>
        </div>
        <PrintQr order={order} size={printQrSize} />
      </div>

      <div className="my-3 border-t border-dashed border-black" />

      <section>
        <h3 className="mb-2 text-sm font-black tracking-[0.12em]">CUSTOMER</h3>
        <div className="grid grid-cols-[72px_1fr] gap-y-1.5 text-[13px] font-bold">
          <span>Name:</span>
          <span>{customerName}</span>
          <span>Phone:</span>
          <span>{customerPhone}</span>
          <span>Address:</span>
          <span>{customerAddress}</span>
        </div>
      </section>

      <div className="my-3 border-t border-dashed border-black" />

      <PaymentStatusStamp status={order.payment_status} />

      <div className="my-3 border-t border-dashed border-black" />

      <table className="w-full border-collapse text-center text-[10px]">
        <thead>
          <tr className="bg-gray-300">
            <th className="w-7 border border-black px-1 py-1.5">No</th>
            <th className="border border-black px-1 py-1.5">Product</th>
            <th className="w-8 border border-black px-1 py-1.5">Qty</th>
            <th className="w-14 border border-black px-1 py-1.5">Price</th>
            <th className="w-14 border border-black px-1 py-1.5">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-black px-1 py-1.5">{index + 1}</td>
              <td className="border border-black px-1.5 py-1.5 text-left">{formatProductQty(item)}</td>
              <td className="border border-black px-1 py-1.5 font-bold">{item.quantity}</td>
              <td className="border border-black px-1 py-1.5">{formatCurrency(item.unit_price || 0)}</td>
              <td className="border border-black px-1 py-1.5 font-bold">{formatCurrency(item.total_price || 0)}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-black px-1 py-1.5 text-right font-bold" colSpan={4}>Subtotal</td>
            <td className="border border-black px-1 py-1.5 font-bold">{formatCurrency(subtotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1.5 text-right font-bold" colSpan={4}>Delivery Fee</td>
            <td className="border border-black px-1 py-1.5 font-bold">{formatCurrency(deliveryFee)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-1.5 text-right font-bold" colSpan={4}>Discount</td>
            <td className="border border-black px-1 py-1.5 font-bold">{formatCurrency(discount)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-2 text-right text-xs font-black" colSpan={4}>Grand Total</td>
            <td className="border border-black px-1 py-2 text-xs font-black">{formatCurrency(grandTotal)}</td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-2 text-right text-xs font-black" colSpan={4}>សរុបជារៀល</td>
            <td className="border border-black px-1 py-2 text-xs font-black">{formatRiel(grandTotalKhr)}</td>
          </tr>
        </tbody>
      </table>

      <div className="my-3 border-t border-dashed border-black" />
      <div className="text-[11px] font-bold">
        <p>អត្រាប្តូរប្រាក់: 1 USD = {formatRiel(USD_TO_KHR_RATE)}</p>
        <p>Created: {formatDateTime(new Date().toISOString())}</p>
        <p>Powered by : One Night Solution</p>
      </div>
    </div>
  )
}

function DeliverySlip({ order, printLogoUrl, printLogoSize, printQrSize = 68 }) {
  const customer = order.customer_detail || {}
  const customerName = order.customer_name || customer.name || '-'
  const customerPhone = order.customer_phone || customer.phone || '-'
  const customerAddress = customer.address || customer.province || '-'
  const items = order.items?.length
    ? order.items
    : [{ id: 'preview', product_name: order.preview_name || '-', quantity: order.items_count || 1 }]
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  return (
    <div className="delivery-slip bg-white p-3 text-black">
      <div className="text-center">
        <PrintLogo printLogoUrl={printLogoUrl} size={printLogoSize} />
        <div className="mt-2 text-sm font-black tracking-[0.14em]">ប័ណ្ណដឹក / DELIVERY SLIP</div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_72px] items-start gap-2">
        <div className="space-y-1 text-[11px] font-bold">
          <p>អ្នកលក់: {order.seller_name || 'Shadow Shop'}</p>
          <p>លេខបញ្ជា: {order.order_number}</p>
        </div>
        <PrintQr order={order} size={printQrSize} />
      </div>

      <div className="my-3 border-t border-dashed border-black" />

      <section>
        <h3 className="mb-2 text-sm font-black tracking-[0.12em]">អតិថិជន / CUSTOMER</h3>
        <div className="grid grid-cols-[72px_1fr] gap-y-1.5 text-[13px] font-bold">
          <span>ឈ្មោះ:</span>
          <span>{customerName}</span>
          <span>លេខទូរស័ព្ទ</span>
          <span>{customerPhone}</span>
          <span>ទីតាំង</span>
          <span>{customerAddress}</span>
        </div>
      </section>

      <div className="my-3 border-t border-dashed border-black" />

      <PaymentStatusStamp status={order.payment_status} />

      <div className="my-3 border-t border-dashed border-black" />

      <table className="w-full border-collapse text-center text-[11px]">
        <thead>
          <tr className="bg-gray-300">
            <th className="w-9 border border-black px-1 py-1.5">ល.រ<br />No</th>
            <th className="border border-black px-1 py-1.5">ឈ្មោះទំនិញ<br />Product Name</th>
            <th className="w-11 border border-black px-1 py-1.5">ចំនួន<br />Qty</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id || index}>
              <td className="border border-black px-1 py-1.5">{index + 1}</td>
              <td className="border border-black px-1.5 py-1.5 text-left">{formatProductQty(item)}</td>
              <td className="border border-black px-1 py-1.5 font-bold">{item.quantity}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-black px-1 py-2 text-right font-black" colSpan={2}>សរុបចំនួន</td>
            <td className="border border-black px-1 py-2 text-sm font-black">{totalQty}</td>
          </tr>
        </tbody>
      </table>

      <div className="my-3 border-t border-dashed border-black" />
      <div className="text-[11px] font-bold">
        <p>Created: {formatDateTime(new Date().toISOString())}</p>
        <p>Powered by : One Night Solution</p>
      </div>
    </div>
  )
}

export default function PrintCenter() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedOrders, setSelectedOrders] = useState([])
  const [printType, setPrintType] = useState('receipt')
  const [previewOrder, setPreviewOrder] = useState(null)
  const [stockAlert, setStockAlert] = useState(null)
  const [checkingStock, setCheckingStock] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['print-orders', search],
    queryFn: () => ordersApi.orders.list({
      search,
      page_size: 100,
      status: 'new',
      is_draft: false,
    }).then((r) => r.data.results),
  })
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const printLogoUrl = siteSettings?.print_logo_url || null
  const printLogoSize = siteSettings?.print_logo_size || 64
  const printQrSize = siteSettings?.print_qr_size || 68

  const { data: orderDetail, isLoading: isPreviewLoading, isFetching: isPreviewFetching } = useQuery({
    queryKey: ['order-detail', previewOrder?.id],
    queryFn: () => ordersApi.orders.get(previewOrder?.id).then((r) => r.data),
    enabled: !!previewOrder?.id,
  })
  const selectedOrderDetails = useQueries({
    queries: selectedOrders.map((id) => ({
      queryKey: ['order-detail', id],
      queryFn: () => ordersApi.orders.get(id).then((r) => r.data),
      staleTime: 30 * 1000,
    })),
  })
  const selectedOrderRows = (data || []).filter((order) => selectedOrders.includes(order.id))
  const printOrders = selectedOrderRows.map((order) => (
    selectedOrderDetails.find((query) => query.data?.id === order.id)?.data || order
  ))
  const isLoadingPrintDetails = selectedOrderDetails.some((query) => query.isLoading || query.isFetching)

  const toggleOrder = (id) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const markPrintedMutation = useMutation({
    mutationFn: (orderIds) => ordersApi.orders.markPrinted(orderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['print-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order-detail'] })
      setSelectedOrders([])
      setPreviewOrder(null)
      toast.success('Selected orders marked as printed')
    },
  })

  const handlePrint = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Select at least one order to print')
      return
    }
    if (isLoadingPrintDetails) {
      toast.error('Preparing order details, please try again in a moment')
      return
    }
    setCheckingStock(true)
    try {
      await markPrintedMutation.mutateAsync(selectedOrders)
    } catch (error) {
      const payload = error?.response?.data
      if (payload?.stock_issues?.length || payload?.issues?.length) {
        setStockAlert({
          detail: payload.detail,
          issues: payload.stock_issues || payload.issues,
        })
      } else {
        toast.error(payload?.detail || 'Could not check stock before printing')
      }
      return
    } finally {
      setCheckingStock(false)
    }
    toast.success(`Printing ${selectedOrders.length} ${printType}(s)...`)
    window.open(`/admin/print-preview?type=${printType}&ids=${selectedOrders.join(',')}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
    <div className="no-print animate-fade-in">
      <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="section-title">Print Type</h3>
              <button
                type="button"
                onClick={() => navigate('/admin/print/history')}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-100 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:border-purple-200 hover:bg-purple-100"
              >
                <FileText size={15} />
                Print History
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {PRINT_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setPrintType(t.key)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-all ${
                    printType === t.key
                      ? 'border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-100'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700'
                  }`}
                >
                  <t.icon size={16} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="section-title">Unprinted Orders ({selectedOrders.length} selected)</h3>
                <p className="mt-1 text-xs text-gray-400">Select orders from this list, then print the chosen document type.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setSelectedOrders((data || []).map((o) => o.id))} className="rounded-lg px-2 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-50">Select All</button>
                <button onClick={() => setSelectedOrders([])} className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-50">Clear</button>
                <button
                  onClick={handlePrint}
                  disabled={selectedOrders.length === 0 || isLoadingPrintDetails || checkingStock || markPrintedMutation.isPending}
                  className="btn-primary justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Printer size={15} />
                  {checkingStock ? 'Checking Stock...' : 'Print Now'}
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SearchFilter value={search} onChange={setSearch} placeholder="Search orders..." />
                <div className="rounded-xl bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700">
                  {selectedOrders.length} Order(s) / {printType.replace('_', ' ')}
                </div>
              </div>
              <div className="rounded-xl border border-gray-100">
                <Table>
                  <Thead>
                    <tr>
                      <Th>No</Th>
                      <Th>Date & Time</Th>
                      <Th>Order Code</Th>
                      <Th>Product</Th>
                      <Th>Customer</Th>
                      <Th>Phone</Th>
                      <Th>Seller</Th>
                      <Th>Status Payment</Th>
                      <Th>Total</Th>
                      <Th>View</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {isLoading && <LoadingRows cols={10} rows={5} />}
                    {!isLoading && (data || []).map((order, index) => {
                      const selected = selectedOrders.includes(order.id)

                      return (
                        <Tr
                          key={order.id}
                          onClick={() => toggleOrder(order.id)}
                          className={selected ? 'bg-purple-50' : ''}
                        >
                          <Td>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleOrder(order.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="h-4 w-4 accent-purple-600"
                              />
                              <span className="text-sm font-semibold text-gray-500">{index + 1}</span>
                            </div>
                          </Td>
                          <Td><span className="text-xs text-gray-500">{formatDateTime(order.created_at)}</span></Td>
                          <Td><span className="font-mono text-sm font-semibold text-purple-700">#{order.order_number}</span></Td>
                          <Td>
                            <ProductListCell order={order} />
                          </Td>
                          <Td>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                            </div>
                          </Td>
                          <Td><span className="text-sm text-gray-500">{order.customer_phone || '-'}</span></Td>
                          <Td><span className="text-sm text-gray-700">{order.seller_name}</span></Td>
                          <Td><PaymentStatusBadge status={order.payment_status} /></Td>
                          <Td><span className="text-sm font-semibold text-gray-900">{formatCurrency(order.grand_total)}</span></Td>
                          <Td>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewOrder(order) }}
                              className="text-xs font-semibold text-blue-500 hover:underline"
                            >
                              View
                            </button>
                          </Td>
                        </Tr>
                      )
                    })}
                    {!isLoading && (!data || data.length === 0) && (
                      <tr><td colSpan={10}><EmptyState message="No unprinted orders found" /></td></tr>
                    )}
                  </Tbody>
                </Table>
              </div>
            </div>
          </div>
      </div>

      {previewOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
          onClick={() => setPreviewOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Order Preview</h3>
                <p className="text-xs capitalize text-gray-400">{printType.replace('_', ' ')} document</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg leading-none text-gray-500 hover:bg-gray-200"
              >
                ×
              </button>
            </div>
            <div className="flex max-h-[calc(90vh-73px)] flex-col items-center overflow-auto bg-gray-50 p-4">
              {(isPreviewLoading || isPreviewFetching) && !orderDetail ? (
                <div className="w-full rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <Printer size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">Loading preview...</p>
                </div>
              ) : (
                <PrintPreview order={orderDetail || previewOrder} type={printType} printLogoUrl={printLogoUrl} printLogoSize={printLogoSize} printQrSize={printQrSize} />
              )}
            </div>
          </div>
        </div>
      )}
      <StockAlertCard alert={stockAlert} onClose={() => setStockAlert(null)} />
    </div>
    <div className="print-only print-document-root">
      {printOrders.map((order) => (
        <div key={order.id} className="print-receipt-page">
          <PrintPreview order={order} type={printType} printLogoUrl={printLogoUrl} printLogoSize={printLogoSize} printQrSize={printQrSize} />
        </div>
      ))}
    </div>
    </>
  )
}

export function PrintHistory() {
  const [search, setSearch] = useState('')
  const [printType, setPrintType] = useState('receipt')
  const [previewOrder, setPreviewOrder] = useState(null)
  const [stockAlert, setStockAlert] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['print-history-orders', search],
    queryFn: () => ordersApi.orders.list({
      search,
      page_size: 100,
      status: 'printed',
      is_draft: false,
    }).then((r) => r.data.results),
  })
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const { data: orderDetail, isLoading: isPreviewLoading, isFetching: isPreviewFetching } = useQuery({
    queryKey: ['order-detail', previewOrder?.id],
    queryFn: () => ordersApi.orders.get(previewOrder?.id).then((r) => r.data),
    enabled: !!previewOrder?.id,
  })
  const printLogoUrl = siteSettings?.print_logo_url || null
  const printLogoSize = siteSettings?.print_logo_size || 64
  const printQrSize = siteSettings?.print_qr_size || 68

  const openReprint = (orderId) => {
    window.open(`/admin/print-preview?type=${printType}&ids=${orderId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-gray-900">Print History</h1>
            <p className="mt-1 text-xs text-gray-400">View printed orders and reprint documents when needed.</p>
          </div>
          <span className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600">
            {(data || []).length} printed order(s)
          </span>
        </div>
        <div className="grid max-w-5xl grid-cols-1 gap-2 sm:grid-cols-3">
          {PRINT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setPrintType(t.key)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-all ${
                printType === t.key
                  ? 'border-purple-600 bg-purple-600 text-white shadow-md shadow-purple-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <t.icon size={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="border-b border-gray-100 p-4">
          <div className="w-full sm:max-w-sm">
            <SearchFilter value={search} onChange={setSearch} placeholder="Search printed orders..." />
          </div>
        </div>
        <div className="p-4">
          <div className="max-w-full overflow-hidden rounded-xl border border-gray-100">
            <Table className="min-w-[760px] text-[13px]">
              <Thead>
                <tr>
                  <Th>No</Th>
                  <Th>Printed At</Th>
                  <Th>Order Code</Th>
                  <Th>Customer</Th>
                  <Th>Seller</Th>
                  <Th>Cashier</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {isLoading && <LoadingRows cols={7} rows={6} />}
                {!isLoading && (data || []).map((order, index) => (
                  <Tr key={order.id}>
                    <Td>
                      <span className="text-sm font-semibold text-gray-500">{index + 1}</span>
                    </Td>
                    <Td><span className="text-sm text-gray-500">{formatDateTime(order.printed_at || order.created_at)}</span></Td>
                    <Td><span className="font-mono text-sm font-semibold text-purple-700">#{order.order_number}</span></Td>
                    <Td><span className="text-sm font-medium text-gray-900">{order.customer_name}</span></Td>
                    <Td><span className="text-sm text-gray-700">{order.seller_name}</span></Td>
                    <Td><span className="text-sm text-gray-700">{order.printed_by_name || '-'}</span></Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewOrder(order)}
                          className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue-500 hover:bg-blue-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openReprint(order.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-purple-600 hover:bg-purple-50"
                        >
                          <Printer size={14} />
                          Reprint
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {!isLoading && (!data || data.length === 0) && (
                  <tr><td colSpan={7}><EmptyState message="No print history found" /></td></tr>
                )}
              </Tbody>
            </Table>
          </div>
        </div>
      </div>

      {previewOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
          onClick={() => setPreviewOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Order Preview</h3>
                <p className="text-xs capitalize text-gray-400">{printType.replace('_', ' ')} document</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg leading-none text-gray-500 hover:bg-gray-200"
              >
                ×
              </button>
            </div>
            <div className="flex max-h-[calc(90vh-73px)] flex-col items-center overflow-auto bg-gray-50 p-4">
              {(isPreviewLoading || isPreviewFetching) && !orderDetail ? (
                <div className="w-full rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <Printer size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">Loading preview...</p>
                </div>
              ) : (
                <PrintPreview order={orderDetail || previewOrder} type={printType} printLogoUrl={printLogoUrl} printLogoSize={printLogoSize} printQrSize={printQrSize} />
              )}
            </div>
          </div>
        </div>
      )}
      {stockAlert?.issues?.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-50 px-5 py-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-700">Cannot Print: Stock Not Enough</h3>
                  <p className="mt-1 text-sm font-semibold text-red-500">
                    Please add stock or update the order before printing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockAlert(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-500 hover:bg-red-100"
                aria-label="Close stock alert"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="space-y-3">
                {stockAlert.issues.map((issue, index) => (
                  <div key={`${issue.order_id}-${issue.product_id}-${index}`} className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-red-500">
                          Order #{issue.order_number}
                        </p>
                        <h4 className="mt-1 truncate text-base font-black text-gray-950">{issue.product_name}</h4>
                        <p className="mt-0.5 text-xs font-semibold text-gray-400">{issue.product_code}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[270px]">
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-gray-400">Need</p>
                          <p className="text-lg font-black text-gray-950">{issue.required}</p>
                        </div>
                        <div className="rounded-xl bg-red-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-red-400">Available</p>
                          <p className="text-lg font-black text-red-600">{issue.available}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-gray-400">Stock</p>
                          <p className="text-lg font-black text-gray-950">{issue.current_stock}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-right">
              <button
                type="button"
                onClick={() => setStockAlert(null)}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-red-100 hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {stockAlert?.issues?.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-50 px-5 py-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-700">Cannot Print: Stock Not Enough</h3>
                  <p className="mt-1 text-sm font-semibold text-red-500">
                    Please add stock or update the order before printing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockAlert(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-500 hover:bg-red-100"
                aria-label="Close stock alert"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="space-y-3">
                {stockAlert.issues.map((issue, index) => (
                  <div key={`${issue.order_id}-${issue.product_id}-${index}`} className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-red-500">
                          Order #{issue.order_number}
                        </p>
                        <h4 className="mt-1 truncate text-base font-black text-gray-950">{issue.product_name}</h4>
                        <p className="mt-0.5 text-xs font-semibold text-gray-400">{issue.product_code}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[270px]">
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-gray-400">Need</p>
                          <p className="text-lg font-black text-gray-950">{issue.required}</p>
                        </div>
                        <div className="rounded-xl bg-red-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-red-400">Available</p>
                          <p className="text-lg font-black text-red-600">{issue.available}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-gray-400">Stock</p>
                          <p className="text-lg font-black text-gray-950">{issue.current_stock}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-right">
              <button
                type="button"
                onClick={() => setStockAlert(null)}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-red-100 hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function PrintPreviewPage() {
  const [params] = useSearchParams()
  const autoPrintStarted = useRef(false)
  const type = params.get('type') || 'receipt'
  const ids = (params.get('ids') || '').split(',').map((id) => id.trim()).filter(Boolean)

  const { data: siteSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const orderQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['order-detail', id],
      queryFn: () => ordersApi.orders.get(id).then((r) => r.data),
      staleTime: 30 * 1000,
    })),
  })

  const orders = orderQueries.map((query) => query.data).filter(Boolean)
  const isLoading = orderQueries.some((query) => query.isLoading)
  const printLogoUrl = siteSettings?.print_logo_url || null
  const printLogoSize = siteSettings?.print_logo_size || 64
  const printQrSize = siteSettings?.print_qr_size || 68
  const title = type === 'delivery_note' ? 'Delivery Slip' : type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  useEffect(() => {
    if (autoPrintStarted.current || isLoading || isSettingsLoading || orders.length === 0) return
    autoPrintStarted.current = true
    const timer = window.setTimeout(() => window.print(), 350)
    return () => window.clearTimeout(timer)
  }, [isLoading, isSettingsLoading, orders.length])

  return (
    <div className="print-preview-window min-h-screen bg-gray-200 px-4 py-6 text-gray-950">
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        <button onClick={() => window.print()} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white">
          Print
        </button>
      </div>
      {isLoading && <div className="text-center text-sm text-gray-500">Loading print preview...</div>}
      <div className="flex flex-col items-center gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white shadow-xl">
            <PrintPreview
              order={order}
              type={type}
              printLogoUrl={printLogoUrl}
              printLogoSize={printLogoSize}
              printQrSize={printQrSize}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
