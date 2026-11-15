import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, ChevronRight, Image, Languages, Loader2, Lock, Save, Undo2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import PageHeader from '@/components/shared/PageHeader'
import { useRolePermission } from '@/utils/permissions'
import { ABOUT_GROUPS, buildAboutPageForm, DEFAULT_ABOUT_IMAGE } from '@/utils/aboutPage'

const CONTACT_FIELDS = [
  { key: 'name', label: 'Store name', maxLength: 200 },
  { key: 'phone', label: 'Phone number', maxLength: 80 },
  { key: 'email', label: 'Email address', type: 'email', maxLength: 254 },
  { key: 'telegram_url', label: 'Telegram contact', placeholder: '@username or https://t.me/username', maxLength: 500 },
  { key: 'address', label: 'Address', multiline: true, maxLength: 2000 },
]

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100'

function ContentField({ field, language, value, onChange, wide = false }) {
  return (
    <div className={field.multiline || wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`about-${field.key}`} className="mb-1.5 block text-xs font-semibold text-gray-600">{field.label}</label>
      {field.multiline ? (
        <textarea id={`about-${field.key}`} lang={language} rows={3} maxLength={6000} value={value} onChange={(event) => onChange(field.key, event.target.value)} className={`${inputClass} min-h-24 resize-y ${language === 'km' ? 'font-khmer' : ''}`} />
      ) : (
        <input id={`about-${field.key}`} lang={language} type="text" maxLength={6000} value={value} onChange={(event) => onChange(field.key, event.target.value)} className={`${inputClass} ${language === 'km' ? 'font-khmer' : ''}`} />
      )}
    </div>
  )
}

