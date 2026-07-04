import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Search, RefreshCw,
  Image as ImageIcon, Truck, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import { getListCount, getListResults, getSettledData, getSettledError } from '@/utils/apiData'
import { useRolePermission } from '@/utils/permissions'

const LIMIT_OPTIONS = [
  { value: 50, label: 'Show Top 50' },
  { value: 100, label: 'Show Top 100' },
  { value: 200, label: 'Show Top 200' },
]

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function PhotoCell({ src, label, onPreview }) {
  if (!src) {
    return (
      <div className="mx-auto flex h-[86px] w-[68px] items-center justify-center rounded-md border border-dashed border-gray-500 bg-white/5 text-gray-400">
        <ImageIcon size={16} />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(src, label)}
      className="mx-auto block rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
      title={`View ${label}`}
    >
      <img
        src={src}
        alt={label}
        className="h-[86px] w-[68px] rounded-md object-cover ring-1 ring-white/15 transition hover:scale-[1.03]"
        loading="lazy"
      />
    </button>
  )
}

export default function OutItemsHistory() {
  const navigate = useNavigate()
  const { allowed: canDeleteScanner } = useRolePermission('scanner', 'delete')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(100)
  const [showSearch, setShowSearch] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['out-items-history', search, dateFrom, dateTo, limit],
    queryFn: async () => {
      const params = {
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page_size: limit,
      }
      const [orderResponse, manualResponse] = await Promise.allSettled([
        ordersApi.orders.list({
          ...params,
          status: 'shipped',
        }),
        ordersApi.outRecords.list(params),
      ])
      return {
        orders: getSettledData(orderResponse),
        manual: getSettledData(manualResponse),
        orderError: getSettledError(orderResponse),
        manualError: getSettledError(manualResponse),
      }
    },
    keepPreviousData: true,
  })

  const hasLoadError = Boolean(data?.orderError || data?.manualError)
  const orderRows = getListResults(data?.orders).map((order) => ({
    id: order.id,
    source: 'order',
    barcode: order.order_number,
    phone: order.customer_phone,
    invoice_photo: order.out_invoice_photo,
    package_photo: order.out_package_photo,
    user_name: order.status_changed_by_name,
    date_time: order.status_changed_at || order.updated_at || order.created_at,
    delivery_by: order.out_delivery_by || '-',
  }))
  const manualRows = getListResults(data?.manual).map((record) => ({
    id: record.id,
    source: 'manual',
    barcode: record.code,
    phone: record.phone,
    invoice_photo: record.invoice_photo,
    package_photo: record.package_photo,
    user_name: record.created_by_name,
    date_time: record.created_at,
    delivery_by: record.delivery_by || '-',
  }))
  const orders = [...orderRows, ...manualRows]
    .sort((a, b) => new Date(b.date_time || 0) - new Date(a.date_time || 0))
    .slice(0, limit)
  const total = getListCount(data?.orders) + getListCount(data?.manual)

  const handleDelete = async (row) => {
    if (!canDeleteScanner) {
      toast.error('You do not have permission to delete scanner records')
      return
    }
    const ok = window.confirm(`Delete out package record #${row.barcode}?`)
    if (!ok) return

    try {
      if (row.source === 'manual') {
        await ordersApi.outRecords.delete(row.id)
      } else {
        await ordersApi.orders.delete(row.id)
      }
      toast.success('Out package record deleted')
      refetch()
    } catch {
      toast.error('Failed to delete out package record')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] animate-fade-in">
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewImage(null)}>
          <div className="max-h-full w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-white">{previewImage.label}</p>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <img
              src={previewImage.src}
              alt={previewImage.label}
              className="mx-auto max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4">
          <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <button
            onClick={() => navigate('/admin/out-items')}
            className="flex h-10 items-center gap-1 rounded-lg pr-2 text-sm font-semibold text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="min-w-0 text-center text-xl font-black text-gray-950">
            Out Package History
          </h1>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setShowSearch((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-700 ${showSearch ? 'bg-purple-50 text-purple-700' : ''}`}
              title="Search"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div>
          {showSearch && (
            <div className="mb-3 max-w-xl">
              <div className="relative min-w-0">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search barcode, phone, customer"
                  className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 text-sm sm:flex sm:flex-wrap sm:items-center">
            <div className="grid grid-cols-[4rem_1fr] items-center gap-2 sm:flex">
              <label className="font-bold text-gray-600">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:w-[180px]"
              />
            </div>

            <div className="grid grid-cols-[4rem_1fr] items-center gap-2 sm:flex">
              <label className="font-bold text-gray-600">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:w-[180px]"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:flex">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:w-[180px]"
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <span className="whitespace-nowrap text-sm font-black text-gray-600">Total Items: {total}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 px-1 text-sm font-semibold text-gray-500">
          Out package records show orders marked as shipped/out.
        </div>
        </div>

        {hasLoadError && (
          <div className="m-4 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-semibold text-yellow-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            Some out package history data could not load. Showing the records that are available; press refresh to try again.
          </div>
        )}

        <div className="mx-4 mb-2 flex items-center justify-between text-xs text-gray-500 sm:hidden">
          <span>Swipe table left/right</span>
          <span>{orders.length} shown</span>
        </div>

        <div className="w-full overflow-x-auto bg-[#202529] [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[980px] border-collapse text-center text-sm">
            <thead className="bg-purple-800 text-white">
              <tr>
                {[
                  'No', 'Barcode', 'Delivery By', 'INV Photo', 'Full Photo',
                  'Created By', 'Date/Time', ...(canDeleteScanner ? ['Actions'] : []),
                ].map((heading) => (
                  <th key={heading} className="border-r border-purple-700 px-3 py-3 text-sm font-black uppercase text-white">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, index) => (
                  <tr key={index}>
                    <td colSpan={canDeleteScanner ? 8 : 7} className="border-b border-[#30363d] px-4 py-8">
                      <div className="mx-auto h-5 w-1/2 animate-pulse rounded bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={canDeleteScanner ? 8 : 7} className="bg-white px-4 py-16 text-gray-500">
                    <Truck size={38} className="mx-auto mb-3 opacity-40" />
                    No out package records found
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <tr key={`${order.source}-${order.id}`} className="border-b border-[#30363d] bg-[#202529] text-white transition hover:bg-[#252b30]">
                    <td className="px-3 py-3">{index + 1}</td>
                    <td className="px-3 py-3 text-left font-bold text-white">{order.barcode}</td>
                    <td className="px-3 py-3 text-gray-300">{order.delivery_by}</td>
                    <td className="px-3 py-3">
                      <PhotoCell src={order.invoice_photo} label="Invoice Photo (INV)" onPreview={(src, label) => setPreviewImage({ src, label })} />
                    </td>
                    <td className="px-3 py-3">
                      <PhotoCell src={order.package_photo} label="Package Photo (Full)" onPreview={(src, label) => setPreviewImage({ src, label })} />
                    </td>
                    <td className="px-3 py-3">
                      {order.user_name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-100">
                      {formatDateTime(order.date_time)}
                    </td>
                    {canDeleteScanner && (
                      <td className="px-3 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => order.source === 'order' ? navigate(`/admin/orders/${order.id}`) : toast('Manual record has no order detail page')}
                            className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-3 py-2 text-sm font-medium text-gray-950 hover:bg-yellow-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(order)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
