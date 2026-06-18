import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MoreVertical,
  PackagePlus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { productsApi } from '@/api/products'
import { cn, formatDate } from '@/utils/helpers'
import { getListResults } from '@/utils/apiData'

const TYPE_STYLES = {
  stock_in: 'bg-green-50 text-green-700 ring-green-100',
  stock_out: 'bg-red-50 text-red-700 ring-red-100',
  transfer: 'bg-blue-50 text-blue-700 ring-blue-100',
  adjustment: 'bg-amber-50 text-amber-700 ring-amber-100',
  damaged: 'bg-orange-50 text-orange-700 ring-orange-100',
  offline_team: 'bg-purple-50 text-purple-700 ring-purple-100',
  return: 'bg-teal-50 text-teal-700 ring-teal-100',
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
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <div className="flex items-center gap-5">
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1', iconClass)}>
          <Icon size={23} />
        </div>
        <div>
          <p className="text-sm font-black text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-black leading-none text-gray-950">{value}</p>
          <p className="mt-1 text-xs font-bold text-gray-400">{meta}</p>
        </div>
      </div>
    </div>
  )
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
    staleTime: 30_000,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['stock-movement-products'],
    queryFn: () => productsApi.products.list({ page_size: 500, is_active: true }).then((r) => getListResults(r.data)),
    staleTime: 60_000,
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
  const activeFilterCount = [type, product, date].filter(Boolean).length

  const resetFilters = () => {
    setSearch('')
    setType('')
    setProduct('')
    setDate('')
    setPage(1)
  }

  const exportCsv = () => {
    const rows = [
      ['Date', 'Product', 'SKU', 'Type', 'Qty', 'Before', 'After', 'Reference', 'Created By'],
      ...filteredMovements.map((m) => [
        m.created_at || '',
        m.product_name || '',
        m.product_code || '',
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
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-gray-950 md:text-3xl">Stock Movements</h1>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs font-black text-gray-400">i</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-500">Track and monitor all inventory changes in your store</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Download size={17} /> Export
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-black text-white shadow-lg shadow-purple-200 transition hover:bg-purple-800"
          >
            <Filter size={17} /> Filters
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs text-purple-700">
              {activeFilterCount}
            </span>
          </button>
        </div>
      </div>

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

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[260px] flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm font-semibold text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
              placeholder="Search product..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            />
          </div>
          <FilterSelect value={type} onChange={(event) => { setType(event.target.value); setPage(1) }} className="lg:w-44">
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={product} onChange={(event) => { setProduct(event.target.value); setPage(1) }} className="lg:w-56">
            <option value="">All Products</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </FilterSelect>
          <div className="relative lg:w-52">
            <Calendar size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(event) => { setDate(event.target.value); setPage(1) }}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm font-bold text-gray-700 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
            />
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 transition hover:bg-gray-50"
          >
            <Filter size={16} /> More Filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-purple-600 transition hover:bg-purple-50"
          >
            <RefreshCcw size={16} /> Reset
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-white text-left text-xs font-black text-gray-500">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4 text-right">Qty</th>
                  <th className="px-5 py-4 text-right">Before</th>
                  <th className="px-5 py-4 text-right">After</th>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4">Created By</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading && Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={9} className="px-5 py-4">
                      <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                    </td>
                  </tr>
                ))}

                {!isLoading && visibleMovements.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-gray-400">
                      <ArrowLeftRight size={42} className="mx-auto mb-3 opacity-30" />
                      <p className="font-black text-gray-600">No stock movements found</p>
                    </td>
                  </tr>
                )}

                {!isLoading && visibleMovements.map((movement) => {
                  const qty = Number(movement.quantity || 0)
                  const isPositive = qty > 0
                  const initials = (movement.created_by_name || 'System').trim().slice(0, 1).toUpperCase()

                  return (
                    <tr key={movement.id} className="bg-white transition hover:bg-gray-50/70">
                      <td className="px-5 py-4">
                        <p className="font-black text-gray-700">{formatDateOnly(movement.created_at)}</p>
                        <p className="mt-0.5 text-xs font-semibold text-gray-400">{formatTime(movement.created_at)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-black text-gray-900">{movement.product_name || movement.product || '-'}</p>
                        <p className="mt-0.5 text-xs font-semibold text-gray-400">SKU: {movement.product_code || '-'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('inline-flex rounded-lg px-3 py-1 text-xs font-black ring-1', TYPE_STYLES[movement.type] || 'bg-gray-50 text-gray-600 ring-gray-100')}>
                          {TYPE_LABELS[movement.type] || movement.type || '-'}
                        </span>
                      </td>
                      <td className={cn('px-5 py-4 text-right font-black', isPositive ? 'text-green-600' : 'text-red-500')}>
                        <span className="inline-flex items-center justify-end gap-1">
                          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {isPositive ? '+' : ''}{qty}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-gray-600">{movement.before_qty}</td>
                      <td className="px-5 py-4 text-right font-black text-gray-900">{movement.after_qty}</td>
                      <td className="px-5 py-4 font-bold text-gray-500">{movement.reference || '-'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-black text-white">
                            {initials}
                          </span>
                          <span className="font-bold text-gray-600">{movement.created_by_name || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>
            Showing {filteredMovements.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, filteredMovements.length)} of {filteredMovements.length.toLocaleString()} results
          </p>
          <div className="flex items-center gap-3">
            <FilterSelect
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }}
              className="w-36"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} per page</option>
              ))}
            </FilterSelect>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: Math.min(3, totalPages) }).map((_, index) => {
              const pageNumber = index + 1
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={cn(
                    'flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-black',
                    safePage === pageNumber
                      ? 'border-purple-700 bg-purple-700 text-white shadow-lg shadow-purple-200'
                      : 'border-gray-200 bg-white text-gray-600'
                  )}
                >
                  {pageNumber}
                </button>
              )
            })}
            {totalPages > 3 && <span className="px-1 text-gray-400">...</span>}
            {totalPages > 3 && (
              <button
                onClick={() => setPage(totalPages)}
                className={cn(
                  'flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-black',
                  safePage === totalPages
                    ? 'border-purple-700 bg-purple-700 text-white shadow-lg shadow-purple-200'
                    : 'border-gray-200 bg-white text-gray-600'
                )}
              >
                {totalPages}
              </button>
            )}
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
