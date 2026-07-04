import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardList, Image as ImageIcon, RefreshCw, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersApi } from '@/api/orders'
import { getListCount, getListResults } from '@/utils/apiData'
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

function MobileSetCard({ row, index, onPreview, onDelete, canDelete }) {
  const photo = row.invoice_photo || row.package_photo

  return (
    <div className="rounded-xl border border-white/10 bg-[#202528] p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-orange-400">#{index + 1} INV</p>
          <p className="mt-1 break-words text-base font-black text-white">{row.code || '-'}</p>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(row)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-400"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        )}
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
  const { allowed: canDeleteScanner } = useRolePermission('scanner', 'delete')
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
    if (!canDeleteScanner) {
      toast.error('You do not have permission to delete scanner records')
      return
    }
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
            onClick={() => navigate('/admin/prepare-set')}
            className="flex h-10 items-center gap-1 rounded-lg pr-2 text-sm font-semibold text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="min-w-0 text-center text-xl font-black text-gray-950">
            Prepare Set History
          </h1>
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setShowSearch((value) => !value)}
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
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search INV, set name, user"
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
                onChange={(event) => setDateFrom(event.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:w-[180px]"
              />
            </div>

            <div className="grid grid-cols-[4rem_1fr] items-center gap-2 sm:flex">
              <label className="font-bold text-gray-600">To:</label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:w-[180px]"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:flex">
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
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
        </div>

        <div className="mx-4 mb-2 flex items-center justify-between text-xs text-gray-500 sm:hidden">
          <span>Phone view</span>
          <span>{rows.length} shown</span>
        </div>

        {isLoading ? (
          <div className="px-4 pb-4"><LoadingCards /></div>
        ) : rows.length === 0 ? (
          <div className="mx-4 rounded-xl border border-gray-200 bg-white px-4 py-16 text-center text-gray-500 sm:hidden">
            <ClipboardList size={38} className="mx-auto mb-3 opacity-40" />
            No prepare set records found
          </div>
        ) : (
          <div className="space-y-3 px-4 pb-4 sm:hidden">
            {rows.map((row, index) => (
              <MobileSetCard
                key={row.id}
                row={row}
                index={index}
                onPreview={(src, label) => setPreviewImage({ src, label })}
                onDelete={handleDelete}
                canDelete={canDeleteScanner}
              />
            ))}
          </div>
        )}

        <div className="hidden w-full overflow-x-auto bg-[#202529] [-webkit-overflow-scrolling:touch] sm:block">
          <table className="w-full min-w-[900px] border-collapse text-center text-sm">
            <thead className="bg-purple-800 text-white">
              <tr>
                {['No', 'INV', 'Set Name', 'Photo', 'Create By', 'Date/Time', ...(canDeleteScanner ? ['Actions'] : [])].map((heading) => (
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
                    <td colSpan={canDeleteScanner ? 7 : 6} className="border-b border-[#30363d] px-4 py-8">
                      <div className="mx-auto h-5 w-1/2 animate-pulse rounded bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={canDeleteScanner ? 7 : 6} className="bg-white px-4 py-16 text-gray-500">
                    <ClipboardList size={38} className="mx-auto mb-3 opacity-40" />
                    No prepare set records found
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-[#30363d] bg-[#202529] text-white transition hover:bg-[#252b30]">
                    <td className="px-3 py-3">{index + 1}</td>
                    <td className="px-3 py-3 text-left font-bold text-white">{row.code}</td>
                    <td className="px-3 py-3 text-gray-100">{getSetName(row)}</td>
                    <td className="px-3 py-3">
                      <PhotoCell src={row.invoice_photo || row.package_photo} label="Prepare Set Photo" onPreview={(src, label) => setPreviewImage({ src, label })} />
                    </td>
                    <td className="px-3 py-3">{row.created_by_name || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-100">
                      {formatDateTime(row.created_at)}
                    </td>
                    {canDeleteScanner && (
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="inline-flex items-center gap-1 rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
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
