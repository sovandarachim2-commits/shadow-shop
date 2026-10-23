import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Pencil, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { inventoryApi } from '@/api/inventory'

function StorageForm({ storage, onSave, onClose, isSaving }) {
  const [form, setForm] = useState({
    name: storage?.name || '',
    code: storage?.code || '',
    address: storage?.address || '',
    capacity: storage?.capacity ?? '',
    is_active: storage?.is_active ?? true,
    is_default: storage?.is_default ?? false,
  })
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return toast.error('Storage name is required')
    if (!form.code.trim()) return toast.error('Storage code is required')
    const capacity = form.capacity === '' ? 0 : Number(form.capacity)
    if (!Number.isInteger(capacity) || capacity < 0) return toast.error('Capacity must be 0 or more')
    onSave({
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address.trim(),
      capacity,
      is_default: form.is_default,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-gray-600">Name *</span>
        <input className="input-field" value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="Main storage" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-gray-600">Code *</span>
        <input
          className="input-field font-mono uppercase"
          value={form.code}
          onChange={(event) => set('code', event.target.value)}
          placeholder="ST01"
          disabled={Boolean(storage)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-gray-600">Capacity</span>
        <input
          type="number"
          min="0"
          step="1"
          className="input-field"
          value={form.capacity}
          onChange={(event) => set('capacity', event.target.value)}
          placeholder="0 means no limit"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-gray-600">Address</span>
        <textarea
          className="input-field resize-none"
          rows={3}
          value={form.address}
          onChange={(event) => set('address', event.target.value)}
          placeholder="Storage address"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(event) => set('is_active', event.target.checked)}
          className="h-4 w-4 accent-purple-600"
        />
        Active
      </label>
      <label className="flex items-start gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={form.is_default}
          onChange={(event) => set('is_default', event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-purple-600"
        />
        <span>Default storage for print. Stock here goes down when an order is printed.</span>
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSaving} className="btn-primary disabled:opacity-60">
          {isSaving ? 'Saving...' : storage ? 'Update storage' : 'Create storage'}
        </button>
      </div>
    </form>
  )
}

export default function InventoryStorage() {
  const qc = useQueryClient()
  const [confirm, ConfirmDialog] = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: storages = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryApi.warehouses.list().then((response) => response.data?.results ?? response.data ?? []),
  })

  const saveMutation = useMutation({
    mutationFn: (payload) => (
      editing
        ? inventoryApi.warehouses.update(editing.id, payload)
        : inventoryApi.warehouses.create(payload)
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      setOpen(false)
      setEditing(null)
      toast.success(editing ? 'Storage updated' : 'Storage created')
    },
    onError: (error) => {
      const data = error?.response?.data
      toast.error(data?.code?.[0] || data?.name?.[0] || data?.detail || 'Could not save storage')
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id) => inventoryApi.warehouses.update(id, { is_default: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Default print storage updated')
    },
    onError: () => toast.error('Could not set the default storage'),
  })

  const deleteMutation = useMutation({
    mutationFn: inventoryApi.warehouses.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Storage deleted')
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Could not delete storage'),
  })

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }

  const handleDelete = async (storage) => {
    const ok = await confirm(`Delete ${storage.name}?`, 'Transfers that use this storage will keep their history.')
    if (ok) deleteMutation.mutate(storage.id)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory Storage"
        subtitle="One storage can be the print default. Printing an order reduces stock there."
        actions={(
          <button type="button" onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Storage
          </button>
        )}
      />

      <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Storage</Th>
              <Th>Code</Th>
              <Th>Address</Th>
              <Th>Amount of Product</Th>
              <Th>Total Inside</Th>
              <Th>Capacity</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading && <LoadingRows cols={9} />}
            {!isLoading && storages.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState message="No storage locations yet" icon={Archive} />
                  <div className="pb-8 text-center">
                    <button type="button" onClick={openCreate} className="btn-primary inline-flex">
                      <Plus size={15} /> Add Storage
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && storages.map((storage, index) => (
              <Tr key={storage.id}>
                <Td><span className="text-sm text-gray-500">{index + 1}</span></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{storage.name}</span>
                    {storage.is_default && <Badge variant="primary">Print default</Badge>}
                  </div>
                </Td>
                <Td><span className="font-mono text-xs text-gray-500">{storage.code}</span></Td>
                <Td><span className="text-sm text-gray-500">{storage.address || '—'}</span></Td>
                <Td><span className="font-medium text-gray-900">{storage.product_count || 0}</span></Td>
                <Td>
                  <span className={`font-medium ${storage.capacity > 0 && (storage.total_quantity || 0) > storage.capacity ? 'text-red-500' : 'text-gray-900'}`}>
                    {storage.total_quantity || 0}
                  </span>
                </Td>
                <Td><span className="text-gray-600">{storage.capacity > 0 ? storage.capacity : 'No limit'}</span></Td>
                <Td>
                  <Badge variant={storage.is_active === false ? 'default' : 'success'}>
                    {storage.is_active === false ? 'Inactive' : 'Active'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {!storage.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefaultMutation.mutate(storage.id)}
                        disabled={setDefaultMutation.isPending}
                        className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 disabled:opacity-60"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => { setEditing(storage); setOpen(true) }}
                      className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(storage)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>

      <Modal
        isOpen={open}
        onClose={() => { setOpen(false); setEditing(null) }}
        title={editing ? 'Edit Storage' : 'New Storage'}
        size="sm"
      >
        <StorageForm
          key={editing?.id || 'new'}
          storage={editing}
          onSave={(payload) => saveMutation.mutate(payload)}
          onClose={() => { setOpen(false); setEditing(null) }}
          isSaving={saveMutation.isPending}
        />
      </Modal>
      {ConfirmDialog}
    </div>
  )
}
