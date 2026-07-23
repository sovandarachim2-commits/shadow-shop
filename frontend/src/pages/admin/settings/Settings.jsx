import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, TestTube, MapPin, CreditCard, Upload, Plus, Pencil, X, Trash2, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import { useState, useRef, useEffect } from 'react'
import client from '@/api/client'
import { authApi } from '@/api/auth'

const SECTION_TITLES = {
  general:  'General Settings',
  telegram: 'Telegram Bot',
  delivery: 'Delivery Settings',
  payment:  'Payment Methods',
  printLogo: 'Print Logo',
  loginSplash: 'Login Logo',
  customerFooter: 'Customer Footer',
}

const DEFAULT_FOOTER_MENUS = {
  customerService: {
    title: 'Customer Service',
    items: [
      { label: 'Contact Us', url: '', enabled: true },
      { label: 'FAQs', url: '', enabled: true },
      { label: 'Shipping Policy', url: '', enabled: true },
      { label: 'Return & Refund', url: '', enabled: true },
      { label: 'Terms & Conditions', url: '', enabled: true },
    ],
  },
  information: {
    title: 'Information',
    items: [
      { label: 'About Us', url: '', enabled: true },
      { label: 'Privacy Policy', url: '', enabled: true },
      { label: 'Careers', url: '', enabled: true },
      { label: 'Blog', url: '', enabled: true },
      { label: 'Sitemap', url: '', enabled: true },
    ],
  },
}

function normalizeFooterMenus(value = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_FOOTER_MENUS).map(([sectionKey, section]) => {
      const savedSection = value?.[sectionKey] || {}
      const savedItems = Array.isArray(savedSection.items) ? savedSection.items : []
      const items = savedItems.length > 0 ? savedItems : section.items

      return [sectionKey, {
        title: savedSection.title || section.title,
        items: items.map((item) => ({
          label: item.label || '',
          url: item.url || '',
          enabled: item.enabled !== false,
        })),
      }]
    })
  )
}

