import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Send, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { deliveryApi } from '@/api/delivery'

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function ConfigForm({ config, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name: config?.name || '',
    description: config?.description || '',
    telegram_group: config?.telegram_group || '',
    telegram_topic: config?.telegram_topic ?? '',
    telegram_enabled: config?.telegram_enabled ?? false,
    is_active: config?.is_active ?? true,
  })
  const f = (k, v) => setForm((s) => ({ ...s, [k]: v }))

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <label className="label">Name *</label>
        <input className="input-field" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="e.g. J&T Express" />
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input-field" value={form.description} onChange={(e) => f('description', e.target.value)} placeholder="Optional description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Telegram Group ID</label>
          <input className="input-field" value={form.telegram_group} onChange={(e) => f('telegram_group', e.target.value)} placeholder="-1001234567890" />
        </div>
        <div>
          <label className="label">Telegram Topic ID</label>
          <input type="number" className="input-field" value={form.telegram_topic} onChange={(e) => f('telegram_topic', e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="flex gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.telegram_enabled} onChange={(e) => f('telegram_enabled', e.target.checked)} className="h-4 w-4 accent-blue-500" />
          <span className="text-sm font-medium text-gray-700">Telegram Enabled</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => f('is_active', e.target.checked)} className="h-4 w-4 accent-blue-500" />
          <span className="text-sm font-medium text-gray-700">Active</span>
        </label>
      </div>
      <div className="flex gap-3 border-t border-gray-100 pt-2">
        <button onClick={() => onSave(form)} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
          {saving ? 'Saving...' : config ? 'Update' : 'Add Delivery By'}
        </button>
        <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
      </div>
    </div>
  )
}

export default function DeliveryByConfig() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [testingId, setTestingId] = useState(null)

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['delivery-by-config'],
    queryFn: () => deliveryApi.byConfig.list().then((r) => r.data?.results ?? r.data ?? []),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['delivery-by-config'] })

  const handleSave = async (form) => {
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      const data = {
        ...form,
        telegram_topic: form.telegram_topic ? parseInt(form.telegram_topic) : null,
      }
      if (editItem) {
        await deliveryApi.byConfig.update(editItem.id, data)
        toast.success('Updated!')
      } else {
        await deliveryApi.byConfig.create(data)
        toast.success('Added!')
      }
      invalidate()
      setShowModal(false)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return
    try {
      await deliveryApi.byConfig.delete(item.id)
      invalidate()
      toast.success('Deleted!')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleToggleTelegram = async (item) => {
    try {
      await deliveryApi.byConfig.toggleTelegram(item.id)
      invalidate()
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleToggleStatus = async (item) => {
    try {
      await deliveryApi.byConfig.toggleStatus(item.id)
      invalidate()
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleTestBot = async (item) => {
    setTestingId(item.id)
    try {
      await deliveryApi.byConfig.testBot(item.id)
      toast.success('Test message sent!')
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to send test')
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Out Package Delivery By Config"
        subtitle="Manage delivery options shown in Out Package dropdown."
        breadcrumbs={[{ label: 'Customer Scanner' }, { label: 'Delivery By Config' }]}
        actions={
          <button onClick={() => { setEditItem(null); setShowModal(true) }} className="btn-primary bg-green-600 hover:bg-green-700">
            <Plus size={16} /> Add Delivery By
          </button>
        }
      />

      <div className="form-card mt-6 overflow-x-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : configs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No delivery configs yet</p>
            <button onClick={() => { setEditItem(null); setShowModal(true) }} className="btn-primary mx-auto mt-4 bg-green-600 hover:bg-green-700">
              <Plus size={15} /> Add First Delivery By
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">No</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Telegram</th>
                <th className="px-4 py-3">Telegram Group</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {configs.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500">{item.description || ''}</td>
                  <td className="px-4 py-3">
                    <Toggle checked={item.telegram_enabled} onChange={() => handleToggleTelegram(item)} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {item.telegram_group ? (
                      <div>
                        <p>{item.telegram_group}</p>
                        {item.telegram_topic && <p className="text-xs text-gray-400">Topic: {item.telegram_topic}</p>}
                      </div>
                    ) : (
                      <span className="text-gray-300">Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={item.is_active} onChange={() => handleToggleStatus(item)} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(item.updated_at).toLocaleString('sv').replace('T', ' ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTestBot(item)}
                        disabled={testingId === item.id}
                        className="flex items-center gap-1 rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
                      >
                        <Send size={12} /> {testingId === item.id ? '…' : 'Test Bot'}
                      </button>
                      <button
                        onClick={() => { setEditItem(item); setShowModal(true) }}
                        className="flex items-center gap-1 rounded-lg bg-yellow-400 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-yellow-500"
                      >
                        <Edit size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-600"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => !saving && setShowModal(false)}
        title={editItem ? 'Edit Delivery By' : 'Add Delivery By'}
        size="md"
      >
        <ConfigForm
          key={editItem?.id ?? 'new'}
          config={editItem}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      </Modal>
    </div>
  )
}
