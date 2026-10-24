import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSpreadsheet, Package, Printer, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { Modal } from '@/components/ui/Modal'
import { formatCurrency } from '@/utils/helpers'
import { KHMER_FONT_FAMILY, KHMER_TEXT_STYLE } from '@/utils/constants'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const PRODUCT_COLUMNS = [
  { id: 'no', en: 'No', km: 'ល.រ' },
  { id: 'product', en: 'Product', km: 'ផលិតផល' },
  { id: 'code', en: 'Code', km: 'កូដ' },
  { id: 'category', en: 'Category', km: 'ក្រុម' },
  { id: 'cost', en: 'Cost', km: 'ថ្លៃដើម' },
  { id: 'wholesale', en: 'Wholesale', km: 'តម្លៃដុំ' },
  { id: 'retail', en: 'Retail', km: 'តម្លៃលក់' },
  { id: 'rating', en: 'Rating', km: 'ការវាយតម្លៃ' },
  { id: 'tags', en: 'Tags', km: 'ស្លាក' },
]

function productTags(product, language) {
  return [
    product.is_best_seller && (language === 'km' ? 'លក់ដាច់' : 'Best'),
    product.is_new_arrival && (language === 'km' ? 'ថ្មី' : 'New'),
    product.is_featured && (language === 'km' ? 'ពិសេស' : 'Featured'),
  ].filter(Boolean).join(', ')
}

function signatureHtml() {
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

const cellStyle = {
  text: 'color:#000;',
  center: 'text-align:center;color:#000;',
  money: 'text-align:center;color:#000;font-weight:700;',
  foot: 'text-align:center;font-weight:700;background:#f5f3ff;color:#000;',
}
const td = (value, kind = 'text') => `<td style="${cellStyle[kind] || 'color:#000;'}">${value}</td>`
const th = (value) => `<th style="background:#ede9fe;color:#000;text-align:center;border:1px solid #000;">${value}</th>`

function moneySum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
}

function buildProductHtml(products, { excel = false, language = 'en', columns = PRODUCT_COLUMNS.map((column) => column.id), sign = false } = {}) {
  const word = (en, km) => (language === 'km' ? km : en)
  const picked = PRODUCT_COLUMNS.filter((column) => columns.includes(column.id))
  const headers = picked.map((column) => th(escapeHtml(word(column.en, column.km)))).join('')
  const rows = products.map((product, index) => {
    const cells = {
      no: td(index + 1, 'center'),
      product: td(escapeHtml(product.name)),
      code: td(escapeHtml(product.code), 'center'),
      category: td(escapeHtml(product.category_name || '—'), 'center'),
      cost: td(escapeHtml(formatCurrency(product.cost_price)), 'money'),
      wholesale: td(escapeHtml(formatCurrency(product.wholesale_price)), 'money'),
      retail: td(escapeHtml(formatCurrency(product.retail_price)), 'money'),
      rating: td(escapeHtml(product.rating ?? 0), 'center'),
      tags: td(escapeHtml(productTags(product, language) || '—'), 'center'),
    }
    return `<tr>${picked.map((column) => cells[column.id]).join('')}</tr>`
  }).join('')
  const footerValues = {
    cost: [formatCurrency(moneySum(products, 'cost_price')), 'money'],
    wholesale: [formatCurrency(moneySum(products, 'wholesale_price')), 'money'],
    retail: [formatCurrency(moneySum(products, 'retail_price')), 'money'],
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
  const typeSize = language === 'km' ? 14 : 11
  const line = language === 'km' ? 1.9 : 1.7
  const cellPad = language === 'km' ? '8px 8px' : '5px 6px'
  const khmerFont = `${KHMER_FONT_FAMILY}, Arial, sans-serif`
  const style = excel
    ? `body { font-family: ${khmerFont}; font-weight: ${language === 'km' ? 600 : 400}; font-synthesis: none; line-height: ${line}; color: #000; padding: 24px; }
    h1 { margin: 0 0 4px; font-size: ${language === 'km' ? 24 : 22}px; line-height: 1.8; color: #000; }
    p { margin: 0 0 14px; color: #000; font-size: ${language === 'km' ? 14 : 12}px; line-height: 1.8; }
    table { border-collapse: collapse; width: 100%; font-size: ${language === 'km' ? 14 : 12}px; }
    th, td { border: 1px solid #000; padding: ${cellPad}; color: #000; line-height: ${line}; }
    th { background: #ede9fe; color: #000; font-weight: 700; }
    tfoot td { font-weight: 700; background: #f5f3ff; color: #000; }`
    : `html, body { margin: 0; padding: 0; }
    body { font-family: ${khmerFont}; font-weight: ${language === 'km' ? 600 : 400}; font-synthesis: none; line-height: ${line}; color: #000; }
    h1 { margin: 0 0 2px; font-size: ${language === 'km' ? 22 : 18}px; line-height: 1.8; color: #000; }
    p { margin: 0 0 8px; font-size: ${language === 'km' ? 14 : 12}px; line-height: 1.8; color: #000; }
    table { width: 100%; border-collapse: collapse; font-size: ${typeSize}px; margin: 0 0 10px; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #000; padding: ${cellPad}; vertical-align: middle; line-height: ${line}; color: #000; }
    tbody tr:nth-child(even) td { background: #faf5ff; }
    tfoot td { font-weight: 700; background: #f5f3ff; color: #000; }`
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(word('Product Report', 'របាយការណ៍ផលិតផល'))}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@400;600;700&display=swap">
  <style>${style}</style>
</head>
<body>
  <h1>${escapeHtml(word('Product Report', 'របាយការណ៍ផលិតផល'))}</h1>
  <p>${products.length} ${escapeHtml(word('products', 'ផលិតផល'))}</p>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>${footer}</tr></tfoot>
  </table>
  ${sign ? signatureHtml() : ''}
</body>
</html>`
}

function exportProducts(products, options = {}) {
  const language = options.language || 'en'
  if (!products.length) {
    toast.error(language === 'km' ? 'គ្មានទិន្នន័យសម្រាប់នាំចេញ' : 'No report data to export')
    return
  }
  const url = URL.createObjectURL(new Blob([`\ufeff${buildProductHtml(products, { ...options, excel: true })}`], { type: 'application/vnd.ms-excel;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `product-report-${new Date().toISOString().slice(0, 10)}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  toast.success(language === 'km' ? 'បាននាំចេញទៅ Excel' : 'Exported to Excel')
}

