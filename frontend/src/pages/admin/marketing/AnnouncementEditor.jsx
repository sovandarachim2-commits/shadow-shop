import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calendar,
  Check,
  Eye,
  Globe,
  Laptop,
  LayoutTemplate,
  Monitor,
  Palette,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  Wand2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { productsApi } from '@/api/products'
import { inventoryApi } from '@/api/inventory'
import { authApi } from '@/api/auth'
import { AnnouncementBarStage } from '@/components/customer/AnnouncementBar'
import { CAMBODIA_PROVINCES } from '@/utils/cambodiaProvinces'
import {
  ANNOUNCEMENT_COLOR_PRESETS,
  ANNOUNCEMENT_GRADIENT_PRESETS,
  ANNOUNCEMENT_ICON_OPTIONS,
  ANNOUNCEMENT_PAGE_OPTIONS,
  DEFAULT_ANNOUNCEMENT_FORM,
  formatAnnouncementDate,
  isSafeAnnouncementUrl,
  resolveAnnouncementPresentation,
} from '@/utils/announcementUtils'
import { cn } from '@/utils/helpers'

const EDITOR_TABS = [
  { key: 'content', label: 'Content', Icon: Type },
  { key: 'appearance', label: 'Appearance', Icon: Palette },
  { key: 'animation', label: 'Animation', Icon: Wand2 },
  { key: 'responsive', label: 'Responsive', Icon: Smartphone },
  { key: 'rules', label: 'Schedule & Rules', Icon: Calendar },
]

const QUICK_LINKS = [
  { label: 'Shop All', url: '/shop' },
  { label: 'Flash Sale', url: '/shop?filter=flash_sale' },
  { label: 'New Arrivals', url: '/shop?filter=new_arrival' },
  { label: 'Rewards', url: '/profile/rewards' },
  { label: 'Cart', url: '/cart' },
]