function AboutSettingsEditor({ initialData, canEdit }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => buildAboutPageForm(initialData.about_page))
  const [savedForm, setSavedForm] = useState(() => buildAboutPageForm(initialData.about_page))
  const [savedImage, setSavedImage] = useState(initialData.about_hero_image_url || '')
  const [heroFile, setHeroFile] = useState(null)
  const [clearImage, setClearImage] = useState(false)
  const [imagePreview, setImagePreview] = useState('')
  const [language, setLanguage] = useState('en')
  const [activeSection, setActiveSection] = useState('hero')
  const [translationBackup, setTranslationBackup] = useState(null)
  const group = ABOUT_GROUPS.find((item) => item.id === activeSection)
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm) || Boolean(heroFile) || clearImage

  useEffect(() => {
    if (!heroFile) {
      setImagePreview('')
      return undefined
    }
    const url = URL.createObjectURL(heroFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [heroFile])

  const translation = useMutation({
    mutationFn: ({ source, target, fields }) => authApi.aboutPage.translate({
      source_language: source, target_language: target, fields,
    }).then((response) => response.data),
    onSuccess: (data, variables) => {
      setForm((previous) => ({
        ...previous,
        content: { ...previous.content, [variables.target]: { ...previous.content[variables.target], ...data.fields } },
      }))
      setTranslationBackup({
        language: variables.target,
        section: variables.section,
        fields: Object.fromEntries(Object.keys(data.fields).map((key) => [key, variables.previous[key]])),
      })
      setLanguage(variables.target)
      toast.success('Section translated. Review the text, then save your changes.')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Could not translate this section. Please try again.'),
  })

  const save = useMutation({
    mutationFn: () => {
      const payload = new FormData()
      payload.append('about_page', JSON.stringify(form))
      if (heroFile) payload.append('about_hero_image', heroFile)
      if (clearImage) payload.append('clear_about_hero_image', 'true')
      return authApi.aboutPage.update(payload).then((response) => response.data)
    },
    onSuccess: (data) => {
      const next = buildAboutPageForm(data.about_page)
      setForm(next)
      setSavedForm(next)
      setSavedImage(data.about_hero_image_url || '')
      setHeroFile(null)
      setClearImage(false)
      setTranslationBackup(null)
      queryClient.setQueryData(['admin-about-page'], data)
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      toast.success('About Us updated. Your changes are now on the website.')
    },
    onError: (error) => {
      const messages = Object.values(error.response?.data || {}).flat(Infinity).filter((value) => typeof value === 'string')
      toast.error(messages.join(' ') || 'Could not save About Us. Please try again.')
    },
  })
  const busy = save.isPending || translation.isPending
  const saveButton = (
    <button type="submit" form="about-settings-form" disabled={!canEdit || !dirty || busy} className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
      {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {save.isPending ? 'Saving...' : 'Save Changes'}
    </button>
  )

  const setSectionVisible = (key, enabled) => setForm((previous) => ({
    ...previous, sections: { ...previous.sections, [key]: enabled },
  }))

  const updateContent = (key, value) => {
    setTranslationBackup(null)
    setForm((previous) => ({ ...previous, content: { ...previous.content, [language]: { ...previous.content[language], [key]: value } } }))
  }

  const translateSection = () => {
    if (!canEdit || busy) return
    const fields = Object.fromEntries(group.fields
      .filter((field) => form.content[language][field.key]?.trim())
      .map((field) => [field.key, form.content[language][field.key]]))
    if (!Object.keys(fields).length) { toast.error('Enter text in this language first.'); return }
    const target = language === 'en' ? 'km' : 'en'
    translation.mutate({ source: language, target, fields, section: activeSection, previous: { ...form.content[target] } })
  }

  const undoTranslation = () => {
    if (!translationBackup || busy) return
    setForm((previous) => ({ ...previous, content: { ...previous.content, [translationBackup.language]: { ...previous.content[translationBackup.language], ...translationBackup.fields } } }))
    setLanguage(translationBackup.language)
    setTranslationBackup(null)
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className="sticky top-16 z-20 bg-gray-50/95 pb-3 pt-1 backdrop-blur [&>.page-header]:mb-0">
        <PageHeader title="About Us" subtitle="Manage your page content in English and Khmer." actions={
          <>
            <Link to="/about" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2"><ArrowUpRight size={16} /> View Page</Link>
            {saveButton}
          </>
        } />
      </div>
      {!canEdit && <p className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><Lock size={16} /> You can view this page. An About Us edit permission is required to save changes.</p>}
      <div className="grid items-start gap-4 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav aria-label="About Us sections" className="rounded-2xl border border-gray-200 bg-white p-2 lg:sticky lg:top-36">
          {ABOUT_GROUPS.map((item) => (
            <button key={item.id} type="button" disabled={busy} onClick={() => setActiveSection(item.id)} aria-current={activeSection === item.id ? 'page' : undefined} className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-wait ${activeSection === item.id ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              {item.label}<ChevronRight size={14} className="shrink-0" />
            </button>
          ))}
        </nav>
        <form id="about-settings-form" onSubmit={(event) => { event.preventDefault(); if (canEdit && dirty && !busy) save.mutate() }} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="space-y-3 border-b border-gray-100 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{group.label}</h2>
                <p className="mt-1 text-xs text-gray-500" role="status">{translation.isPending ? 'Translating this section...' : dirty ? 'Unsaved changes' : 'All changes saved'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-gray-100 p-1" aria-label="Content language">
                  {[{ key: 'en', label: 'English' }, { key: 'km', label: 'ខ្មែរ' }].map((item) => (
                    <button key={item.key} type="button" disabled={busy} onClick={() => setLanguage(item.key)} aria-pressed={language === item.key} className={`min-h-9 rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-wait ${language === item.key ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-500'}`}>{item.label}</button>
                  ))}
                </div>
                <button type="button" onClick={translateSection} disabled={!canEdit || busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-semibold text-pink-700 transition-colors hover:bg-pink-100 disabled:cursor-not-allowed disabled:opacity-50">
                  {translation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                  {translation.isPending ? 'Translating...' : `Auto-Translate ${language === 'en' ? 'EN → KM' : 'KM → EN'}`}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs leading-5 text-gray-500">Translate this section into {language === 'en' ? 'Khmer' : 'English'}, then review and save.</p>
              {translationBackup?.section === activeSection && <button type="button" disabled={busy} onClick={undoTranslation} className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-gray-600 hover:text-pink-700 disabled:opacity-50"><Undo2 size={13} /> Undo Translation</button>}
            </div>
          </div>
          <fieldset disabled={!canEdit || busy} className="min-w-0 space-y-5 p-4 disabled:opacity-70 sm:p-5">
            {activeSection !== 'hero' && (
              <label className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-3 text-sm font-medium text-gray-700">
                Show this section on the website
                <input type="checkbox" checked={form.sections[activeSection]} onChange={(event) => setSectionVisible(activeSection, event.target.checked)} className="h-4 w-4 accent-pink-600" />
              </label>
            )}
            {activeSection === 'stores' && <p className="rounded-xl bg-sky-50 p-3 text-sm leading-6 text-sky-800">Store cards use your active, verified partners. Manage their details in <Link to="/admin/stores" className="font-semibold underline">Stores &amp; Partners</Link>.</p>}
            <div className={`grid gap-5 ${activeSection === 'hero' ? 'xl:grid-cols-[280px_minmax(0,1fr)]' : ''}`}>
              {activeSection === 'hero' && (
                <div className="self-start rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800"><Image size={16} /> Main Image</h3>
                  <img src={imagePreview || (!clearImage && savedImage) || DEFAULT_ABOUT_IMAGE} alt="About Us main image preview" className="h-40 w-full rounded-lg border border-gray-100 bg-white object-contain" />
                  <div className="mt-3 space-y-2">
                    <label className={`flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${!canEdit || busy ? 'pointer-events-none' : 'cursor-pointer'}`}>
                      <Upload size={15} /> Choose Image
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ''
                        if (!file) return
                        if (file.size > 5 * 1024 * 1024) { toast.error('Choose an image smaller than 5 MB.'); return }
                        setHeroFile(file)
                        setClearImage(false)
                      }} />
                    </label>
                    <button type="button" disabled={!heroFile && !savedImage} onClick={() => { setHeroFile(null); setClearImage(true) }} className="min-h-8 w-full text-xs font-medium text-gray-500 hover:text-pink-700 disabled:opacity-40">Use Default Image</button>
                    <p className="text-[11px] leading-5 text-gray-400">JPG, PNG, WebP or GIF · Up to 5 MB</p>
                  </div>
                </div>
              )}
              <div className="grid content-start gap-4 sm:grid-cols-2">
                {group.fields.map((field) => <ContentField key={`${language}-${field.key}`} field={field} language={language} value={form.content[language][field.key]} onChange={updateContent} wide={activeSection === 'hero' && field.key === 'shopNow'} />)}
              </div>
            </div>
            {activeSection === 'contact' && (
              <div className="space-y-4 border-t border-gray-100 pt-5">
                <div><h3 className="text-sm font-semibold text-gray-900">Contact Details</h3><p className="mt-1 text-xs leading-6 text-gray-500">Leave blank to use your general store settings or existing Telegram contact.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {CONTACT_FIELDS.map((field) => (
                    <div key={field.key} className={field.multiline ? 'sm:col-span-2' : ''}>
                      <label htmlFor={`contact-${field.key}`} className="mb-1.5 block text-xs font-semibold text-gray-600">{field.label}</label>
                      {field.multiline ? (
                        <textarea id={`contact-${field.key}`} rows={2} maxLength={field.maxLength} value={form.contact[field.key]} onChange={(event) => setForm((previous) => ({ ...previous, contact: { ...previous.contact, [field.key]: event.target.value } }))} className={`${inputClass} resize-y`} />
                      ) : (
                        <input id={`contact-${field.key}`} type={field.type || 'text'} maxLength={field.maxLength} placeholder={field.placeholder || 'Use general store settings'} value={form.contact[field.key]} onChange={(event) => setForm((previous) => ({ ...previous, contact: { ...previous.contact, [field.key]: event.target.value } }))} className={inputClass} />
                      )}
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" checked={form.sections.telegram} onChange={(event) => setSectionVisible('telegram', event.target.checked)} className="h-4 w-4 accent-pink-600" /> Show Telegram contact</label>
              </div>
            )}
          </fieldset>
        </form>
      </div>
    </div>
  )
}
export default function AboutSettings() {
  const { allowed: canView, isLoading: checkingPermission } = useRolePermission('settings_about', 'view')
  const { allowed: canEdit } = useRolePermission('settings_about', 'edit')
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-about-page'],
    queryFn: () => authApi.aboutPage.get().then((response) => response.data),
    enabled: canView,
  })

  if (checkingPermission || (canView && isLoading)) return <p className="p-8 text-sm text-gray-500" role="status">Loading About Us settings...</p>
  if (!canView) return <div className="rounded-2xl border border-gray-200 bg-white p-8"><PageHeader title="About Us" /><p className="flex items-center gap-2 text-sm text-gray-600"><Lock size={16} /> You do not have permission to view About Us settings.</p></div>
  if (isError || !data) return <div role="alert" className="rounded-2xl border border-gray-200 bg-white p-8"><p className="text-sm text-gray-600">Could not load About Us settings.</p><button type="button" onClick={() => refetch()} className="mt-3 text-sm font-semibold text-pink-700">Try Again</button></div>
  return <AboutSettingsEditor initialData={data} canEdit={canEdit} />
}
