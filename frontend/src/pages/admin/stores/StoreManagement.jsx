import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, Plus, FileText, CheckCircle2, Clock, AlertTriangle,
  DollarSign, Mail, Phone, ExternalLink, ShieldCheck,
  Search, RefreshCw, Eye, Building2, Check, Filter, Calendar,
  PackageCheck, Package, ThumbsUp, ThumbsDown, Edit, Trash2, MoreVertical,
  Upload, Image, X, Users, UserPlus, UserCheck, MapPin, User, EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import SearchFilter from '@/components/shared/SearchFilter'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { storesApi } from '@/api/stores'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import { cn, formatCurrency, formatDateTime } from '@/utils/helpers'
import StoreHomepageSettings, { STORE_HOMEPAGE_DEFAULTS } from './StoreHomepageSettings'

function StoreStatusSwitch({ active, disabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      aria-label={active ? 'Turn store off' : 'Turn store on'}
      className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full px-1.5 text-[10px] font-black uppercase shadow-sm transition disabled:cursor-wait disabled:opacity-70 ${
        active ? 'justify-start bg-green-600 text-white' : 'justify-end bg-gray-300 text-gray-700'
      }`}
    >
      <span className={active ? 'pr-5' : 'pl-5'}>{active ? 'ON' : 'OFF'}</span>
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          active ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function StoreActionMenu({ store, onPreview, onEdit, onManageStaff, onDelete }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition focus:outline-none"
        title="More Actions"
        aria-label="Actions"
      >
        <MoreVertical size={15} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onPreview?.(store)
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye size={13} className="text-pink-500" />
            <span>Quick Preview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onManageStaff?.(store)
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Users size={13} className="text-indigo-600" />
            <span>Manage Staff</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onEdit(store)
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Edit size={13} className="text-blue-500" />
            <span>Edit Store</span>
          </button>

          <a
            href={`/store/${store.slug}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <ExternalLink size={13} className="text-purple-500" />
            <span>Visit Customer Page</span>
          </a>

          <a
            href={`/admin/products?store=${store.id}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Package size={13} className="text-emerald-500" />
            <span>View Store Products</span>
          </a>

          <div className="my-1 border-t border-gray-100" />

          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onDelete(store)
            }}
            className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={13} className="text-red-500" />
            <span>Delete Store</span>
          </button>
        </div>
      )}
    </div>
  )
}

function ImagePreviewModal({ isOpen, onClose, src, title }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !src) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-w-4xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-950/80">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-pink-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">{title || 'Image Preview'}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs font-semibold flex items-center gap-1"
              title="Open full size in new tab"
            >
              <ExternalLink size={13} />
              <span>Full Size</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              title="Close Preview (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-black/50">
          <img
            src={src}
            alt={title || 'Preview'}
            className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-gray-800/60"
          />
        </div>
      </div>
    </div>
  )
}

function StoreQuickPreviewModal({ isOpen, onClose, store, onEdit, onEditContract, onManageStaff, onPreviewImage }) {
  if (!isOpen || !store) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Store Preview: ${store.name}`}
      size="xl"
      className="max-w-4xl"
    >
      <div className="overflow-hidden">
        {/* Top Cover Banner */}
        <div
          onClick={() => {
            if (store.banner && onPreviewImage) {
              onPreviewImage(store.banner, `${store.name} - Cover Banner`)
            }
          }}
          className={cn(
            'relative h-44 w-full bg-gradient-to-r from-pink-100 via-purple-100 to-pink-100 flex items-center justify-center overflow-hidden transition',
            store.banner ? 'cursor-pointer group' : ''
          )}
          title={store.banner ? 'Click to preview full banner' : ''}
        >
          {store.banner ? (
            <>
              <img src={store.banner} alt={store.name} className="w-full h-full object-cover group-hover:scale-102 transition duration-300" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                <Eye size={16} />
                <span>Click for Full Preview</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <Store size={28} className="text-gray-300" />
              <span className="text-xs font-semibold text-gray-400">No cover banner set</span>
            </div>
          )}

          <div
            className="absolute top-3 right-3 flex items-center gap-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Badge
              variant={store.status === 'active' ? 'success' : 'secondary'}
              className="shadow-sm capitalize text-xs px-2.5 py-0.5"
            >
              {store.status}
            </Badge>
            <span className="text-xs font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur px-2.5 py-0.5 rounded-full shadow-sm">
              {store.store_type}
            </span>
          </div>
        </div>

        {/* Profile Avatar & Header Info */}
        <div className="px-6 pb-6 pt-3 relative bg-white">
          <div className="flex items-end justify-between -mt-12 mb-4 relative z-10">
            <div className="flex items-end gap-3.5">
              <div
                onClick={() => {
                  if (store.logo && onPreviewImage) {
                    onPreviewImage(store.logo, `${store.name} - Logo`)
                  }
                }}
                className={cn(
                  'w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden shrink-0 flex items-center justify-center transition',
                  store.logo ? 'cursor-pointer group relative hover:ring-2 hover:ring-pink-500' : ''
                )}
                title={store.logo ? 'Click to preview full logo' : ''}
              >
                {store.logo ? (
                  <>
                    <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <Eye size={15} />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 font-black text-xl">
                    {store.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{store.name}</h2>
                  {store.is_verified && (
                    <ShieldCheck size={18} className="text-blue-500" title="Verified Store" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                  <span>{store.code}</span>
                  <span>•</span>
                  <span>/store/{store.slug}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onManageStaff?.(store)
                }}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 text-indigo-700 bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100"
              >
                <Users size={13} />
                <span>Staff ({Array.isArray(store.memberships) ? store.memberships.length : 0})</span>
              </button>
              <a
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
              >
                <ExternalLink size={13} />
                <span>Customer Page</span>
              </a>
              <a
                href={`/admin/products?store=${store.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 text-emerald-700 bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100"
              >
                <Package size={13} />
                <span>Store Products {store.products_count !== undefined ? `(${store.products_count})` : ''}</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onEdit(store)
                }}
                className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
              >
                <Edit size={13} />
                <span>Edit Store</span>
              </button>
            </div>
          </div>

          {/* Bio / Tagline */}
          {store.bio && (
            <p className="text-sm font-semibold text-gray-700 mb-3 bg-pink-50/50 border border-pink-100/60 p-2.5 rounded-xl">
              "{store.bio}"
            </p>
          )}

          {/* Description */}
          {store.description && (
            <div className="mb-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">About Store</h4>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{store.description}</p>
            </div>
          )}

          {/* Contact & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs mb-4">
            <div>
              <span className="text-gray-400 font-medium block text-[10px] uppercase">Phone Number</span>
              <span className="font-semibold text-gray-800">{store.phone || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium block text-[10px] uppercase">Email Address</span>
              <span className="font-semibold text-gray-800">{store.email || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium block text-[10px] uppercase">Province / City</span>
              <span className="font-semibold text-gray-800">{store.province || '—'} {store.district ? `(${store.district})` : ''}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium block text-[10px] uppercase">Detailed Address</span>
              <span className="font-semibold text-gray-800">{store.address || 'Not specified'}</span>
            </div>
          </div>

          {/* Contract Snapshot */}
          <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <FileText size={13} className="text-purple-600" />
                <span>Contract Snapshot</span>
              </h4>
              {store.current_contract && onEditContract && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onEditContract(store.current_contract, store.name)
                  }}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline"
                >
                  <Edit size={11} />
                  <span>Edit Contract</span>
                </button>
              )}
            </div>
            {store.current_contract ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 text-[10px] block">Contract #</span>
                  <span className="font-mono font-bold text-gray-900">{store.current_contract.contract_number}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Commission</span>
                  <span className="font-bold text-gray-900">{store.current_contract.commission_rate}%</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">Start Date</span>
                  <span className="font-semibold text-gray-800">{store.current_contract.start_date || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 text-[10px] block">End Date</span>
                  <span className="font-semibold text-gray-800">{store.current_contract.end_date || 'Ongoing'}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No active contract assigned yet.</p>
            )}
          </div>

          {/* Assigned Staff Snapshot */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Users size={13} className="text-indigo-600" />
                <span>Store Staff & Users ({store.memberships?.length || 0})</span>
              </h4>
              {onManageStaff && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onManageStaff(store)
                  }}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline"
                >
                  <UserPlus size={11} />
                  <span>Manage Staff</span>
                </button>
              )}
            </div>
            {Array.isArray(store.memberships) && store.memberships.length > 0 ? (
              <div className="space-y-1.5">
                {store.memberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-indigo-100/50">
                    <span className="font-semibold text-gray-800">
                      {m.user_full_name || m.username} <span className="font-mono text-gray-400 font-normal">(@{m.username})</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No staff members assigned to this store yet.</p>
            )}
          </div>

          {/* Creation Metadata */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-gray-400" />
              <span>Created by <strong className="text-gray-700">@{store.created_by_name || 'Admin'}</strong></span>
            </div>
            {store.created_at && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-gray-400" />
                <span>{formatDateTime(store.created_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function EditContractModal({ isOpen, onClose, contract, storeName, onSubmit, isPending }) {
  const [form, setForm] = useState({
    contract_number: '',
    start_date: '',
    end_date: '',
    commission_rate: 5.0,
    bank_name: 'ABA Bank',
    bank_account_name: '',
    bank_account_number: '',
    is_active: true,
    notes: '',
  })

  useEffect(() => {
    if (contract) {
      setForm({
        contract_number: contract.contract_number || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        commission_rate: contract.commission_rate ?? 5.0,
        bank_name: contract.bank_name || 'ABA Bank',
        bank_account_name: contract.bank_account_name || '',
        bank_account_number: contract.bank_account_number || '',
        is_active: Boolean(contract.is_active),
        notes: contract.notes || '',
      })
    }
  }, [contract])

  if (!isOpen || !contract) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Contract: ${form.contract_number || ''} (${storeName || contract.store_name || `Store #${contract.store}`})`}
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit({
            id: contract.id,
            data: {
              ...form,
              end_date: form.end_date ? form.end_date : null,
              commission_rate: form.commission_rate !== '' && !isNaN(Number(form.commission_rate)) ? Number(form.commission_rate) : 5.0,
            },
          })
        }}
        className="space-y-4 p-6"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Contract Number *</label>
            <input
              type="text"
              required
              value={form.contract_number}
              onChange={(e) => setForm((prev) => ({ ...prev, contract_number: e.target.value }))}
              className="input-field font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">End Date (Blank = Ongoing)</label>
              <input
                type="date"
                value={form.end_date || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Commission Rate (%) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={form.commission_rate}
              onChange={(e) => setForm((prev) => ({ ...prev, commission_rate: e.target.value }))}
              className="input-field font-mono"
            />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Bank & Payout Settlement</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={form.bank_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                  placeholder="e.g. ABA Bank, ACLEDA, Wing"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    value={form.bank_account_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, bank_account_name: e.target.value }))}
                    placeholder="e.g. ACME CORP"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={form.bank_account_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                    placeholder="e.g. 000 123 456"
                    className="input-field font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="contract_is_active"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="rounded text-pink-600 focus:ring-pink-500 h-4 w-4"
            />
            <label htmlFor="contract_is_active" className="text-xs font-bold text-gray-700 cursor-pointer">
              Contract is currently Active
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notes / Terms</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional contract notes or terms..."
              className="input-field"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? 'Saving...' : 'Save Contract'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const ROLE_BADGE_COLORS = {
  owner: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  cashier: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  stock_staff: 'bg-amber-100 text-amber-700 border-amber-200',
  sales_staff: 'bg-pink-100 text-pink-700 border-pink-200',
}

const ROLE_LABELS = {
  owner: 'Store Owner',
  manager: 'Store Manager',
  cashier: 'Cashier',
  stock_staff: 'Stock Staff',
  sales_staff: 'Sales Staff',
}

function StoreStaffModal({ isOpen, onClose, store, onAssignedChanged }) {
  const queryClient = useQueryClient()
  const [assignmentMode, setAssignmentMode] = useState('create') // 'create' | 'existing'
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState('owner')
  const [showPassword, setShowPassword] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
    role: 'owner',
  })

  // Fetch memberships for this specific store
  const { data: rawMembers, isLoading: isMembersLoading, refetch } = useQuery({
    queryKey: ['store-memberships', store?.id],
    queryFn: () => storesApi.admin.getMemberships({ store: store.id }).then((r) => r.data),
    enabled: Boolean(isOpen && store?.id),
  })

  const members = Array.isArray(rawMembers)
    ? rawMembers
    : Array.isArray(rawMembers?.results)
    ? rawMembers.results
    : []

  // Fetch all users to assign
  const { data: allUsersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['all-users-for-assignment'],
    queryFn: () => authApi.users.list({ page_size: 100 }).then((r) => r.data),
    enabled: Boolean(isOpen),
  })

  const userList = Array.isArray(allUsersData)
    ? allUsersData
    : allUsersData?.results || []

  // Assign existing user mutation
  const assignMutation = useMutation({
    mutationFn: (payload) => storesApi.admin.assignMember(payload),
    onSuccess: () => {
      toast.success('User assigned to store successfully')
      setSelectedUserId('')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      onAssignedChanged?.()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || 'Failed to assign user')
    },
  })

  // Create new user & assign mutation
  const createUserAndAssignMutation = useMutation({
    mutationFn: (payload) => storesApi.admin.createUserAndAssign(payload),
    onSuccess: (res) => {
      toast.success(`User @${res.data?.username || newUserForm.username || 'user'} created & assigned successfully!`)
      setNewUserForm({
        first_name: '',
        last_name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: '',
        role: 'owner',
      })
      refetch()
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['all-users-for-assignment'] })
      onAssignedChanged?.()
    },
    onError: (err) => {
      const data = err?.response?.data
      if (typeof data === 'string') {
        toast.error(data)
      } else if (data && typeof data === 'object') {
        const msg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ')
        toast.error(msg || 'Failed to create user')
      } else {
        toast.error(err?.message || 'Failed to create user')
      }
    },
  })

  // Remove user mutation
  const removeMutation = useMutation({
    mutationFn: (membershipId) => storesApi.admin.removeMember(membershipId),
    onSuccess: () => {
      toast.success('Staff member removed from store')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      onAssignedChanged?.()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to remove user')
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => storesApi.admin.updateMember(id, { role }),
    onSuccess: () => {
      toast.success('Role updated')
      refetch()
    },
    onError: () => {
      toast.error('Failed to update role')
    },
  })

  const handleAutoGenerateUsername = () => {
    const base = (newUserForm.first_name || store?.name || 'staff').toLowerCase().replace(/[^a-z0-9]/g, '')
    const random = Math.floor(100 + Math.random() * 900)
    setNewUserForm((prev) => ({ ...prev, username: `${base || 'user'}_${random}` }))
  }

  if (!isOpen || !store) return null

  // Filter available users that aren't already assigned
  const assignedUserIds = new Set(members.map((m) => m.user))
  const filteredUsers = userList.filter((u) => !assignedUserIds.has(u.id))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Staff & Users: ${store.name}`}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Store Summary Header Banner */}
        <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-center font-bold text-gray-700 overflow-hidden shrink-0">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                store.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <span>{store.name}</span>
                <span className="font-mono text-xs font-normal text-gray-500">({store.code})</span>
              </div>
              <div className="text-xs text-gray-500">
                {members.length} {members.length === 1 ? 'member' : 'members'} assigned to this store
              </div>
            </div>
          </div>
          <Badge variant={store.status === 'active' ? 'success' : 'secondary'} className="capitalize">
            {store.status}
          </Badge>
        </div>

        {/* Section 1: Assigned Staff Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Users size={14} className="text-purple-600" />
              <span>Assigned Store Staff ({members.length})</span>
            </h3>
          </div>

          {isMembersLoading ? (
            <div className="p-6 text-center text-xs text-gray-500 animate-pulse">Loading assigned staff...</div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-gray-50/70 border border-dashed border-gray-200">
              <Users size={24} className="mx-auto text-gray-400 mb-1.5" />
              <p className="text-xs font-bold text-gray-700">No users assigned yet</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Create a user or assign an existing account below.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              {members.map((member) => (
                <div key={member.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/60 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-200 text-pink-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {member.username?.substring(0, 2).toUpperCase() || 'US'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-gray-900 flex items-center gap-2">
                        <span className="truncate">{member.user_full_name || member.username}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_BADGE_COLORS[member.role] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 truncate flex items-center gap-2 font-mono">
                        <span>@{member.username}</span>
                        {member.email && <span>• {member.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={member.role}
                      onChange={(e) => updateRoleMutation.mutate({ id: member.id, role: e.target.value })}
                      disabled={updateRoleMutation.isPending}
                      className="text-xs font-semibold py-1 px-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    >
                      <option value="owner">👑 Store Owner</option>
                      {member.role !== 'owner' && (
                        <option value={member.role}>{ROLE_LABELS[member.role] || member.role}</option>
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${member.username} from ${store.name}?`)) {
                          removeMutation.mutate(member.id)
                        }
                      }}
                      disabled={removeMutation.isPending}
                      title="Remove Staff Member"
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Add or Assign Staff */}
        <div className="border-t border-gray-100 pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <UserPlus size={14} className="text-pink-600" />
              <span>Add Staff to Store</span>
            </h3>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setAssignmentMode('create')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5',
                  assignmentMode === 'create'
                    ? 'bg-white text-pink-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                <Plus size={12} />
                <span>Create New User & Password</span>
              </button>
              <button
                type="button"
                onClick={() => setAssignmentMode('existing')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5',
                  assignmentMode === 'existing'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                <Users size={12} />
                <span>Assign Existing</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Create New User & Password */}
          {assignmentMode === 'create' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (newUserForm.password !== newUserForm.confirm_password) {
                  toast.error('Passwords do not match')
                  return
                }
                createUserAndAssignMutation.mutate({
                  store: store.id,
                  ...newUserForm,
                })
              }}
              className="space-y-3.5 p-4 rounded-2xl bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-pink-50/50 border border-pink-100 shadow-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserForm.first_name}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, first_name: e.target.value }))}
                    placeholder="e.g. Seyha"
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUserForm.last_name}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, last_name: e.target.value }))}
                    placeholder="e.g. Tha"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">Username *</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateUsername}
                      className="text-[11px] font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                    >
                      <RefreshCw size={11} />
                      <span>Auto</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') }))}
                    placeholder="e.g. seyha_tha"
                    className="input-field text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Store Role *</label>
                  <select
                    required
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, role: e.target.value }))}
                    className="input-field text-xs font-semibold"
                  >
                    <option value="owner">👑 Store Owner (Full Access & Payouts)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="staff@example.com"
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="012 345 678"
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700">Password *</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                    className="input-field text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Confirm Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newUserForm.confirm_password}
                    onChange={(e) => setNewUserForm((p) => ({ ...p, confirm_password: e.target.value }))}
                    placeholder="Re-enter password"
                    className="input-field text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={createUserAndAssignMutation.isPending}
                  className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <UserPlus size={13} />
                  <span>
                    {createUserAndAssignMutation.isPending
                      ? 'Creating & Assigning...'
                      : 'Create User & Assign to Store'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            /* Mode 2: Assign Existing User */
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!selectedUserId) {
                  toast.error('Please select a user to assign')
                  return
                }
                assignMutation.mutate({
                  store: store.id,
                  user: selectedUserId,
                  role: role,
                  is_active: true,
                })
              }}
              className="space-y-3 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select User *</label>
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="input-field text-xs"
                  >
                    <option value="">-- Choose User to Assign --</option>
                    {filteredUsers.map((u) => {
                      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim()
                      return (
                        <option key={u.id} value={u.id}>
                          {name ? `${name} (@${u.username})` : `@${u.username}`} {u.email ? `— ${u.email}` : ''}
                        </option>
                      )
                    })}
                  </select>
                  {filteredUsers.length === 0 && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      {isUsersLoading ? 'Loading users...' : 'All registered users are already assigned to this store.'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Store Role *</label>
                  <select
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="input-field text-xs font-semibold"
                  >
                    <option value="owner">👑 Store Owner (Full Access & Payouts)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={assignMutation.isPending || !selectedUserId}
                  className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                >
                  <UserCheck size={13} />
                  <span>{assignMutation.isPending ? 'Assigning...' : 'Assign User to Store'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end pt-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary py-1.5 px-4 text-xs">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

function StoreBrandingHeader({
  logoPreview,
  bannerPreview,
  storeName,
  storeCode,
  isVerified,
  onPreviewImage,
  onSelectLogo,
  onClearLogo,
  onSelectBanner,
  onClearBanner,
}) {
  const logoInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-xs mb-4">
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelectLogo(file)
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onSelectBanner(file)
        }}
      />

      {/* Cover Banner Strip */}
      <div
        onClick={() => {
          if (bannerPreview && onPreviewImage) {
            onPreviewImage(bannerPreview, `${storeName ? storeName + ' - ' : ''}Cover Banner`)
          }
        }}
        className={cn(
          'relative h-36 sm:h-44 w-full bg-gradient-to-r from-pink-100/80 via-purple-100/70 to-pink-100/80 flex items-center justify-center overflow-hidden transition rounded-t-2xl',
          bannerPreview ? 'cursor-pointer group' : ''
        )}
      >
        {bannerPreview ? (
          <>
            <img src={bannerPreview} alt="Cover Banner" className="w-full h-full object-cover group-hover:scale-102 transition duration-300" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
              <Eye size={15} />
              <span>Click to Preview Cover</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Image size={18} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-400">Store Cover Banner</span>
          </div>
        )}

        {/* Banner Controls & Recommend Size */}
        <div
          className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] font-bold bg-black/60 text-white backdrop-blur px-2 py-0.5 rounded-full shadow-xs">
            Rec: 1200 × 400 px
          </span>
          {bannerPreview && (
            <button
              type="button"
              onClick={() => onPreviewImage?.(bannerPreview, `${storeName ? storeName + ' - ' : ''}Cover Banner`)}
              className="px-2 py-1 rounded-lg bg-black/65 hover:bg-black/80 text-white text-xs font-bold shadow-sm transition flex items-center gap-1 backdrop-blur"
              title="Preview Cover Banner"
            >
              <Eye size={12} />
              <span>Preview</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-white/95 hover:bg-white text-gray-800 text-xs font-bold shadow-sm transition flex items-center gap-1 backdrop-blur"
          >
            <Upload size={12} />
            <span>{bannerPreview ? 'Change Cover' : 'Upload Cover'}</span>
          </button>
          {bannerPreview && (
            <button
              type="button"
              onClick={onClearBanner}
              className="p-1 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm transition"
              title="Remove Banner"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Logo Avatar Overlap & Info */}
      <div className="px-4 pb-3 pt-2 flex items-end justify-between -mt-7 relative z-10 bg-white border-t border-gray-100">
        <div className="flex items-end gap-3">
          <div
            onClick={() => {
              if (logoPreview && onPreviewImage) {
                onPreviewImage(logoPreview, `${storeName ? storeName + ' - ' : ''}Store Logo`)
              }
            }}
            className={cn(
              'relative w-16 h-16 rounded-2xl border-2 border-white bg-white shadow-md overflow-hidden shrink-0 group',
              logoPreview ? 'cursor-pointer' : ''
            )}
            title={logoPreview ? 'Click to preview logo' : undefined}
          >
            {logoPreview ? (
              <>
                <img src={logoPreview} alt="Store Logo" className="w-full h-full object-cover group-hover:scale-105 transition" />
                <div className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition text-[9px] font-bold">
                  <Eye size={14} />
                  <span>View</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                <Store size={22} className="text-gray-400" />
              </div>
            )}
            {!logoPreview && (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition text-[9px] font-bold"
              >
                <Upload size={13} />
                <span>Upload</span>
              </button>
            )}
          </div>

          <div className="mb-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline flex items-center gap-1"
              >
                <span>{logoPreview ? 'Change Store Logo' : 'Upload Store Logo'}</span>
              </button>
              {logoPreview && (
                <>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={() => onPreviewImage?.(logoPreview, `${storeName ? storeName + ' - ' : ''}Store Logo`)}
                    className="text-[11px] font-bold text-gray-700 hover:text-pink-600 inline-flex items-center gap-0.5 hover:underline"
                  >
                    <Eye size={11} />
                    <span>Preview</span>
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={onClearLogo}
                    className="text-[11px] font-semibold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Rec: 500 × 500 px (1:1 Square)</p>
          </div>
        </div>

        {/* Live Store Info Preview in the header strip */}
        {storeName && (
          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
              <span>{storeName}</span>
              {isVerified && <ShieldCheck size={13} className="text-blue-500" title="Verified Store" />}
            </div>
            {storeCode && <span className="font-mono text-[10px] text-gray-400">{storeCode}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StoreManagement({ initialTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = useAuthStore((state) => state.user)
  const canManageHomepage = ['super_admin', 'admin'].includes(currentUser?.role) || currentUser?.is_superuser

  useEffect(() => {
    if (['store_owner', 'store_manager'].includes(currentUser?.role)) {
      navigate('/admin/store-info', { replace: true })
    }
  }, [currentUser?.role, navigate])

  const queryClient = useQueryClient()
  const [confirm, ConfirmDialog] = useConfirm()

  const resolveTab = () => {
    if (initialTab) return initialTab
    const p = location.pathname.replace(/\/+$/, '')
    if (p.endsWith('/leads')) return 'inquiries'
    if (p.endsWith('/contracts')) return 'contracts'
    if (p.endsWith('/payouts')) return 'payouts'
    if (p.endsWith('/approvals')) return 'approvals'
    const sp = new URLSearchParams(location.search)
    const tabParam = sp.get('tab')
    if (tabParam && ['stores', 'inquiries', 'contracts', 'payouts', 'approvals'].includes(tabParam)) {
      return tabParam
    }
    return 'stores'
  }

  const [activeTab, setActiveTab] = useState(resolveTab)

  useEffect(() => {
    setActiveTab(resolveTab())
  }, [location.pathname, location.search, initialTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'payouts') {
      if (location.pathname !== '/admin/stores/payouts') navigate('/admin/stores/payouts')
    } else if (tab === 'approvals') {
      if (location.pathname !== '/admin/stores/approvals') navigate('/admin/stores/approvals')
    } else {
      if (location.pathname !== '/admin/stores') {
        navigate('/admin/stores')
      }
    }
  }
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [rejectModal, setRejectModal] = useState({ isOpen: false, product: null, reason: '' })
  const [rejectNameModal, setRejectNameModal] = useState({ isOpen: false, store: null, reason: '' })
  const [imagePreview, setImagePreview] = useState({ isOpen: false, src: '', title: '' })
  const [previewStore, setPreviewStore] = useState(null)
  const [staffModalStore, setStaffModalStore] = useState(null)
  const [editContractModal, setEditContractModal] = useState({
    isOpen: false,
    contract: null,
    storeName: '',
  })
  const [editStoreModal, setEditStoreModal] = useState({
    isOpen: false,
    store: null,
    form: {
      ...STORE_HOMEPAGE_DEFAULTS,
      name: '',
      code: '',
      slug: '',
      store_type: 'retail',
      phone: '',
      email: '',
      province: 'Phnom Penh',
      district: '',
      address: '',
      description: '',
      bio: '',
      is_verified: false,
    },
  })

  // Fetch Summary Stats
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['stores-admin-summary'],
    queryFn: () => storesApi.admin.getSummary().then((r) => r.data),
    staleTime: 30000,
  })

  // Fetch Stores
  const { data: storesData, isLoading: isStoresLoading } = useQuery({
    queryKey: ['stores-admin-list'],
    queryFn: () => storesApi.admin.getStores().then((r) => r.data),
  })

  // Fetch Inquiries
  const { data: inquiriesData, isLoading: isInquiriesLoading } = useQuery({
    queryKey: ['stores-admin-inquiries'],
    queryFn: () => storesApi.admin.getInquiries().then((r) => r.data),
  })

  // Fetch Contracts
  const { data: contractsData, isLoading: isContractsLoading } = useQuery({
    queryKey: ['stores-admin-contracts'],
    queryFn: () => storesApi.admin.getContracts().then((r) => r.data),
  })

  // Fetch Payouts
  const { data: payoutsData, isLoading: isPayoutsLoading } = useQuery({
    queryKey: ['stores-admin-payouts'],
    queryFn: () => storesApi.admin.getPayouts().then((r) => r.data),
  })

  // Fetch Pending Products (Option B: Review / Approval Queue)
  const { data: pendingProductsData, isLoading: isPendingProductsLoading } = useQuery({
    queryKey: ['stores-admin-pending-products'],
    queryFn: () => productsApi.products.list({ approval_status: 'pending' }).then((r) => r.data),
  })

  // Approve Product Mutation
  const approveProductMutation = useMutation({
    mutationFn: (id) => productsApi.products.approve(id),
    onSuccess: (res) => {
      toast.success(res?.data?.detail || 'Product approved and is now live on the website!')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-pending-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to approve product')
    },
  })

  // Reject Product Mutation
  const rejectProductMutation = useMutation({
    mutationFn: ({ id, reason }) => productsApi.products.reject(id, reason),
    onSuccess: (res) => {
      toast.success(res?.data?.detail || 'Product rejected.')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-pending-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to reject product')
    },
  })

  // Approve Store Name Change Mutation
  const approveNameMutation = useMutation({
    mutationFn: (id) => storesApi.admin.approveNameChange(id),
    onSuccess: (res) => {
      toast.success(res?.data?.detail || 'Store name change approved!')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-summary'] })
      queryClient.invalidateQueries({ queryKey: ['my-store-info'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to approve store name change')
    },
  })

  // Reject Store Name Change Mutation
  const rejectNameMutation = useMutation({
    mutationFn: ({ id, reason }) => storesApi.admin.rejectNameChange(id, reason),
    onSuccess: (res) => {
      toast.success(res?.data?.detail || 'Store name change rejected.')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-summary'] })
      queryClient.invalidateQueries({ queryKey: ['my-store-info'] })
      setRejectNameModal({ isOpen: false, store: null, reason: '' })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to reject store name change')
    },
  })

  const handleApproveNameChange = (id) => {
    approveNameMutation.mutate(id)
  }

  const openRejectNameChangeModal = (store) => {
    setRejectNameModal({ isOpen: true, store, reason: '' })
  }

  const generateContractNumber = () => {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `CTR-${year}-${randomNum}`
  }

  const generateStoreCode = () => {
    return `STR-${Math.floor(100 + Math.random() * 900)}`
  }

  // Form state for creating store
  const [newStore, setNewStore] = useState({
    ...STORE_HOMEPAGE_DEFAULTS,
    name: '',
    code: generateStoreCode(),
    slug: '',
    store_type: 'partner',
    status: 'active',
    phone: '',
    email: '',
    province: 'Phnom Penh',
    district: '',
    address: '',
    bio: '',
    description: '',
    is_verified: false,
    // Contract Fields
    contract_number: generateContractNumber(),
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    commission_rate: 5.0,
    bank_name: 'ABA Bank',
    bank_account_name: '',
    bank_account_number: '',
    logoFile: null,
    logoPreview: null,
    bannerFile: null,
    bannerPreview: null,
  })

  // Create Store Mutation
  const createStoreMutation = useMutation({
    mutationFn: async (payload) => {
      const generatedSlug =
        payload.slug?.trim() ||
        payload.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') ||
        `store-${Math.floor(100 + Math.random() * 900)}`

      const generatedCode = payload.code?.trim() || generateStoreCode()
      const generatedContractNo = payload.contract_number?.trim() || generateContractNumber()

      const formData = new FormData()
      formData.append('name', payload.name.trim())
      formData.append('code', generatedCode)
      formData.append('slug', generatedSlug)
      formData.append('store_type', payload.store_type || 'partner')
      formData.append('status', payload.status || 'active')
      formData.append('phone', payload.phone?.trim() || '')
      formData.append('email', payload.email?.trim() || '')
      formData.append('province', payload.province?.trim() || 'Phnom Penh')
      formData.append('district', payload.district?.trim() || '')
      formData.append('address', payload.address?.trim() || '')
      formData.append('bio', payload.bio?.trim() || '')
      formData.append('description', payload.description?.trim() || '')
      formData.append('is_verified', String(Boolean(payload.is_verified)))
      for (const key of Object.keys(STORE_HOMEPAGE_DEFAULTS)) {
        formData.append(key, String(payload[key] ?? STORE_HOMEPAGE_DEFAULTS[key]))
      }
      formData.append('contract_number', generatedContractNo)
      formData.append('contract_start_date', payload.contract_start_date)
      if (payload.contract_end_date) {
        formData.append('contract_end_date', payload.contract_end_date)
      }
      formData.append(
        'commission_rate',
        payload.commission_rate !== undefined && payload.commission_rate !== ''
          ? payload.commission_rate
          : 5.0
      )
      formData.append('bank_name', payload.bank_name?.trim() || 'ABA Bank')
      formData.append('bank_account_name', payload.bank_account_name?.trim() || '')
      formData.append('bank_account_number', payload.bank_account_number?.trim() || '')

      if (payload.logoFile) {
        formData.append('logo', payload.logoFile)
      }
      if (payload.bannerFile) {
        formData.append('banner', payload.bannerFile)
      }

      const res = await storesApi.admin.createStore(formData)
      return res.data
    },
    onSuccess: () => {
      toast.success('Store & Contract created successfully!')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-contracts'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-summary'] })
      setIsCreateModalOpen(false)
      setNewStore({
        ...STORE_HOMEPAGE_DEFAULTS,
        name: '',
        code: generateStoreCode(),
        slug: '',
        store_type: 'partner',
        status: 'active',
        phone: '',
        email: '',
        province: 'Phnom Penh',
        district: '',
        address: '',
        bio: '',
        description: '',
        is_verified: false,
        contract_number: generateContractNumber(),
        contract_start_date: new Date().toISOString().split('T')[0],
        contract_end_date: '',
        commission_rate: 5.0,
        bank_name: 'ABA Bank',
        bank_account_name: '',
        bank_account_number: '',
        logoFile: null,
        logoPreview: null,
        bannerFile: null,
        bannerPreview: null,
      })
    },
    onError: (err) => {
      const data = err?.response?.data
      if (typeof data === 'string') {
        toast.error(data)
      } else if (data && typeof data === 'object') {
        const errorMsg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ')
        toast.error(errorMsg || 'Failed to create store')
      } else {
        toast.error(err?.message || 'Failed to create store')
      }
    },
  })

  // Update Store Mutation
  const updateStoreMutation = useMutation({
    mutationFn: ({ id, data }) => {
      if (data instanceof FormData) {
        return storesApi.admin.updateStore(id, data)
      }

      // If data is just a partial update like { status: 'active' }
      if (!data.name && data.status !== undefined && Object.keys(data).length === 1) {
        return storesApi.admin.updateStore(id, data)
      }

      // Convert edit store form to clean FormData with proper file handling
      const formData = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (
          k !== 'logoFile' &&
          k !== 'bannerFile' &&
          k !== 'logoPreview' &&
          k !== 'bannerPreview' &&
          k !== 'logo' &&
          k !== 'banner' &&
          k !== 'clearLogo' &&
          k !== 'clearBanner' &&
          v !== null &&
          v !== undefined
        ) {
          formData.append(k, typeof v === 'boolean' ? String(v) : v)
        }
      })

      if (data.logoFile) {
        formData.append('logo', data.logoFile)
      } else if (data.clearLogo) {
        formData.append('logo', 'null')
      }

      if (data.bannerFile) {
        formData.append('banner', data.bannerFile)
      } else if (data.clearBanner) {
        formData.append('banner', 'null')
      }

      return storesApi.admin.updateStore(id, formData)
    },
    onSuccess: (res, vars) => {
      if (vars.data?.status !== undefined) {
        toast.success(`Store status updated to ${vars.data.status}`)
      } else {
        toast.success('Store updated successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-summary'] })
      setEditStoreModal((prev) => ({ ...prev, isOpen: false }))
    },
    onError: (err) => {
      const data = err?.response?.data
      if (typeof data === 'string') {
        toast.error(data)
      } else if (data && typeof data === 'object') {
        const errorMsg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ')
        toast.error(errorMsg || 'Failed to update store')
      } else {
        toast.error(err?.message || 'Failed to update store')
      }
    },
  })

  // Delete Store Mutation
  const deleteStoreMutation = useMutation({
    mutationFn: (id) => storesApi.admin.deleteStore(id),
    onSuccess: () => {
      toast.success('Store deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-summary'] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete store')
    },
  })

  const handleOpenEdit = (store) => {
    setEditStoreModal({
      isOpen: true,
      store,
      form: {
        ...Object.fromEntries(Object.keys(STORE_HOMEPAGE_DEFAULTS).map((key) => [key, store[key] ?? STORE_HOMEPAGE_DEFAULTS[key]])),
        name: store.name || '',
        code: store.code || '',
        slug: store.slug || '',
        store_type: store.store_type || 'retail',
        phone: store.phone || '',
        email: store.email || '',
        province: store.province || 'Phnom Penh',
        district: store.district || '',
        address: store.address || '',
        description: store.description || '',
        bio: store.bio || '',
        is_verified: Boolean(store.is_verified),
        logoFile: null,
        logoPreview: store.logo || null,
        bannerFile: null,
        bannerPreview: store.banner || null,
      },
    })
  }

  const handleDeleteStore = async (store) => {
    if (await confirm(`Are you sure you want to delete "${store.name}" (${store.code})? This will also remove associated contracts.`)) {
      deleteStoreMutation.mutate(store.id)
    }
  }

  // Update Inquiry Status Mutation
  const updateInquiryMutation = useMutation({
    mutationFn: ({ id, status }) => storesApi.admin.updateInquiry(id, { status }),
    onSuccess: () => {
      toast.success('Inquiry updated')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-inquiries'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-summary'] })
    },
  })

  // Mark Payout Settled Mutation
  const settlePayoutMutation = useMutation({
    mutationFn: ({ id, notes }) => storesApi.admin.markPayoutSettled(id, { notes }),
    onSuccess: () => {
      toast.success('Payout marked as completed!')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-payouts'] })
    },
  })

  // Update Contract Mutation
  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }) => storesApi.admin.updateContract(id, data),
    onSuccess: () => {
      toast.success('Contract updated successfully')
      queryClient.invalidateQueries({ queryKey: ['stores-admin-contracts'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
      queryClient.invalidateQueries({ queryKey: ['stores-admin-summary'] })
      setEditContractModal({ isOpen: false, contract: null, storeName: '' })
    },
    onError: (err) => {
      const data = err?.response?.data
      if (typeof data === 'string') {
        toast.error(data)
      } else if (data && typeof data === 'object') {
        const errorMsg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ')
        toast.error(errorMsg || 'Failed to update contract')
      } else {
        toast.error(err?.message || 'Failed to update contract')
      }
    },
  })

  const handleOpenEditContract = (contract, storeName) => {
    setEditContractModal({
      isOpen: true,
      contract,
      storeName: storeName || '',
    })
  }

  const stores = Array.isArray(storesData) ? storesData : storesData?.results || []
  const inquiries = Array.isArray(inquiriesData) ? inquiriesData : inquiriesData?.results || []
  const contracts = Array.isArray(contractsData) ? contractsData : contractsData?.results || []
  const payouts = Array.isArray(payoutsData) ? payoutsData : payoutsData?.results || []
  const pendingProducts = Array.isArray(pendingProductsData) ? pendingProductsData : pendingProductsData?.results || []
  const pendingNameChangeStores = stores.filter((s) => s.name_change_status === 'pending' && s.pending_name)

  const filteredStores = stores.filter((s) => {
    const matchSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.code?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter ? s.status === statusFilter : true
    return matchSearch && matchStatus
  })

  const getStoreStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" dot>Active</Badge>
      case 'expiring_soon':
        return <Badge variant="warning" dot>Expiring Soon</Badge>
      case 'expired':
        return <Badge variant="danger" dot>Expired</Badge>
      case 'suspended':
        return <Badge variant="danger">Suspended</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getInquiryStatusBadge = (status) => {
    switch (status) {
      case 'new':
        return <Badge variant="primary" dot>New</Badge>
      case 'contacted':
        return <Badge variant="warning">Contacted</Badge>
      case 'approved':
        return <Badge variant="success">Approved</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const tabHeaders = {
    stores: { title: 'Stores & Partners', subtitle: `${stores.length} total stores configured` },
    inquiries: { title: 'Partner Leads', subtitle: `${inquiries.length} inquiries & applications` },
    contracts: { title: 'Contracts', subtitle: `${contracts.length} partner contracts` },
    payouts: { title: 'Payouts', subtitle: `${payouts.length} payout records` },
    approvals: { title: 'Approval Product', subtitle: `${pendingProducts.length + pendingNameChangeStores.length} awaiting admin review` },
  }
  const currentTabHeader = tabHeaders[activeTab] || tabHeaders.stores

  const totalPayoutGross = payouts.reduce((acc, p) => acc + Number(p.gross_sales || p.amount || 0), 0)
  const totalPayoutNet = payouts.reduce((acc, p) => acc + Number(p.net_payout || p.amount || 0), 0)
  const pendingPayouts = payouts.filter((p) => p.status === 'pending' || p.status === 'requested')
  const completedPayouts = payouts.filter((p) => p.status === 'paid' || p.status === 'completed')

  const currentKpis = useMemo(() => {
    if (activeTab === 'payouts') {
      return [
        {
          title: 'Total Payouts',
          value: isPayoutsLoading ? '...' : payouts.length,
          icon: DollarSign,
          color: 'purple',
        },
        {
          title: 'Pending Requests',
          value: isPayoutsLoading ? '...' : pendingPayouts.length,
          icon: Clock,
          color: pendingPayouts.length > 0 ? 'orange' : 'green',
        },
        {
          title: 'Total Gross Sales',
          value: isPayoutsLoading ? '...' : formatCurrency(totalPayoutGross),
          icon: Building2,
          color: 'blue',
        },
        {
          title: 'Total Net Payouts',
          value: isPayoutsLoading ? '...' : formatCurrency(totalPayoutNet),
          icon: CheckCircle2,
          color: 'green',
        },
      ]
    }
    if (activeTab === 'approvals') {
      return [
        {
          title: 'Pending Products',
          value: isPendingProductsLoading ? '...' : pendingProducts.length,
          icon: PackageCheck,
          color: pendingProducts.length > 0 ? 'orange' : 'green',
        },
        {
          title: 'Store Name Changes',
          value: pendingNameChangeStores.length,
          icon: Building2,
          color: pendingNameChangeStores.length > 0 ? 'purple' : 'blue',
        },
        {
          title: 'Active Stores',
          value: isSummaryLoading ? '...' : summary?.active_stores || stores.filter((s) => s.status === 'active').length || 0,
          icon: Store,
          color: 'pink',
        },
        {
          title: 'Live Partner Products',
          value: stores.reduce((acc, s) => acc + (s.products_count || 0), 0),
          icon: CheckCircle2,
          color: 'green',
        },
      ]
    }
    return [
      {
        title: 'Total Stores',
        value: isSummaryLoading ? '...' : summary?.total_stores || stores.length || 0,
        icon: Building2,
        color: 'blue',
        onClick: () => handleTabChange('stores'),
      },
      {
        title: 'Partner Leads',
        value: isSummaryLoading ? '...' : summary?.new_inquiries || inquiries.length || 0,
        icon: Mail,
        color: 'purple',
        onClick: () => handleTabChange('inquiries'),
      },
      {
        title: 'Active Contracts',
        value: isSummaryLoading ? '...' : summary?.total_contracts || contracts.length || 0,
        icon: FileText,
        color: 'pink',
        onClick: () => handleTabChange('contracts'),
      },
      {
        title: 'Expired Contracts',
        value: isSummaryLoading ? '...' : summary?.expired_contracts || 0,
        icon: AlertTriangle,
        color: (summary?.expired_contracts || 0) > 0 ? 'orange' : 'green',
        onClick: () => handleTabChange('contracts'),
      },
    ]
  }, [
    activeTab,
    isSummaryLoading,
    summary,
    stores,
    inquiries,
    contracts,
    isPayoutsLoading,
    payouts,
    completedPayouts.length,
    pendingPayouts.length,
    totalPayoutGross,
    totalPayoutNet,
    isPendingProductsLoading,
    pendingProducts.length,
    pendingNameChangeStores.length,
  ])

  return (
    <div className="animate-fade-in space-y-6">
      {/* Admin System PageHeader */}
      <PageHeader
        title={currentTabHeader.title}
        subtitle={currentTabHeader.subtitle}
        breadcrumbs={[{ label: 'Store Management' }, { label: currentTabHeader.title }]}
        actions={
          <button
            type="button"
            onClick={() => {
              setNewStore((prev) => ({
                ...prev,
                code: generateStoreCode(),
                contract_number: generateContractNumber(),
              }))
              setIsCreateModalOpen(true)
            }}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>Add New Store</span>
          </button>
        }
      />

      {/* Clean KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {currentKpis.map((kpi, idx) => (
          <KpiCard
            key={kpi.title || idx}
            compact
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            onClick={kpi.onClick}
          />
        ))}
      </div>

      {/* Admin Card with Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        {/* Sub-Header Tabs */}
        {!['payouts', 'approvals'].includes(activeTab) ? (
          <div className="border-b border-gray-100 px-6 pt-3 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTabChange('stores')}
              className={cn(
                'pb-3 px-3 text-sm font-bold border-b-2 transition -mb-px flex items-center gap-2 shrink-0',
                activeTab === 'stores'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              )}
            >
              <Store size={15} />
              <span>Stores & Partners ({stores.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('inquiries')}
              className={cn(
                'pb-3 px-3 text-sm font-bold border-b-2 transition -mb-px flex items-center gap-2 shrink-0',
                activeTab === 'inquiries'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              )}
            >
              <Mail size={15} />
              <span>Partner Leads ({inquiries.length})</span>
              {summary?.new_inquiries > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black">
                  {summary.new_inquiries}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('contracts')}
              className={cn(
                'pb-3 px-3 text-sm font-bold border-b-2 transition -mb-px flex items-center gap-2 shrink-0',
                activeTab === 'contracts'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              )}
            >
              <FileText size={15} />
              <span>Contracts ({contracts.length})</span>
            </button>
          </div>
        ) : activeTab === 'payouts' ? (
          <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-pink-600" />
              <h3 className="font-bold text-gray-900 text-base">Payout Records & Requests ({payouts.length})</h3>
            </div>
          </div>
        ) : (
          <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageCheck size={18} className="text-amber-600" />
              <h3 className="font-bold text-gray-900 text-base">
                Pending Approvals Queue ({pendingProducts.length + pendingNameChangeStores.length})
              </h3>
            </div>
            {(pendingProducts.length > 0 || pendingNameChangeStores.length > 0) && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">
                {pendingProducts.length + pendingNameChangeStores.length} Awaiting Review
              </span>
            )}
          </div>
        )}

        {/* Tab 1: All Stores Content */}
        {activeTab === 'stores' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-100">
              <SearchFilter value={search} onChange={setSearch} placeholder="Search stores by name, code...">
                <select
                  className="select-field w-40 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active (ON)</option>
                  <option value="inactive">Inactive (OFF)</option>
                  <option value="draft">Draft</option>
                  <option value="suspended">Suspended</option>
                  <option value="closed">Closed</option>
                </select>
              </SearchFilter>
            </div>

            <Table>
              <Thead>
                <tr>
                  <Th>No</Th>
                  <Th>Store</Th>
                  <Th>Code / Slug</Th>
                  <Th>Type</Th>
                  <Th>Contact & Location</Th>
                  <Th>Bio & Description</Th>
                  <Th>Contract Info</Th>
                  <Th>Commission</Th>
                  <Th>Created By</Th>
                  <Th>Status</Th>
                  <Th>Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {isStoresLoading && <LoadingRows cols={11} />}
                {!isStoresLoading &&
                  filteredStores.map((store, index) => (
                    <Tr key={store.id}>
                      <Td>
                        <span className="text-xs font-semibold text-gray-500">{index + 1}</span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => {
                              if (store.logo) {
                                setImagePreview({
                                  isOpen: true,
                                  src: store.logo,
                                  title: `${store.name} - Logo`,
                                })
                              }
                            }}
                            className={cn(
                              'w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-600 shrink-0 overflow-hidden shadow-xs transition',
                              store.logo ? 'cursor-pointer group relative hover:ring-2 hover:ring-pink-500 hover:scale-105' : ''
                            )}
                            title={store.logo ? 'Click to preview full size logo' : store.name}
                          >
                            {store.logo ? (
                              <>
                                <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <Eye size={12} />
                                </div>
                              </>
                            ) : (
                              store.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{store.name}</span>
                              {store.is_verified && (
                                <ShieldCheck size={14} className="text-blue-500 shrink-0" title="Verified Store" />
                              )}
                            </div>
                            {store.name_change_status === 'pending' && store.pending_name && (
                              <div className="mt-1 flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs">
                                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900">
                                  <Clock size={11} className="text-amber-600 animate-pulse" />
                                  <span>Rename requested:</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-extrabold text-amber-950">"{store.pending_name}"</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      disabled={approveNameMutation.isPending}
                                      onClick={() => handleApproveNameChange(store.id)}
                                      className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition"
                                      title="Approve this new name"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={rejectNameMutation.isPending}
                                      onClick={() => openRejectNameChangeModal(store)}
                                      className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 transition"
                                      title="Reject this new name"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <button
                                type="button"
                                onClick={() => setStaffModalStore(store)}
                                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                              >
                                <Users size={11} />
                                <span>{store.staff_count ?? (Array.isArray(store.memberships) ? store.memberships.length : 0)} Staff</span>
                              </button>
                              <span className="text-gray-300">•</span>
                              <a
                                href={`/admin/products?store=${store.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                                title="View this store's inventory and products"
                              >
                                <Package size={11} />
                                <span>{store.products_count !== undefined ? `${store.products_count} Items` : 'Products'}</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="font-mono text-xs font-semibold text-gray-800">{store.code}</div>
                        <a
                          href={`/store/${store.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-pink-600 hover:underline flex items-center gap-1"
                        >
                          <span>/store/{store.slug}</span>
                          <ExternalLink size={10} />
                        </a>
                      </Td>
                      <Td>
                        <span className="text-xs font-medium text-gray-700 capitalize">
                          {store.store_type}
                        </span>
                      </Td>
                      {/* Contact & Location */}
                      <Td>
                        <div className="space-y-1 text-xs min-w-[160px] max-w-xs">
                          {store.phone && (
                            <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                              <Phone size={12} className="text-gray-400 shrink-0" />
                              <span>{store.phone}</span>
                            </div>
                          )}
                          {store.email && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Mail size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate">{store.email}</span>
                            </div>
                          )}
                          {(store.province || store.district || store.address) && (
                            <div className="flex items-start gap-1.5 text-gray-500 text-[11px]">
                              <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
                              <div className="line-clamp-2">
                                {[store.address, store.district, store.province].filter(Boolean).join(', ')}
                              </div>
                            </div>
                          )}
                          {!store.phone && !store.email && !store.province && !store.district && !store.address && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </Td>
                      {/* Bio & Description */}
                      <Td>
                        <div className="space-y-1 min-w-[160px] max-w-xs text-xs">
                          {store.bio ? (
                            <div className="text-pink-600 font-medium italic line-clamp-1" title={store.bio}>
                              &ldquo;{store.bio}&rdquo;
                            </div>
                          ) : null}
                          {store.description ? (
                            <div className="text-gray-600 line-clamp-2 text-[11px]" title={store.description}>
                              {store.description}
                            </div>
                          ) : null}
                          {!store.bio && !store.description && (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        {store.current_contract ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-gray-900 font-mono">
                                {store.current_contract.contract_number}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditContract(store.current_contract, store.name)}
                                title="Edit Contract"
                                className="p-0.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              >
                                <Edit size={11} />
                              </button>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Exp: {store.current_contract.end_date || 'Ongoing (No expiry)'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No contract</span>
                        )}
                      </Td>
                      <Td>
                        <span className="font-bold text-xs text-gray-900">
                          {store.current_contract?.commission_rate !== undefined &&
                          store.current_contract?.commission_rate !== null
                            ? `${store.current_contract.commission_rate}%`
                            : '5.00%'}
                        </span>
                      </Td>
                      {/* Created By & Date Time */}
                      <Td>
                        <div className="space-y-0.5 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1 text-gray-800 font-semibold">
                            <User size={12} className="text-gray-400 shrink-0" />
                            <span>{store.created_by_name || 'Admin'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Clock size={11} className="text-gray-400 shrink-0" />
                            <span>{store.created_at ? formatDateTime(store.created_at) : '—'}</span>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <StoreStatusSwitch
                            active={store.status === 'active'}
                            disabled={updateStoreMutation.isPending && updateStoreMutation.variables?.id === store.id}
                            onToggle={() => {
                              const nextStatus = store.status === 'active' ? 'inactive' : 'active'
                              updateStoreMutation.mutate({
                                id: store.id,
                                data: { status: nextStatus },
                              })
                            }}
                          />
                          <span className="text-[11px] font-semibold text-gray-500 capitalize">
                            {store.status}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewStore(store)}
                            title="Quick Preview Store"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-pink-600 hover:bg-pink-50 transition"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStaffModalStore(store)}
                            title="Manage Staff & Users"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Users size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(store)}
                            title="Edit Store"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStore(store)}
                            title="Delete Store"
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                          <StoreActionMenu
                            store={store}
                            onPreview={setPreviewStore}
                            onManageStaff={setStaffModalStore}
                            onEdit={handleOpenEdit}
                            onDelete={handleDeleteStore}
                          />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                {!isStoresLoading && filteredStores.length === 0 && (
                  <tr>
                    <td colSpan={11}>
                      <EmptyState message="No stores found. Click 'Add New Store' above to create one." icon={Store} />
                    </td>
                  </tr>
                )}
              </Tbody>
            </Table>
          </div>
        )}

        {/* Tab 2: Partner Inquiries */}
        {activeTab === 'inquiries' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">Inbound Seller Partnership Applications</span>
              <span className="text-xs text-gray-500">Submitted via customer "Sell with Us" form</span>
            </div>

            <Table>
              <Thead>
                <tr>
                  <Th>No</Th>
                  <Th>Business / Brand</Th>
                  <Th>Contact Person</Th>
                  <Th>Phone / Telegram</Th>
                  <Th>Category</Th>
                  <Th>Notes</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {isInquiriesLoading && <LoadingRows cols={8} />}
                {!isInquiriesLoading &&
                  inquiries.map((inq, idx) => (
                    <Tr key={inq.id}>
                      <Td>
                        <span className="text-xs font-semibold text-gray-500">{idx + 1}</span>
                      </Td>
                      <Td>
                        <div className="font-bold text-gray-900">{inq.business_name}</div>
                      </Td>
                      <Td>{inq.contact_person}</Td>
                      <Td>
                        <div className="font-mono text-xs">{inq.phone}</div>
                        {inq.telegram && (
                          <div className="text-[11px] text-blue-600 font-medium">@{inq.telegram.replace('@', '')}</div>
                        )}
                      </Td>
                      <Td>
                        <span className="text-xs text-gray-700">{inq.category}</span>
                      </Td>
                      <Td>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{inq.notes || '—'}</div>
                      </Td>
                      <Td>{getInquiryStatusBadge(inq.status)}</Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          {inq.status === 'new' && (
                            <button
                              type="button"
                              onClick={() => updateInquiryMutation.mutate({ id: inq.id, status: 'contacted' })}
                              className="btn-secondary py-1 px-2 text-xs"
                            >
                              Contacted
                            </button>
                          )}
                          {inq.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewStore((prev) => ({
                                  ...prev,
                                  name: inq.business_name,
                                  code: generateStoreCode(),
                                  slug: inq.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                                  phone: inq.phone,
                                  contract_number: `CTR-${new Date().getFullYear()}-${String(inq.id).padStart(3, '0')}`,
                                }))
                                setIsCreateModalOpen(true)
                              }}
                              className="btn-primary py-1 px-2 text-xs"
                            >
                              + Convert
                            </button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                {!isInquiriesLoading && inquiries.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState message="No partner inquiries yet." icon={Mail} />
                    </td>
                  </tr>
                )}
              </Tbody>
            </Table>
          </div>
        )}

        {/* Tab 3: Contracts */}
        {activeTab === 'contracts' && (
          <Table>
            <Thead>
              <tr>
                <Th>No</Th>
                <Th>Contract #</Th>
                <Th>Store</Th>
                <Th>Period</Th>
                <Th>Days Left</Th>
                <Th>Commission</Th>
                <Th>Bank Account</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </Thead>
            <Tbody>
              {isContractsLoading && <LoadingRows cols={9} />}
              {!isContractsLoading &&
                contracts.map((c, idx) => {
                  const resolvedStoreName =
                    c.store_name ||
                    stores.find((s) => s.id === c.store)?.name ||
                    `Store #${c.store}`

                  return (
                    <Tr key={c.id}>
                      <Td>
                        <span className="text-xs font-semibold text-gray-500">{idx + 1}</span>
                      </Td>
                      <Td>
                        <span className="font-mono text-xs font-bold text-gray-900">{c.contract_number}</span>
                      </Td>
                      <Td>
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>{resolvedStoreName}</span>
                          {c.store_code && (
                            <span className="font-mono text-[10px] text-gray-400 font-normal">({c.store_code})</span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div className="text-xs text-gray-600">
                          {c.start_date} <span className="text-gray-400">to</span>{' '}
                          {c.end_date || <span className="text-green-600 font-semibold">Ongoing</span>}
                        </div>
                      </Td>
                      <Td>
                        {c.end_date ? (
                          <span
                            className={cn(
                              'text-xs font-bold',
                              c.days_remaining <= 30 ? 'text-amber-600' : 'text-gray-700'
                            )}
                          >
                            {c.days_remaining} days
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-green-600">Indefinite</span>
                        )}
                      </Td>
                      <Td>
                        <span className="font-bold text-xs text-pink-600">{c.commission_rate}%</span>
                      </Td>
                      <Td>
                        <div className="text-xs">
                          <div className="font-bold text-gray-900">{c.bank_name}</div>
                          <div className="font-mono text-gray-500">{c.bank_account_number || '—'}</div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <StoreStatusSwitch
                            active={Boolean(c.is_active)}
                            disabled={updateContractMutation.isPending && updateContractMutation.variables?.id === c.id}
                            onToggle={() => {
                              updateContractMutation.mutate({
                                id: c.id,
                                data: { is_active: !c.is_active },
                              })
                            }}
                          />
                          <span className="text-[11px] font-semibold text-gray-500">
                            {c.is_active ? 'Active' : 'Expired'}
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditContract(c, resolvedStoreName)}
                            title="Edit Contract"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              {!isContractsLoading && contracts.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState message="No contracts recorded yet." icon={FileText} />
                  </td>
                </tr>
              )}
            </Tbody>
          </Table>
        )}

        {/* Tab 4: Payouts */}
        {activeTab === 'payouts' && (
          <Table>
            <Thead>
              <tr>
                <Th>No</Th>
                <Th>Payout ID</Th>
                <Th>Store</Th>
                <Th>Period</Th>
                <Th>Gross Sales</Th>
                <Th>Commission</Th>
                <Th>Net Payout</Th>
                <Th>Status</Th>
                <Th>Action</Th>
              </tr>
            </Thead>
            <Tbody>
              {isPayoutsLoading && <LoadingRows cols={9} />}
              {!isPayoutsLoading &&
                payouts.map((p, idx) => (
                  <Tr key={p.id}>
                    <Td>
                      <span className="text-xs font-semibold text-gray-500">{idx + 1}</span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-bold text-gray-900">#{p.id}</span>
                    </Td>
                    <Td>
                      <span className="font-bold text-gray-900">{p.store_name}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-500">
                        {p.period_start} ~ {p.period_end}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold text-gray-700">${p.total_sales}</span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-semibold text-red-600">-${p.commission_deducted}</span>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs font-black text-green-600">${p.net_payout_amount}</span>
                    </Td>
                    <Td>
                      {p.status === 'completed' ? (
                        <Badge variant="success" dot>Settled</Badge>
                      ) : (
                        <Badge variant="warning" dot>Pending</Badge>
                      )}
                    </Td>
                    <Td>
                      {p.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => settlePayoutMutation.mutate({ id: p.id, notes: 'Paid via ABA' })}
                          className="btn-primary py-1 px-2.5 text-xs"
                        >
                          Mark Paid
                        </button>
                      )}
                    </Td>
                  </Tr>
                ))}
              {!isPayoutsLoading && payouts.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <EmptyState message="No pending settlements." icon={DollarSign} />
                  </td>
                </tr>
              )}
            </Tbody>
          </Table>
        )}

        {/* Tab 5: Product Approvals & Store Name Approvals Queue */}
        {activeTab === 'approvals' && (
          <div>
            {/* Store Name Change Requests Queue */}
            {pendingNameChangeStores.length > 0 && (
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50/60 via-white to-amber-50/40">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shrink-0">
                      <Building2 size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <span>Store Name Change Requests</span>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                          {pendingNameChangeStores.length} Pending Review
                        </span>
                      </h3>
                      <p className="text-xs text-gray-500">
                        Store owners requested a new store name. Review and approve before updating live on the website.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingNameChangeStores.map((st) => (
                    <div
                      key={st.id}
                      className="rounded-xl border border-purple-100 bg-white p-4 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center font-bold text-purple-700 shrink-0 overflow-hidden">
                          {st.logo ? (
                            <img src={st.logo} alt={st.name} className="w-full h-full object-cover" />
                          ) : (
                            st.name?.[0]?.toUpperCase() || 'S'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-gray-400 line-through truncate max-w-[120px]">{st.name}</span>
                            <span className="text-xs text-gray-400">➔</span>
                            <span className="text-sm font-bold text-gray-900 truncate">"{st.pending_name}"</span>
                          </div>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                            Code: {st.code} • Status: {st.status}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={approveNameMutation.isPending}
                          onClick={() => handleApproveNameChange(st.id)}
                          className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={rejectNameMutation.isPending}
                          onClick={() => openRejectNameChangeModal(st)}
                          className="btn-secondary text-xs text-red-600 hover:bg-red-50 px-3 py-1.5"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Table>
              <Thead>
                <tr>
                  <Th>No</Th>
                  <Th>Product</Th>
                  <Th>Store Partner</Th>
                  <Th>Category / Code</Th>
                  <Th>Retail Price</Th>
                  <Th>Cost / Wholesale</Th>
                  <Th>Stock</Th>
                  <Th>Submitted</Th>
                  <Th>Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {isPendingProductsLoading && <LoadingRows cols={9} />}
                {!isPendingProductsLoading &&
                  pendingProducts.map((p, idx) => (
                    <Tr key={p.id}>
                      <Td>
                        <span className="text-xs font-semibold text-gray-500">{idx + 1}</span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                            {p.primary_image || (p.images && p.images[0]?.image) ? (
                              <img
                                src={p.primary_image || p.images[0]?.image}
                                alt={p.name}
                                className="w-full h-full object-contain bg-white p-1"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package size={16} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate max-w-xs">{p.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{p.code}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 text-xs">{p.store_name || '—'}</span>
                          {p.store_verified && (
                            <ShieldCheck size={13} className="text-blue-500 shrink-0" title="Verified Store" />
                          )}
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {p.category_name || 'General'}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-bold text-xs text-pink-600 font-mono">
                          {formatCurrency(p.retail_price)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs text-gray-600 font-mono">
                          {p.cost_price ? formatCurrency(p.cost_price) : formatCurrency(p.wholesale_price)}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-xs font-bold text-gray-800">{p.current_stock ?? 0}</span>
                      </Td>
                      <Td>
                        <span className="text-xs text-gray-500">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => approveProductMutation.mutate(p.id)}
                            disabled={approveProductMutation.isPending}
                            className="btn-primary py-1 px-2.5 text-xs flex items-center gap-1 bg-green-600 hover:bg-green-700 border-green-600"
                            title="Approve and make live"
                          >
                            <Check size={13} />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectModal({ isOpen: true, product: p, reason: '' })}
                            disabled={rejectProductMutation.isPending}
                            className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 text-red-600 hover:bg-red-50 border-red-200"
                            title="Reject product"
                          >
                            <ThumbsDown size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                {!isPendingProductsLoading && pendingProducts.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        message="All vendor products are approved! No items in the review queue."
                        icon={PackageCheck}
                      />
                    </td>
                  </tr>
                )}
              </Tbody>
            </Table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          CREATE STORE & CONTRACT MODAL (Shadow Shop Standard Modal)
      ══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Store & Contract"
        size="xl"
        className="max-w-4xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createStoreMutation.mutate(newStore)
          }}
          className="space-y-5 p-6 max-h-[82vh] overflow-y-auto"
        >
          {/* Top Store Branding: Cover & Profile */}
          <StoreBrandingHeader
            logoPreview={newStore.logoPreview}
            bannerPreview={newStore.bannerPreview}
            storeName={newStore.name}
            storeCode={newStore.code}
            isVerified={newStore.is_verified}
            onPreviewImage={(src, title) => setImagePreview({ isOpen: true, src, title })}
            onSelectLogo={(file) => {
              setNewStore((prev) => ({
                ...prev,
                logoFile: file,
                logoPreview: URL.createObjectURL(file),
              }))
            }}
            onClearLogo={() => {
              setNewStore((prev) => ({
                ...prev,
                logoFile: null,
                logoPreview: null,
              }))
            }}
            onSelectBanner={(file) => {
              setNewStore((prev) => ({
                ...prev,
                bannerFile: file,
                bannerPreview: URL.createObjectURL(file),
              }))
            }}
            onClearBanner={() => {
              setNewStore((prev) => ({
                ...prev,
                bannerFile: null,
                bannerPreview: null,
              }))
            }}
          />

          {/* Section 1: Store Details */}
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              1. Store Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Name *</label>
                <input
                  type="text"
                  required
                  value={newStore.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setNewStore((prev) => ({
                      ...prev,
                      name: val,
                      code: prev.code || generateStoreCode(),
                      slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    }))
                  }}
                  placeholder="e.g. Acme Cosmetics"
                  className="input-field"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Store Code *</label>
                  <button
                    type="button"
                    onClick={() => setNewStore((prev) => ({ ...prev, code: generateStoreCode() }))}
                    className="text-[11px] font-bold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} />
                    <span>Auto Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newStore.code}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="Auto (e.g. STR-001)"
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Slug (/store/:slug) *</label>
                <input
                  type="text"
                  value={newStore.slug}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="e.g. acme-cosmetics"
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Type</label>
                <select
                  value={newStore.store_type}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, store_type: e.target.value }))}
                  className="select-field"
                >
                  <option value="retail">Retail Shop</option>
                  <option value="partner">Contracted Partner</option>
                  <option value="branch">Company Branch</option>
                  <option value="wholesale">Wholesale / Supplier</option>
                  <option value="brand">Official Brand</option>
                  <option value="distributor">Distributor</option>
                  <option value="warehouse">Warehouse Hub</option>
                </select>
              </div>
            </div>

            {/* Verified Store Partner checkbox (Not auto-verified, false by default) */}
            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(newStore.is_verified)}
                  onChange={(e) =>
                    setNewStore((prev) => ({
                      ...prev,
                      is_verified: e.target.checked,
                    }))
                  }
                  className="rounded text-pink-600 focus:ring-pink-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-blue-500" />
                  Verified Store Partner
                </span>
              </label>
            </div>
          </div>

          {canManageHomepage && <StoreHomepageSettings idPrefix="create-store" value={newStore} onChange={(patch) => setNewStore((previous) => ({ ...previous, ...patch }))} />}

          {/* Section 2: Contact & Location */}
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              2. Contact & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newStore.phone}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g. 012 345 678"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newStore.email}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="store@example.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Province / City</label>
                <input
                  type="text"
                  value={newStore.province}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, province: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">District / Khan</label>
                <input
                  type="text"
                  value={newStore.district}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, district: e.target.value }))}
                  placeholder="e.g. Chamkar Mon"
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">Detailed Address</label>
              <textarea
                rows={2}
                value={newStore.address}
                onChange={(e) => setNewStore((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street address, building, floor, room..."
                className="input-field"
              />
            </div>
          </div>

          {/* Section 3: Store Bio & Description */}
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              3. Store Bio & Description
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bio / Tagline</label>
                <input
                  type="text"
                  value={newStore.bio}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Short tagline or slogan for your store"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={newStore.description}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed information about the store, products, and services..."
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Contract & Financial Terms */}
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-3 flex items-center gap-1.5">
              <FileText size={14} />
              <span>4. Contract & Financial Terms</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">Contract # (Auto)</label>
                  <button
                    type="button"
                    onClick={() => setNewStore((prev) => ({ ...prev, contract_number: generateContractNumber() }))}
                    className="text-[11px] font-bold text-pink-600 hover:text-pink-700 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} />
                    <span>Auto Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newStore.contract_number}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, contract_number: e.target.value }))}
                  placeholder="Auto (e.g. CTR-2026-4892)"
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={newStore.contract_start_date}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, contract_start_date: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  End Date <span className="text-gray-400 font-normal">(Leave blank for ongoing)</span>
                </label>
                <input
                  type="date"
                  value={newStore.contract_end_date}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, contract_end_date: e.target.value }))}
                  className="input-field"
                  placeholder="Blank for ongoing"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newStore.commission_rate}
                  onChange={(e) =>
                    setNewStore((prev) => ({
                      ...prev,
                      commission_rate: e.target.value === '' ? '' : parseFloat(e.target.value),
                    }))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Vendor Bank Name</label>
                <input
                  type="text"
                  value={newStore.bank_name}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, bank_name: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ABA Account #</label>
                <input
                  type="text"
                  value={newStore.bank_account_number}
                  onChange={(e) => setNewStore((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                  placeholder="000 123 456"
                  className="input-field font-mono"
                />
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStoreMutation.isPending}
              className="btn-primary"
            >
              {createStoreMutation.isPending ? 'Saving...' : 'Save & Activate Store'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          REJECT PRODUCT MODAL (Option B)
      ══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, product: null, reason: '' })}
        title="Reject Vendor Product"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-red-50 p-3.5 border border-red-100 flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-red-800">
              <p className="font-bold">You are rejecting this product submission:</p>
              <p className="mt-0.5 text-red-700 font-medium">
                "{rejectModal.product?.name}" from <span className="font-bold">{rejectModal.product?.store_name}</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              className="input-field text-sm"
              placeholder="Explain to the vendor what needs to be changed or why this item cannot be listed..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Product images are unclear or low resolution',
                'Incomplete specifications or description',
                'Price or stock count appears incorrect',
                'Prohibited or unverified brand item',
              ].map((msg) => (
                <button
                  key={msg}
                  type="button"
                  onClick={() => setRejectModal((prev) => ({ ...prev, reason: msg }))}
                  className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition font-medium"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setRejectModal({ isOpen: false, product: null, reason: '' })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={rejectProductMutation.isPending}
              onClick={() => {
                if (!rejectModal.product) return
                rejectProductMutation.mutate(
                  {
                    id: rejectModal.product.id,
                    reason: rejectModal.reason.trim() || 'Product does not meet store criteria.',
                  },
                  {
                    onSuccess: () => {
                      setRejectModal({ isOpen: false, product: null, reason: '' })
                    },
                  }
                )
              }}
              className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 text-white"
            >
              {rejectProductMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          EDIT STORE MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={editStoreModal.isOpen}
        onClose={() => setEditStoreModal((prev) => ({ ...prev, isOpen: false }))}
        title={`Edit Store: ${editStoreModal.store?.name || ''}`}
        size="xl"
        className="max-w-4xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateStoreMutation.mutate({
              id: editStoreModal.store.id,
              data: editStoreModal.form,
            })
          }}
          className="space-y-5 p-6 max-h-[82vh] overflow-y-auto"
        >
          {/* Top Store Branding: Cover & Profile */}
          <StoreBrandingHeader
            logoPreview={editStoreModal.form?.logoPreview}
            bannerPreview={editStoreModal.form?.bannerPreview}
            storeName={editStoreModal.form?.name}
            storeCode={editStoreModal.form?.code}
            isVerified={editStoreModal.form?.is_verified}
            onPreviewImage={(src, title) => setImagePreview({ isOpen: true, src, title })}
            onSelectLogo={(file) => {
              setEditStoreModal((prev) => ({
                ...prev,
                form: {
                  ...prev.form,
                  logoFile: file,
                  logoPreview: URL.createObjectURL(file),
                  clearLogo: false,
                },
              }))
            }}
            onClearLogo={() => {
              setEditStoreModal((prev) => ({
                ...prev,
                form: {
                  ...prev.form,
                  logoFile: null,
                  logoPreview: null,
                  clearLogo: true,
                },
              }))
            }}
            onSelectBanner={(file) => {
              setEditStoreModal((prev) => ({
                ...prev,
                form: {
                  ...prev.form,
                  bannerFile: file,
                  bannerPreview: URL.createObjectURL(file),
                  clearBanner: false,
                },
              }))
            }}
            onClearBanner={() => {
              setEditStoreModal((prev) => ({
                ...prev,
                form: {
                  ...prev.form,
                  bannerFile: null,
                  bannerPreview: null,
                  clearBanner: true,
                },
              }))
            }}
          />

          {/* Section 1: Store Information */}
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              1. Store Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Name *</label>
                <input
                  type="text"
                  required
                  value={editStoreModal.form?.name || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, name: e.target.value },
                    }))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Code *</label>
                <input
                  type="text"
                  required
                  value={editStoreModal.form?.code || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, code: e.target.value },
                    }))
                  }
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Slug *</label>
                <input
                  type="text"
                  required
                  value={editStoreModal.form?.slug || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, slug: e.target.value },
                    }))
                  }
                  className="input-field font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Type</label>
                <select
                  value={editStoreModal.form?.store_type || 'retail'}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, store_type: e.target.value },
                    }))
                  }
                  className="select-field"
                >
                  <option value="retail">Retail Shop</option>
                  <option value="partner">Contracted Partner</option>
                  <option value="branch">Company Branch</option>
                  <option value="wholesale">Wholesale / Supplier</option>
                  <option value="brand">Official Brand</option>
                  <option value="distributor">Distributor</option>
                  <option value="warehouse">Warehouse Hub</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editStoreModal.form?.is_verified)}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, is_verified: e.target.checked },
                    }))
                  }
                  className="rounded text-pink-600 focus:ring-pink-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-blue-500" />
                  Verified Store Partner
                </span>
              </label>
            </div>
          </div>

          {canManageHomepage && <StoreHomepageSettings idPrefix="edit-store" value={editStoreModal.form} onChange={(patch) => setEditStoreModal((previous) => ({ ...previous, form: { ...previous.form, ...patch } }))} />}

          {/* Section 2: Contact & Location */}
          <div className="border-b border-gray-100 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              2. Contact & Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editStoreModal.form?.phone || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, phone: e.target.value },
                    }))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editStoreModal.form?.email || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, email: e.target.value },
                    }))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Province / City</label>
                <input
                  type="text"
                  value={editStoreModal.form?.province || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, province: e.target.value },
                    }))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">District / Khan</label>
                <input
                  type="text"
                  value={editStoreModal.form?.district || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, district: e.target.value },
                    }))
                  }
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">Detailed Address</label>
              <textarea
                rows={2}
                value={editStoreModal.form?.address || ''}
                onChange={(e) =>
                  setEditStoreModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, address: e.target.value },
                  }))
                }
                className="input-field"
              />
            </div>
          </div>

          {/* Section 3: Bio & Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              3. Store Bio & Description
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Bio / Tagline</label>
                <input
                  type="text"
                  value={editStoreModal.form?.bio || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, bio: e.target.value },
                    }))
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={editStoreModal.form?.description || ''}
                  onChange={(e) =>
                    setEditStoreModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, description: e.target.value },
                    }))
                  }
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setEditStoreModal((prev) => ({ ...prev, isOpen: false }))}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStoreMutation.isPending}
              className="btn-primary"
            >
              {updateStoreMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══════════════════════════════════════════════════════════
          STORE QUICK PREVIEW MODAL
      ══════════════════════════════════════════════════════════ */}
      <StoreQuickPreviewModal
        isOpen={Boolean(previewStore)}
        onClose={() => setPreviewStore(null)}
        store={previewStore}
        onPreviewImage={(src, title) => setImagePreview({ isOpen: true, src, title })}
        onEdit={(st) => {
          setPreviewStore(null)
          handleOpenEdit(st)
        }}
        onEditContract={(contract, storeName) => {
          setPreviewStore(null)
          handleOpenEditContract(contract, storeName)
        }}
        onManageStaff={(st) => {
          setPreviewStore(null)
          setStaffModalStore(st)
        }}
      />

      {/* ══════════════════════════════════════════════════════════
          STORE STAFF & USER ASSIGNMENT MODAL
      ══════════════════════════════════════════════════════════ */}
      <StoreStaffModal
        isOpen={Boolean(staffModalStore)}
        onClose={() => setStaffModalStore(null)}
        store={staffModalStore}
        onAssignedChanged={() => {
          queryClient.invalidateQueries({ queryKey: ['stores-admin-list'] })
        }}
      />

      {/* ══════════════════════════════════════════════════════════
          EDIT CONTRACT MODAL
      ══════════════════════════════════════════════════════════ */}
      <EditContractModal
        isOpen={editContractModal.isOpen}
        onClose={() => setEditContractModal({ isOpen: false, contract: null, storeName: '' })}
        contract={editContractModal.contract}
        storeName={editContractModal.storeName}
        onSubmit={updateContractMutation.mutate}
        isPending={updateContractMutation.isPending}
      />

      {/* ══════════════════════════════════════════════════════════
          IMAGE LIGHTBOX PREVIEW MODAL
      ══════════════════════════════════════════════════════════ */}
      <ImagePreviewModal
        isOpen={imagePreview.isOpen}
        onClose={() => setImagePreview({ isOpen: false, src: '', title: '' })}
        src={imagePreview.src}
        title={imagePreview.title}
      />

      {/* ══════════════════════════════════════════════════════════
          REJECT STORE NAME CHANGE MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={rejectNameModal.isOpen}
        onClose={() => setRejectNameModal({ isOpen: false, store: null, reason: '' })}
        title="Reject Store Name Change"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You are rejecting the requested name <strong className="text-gray-900">"{rejectNameModal.store?.pending_name}"</strong> for <strong className="text-gray-900">{rejectNameModal.store?.name}</strong>.
          </p>
          <div>
            <label className="label text-xs font-bold text-gray-700">Reason for Rejection *</label>
            <textarea
              rows={3}
              className="input-field text-sm"
              placeholder="Explain to the store owner why this name was rejected (e.g. contains trademarked terms, violates naming policies)..."
              value={rejectNameModal.reason}
              onChange={(e) => setRejectNameModal((prev) => ({ ...prev, reason: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setRejectNameModal({ isOpen: false, store: null, reason: '' })}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={rejectNameMutation.isPending}
              onClick={() => {
                if (!rejectNameModal.store) return
                rejectNameMutation.mutate({
                  id: rejectNameModal.store.id,
                  reason: rejectNameModal.reason.trim() || 'Name change was rejected by website administrator.',
                })
              }}
              className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 text-white"
            >
              {rejectNameMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {ConfirmDialog}
    </div>
  )
}
