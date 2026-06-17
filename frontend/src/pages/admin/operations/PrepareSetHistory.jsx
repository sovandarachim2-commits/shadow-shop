import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardList, Image as ImageIcon, RefreshCw, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import { getListCount, getListResults } from '@/utils/apiData'

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

function getSetName(record) {
  if (Array.isArray(record.set_qr_values) && record.set_qr_values.length) {
    return record.set_qr_values[0]
  }
  return 'Set'
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

function LoadingCards() {
  return (
    <div className="space-y-3 sm:hidden">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="rounded-xl border border-white/10 bg-[#202528] p-3">
          <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <div className="h-[86px] w-[68px] animate-pulse rounded-md bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-white/10" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MobileSetCard({ row, index, onPreview, onDelete }) {
  const photo = row.invoice_photo || row.package_photo

  return (
    <div className="rounded-xl border border-white/10 bg-[#202528] p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-orange-400">#{index + 1} INV</p>
          <p className="mt-1 break-words text-base font-black text-white">{row.code || '-'}</p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-400"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-[76px_1fr] gap-3">
        <PhotoCell src={photo} label="Prepare Set Photo" onPreview={onPreview} />
        <div className="min-w-0 space-y-2 text-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Set Name</p>
            <p className="break-words font-semibold text-gray-100">{getSetName(row)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-lg bg-white/5 p-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Create By</p>
              <p className="truncate font-semibold text-gray-100">{row.created_by_name || '-'}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-white/5 p-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Date/Time</p>
              <p className="truncate font-semibold text-gray-100">{formatDateTime(row.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PrepareSetHistory() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState(100)
  const [showSearch, setShowSearch] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['prepare-set-history', search, dateFrom, dateTo, limit],
    queryFn: () => ordersApi.prepareRecords.list({
      set_type: 'set',
      search: search || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page_size: limit,
    }).then((r) => r.data),
    keepPreviousData: true,
  })

  const rows = getListResults(data).slice(0, limit)
  const total = getListCount(data)

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete prepare set #${row.code}?`)) return
    try {
      await ordersApi.prepareRecords.delete(row.id)
      toast.success('Prepare set deleted')
      refetch()
    } catch {
      toast.error('Failed to delete prepare set')
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#1f1f1f] text-white">
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

      <div className="mx-auto w-full max-w-[1180px] px-3 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-4 sm:pt-5">
        <div className="sticky top-0 z-20 -mx-3 mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-white/10 bg-[#1f1f1f]/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button
            onClick={() => navigate('/admin/prepare-set')}
            className="flex h-10 items-center gap-1 rounded-lg pr-2 text-sm font-semibold text-gray-300 hover:text-white sm:h-auto"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="min-w-0 text-center text-[22px] font-normal leading-tight text-orange-400 sm:text-3xl">
            Prepare Set History
          </h1>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setShowSearch((value) => !value)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 sm:h-8 sm:w-8 sm:rounded-md ${showSearch ? 'bg-white/10 text-orange-300' : ''}`}
              title="Search"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 disabled:opacity-40 sm:h-8 sm:w-8 sm:rounded-md"
              title="Refresh"
            >
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-white/10 bg-[#202528] p-3 sm:border-0 sm:bg-transparent sm:p-0">
          {showSearch && (
            <div className="mb-3 max-w-xl sm:mb-3">
              <div className="relative min-w-0">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search INV, set name, user"
                  className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-900 outline-none placeholder:text-gray-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-300/40 sm:h-10 sm:rounded-md sm:text-sm"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 text-base sm:flex sm:flex-wrap sm:items-center">
            <div className="grid grid-cols-[4rem_1fr] items-center gap-2 sm:flex">
              <label className="font-medium text-orange-400">From:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-300/40 sm:h-10 sm:w-[180px] sm:rounded-md sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-[4rem_1fr] items-center gap-2 sm:flex">
              <label className="font-medium text-orange-400">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-300/40 sm:h-10 sm:w-[180px] sm:rounded-md sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:flex">
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-300/40 sm:h-10 sm:w-[180px] sm:rounded-md sm:text-sm"
              >
                {LIMIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <span className="whitespace-nowrap text-base font-black text-yellow-400">Total Items: {total}</span>
            </div>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs text-gray-400 sm:hidden">
          <span>Phone view</span>
          <span>{rows.length} shown</span>
        </div>

        {isLoading ? (
          <LoadingCards />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-[#3b3f42] bg-[#202528] px-4 py-16 text-center text-gray-300 sm:hidden">
            <ClipboardList size={38} className="mx-auto mb-3 opacity-40" />
            No prepare set records found
          </div>
        ) : (
          <div className="space-y-3 sm:hidden">
            {rows.map((row, index) => (
              <MobileSetCard
                key={row.id}
                row={row}
                index={index}
                onPreview={(src, label) => setPreviewImage({ src, label })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <div className="hidden w-full overflow-x-auto border border-[#3b3f42] bg-[#202528] [-webkit-overflow-scrolling:touch] sm:block">
          <table className="w-full min-w-[900px] border-collapse text-center text-sm">
            <thead>
              <tr className="bg-[#202528]">
                {['No', 'INV', 'Set Name', 'Photo', 'Create By', 'Date/Time', 'Actions'].map((heading) => (
                  <th key={heading} className="border border-[#3b3f42] px-3 py-3 text-sm font-black text-white">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(6)].map((_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="border border-[#3b3f42] px-4 py-8">
                      <div className="mx-auto h-5 w-1/2 animate-pulse rounded bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-[#3b3f42] px-4 py-16 text-gray-300">
                    <ClipboardList size={38} className="mx-auto mb-3 opacity-40" />
                    No prepare set records found
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-[#252b2f]">
                    <td className="border border-[#3b3f42] px-3 py-2">{index + 1}</td>
                    <td className="border border-[#3b3f42] px-3 py-2 text-left font-medium text-white">{row.code}</td>
                    <td className="border border-[#3b3f42] px-3 py-2 text-gray-100">{getSetName(row)}</td>
                    <td className="border border-[#3b3f42] px-3 py-2">
                      <PhotoCell src={row.invoice_photo || row.package_photo} label="Prepare Set Photo" onPreview={(src, label) => setPreviewImage({ src, label })} />
                    </td>
                    <td className="border border-[#3b3f42] px-3 py-2">{row.created_by_name || '-'}</td>
                    <td className="whitespace-nowrap border border-[#3b3f42] px-3 py-2 text-gray-100">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="border border-[#3b3f42] px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
