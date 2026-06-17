import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Package, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ordersApi } from '@/api/orders'
import { formatCurrency, formatDateTime } from '@/utils/helpers'
import client from '@/api/client'

const DELIVERY_STATUS_COLORS = {
  ready:     'bg-blue-50 text-blue-700',
  shipped:   'bg-orange-50 text-orange-700',
  delivered: 'bg-green-50 text-green-700',
  returned:  'bg-red-50 text-red-700',
}

function AssignForm({ order, companies, onSave, onClose }) {
  const [form, setForm] = useState({
    company: '',
    tracking_number: '',
    fee: order?.delivery_fee || 0,
    notes: '',
  })
  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  return (
    <div className="p-6 space-y-4">
      <div className="bg-blue-50 rounded-xl p-4">
        <p className="font-semibold text-sm">#{order?.order_number}</p>
        <p className="text-xs text-gray-500">{order?.customer_name} • {formatCurrency(order?.grand_total)}</p>
      </div>
      <div>
        <label className="label">Delivery Company</label>
        <select className="select-field" value={form.company} onChange={(e) => f('company', e.target.value)}>
          <option value="">Select Company</option>
          {(companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tracking Number</label>
        <input className="input-field" value={form.tracking_number} onChange={(e) => f('tracking_number', e.target.value)} placeholder="Enter tracking number" />
      </div>
      <div>
        <label className="label">Delivery Fee ($)</label>
        <input type="number" className="input-field" value={form.fee} onChange={(e) => f('fee', e.target.value)} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} className="btn-primary flex-1 justify-center">Assign Delivery</button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  )
}

function EditForm({ delivery, companies, onSave, onClose }) {
  const [form, setForm] = useState({
    company: delivery?.company ?? '',
    tracking_number: delivery?.tracking_number ?? '',
    fee: delivery?.fee ?? 0,
    notes: delivery?.notes ?? '',
  })
  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  return (
    <div className="p-6 space-y-4">
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="font-semibold text-sm">#{delivery?.order_number}</p>
        <p className="text-xs text-gray-500">{delivery?.recipient_name}</p>
      </div>
      <div>
        <label className="label">Delivery Company</label>
        <select className="select-field" value={form.company} onChange={(e) => f('company', e.target.value)}>
          <option value="">Select Company</option>
          {(companies || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Tracking Number</label>
        <input className="input-field" value={form.tracking_number} onChange={(e) => f('tracking_number', e.target.value)} placeholder="Enter tracking number" />
      </div>
      <div>
        <label className="label">Delivery Fee ($)</label>
        <input type="number" className="input-field" value={form.fee} onChange={(e) => f('fee', e.target.value)} />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="input-field resize-none" rows={2} value={form.notes} onChange={(e) => f('notes', e.target.value)} />
      </div>
      <div className="flex gap-3">
        <button onClick={() => onSave(form)} className="btn-primary flex-1 justify-center">Save Changes</button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  )
}

export default function Delivery() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [editDelivery, setEditDelivery] = useState(null)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const { data: packedOrders } = useQuery({
    queryKey: ['packed-orders', search],
    queryFn: () => ordersApi.orders.list({ status: 'packed', search, page_size: 30 }).then((r) => r.data.results),
  })

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries', search, status],
    queryFn: () => client.get('/delivery/list/', { params: { search, status: status || undefined, page_size: 30 } }).then((r) => r.data.results),
  })

  const { data: companies } = useQuery({
    queryKey: ['delivery-companies'],
    queryFn: () => client.get('/delivery/companies/').then((r) => r.data.results || r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => client.post('/delivery/list/', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries'])
      queryClient.invalidateQueries(['packed-orders'])
      setShowAssignForm(false)
      toast.success('Delivery assigned!')
    },
    onError: () => toast.error('Failed to assign delivery'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.patch(`/delivery/list/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['deliveries'])
      setShowEditForm(false)
      toast.success('Delivery updated!')
    },
    onError: () => toast.error('Failed to update delivery'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => client.post(`/delivery/list/${id}/update_status/`, { status }),
    onSuccess: () => { queryClient.invalidateQueries(['deliveries']); toast.success('Status updated!') },
    onError: () => toast.error('Update failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/delivery/list/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries(['deliveries']); toast.success('Delivery deleted') },
    onError: () => toast.error('Failed to delete delivery'),
  })

  const handleAssign = (form) => {
    if (!selectedOrder) return
    createMutation.mutate({
      order: selectedOrder.id,
      recipient_name: selectedOrder.customer_name,
      recipient_phone: selectedOrder.customer_phone,
      delivery_address: '',
      province: 'phnom_penh',
      ...form,
    })
  }

  const handleEdit = (form) => {
    if (!editDelivery) return
    updateMutation.mutate({ id: editDelivery.id, data: form })
  }

  const handleDelete = (d) => {
    if (!window.confirm(`Delete delivery for order #${d.order_number}?`)) return
    deleteMutation.mutate(d.id)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Delivery Management" breadcrumbs={[{ label: 'Operations' }, { label: 'Delivery' }]} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ready to Ship */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="section-title">Ready to Ship ({(packedOrders || []).length})</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {(packedOrders || []).map((order) => (
              <div key={order.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Package size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-semibold text-sm text-purple-700">#{order.order_number}</p>
                  <p className="text-xs text-gray-500 truncate">{order.customer_name}</p>
                  <p className="text-xs font-semibold text-gray-900">{formatCurrency(order.grand_total)}</p>
                </div>
                <button onClick={() => { setSelectedOrder(order); setShowAssignForm(true) }}
                  className="btn-primary py-1.5 px-3 text-xs shrink-0">
                  <Truck size={13} /> Assign
                </button>
              </div>
            ))}
            {(!packedOrders || packedOrders.length === 0) && (
              <div className="py-10 text-center text-gray-400 text-sm">No orders ready to ship</div>
            )}
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <SearchFilter value={search} onChange={setSearch} placeholder="Search delivery...">
              <select className="select-field w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="ready">Ready</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
              </select>
            </SearchFilter>
          </div>
          <Table>
            <Thead>
              <tr>
                <Th>Order #</Th>
                <Th>Customer</Th>
                <Th>Company</Th>
                <Th>Tracking</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {isLoading && <LoadingRows cols={6} />}
              {!isLoading && (deliveries || []).map((d) => (
                <Tr key={d.id}>
                  <Td><span className="font-mono text-sm font-semibold text-purple-700">#{d.order_number}</span></Td>
                  <Td>
                    <p className="text-sm font-medium">{d.recipient_name}</p>
                    <p className="text-xs text-gray-400">{d.recipient_phone}</p>
                  </Td>
                  <Td><span className="text-sm">{d.company_name || '—'}</span></Td>
                  <Td>
                    {d.tracking_number
                      ? <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{d.tracking_number}</span>
                      : <span className="text-gray-300">—</span>}
                  </Td>
                  <Td>
                    <select
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
                      value={d.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: d.id, status: e.target.value })}
                    >
                      <option value="ready">Ready</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="returned">Returned</option>
                    </select>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditDelivery(d); setShowEditForm(true) }}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
              {!isLoading && (!deliveries || deliveries.length === 0) && (
                <tr><td colSpan={6}><EmptyState message="No deliveries found" icon={Truck} /></td></tr>
              )}
            </Tbody>
          </Table>
        </div>
      </div>

      <Modal isOpen={showAssignForm} onClose={() => setShowAssignForm(false)} title="Assign Delivery" size="sm">
        <AssignForm order={selectedOrder} companies={companies} onSave={handleAssign} onClose={() => setShowAssignForm(false)} />
      </Modal>

      <Modal isOpen={showEditForm} onClose={() => setShowEditForm(false)} title="Edit Delivery" size="sm">
        <EditForm delivery={editDelivery} companies={companies} onSave={handleEdit} onClose={() => setShowEditForm(false)} />
      </Modal>
    </div>
  )
}
