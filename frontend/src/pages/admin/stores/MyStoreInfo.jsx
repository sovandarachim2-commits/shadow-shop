import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Building2, Clock, ExternalLink, Eye, Globe, Loader2, Mail, MapPin, Pencil, Phone, ShieldCheck, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { storesApi } from '@/api/stores'
import { CAMBODIA_PROVINCES } from '@/utils/cambodiaProvinces'
import useAuthStore from '@/store/authStore'
import StoreInformationEditor from './StoreInformationEditor'

const STORE_TYPES = {
  partner: 'Contracted Partner', branch: 'Company Branch', retail: 'Retail Outlet',
  warehouse: 'Warehouse Hub', online: 'Online Store',
}
const STATUS_LABELS = {
  draft: 'Draft', pending_contract: 'Pending Contract', setup_in_progress: 'Setup in Progress',
  active: 'Active Store', inactive: 'Inactive', expiring_soon: 'Expiring Soon',
  expired: 'Expired', suspended: 'Suspended', closed: 'Closed',
}

function Detail({ label, icon: Icon, children }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {Icon && <Icon size={17} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />}
      <div className="min-w-0"><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1.5 break-words text-sm leading-6 text-gray-800">{children || <span className="text-gray-400">Not provided</span>}</dd></div>
    </div>
  )
}

