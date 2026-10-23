import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  PackagePlus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  TrendingDown,
} from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { productsApi } from '@/api/products'
import { cn, formatDate } from '@/utils/helpers'
import { getListResults } from '@/utils/apiData'
import PageHeader from '@/components/shared/PageHeader'

const TYPE_STYLES = {
  stock_in: 'bg-green-50 text-green-700',
  stock_out: 'bg-red-50 text-red-700',
  transfer: 'bg-blue-50 text-blue-700',
  adjustment: 'bg-amber-50 text-amber-700',
  damaged: 'bg-orange-50 text-orange-700',
  offline_team: 'bg-purple-50 text-purple-700',
  return: 'bg-teal-50 text-teal-700',
}

const TYPE_LABELS = {
  stock_in: 'Stock In',
  stock_out: 'Stock Out',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
  damaged: 'Damaged',
  offline_team: 'Offline Team',
  return: 'Return',
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

function formatTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}

function formatDateOnly(value) {
  return value ? formatDate(value, 'MMM dd, yyyy') : '-'
}

function StatCard({ icon: Icon, iconClass, label, value, meta }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconClass)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-xl font-semibold leading-none text-gray-950">{value}</p>
        <p className="mt-1 text-[11px] text-gray-400">{meta}</p>
      </div>
    </div>
  )
}

function pageNumbers(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1])
  return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)
}

