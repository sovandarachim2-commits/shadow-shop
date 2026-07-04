import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Image as ImageIcon, Loader2, RotateCcw, Search, X } from 'lucide-react'
import { ordersApi } from '@/api/orders'
import { getListResults } from '@/utils/apiData'

const LIMIT_OPTIONS = [50, 100, 200, 500]

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function PhotoCell({ src, label, onPreview, missingText = '-' }) {
  if (!src) {
    return (
      <span className="inline-flex min-h-16 min-w-16 items-center justify-center rounded-md border border-dashed border-gray-600 bg-gray-900 px-2 text-xs font-semibold text-gray-400">
        {missingText === '-' ? <ImageIcon size={17} /> : missingText}
      </span>
    )
  }

  return (
    <button type="button" onClick={() => onPreview({ src, label })} className="rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
      <img src={src} alt={label} className="h-20 w-16 rounded-md object-cover ring-1 ring-gray-700" loading="lazy" />
    </button>
  )
}

export default function ScannerOrders() {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [deliveryBy, setDeliveryBy] = useState('')
  const [limit, setLimit] = useState(100)
  const [previewImage, setPreviewImage] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['scanner-order-search'],
    queryFn: async () => {
      const params = { page_size: 500 }
      const [ordersResponse, prepareResponse, outResponse] = await Promise.all([
        ordersApi.orders.list(params),
        ordersApi.prepareRecords.list(params),
        ordersApi.outRecords.list(params),
      ])
      return {
        orders: getListResults(ordersResponse.data),
        prepareRecords: getListResults(prepareResponse.data),
        outRecords: getListResults(outResponse.data),
      }
    },
    staleTime: 30000,
  })

  const rows = useMemo(() => {
    if (!data) return []
    const rowsByCode = new Map()

    data.orders.forEach((order) => {
      const hasOperationData = order.prepared_at || order.out_at
        || order.prepare_invoice_photo || order.prepare_package_photo
        || order.out_invoice_photo || order.out_package_photo
      if (!hasOperationData) return

      rowsByCode.set(order.order_number, {
        id: `order-${order.id}`,
        code: order.order_number,
        customerName: order.customer_name || '',
        phone: order.customer_phone || '',
        prepareInvoice: order.prepare_invoice_photo,
        outInvoice: order.out_invoice_photo,
        prepareFull: order.prepare_package_photo,
        outFull: order.out_package_photo,
        deliveryBy: order.out_delivery_by || order.delivery_by || '',
        preparedAt: order.prepared_at,
        outAt: order.out_at,
      })
    })

    data.prepareRecords.forEach((record) => {
      const current = rowsByCode.get(record.code) || {
        id: `manual-${record.code}`,
        code: record.code,
        customerName: '',
        phone: record.phone || '',
      }
      rowsByCode.set(record.code, {
        ...current,
        customerName: current.customerName || '',
        phone: current.phone || record.phone || '',
        prepareInvoice: current.prepareInvoice || record.invoice_photo,
        prepareFull: current.prepareFull || record.package_photo,
        preparedAt: current.preparedAt || record.created_at,
      })
    })

    data.outRecords.forEach((record) => {
      const current = rowsByCode.get(record.code) || {
        id: `manual-${record.code}`,
        code: record.code,
        customerName: '',
        phone: record.phone || '',
      }
      rowsByCode.set(record.code, {
        ...current,
        customerName: current.customerName || '',
        phone: current.phone || record.phone || '',
        outInvoice: current.outInvoice || record.invoice_photo,
        outFull: current.outFull || record.package_photo,
        deliveryBy: current.deliveryBy || record.delivery_by || '',
        outAt: current.outAt || record.created_at,
      })
    })

    return [...rowsByCode.values()].sort((a, b) => (
      new Date(b.outAt || b.preparedAt || 0) - new Date(a.outAt || a.preparedAt || 0)
    ))
  }, [data])

  const deliveryOptions = useMemo(() => (
    [...new Set(rows.map((row) => row.deliveryBy).filter(Boolean))].sort()
  ), [rows])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null

    return rows.filter((row) => {
      if (term && !`${row.code} ${row.customerName} ${row.phone}`.toLowerCase().includes(term)) return false
      const isOut = Boolean(row.outAt || row.outInvoice || row.outFull || row.deliveryBy)
      if (deliveryBy === '__not_out__' && isOut) return false
      if (deliveryBy && deliveryBy !== '__not_out__' && row.deliveryBy !== deliveryBy) return false

      if (fromTime || toTime) {
        const operationTimes = [row.preparedAt, row.outAt].filter(Boolean).map((value) => new Date(value).getTime())
        if (!operationTimes.some((time) => (!fromTime || time >= fromTime) && (!toTime || time <= toTime))) return false
      }
      return true
    })
  }, [rows, search, dateFrom, dateTo, deliveryBy])

  const visibleRows = useMemo(() => filteredRows.slice(0, limit), [filteredRows, limit])
  const hasDateFilter = Boolean(dateFrom || dateTo)
  const resetDates = () => {
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] animate-fade-in">
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-h-full w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setPreviewImage(null)} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Close image">
              <X size={20} />
            </button>
            <img src={previewImage.src} alt={previewImage.label} className="mx-auto max-h-[90vh] max-w-full rounded-lg object-contain" />
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-end">
            <label className="col-span-2 min-w-0 lg:flex-1">
              <span className="mb-1 block text-xs font-bold text-gray-600">Search order</span>
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order code or phone" className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
              </div>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-gray-600">From date</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-purple-500 lg:w-40" />
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-gray-600">To date</span>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-purple-500 lg:w-40" />
            </label>
            <label className="col-span-2 lg:col-span-1">
              <span className="mb-1 block text-xs font-bold text-gray-600">Delivery By</span>
              <select value={deliveryBy} onChange={(event) => setDeliveryBy(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-purple-500 lg:w-48">
                <option value="">All delivery</option>
                <option value="__not_out__">Not Out Items</option>
                {deliveryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-bold text-gray-600">Rows</span>
              <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-purple-500 lg:w-36">
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option} value={option}>Last {option}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={resetDates}
              disabled={!hasDateFilter}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-600 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-45 lg:mt-0"
            >
              <RotateCcw size={15} /> Reset date
            </button>
          </div>
          <p className="mt-3 text-xs font-semibold text-gray-500">
            Showing {visibleRows.length} of {filteredRows.length} records
          </p>
        </div>

        <div className="overflow-x-auto bg-[#202529]">
          <table className="w-full min-w-[1650px] border-collapse text-left text-sm">
            <thead className="bg-purple-800 text-white">
              <tr>
                {['No', 'Order Code', 'Customer Name', 'Phone', 'Delivery By', 'INV Photo (Prepare)', 'INV Photo (Out)', 'Full Photo (Prepare)', 'Full Photo (Out)', 'Date Prepare', 'Date Out Package'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border-r border-purple-700 px-3 py-3 text-xs font-black uppercase">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="bg-white py-14 text-center"><Loader2 className="mx-auto animate-spin text-purple-600" /></td></tr>
              ) : isError ? (
                <tr><td colSpan={11} className="bg-white py-14 text-center font-semibold text-red-600">Could not load operation records</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={11} className="bg-white py-14 text-center font-semibold text-gray-500">No matching orders found</td></tr>
              ) : visibleRows.map((row, index) => {
                const isOut = Boolean(row.outAt || row.outInvoice || row.outFull || row.deliveryBy)
                return (
                  <tr key={row.id} className="border-b border-[#30363d] bg-[#202529] align-middle text-white transition hover:bg-[#252b30]">
                    <td className="px-3 py-3">{index + 1}</td>
                    <td className="px-3 py-3 font-bold text-white">{row.code}</td>
                    <td className="px-3 py-3 font-semibold">{row.customerName || '-'}</td>
                    <td className="px-3 py-3">{row.phone || '-'}</td>
                    <td className="px-3 py-3 font-semibold">{isOut ? row.deliveryBy || '-' : <span className="text-orange-300">Not Out</span>}</td>
                    <td className="px-3 py-3 text-center"><PhotoCell src={row.prepareInvoice} label={`Prepare invoice ${row.code}`} onPreview={setPreviewImage} /></td>
                    <td className="px-3 py-3 text-center"><PhotoCell src={row.outInvoice} label={`Out invoice ${row.code}`} onPreview={setPreviewImage} missingText={isOut ? '-' : 'Not Out'} /></td>
                    <td className="px-3 py-3 text-center"><PhotoCell src={row.prepareFull} label={`Prepare full ${row.code}`} onPreview={setPreviewImage} /></td>
                    <td className="px-3 py-3 text-center"><PhotoCell src={row.outFull} label={`Out full ${row.code}`} onPreview={setPreviewImage} missingText={isOut ? '-' : 'Not Out'} /></td>
                    <td className="whitespace-nowrap px-3 py-3">{formatDateTime(row.preparedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3">{isOut ? formatDateTime(row.outAt) : <span className="font-semibold text-orange-300">Not Out</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