function printProducts(products, options = {}) {
  const language = options.language || 'en'
  if (!products.length) {
    toast.error(language === 'km' ? 'គ្មានទិន្នន័យសម្រាប់បោះពុម្ព' : 'No report data to print')
    return
  }
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    toast.error(language === 'km' ? 'សូមអនុញ្ញាតផ្ទាំងលេចឡើង ដើម្បីបោះពុម្ព' : 'Popup blocked. Allow popups to print this report.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(buildProductHtml(products, options))
  printWindow.document.close()
  printWindow.focus()
  const startPrint = () => window.setTimeout(() => printWindow.print(), 300)
  if (printWindow.document.fonts?.ready) printWindow.document.fonts.ready.then(startPrint)
  else startPrint()
}

function ColumnGroup({ title, columns, selected, onChange, language, clearLabel, allLabel }) {
  const allOn = columns.length > 0 && columns.every((column) => selected.includes(column.id))
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-gray-900" style={language === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.9 } : undefined}>{title}</p>
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

function ReportActions({ onExcel, onPrint, disabled }) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
      <button type="button" onClick={onExcel} disabled={disabled} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm">
        <FileSpreadsheet size={15} />
        Export Excel
      </button>
      <button type="button" onClick={onPrint} disabled={disabled} className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg bg-purple-600 px-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm">
        <Printer size={15} />
        Print
      </button>
    </div>
  )
}