export default function MyStoreInfo() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const isAdmin = ['super_admin', 'admin'].includes(currentUser?.role)
  const [isEditing, setIsEditing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)
  const { data: store, isLoading, error, refetch } = useQuery({
    queryKey: ['my-store-info'],
    queryFn: () => storesApi.admin.getMyStore().then((response) => response.data),
  })

  useEffect(() => {
    if (!previewImage) return undefined
    const closePreview = (event) => { if (event.key === 'Escape') setPreviewImage(null) }
    document.addEventListener('keydown', closePreview)
    return () => document.removeEventListener('keydown', closePreview)
  }, [previewImage])

  const cancelNameChange = useMutation({
    mutationFn: () => {
      const payload = new FormData()
      payload.append('cancel_name_change', '1')
      return storesApi.admin.updateMyStore(payload)
    },
    onSuccess: (response) => {
      queryClient.setQueryData(['my-store-info'], response.data)
      queryClient.invalidateQueries({ queryKey: ['admin-stores'] })
      toast.success('Name change request cancelled.')
    },
    onError: () => toast.error('Could not cancel the name change request.'),
  })

  if (isLoading) return <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-gray-500" role="status"><Loader2 size={22} className="animate-spin text-purple-600" />Loading store information...</div>
  if (error || !store) {
    const unassigned = error?.response?.status === 404
    return <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center"><AlertCircle size={34} className="mx-auto text-amber-500" /><h2 className="mt-4 text-lg font-semibold text-gray-900">{unassigned ? 'No Store Assigned' : 'Could Not Load Store Information'}</h2><p className="mt-2 text-sm leading-6 text-gray-500">{unassigned ? 'Your account is not assigned to an active store. Contact your administrator for access.' : 'Please try loading your store again.'}</p>{!unassigned && <button type="button" onClick={() => refetch()} className="btn-secondary mt-4">Try Again</button>}</div>
  }

  const province = CAMBODIA_PROVINCES.find((item) => item.key === store.province)?.label || store.province || ''
  const location = [store.district, province].filter(Boolean).join(', ')
  const publicPath = store.slug ? `/stores/${encodeURIComponent(store.slug)}` : ''
  const statusVariant = store.status === 'active' ? 'success' : ['expired', 'suspended', 'closed'].includes(store.status) ? 'danger' : 'default'

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 pb-4">
      <PageHeader title="Store Information" subtitle="Your branding, store details, and contact information." actions={
        <>
          {publicPath && <a href={publicPath} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2"><ExternalLink size={15} /> View Public Store</a>}
          <button type="button" onClick={() => setIsEditing(true)} disabled={cancelNameChange.isPending} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Pencil size={15} /> Edit Store</button>
        </>
      } />

      <section aria-labelledby="store-profile-name" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <button type="button" disabled={!store.banner} aria-label="Preview store banner" onClick={() => setPreviewImage({ src: store.banner, title: `${store.name} — Banner` })} className="relative block h-32 w-full overflow-hidden bg-gray-100 text-gray-300 sm:h-44">
          {store.banner ? <><img src={store.banner} alt="" className="h-full w-full object-cover" /><span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs font-medium text-gray-600"><Eye size={13} aria-hidden="true" /> View Banner</span></> : <Store size={36} className="mx-auto" aria-hidden="true" />}
        </button>
        <div className="relative px-5 pb-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <button type="button" disabled={!store.logo} aria-label="Preview store logo" onClick={() => setPreviewImage({ src: store.logo, title: `${store.name} — Logo` })} className="relative -mt-8 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-sm">
                {store.logo ? <img src={store.logo} alt="" className="h-full w-full object-contain" /> : <span className="text-2xl font-semibold text-purple-600">{store.name[0]?.toUpperCase() || 'S'}</span>}
              </button>
              <div className="min-w-0 pt-4">
                <div className="flex flex-wrap items-center gap-2"><h2 id="store-profile-name" className="break-words text-xl font-semibold leading-7 tracking-tight text-gray-900 sm:text-2xl">{store.name}</h2>{store.is_verified && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"><ShieldCheck size={12} aria-hidden="true" /> Verified</span>}</div>
                {store.bio && <p className="mt-1 break-words text-sm leading-6 text-gray-500">{store.bio}</p>}
              </div>
            </div>
            <Badge variant={statusVariant} className="w-fit shrink-0">{STATUS_LABELS[store.status] || store.status}</Badge>
          </div>
        </div>
      </section>

      {store.name_change_status === 'pending' && (
        <section role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5"><Clock size={18} className="mt-0.5 shrink-0 text-amber-600" /><div><h3 className="text-sm font-semibold text-amber-900">Store Name Under Review</h3><p className="mt-1 text-sm leading-6 text-amber-800">Requested name: <strong>{store.pending_name}</strong>. Your current name appears until approval.</p></div></div>
          {isAdmin ? <Link to="/admin/stores" className="shrink-0 text-sm font-semibold text-amber-900 underline">Review Request</Link> : <button type="button" disabled={cancelNameChange.isPending} onClick={() => cancelNameChange.mutate()} className="min-h-10 shrink-0 rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50">{cancelNameChange.isPending ? 'Cancelling...' : 'Cancel Request'}</button>}
        </section>
      )}
      {store.name_change_status === 'rejected' && <div role="status" className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="text-sm font-semibold text-red-800">Store Name Request Rejected</p><p className="mt-1 text-sm leading-6 text-red-700">{store.name_change_note || 'You can enter a different name in Edit Store and submit a new request.'}</p></div>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="store-details-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 id="store-details-title" className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900"><Building2 size={18} className="text-purple-600" aria-hidden="true" />Store Details</h3>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Store Code">{store.code}</Detail>
            <Detail label="Store Type">{STORE_TYPES[store.store_type] || store.store_type}</Detail>
            <div className="sm:col-span-2"><Detail label="Store Link" icon={Globe}>{publicPath && <a href={publicPath} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1.5 text-purple-700 hover:underline"><span className="break-all">{publicPath}</span><ExternalLink size={13} className="mt-1 shrink-0" aria-hidden="true" /></a>}</Detail></div>
          </dl>
          <div className="mt-5 border-t border-gray-100 pt-5"><h4 className="text-xs font-medium text-gray-500">About This Store</h4><p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-gray-700">{store.description || 'Add a description in Edit Store so customers can learn about your business and products.'}</p></div>
        </section>
        <section aria-labelledby="store-contact-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h3 id="store-contact-title" className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900"><MapPin size={18} className="text-purple-600" aria-hidden="true" />Contact &amp; Location</h3>
          <dl className="space-y-5">
            <Detail label="Phone Number" icon={Phone}>{store.phone && <a href={`tel:${store.phone.replace(/\s+/g, '')}`} className="hover:text-purple-700">{store.phone}</a>}</Detail>
            <Detail label="Email Address" icon={Mail}>{store.email && <a href={`mailto:${store.email}`} className="break-all hover:text-purple-700">{store.email}</a>}</Detail>
            <Detail label="Location" icon={MapPin}>{location}</Detail>
            <Detail label="Detailed Address"><span className="whitespace-pre-line">{store.address || 'Not provided'}</span></Detail>
          </dl>
        </section>
      </div>

      {isEditing && <StoreInformationEditor store={store} isAdmin={isAdmin} onClose={() => setIsEditing(false)} />}
      <Modal isOpen={Boolean(previewImage)} onClose={() => setPreviewImage(null)} title={previewImage?.title || 'Store Image'} size="xl">
        {previewImage && <img src={previewImage.src} alt={previewImage.title} className="max-h-[70vh] w-full bg-gray-50 p-4 object-contain" />}
      </Modal>
    </div>
  )
}
