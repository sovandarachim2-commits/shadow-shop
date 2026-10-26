import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Boxes, ChevronDown, FileSpreadsheet, Package, PackageCheck, Printer, Search, ShoppingBag } from 'lucide-react'
import { inventoryApi } from '@/api/inventory'
import { productsApi } from '@/api/products'
import { reportsApi } from '@/api/reports'
import { Modal } from '@/components/ui/Modal'
import { KHMER_FONT_FAMILY, KHMER_TEXT_STYLE } from '@/utils/constants'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

const ORDER_STATUSES = [
  ['new', 'New'],
  ['confirmed', 'Confirmed'],
  ['printed', 'Printed'],
  ['preparing', 'Preparing'],
  ['packed', 'Packed'],
  ['shipped', 'Shipped'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]

const PAYMENT_STATUSES = [
  ['paid', 'Paid'],
  ['unpaid', 'Unpaid'],
  ['partial', 'Partially Paid'],
  ['refunded', 'Refunded'],
]

const PAYMENT_METHODS = [
  ['bakong', 'Bakong KHQR'],
  ['aba', 'ABA Bank'],
  ['acleda', 'ACLEDA Bank'],
  ['wing', 'Wing'],
  ['cod', 'Cash on Delivery'],
  ['cash', 'Cash'],
  ['contact_sales', 'Contact Sales'],
  ['other', 'Other'],
]

const PERIODS = [
  ['all', 'All time'],
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'This week'],
  ['last_week', 'Last week'],
  ['month', 'This month'],
  ['last_month', 'Last month'],
  ['custom', 'Custom'],
]

function toDateInput(date) {
  const copy = new Date(date)
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset())
  return copy.toISOString().slice(0, 10)
}

function periodRange(period) {
  if (period === 'all' || period === 'custom') return { from: '', to: '' }
  const today = new Date()
  const start = new Date(today)
  let end = new Date(today)
  if (period === 'yesterday') {
    start.setDate(today.getDate() - 1)
    end = new Date(start)
  }
  if (period === 'week' || period === 'last_week') {
    const day = today.getDay() || 7
    start.setDate(today.getDate() - day + 1)
    if (period === 'last_week') {
      start.setDate(start.getDate() - 7)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    }
  }
  if (period === 'month') start.setDate(1)
  if (period === 'last_month') {
    start.setDate(1)
    start.setMonth(start.getMonth() - 1)
    end = new Date(today.getFullYear(), today.getMonth(), 0)
  }
  return { from: toDateInput(start), to: toDateInput(end) }
}

const fieldClass = 'h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-800 outline-none focus:border-purple-500 focus:bg-white'

const PRODUCT_COLORS = [
  ['bg-orange-50 text-orange-700', 'bg-orange-50', 'bg-orange-100', 'text-orange-700'],
  ['bg-sky-50 text-sky-700', 'bg-sky-50', 'bg-sky-100', 'text-sky-700'],
  ['bg-violet-50 text-violet-700', 'bg-violet-50', 'bg-violet-100', 'text-violet-700'],
  ['bg-emerald-50 text-emerald-700', 'bg-emerald-50', 'bg-emerald-100', 'text-emerald-700'],
  ['bg-rose-50 text-rose-700', 'bg-rose-50', 'bg-rose-100', 'text-rose-700'],
  ['bg-amber-50 text-amber-800', 'bg-amber-50', 'bg-amber-100', 'text-amber-800'],
  ['bg-cyan-50 text-cyan-700', 'bg-cyan-50', 'bg-cyan-100', 'text-cyan-700'],
  ['bg-fuchsia-50 text-fuchsia-700', 'bg-fuchsia-50', 'bg-fuchsia-100', 'text-fuchsia-700'],
  ['bg-lime-50 text-lime-800', 'bg-lime-50', 'bg-lime-100', 'text-lime-800'],
  ['bg-indigo-50 text-indigo-700', 'bg-indigo-50', 'bg-indigo-100', 'text-indigo-700'],
]

function productColor(index) {
  return PRODUCT_COLORS[index % PRODUCT_COLORS.length]
}

const PAYMENT_METHOD_COLORS = {
  bakong: 'bg-violet-100 text-violet-800',
  aba: 'bg-red-100 text-red-800',
  acleda: 'bg-blue-100 text-blue-800',
  wing: 'bg-emerald-100 text-emerald-800',
  cod: 'bg-amber-100 text-amber-800',
  cash: 'bg-green-100 text-green-800',
  contact_sales: 'bg-sky-100 text-sky-800',
  other: 'bg-slate-200 text-slate-800',
}
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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

const SUMMARY_COLUMNS = [
  { id: 'no', en: 'No', km: 'ល.រ' },
  { id: 'product', en: 'Product', km: 'ផលិតផល' },
  { id: 'type', en: 'Product Type', km: 'ប្រភេទផលិតផល' },
  { id: 'code', en: 'Code', km: 'កូដ' },
  { id: 'category', en: 'Category', km: 'ក្រុម' },
  { id: 'qty', en: 'Qty Sold', km: 'ចំនួនលក់' },
  { id: 'unit', en: 'Unit Price', km: 'តម្លៃរាយ' },
  { id: 'price', en: 'Total Price', km: 'តម្លៃសរុប' },
  { id: 'delivery', en: 'Delivery Fee', km: 'ថ្លៃដឹក' },
  { id: 'amount', en: 'Total Amount', km: 'ទឹកប្រាក់សរុប' },
  { id: 'updated', en: 'Last update', km: 'កែចុងក្រោយ' },
]

const ORDER_COLUMNS = [
  { id: 'no', en: 'No', km: 'ល.រ' },
  { id: 'date', en: 'Order Date', km: 'ថ្ងៃបញ្ជាទិញ' },
  { id: 'customer', en: 'Customer Name', km: 'ឈ្មោះអតិថិជន' },
  { id: 'qty', en: 'Total Qty', km: 'ចំនួនសរុប' },
  { id: 'payment_status', en: 'Payment Status', km: 'Payment Status' },
  { id: 'method', en: 'Method', km: 'Method' },
  { id: 'amount', en: 'Total Amount', km: 'ទឹកប្រាក់សរុប' },
  { id: 'discount', en: 'Sale Discount', km: 'បញ្ចុះតម្លៃ' },
  { id: 'delivery', en: 'Delivery Fee', km: 'ថ្លៃដឹក' },
  { id: 'grand', en: 'Grand Total', km: 'សរុបចុងក្រោយ' },
]

