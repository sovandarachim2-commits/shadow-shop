import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, Home, MapPin,
  Pencil, Plus, Search, Star,
  Trash2, User, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import { formatAddressRecordKhmer, formatAddressLocationKhmer } from '@/utils/addressHelpers'
import { getUserContactDefaults } from '@/utils/helpers'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { AddressForm } from '@/components/address/AddressFormModal'

function DesktopAddressCard({ addr, onEdit, onDelete, onDefault, defaultPending }) {
  const { t } = useTranslation()
  const label = addr.label || t('addressBook.other')
  const Icon = label.toLowerCase().includes('home') ? Home : MapPin

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
          <Icon size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-pink-50 px-2.5 py-0.5 text-xs font-black uppercase text-pink-600">{label}</span>
                {addr.is_default && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-0.5 text-xs font-black text-green-600">
                    <Star size={11} className="fill-green-600" /> {t('addressBook.default')}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold leading-snug text-gray-950" style={{ fontFamily: KHMER_FONT_FAMILY }}>
                {formatAddressRecordKhmer(addr) || addr.address_line1 || '-'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5"><User size={13} /> {addr.full_name}</span>
                <span>{addr.phone}</span>
              </div>
            </div>
            {!addr.is_default && (
              <button
                onClick={() => onDefault(addr.id)}
                disabled={defaultPending}
                className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-black text-pink-600 transition hover:border-pink-300 hover:bg-pink-100 disabled:opacity-60"
              >
                <Star size={14} /> {t('addressBook.setAsDefault')}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button onClick={() => onEdit(addr)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-pink-500 px-4 py-2 text-sm font-black text-pink-600">
              <Pencil size={14} /> {t('addressBook.edit')}
            </button>
            <button onClick={() => onDelete(addr)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-black text-gray-600">
              <Trash2 size={14} /> {t('addressBook.delete')}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── AddressBook page ────────────────────────────────────────────────────────
export default function AddressBook() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const defaultContact = useMemo(() => getUserContactDefaults(user), [user])
  const returnTo = ['/cart', '/checkout'].includes(location.state?.from) ? location.state.from : ''
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirm, ConfirmDialog] = useConfirm()

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => authApi.addresses.list().then((r) => r.data.results ?? r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing ? authApi.addresses.update(editing.id, payload) : authApi.addresses.create(payload),
    onSuccess: () => {
      qc.invalidateQueries(['my-addresses'])
      toast.success(editing ? t('addressBook.toast.updated') : t('addressBook.toast.saved'))
      setShowForm(false)
      setEditing(null)
      if (returnTo) navigate(returnTo, { replace: true })
    },
    onError: (error) => {
      const phoneError = error?.response?.data?.phone?.[0]
      toast.error(phoneError || t('addressBook.toast.saveFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => authApi.addresses.delete(id),
    onSuccess: () => { qc.invalidateQueries(['my-addresses']); toast.success(t('addressBook.toast.removed')) },
    onError: () => toast.error(t('addressBook.toast.deleteFailed')),
  })

  const defaultMutation = useMutation({
    mutationFn: (id) => authApi.addresses.setDefault(id),
    onSuccess: () => { qc.invalidateQueries(['my-addresses']); toast.success(t('addressBook.toast.defaultUpdated')) },
    onError: () => toast.error(t('addressBook.toast.defaultFailed')),
  })

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (addr) => { setEditing(addr); setShowForm(true) }
  const removeAddress = async (addr) => {
    if (await confirm(t('addressBook.confirmRemove'), t('addressBook.confirmRemoveBody'))) deleteMutation.mutate(addr.id)
  }
  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1440px] lg:block">
        <main className="min-w-0 flex-1 p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-950">{t('addressBook.myAddresses')}</h1>
              <p className="mt-1 text-sm text-gray-500">{t('addressBook.subtitle')}</p>
            </div>
            <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-black text-white shadow-sm shadow-pink-100 transition hover:bg-pink-700">
              <Plus size={16} /> {t('addressBook.addNew')}
            </button>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_330px]">
            <section className="space-y-6">
              {isLoading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100" />)
              ) : addresses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-24 text-center">
                  <MapPin size={42} className="mx-auto text-pink-300" />
                  <p className="mt-4 text-lg font-black text-gray-700">{t('addressBook.noAddresses')}</p>
                  <button onClick={openNew} className="mt-5 rounded-xl bg-pink-600 px-6 py-3 text-sm font-black text-white">{t('addressBook.add')}</button>
                </div>
              ) : (
                addresses.map((addr) => (
                  <DesktopAddressCard
                    key={addr.id}
                    addr={addr}
                    onEdit={openEdit}
                    onDelete={removeAddress}
                    onDefault={(id) => defaultMutation.mutate(id)}
                    defaultPending={defaultMutation.isPending}
                  />
                ))
              )}
            </section>

            <aside className="h-fit min-h-[270px] rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50 p-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                <MapPin size={36} />
              </div>
              <h2 className="mt-8 text-2xl font-black text-pink-600">{t('addressBook.needHelp')}</h2>
              <p className="mt-5 text-lg font-semibold leading-8 text-gray-600">{t('addressBook.maxAddresses')}</p>
            </aside>
          </div>
        </main>
      </div>

      <div className="mx-auto min-h-screen max-w-lg bg-white lg:hidden">

      {/* Header */}
      <div className="grid min-h-[64px] grid-cols-[44px_1fr_auto] items-center gap-3 border-b border-gray-100 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button onClick={() => navigate(returnTo || '/profile')} className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-800 active:scale-95">
          <ChevronLeft size={22} />
        </button>
        <h1 className="min-w-0 truncate text-center text-base font-black text-gray-950">{t('addressBook.title')}</h1>
        <div className="flex items-center justify-end gap-2">
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-500 active:scale-95"><Search size={19} /></button>
          <button onClick={openNew} className="h-11 rounded-full bg-pink-600 px-4 text-sm font-black text-white shadow-sm shadow-pink-100 active:scale-95">{t('addressBook.add')}</button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-1 px-4 pt-4">
          {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
            <MapPin size={28} className="text-pink-400" />
          </div>
          <p className="font-semibold text-gray-800">{t('addressBook.noAddresses')}</p>
          <p className="mt-1 text-sm text-gray-400">{t('addressBook.noAddressesHint')}</p>
          <button
            onClick={openNew}
            className="mt-6 rounded-full bg-pink-600 px-8 py-3 text-sm font-semibold text-white hover:bg-pink-700"
          >
            {t('addressBook.add')}
          </button>
        </div>
      ) : (
        <div>
          {addresses.map((addr) => (
            <div key={addr.id} className="border-b border-gray-100 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-snug text-gray-900" style={{ fontFamily: KHMER_FONT_FAMILY }}>
                    {formatAddressRecordKhmer(addr) || addr.address_line1 || '-'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-700">{addr.full_name}</span>
                    <span className="text-sm text-gray-500">{addr.phone}</span>
                    {addr.is_default && (
                      <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[11px] font-semibold text-pink-600">
                        {t('addressBook.default')}
                      </span>
                    )}
                  </div>
                  {!addr.is_default && (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        onClick={() => defaultMutation.mutate(addr.id)}
                        disabled={defaultMutation.isPending}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-600 active:scale-95 disabled:opacity-50"
                      >
                        <Star size={12} /> {t('addressBook.setAsDefaultShort')}
                      </button>
                      <button
                        onClick={() => removeAddress(addr)}
                        className="rounded-full px-2 py-1.5 text-xs font-semibold text-gray-400 underline-offset-2 hover:text-red-500 hover:underline"
                      >
                        {t('addressBook.remove')}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEdit(addr)}
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-pink-300 hover:text-pink-600"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          ))}
          <p className="py-8 text-center text-sm text-gray-400">{t('addressBook.endOfList')}</p>
        </div>
      )}

      </div>

      {showForm && (
        <AddressForm
          address={editing}
          defaultContact={defaultContact}
          isFirstAddress={!editing && addresses.length === 0}
          onSave={(payload) => saveMutation.mutate(payload)}
          onClose={() => { setShowForm(false); setEditing(null) }}
          isSaving={saveMutation.isPending}
        />
      )}
      {ConfirmDialog}
    </>
  )
}
