import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Printer, X } from 'lucide-react'
import SearchFilter from '@/components/shared/SearchFilter'
import { ordersApi } from '@/api/orders'
import { EmptyState, LoadingRows, Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table'
import { KHMER_FONT_FAMILY } from '@/utils/constants'

const PAGE_SIZE = 100

function formatPrintedAt(value) {
  if (!value) return '-'
  try {
    return format(parseISO(value), 'yyyy-MM-dd HH:mm:ss')
  } catch {
    return value
  }
}

function sessionProducts(session) {
  return session?.products || []
}

function sessionQty(session) {
  return sessionProducts(session).reduce((sum, product) => sum + Number(product.quantity || 0), 0)
}

function SessionInfo({ session }) {
  return (
    <div className="mb-3 rounded-xl bg-gray-50 px-4 py-3 text-center" style={{ fontFamily: KHMER_FONT_FAMILY }}>
      <p className="text-sm font-bold text-gray-900">Product Control / គ្រប់គ្រងទំនិញ</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm font-bold text-gray-900"><span>កាលបរិច្ឆេទ</span><span>{formatPrintedAt(session.printed_at)}</span></div>
      <div className="mt-1 flex items-center justify-between gap-2 text-sm font-bold text-gray-900"><span>អ្នកគិតលុយ</span><span>{session.cashier || '-'}</span></div>
    </div>
  )
}

function ProductTable({ session }) {
  const products = sessionProducts(session)

  return (
    <div style={{ fontFamily: KHMER_FONT_FAMILY }}>
      <SessionInfo session={session} />
      <div className="overflow-hidden rounded-xl border border-gray-100">
      <Table>
        <Thead>
          <tr>
            <Th className="w-16 text-center">ល.រ</Th>
            <Th className="text-center">ទំនិញ</Th>
            <Th className="w-20 text-center">ចំនួន</Th>
          </tr>
        </Thead>
        <Tbody>
          {products.map((product, index) => (
            <Tr key={`${product.name}-${index}`}>
              <Td className="text-center"><span className="text-sm font-semibold text-gray-400">{index + 1}</span></Td>
              <Td className="text-center"><span className="text-sm font-semibold text-gray-900">{product.name}</span></Td>
              <Td className="text-center"><span className="text-sm font-bold text-gray-900">{product.quantity}</span></Td>
            </Tr>
          ))}
          <Tr>
            <Td />
            <Td className="text-center"><span className="text-sm font-bold text-gray-500">សរុប</span></Td>
            <Td className="text-center"><span className="text-sm font-bold text-gray-900">{sessionQty(session)}</span></Td>
          </Tr>
        </Tbody>
      </Table>
      </div>
    </div>
  )
}

function ProductSheet({ session }) {
  const products = sessionProducts(session)

  return (
    <div className="session-slip mx-auto bg-white text-center text-black" style={{ fontFamily: KHMER_FONT_FAMILY, width: '80mm' }}>
      <p className="text-center text-sm">Product Control / គ្រប់គ្រងទំនិញ</p>
      <div className="mt-1 border-b border-black pb-1 text-xs font-bold leading-4"><div className="flex items-center justify-between gap-2"><span>កាលបរិច្ឆេទ</span><span>{formatPrintedAt(session.printed_at)}</span></div><div className="mt-0.5 flex items-center justify-between gap-2"><span>អ្នកគិតលុយ</span><span>{session.cashier || '-'}</span></div></div>
      <table className="mt-1 w-full border-collapse text-center text-xs leading-4">
        <thead>
          <tr>
            <th className="w-8 border border-black px-1 py-0.5 text-center">ល.រ</th>
            <th className="border border-black px-1 py-0.5 text-center">ទំនិញ</th>
            <th className="w-10 border border-black px-1 py-0.5 text-center">ចំនួន</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, index) => (
            <tr key={`${product.name}-${index}`}>
              <td className="border border-black px-1 py-0.5 text-center">{index + 1}</td>
              <td className="border border-black px-1 py-0.5 text-center">{product.name}</td>
              <td className="border border-black px-1 py-0.5 text-center">{product.quantity}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-black px-1 py-0.5 text-center" colSpan={2}>សរុប</td>
            <td className="border border-black px-1 py-0.5 text-center">{sessionQty(session)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function PrintSessions() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [activeSession, setActiveSession] = useState(null)
  const [printJob, setPrintJob] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['print-sessions', search, page],
    queryFn: () => ordersApi.orders.printSessions({
      search: search || undefined,
      page,
      page_size: PAGE_SIZE,
    }).then((response) => response.data),
  })

  const sessions = data?.results || []
  const total = data?.count || 0
  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  const openProducts = (session) => {
    setActiveSession(session)
  }

  const printProducts = (session) => {
    setPrintJob({ session, at: Date.now() })
  }

  useEffect(() => {
    if (!printJob) return undefined
    const timer = setTimeout(() => window.print(), 80)
    return () => clearTimeout(timer)
  }, [printJob])

  return (
    <>
      <div className="no-print animate-fade-in space-y-4">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden lg:block">
              <h1 className="text-xl font-bold text-gray-900">Print Session</h1>
              <p className="mt-1 text-xs text-gray-400">Each print batch controls the products that were printed together.</p>
            </div>
            <span className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600">
              {total} session(s)
            </span>
          </div>
          <div className="p-4">
            <SearchFilter
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Search cashier, order, or product..."
            />
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <Table className="min-w-[760px]">
                <Thead>
                  <tr>
                    <Th>No</Th>
                    <Th>Printed At</Th>
                    <Th>Cashier</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Items</Th>
                    <Th>Actions</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {isLoading && <LoadingRows cols={6} rows={6} />}
                  {!isLoading && sessions.map((session, index) => (
                    <Tr key={session.id}>
                      <Td>
                        <span className="text-sm font-semibold text-gray-500">{(page - 1) * PAGE_SIZE + index + 1}</span>
                      </Td>
                      <Td>
                        <span className="whitespace-pre-line text-sm text-gray-700">{formatPrintedAt(session.printed_at)}</span>
                      </Td>
                      <Td><span className="text-sm font-medium text-gray-900">{session.cashier || '-'}</span></Td>
                      <Td className="text-right"><span className="text-base font-bold text-gray-900">{session.orders}</span></Td>
                      <Td className="text-right"><span className="text-base font-bold text-gray-900">{session.items}</span></Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openProducts(session)}
                            className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Products
                          </button>
                          <button
                            type="button"
                            onClick={() => printProducts(session)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-purple-600 hover:bg-purple-50"
                          >
                            <Printer size={14} />
                            Print
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                  {!isLoading && sessions.length === 0 && (
                    <tr><td colSpan={6}><EmptyState message="No print sessions yet" /></td></tr>
                  )}
                </Tbody>
              </Table>
            </div>
            {pageCount > 1 && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">{page} / {pageCount}</span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {activeSession && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm"
            onClick={() => setActiveSession(null)}
          >
            <div
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Products</h3>
                  <p className="mt-1 text-xs font-semibold text-gray-500">{activeSession.orders} orders · {activeSession.items} items</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSession(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                  aria-label="Close products"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-auto p-4">
                <ProductTable session={activeSession} />
              </div>
              <div className="flex justify-end border-t border-gray-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => printProducts(activeSession)}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  <Printer size={15} />
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {printJob && (
        <div className="print-only print-document-root">
          <div className="mx-auto max-w-3xl p-2">
            <ProductSheet session={printJob.session} />
          </div>
        </div>
      )}
    </>
  )
}
