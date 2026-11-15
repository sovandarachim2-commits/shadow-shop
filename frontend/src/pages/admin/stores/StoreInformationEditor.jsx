import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Building2, Clock, Eye, Image, Loader2, MapPin, Save, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { storesApi } from '@/api/stores'
import { CAMBODIA_PROVINCES } from '@/utils/cambodiaProvinces'

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100'

function useImagePreview(file, savedUrl) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    if (!file) { setPreview(''); return undefined }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return preview || savedUrl || ''
}

function Field({ id, label, children, wide = false }) {
  return <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}><label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</label>{children}</div>
}

function BrandingUpload({ kind, src, fallback, onChange, onPreview }) {
  const [dimensions, setDimensions] = useState(null)
  const isLogo = kind === 'logo'
  const label = isLogo ? 'Logo' : 'Banner'
  const currentDimensions = dimensions?.src === src ? dimensions : null

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <h4 className="mb-3 text-xs font-semibold text-gray-700">Store {label}</h4>
      <button
        type="button"
        disabled={!src}
        aria-label={`Preview store ${kind} at full size`}
        onClick={() => onPreview({ src, title: `${label} Preview`, dimensions: currentDimensions })}
        className={`group relative flex items-center justify-center overflow-hidden border border-gray-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${isLogo ? 'mx-auto h-28 w-28 shrink-0 rounded-full' : 'aspect-[8/3] w-full rounded-lg'}`}
      >
        {src ? <>
          <img src={src} alt={`Store ${kind} preview`} onLoad={(event) => setDimensions({ src, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} className={`h-full w-full ${isLogo ? 'object-contain' : 'object-cover'}`} />
          <span className={`absolute inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm group-hover:text-purple-700 ${isLogo ? 'bottom-1 left-1/2 -translate-x-1/2' : 'bottom-2 right-2'}`}><Eye size={13} aria-hidden="true" />Preview</span>
        </> : <span className="px-3 text-center text-xs text-gray-400">{isLogo ? fallback : 'No banner uploaded'}</span>}
      </button>
      <p className="mt-2 min-h-4 text-center text-[11px] text-gray-500">{currentDimensions ? `${currentDimensions.width} × ${currentDimensions.height} px` : src ? 'Click image for full preview' : 'Your image preview will appear here'}</p>
      <div id={`store-${kind}-guidance`} className="mb-3 mt-3 text-xs leading-5">
        <p className="font-medium text-gray-700">Recommended: {isLogo ? '512 × 512 px' : '1600 × 600 px'}</p>
        <p className="mt-0.5 text-gray-500">{isLogo ? 'Square image (1:1). Keep your logo centered.' : 'Wide image (8:3). Keep text and key details centered; edges may crop on smaller screens.'}</p>
      </div>
      <label className="mt-auto inline-flex min-h-10 w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2">
        <Upload size={13} aria-hidden="true" />Change {label}
        <input type="file" aria-label={`Change store ${kind}`} aria-describedby={`store-${kind}-guidance store-image-formats`} accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onChange} />
      </label>
    </div>
  )
}

function BrandingPreview({ image, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog ref={dialogRef} aria-labelledby="store-branding-preview-title" aria-modal="true" onCancel={(event) => { event.preventDefault(); onClose() }} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} style={{ width: 'min(56rem, calc(100vw - 2rem))' }} className="m-auto max-h-[90dvh] overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-950/60 backdrop:backdrop-blur-sm">
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div><h2 id="store-branding-preview-title" className="text-base font-semibold">{image.title}</h2>{image.dimensions && <p className="mt-1 text-xs text-gray-500">{image.dimensions.width} × {image.dimensions.height} px</p>}</div>
          <button type="button" aria-label="Close image preview" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="min-h-0 overflow-auto bg-gray-50 p-4"><img src={image.src} alt={image.title} className="mx-auto max-h-[70dvh] w-full object-contain" /></div>
      </div>
    </dialog>
  )
}