function normalizeTelegramUrl(value = '') {
  const clean = String(value || '').trim()
  if (!clean) return ''
  if (clean.startsWith('@')) return `https://t.me/${clean.slice(1)}`
  if (/^t\.me\//i.test(clean)) return `https://${clean}`
  if (/^telegram\.me\//i.test(clean)) return `https://${clean}`
  return clean
}

function paymentSettingsPayload(paymentMethods) {
  const payload = {}
  for (const method of ['bakong', 'aba', 'acleda', 'wing', 'cod', 'cash', 'contact_sales']) {
    payload[method] = paymentMethods[method] !== false
  }
  payload.contact_sales_url = normalizeTelegramUrl(paymentMethods.contact_sales_url)
  return payload
}

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (typeof data === 'string') return data
  if (typeof data?.detail === 'string') return data.detail
  const first = data && Object.values(data).find(Boolean)
  if (Array.isArray(first)) return first[0] || fallback
  if (typeof first === 'string') return first
  return fallback
}

export default function Settings({ tab = 'general' }) {
  const queryClient = useQueryClient()

  // ── General Settings ──────────────────────────────────────────────
  const [generalForm, setGeneralForm] = useState({
    store_name: '', store_phone: '', store_email: '', store_address: '', currency: 'USD', timezone: 'Asia/Phnom_Penh',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [faviconFile, setFaviconFile] = useState(null)
  const [printLogoFile, setPrintLogoFile] = useState(null)
  const [loginLogoFile, setLoginLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [faviconPreview, setFaviconPreview] = useState(null)
  const [printLogoPreview, setPrintLogoPreview] = useState(null)
  const [loginLogoPreview, setLoginLogoPreview] = useState(null)
  const [printLogoSize, setPrintLogoSize] = useState(64)
  const [printQrSize, setPrintQrSize] = useState(68)
  const logoInputRef = useRef()
  const faviconInputRef = useRef()
  const printLogoInputRef = useRef()
  const loginLogoInputRef = useRef()

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
  })

  useEffect(() => {
    if (!siteSettings) return
    setGeneralForm({
      store_name: siteSettings.store_name || '',
      store_phone: siteSettings.store_phone || '',
      store_email: siteSettings.store_email || '',
      store_address: siteSettings.store_address || '',
      currency: siteSettings.currency || 'USD',
      timezone: siteSettings.timezone || 'Asia/Phnom_Penh',
    })
    if (siteSettings.delivery_fees && Object.keys(siteSettings.delivery_fees).length > 0) {
      setDeliveryFees(Object.fromEntries(
        Object.entries(siteSettings.delivery_fees).map(([k, v]) => [k, normalizeDeliveryZone(k, v)])
      ))
    }
    if (siteSettings.payment_methods && Object.keys(siteSettings.payment_methods).length > 0) {
      setPaymentMethods((prev) => ({
        ...prev,
        ...siteSettings.payment_methods,
        contact_sales_url: siteSettings.payment_methods.contact_sales_url || '',
      }))
    }
    setFooterMenus(normalizeFooterMenus(siteSettings.footer_menus))
    setPrintLogoSize(siteSettings.print_logo_size || 64)
    setPrintQrSize(siteSettings.print_qr_size || 68)
  }, [siteSettings])

  const saveGeneralMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('store_name', generalForm.store_name)
      fd.append('store_phone', generalForm.store_phone)
      fd.append('store_email', generalForm.store_email)
      fd.append('store_address', generalForm.store_address)
      fd.append('currency', generalForm.currency)
      fd.append('timezone', generalForm.timezone)
      if (logoFile) fd.append('logo', logoFile)
      if (faviconFile) fd.append('favicon', faviconFile)
      return authApi.siteSettings.update(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      toast.success('General settings saved!')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const pickFile = (fileSetter, previewSetter) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    fileSetter(file)
    const reader = new FileReader()
    reader.onload = (ev) => previewSetter(ev.target.result)
    reader.readAsDataURL(file)
  }

  const savePrintLogoMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (printLogoFile) fd.append('print_logo', printLogoFile)
      fd.append('print_logo_size', String(printLogoSize))
      fd.append('print_qr_size', String(printQrSize))
      return authApi.siteSettings.update(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      setPrintLogoFile(null)
      toast.success('Print logo saved!')
    },
    onError: () => toast.error('Failed to save print logo'),
  })

  const saveLoginLogoMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      if (loginLogoFile) fd.append('login_logo', loginLogoFile)
      return authApi.siteSettings.update(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      setLoginLogoFile(null)
      toast.success('Login logo saved!')
    },
    onError: () => toast.error('Failed to save login logo'),
  })

  // ── Payment Methods ───────────────────────────────────────────────
  const ALL_PAYMENT_METHODS = [
    { key: 'bakong',  label: 'Bakong KHQR',      desc: 'Bakong dynamic KHQR payment' },
    { key: 'aba',     label: 'ABA Bank',         desc: 'ABA mobile banking & QR payment' },
    { key: 'acleda',  label: 'ACLEDA Bank',      desc: 'ACLEDA mobile banking' },
    { key: 'wing',    label: 'Wing Money',       desc: 'Wing mobile payment' },
    { key: 'cod',     label: 'Cash on Delivery', desc: 'Customer pays upon receipt' },
    { key: 'cash',    label: 'Cash',             desc: 'In-store cash payment' },
    { key: 'contact_sales', label: 'Contact Sales', desc: 'Customer asks sales team to confirm payment' },
  ]
  const [paymentMethods, setPaymentMethods] = useState(
    {
      ...Object.fromEntries(ALL_PAYMENT_METHODS.map((m) => [m.key, true])),
      contact_sales_url: '',
    }
  )
  const [footerMenus, setFooterMenus] = useState(normalizeFooterMenus())

  const savePaymentMutation = useMutation({
    mutationFn: () => authApi.siteSettings.update({ payment_methods: paymentSettingsPayload(paymentMethods) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      toast.success('Payment methods saved!')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to save payment methods')),
  })

  const updateFooterSection = (sectionKey, field, value) => {
    setFooterMenus((current) => ({
      ...current,
      [sectionKey]: { ...current[sectionKey], [field]: value },
    }))
  }

  const updateFooterItem = (sectionKey, itemIndex, field, value) => {
    setFooterMenus((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        items: current[sectionKey].items.map((item, index) => (
          index === itemIndex ? { ...item, [field]: value } : item
        )),
      },
    }))
  }

  const addFooterItem = (sectionKey) => {
    setFooterMenus((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        items: [...current[sectionKey].items, { label: '', url: '', enabled: true }],
      },
    }))
  }

  const deleteFooterItem = (sectionKey, itemIndex) => {
    setFooterMenus((current) => ({
      ...current,
      [sectionKey]: {
        ...current[sectionKey],
        items: current[sectionKey].items.filter((_, index) => index !== itemIndex),
      },
    }))
  }

  const saveFooterMutation = useMutation({
    mutationFn: () => authApi.siteSettings.update({
      footer_menus: Object.fromEntries(
        Object.entries(footerMenus).map(([sectionKey, section]) => [
          sectionKey,
          {
            title: section.title.trim(),
            items: section.items
              .map((item) => ({
                label: item.label.trim(),
                url: item.url.trim(),
                enabled: item.enabled !== false,
              }))
              .filter((item) => item.label),
          },
        ])
      ),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      toast.success('Customer footer saved!')
    },
    onError: () => toast.error('Failed to save customer footer'),
  })

  // ── Delivery Settings ─────────────────────────────────────────────
  const DEFAULT_DELIVERY_FEES = {}
  const PROVINCE_OPTIONS = [
    { key: 'phnom_penh', label: 'Phnom Penh' },
    { key: 'siem_reap', label: 'Siem Reap' },
    { key: 'battambang', label: 'Battambang' },
    { key: 'kampong_cham', label: 'Kampong Cham' },
    { key: 'kandal', label: 'Kandal' },
    { key: 'takeo', label: 'Takeo' },
    { key: 'prey_veng', label: 'Prey Veng' },
    { key: 'svay_rieng', label: 'Svay Rieng' },
    { key: 'kampot', label: 'Kampot' },
    { key: 'kep', label: 'Kep' },
    { key: 'other', label: 'Other' },
  ]
  const DELIVERY_ZONE_LABELS = Object.fromEntries(PROVINCE_OPTIONS.map((z) => [z.key, z.label]))
  const normalizeDeliveryZone = (key, value) => {
    if (value && typeof value === 'object') {
      return {
        label: value.label || DELIVERY_ZONE_LABELS[key] || key,
        fee: String(value.fee ?? '0.00'),
        enabled: value.enabled !== false,
        is_default: value.is_default === true,
      }
    }
    return {
      label: DELIVERY_ZONE_LABELS[key] || key,
      fee: String(value ?? '0.00'),
      enabled: true,
      is_default: false,
    }
  }
  const [deliveryFees, setDeliveryFees] = useState(
    Object.fromEntries(Object.entries(DEFAULT_DELIVERY_FEES).map(([k, v]) => [k, normalizeDeliveryZone(k, v)]))
  )
  const [deliveryModal, setDeliveryModal] = useState(null)

  const deliveryRows = Object.entries(deliveryFees).map(([key, zone]) => ({
    key,
    label: zone.label || DELIVERY_ZONE_LABELS[key] || key.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    fee: zone.fee,
    enabled: zone.enabled !== false,
    is_default: zone.is_default === true,
  }))

  const makeDeliveryKey = (label) =>
    label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `zone_${Date.now()}`

  const serializeDeliveryFees = (fees) => Object.fromEntries(
    Object.entries(fees).map(([k, v]) => [k, {
      label: v.label || DELIVERY_ZONE_LABELS[k] || k,
      fee: parseFloat(v.fee) || 0,
      enabled: v.enabled !== false,
      is_default: v.is_default === true,
    }])
  )

  const openDeliveryModal = (zone = null) => {
    setDeliveryModal(zone
      ? { mode: 'edit', originalKey: zone.key, key: zone.key, label: zone.label, fee: String(zone.fee ?? ''), enabled: zone.enabled !== false }
      : { mode: 'add', originalKey: '', key: '', label: '', fee: '', enabled: true })
  }

  const saveDeliveryModal = () => {
    if (!deliveryModal?.label?.trim()) {
      toast.error('Please select a province')
      return
    }

    const selectedProvince = PROVINCE_OPTIONS.find((p) => p.key === deliveryModal.key)
    const nextKey = deliveryModal.mode === 'edit' ? deliveryModal.originalKey : (selectedProvince?.key || makeDeliveryKey(deliveryModal.label))
    const nextLabel = deliveryModal.mode === 'edit' ? deliveryModal.label.trim() : (selectedProvince?.label || deliveryModal.label.trim())
    const nextFee = parseFloat(deliveryModal.fee)
    if (Number.isNaN(nextFee) || nextFee < 0) {
      toast.error('Please enter a valid delivery fee')
      return
    }

    const nextFees = {
      ...deliveryFees,
      [nextKey]: {
        label: nextLabel,
        fee: nextFee.toFixed(2),
        enabled: deliveryModal.enabled !== false,
        is_default: deliveryFees[deliveryModal.originalKey || nextKey]?.is_default === true,
      },
    }
    setDeliveryFees(nextFees)
    setDeliveryModal(null)
    saveDeliveryMutation.mutate(nextFees)
  }

  const toggleDeliveryZone = (key) => {
    const nextFees = {
      ...deliveryFees,
      [key]: {
        ...deliveryFees[key],
        enabled: deliveryFees[key]?.enabled === false,
      },
    }
    setDeliveryFees(nextFees)
    saveDeliveryMutation.mutate(nextFees)
  }

  const deleteDeliveryZone = (key) => {
    const nextFees = { ...deliveryFees }
    delete nextFees[key]
    setDeliveryFees(nextFees)
    saveDeliveryMutation.mutate(nextFees)
  }

  const setDefaultDeliveryZone = (key) => {
    const nextFees = Object.fromEntries(
      Object.entries(deliveryFees).map(([zoneKey, zone]) => [
        zoneKey,
        { ...zone, is_default: zoneKey === key },
      ])
    )
    setDeliveryFees(nextFees)
    saveDeliveryMutation.mutate(nextFees)
  }

  const saveDeliveryMutation = useMutation({
    mutationFn: (fees = deliveryFees) => authApi.siteSettings.update({ delivery_fees: serializeDeliveryFees(fees) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
      toast.success('Delivery fees saved!')
    },
    onError: () => toast.error('Failed to save delivery fees'),
  })

  // ── Telegram Settings ─────────────────────────────────────────────
  const TELEGRAM_NOTIFICATION_OPTIONS = [
    ['notify_new_order', 'New Orders (customer/admin created)'],
    ['notify_payment', 'Payment Received'],
    ['notify_low_stock', 'Low Stock Alert'],
    ['notify_delivery', 'Delivery Updates'],
    ['notify_daily_summary', 'Daily Summary'],
  ]
  const emptyTelegramForm = {
    name: '', bot_username: '', bot_token: '', chat_id: '', topic_id: '', is_active: true,
    notify_new_order: true, notify_payment: true,
    notify_low_stock: true, notify_delivery: true,
    notify_daily_summary: true,
  }
  const [telegramForm, setTelegramForm] = useState(emptyTelegramForm)
  const [telegramModal, setTelegramModal] = useState(null)

  const openTelegramModal = (config = null) => {
    setTelegramForm(config ? { ...emptyTelegramForm, ...config, topic_id: config.topic_id || '' } : { ...emptyTelegramForm, name: 'Default' })
    setTelegramModal(config ? 'edit' : 'add')
  }

  const normalizeTelegramPayload = (data) => ({
    ...data,
    name: data.name?.trim() || 'Default',
    bot_username: (data.bot_username || '').replace('@', '').trim(),
    chat_id: String(data.chat_id || '').trim(),
    topic_id: data.topic_id === '' || data.topic_id === null ? null : Number(data.topic_id),
  })

  const { data: telegramConfigs } = useQuery({
    queryKey: ['telegram-configs'],
    queryFn: () => client.get('/notifications/telegram/').then((r) => r.data.results || r.data),
  })

  const saveTelegramMutation = useMutation({
    mutationFn: (data) => {
      const payload = normalizeTelegramPayload(data)
      return payload.id
        ? client.patch(`/notifications/telegram/${payload.id}/`, payload)
        : client.post('/notifications/telegram/', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-configs'] })
      setTelegramModal(null)
      toast.success('Telegram settings saved!')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const testMutation = useMutation({
    mutationFn: (id) => client.post(`/notifications/telegram/${id}/test/`),
    onSuccess: ({ data }) =>
      data.success
        ? toast.success('Test message sent!')
        : toast.error(data.detail || 'Test failed - check your settings'),
    onError: (error) => toast.error(error?.response?.data?.detail || 'Test failed - check your settings'),
  })

  const deleteTelegramMutation = useMutation({
    mutationFn: (id) => client.delete(`/notifications/telegram/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-configs'] })
      toast.success('Telegram config deleted')
    },
    onError: () => toast.error('Failed to delete Telegram config'),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{SECTION_TITLES[tab]}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Settings › {SECTION_TITLES[tab]}</p>
        </div>
      </div>

      <div className={`form-card mt-6 ${['telegram', 'customerFooter'].includes(tab) ? 'max-w-5xl' : 'max-w-2xl'}`}>
        {tab === 'general' && (
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <label className="label">Store Logo</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-purple-400 transition bg-gray-50"
                >
                  {logoPreview || siteSettings?.logo_url ? (
                    <img src={logoPreview || siteSettings.logo_url} alt="logo" className="w-full h-full object-contain" />
                  ) : (
                    <Upload size={22} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="btn-secondary text-sm px-4 py-2">
                    {logoPreview || siteSettings?.logo_url ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  <p className="mt-1 text-xs text-gray-400">PNG, JPG, SVG · shown in header & footer</p>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={pickFile(setLogoFile, setLogoPreview)} />
              </div>
            </div>

            {/* Favicon */}
            <div>
              <label className="label">Favicon</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => faviconInputRef.current?.click()}
                  className="relative w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:border-purple-400 transition bg-gray-50"
                >
                  {faviconPreview || siteSettings?.favicon_url ? (
                    <img src={faviconPreview || siteSettings.favicon_url} alt="favicon" className="w-full h-full object-contain" />
                  ) : (
                    <Upload size={16} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <button type="button" onClick={() => faviconInputRef.current?.click()}
                    className="btn-secondary text-sm px-4 py-2">
                    {faviconPreview || siteSettings?.favicon_url ? 'Change Favicon' : 'Upload Favicon'}
                  </button>
                  <p className="mt-1 text-xs text-gray-400">16×16 or 32×32 PNG · browser tab icon</p>
                </div>
                <input ref={faviconInputRef} type="file" accept="image/*" className="hidden"
                  onChange={pickFile(setFaviconFile, setFaviconPreview)} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div>
                <label className="label">Store Name</label>
                <input className="input-field" value={generalForm.store_name}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, store_name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Store Phone</label>
                <input className="input-field" placeholder="+855 xx xxx xxxx" value={generalForm.store_phone}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, store_phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Store Email</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="no-reply-shadow-shop@dertinh.com"
                  value={generalForm.store_email}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, store_email: e.target.value }))}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Webmail for the store profile. OTP emails use Store Name + this address, and show the Login Logo in the message.
                </p>
              </div>
              <div>
                <label className="label">Store Address</label>
                <textarea className="input-field resize-none" rows={2} value={generalForm.store_address}
                  onChange={(e) => setGeneralForm((f) => ({ ...f, store_address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Currency</label>
                  <select className="select-field" value={generalForm.currency}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, currency: e.target.value }))}>
                    <option value="USD">USD ($)</option>
                    <option value="KHR">KHR (฿)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Time Zone</label>
                  <select className="select-field" value={generalForm.timezone}
                    onChange={(e) => setGeneralForm((f) => ({ ...f, timezone: e.target.value }))}>
                    <option value="Asia/Phnom_Penh">Asia/Phnom_Penh</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button onClick={() => saveGeneralMutation.mutate()}
                disabled={saveGeneralMutation.isPending}
                className="btn-primary flex items-center gap-2">
                <Save size={15} /> {saveGeneralMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'telegram' && (
          <div className="space-y-5">
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
              <p className="mb-1 font-semibold">Setup Instructions</p>
              <ol className="ml-4 list-decimal space-y-1 text-xs">
                <li>Create a bot with @BotFather on Telegram</li>
                <li>Copy the bot username and token</li>
                <li>Add the bot to each group you want to notify</li>
                <li>Use Group Topic ID when the group uses Telegram forum topics</li>
                <li>Set the webhook to /api/auth/telegram/webhook/ on your public HTTPS domain</li>
              </ol>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">Notification Destinations</p>
                <p className="text-xs text-gray-400">Create different rows for orders, payments, delivery, or stock alerts.</p>
              </div>
              <button
                type="button"
                onClick={() => openTelegramModal()}
                className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm"
              >
                <Plus size={15} /> Add New
              </button>
            </div>

            <div className="grid gap-3">
              {(telegramConfigs || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                  <p className="text-sm font-bold text-gray-900">No Telegram destinations yet</p>
                  <p className="mt-1 text-xs text-gray-400">Add one group or topic to start sending order notifications.</p>
                </div>
              )}

              {(telegramConfigs || []).map((config) => (
                <div key={config.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-gray-950">{config.name || 'Default'}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                          config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {config.is_active ? 'Active' : 'Off'}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-2">
                        <span className="font-mono">@{config.bot_username || 'no_username'}</span>
                        <span className="font-mono">Group: {config.chat_id}</span>
                        <span className="font-mono">Topic: {config.topic_id || 'No topic'}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {TELEGRAM_NOTIFICATION_OPTIONS.filter(([key]) => config[key]).map(([, label]) => (
                          <span key={label} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-purple-600 shadow-sm">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => testMutation.mutate(config.id)}
                        className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs"
                      >
                        <TestTube size={14} /> Test
                      </button>
                      <button
                        type="button"
                        onClick={() => openTelegramModal(config)}
                        className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTelegramMutation.mutate(config.id)}
                        className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-gray-400">New Order Message Includes</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-3">
                <span>Order code</span>
                <span>Source</span>
                <span>Customer name</span>
                <span>Customer phone</span>
                <span>Product list</span>
                <span>Total amount</span>
              </div>
            </div>

            {telegramModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm">
                <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-purple-600">
                        {telegramModal === 'edit' ? 'Edit Telegram Destination' : 'Add Telegram Destination'}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-gray-950">Group Notification</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTelegramModal(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 text-gray-500"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Name</label>
                      <input
                        className="input-field"
                        value={telegramForm.name || ''}
                        onChange={(e) => setTelegramForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Orders Group"
                      />
                    </div>
                    <div>
                      <label className="label">Bot Username</label>
                      <input
                        className="input-field font-mono"
                        value={telegramForm.bot_username || ''}
                        onChange={(e) => setTelegramForm((f) => ({ ...f, bot_username: e.target.value.replace('@', '') }))}
                        placeholder="shadow_shop_bot"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Bot Token</label>
                      <input
                        className="input-field font-mono"
                        value={telegramForm.bot_token || ''}
                        onChange={(e) => setTelegramForm((f) => ({ ...f, bot_token: e.target.value }))}
                        placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                      />
                    </div>
                    <div>
                      <label className="label">Group / Chat ID</label>
                      <input
                        className="input-field font-mono"
                        value={telegramForm.chat_id || ''}
                        onChange={(e) => setTelegramForm((f) => ({ ...f, chat_id: e.target.value }))}
                        placeholder="-100xxxxxxxxxx"
                      />
                    </div>
                    <div>
                      <label className="label">Group Topic ID</label>
                      <input
                        type="number"
                        min="1"
                        className="input-field font-mono"
                        value={telegramForm.topic_id || ''}
                        onChange={(e) => setTelegramForm((f) => ({ ...f, topic_id: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <label className="mt-4 flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                    <span>
                      <span className="block text-sm font-bold text-gray-900">Active</span>
                      <span className="text-xs text-gray-400">Turn off to keep this row saved without sending messages</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={telegramForm.is_active !== false}
                      onChange={(e) => setTelegramForm((f) => ({ ...f, is_active: e.target.checked }))}
                      className="h-5 w-5 accent-purple-600"
                    />
                  </label>

                  <div className="mt-4 space-y-2">
                    <label className="label">Notifications to send</label>
                    {TELEGRAM_NOTIFICATION_OPTIONS.map(([key, label]) => (
                      <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl bg-gray-50 p-3 hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={telegramForm[key] !== false}
                          onChange={(e) => setTelegramForm((f) => ({ ...f, [key]: e.target.checked }))}
                          className="h-4 w-4 accent-purple-600"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setTelegramModal(null)}
                      className="btn-secondary px-5 py-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveTelegramMutation.mutate(telegramForm)}
                      disabled={saveTelegramMutation.isPending}
                      className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-60"
                    >
                      <Save size={15} /> {saveTelegramMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'loginSplash' && (
          <div className="space-y-5">
            <div>
              <label className="label">Login Logo</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => loginLogoInputRef.current?.click()}
                  className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-purple-400"
                >
                  {loginLogoPreview || siteSettings?.login_logo_url || siteSettings?.logo_url ? (
                    <img
                      src={loginLogoPreview || siteSettings?.login_logo_url || siteSettings?.logo_url}
                      alt="login logo"
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <Upload size={24} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => loginLogoInputRef.current?.click()}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    {loginLogoPreview || siteSettings?.login_logo_url ? 'Change Login Logo' : 'Upload Login Logo'}
                  </button>
                  <p className="mt-1 text-xs text-gray-400">Shown on the customer login and sign-up screen. Square PNG works best.</p>
                </div>
                <input
                  ref={loginLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={pickFile(setLoginLogoFile, setLoginLogoPreview)}
                />
              </div>
            </div>

            <button
              onClick={() => saveLoginLogoMutation.mutate()}
              disabled={saveLoginLogoMutation.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              <Save size={15} /> {saveLoginLogoMutation.isPending ? 'Saving...' : 'Save Login Logo'}
            </button>
          </div>
        )}

        {tab === 'printLogo' && (
          <div className="space-y-5">
            <div>
              <label className="label">Print Logo</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => printLogoInputRef.current?.click()}
                  className="relative flex h-28 w-44 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-purple-400"
                >
                  {printLogoPreview || siteSettings?.print_logo_url ? (
                    <img src={printLogoPreview || siteSettings.print_logo_url} alt="print logo" className="h-full w-full object-contain p-3" />
                  ) : (
                    <Upload size={24} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => printLogoInputRef.current?.click()}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    {printLogoPreview || siteSettings?.print_logo_url ? 'Change Print Logo' : 'Upload Print Logo'}
                  </button>
                  <p className="mt-1 text-xs text-gray-400">Used on receipt and delivery note prints. PNG with transparent background works best.</p>
                </div>
                <input
                  ref={printLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={pickFile(setPrintLogoFile, setPrintLogoPreview)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-wide text-gray-400">Print Preview</p>
              <div className="mx-auto flex w-[80mm] max-w-full flex-col items-center rounded-xl bg-white px-3 py-5 text-center shadow-sm">
                {printLogoPreview || siteSettings?.print_logo_url ? (
                  <img
                    src={printLogoPreview || siteSettings.print_logo_url}
                    alt="print preview"
                    className="mb-2 w-full object-contain"
                    style={{ maxHeight: `${printLogoSize}px` }}
                  />
                ) : (
                  <>
                    <div className="text-3xl leading-none">✿</div>
                    <div className="font-serif text-4xl italic leading-none">shadow</div>
                  </>
                )}
                <div className="mt-2 text-sm font-black tracking-[0.22em]">RECEIPT</div>
                <div
                  className="mt-4 flex items-center justify-center border-2 border-black text-center text-[8px] font-black"
                  style={{ width: `${printQrSize}px`, height: `${printQrSize}px` }}
                >
                  QR
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label mb-0">Logo Size</label>
                <span className="text-xs font-black text-purple-600">{printLogoSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="36"
                  max="120"
                  value={printLogoSize}
                  onChange={(e) => setPrintLogoSize(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <input
                  type="number"
                  min="36"
                  max="120"
                  value={printLogoSize}
                  onChange={(e) => setPrintLogoSize(Math.min(120, Math.max(36, Number(e.target.value) || 64)))}
                  className="input-field w-24"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Controls the logo height on receipt and delivery note printouts.</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label mb-0">QR Code Size</label>
                <span className="text-xs font-black text-purple-600">{printQrSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="48"
                  max="120"
                  value={printQrSize}
                  onChange={(e) => setPrintQrSize(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <input
                  type="number"
                  min="48"
                  max="120"
                  value={printQrSize}
                  onChange={(e) => setPrintQrSize(Math.min(120, Math.max(48, Number(e.target.value) || 68)))}
                  className="input-field w-24"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">Controls the QR box size on receipt and delivery note printouts.</p>
            </div>

            <button
              onClick={() => savePrintLogoMutation.mutate()}
              disabled={savePrintLogoMutation.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              <Save size={15} /> {savePrintLogoMutation.isPending ? 'Saving...' : 'Save Print Logo Settings'}
            </button>
          </div>
        )}

        {tab === 'delivery' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">Configure delivery zones and fees per province.</p>
              <button
                type="button"
                onClick={() => openDeliveryModal()}
                className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Plus size={15} /> Add Zone
              </button>
            </div>

            <div className="grid gap-3">
              {deliveryRows.map((z) => (
                <div key={z.key} className={`flex items-center justify-between rounded-2xl border p-4 ${z.enabled ? 'border-gray-100 bg-gray-50' : 'border-gray-100 bg-white opacity-70'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ${z.enabled ? 'text-purple-600' : 'text-gray-300'}`}>
                      <MapPin size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{z.label}</p>
                        {z.is_default && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{z.key} · {z.enabled ? 'On' : 'Off'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-gray-900 shadow-sm">
                      ${Number(z.fee || 0).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDefaultDeliveryZone(z.key)}
                      disabled={z.is_default}
                      className="rounded-xl border border-purple-100 bg-white px-3 py-2 text-xs font-black text-purple-600 hover:bg-purple-50 disabled:cursor-default disabled:opacity-50"
                    >
                      Set Default
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleDeliveryZone(z.key)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white ${
                        z.enabled
                          ? 'border-green-100 text-green-600 hover:bg-green-50'
                          : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                      title={z.enabled ? 'Turn off' : 'Turn on'}
                    >
                      <Power size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeliveryModal(z)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:border-purple-200 hover:text-purple-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDeliveryZone(z.key)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {deliveryModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-purple-600">
                        {deliveryModal.mode === 'edit' ? 'Edit Delivery Zone' : 'Add Delivery Zone'}
                      </p>
                      <h2 className="mt-1 text-xl font-black text-gray-950">
                        {deliveryModal.mode === 'edit' ? 'Update Fee' : 'New Zone'}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeliveryModal(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 text-gray-500"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="label">Province</label>
                      {deliveryModal.mode === 'add' ? (
                        <select
                          className="select-field"
                          value={deliveryModal.key}
                          onChange={(e) => {
                            const selected = PROVINCE_OPTIONS.find((p) => p.key === e.target.value)
                            setDeliveryModal((m) => ({ ...m, key: e.target.value, label: selected?.label || '' }))
                          }}
                        >
                          <option value="">Select province</option>
                          {PROVINCE_OPTIONS.filter((province) => !deliveryFees[province.key]).map((province) => (
                            <option key={province.key} value={province.key}>{province.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="input-field"
                          value={deliveryModal.label}
                          disabled
                        />
                      )}
                      {deliveryModal.mode === 'edit' && (
                        <p className="mt-1 text-xs text-gray-400">Zone name is locked to keep existing checkout mappings stable.</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Delivery Fee</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="input-field pl-8"
                          value={deliveryModal.fee}
                          onChange={(e) => setDeliveryModal((m) => ({ ...m, fee: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <label className="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                      <span>
                        <span className="block text-sm font-bold text-gray-900">Status</span>
                        <span className="text-xs text-gray-400">Show this delivery zone at checkout</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={deliveryModal.enabled !== false}
                        onChange={(e) => setDeliveryModal((m) => ({ ...m, enabled: e.target.checked }))}
                        className="h-5 w-5 accent-purple-600"
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryModal(null)}
                      className="btn-secondary px-5 py-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={saveDeliveryModal}
                      className="btn-primary flex items-center gap-2 px-5 py-2.5"
                    >
                      <Save size={15} /> Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'payment' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Enable or disable payment methods available at checkout.</p>
            {ALL_PAYMENT_METHODS.map((p) => (
              <div key={p.key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100">
                      <CreditCard size={16} className={paymentMethods[p.key] ? 'text-purple-600' : 'text-gray-300'} />
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${paymentMethods[p.key] ? 'text-gray-900' : 'text-gray-400'}`}>{p.label}</p>
                      <p className="text-xs text-gray-400">{p.desc}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={paymentMethods[p.key] ?? true}
                      onChange={(e) => setPaymentMethods((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  </label>
                </div>
                {p.key === 'contact_sales' && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <label className="label">Telegram Sales Link</label>
                    <input
                      type="text"
                      className="input-field bg-white"
                      placeholder="@your_sales_account or https://t.me/your_sales_account"
                      value={paymentMethods.contact_sales_url || ''}
                      onChange={(e) => setPaymentMethods((prev) => ({ ...prev, contact_sales_url: e.target.value }))}
                    />
                    <p className="mt-1 text-xs text-gray-400">Shown to customers when they choose Contact Sales. Accepts @username, t.me/username, or full URL.</p>
                  </div>
                )}
              </div>
            ))}
            <div className="pt-2">
              <button
                onClick={() => savePaymentMutation.mutate()}
                disabled={savePaymentMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={15} /> {savePaymentMutation.isPending ? 'Saving...' : 'Save Payment Methods'}
              </button>
            </div>
          </div>
        )}

        {tab === 'customerFooter' && (
          <div className="space-y-5">
            <div className="rounded-xl bg-pink-50 p-4 text-sm text-pink-800">
              Manage the menu labels and links shown in the desktop customer footer.
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {Object.entries(footerMenus).map(([sectionKey, section]) => (
                <div key={sectionKey} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-4">
                    <label className="label">Column Title</label>
                    <input
                      className="input-field bg-white"
                      value={section.title}
                      onChange={(e) => updateFooterSection(sectionKey, 'title', e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    {section.items.map((item, itemIndex) => (
                      <div key={`${sectionKey}-${itemIndex}`} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-[1fr_1.3fr_auto_auto] md:items-end">
                          <div>
                            <label className="label">Label</label>
                            <input
                              className="input-field"
                              value={item.label}
                              onChange={(e) => updateFooterItem(sectionKey, itemIndex, 'label', e.target.value)}
                              placeholder="Menu label"
                            />
                          </div>
                          <div>
                            <label className="label">URL</label>
                            <input
                              className="input-field"
                              value={item.url}
                              onChange={(e) => updateFooterItem(sectionKey, itemIndex, 'url', e.target.value)}
                              placeholder="/contact or https://..."
                            />
                          </div>
                          <label className="flex h-11 items-center gap-2 rounded-xl border border-gray-100 px-3 text-sm font-bold text-gray-700">
                            <input
                              type="checkbox"
                              checked={item.enabled !== false}
                              onChange={(e) => updateFooterItem(sectionKey, itemIndex, 'enabled', e.target.checked)}
                              className="h-4 w-4 accent-purple-600"
                            />
                            Show
                          </label>
                          <button
                            type="button"
                            onClick={() => deleteFooterItem(sectionKey, itemIndex)}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 text-red-500 hover:bg-red-50"
                            title="Delete menu item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addFooterItem(sectionKey)}
                    className="btn-secondary mt-4 flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <Plus size={15} /> Add Menu
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => saveFooterMutation.mutate()}
              disabled={saveFooterMutation.isPending}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              <Save size={15} /> {saveFooterMutation.isPending ? 'Saving...' : 'Save Customer Footer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