export default function ProductReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['products-report'],
    queryFn: () => productsApi.products.list({ ordering: '-review_count', is_active: true, page_size: 1000 }),
    select: (r) => r.data?.results ?? [],
  })

  const products = data ?? []
  const [exportCard, setExportCard] = useState(null)
  const [reportLanguage, setReportLanguage] = useState('en')
  const [includeSign, setIncludeSign] = useState(false)
  const [pickedCols, setPickedCols] = useState(PRODUCT_COLUMNS.map((column) => column.id))
  const totalCost = moneySum(products, 'cost_price')
  const totalWholesale = moneySum(products, 'wholesale_price')
  const totalRetail = moneySum(products, 'retail_price')

  return (
    <div className="space-y-4">
      <div className="page-header mb-0 w-full">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Product Report</h1>
          <p className="mt-0.5 text-sm text-gray-500">Product performance and catalogue overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Products', value: products.length, color: 'bg-purple-100 text-purple-600', valueColor: 'text-purple-700' },
          { label: 'Featured', value: products.filter(p => p.is_featured).length, color: 'bg-pink-100 text-pink-600', valueColor: 'text-pink-600' },
          { label: 'New Arrivals', value: products.filter(p => p.is_new_arrival).length, color: 'bg-sky-100 text-sky-600', valueColor: 'text-sky-700' },
          { label: 'Best Sellers', value: products.filter(p => p.is_best_seller).length, color: 'bg-green-100 text-green-600', valueColor: 'text-green-700' },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">{k.label}</p>
                <p className={`mt-1 text-2xl font-bold ${k.valueColor}`}>{k.value}</p>
              </div>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${k.color}`}>
                <Package size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto border-b border-gray-100 px-3 py-2">
          <h2 className="shrink-0 text-sm font-semibold text-gray-900">All Products</h2>
          <div className="ml-auto shrink-0">
            <ReportActions onExcel={() => setExportCard('excel')} onPrint={() => setExportCard('print')} disabled={isLoading || products.length === 0} />
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-max min-w-full">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-14 px-4 py-3 text-center">No</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Code</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Category</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Cost</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Wholesale</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Retail</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">Rating</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p, index) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center align-middle text-sm font-bold text-black">{index + 1}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-left align-middle text-sm font-semibold text-black">{p.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold text-black">{p.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm font-semibold text-indigo-700">{p.category_name ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-semibold text-black">{formatCurrency(p.cost_price)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-bold text-purple-700">{formatCurrency(p.wholesale_price)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center align-middle text-sm font-bold text-emerald-700">{formatCurrency(p.retail_price)}</td>
                    <td className="px-4 py-3 text-center align-middle">
                      <div className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-black">
                        <Star size={14} className="text-yellow-500" fill="currentColor" />
                        <span>{p.rating ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left align-middle">
                      <div className="flex flex-wrap gap-1">
                        {p.is_best_seller && <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-semibold text-green-700">Best</span>}
                        {p.is_new_arrival && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sm font-semibold text-sky-700">New</span>}
                        {p.is_featured && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-sm font-semibold text-purple-700">Featured</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {products.length > 0 && (
                <tfoot>
                  <tr>
                    <td className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-right text-sm font-bold text-gray-900" colSpan={4}>Total</td>
                    <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-black">{formatCurrency(totalCost)}</td>
                    <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-purple-700">{formatCurrency(totalWholesale)}</td>
                    <td className="whitespace-nowrap border-t border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-bold text-emerald-700">{formatCurrency(totalRetail)}</td>
                    <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                    <td className="border-t border-gray-200 bg-gray-50 px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(exportCard)}
        onClose={() => setExportCard(null)}
        title={reportLanguage === 'km'
          ? (exportCard === 'print' ? 'បោះពុម្ពរបាយការណ៍' : 'នាំចេញ Excel')
          : (exportCard === 'print' ? 'Print report' : 'Export Excel')}
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
          <ColumnGroup
            title={reportLanguage === 'km' ? 'ជួរឈរ' : 'Columns'}
            columns={PRODUCT_COLUMNS}
            selected={pickedCols}
            onChange={setPickedCols}
            language={reportLanguage}
            allLabel={reportLanguage === 'km' ? 'ជ្រើសទាំងអស់' : 'Select all'}
            clearLabel={reportLanguage === 'km' ? 'ដកចេញ' : 'Clear'}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button type="button" onClick={() => setExportCard(null)} className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-semibold text-gray-700" style={reportLanguage === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, lineHeight: 1.8 } : undefined}>{reportLanguage === 'km' ? 'បោះបង់' : 'Cancel'}</button>
          <button
            type="button"
            onClick={() => {
              if (pickedCols.length === 0) {
                toast.error(reportLanguage === 'km' ? 'សូមជ្រើសជួរឈរ' : 'Choose at least one column')
                return
              }
              const options = { language: reportLanguage, columns: pickedCols, sign: includeSign }
              const action = exportCard
              setExportCard(null)
              if (action === 'print') printProducts(products, options)
              else exportProducts(products, options)
            }}
            className="h-10 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700"
            style={reportLanguage === 'km' ? { ...KHMER_TEXT_STYLE, fontWeight: 600, lineHeight: 1.8 } : undefined}
          >
            {exportCard === 'print' ? (reportLanguage === 'km' ? 'បោះពុម្ព' : 'Print') : (reportLanguage === 'km' ? 'នាំចេញ' : 'Export')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
