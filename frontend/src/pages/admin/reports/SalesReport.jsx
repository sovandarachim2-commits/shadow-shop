import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BarChart3, CalendarDays, ChevronDown, Eye, FileSpreadsheet, PackageCheck, Printer, Search, ShoppingBag, DollarSign, X } from 'lucide-react'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import { reportsApi } from '@/api/reports'
import { Badge, OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { PrintPreview } from '@/pages/admin/operations/PrintCenter'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/helpers'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const reportFileDate = () => new Date().toISOString().slice(0, 10)

const paymentMethods = [
  { value: 'bakong', label: 'Bakong KHQR' },
  { value: 'aba', label: 'ABA Bank' },
  { value: 'acleda', label: 'ACLEDA Bank' },
  { value: 'wing', label: 'Wing' },
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'cash', label: 'Cash' },
  { value: 'contact_sales', label: 'Contact Sales' },
  { value: 'other', label: 'Other' },
]

const datePresets = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
]

const paymentStatuses = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partially Paid' },
  { value: 'refunded', label: 'Refunded' },
]

const orderStatuses = [
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'printed', label: 'Printed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
]

function toDateInputValue(date) {
  const copy = new Date(date)
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset())
  return copy.toISOString().slice(0, 10)
}

function presetDateRange(preset) {
  const today = new Date()
  const start = new Date(today)
  const end = new Date(today)

  if (preset === 'week') {
    const day = today.getDay() || 7
    start.setDate(today.getDate() - day + 1)
  }

  if (preset === 'month') {
    start.setDate(1)
  }

  return {
    date_from: toDateInputValue(start),
    date_to: toDateInputValue(end),
  }
}

function compactDateRangeLabel(from, to) {
  if (!from && !to) return 'Custom Range'
  if (from && to) return `Custom: ${formatDate(from, 'MMM dd, yyyy')} - ${formatDate(to, 'MMM dd, yyyy')}`
  if (from) return `Custom: From ${formatDate(from, 'MMM dd, yyyy')}`
  return `Custom: To ${formatDate(to, 'MMM dd, yyyy')}`
}