function toDatetimeLocalValue(isoString) {
  if (!isoString) return ''
  const dt = new Date(isoString)
  if (Number.isNaN(dt.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

function fromDatetimeLocalValue(localValue) {
  if (!localValue) return null
  const dt = new Date(localValue)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

function mapAnnouncementToForm(item) {
  if (!item) return { ...DEFAULT_ANNOUNCEMENT_FORM }
  return {
    ...DEFAULT_ANNOUNCEMENT_FORM,
    ...item,
    title: item.title || '',
    message_en: item.message_en || '',
    message_km: item.message_km || '',
    mobile_message_en: item.mobile_message_en || '',
    mobile_message_km: item.mobile_message_km || '',
    icon: item.icon || '',
    link_url: item.link_url || '',
    link_text: item.link_text || '',
    link_text_km: item.link_text_km || '',
    gradient_css: item.gradient_css || DEFAULT_ANNOUNCEMENT_FORM.gradient_css,
    tablet_font_size: item.tablet_font_size ?? null,
    tablet_height: item.tablet_height ?? null,
    tablet_padding_x: item.tablet_padding_x ?? null,
    tablet_alignment: item.tablet_alignment || '',
    mobile_font_size: item.mobile_font_size ?? null,
    mobile_height: item.mobile_height ?? null,
    mobile_padding_x: item.mobile_padding_x ?? null,
    mobile_alignment: item.mobile_alignment || '',
    start_at: toDatetimeLocalValue(item.start_at),
    end_at: toDatetimeLocalValue(item.end_at),
    target_stores: Array.isArray(item.target_stores) ? item.target_stores : [],
    target_delivery_areas: Array.isArray(item.target_delivery_areas) ? item.target_delivery_areas : [],
    target_pages: Array.isArray(item.target_pages) ? item.target_pages : [],
  }
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-purple-600"
      />
    </label>
  )
}

function ColorInput({ label, value, onChange }) {
  return (
    <div>
      <label className="label text-xs font-bold text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#111827'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded-xl border border-gray-200 bg-white p-1"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#111827"
          className="input-field font-mono text-xs uppercase"
        />
      </div>
    </div>
  )
}

function extractApiError(err) {
  const data = err?.response?.data
  if (!data) return 'Could not save announcement.'
  if (typeof data.detail === 'string') return data.detail
  const firstEntry = Object.entries(data)[0]
  if (firstEntry) {
    const [key, val] = firstEntry
    const msg = Array.isArray(val) ? val[0] : val
    return `${key}: ${msg}`
  }
  return 'Could not save announcement.'
}

export default function AnnouncementEditor({ announcement, onBack, onSaved, canEdit = true }) {
  const qc = useQueryClient()
  const isEditing = Boolean(announcement?.id)
  const [form, setForm] = useState(() => mapAnnouncementToForm(announcement))
  const [activeTab, setActiveTab] = useState('content')
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [previewLang, setPreviewLang] = useState('en')
  const [gradientStart, setGradientStart] = useState('#DB2777')
  const [gradientEnd, setGradientEnd] = useState('#9333EA')
  const [gradientAngle, setGradientAngle] = useState(90)

  const { data: warehouses = [] } = useQuery({
    queryKey: ['admin-warehouses'],
    queryFn: () => inventoryApi.warehouses.list().then((r) => r.data.results ?? r.data ?? []),
    staleTime: 5 * 60 * 1000,
  })

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const storeOptions = useMemo(() => {
    const list = []
    if (siteSettings?.store_name) {
      list.push({ id: 'main_store', label: `${siteSettings.store_name} (Main Store)` })
    }
    warehouses.forEach((w) => {
      list.push({ id: String(w.id), label: `${w.name}${w.code ? ` (${w.code})` : ''}` })
    })
    return list
  }, [warehouses, siteSettings?.store_name])

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleArrayValue = (key, value) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : []
      const exists = current.includes(value)
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      }
    })
  }

  const translateMutation = useMutation({
    mutationFn: (payload) => productsApi.announcements.translate(payload),
    onSuccess: (res, variables) => {
      const data = res.data || {}
      if (variables.direction === 'km_to_en') {
        setForm((prev) => ({
          ...prev,
          message_en: data.message_en || prev.message_en,
          mobile_message_en: data.mobile_message_en || prev.mobile_message_en,
          link_text: data.link_text || prev.link_text,
        }))
        toast.success('Translated Khmer to English')
      } else {
        setForm((prev) => ({
          ...prev,
          message_km: data.message_km || prev.message_km,
          mobile_message_km: data.mobile_message_km || prev.mobile_message_km,
          link_text_km: data.link_text_km || prev.link_text_km,
        }))
        toast.success('Translated English to Khmer')
      }
    },
    onError: (err) => {
      toast.error(extractApiError(err))
    },
  })

  const handleAutoTranslate = (direction = 'en_to_km') => {
    if (!canEdit || translateMutation.isPending) return
    if (direction === 'km_to_en') {
      const payload = {
        direction,
        message_km: String(form.message_km || '').trim(),
        mobile_message_km: String(form.mobile_message_km || '').trim(),
        link_text_km: String(form.link_text_km || '').trim(),
      }
      if (!payload.message_km && !payload.mobile_message_km && !payload.link_text_km) {
        toast.error('Enter a Khmer message first')
        return
      }
      translateMutation.mutate(payload)
      return
    }
    const payload = {
      direction: 'en_to_km',
      message_en: String(form.message_en || '').trim(),
      mobile_message_en: String(form.mobile_message_en || '').trim(),
      link_text: String(form.link_text || '').trim(),
    }
    if (!payload.message_en && !payload.mobile_message_en && !payload.link_text) {
      toast.error('Enter an English message first')
      return
    }
    translateMutation.mutate(payload)
  }

  const saveMutation = useMutation({
    mutationFn: ({ payload }) =>
      isEditing
        ? productsApi.announcements.update(announcement.id, payload)
        : productsApi.announcements.create(payload),
    onSuccess: (res, { mode }) => {
      qc.invalidateQueries({ queryKey: ['admin-announcements'] })
      qc.invalidateQueries({ queryKey: ['public-announcements'] })
      toast.success(mode === 'publish' ? 'Announcement published' : 'Draft saved')
      onSaved?.(res.data, mode)
    },
    onError: (err) => {
      toast.error(extractApiError(err))
    },
  })

  const handleSave = (mode) => {
    if (!canEdit) return
    if (
      !String(form.message_en || '').trim() &&
      !String(form.message_km || '').trim() &&
      !String(form.mobile_message_en || '').trim() &&
      !String(form.mobile_message_km || '').trim()
    ) {
      toast.error('Enter an English or Khmer message')
      setActiveTab('content')
      return
    }
    if (form.link_url && !isSafeAnnouncementUrl(form.link_url)) {
      toast.error('Invalid link URL')
      setActiveTab('content')
      return
    }
    if (form.start_at && form.end_at && new Date(form.start_at) >= new Date(form.end_at)) {
      toast.error('End time must follow start time')
      setActiveTab('rules')
      return
    }

    const toNullableInt = (val) => (val === '' || val === null || val === undefined ? null : Number(val))

    const payload = {
      title: form.title,
      message_en: form.message_en,
      message_km: form.message_km,
      mobile_message_en: form.mobile_message_en,
      mobile_message_km: form.mobile_message_km,
      icon: form.icon,
      link_url: form.link_url,
      link_text: form.link_text,
      link_text_km: form.link_text_km,
      open_in_new_tab: Boolean(form.open_in_new_tab),
      background_color: form.background_color,
      text_color: form.text_color,
      use_gradient: Boolean(form.use_gradient),
      gradient_css: form.use_gradient ? form.gradient_css : '',
      font_size: Number(form.font_size || 14),
      font_weight: form.font_weight,
      alignment: form.alignment,
      height: Number(form.height || 40),
      padding_x: Number(form.padding_x ?? 16),
      border_radius: Number(form.border_radius ?? 0),
      icon_size: Number(form.icon_size || 16),
      icon_color: form.icon_color,
      show_close_button: Boolean(form.show_close_button),
      animation_type: form.animation_type,
      animation_speed: Number(form.animation_speed || 5),
      animation_direction: form.animation_direction,
      transition_duration: Number(form.transition_duration || 400),
      rotation_delay: Number(form.rotation_delay || 4000),
      reduced_motion: Boolean(form.reduced_motion),
      show_on_desktop: Boolean(form.show_on_desktop),
      show_on_tablet: Boolean(form.show_on_tablet),
      show_on_mobile: Boolean(form.show_on_mobile),
      tablet_font_size: toNullableInt(form.tablet_font_size),
      tablet_height: toNullableInt(form.tablet_height),
      tablet_padding_x: toNullableInt(form.tablet_padding_x),
      tablet_alignment: form.tablet_alignment || '',
      mobile_font_size: toNullableInt(form.mobile_font_size),
      mobile_height: toNullableInt(form.mobile_height),
      mobile_padding_x: toNullableInt(form.mobile_padding_x),
      mobile_alignment: form.mobile_alignment || '',
      start_at: fromDatetimeLocalValue(form.start_at),
      end_at: fromDatetimeLocalValue(form.end_at),
      is_active: Boolean(form.is_active),
      priority: Number(form.priority || 0),
      target_stores: form.target_stores || [],
      target_delivery_areas: form.target_delivery_areas || [],
      language_rule: form.language_rule,
      page_display_mode: form.page_display_mode,
      target_pages: form.page_display_mode === 'selected' ? (form.target_pages || []) : [],
      save_mode: mode,
    }

    saveMutation.mutate({ payload, mode })
  }

  const handleReset = () => {
    setForm(mapAnnouncementToForm(announcement))
    toast.success(isEditing ? 'Changes discarded' : 'Defaults restored')
  }

  const applyCustomGradient = (start = gradientStart, end = gradientEnd, angle = gradientAngle) => {
    setField('use_gradient', true)
    setField('gradient_css', `linear-gradient(${angle}deg, ${start} 0%, ${end} 100%)`)
  }

  const previewPresentation = useMemo(
    () => resolveAnnouncementPresentation(form, { device: previewDevice, language: previewLang }),
    [form, previewDevice, previewLang]
  )

  return (
    <div className="space-y-5">
      {/* Sticky Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
            aria-label="Back to announcement list"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-gray-950">
                {isEditing ? `Edit: ${form.title || 'Announcement'}` : 'Create Announcement'}
              </h2>
              {isEditing && (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                    announcement.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  )}
                >
                  {announcement.status === 'published' ? 'Published' : 'Draft'}
                </span>
              )}
              {announcement?.published_at && formatAnnouncementDate(announcement.published_at) && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                  Published {formatAnnouncementDate(announcement.published_at)}
                </span>
              )}
              {announcement?.has_unpublished_changes && (
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
                  Unpublished draft edits
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Changes appear immediately in the Live Design Preview. Draft saves never affect the live storefront.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={saveMutation.isPending}
            className="btn-secondary text-xs"
          >
            <RotateCcw size={14} /> Reset Settings
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
              >
                <Save size={14} /> {saveMutation.isPending ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSave('publish')}
                disabled={saveMutation.isPending}
                className="btn-primary text-xs"
              >
                <Send size={14} /> {saveMutation.isPending ? 'Publishing...' : 'Publish Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Left: Settings Panels */}
        <div className="space-y-4 xl:col-span-7">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
            {EDITOR_TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition',
                  activeTab === key
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {activeTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Announcement Title (Optional)</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g. Weekend Free Shipping Promo"
                    className="input-field"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="label mb-0">Message (English) *</label>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleAutoTranslate('km_to_en')}
                          disabled={translateMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                        >
                          <Wand2 size={12} />
                          {translateMutation.isPending ? 'Translating...' : 'Auto-Translate KM → EN'}
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={form.message_en}
                      onChange={(e) => setField('message_en', e.target.value)}
                      placeholder="Free delivery on orders over $30! Limited time only."
                      className="input-field resize-none"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="label mb-0">Message (Khmer)</label>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleAutoTranslate('en_to_km')}
                          disabled={translateMutation.isPending}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                        >
                          <Wand2 size={12} />
                          {translateMutation.isPending ? 'Translating...' : 'Auto-Translate EN → KM'}
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={form.message_km}
                      onChange={(e) => setField('message_km', e.target.value)}
                      placeholder="ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការបញ្ជាទិញចាប់ពី $30!"
                      className="input-field khmer-font resize-none"
                    />
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="label">Optional Icon</label>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                    {ANNOUNCEMENT_ICON_OPTIONS.map(({ key, label, Icon }) => {
                      const selected = (form.icon || '') === key
                      return (
                        <button
                          key={key || 'none'}
                          type="button"
                          onClick={() => setField('icon', key)}
                          className={cn(
                            'flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[10px] font-semibold transition',
                            selected
                              ? 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-200'
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          )}
                          title={label}
                        >
                          {Icon ? <Icon size={16} /> : <span className="text-xs font-bold">—</span>}
                          <span className="truncate w-full text-center">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Link Settings */}
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div>
                    <label className="label">Optional Clickable Link URL</label>
                    <input
                      type="text"
                      value={form.link_url}
                      onChange={(e) => setField('link_url', e.target.value)}
                      placeholder="/shop?filter=flash_sale or https://..."
                      className="input-field"
                    />
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {QUICK_LINKS.map((item) => (
                        <button
                          key={item.url}
                          type="button"
                          onClick={() => setField('link_url', item.url)}
                          className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="label">Link Text (English)</label>
                      <input
                        type="text"
                        value={form.link_text}
                        onChange={(e) => setField('link_text', e.target.value)}
                        placeholder="Shop Now"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">Link Text (Khmer)</label>
                      <input
                        type="text"
                        value={form.link_text_km}
                        onChange={(e) => setField('link_text_km', e.target.value)}
                        placeholder="ទិញឥឡូវនេះ"
                        className="input-field khmer-font"
                      />
                    </div>
                  </div>

                  <ToggleRow
                    label="Open link in new tab"
                    hint="Leave off to open inside the current browser tab"
                    checked={form.open_in_new_tab}
                    onChange={(val) => setField('open_in_new_tab', val)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-5">
                {/* Color Presets */}
                <div>
                  <label className="label">Quick Color Themes</label>
                  <div className="flex flex-wrap gap-2">
                    {ANNOUNCEMENT_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setField('use_gradient', false)
                          setField('background_color', preset.bg)
                          setField('text_color', preset.text)
                          setField('icon_color', preset.icon)
                        }}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-purple-300"
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.bg }}
                        />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <ColorInput
                    label="Background Color"
                    value={form.background_color}
                    onChange={(val) => setField('background_color', val)}
                  />
                  <ColorInput
                    label="Text Color"
                    value={form.text_color}
                    onChange={(val) => setField('text_color', val)}
                  />
                  <ColorInput
                    label="Icon Color"
                    value={form.icon_color}
                    onChange={(val) => setField('icon_color', val)}
                  />
                </div>

                {/* Custom Gradient */}
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                  <ToggleRow
                    label="Use Custom Gradient Background"
                    hint="Overrides solid background color when enabled"
                    checked={form.use_gradient}
                    onChange={(val) => setField('use_gradient', val)}
                  />

                  {form.use_gradient && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap gap-2">
                        {ANNOUNCEMENT_GRADIENT_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setField('gradient_css', preset.css)
                              setField('text_color', preset.text)
                            }}
                            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-purple-300"
                          >
                            <span
                              className="h-4 w-6 rounded border border-black/10"
                              style={{ backgroundImage: preset.css }}
                            />
                            {preset.name}
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <ColorInput
                          label="Gradient Start"
                          value={gradientStart}
                          onChange={(val) => {
                            setGradientStart(val)
                            applyCustomGradient(val, gradientEnd, gradientAngle)
                          }}
                        />
                        <ColorInput
                          label="Gradient End"
                          value={gradientEnd}
                          onChange={(val) => {
                            setGradientEnd(val)
                            applyCustomGradient(gradientStart, val, gradientAngle)
                          }}
                        />
                        <div>
                          <label className="label text-xs font-bold text-gray-600">Angle ({gradientAngle}°)</label>
                          <input
                            type="range"
                            min={0}
                            max={360}
                            step={15}
                            value={gradientAngle}
                            onChange={(e) => {
                              const nextAngle = Number(e.target.value)
                              setGradientAngle(nextAngle)
                              applyCustomGradient(gradientStart, gradientEnd, nextAngle)
                            }}
                            className="mt-2 w-full accent-purple-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label text-xs font-bold text-gray-600">Gradient CSS</label>
                        <input
                          type="text"
                          value={form.gradient_css}
                          onChange={(e) => setField('gradient_css', e.target.value)}
                          placeholder="linear-gradient(90deg, #db2777 0%, #9333ea 100%)"
                          className="input-field font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Typography & Dimensions */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="label text-xs font-bold text-gray-600">Font Size ({form.font_size}px)</label>
                    <input
                      type="range"
                      min={11}
                      max={24}
                      value={form.font_size}
                      onChange={(e) => setField('font_size', Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="label text-xs font-bold text-gray-600">Font Weight</label>
                    <select
                      value={form.font_weight}
                      onChange={(e) => setField('font_weight', e.target.value)}
                      className="select-field"
                    >
                      <option value="normal">Normal</option>
                      <option value="medium">Medium</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs font-bold text-gray-600">Text Alignment</label>
                    <select
                      value={form.alignment}
                      onChange={(e) => setField('alignment', e.target.value)}
                      className="select-field"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                    {form.animation_type === 'marquee' && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Switch Animation away from Marquee to apply Left/Center/Right alignment.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="label text-xs font-bold text-gray-600">Bar Height (px)</label>
                    <input
                      type="number"
                      min={24}
                      max={120}
                      value={form.height}
                      onChange={(e) => setField('height', Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label text-xs font-bold text-gray-600">Padding X (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={64}
                      value={form.padding_x}
                      onChange={(e) => setField('padding_x', Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label text-xs font-bold text-gray-600">Border Radius (px)</label>
                    <input
                      type="number"
                      min={0}
                      max={32}
                      value={form.border_radius}
                      onChange={(e) => setField('border_radius', Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label text-xs font-bold text-gray-600">Icon Size (px)</label>
                    <input
                      type="number"
                      min={10}
                      max={32}
                      value={form.icon_size}
                      onChange={(e) => setField('icon_size', Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'animation' && (
              <div className="space-y-4">
                <div>
                  <label className="label">Display Animation Mode</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { value: 'static', title: 'Static', desc: 'Clean fixed banner without motion' },
                      { value: 'slide', title: 'Sliding Text', desc: 'Enters smoothly from left or right' },
                      { value: 'marquee', title: 'Marquee / Continuous Scroll', desc: 'Infinite ticker scrolling across the bar' },
                      { value: 'rotate', title: 'Rotating Announcements', desc: 'Vertical flip/slide when cycling items' },
                      { value: 'fade', title: 'Fade Transition', desc: 'Soft cross-fade transition' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField('animation_type', opt.value)}
                        className={cn(
                          'rounded-xl border p-3 text-left transition',
                          form.animation_type === opt.value
                            ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <p className="text-sm font-bold text-gray-900">{opt.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Animation Speed ({form.animation_speed}/10)</label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={form.animation_speed}
                      onChange={(e) => setField('animation_speed', Number(e.target.value))}
                      className="w-full accent-purple-600"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                      <span>Slow</span>
                      <span>Medium</span>
                      <span>Fast</span>
                    </div>
                  </div>
                  <div>
                    <label className="label">Animation Direction</label>
                    <select
                      value={form.animation_direction}
                      onChange={(e) => setField('animation_direction', e.target.value)}
                      className="select-field"
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Transition Duration (ms)</label>
                    <input
                      type="number"
                      min={100}
                      max={5000}
                      step={50}
                      value={form.transition_duration}
                      onChange={(e) => setField('transition_duration', Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Delay Between Announcements (ms)</label>
                    <input
                      type="number"
                      min={1000}
                      max={30000}
                      step={500}
                      value={form.rotation_delay}
                      onChange={(e) => setField('rotation_delay', Number(e.target.value))}
                      className="input-field"
                    />
                  </div>
                </div>

                <ToggleRow
                  label="Reduced Motion (Accessibility)"
                  hint="Disable sliding/marquee motion for visitors and force gentle instant transitions"
                  checked={form.reduced_motion}
                  onChange={(val) => setField('reduced_motion', val)}
                />
              </div>
            )}

            {activeTab === 'responsive' && (
              <div className="space-y-5">
                {/* Desktop */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Monitor size={16} className="text-purple-600" />
                    <h3 className="text-sm font-black text-gray-900">Desktop (≥ 1024px)</h3>
                  </div>
                  <ToggleRow
                    label="Visible on Desktop"
                    hint="Uses the base Appearance font size, height, padding, and alignment"
                    checked={form.show_on_desktop}
                    onChange={(val) => setField('show_on_desktop', val)}
                  />
                </div>

                {/* Tablet */}
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <Tablet size={16} className="text-purple-600" />
                    <h3 className="text-sm font-black text-gray-900">Tablet (768px – 1023px)</h3>
                  </div>
                  <ToggleRow
                    label="Visible on Tablet"
                    checked={form.show_on_tablet}
                    onChange={(val) => setField('show_on_tablet', val)}
                  />
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="label text-xs">Font Size (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={32}
                        placeholder={`${form.font_size}`}
                        value={form.tablet_font_size ?? ''}
                        onChange={(e) => setField('tablet_font_size', e.target.value === '' ? null : Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Height (px)</label>
                      <input
                        type="number"
                        min={24}
                        max={120}
                        placeholder={`${form.height}`}
                        value={form.tablet_height ?? ''}
                        onChange={(e) => setField('tablet_height', e.target.value === '' ? null : Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Padding X (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={64}
                        placeholder={`${form.padding_x}`}
                        value={form.tablet_padding_x ?? ''}
                        onChange={(e) => setField('tablet_padding_x', e.target.value === '' ? null : Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Alignment</label>
                      <select
                        value={form.tablet_alignment}
                        onChange={(e) => setField('tablet_alignment', e.target.value)}
                        className="select-field"
                      >
                        <option value="">Inherit ({form.alignment})</option>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-purple-600" />
                    <h3 className="text-sm font-black text-gray-900">Mobile (&lt; 768px)</h3>
                  </div>
                  <ToggleRow
                    label="Visible on Mobile"
                    checked={form.show_on_mobile}
                    onChange={(val) => setField('show_on_mobile', val)}
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="label text-xs">Mobile Message (English, optional override)</label>
                      <input
                        type="text"
                        value={form.mobile_message_en}
                        onChange={(e) => setField('mobile_message_en', e.target.value)}
                        placeholder="Shorter text for mobile screens..."
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Mobile Message (Khmer, optional override)</label>
                      <input
                        type="text"
                        value={form.mobile_message_km}
                        onChange={(e) => setField('mobile_message_km', e.target.value)}
                        placeholder="អក្សរខ្លីសម្រាប់ទូរស័ព្ទ..."
                        className="input-field khmer-font"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="label text-xs">Font Size (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={32}
                        placeholder={`${form.font_size}`}
                        value={form.mobile_font_size ?? ''}
                        onChange={(e) => setField('mobile_font_size', e.target.value === '' ? null : Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Height (px)</label>
                      <input
                        type="number"
                        min={24}
                        max={120}
                        placeholder={`${form.height}`}
                        value={form.mobile_height ?? ''}
                        onChange={(e) => setField('mobile_height', e.target.value === '' ? null : Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Padding X (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={64}
                        placeholder={`${form.padding_x}`}
                        value={form.mobile_padding_x ?? ''}
                        onChange={(e) => setField('mobile_padding_x', e.target.value === '' ? null : Number(e.target.value))}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Alignment</label>
                      <select
                        value={form.mobile_alignment}
                        onChange={(e) => setField('mobile_alignment', e.target.value)}
                        className="select-field"
                      >
                        <option value="">Inherit ({form.alignment})</option>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-5">
                {/* Schedule */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Start Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={form.start_at}
                      onChange={(e) => setField('start_at', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">End Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      value={form.end_at}
                      onChange={(e) => setField('end_at', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <ToggleRow
                    label="Active Status"
                    hint="Enable or disable bar"
                    checked={form.is_active}
                    onChange={(val) => setField('is_active', val)}
                  />
                  <div>
                    <label className="label">Display Priority</label>
                    <input
                      type="number"
                      min={0}
                      value={form.priority}
                      onChange={(e) => setField('priority', Math.max(0, Number(e.target.value)))}
                      className="input-field"
                    />
                    <p className="mt-1 text-[11px] text-gray-400">Lower number shows first (0 = highest).</p>
                  </div>
                  <div>
                    <label className="label">Language Display Rule</label>
                    <select
                      value={form.language_rule}
                      onChange={(e) => setField('language_rule', e.target.value)}
                      className="select-field"
                    >
                      <option value="all">All Languages (EN + KH)</option>
                      <option value="en">English Only</option>
                      <option value="km">Khmer Only</option>
                    </select>
                  </div>
                </div>

                {/* Page Display Rules */}
                <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate size={16} className="text-purple-600" />
                      <span className="text-sm font-bold text-gray-900">Page Display Rules</span>
                    </div>
                    <select
                      value={form.page_display_mode}
                      onChange={(e) => setField('page_display_mode', e.target.value)}
                      className="select-field w-auto"
                    >
                      <option value="all">Display on All Pages</option>
                      <option value="selected">Display on Selected Pages</option>
                    </select>
                  </div>

                  {form.page_display_mode === 'selected' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
                      {ANNOUNCEMENT_PAGE_OPTIONS.map((page) => {
                        const checked = (form.target_pages || []).includes(page.key)
                        return (
                          <button
                            key={page.key}
                            type="button"
                            onClick={() => toggleArrayValue('target_pages', page.key)}
                            className={cn(
                              'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition',
                              checked
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                            )}
                          >
                            <span className={cn(
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                              checked ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300'
                            )}>
                              {checked && <Check size={11} />}
                            </span>
                            <span className="truncate">{page.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Target Stores */}
                <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Target Stores</span>
                    <button
                      type="button"
                      onClick={() => setField('target_stores', [])}
                      className="text-xs font-semibold text-purple-600 hover:underline"
                    >
                      {(form.target_stores || []).length === 0 ? 'All Stores Selected' : 'Reset to All Stores'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Leave all unchecked to display on every store.</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {storeOptions.map((store) => {
                      const active = (form.target_stores || []).includes(store.id)
                      return (
                        <button
                          key={store.id}
                          type="button"
                          onClick={() => toggleArrayValue('target_stores', store.id)}
                          className={cn(
                            'rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                            active
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          )}
                        >
                          {store.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Target Delivery Areas */}
                <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900">Target Delivery Areas (Optional)</span>
                    <button
                      type="button"
                      onClick={() => setField('target_delivery_areas', [])}
                      className="text-xs font-semibold text-purple-600 hover:underline"
                    >
                      {(form.target_delivery_areas || []).length === 0 ? 'All Areas' : `Clear (${form.target_delivery_areas.length})`}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Leave empty to target all delivery provinces.</p>
                  <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pt-1">
                    {CAMBODIA_PROVINCES.map((prov) => {
                      const active = (form.target_delivery_areas || []).includes(prov.key)
                      return (
                        <button
                          key={prov.key}
                          type="button"
                          onClick={() => toggleArrayValue('target_delivery_areas', prov.key)}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition',
                            active
                              ? 'border-purple-500 bg-purple-600 text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {prov.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Design Preview */}
        <div className="xl:col-span-5">
          <div className="sticky top-20 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-purple-600" />
                <h3 className="text-sm font-black text-gray-950">Live Design Preview</h3>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Device switcher */}
                <div className="inline-flex rounded-xl bg-gray-100 p-1">
                  {[
                    { key: 'desktop', label: 'Desktop', Icon: Laptop },
                    { key: 'tablet', label: 'Tablet', Icon: Tablet },
                    { key: 'mobile', label: 'Mobile', Icon: Smartphone },
                  ].map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreviewDevice(key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition',
                        previewDevice === key ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      )}
                      title={`${label} preview`}
                    >
                      <Icon size={13} />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Language switcher */}
                <div className="inline-flex rounded-xl bg-gray-100 p-1">
                  {[
                    { key: 'en', label: 'EN' },
                    { key: 'km', label: 'KH' },
                  ].map((lang) => (
                    <button
                      key={lang.key}
                      type="button"
                      onClick={() => setPreviewLang(lang.key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition',
                        previewLang === lang.key ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <Globe size={11} />
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulated Storefront Viewport */}
            <div className="flex justify-center rounded-2xl border border-gray-200 bg-slate-100 p-4">
              <div
                className={cn(
                  'w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-all duration-300',
                  previewDevice === 'mobile' && 'max-w-[360px]',
                  previewDevice === 'tablet' && 'max-w-[560px]'
                )}
              >
                {previewPresentation.visible ? (
                  <AnnouncementBarStage
                    announcements={[form]}
                    activeIndex={0}
                    device={previewDevice}
                    language={previewLang}
                    isPreview
                    onDismiss={() => toast('Close button clicked in preview')}
                  />
                ) : (
                  <div className="flex items-center justify-center bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-800">
                    {previewPresentation.hiddenReason}
                  </div>
                )}

                {/* Mock Storefront Header */}
                <div className="border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                        <Sparkles size={15} />
                      </div>
                      <span className="text-sm font-black text-gray-900">
                        {siteSettings?.store_name || 'Shadow Shop'}
                      </span>
                    </div>
                    <div className="hidden h-7 flex-1 rounded-lg bg-gray-100 sm:block" />
                    <div className="flex gap-1.5">
                      <span className="h-7 w-7 rounded-lg bg-gray-100" />
                      <span className="h-7 w-7 rounded-lg bg-pink-100" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="h-24 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50" />
                  <div className="grid grid-cols-3 gap-2">
                    <div className="h-14 rounded-lg bg-gray-100" />
                    <div className="h-14 rounded-lg bg-gray-100" />
                    <div className="h-14 rounded-lg bg-gray-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Computed Metadata */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <span className="block text-[10px] font-bold uppercase text-gray-400">Device</span>
                <span className="font-bold capitalize">{previewDevice}</span>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <span className="block text-[10px] font-bold uppercase text-gray-400">Size / Height</span>
                <span className="font-bold">{previewPresentation.fontSize || form.font_size}px / {previewPresentation.height || form.height}px</span>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <span className="block text-[10px] font-bold uppercase text-gray-400">Animation</span>
                <span className="font-bold capitalize">{form.reduced_motion ? 'Reduced' : form.animation_type}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

