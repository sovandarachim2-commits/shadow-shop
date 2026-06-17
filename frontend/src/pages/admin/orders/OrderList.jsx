import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, Filter, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Badge, OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { ordersApi } from '@/api/orders'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'new', label: 'New' },
  { value: 'printed', label: 'Printed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'packed', label: 'Packed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function OrderList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', search, status, paymentStatus, page],
    queryFn: () => ordersApi.orders.list({
      search,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      page,
      page_size: 20,
    }).then((r) => r.data),
  })

  const orders = data?.results || []
  const total = data?.count || 0

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Orders"
        subtitle={`${total} total orders`}
        breadcrumbs={[{ label: 'Sales' }, { label: 'Orders' }]}
        actions={
          <Link to="/admin/orders/new" className="btn-primary">
            <Plus size={16} /> New Order
          </Link>
        }
      />

      <div className="bg-white rounded-2xl shadow-card border border-gray-100">
        {/* Filters */}
        <div className="px-6 py-4 border-b border-gray-100">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search orders, customers...">
            <select className="select-field w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="select-field w-36" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All Payment</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <button onClick={() => refetch()} className="btn-secondary py-2">
              <RefreshCw size={15} />
            </button>
          </SearchFilter>
        </div>

        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Order Code</Th>
              <Th>Customer Phone</Th>
              <Th>Seller</Th>
              <Th>Print Status</Th>
              <Th>Amount</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={10} />}
            {!isLoading && orders.map((order, index) => (
              <Tr key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)}>
                <Td><span className="text-sm font-semibold text-gray-500">{(page - 1) * 20 + index + 1}</span></Td>
                <Td>
                  <span className="font-mono font-semibold text-purple-700 text-sm">#{order.order_number}</span>
                  {order.is_draft && <span className="ml-2 text-xs text-gray-400">(Draft)</span>}
                </Td>
                <Td>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{order.customer_phone}</p>
                    <p className="text-xs text-gray-400">{order.customer_name}</p>
                  </div>
                </Td>
                <Td><span className="text-sm">{order.seller_name}</span></Td>
                <Td>
                  {order.printed_at || order.status === 'printed' ? (
                    <Badge variant="indigo" dot>Printed</Badge>
                  ) : (
                    <Badge variant="warning" dot>Unprinted</Badge>
                  )}
                </Td>
                <Td><span className="font-semibold">{formatCurrency(order.grand_total)}</span></Td>
                <Td><PaymentStatusBadge status={order.payment_status} /></Td>
                <Td><OrderStatusBadge status={order.status} /></Td>
                <Td><span className="text-xs text-gray-500">{formatDateTime(order.created_at)}</span></Td>
                <Td>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/orders/${order.id}`) }}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-purple-600 transition-colors">
                    <Eye size={15} />
                  </button>
                </Td>
              </Tr>
            ))}
            {!isLoading && orders.length === 0 && (
              <tr><td colSpan={10}><EmptyState message="No orders found" icon={Filter} /></td></tr>
            )}
          </Tbody>
        </Table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Showing {orders.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 text-sm disabled:opacity-50">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={orders.length < 20} className="btn-secondary py-1.5 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