function displayUserName(user) {
  return (
    user.full_name
    || [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    || user.username
    || `User ${user.id}`
  )
}

function displayPaymentStatus(value) {
  return paymentStatuses.find((status) => status.value === value)?.label || value || '-'
}

function displayOrderStatus(value) {
  return orderStatuses.find((status) => status.value === value)?.label || value || '-'
}

function SellerBadge({ name }) {
  const sellerName = name || 'Shadow Shop'
  return (
    <Badge variant={sellerName === 'Shadow Shop' ? 'pink' : 'info'} className="text-sm font-semibold">
      {sellerName}
    </Badge>
  )
}

function ProductPill({ value }) {
  const products = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return (
    <div className="flex max-w-xs flex-col items-start gap-1">
      {products.length ? products.map((product) => (
        <span
          key={product}
          className="inline-flex max-w-full items-center rounded-lg bg-purple-50 px-2.5 py-1 text-sm font-semibold text-purple-700"
        >
          <span className="truncate">{product}</span>
        </span>
      )) : (
        <span className="text-sm font-semibold text-black">-</span>
      )}
    </div>
  )
}

function ItemsPill({ count }) {
  const label = count || 0
  return (
    <Badge variant="indigo" className="text-sm font-semibold">{label}</Badge>
  )
}

function StatusProcessModal({ order, onClose }) {
  const history = order?.status_history ?? []

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-gray-950/55 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-purple-600">Order Process</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-950">
              #{order?.order_number || '-'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {order?.customer_name || '-'} · {order?.customer_phone || '-'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-gray-200"
            aria-label="Close order process"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {history.length ? (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div key={item.id || `${item.status}-${item.created_at}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-purple-500" />
                    {index < history.length - 1 && <span className="mt-1 h-full min-h-8 w-px bg-purple-100" />}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={item.status} />
                      <span className="text-xs font-semibold text-gray-500">
                        {formatDateTime(item.created_at)}
                      </span>
                    </div>
                    {item.note && <p className="mt-1 text-xs text-gray-500">{item.note}</p>}
                    <p className="mt-1 text-xs text-gray-400">
                      {item.changed_by_name ? `by ${item.changed_by_name}` : 'System update'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
              No process history found for this order.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const fieldClass = 'h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-800 outline-none focus:border-purple-500 focus:bg-white'

function CheckboxDropdown({ label, options, selected, allLabel, emptyLabel, onToggle }) {
  const selectedText = selected.length
    ? options.filter((option) => selected.includes(String(option.value))).map((option) => option.label).join(', ')
    : allLabel

  return (
    <div className="relative min-w-0">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <details className="relative">
        <summary className={`${fieldClass} flex cursor-pointer list-none items-center justify-between gap-2`}>
          <span className="truncate">{selectedText}</span>
          <ChevronDown size={14} className="shrink-0 text-gray-400" />
        </summary>
        <div className="absolute left-0 top-12 z-50 max-h-72 w-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          {options.length === 0 ? (
            <p className="px-2 py-2 text-sm font-semibold text-gray-400">{emptyLabel}</p>
          ) : options.map((option) => {
            const value = String(option.value)
            return (
              <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selected.length === 0 || selected.includes(value)}
                  onChange={() => onToggle(value)}
                  className="accent-purple-600"
                />
                <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{option.label}</span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400">
                  {option.count ?? 0}
                </span>
              </label>
            )
          })}
        </div>
      </details>
    </div>
  )
}

function DateDropdown({ value, dateFrom, dateTo, onPresetChange, onDateChange }) {
  const selectedText = value === 'custom'
    ? [
      dateFrom ? formatDate(dateFrom, 'MMM dd, yyyy') : 'From',
      dateTo ? formatDate(dateTo, 'MMM dd, yyyy') : 'To',
    ].join(' - ')
    : datePresets.find((preset) => preset.value === value)?.label

  return (
    <div className="relative min-w-0">
      <span className="mb-1 block text-xs font-semibold text-slate-500">Order date (when order was created)</span>
      <details className="relative">
        <summary className={`${fieldClass} flex cursor-pointer list-none items-center justify-between gap-2`}>
          <span className="truncate">{selectedText}</span>
          <ChevronDown size={14} className="shrink-0 text-gray-400" />
        </summary>
        <div className="absolute left-0 top-12 z-50 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
          <div className="space-y-1">
            {datePresets.map((preset) => (
              <label key={preset.value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                <input
                  type="radio"
                  name="sales-report-date-preset"
                  checked={value === preset.value}
                  onChange={() => onPresetChange(preset.value)}
                  className="accent-purple-600"
                />
                {preset.label}
              </label>
            ))}
          </div>
          {value === 'custom' && (
            <div className="mt-2 grid grid-cols-1 gap-2 border-t border-gray-100 px-2 pt-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateChange('date_from', e.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateChange('date_to', e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}

function downloadFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function productLines(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function countByValue(rows, getValue) {
  return rows.reduce((counts, row) => {
    const value = getValue(row)
    if (value !== undefined && value !== null && value !== '') {
      counts[String(value)] = (counts[String(value)] || 0) + 1
    }
    return counts
  }, {})
}

function countByValues(rows, getValues) {
  return rows.reduce((counts, row) => {
    const values = [...new Set((getValues(row) || []).map(String).filter(Boolean))]
    values.forEach((value) => {
      counts[value] = (counts[value] || 0) + 1
    })
    return counts
  }, {})
}

export default function SalesReport() {
  const [receiptOrderId, setReceiptOrderId] = useState(null)
  const [processOrder, setProcessOrder] = useState(null)
  const [filters, setFilters] = useState({
    date_preset: 'month',
    date_from: '',
    date_to: '',
    brand_ids: [],
    category_ids: [],
    payment_methods: [],
    seller_ids: [],
    payment_statuses: [],
    order_statuses: [],
    search: '',
  })

  const { data: brands } = useQuery({
    queryKey: ['sales-report-brands'],
    queryFn: () => productsApi.brands.list({ ordering: 'name' }),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const { data: categories } = useQuery({
    queryKey: ['sales-report-categories'],
    queryFn: () => productsApi.categories.list({ is_active: true, ordering: 'name' }),
    select: (r) => r.data?.results ?? r.data ?? [],
  })

  const { data: users } = useQuery({
    queryKey: ['sales-report-sellers'],
    queryFn: () => authApi.users.list({ page_size: 200, ordering: 'first_name' }),
    select: (r) => (r.data?.results ?? r.data ?? [])
      .filter((user) => user.role !== 'customer' && user.is_active !== false),
  })

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: receiptOrder, isLoading: isReceiptLoading } = useQuery({
    queryKey: ['order-detail', receiptOrderId],
    queryFn: () => ordersApi.orders.get(receiptOrderId).then((r) => r.data),
    enabled: !!receiptOrderId,
    staleTime: 30 * 1000,
  })

  const sellerOptions = [
    { id: 'shadow_shop', name: 'Shadow Shop' },
    ...(users ?? []).map((seller) => ({ id: String(seller.id), name: displayUserName(seller) })),
  ]
  const brandOptions = (brands ?? []).map((brand) => ({ value: String(brand.id), label: brand.name }))
  const categoryOptions = (categories ?? []).map((category) => ({ value: String(category.id), label: category.name }))
  const reportParams = useMemo(() => {
    const dateRange = filters.date_preset === 'custom'
      ? { date_from: filters.date_from, date_to: filters.date_to }
      : presetDateRange(filters.date_preset)
    return {
      ...dateRange,
      brand_ids: filters.brand_ids.join(','),
      category_ids: filters.category_ids.join(','),
      payment_methods: filters.payment_methods.join(','),
      seller_ids: filters.seller_ids.join(','),
      payment_statuses: filters.payment_statuses.join(','),
      order_statuses: filters.order_statuses.join(','),
      search: filters.search,
      group_by: 'day',
    }
  }, [filters])

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['sales-report', reportParams],
    queryFn: () => reportsApi.sales(reportParams),
    select: (r) => r.data ?? { summary_rows: [], order_rows: [] },
  })

  const summaryRows = reportData?.summary_rows ?? []
  const orderRows = reportData?.order_rows ?? []
  const totals = orderRows.reduce((acc, row) => {
    acc.total_orders += 1
    acc.total_items += Number(row.items_count ?? 0)
    acc.total_revenue += Number(row.amount ?? 0)
    return acc
  }, { total_orders: 0, total_items: 0, total_revenue: 0 })

  const sellerCounts = countByValue(orderRows, (row) => row.seller_id || 'shadow_shop')
  const paymentStatusCounts = countByValue(orderRows, (row) => row.payment_status)
  const orderStatusCounts = countByValue(orderRows, (row) => row.order_status)
  const paymentMethodCounts = countByValue(orderRows, (row) => row.payment_method)
  const brandCounts = countByValues(orderRows, (row) => row.brand_ids)
  const categoryCounts = countByValues(orderRows, (row) => row.category_ids)
  const sellerOptionsWithCounts = sellerOptions.map((seller) => ({
    value: String(seller.id),
    label: seller.name,
    count: sellerCounts[String(seller.id)] || 0,
  }))
  const paymentStatusOptionsWithCounts = paymentStatuses.map((status) => ({
    ...status,
    count: paymentStatusCounts[status.value] || 0,
  }))
  const orderStatusOptionsWithCounts = orderStatuses.map((status) => ({
    ...status,
    count: orderStatusCounts[status.value] || 0,
  }))
  const brandOptionsWithCounts = brandOptions.map((brand) => ({
    ...brand,
    count: brandCounts[String(brand.value)] || 0,
  }))
  const categoryOptionsWithCounts = categoryOptions.map((category) => ({
    ...category,
    count: categoryCounts[String(category.value)] || 0,
  }))
  const paymentMethodOptionsWithCounts = paymentMethods.map((method) => ({
    ...method,
    count: paymentMethodCounts[method.value] || 0,
  }))

  const avgOrderValue = totals.total_orders ? totals.total_revenue / totals.total_orders : 0
  const selectedDate = filters.date_preset === 'custom'
    ? compactDateRangeLabel(filters.date_from, filters.date_to)
    : datePresets.find((preset) => preset.value === filters.date_preset)?.label
  const selectedBrands = filters.brand_ids.length
    ? brandOptions.filter((brand) => filters.brand_ids.includes(String(brand.value))).map((brand) => brand.label).join(', ')
    : 'All Brands'
  const selectedCategories = filters.category_ids.length
    ? categoryOptions.filter((category) => filters.category_ids.includes(String(category.value))).map((category) => category.label).join(', ')
    : 'All Categories'
  const selectedPaymentMethods = filters.payment_methods.length
    ? paymentMethods.filter((method) => filters.payment_methods.includes(method.value)).map((method) => method.label).join(', ')
    : 'All Payment Methods'
  const selectedSellers = filters.seller_ids.length
    ? sellerOptions.filter((seller) => filters.seller_ids.includes(String(seller.id))).map((seller) => seller.name).join(', ')
    : 'All Sellers'
  const selectedPaymentStatuses = filters.payment_statuses.length
    ? paymentStatuses.filter((status) => filters.payment_statuses.includes(status.value)).map((status) => status.label).join(', ')
    : 'All Payment Statuses'
  const selectedOrderStatuses = filters.order_statuses.length
    ? orderStatuses.filter((status) => filters.order_statuses.includes(status.value)).map((status) => status.label).join(', ')
    : 'All Order Statuses'
  const filterSummary = [
    selectedDate,
    filters.brand_ids.length ? selectedBrands : '',
    filters.category_ids.length ? selectedCategories : '',
    filters.payment_methods.length ? selectedPaymentMethods : '',
    filters.seller_ids.length ? selectedSellers : '',
    filters.payment_statuses.length ? selectedPaymentStatuses : '',
    filters.order_statuses.length ? selectedOrderStatuses : '',
    filters.search ? `Search: ${filters.search}` : '',
  ].filter(Boolean).join(' | ') || 'All sales'

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const updateDatePreset = (value) => {
    setFilters((current) => {
      if (value === 'custom') {
        const fallbackRange = presetDateRange('month')
        return {
          ...current,
          date_preset: value,
          date_from: current.date_from || fallbackRange.date_from,
          date_to: current.date_to || fallbackRange.date_to,
        }
      }

      return {
        ...current,
        date_preset: value,
        date_from: '',
        date_to: '',
      }
    })
  }

  const toggleMultiFilter = (key, value, allValues) => {
    setFilters((current) => {
      const selected = current[key].length ? current[key] : allValues
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
      return {
        ...current,
        [key]: next.length === allValues.length ? [] : next,
      }
    })
  }

  const resetFilters = () => {
    setFilters({
      date_preset: 'month',
      date_from: '',
      date_to: '',
      brand_ids: [],
      category_ids: [],
      payment_methods: [],
      seller_ids: [],
      payment_statuses: [],
      order_statuses: [],
      search: '',
    })
  }

  const reportRowsHtml = () => orderRows.map((row, index) => {
    const products = productLines(row.product_summary)
    const productHtml = products.length
      ? products.map((product) => escapeHtml(product)).join('<br>')
      : '-'

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDate(row.received_at, 'MMM dd, yyyy')}</td>
        <td>${escapeHtml(row.order_number || '-')}</td>
        <td>${escapeHtml(row.customer_name || '-')}</td>
        <td>${escapeHtml(row.customer_phone || '-')}</td>
        <td>${escapeHtml(row.seller_name || '-')}</td>
        <td>${productHtml}</td>
        <td>${row.items_count || 0}</td>
        <td class="right">${Number(row.amount ?? 0).toFixed(2)}</td>
        <td>${escapeHtml(displayPaymentStatus(row.payment_status))}</td>
        <td>${escapeHtml(displayOrderStatus(row.order_status))}</td>
      </tr>
    `
  }).join('')

  const buildReportHtml = ({ excel = false } = {}) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sales Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; padding: 28px; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    p { margin: 0 0 18px; color: #6b7280; font-size: 12px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 0 0 18px; }
    .summary div { border: 1px solid #e5e7eb; padding: 10px; }
    .summary span { display: block; color: #6b7280; font-size: 11px; }
    .summary strong { display: block; margin-top: 4px; font-size: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { color: #374151; font-weight: 700; background: #f9fafb; }
    tfoot td { font-weight: 700; background: #f3f4f6; }
    .right { text-align: right; }
    ${excel ? 'br { mso-data-placement:same-cell; }' : '@page { size: landscape; margin: 12mm; }'}
  </style>
</head>
<body>
  <h1>Sales Report</h1>
  <p>${escapeHtml(filterSummary)}</p>
  <div class="summary">
    <div><span>Total Amount</span><strong>${formatCurrency(totals.total_revenue)}</strong></div>
    <div><span>Orders</span><strong>${totals.total_orders}</strong></div>
    <div><span>Items Sold</span><strong>${totals.total_items}</strong></div>
    <div><span>Avg Order Value</span><strong>${formatCurrency(avgOrderValue)}</strong></div>
  </div>
  <table>
    <thead><tr><th>No</th><th>Order Date</th><th>Order Code</th><th>Customer</th><th>Phone</th><th>Seller</th><th>Product</th><th>Items</th><th class="right">Total Amount</th><th>Payment Status</th><th>Order Status</th></tr></thead>
    <tbody>${reportRowsHtml()}</tbody>
    <tfoot><tr><td></td><td>Total</td><td class="right">${totals.total_orders} orders</td><td></td><td></td><td></td><td></td><td>${totals.total_items}</td><td class="right">${Number(totals.total_revenue).toFixed(2)}</td><td></td><td></td></tr></tfoot>
  </table>
</body>
</html>`

  const exportExcel = () => {
    if (orderRows.length === 0) {
      toast.error('No report data to export')
      return
    }

    downloadFile(
      `\ufeff${buildReportHtml({ excel: true })}`,
      `sales-report-${reportFileDate()}.xls`,
      'application/vnd.ms-excel;charset=utf-8;',
    )
    toast.success('Sales report exported to Excel')
  }

  const printReport = () => {
    if (orderRows.length === 0) {
      toast.error('No report data to print')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups to print the report.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(buildReportHtml())
    printWindow.document.close()
    printWindow.focus()
    window.setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const closeReceipt = () => {
    setReceiptOrderId(null)
  }

  return (
    <div className={`${receiptOrderId ? '' : 'print-preview-window'} space-y-4`}>
      <div className="page-header no-print mb-0">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Sales Report</h1>
          <p className="mt-0.5 text-sm text-gray-500">Sales performance and order analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Amount', value: formatCurrency(totals.total_revenue), icon: DollarSign, color: 'bg-green-100 text-green-600', valueColor: 'text-emerald-700' },
          { label: 'Orders', value: totals.total_orders, icon: ShoppingBag, color: 'bg-sky-100 text-sky-600', valueColor: 'text-sky-700' },
          { label: 'Items Sold', value: totals.total_items, icon: PackageCheck, color: 'bg-purple-100 text-purple-600', valueColor: 'text-purple-700' },
          { label: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: BarChart3, color: 'bg-pink-100 text-pink-600', valueColor: 'text-pink-600' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">{k.label}</p>
                <p className={`mt-1 text-2xl font-bold ${k.valueColor}`}>{k.value}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${k.color}`}>
                <k.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="relative z-20 rounded-2xl border border-gray-100 bg-white p-4 shadow-card no-print">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-9">
          <DateDropdown
            value={filters.date_preset}
            dateFrom={filters.date_from}
            dateTo={filters.date_to}
            onPresetChange={updateDatePreset}
            onDateChange={updateFilter}
          />
          <CheckboxDropdown
            label="Seller"
            options={sellerOptionsWithCounts}
            selected={filters.seller_ids}
            allLabel="All Sellers"
            emptyLabel="No sellers found"
            onToggle={(value) => toggleMultiFilter('seller_ids', value, sellerOptions.map((option) => String(option.id)))}
          />
          <CheckboxDropdown
            label="Payment Status"
            options={paymentStatusOptionsWithCounts}
            selected={filters.payment_statuses}
            allLabel="All Statuses"
            emptyLabel="No statuses found"
            onToggle={(value) => toggleMultiFilter('payment_statuses', value, paymentStatuses.map((option) => option.value))}
          />
          <CheckboxDropdown
            label="Order Status"
            options={orderStatusOptionsWithCounts}
            selected={filters.order_statuses}
            allLabel="All Statuses"
            emptyLabel="No statuses found"
            onToggle={(value) => toggleMultiFilter('order_statuses', value, orderStatuses.map((option) => option.value))}
          />
          <CheckboxDropdown
            label="Brand"
            options={brandOptionsWithCounts}
            selected={filters.brand_ids}
            allLabel="All Brands"
            emptyLabel="No brands found"
            onToggle={(value) => toggleMultiFilter('brand_ids', value, brandOptions.map((option) => String(option.value)))}
          />
          <CheckboxDropdown
            label="Category"
            options={categoryOptionsWithCounts}
            selected={filters.category_ids}
            allLabel="All Categories"
            emptyLabel="No categories found"
            onToggle={(value) => toggleMultiFilter('category_ids', value, categoryOptions.map((option) => String(option.value)))}
          />
          <CheckboxDropdown
            label="Payment Method"
            options={paymentMethodOptionsWithCounts}
            selected={filters.payment_methods}
            allLabel="All Methods"
            emptyLabel="No payment methods found"
            onToggle={(value) => toggleMultiFilter('payment_methods', value, paymentMethods.map((option) => option.value))}
          />
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Search</span>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className={`${fieldClass} pl-9`}
                placeholder="Order, customer, product"
              />
            </div>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      {summaryRows.length > 0 && (
        <div className="form-card">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Daily Sales Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={summaryRows}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} tickFormatter={(v) => formatDate(v, 'MMM dd')} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="total_revenue" stroke="#7c3aed" strokeWidth={2}
                fill="url(#revenueGrad)" name="Amount" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-gray-100 px-3 py-2">
          <div className="min-w-0 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Sales Report List</h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <CalendarDays size={14} />
              <span>{orderRows.length} orders</span>
              <span className="hidden sm:inline">| {filterSummary}</span>
            </div>
          </div>
          <div className="no-print ml-auto flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={exportExcel} disabled={isLoading || orderRows.length === 0} className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:h-9 sm:px-3 sm:text-sm">
              <FileSpreadsheet size={15} />
              Excel
            </button>
            <button type="button" onClick={printReport} disabled={isLoading || orderRows.length === 0} className="inline-flex h-8 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-purple-600 px-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 sm:h-9 sm:px-3 sm:text-sm">
              <Printer size={15} />
              Print
            </button>
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : orderRows.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <BarChart3 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No sales data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-center">No</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Order Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Order Code</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Phone</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Seller</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Product</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Items</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Total Amount</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Payment Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Order Status</th>
                  <th className="no-print whitespace-nowrap px-4 py-3 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orderRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-bold text-black">{index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold text-black">
                      {formatDate(row.received_at, 'MMM dd, yyyy')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-bold text-purple-700">{row.order_number || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold text-black">{row.customer_name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold text-black">{row.customer_phone || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold"><SellerBadge name={row.seller_name} /></td>
                    <td className="max-w-xs px-4 py-3 text-left align-middle text-sm"><ProductPill value={row.product_summary} /></td>
                    <td className="px-4 py-3 text-center align-middle text-sm font-bold text-indigo-700">
                      <ItemsPill count={row.items_count} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-bold text-emerald-700">{formatCurrency(row.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm"><PaymentStatusBadge status={row.payment_status} className="text-sm font-semibold" /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm">
                      <button
                        type="button"
                        onClick={() => setProcessOrder(row)}
                        className="inline-flex rounded-lg transition hover:ring-2 hover:ring-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-200"
                        title="View process date and time"
                      >
                        <OrderStatusBadge status={row.order_status} className="text-sm font-semibold" />
                      </button>
                    </td>
                    <td className="no-print whitespace-nowrap px-4 py-3 text-center align-middle">
                      {row.order_id ? (
                        <button
                          type="button"
                          onClick={() => setReceiptOrderId(row.order_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      ) : (
                        <span className="text-sm font-semibold text-black">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900">Total</td>
                  <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-bold text-gray-900">{totals.total_orders} orders</td>
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-indigo-700">{totals.total_items}</td>
                  <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-emerald-700">{formatCurrency(totals.total_revenue)}</td>
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="no-print border-t border-gray-200 bg-gray-50 px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      {receiptOrderId && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
          onClick={closeReceipt}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="no-print flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Order Preview</h3>
                <p className="text-xs capitalize text-gray-400">Receipt document</p>
              </div>
              <button
                type="button"
                onClick={closeReceipt}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg leading-none text-gray-500 hover:bg-gray-200"
                aria-label="Close receipt"
              >
                ×
              </button>
            </div>
            <div className="print-preview-window flex max-h-[calc(90vh-73px)] flex-col items-center overflow-auto bg-gray-50 p-4 text-gray-950">
              {isReceiptLoading || !receiptOrder ? (
                <div className="w-full rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <Printer size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">Loading preview...</p>
                </div>
              ) : (
                <PrintPreview
                  order={receiptOrder}
                  type="receipt"
                  printLogoUrl={siteSettings?.print_logo_url || null}
                  printLogoSize={siteSettings?.print_logo_size || 64}
                  printQrSize={siteSettings?.print_qr_size || 68}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {processOrder && (
        <StatusProcessModal
          order={processOrder}
          onClose={() => setProcessOrder(null)}
        />
      )}
    </div>
  )
}