const PERIOD_LABELS = {
  all: ['All time', 'គ្រប់ពេល'],
  today: ['Today', 'ថ្ងៃនេះ'],
  yesterday: ['Yesterday', 'ម្សិលមិញ'],
  week: ['This week', 'សប្តាហ៍នេះ'],
  last_week: ['Last week', 'សប្តាហ៍មុន'],
  month: ['This month', 'ខែនេះ'],
  last_month: ['Last month', 'ខែមុន'],
  custom: ['Custom', 'កំណត់ផ្ទាល់'],
}

const cellStyle = {
  text: 'color:#000;',
  center: 'text-align:center;color:#000;',
  qty: 'text-align:center;color:#000;font-weight:700;',
  money: 'text-align:center;color:#000;font-weight:700;',
  discount: 'text-align:center;color:#000;font-weight:700;',
  delivery: 'text-align:center;color:#000;font-weight:700;',
  grand: 'text-align:center;color:#000;font-weight:700;',
  foot: 'text-align:right;font-weight:700;background:#f5f3ff;color:#000;',
}

const td = (value, kind = 'text') => `<td style="${cellStyle[kind] || 'color:#000;'}">${value}</td>`
const th = (value, extra = '') => `<th style="background:#ede9fe;color:#000;text-align:center;border:1px solid #000;${extra}">${value}</th>`