export default function StoreInformationEditor({ store, isAdmin, onClose }) {
  const queryClient = useQueryClient()
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)
  const nameInputRef = useRef(null)
  const [form, setForm] = useState(() => Object.fromEntries(
    ['name', 'code', 'slug', 'store_type', 'phone', 'email', 'province', 'district', 'address', 'bio', 'description', 'category'].map((key) => [key, store[key] || '']),
  ))
  const [logoFile, setLogoFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [formError, setFormError] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const logoPreview = useImagePreview(logoFile, store.logo)
  const bannerPreview = useImagePreview(bannerFile, store.banner)
  const nameChanged = form.name.trim() !== store.name.trim()
  const dirty = Boolean(logoFile || bannerFile) || Object.keys(form).some((key) => form[key] !== (store[key] || ''))
  const hasKnownProvince = CAMBODIA_PROVINCES.some((province) => province.key === form.province)

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    nameInputRef.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  const save = useMutation({
    mutationFn: (payload) => storesApi.admin.updateMyStore(payload),
    onSuccess: (response, payload) => {
      queryClient.setQueryData(['my-store-info'], response.data)
      for (const queryKey of [['admin-stores'], ['public-stores'], ['public-store-detail'], ['public-store-products']]) {
        queryClient.invalidateQueries({ queryKey })
      }
      const requestedName = payload.get('name')
      toast.success(!isAdmin && requestedName && requestedName !== store.name
        ? 'Store saved. Your new store name has been sent for review.'
        : 'Store information updated successfully!')
      onClose()
    },
    onError: (error) => {
      const data = error.response?.data
      const message = data?.detail || Object.entries(data || {}).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' ')
      setFormError(typeof message === 'string' && message ? message : 'Could not save your store. Please try again.')
      bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    },
  })

  const close = () => { if (!save.isPending) onClose() }
  const set = (key, value) => { setFormError(''); setForm((previous) => ({ ...previous, [key]: value })) }
  const chooseImage = (event, setter) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setFormError('Choose a JPG, PNG, WebP or GIF image.')
      return
    }
    setFormError('')
    setter(file)
  }

  const submit = (event) => {
    event.preventDefault()
    if (save.isPending || !dirty) return
    if (!form.name.trim()) { setFormError('Enter your store name.'); nameInputRef.current?.focus(); return }
    const payload = new FormData()
    payload.append('name', form.name.trim())
    if (isAdmin) {
      for (const key of ['code', 'slug', 'store_type']) if (form[key]) payload.append(key, form[key])
    }
    for (const key of ['phone', 'email', 'province', 'district', 'address', 'bio', 'description', 'category']) payload.append(key, form[key])
    if (logoFile) payload.append('logo', logoFile)
    if (bannerFile) payload.append('banner', bannerFile)
    setFormError('')
    save.mutate(payload)
  }

  return (
    <>
    <dialog ref={dialogRef} aria-labelledby="store-editor-title" aria-describedby="store-editor-description" aria-modal="true" onCancel={(event) => { event.preventDefault(); close() }} onClick={(event) => { if (event.target === event.currentTarget) close() }} style={{ width: 'min(58rem, calc(100vw - 2rem))' }} className="m-auto max-h-[90dvh] overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-950/50 backdrop:backdrop-blur-sm">
      <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div><h2 id="store-editor-title" className="text-lg font-semibold">Edit Store Information</h2><p id="store-editor-description" className="mt-1 text-xs leading-5 text-gray-500">Update your branding, store details, and contact information.</p></div>
          <button type="button" aria-label="Close edit store" disabled={save.isPending} onClick={close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-40"><X size={18} /></button>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          {formError && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm leading-6 text-red-700"><AlertCircle size={17} className="mt-1 shrink-0" />{formError}</div>}
          <fieldset disabled={save.isPending} className="min-w-0 space-y-6 disabled:opacity-60">
            <section aria-labelledby="store-branding-title">
              <h3 id="store-branding-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><Image size={17} className="text-purple-600" /> Store Branding</h3>
              <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                <BrandingUpload kind="logo" src={logoPreview} fallback={store.name[0]?.toUpperCase() || 'S'} onChange={(event) => chooseImage(event, setLogoFile)} onPreview={setPreviewImage} />
                <BrandingUpload kind="banner" src={bannerPreview} onChange={(event) => chooseImage(event, setBannerFile)} onPreview={setPreviewImage} />
              </div>
              <p id="store-image-formats" className="mt-2 text-[11px] text-gray-500">JPG, PNG, WebP or GIF. Select an image to preview it before saving.</p>
            </section>
            <section aria-labelledby="store-details-editor-title">
              <h3 id="store-details-editor-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><Building2 size={17} className="text-purple-600" /> Store Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="store-name" label="Store Name *"><input id="store-name" ref={nameInputRef} value={form.name} onChange={(event) => set('name', event.target.value)} required maxLength={200} autoComplete="organization" className={inputClass} /></Field>
                <Field id="store-bio" label="Bio / Tagline"><input id="store-bio" value={form.bio} onChange={(event) => set('bio', event.target.value)} maxLength={255} placeholder="A short introduction to your store" className={inputClass} /></Field>
                {!isAdmin && <p className="flex items-start gap-2 text-xs leading-6 text-gray-500 sm:col-span-2"><Clock size={14} className="mt-1 shrink-0 text-purple-500" />{nameChanged ? 'Your new store name will be sent for platform review. Other details update when you save.' : 'Store name changes need platform review before appearing on the website.'}</p>}
                {store.name_change_status === 'pending' && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-6 text-amber-800 sm:col-span-2">Name under review: <strong>{store.pending_name}</strong></p>}
                <Field id="store-category" label="Store Category"><input id="store-category" value={form.category} onChange={(event) => set('category', event.target.value)} maxLength={100} placeholder="e.g. Beauty & Cosmetics" className={inputClass} /></Field>
                <Field id="store-description" label="Full Store Description" wide><textarea id="store-description" rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} placeholder="Tell customers about your store and products" className={`${inputClass} resize-y`} /></Field>
              </div>
            </section>
            <section aria-labelledby="store-contact-editor-title">
              <h3 id="store-contact-editor-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><MapPin size={17} className="text-purple-600" /> Contact &amp; Location</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="store-phone" label="Phone Number"><input id="store-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => set('phone', event.target.value)} maxLength={50} placeholder="012 345 678" className={inputClass} /></Field>
                <Field id="store-email" label="Email Address"><input id="store-email" type="email" autoComplete="email" value={form.email} onChange={(event) => set('email', event.target.value)} placeholder="store@example.com" className={inputClass} /></Field>
                <Field id="store-province" label="Province / City"><select id="store-province" value={form.province} onChange={(event) => set('province', event.target.value)} className={inputClass}><option value="">Select province / city</option>{form.province && !hasKnownProvince && <option value={form.province}>{form.province}</option>}{CAMBODIA_PROVINCES.map((province) => <option key={province.key} value={province.key}>{province.label}</option>)}</select></Field>
                <Field id="store-district" label="District / Khan"><input id="store-district" value={form.district} onChange={(event) => set('district', event.target.value)} maxLength={100} placeholder="e.g. Toul Kork" className={inputClass} /></Field>
                <Field id="store-address" label="Detailed Address" wide><textarea id="store-address" rows={2} autoComplete="street-address" value={form.address} onChange={(event) => set('address', event.target.value)} placeholder="Street number, building, landmark..." className={`${inputClass} resize-y`} /></Field>
              </div>
            </section>
          </fieldset>
        </div>
        <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">{save.isPending ? 'Saving your store...' : dirty ? 'Unsaved changes' : 'Edit the fields, then save.'}</p>
          <div className="flex items-center justify-end gap-2"><button type="button" disabled={save.isPending} onClick={close} className="btn-secondary">Cancel</button><button type="submit" disabled={save.isPending || !dirty} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">{save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {save.isPending ? 'Saving...' : 'Save Changes'}</button></div>
        </div>
      </form>
    </dialog>
    {previewImage && <BrandingPreview image={previewImage} onClose={() => setPreviewImage(null)} />}
    </>
  )
}