function FilterSelect({ children, className, ...props }) {
  return (
    <select
      className={cn(
        'h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export default function StockMovements() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [product, setProduct] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements-layout'],
    queryFn: () => inventoryApi.movements.list({ ordering: '-created_at', page_size: 1000 }).then((r) => r.data),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['stock-movement-products'],
    queryFn: () => productsApi.products.list({ page_size: 500, is_active: true }).then((r) => getListResults(r.data)),
  })

  const allMovements = useMemo(() => getListResults(data), [data])

  const stats = useMemo(() => {
    const total = data?.count ?? allMovements.length
    const stockIn = allMovements.filter((m) => m.type === 'stock_in' || Number(m.quantity) > 0).length
    const stockOut = allMovements.filter((m) => m.type === 'stock_out' || Number(m.quantity) < 0).length
    const adjustments = allMovements.filter((m) => m.type === 'adjustment').length
    const pct = (count) => total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0.0%'

    return { total, stockIn, stockOut, adjustments, pct }
  }, [allMovements, data?.count])

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase()
    return allMovements.filter((movement) => {
      const haystack = `${movement.product_name || ''} ${movement.product_code || ''} ${movement.reference || ''} ${movement.notes || ''}`.toLowerCase()
      const matchesSearch = !query || haystack.includes(query)
      const matchesType = !type || movement.type === type
      const matchesProduct = !product || String(movement.product) === String(product)
      const matchesDate = !date || (movement.created_at || '').slice(0, 10) === date
      return matchesSearch && matchesType && matchesProduct && matchesDate
    })
  }, [allMovements, date, product, search, type])

  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const visibleMovements = filteredMovements.slice(startIndex, startIndex + pageSize)
  const hasFilters = Boolean(search.trim() || type || product || date)

  const resetFilters = () => {
    setSearch('')
    setType('')
    setProduct('')
    setDate('')
    setPage(1)
  }

  const exportCsv = () => {
    const rows = [
      ['No', 'Date', 'Product', 'SKU', 'Inventory', 'Type', 'Qty', 'Before', 'After', 'Reference', 'Created By'],
      ...filteredMovements.map((m, index) => [
        index + 1,
        m.created_at || '',
        m.product_name || '',
        m.product_code || '',
        (m.inventories || []).map((place) => `${place.name} (${place.quantity})`).join(', '),
        TYPE_LABELS[m.type] || m.type || '',
        m.quantity ?? '',
        m.before_qty ?? '',
        m.after_qty ?? '',
        m.reference || '',
        m.created_by_name || '',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'stock-movements.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Stock Movements"
        subtitle="Track and monitor all inventory changes in your store"
        actions={(
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Download size={16} /> Export
          </button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ArrowLeftRight}
          iconClass="bg-purple-50 text-purple-700 ring-purple-100"
          label="Total Movements"
          value={stats.total.toLocaleString()}
          meta="All time"
        />
        <StatCard
          icon={PackagePlus}
          iconClass="bg-green-50 text-green-700 ring-green-100"
          label="Stock In"
          value={stats.stockIn.toLocaleString()}
          meta={stats.pct(stats.stockIn)}
        />
        <StatCard
          icon={TrendingDown}
          iconClass="bg-red-50 text-red-700 ring-red-100"
          label="Stock Out"
          value={stats.stockOut.toLocaleString()}
          meta={stats.pct(stats.stockOut)}
        />
        <StatCard
          icon={SlidersHorizontal}
          iconClass="bg-amber-50 text-amber-700 ring-amber-100"
          label="Adjustments"
          value={stats.adjustments.toLocaleString()}
          meta={stats.pct(stats.adjustments)}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-purple-300"
              placeholder="Search product, SKU, or reference"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            />
          </div>
          <FilterSelect value={type} onChange={(event) => { setType(event.target.value); setPage(1) }} className="h-10 font-medium lg:w-40">
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={product} onChange={(event) => { setProduct(event.target.value); setPage(1) }} className="h-10 font-medium lg:w-52">
            <option value="">All Products</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </FilterSelect>
          <div className="relative lg:w-44">
            <Calendar size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(event) => { setDate(event.target.value); setPage(1) }}
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-700 outline-none transition focus:border-purple-300"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-purple-600 transition hover:bg-purple-50"
            >
              <RefreshCcw size={14} /> Reset
            </button>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="w-14 px-3 py-3">No</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Inventory</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Qty</th>
                <th className="px-3 py-3 text-right">Before</th>
                <th className="px-3 py-3 text-right">After</th>
                <th className="px-3 py-3">Reference</th>
                <th className="px-3 py-3">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && Array.from({ length: pageSize }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={10} className="px-3 py-3">
                    <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
                  </td>
                </tr>
              ))}

              {!isLoading && visibleMovements.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-14 text-center text-gray-400">
                    <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium text-gray-500">No stock movements found</p>
                  </td>
                </tr>
              )}

              {!isLoading && visibleMovements.map((movement, index) => {
                const qty = Number(movement.quantity || 0)
                const isPositive = qty > 0

                return (
                  <tr key={movement.id} className="transition hover:bg-gray-50/80">
                    <td className="px-3 py-3 text-sm text-gray-500">{startIndex + index + 1}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <p className="font-medium text-gray-800">{formatDateOnly(movement.created_at)}</p>
                      <p className="text-xs text-gray-400">{formatTime(movement.created_at)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-gray-900">{movement.product_name || movement.product || '-'}</p>
                      <p className="text-xs text-gray-400">{movement.product_code || '-'}</p>
                    </td>
                    <td className="px-3 py-3">
                      {movement.inventories?.length ? (
                        <div className="space-y-0.5">
                          {movement.inventories.map((place) => (
                            <p key={place.name} className="whitespace-nowrap text-sm text-gray-700">
                              {place.name} <span className="text-gray-400">· {place.quantity}</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', TYPE_STYLES[movement.type] || 'bg-gray-50 text-gray-600')}>
                        {TYPE_LABELS[movement.type] || movement.type || '-'}
                      </span>
                    </td>
                    <td className={cn('whitespace-nowrap px-3 py-3 text-right font-semibold', isPositive ? 'text-green-600' : 'text-red-500')}>
                      {isPositive ? '+' : ''}{qty}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500">{movement.before_qty}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{movement.after_qty}</td>
                    <td className="px-3 py-3 text-gray-500">{movement.reference || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">{movement.created_by_name || 'System'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>
            Showing {filteredMovements.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredMovements.length)} of {filteredMovements.length.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <FilterSelect
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}
              className="h-9 w-32 font-medium"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} / page</option>
              ))}
            </FilterSelect>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers(safePage, totalPages).map((pageNumber, index, pages) => (
              <span key={pageNumber} className="flex items-center gap-2">
                {index > 0 && pageNumber - pages[index - 1] > 1 && <span className="text-gray-300">…</span>}
                <button
                  onClick={() => setPage(pageNumber)}
                  className={cn(
                    'flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium',
                    safePage === pageNumber ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {pageNumber}
                </button>
              </span>
            ))}
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