const PAYMENT_STATUS_COLORS = {
  paid: ['#dcfce7', '#166534'],
  unpaid: ['#fee2e2', '#991b1b'],
  partial: ['#fef3c7', '#92400e'],
  refunded: ['#e0e7ff', '#3730a3'],
}
const PAYMENT_STATUS_LABELS = { paid: 'Paid', unpaid: 'Unpaid', partial: 'Partially Paid', refunded: 'Refunded' }
const PAYMENT_STATUS_TW = { paid: 'bg-green-100 text-green-800', unpaid: 'bg-red-100 text-red-800', partial: 'bg-amber-100 text-amber-800', refunded: 'bg-indigo-100 text-indigo-800' }
const paymentStatusCell = (status) => {
  const [background, color] = PAYMENT_STATUS_COLORS[status] || ['#f1f5f9', '#334155']
  return `<td style="background:${background};color:${color};font-weight:700;text-align:center;">${escapeHtml(PAYMENT_STATUS_LABELS[status] || status || '�')}</td>`
}
const PAYMENT_METHOD_PRINT_COLORS = {
  bakong: ['#ede9fe', '#5b21b6'],
  aba: ['#fee2e2', '#991b1b'],
  acleda: ['#dbeafe', '#1e40af'],
  wing: ['#d1fae5', '#065f46'],
  cod: ['#fef3c7', '#92400e'],
  cash: ['#dcfce7', '#166534'],
  contact_sales: ['#e0f2fe', '#075985'],
  other: ['#e2e8f0', '#334155'],
}
const paymentMethodCell = (order) => {
  const [background, color] = PAYMENT_METHOD_PRINT_COLORS[order.payment_method] || ['#f1f5f9', '#334155']
  return `<td style="background:${background};color:${color};font-weight:700;text-align:center;">${escapeHtml(order.payment_method_display || '�')}</td>`
}
function ColumnGroup({ title, columns, selected, onChange, language, clearLabel, allLabel }) {
  const allOn = columns.length > 0 && columns.every((column) => selected.includes(column.id))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-gray-900" style={language === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.9 } : undefined}>{title} <span className="font-medium text-gray-500">({selected.length}/{columns.length})</span></p>
        <button type="button" onClick={() => onChange(allOn ? [] : columns.map((column) => column.id))} className="text-xs font-semibold text-purple-600">
          {allOn ? clearLabel : allLabel}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {columns.map((column) => (
          <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/40 px-2.5 py-2 text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={selected.includes(column.id)} onChange={() => onChange(selected.includes(column.id) ? selected.filter((id) => id !== column.id) : [...selected, column.id])} className="accent-purple-600" />
            <span className="truncate" style={language === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.9 } : undefined}>{language === 'km' ? column.km : column.en}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function ReportActions({ onExcel, onPrint }) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
      <button type="button" onClick={onExcel} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm">
        <FileSpreadsheet size={15} />
        Export Excel
      </button>
      <button type="button" onClick={onPrint} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-purple-600 px-2 text-xs font-semibold text-white hover:bg-purple-700 sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm">
        <Printer size={15} />
        Print
      </button>
    </div>
  )
}

export default function StockSold() {
  const [orderSearch, setOrderSearch] = useState('')
  const [query, setQuery] = useState('')
  const initialRange = periodRange('month')
  const [period, setPeriod] = useState('month')
  const [dateFrom, setDateFrom] = useState(initialRange.from)
  const [dateTo, setDateTo] = useState(initialRange.to)
  const [orderStatuses, setOrderStatuses] = useState([])
  const [paymentStatuses, setPaymentStatuses] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [displayMode, setDisplayMode] = useState('items')
  const [openSet, setOpenSet] = useState(null)
  const [exportCard, setExportCard] = useState(null)
  const [reportLanguage, setReportLanguage] = useState('en')
  const [includeSign, setIncludeSign] = useState(false)
  const [summaryCols, setSummaryCols] = useState(SUMMARY_COLUMNS.map((column) => column.id))
  const [orderCols, setOrderCols] = useState(ORDER_COLUMNS.map((column) => column.id))
  const [pickedProducts, setPickedProducts] = useState([])
  const productPickReady = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => setQuery(orderSearch.trim()), 300)
    return () => clearTimeout(timer)
  }, [orderSearch])

  const { data: stock, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-sold'],
    queryFn: () => inventoryApi.stock.list({ page_size: 1000 }),
    select: (response) => response.data?.results ?? [],
  })

  const filters = {
    search: query || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    order_status: orderStatuses.join(',') || undefined,
    payment_status: paymentStatuses.join(',') || undefined,
    payment_method: paymentMethods.join(',') || undefined,
    display: displayMode,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['stock-sold-orders', filters],
    queryFn: () => reportsApi.stockSold(filters),
    select: (response) => response.data ?? { products: [], orders: [] },
  })

  const setDetailId = openSet?.id ? String(openSet.id).replace(/^s-/, '') : ''
  const { data: setDetail, isLoading: setDetailLoading, isError: setDetailError } = useQuery({
    queryKey: ['stock-sold-set', setDetailId],
    queryFn: () => productsApi.sets.get(setDetailId),
    enabled: Boolean(setDetailId),
    select: (response) => response.data,
  })
  const products = data?.products ?? []
  const orders = data?.orders ?? []
  const columnTotals = useMemo(() => {
    const totals = {}
    products.forEach((product) => {
      totals[product.id] = orders.reduce((sum, order) => sum + (order.quantities?.[product.id] || 0), 0)
    })
    return totals
  }, [products, orders])
  const ordersQty = orders.reduce((sum, order) => sum + (order.total_qty || 0), 0)
  const ordersAmount = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
  const saleDiscount = orders.reduce((sum, order) => sum + (Number(order.sale_discount) || 0), 0)
  const deliveryFee = orders.reduce((sum, order) => sum + (Number(order.delivery_fee) || 0), 0)
  const grandTotal = orders.reduce((sum, order) => sum + (Number(order.grand_total) || 0), 0)
  const summary = useMemo(() => {
    const stockByProduct = {}
    ;(stock ?? []).forEach((row) => { stockByProduct[`p-${row.product}`] = row })
    return products
      .map((product) => {
        const stockRow = stockByProduct[product.id]
        return {
          id: product.id,
          name: product.name,
          type: String(product.id).startsWith('s-') ? 'Set' : 'Item',
          code: stockRow?.product_code || '—',
          category: stockRow?.category_name || '—',
          qty: columnTotals[product.id] || 0,
          delivery: orders.reduce((sum, order) => sum + (Number(order.delivery_shares?.[product.id]) || 0), 0),
          amount: orders.reduce((sum, order) => sum + (Number(order.amounts?.[product.id]) || 0), 0),
          updatedAt: stockRow?.updated_at || '',
        }
      })
      .filter((row) => row.qty > 0)
      .sort((left, right) => right.qty - left.qty)
  }, [products, stock, columnTotals, orders])
  const totalSold = summary.reduce((sum, row) => sum + row.qty, 0)

  const applyPeriod = (value) => {
    setPeriod(value)
    if (value === 'custom') return
    const range = periodRange(value)
    setDateFrom(range.from)
    setDateTo(range.to)
  }

  const toggleValue = (values, setValues, value) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  const summaryTableHtml = ({ language = 'en', columns = SUMMARY_COLUMNS.map((column) => column.id) } = {}) => {
    const word = (en, km) => (language === 'km' ? km : en)
    const picked = SUMMARY_COLUMNS.filter((column) => columns.includes(column.id))
    const headers = picked.map((column) => th(escapeHtml(language === 'km' ? column.km : column.en))).join('')
    const rows = summary.map((row, index) => {
      const cells = {
        no: td(index + 1, 'center'),
        product: td(escapeHtml(row.name)),
        type: td(escapeHtml(row.type === 'Set' ? word('Set', 'សំណុំ') : word('Item', 'មុខទំនិញ')), 'center'),
        code: td(escapeHtml(row.code), 'center'),
        category: td(escapeHtml(row.category), 'center'),
        qty: td(row.qty, 'qty'),
        unit: td(escapeHtml(formatCurrency(row.qty ? row.amount / row.qty : 0)), 'money'),
        price: td(escapeHtml(formatCurrency(row.amount)), 'money'),
        delivery: td(escapeHtml(formatCurrency(row.delivery)), 'delivery'),
        amount: td(escapeHtml(formatCurrency(row.amount + row.delivery)), 'grand'),
        updated: td(escapeHtml(row.updatedAt ? formatDateTime(row.updatedAt) : '—'), 'center'),
      }
      return `<tr>${picked.map((column) => cells[column.id]).join('')}</tr>`
    }).join('')
    const footerValues = {
      qty: [totalSold, 'qty'],
      price: [formatCurrency(ordersAmount), 'money'],
      delivery: [formatCurrency(deliveryFee), 'delivery'],
      amount: [formatCurrency(ordersAmount + deliveryFee), 'grand'],
    }
    let labeled = false
    const footer = picked.map((column) => {
      if (footerValues[column.id]) return td(escapeHtml(String(footerValues[column.id][0])), footerValues[column.id][1])
      if (!labeled) {
        labeled = true
        return td(escapeHtml(word('Total', 'សរុប')), 'foot')
      }
      return td('')
    }).join('')
    return `<h2 style="color:#000;">${escapeHtml(word('Summary', 'សង្ខេប'))}</h2>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${picked.length || 1}" style="text-align:center;">${escapeHtml(word('No products in this filter', 'គ្មានផលិតផលក្នុងតម្រងនេះ'))}</td></tr>`}</tbody>
    <tfoot><tr>${footer}</tr></tfoot>
  </table>`
  }

  const orderTableHtml = ({ print = false, language = 'en', columns = ORDER_COLUMNS.map((column) => column.id), productIds = products.map((product) => product.id) } = {}) => {
    const word = (en, km) => (language === 'km' ? km : en)
    const picked = ORDER_COLUMNS.filter((column) => columns.includes(column.id))
    const chosenProducts = products.filter((product) => productIds.includes(product.id))
    const productHeaders = chosenProducts.map((product) => (
      print
        ? `<th class="product"><span>${escapeHtml(product.name)}</span></th>`
        : th(escapeHtml(product.name))
    )).join('')
    const lead = picked.filter((column) => ['no', 'code', 'date', 'customer'].includes(column.id))
    const tail = picked.filter((column) => !['no', 'code', 'date', 'customer'].includes(column.id))
    const headers = `${lead.map((column) => th(escapeHtml(language === 'km' ? column.km : column.en))).join('')}${productHeaders}${tail.map((column) => th(escapeHtml(language === 'km' ? column.km : column.en))).join('')}`
    const cellFor = (order, column, index) => {
      const cells = {
        no: td(index + 1, 'center'),
        code: td(escapeHtml(order.order_number || '—'), 'center'),
        date: td(escapeHtml(formatDateTime(order.order_date)), 'center'),
        customer: td(escapeHtml(order.customer_name || '—')),
        qty: td(order.total_qty, 'qty'),
        payment_status: paymentStatusCell(order.payment_status),
        method: paymentMethodCell(order),
        amount: td(escapeHtml(formatCurrency(order.total_amount)), 'money'),
        discount: td(escapeHtml(formatCurrency(order.sale_discount)), 'discount'),
        delivery: td(escapeHtml(formatCurrency(order.delivery_fee)), 'delivery'),
        grand: td(escapeHtml(formatCurrency(order.grand_total)), 'grand'),
      }
      return cells[column.id]
    }
    const rows = orders.map((order, index) => {
      const productCells = chosenProducts.map((product) => td(order.quantities?.[product.id] || '—', 'center')).join('')
      return `<tr>${lead.map((column) => cellFor(order, column, index)).join('')}${productCells}${tail.map((column) => cellFor(order, column, index)).join('')}</tr>`
    }).join('')
    const tailValues = {
      qty: [ordersQty, 'qty'],
      amount: [formatCurrency(ordersAmount), 'money'],
      discount: [formatCurrency(saleDiscount), 'discount'],
      delivery: [formatCurrency(deliveryFee), 'delivery'],
      grand: [formatCurrency(grandTotal), 'grand'],
    }
    let labeled = false
    const leadFooter = lead.map((column) => {
      if (!labeled) {
        labeled = true
        return td(escapeHtml(word('Total', 'សរុប')), 'foot')
      }
      return td('')
    }).join('')
    const productFooter = chosenProducts.map((product) => td(columnTotals[product.id] || '—', 'qty')).join('')
    const tailFooter = tail.map((column) => td(escapeHtml(String(tailValues[column.id]?.[0] ?? '')), tailValues[column.id]?.[1] || 'center')).join('')
    const width = lead.length + chosenProducts.length + tail.length
    return `<h2 style="color:#000;">${escapeHtml(word('Order Detail', 'លម្អិតបញ្ជាទិញ'))}</h2>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${width || 1}" style="text-align:center;">${escapeHtml(word('No orders match this filter', 'គ្មានបញ្ជាទិញក្នុងតម្រងនេះ'))}</td></tr>`}</tbody>
    <tfoot><tr>${leadFooter}${productFooter}${tailFooter}</tr></tfoot>
  </table>`
  }

  const signatureHtml = () => {
    const both = (en, km) => `${en} / ${km}`
    const roles = [
      both('Prepared by', 'រៀបចំដោយ'),
      both('Checked by', 'ពិនិត្យដោយ'),
      both('Approved by', 'អនុម័តដោយ'),
    ]
    return `<table style="width:100%;margin-top:28px;border-collapse:collapse;">
      <tr>${roles.map((role) => `<td style="width:33%;border:none;text-align:left;vertical-align:top;padding:8px 18px;line-height:1.8;color:#000;">
        <div style="font-weight:700;color:#000;text-align:left;">${escapeHtml(role)}</div>
        <div style="height:42px;margin:6px 0 0;border-bottom:1.5px solid #000;"></div>
        <div style="margin-top:8px;text-align:left;">${escapeHtml(both('Name', 'ឈ្មោះ'))} ........................</div>
        <div style="text-align:left;">${escapeHtml(both('Date', 'កាលបរិច្ឆេទ'))} ........................</div>
      </td>`).join('')}</tr>
    </table>`
  }

  const buildReportHtml = ({ excel = false, scope = 'all', language = 'en', summaryColumns = summaryCols, orderColumns = orderCols, productIds = pickedProducts, sign = false } = {}) => {
    const word = (en, km) => (language === 'km' ? km : en)
    const periodNames = PERIOD_LABELS[period] || ['', '']
    const periodLabel = word(periodNames[0], periodNames[1])
    const rangeLabel = dateFrom || dateTo ? `${dateFrom || '…'} ${word('to', 'ដល់')} ${dateTo || '…'}` : word('All dates', 'គ្រប់កាលបរិច្ឆេទ')
    const modeLabel = displayMode === 'set' ? word('With set', 'ជាមួយសំណុំ') : word('As item', 'តាមមុខទំនិញ')
    const title = scope === 'summary'
      ? word('Stock Sold Summary', 'សង្ខេបស្តុកលក់')
      : scope === 'orders'
        ? word('Stock Sold Order Detail', 'លម្អិតស្តុកលក់')
        : word('Stock Sold Report', 'របាយការណ៍ស្តុកលក់')
    const tableOptions = { language, columns: summaryColumns }
    const orderOptions = { print: !excel, language, columns: orderColumns, productIds }
    const tables = scope === 'summary' ? summaryTableHtml(tableOptions) : scope === 'orders' ? orderTableHtml(orderOptions) : `${summaryTableHtml(tableOptions)}${orderTableHtml(orderOptions)}`
    const printSize = language === 'km'
      ? Math.max(13, 15 - Math.floor(products.length / 12))
      : Math.max(8, 10 - Math.floor(products.length / 10))
    const printLine = language === 'km' ? 1.9 : 1.7
    const printPad = language === 'km' ? '8px 7px' : '5px 6px'
    const khmerFont = `${KHMER_FONT_FAMILY}, Arial, sans-serif`
    const style = excel
      ? `body { font-family: ${khmerFont}; font-weight: ${language === 'km' ? 600 : 400}; font-synthesis: none; line-height: ${language === 'km' ? 1.9 : 1.7}; color: #000; padding: 24px; }
    h1 { margin: 0 0 4px; font-size: ${language === 'km' ? 24 : 22}px; line-height: 1.8; color: #000; }
    h2 { margin: 22px 0 8px; font-size: ${language === 'km' ? 18 : 16}px; line-height: 1.8; color: #000; }
    p { margin: 0 0 14px; color: #000; font-size: ${language === 'km' ? 14 : 12}px; line-height: 1.8; }
    table { border-collapse: collapse; width: 100%; font-size: ${language === 'km' ? 14 : 12}px; margin-bottom: 8px; }
    th, td { border: 1px solid #000; padding: ${language === 'km' ? '8px' : '6px 8px'}; color: #000; line-height: ${language === 'km' ? 1.9 : 1.5}; }
    th { background: #ede9fe; font-weight: 700; color: #000; }
    tfoot td { font-weight: 700; background: #f5f3ff; color: #000; }
    br { mso-data-placement:same-cell; }`
      : `html, body { margin: 0; padding: 0; }
    body { font-family: ${khmerFont}; font-weight: ${language === 'km' ? 600 : 400}; font-synthesis: none; line-height: ${printLine}; color: #000; }
    h1 { margin: 0 0 2px; font-size: ${language === 'km' ? 22 : 18}px; line-height: 1.8; color: #000; }
    h2 { margin: 14px 0 6px; font-size: ${language === 'km' ? 16 : 14}px; line-height: 1.8; page-break-after: avoid; color: #000; }
    p { margin: 0 0 8px; font-size: ${language === 'km' ? 14 : 12}px; line-height: 1.8; color: #000; }
    table { width: 100%; border-collapse: collapse; font-size: ${printSize}px; margin: 0 0 10px; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #000; padding: ${printPad}; vertical-align: middle; line-height: ${printLine}; color: #000; }
    tbody tr:nth-child(even) td { background: #faf5ff; }
    tfoot td { font-weight: 700; background: #f5f3ff; color: #000; }
    th.product { width: 1%; padding: 4px 2px; vertical-align: bottom; text-align: center; background: #ede9fe; color: #000; border: 1px solid #000; }
    th.product span { writing-mode: vertical-rl; transform: rotate(180deg); display: inline-block; background: transparent; color: #000; padding: 4px 2px; white-space: nowrap; font-size: ${language === 'km' ? 12 : 9}px; line-height: ${language === 'km' ? 1.7 : 1.35}; }`
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@400;600;700&display=swap">
  <style>${style}</style>
</head>
<body>
  <h1>${title}</h1>
  <p>${escapeHtml(`${periodLabel} · ${rangeLabel} · ${modeLabel}`)}</p>
  ${tables}
  ${sign ? signatureHtml() : ''}
</body>
</html>`
  }

  const scopeHasRows = (scope) => {
    if (scope === 'summary') return summary.length > 0
    if (scope === 'orders') return orders.length > 0
    return summary.length > 0 || orders.length > 0
  }

  const exportExcel = (scope = 'all', options = {}) => {
    if (!scopeHasRows(scope)) {
      toast.error(reportLanguage === 'km' ? 'គ្មានទិន្នន័យសម្រាប់នាំចេញ' : 'No report data to export')
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    const name = scope === 'all' ? 'stock-sold' : `stock-sold-${scope}`
    downloadFile(
      `\ufeff${buildReportHtml({ excel: true, scope, ...options })}`,
      `${name}-${stamp}.xls`,
      'application/vnd.ms-excel;charset=utf-8;',
    )
    toast.success(reportLanguage === 'km' ? 'បាននាំចេញទៅ Excel' : 'Exported to Excel')
  }

  const printReport = (scope = 'all', options = {}) => {
    if (!scopeHasRows(scope)) {
      toast.error(reportLanguage === 'km' ? 'គ្មានទិន្នន័យសម្រាប់បោះពុម្ព' : 'No report data to print')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error(reportLanguage === 'km' ? 'សូមអនុញ្ញាតផ្ទាំងលេចឡើង ដើម្បីបោះពុម្ព' : 'Popup blocked. Allow popups to print this report.')
      return
    }
    printWindow.document.open()
    printWindow.document.write(buildReportHtml({ scope, ...options }))
    printWindow.document.close()
    printWindow.focus()
    const startPrint = () => window.setTimeout(() => printWindow.print(), 300)
    if (printWindow.document.fonts?.ready) printWindow.document.fonts.ready.then(startPrint)
    else startPrint()
  }

  const openExport = (action, scope) => {
    if (!productPickReady.current) {
      setPickedProducts(products.map((product) => product.id))
      productPickReady.current = true
    }
    setExportCard({ action, scope })
  }

  const confirmExport = () => {
    if (!exportCard) return
    const wantsSummary = exportCard.scope !== 'orders'
    const wantsOrders = exportCard.scope !== 'summary'
    if (wantsSummary && summaryCols.length === 0) {
      toast.error(reportLanguage === 'km' ? 'សូមជ្រើសជួរឈរសង្ខេប' : 'Choose at least one summary column')
      return
    }
    if (wantsOrders && orderCols.length === 0 && pickedProducts.length === 0) {
      toast.error(reportLanguage === 'km' ? 'សូមជ្រើសជួរឈរលម្អិត' : 'Choose at least one order column')
      return
    }
    const options = {
      language: reportLanguage,
      summaryColumns: summaryCols,
      orderColumns: orderCols,
      productIds: pickedProducts,
      sign: includeSign,
    }
    const { action, scope } = exportCard
    setExportCard(null)
    if (action === 'excel') exportExcel(scope, options)
    else printReport(scope, options)
  }

  return (
    <div className="space-y-4">
      <div className="page-header mb-0 w-full">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Stock Sold Report</h1>
          <p className="mt-0.5 text-sm text-gray-500">Summary of products sold, then the orders underneath.</p>
        </div>
        <div className="ml-auto">
          <ReportActions onExcel={() => openExport('excel', 'all')} onPrint={() => openExport('print', 'all')} />
        </div>
      </div>

      <section className="relative z-20 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <label className="min-w-0 sm:col-span-2 xl:col-span-1">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Search</span>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${fieldClass} pl-9`} placeholder="Customer, phone, or order" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
            </div>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Period</span>
            <select className={fieldClass} value={period} onChange={(event) => applyPeriod(event.target.value)}>
              {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Order from</span>
            <input type="date" className={fieldClass} value={dateFrom} onChange={(event) => { setPeriod('custom'); setDateFrom(event.target.value) }} />
          </label>
          <label className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Order to</span>
            <input type="date" className={fieldClass} value={dateTo} min={dateFrom || undefined} onChange={(event) => { setPeriod('custom'); setDateTo(event.target.value) }} />
          </label>
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Order status</span>
            <details className="relative">
              <summary className={`${fieldClass} flex cursor-pointer list-none items-center justify-between gap-2`}>
                <span className="truncate">{orderStatuses.length ? `Status (${orderStatuses.length})` : 'All status'}</span>
                <ChevronDown size={14} className="shrink-0 text-gray-400" />
              </summary>
              <div className="absolute left-0 top-12 z-50 max-h-72 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                {ORDER_STATUSES.map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                    <input type="checkbox" checked={orderStatuses.includes(value)} onChange={() => toggleValue(orderStatuses, setOrderStatuses, value)} className="accent-purple-600" />
                    <span className="flex-1 font-semibold text-gray-800">{label}</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-400">{data?.status_counts?.[value] || 0}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Payment status</span>
            <details className="relative">
              <summary className={`${fieldClass} flex cursor-pointer list-none items-center justify-between gap-2`}>
                <span className="truncate">{paymentStatuses.length ? `Payments (${paymentStatuses.length})` : 'All payments'}</span>
                <ChevronDown size={14} className="shrink-0 text-gray-400" />
              </summary>
              <div className="absolute left-0 top-12 z-50 max-h-72 w-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                {PAYMENT_STATUSES.map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                    <input type="checkbox" checked={paymentStatuses.includes(value)} onChange={() => toggleValue(paymentStatuses, setPaymentStatuses, value)} className="accent-purple-600" />
                    <span className="flex-1 font-semibold text-gray-800">{label}</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-400">{data?.payment_counts?.[value] || 0}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>          <div className="min-w-0">
            <span className="mb-1 block text-xs font-semibold text-slate-500">Payment method</span>
            <details className="relative">
              <summary className={`${fieldClass} flex cursor-pointer list-none items-center justify-between gap-2`}>
                <span className="truncate">{paymentMethods.length ? `Method (${paymentMethods.length})` : 'All methods'}</span>
                <ChevronDown size={14} className="shrink-0 text-gray-400" />
              </summary>
              <div className="absolute left-0 top-12 z-50 max-h-72 w-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                {PAYMENT_METHODS.map(([value, label]) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                    <input type="checkbox" checked={paymentMethods.includes(value)} onChange={() => toggleValue(paymentMethods, setPaymentMethods, value)} className="accent-purple-600" />
                    <span className="flex-1 font-semibold text-gray-800">{label}</span>
                    <span className="text-xs font-semibold tabular-nums text-slate-400">{data?.payment_method_counts?.[value] || 0}</span>
                  </label>
                ))}
              </div>
            </details>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Stock Sold', value: totalSold, icon: PackageCheck, color: 'bg-orange-100 text-orange-600', valueColor: 'text-orange-600' },
          { label: 'Products Sold', value: summary.length, icon: Package, color: 'bg-purple-100 text-purple-600', valueColor: 'text-purple-700' },
          { label: 'Orders', value: orders.length, icon: ShoppingBag, color: 'bg-sky-100 text-sky-600', valueColor: 'text-sky-700' },
          { label: 'Qty in Filter', value: ordersQty, icon: Boxes, color: 'bg-green-100 text-green-600', valueColor: 'text-green-700' },
        ].map((card) => (
          <div key={card.label} className="kpi-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">{card.label}</p>
                <p className={`mt-1 text-2xl font-bold ${card.valueColor}`}>{card.value}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.color}`}>
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-gray-100 px-3 py-2">
          <h2 className="shrink-0 text-sm font-semibold text-gray-900">Summary</h2>
          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-1.5">
            <div className="flex shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => setDisplayMode('items')}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm ${displayMode === 'items' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}
              >
                As item
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('set')}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm ${displayMode === 'set' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}
              >
                With set
              </button>
            </div>
            <ReportActions onExcel={() => openExport('excel', 'summary')} onPrint={() => openExport('print', 'summary')} />
          </div>
        </div>
        {(stockLoading || isLoading) ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : summary.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm font-semibold text-gray-400">No products in this filter</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-14 px-4 py-3 text-center">No</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Product Type</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Code</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Category</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Qty Sold</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Unit Price</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Total Price</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Delivery fee</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Total amount</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Last update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center align-middle text-sm font-bold text-black">{index + 1}</td>
                    <td className="px-4 py-3 text-left align-middle text-sm font-semibold text-black">
                      {row.type === 'Set' ? (
                        <button type="button" onClick={() => setOpenSet({ id: row.id, name: row.name })} className="text-left font-semibold text-violet-700 underline decoration-violet-200 underline-offset-2 hover:text-violet-900">
                          {row.name}
                        </button>
                      ) : row.name}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold ${row.type === 'Set' ? 'text-violet-700' : 'text-sky-700'}`}>{row.type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold text-black">{row.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold text-indigo-700">{row.category}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-bold text-orange-600">{row.qty}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-semibold text-emerald-700">{formatCurrency(row.qty ? row.amount / row.qty : 0)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-bold text-emerald-700">{formatCurrency(row.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-semibold text-emerald-700">{formatCurrency(row.delivery)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-bold text-emerald-700">{formatCurrency(row.amount + row.delivery)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-semibold text-black">{row.updatedAt ? formatDateTime(row.updatedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-right text-sm font-bold text-gray-900" colSpan={5}>Total</td>
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-orange-600">{totalSold}</td>
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-emerald-700">{formatCurrency(ordersAmount)}</td>
                  <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-emerald-700">{formatCurrency(deliveryFee)}</td>
                  <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-emerald-700">{formatCurrency(ordersAmount + deliveryFee)}</td>
                  <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-gray-100 px-3 py-2">
          <h2 className="shrink-0 text-sm font-semibold text-gray-900">Order Detail</h2>
          <div className="ml-auto shrink-0">
            <ReportActions onExcel={() => openExport('excel', 'orders')} onPrint={() => openExport('print', 'orders')} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <PackageCheck size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">No orders match this filter</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="max-lg:static lg:sticky left-0 z-20 w-14 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">No</th>
                  <th className="max-lg:static lg:sticky left-14 z-20 min-w-[170px] bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Order Date</th>
                  <th className="max-lg:static lg:sticky left-[226px] z-20 min-w-[180px] border-r border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Customer Name</th>
                  {products.map((product, productIndex) => {
                    const [headerClass] = productColor(productIndex)
                    return (
                      <th key={product.id} className={`w-10 border-b border-white p-0 align-bottom ${headerClass}`}>
                        <div className="flex h-44 items-center justify-center">
                          {String(product.id).startsWith('s-') ? (
                            <button type="button" title={product.name} onClick={() => setOpenSet({ id: product.id, name: product.name })} className="inline-block max-h-40 truncate text-xs font-semibold text-violet-800 underline decoration-violet-200 underline-offset-2 [writing-mode:vertical-rl] rotate-180">
                              {product.name}
                            </button>
                          ) : (
                            <span title={product.name} className="inline-block max-h-40 truncate text-xs font-semibold [writing-mode:vertical-rl] rotate-180">
                              {product.name}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                  <th className="max-lg:static lg:sticky right-[870px] z-20 w-[100px] border-l border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Total Qty</th>
                  <th className="max-lg:static lg:sticky right-[730px] z-20 w-[140px] border-l border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Payment Status</th>
                  <th className="max-lg:static lg:sticky right-[590px] z-20 w-[140px] border-l border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Method</th>
                  <th className="max-lg:static lg:sticky right-[450px] z-20 w-[140px] border-l border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Total Amount</th>
                  <th className="max-lg:static lg:sticky right-[310px] z-20 w-[140px] border-l border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Sale Discount</th>
                  <th className="max-lg:static lg:sticky right-[180px] z-20 w-[130px] border-l border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Delivery Fee</th>
                  <th className="max-lg:static lg:sticky right-0 z-20 w-[180px] border-l border-gray-100 bg-gray-50 px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-black">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => {
                  const stripe = index % 2 === 1 ? 'bg-slate-100' : 'bg-white'
                  return (
                    <tr key={order.id}>
                      <td className={`max-lg:static lg:sticky left-0 z-10 border-t border-white px-3 py-3 text-center align-middle text-sm font-bold text-black ${stripe}`}>{index + 1}</td>
                      <td className={`max-lg:static lg:sticky left-14 z-10 whitespace-nowrap border-t border-white px-3 py-3 text-center align-middle text-sm font-semibold text-black ${stripe}`}>{formatDateTime(order.order_date)}</td>
                      <td className={`max-lg:static lg:sticky left-[226px] z-10 border-r border-t border-white px-3 py-3 text-center align-middle text-sm font-semibold text-black ${stripe}`}>{order.customer_name || '—'}</td>
                      {products.map((product, productIndex) => {
                        const qty = order.quantities?.[product.id] || 0
                        const [, oddClass, evenClass, textClass] = productColor(productIndex)
                        return (
                          <td key={product.id} className={`border-t border-white px-1 py-3 text-center align-middle text-sm font-semibold ${index % 2 === 0 ? oddClass : evenClass}`}>
                            {qty > 0 ? <span className={textClass}>{qty}</span> : <span className="text-black">—</span>}
                          </td>
                        )
                      })}
                      <td className={`max-lg:static lg:sticky right-[870px] z-10 w-[100px] border-l border-t border-white px-3 py-3 text-center align-middle text-sm font-bold text-orange-600 ${stripe}`}>{order.total_qty}</td>
                      <td className={`max-lg:static lg:sticky right-[730px] z-10 w-[140px] whitespace-nowrap border-l border-t border-white px-3 py-3 text-center align-middle text-sm font-semibold ${stripe}`}><span className={`inline-flex rounded-full px-2.5 py-1 ${PAYMENT_STATUS_TW[order.payment_status] || 'bg-slate-100 text-slate-700'}`}>{PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status || '�'}</span></td>
                      <td className={`max-lg:static lg:sticky right-[590px] z-10 w-[140px] whitespace-nowrap border-l border-t border-white px-3 py-3 text-center align-middle text-sm font-semibold ${stripe}`}><span className={`inline-flex rounded-full px-2.5 py-1 ${PAYMENT_METHOD_COLORS[order.payment_method] || 'bg-slate-100 text-slate-700'}`}>{order.payment_method_display || '�'}</span></td>
                      <td className={`max-lg:static lg:sticky right-[450px] z-10 w-[140px] whitespace-nowrap border-l border-t border-white px-3 py-3 text-center align-middle text-sm font-bold text-emerald-700 ${stripe}`}>{formatCurrency(order.total_amount)}</td>
                      <td className={`max-lg:static lg:sticky right-[310px] z-10 w-[140px] whitespace-nowrap border-l border-t border-white px-3 py-3 text-center align-middle text-sm font-semibold text-rose-600 ${stripe}`}>{formatCurrency(order.sale_discount)}</td>
                      <td className={`max-lg:static lg:sticky right-[180px] z-10 w-[130px] whitespace-nowrap border-l border-t border-white px-3 py-3 text-center align-middle text-sm font-semibold text-sky-700 ${stripe}`}>{formatCurrency(order.delivery_fee)}</td>
                      <td className={`max-lg:static lg:sticky right-0 z-10 w-[180px] whitespace-nowrap border-l border-t border-white px-3 py-3 text-center align-middle text-sm font-bold text-emerald-700 ${stripe}`}>{formatCurrency(order.grand_total)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="max-lg:static lg:sticky left-0 z-10 border-t border-gray-200 bg-gray-50 px-3 py-3 text-center align-middle text-sm font-bold text-gray-900" colSpan={3}>Total</td>
                  {products.map((product, productIndex) => {
                    const [headerClass, , , textClass] = productColor(productIndex)
                    return (
                      <td key={product.id} className={`border-t border-white px-1 py-3 text-center align-middle text-sm font-bold ${headerClass} ${textClass}`}>
                        {columnTotals[product.id] || '—'}
                      </td>
                    )
                  })}
                  <td className="max-lg:static lg:sticky right-[870px] z-10 w-[100px] border-l border-t border-gray-200 bg-gray-50 px-3 py-3 text-center align-middle text-sm font-bold text-orange-600">{ordersQty}</td>
                  <td className="max-lg:static lg:sticky right-[730px] z-10 w-[140px] border-l border-t border-gray-200 bg-gray-50 px-3 py-3" />
                  <td className="max-lg:static lg:sticky right-[590px] z-10 w-[140px] border-l border-t border-gray-200 bg-gray-50 px-3 py-3" />
                  <td className="max-lg:static lg:sticky right-[450px] z-10 w-[140px] whitespace-nowrap border-l border-t border-gray-200 bg-gray-50 px-3 py-3 text-center align-middle text-sm font-bold text-emerald-700">{formatCurrency(ordersAmount)}</td>
                  <td className="max-lg:static lg:sticky right-[310px] z-10 w-[140px] whitespace-nowrap border-l border-t border-gray-200 bg-gray-50 px-3 py-3 text-center align-middle text-sm font-bold text-rose-600">{formatCurrency(saleDiscount)}</td>
                  <td className="max-lg:static lg:sticky right-[180px] z-10 w-[130px] whitespace-nowrap border-l border-t border-gray-200 bg-gray-50 px-3 py-3 text-center align-middle text-sm font-bold text-sky-700">{formatCurrency(deliveryFee)}</td>
                  <td className="max-lg:static lg:sticky right-0 z-10 w-[180px] whitespace-nowrap border-l border-t border-gray-200 bg-gray-50 px-3 py-3 text-center align-middle text-sm font-bold text-emerald-700">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(exportCard)}
        onClose={() => setExportCard(null)}
        title={reportLanguage === 'km'
          ? (exportCard?.action === 'print' ? 'បោះពុម្ពរបាយការណ៍' : 'នាំចេញ Excel')
          : (exportCard?.action === 'print' ? 'Print report' : 'Export Excel')}
        titleStyle={reportLanguage === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.9 } : undefined}
        size="lg"
      >
        <div className="space-y-5 px-6 py-4" style={reportLanguage === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.9 } : undefined}>
          <div>
            <p className={`mb-2 font-semibold text-slate-500 ${reportLanguage === 'km' ? 'text-sm' : 'text-xs uppercase tracking-wide'}`}>{reportLanguage === 'km' ? 'ភាសា' : 'Language'}</p>
            <div className="flex w-fit items-center rounded-lg border border-violet-100 bg-violet-50 p-1">
              <button type="button" onClick={() => setReportLanguage('en')} className={`rounded-md px-3 py-2 text-sm font-semibold leading-none ${reportLanguage === 'en' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500'}`}>English</button>
              <button type="button" onClick={() => setReportLanguage('km')} className={`rounded-md px-3 py-2 text-[15px] ${reportLanguage === 'km' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600'}`} style={{ ...KHMER_TEXT_STYLE, fontWeight: 600, lineHeight: '36px' }}>ភាសាខ្មែរ</button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2.5 text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={includeSign} onChange={(event) => setIncludeSign(event.target.checked)} className="accent-purple-600" />
            {reportLanguage === 'km' ? 'បញ្ចូលហត្ថលេខា' : 'Include signature'}
          </label>
          {exportCard?.scope !== 'orders' && (
            <ColumnGroup
              title={reportLanguage === 'km' ? 'ជួរឈរសង្ខេប' : 'Summary columns'}
              columns={SUMMARY_COLUMNS}
              selected={summaryCols}
              onChange={setSummaryCols}
              language={reportLanguage}
              allLabel={reportLanguage === 'km' ? 'ជ្រើសទាំងអស់' : 'Select all'}
              clearLabel={reportLanguage === 'km' ? 'ដកចេញ' : 'Clear'}
            />
          )}
          {exportCard?.scope !== 'summary' && (
            <>
              <ColumnGroup
                title={reportLanguage === 'km' ? 'ជួរឈរលម្អិត' : 'Order columns'}
                columns={ORDER_COLUMNS}
                selected={orderCols}
                onChange={setOrderCols}
                language={reportLanguage}
                allLabel={reportLanguage === 'km' ? 'ជ្រើសទាំងអស់' : 'Select all'}
                clearLabel={reportLanguage === 'km' ? 'ដកចេញ' : 'Clear'}
              />
              <ColumnGroup
                title={reportLanguage === 'km' ? 'ផលិតផល' : 'Products'}
                columns={products.map((product) => ({ id: product.id, en: product.name, km: product.name }))}
                selected={pickedProducts}
                onChange={setPickedProducts}
                language={reportLanguage}
                allLabel={reportLanguage === 'km' ? 'ជ្រើសទាំងអស់' : 'Select all'}
                clearLabel={reportLanguage === 'km' ? 'ដកចេញ' : 'Clear'}
              />
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={() => setExportCard(null)} className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700" style={reportLanguage === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, lineHeight: 1.8 } : undefined}>{reportLanguage === 'km' ? 'បោះបង់' : 'Cancel'}</button>
          <button type="button" onClick={confirmExport} className="h-10 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700" style={reportLanguage === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, lineHeight: 1.8 } : undefined}>
            {exportCard?.action === 'print' ? (reportLanguage === 'km' ? 'បោះពុម្ព' : 'Print') : (reportLanguage === 'km' ? 'នាំចេញ' : 'Export')}
          </button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(openSet)} onClose={() => setOpenSet(null)} title={openSet?.name || 'Set'} size="lg">
        <div className="px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-500">Components in this set</p>
          {setDetailLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
          ) : setDetailError ? (
            <p className="py-8 text-center text-sm font-semibold text-gray-400">Could not load this set</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="w-14 px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(setDetail?.items ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm font-semibold text-gray-400">No components in this set</td>
                    </tr>
                  ) : setDetail.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-center text-sm font-bold text-black">{index + 1}</td>
                      <td className="px-4 py-3 text-left text-sm font-semibold text-black">{item.product_name}</td>
                      <td className="px-4 py-3 text-left text-sm font-semibold text-black">{item.product_code || '—'}</td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-orange-600">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
