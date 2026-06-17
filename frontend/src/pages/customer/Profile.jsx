import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  User, MapPin, Shield, LogOut, ChevronRight, ChevronDown, Camera,
  Package, Heart, CheckCircle2, Pencil, Trash2, Lock, Loader2, Truck, ShoppingBag,
  ArrowLeft, Mail, Phone, CalendarDays, IdCard, Award, Sparkles, Languages,
  Bell, Settings, PackageCheck, Star, Percent, CreditCard, HelpCircle, ClipboardList, Gift,
  Home, Headphones,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useWishlistStore from '@/store/wishlistStore'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { Modal } from '@/components/ui/Modal'
import { cn, formatCurrency, formatDate } from '@/utils/helpers'

const ACCOUNT_MENU_ITEMS = [
  { icon: User, label: 'Profile', description: 'Edit name, phone, and photo', view: 'profile' },
  { icon: Package, label: 'Orders', description: 'View orders and tracking', view: 'orders', path: '/my-orders' },
  { icon: MapPin, label: 'Addresses', description: 'Manage delivery addresses', view: 'addresses', path: '/address-book' },
  { icon: Heart, label: 'Wishlist', description: 'Saved products', view: 'wishlist', path: '/wishlist' },
  { icon: Shield, label: 'Password', description: 'Change account password', view: 'password' },
]

const ORDER_STATUS_ITEMS = [
  { key: 'pending',   label: 'Pending',   icon: ClipboardList },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'packed',    label: 'Packed',    icon: PackageCheck },
  { key: 'shipped',   label: 'Shipped',   icon: Truck },
  { key: 'completed', label: 'Completed', icon: CheckCircle2 },
]

const SHORTCUTS = [
  { tKey: 'nav.orders',       icon: ShoppingBag, path: '/my-orders' },
  { tKey: 'profile.address',  icon: MapPin,      path: '/address-book' },
  { tKey: 'wishlist.title',   icon: Heart,       path: '/wishlist' },
  { tKey: 'profile.rewards',  icon: Gift,        path: '/profile' },
  { tKey: 'profile.coupons',  icon: Percent,     path: '/shop' },
  { tKey: 'profile.reviews',  icon: Star,        path: '/my-orders' },
]

const STATUS_LABELS = {
  new: 'Pending',
  pending: 'Pending',
  printed: 'Preparing',
  preparing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  completed: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_STYLES = {
  new: 'bg-yellow-50 text-yellow-700',
  pending: 'bg-yellow-50 text-yellow-700',
  printed: 'bg-orange-50 text-orange-700',
  preparing: 'bg-blue-50 text-blue-700',
  packed: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

function actionForOrder(order) {
  if (order.status === 'completed') return { label: 'Buy Again', icon: ShoppingBag, outline: true }
  return { label: 'Track Order', icon: Truck }
}

function compressImage(file, maxPx = 400, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality)
    }
    img.src = url
  })
}

function EditProfileModal({ user, addresses = [], onEditAddress, onClose, onSaved }) {
  const updateUser = useAuthStore((s) => s.updateUser)
  const fileInputRef = useRef(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null)
  const [form, setForm] = useState({
    full_name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    email: user.email || '',
    phone: user.phone || '',
    gender: user.gender || '',
    date_of_birth: user.date_of_birth || '',
  })

  const initials = [user.first_name, user.last_name].filter(Boolean).map((n) => n[0]).join('').toUpperCase() || user.username?.[0]?.toUpperCase() || '?'
  const memberId = `#SS${String(user.id || 0).padStart(6, '0')}`
  const memberSince = user.created_at ? formatDate(user.created_at, 'MMMM yyyy') : 'New member'
  const rewardPoints = 1250
  const membershipLevel = rewardPoints >= 3000 ? 'Platinum' : rewardPoints >= 1500 ? 'Gold' : 'Silver'
  const defaultAddress = addresses.find((addr) => addr.is_default) || addresses[0]

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    const compressed = await compressImage(file)
    setAvatarFile(compressed)
  }

  const saveMutation = useMutation({
    mutationFn: (data) => authApi.updateMe(data),
    onSuccess: ({ data }) => {
      updateUser(data)
      toast.success('Profile updated')
      onSaved()
    },
    onError: (error) => {
      const body = error.response?.data
      const message = body?.email?.[0] || body?.phone?.[0] || body?.detail || 'Failed to update profile'
      toast.error(message)
    },
  })

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const [firstName, ...lastParts] = form.full_name.trim().split(/\s+/)
    const payload = {
      email: form.email,
      phone: form.phone,
      first_name: firstName || '',
      last_name: lastParts.join(' '),
    }

    if (avatarFile) {
      const fd = new FormData()
      fd.append('avatar', avatarFile)
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v))
      saveMutation.mutate(fd)
    } else {
      saveMutation.mutate(payload)
    }
  }

  return (
    <Modal isOpen onClose={onClose} size="md" className="max-h-[94vh] overflow-hidden rounded-[28px] p-0 md:max-w-[430px]">
      <form onSubmit={handleSubmit} className="flex max-h-[94vh] flex-col bg-white">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-pink-50 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-700 transition active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-base font-black text-gray-950">Edit Profile</h2>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-full px-3 py-2 text-sm font-black text-[#E91E63] transition active:scale-95 disabled:opacity-60"
          >
            Save
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-pink-50/55 via-white to-white px-4 pb-5 pt-5">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#E91E63] to-pink-300 text-4xl font-black text-white shadow-[0_18px_45px_rgba(233,30,99,0.22)]">
                {avatarPreview
                  ? <img src={avatarPreview} alt="Profile avatar" className="h-full w-full object-cover" />
                  : initials}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-[#E91E63] text-white shadow-lg transition active:scale-95"
                aria-label="Change profile photo"
              >
                <Camera size={17} />
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-sm font-black text-[#E91E63]"
            >
              Change Photo
            </button>
          </div>

          <ProfileSection title="Personal Information" icon={User}>
            <ProfileField label="Full Name" value={form.full_name} onChange={(v) => set('full_name', v)} required icon={User} />
            <ProfileField label="Phone Number" value={form.phone} onChange={(v) => set('phone', v)} icon={Phone} />
            <ProfileField label="Email Address" type="email" value={form.email} onChange={(v) => set('email', v)} required icon={Mail} />
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">Gender</span>
              <div className="grid grid-cols-2 gap-2">
                {['Male', 'Female'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => set('gender', option.toLowerCase())}
                    className={cn(
                      'h-12 rounded-2xl border text-sm font-black transition active:scale-[0.98]',
                      form.gender === option.toLowerCase()
                        ? 'border-[#E91E63] bg-pink-50 text-[#E91E63] shadow-sm'
                        : 'border-gray-100 bg-white text-gray-500'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </label>
            <ProfileField label="Date of Birth" type="date" value={form.date_of_birth} onChange={(v) => set('date_of_birth', v)} icon={CalendarDays} />
          </ProfileSection>

          <ProfileSection title="Address" icon={MapPin}>
            <div className="rounded-[20px] bg-pink-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#E91E63] shadow-sm">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-400">Default Address</p>
                  <p className="mt-1 text-sm font-black leading-5 text-gray-950">
                    {defaultAddress ? defaultAddress.address_line1 : 'No default address yet'}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
                    {defaultAddress
                      ? [defaultAddress.address_line2, defaultAddress.city, defaultAddress.state, defaultAddress.postal_code].filter(Boolean).join(', ')
                      : 'Add your delivery address for faster checkout.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onEditAddress}
                className="mt-4 h-12 w-full rounded-2xl border border-[#E91E63]/20 bg-white text-sm font-black text-[#E91E63] shadow-sm transition active:scale-[0.98]"
              >
                Edit Address
              </button>
            </div>
          </ProfileSection>

          <ProfileSection title="Account Information" icon={IdCard}>
            <ProfileInfoRow label="Member ID" value={memberId} />
            <ProfileInfoRow label="Member Since" value={memberSince} />
            <ProfileInfoRow
              label="Verification Status"
              value={<span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-600"><CheckCircle2 size={13} /> Verified</span>}
            />
          </ProfileSection>

          <ProfileSection title="Reward Information" icon={Award}>
            <div className="rounded-[20px] bg-gradient-to-br from-[#E91E63] to-pink-400 p-4 text-white shadow-[0_16px_36px_rgba(233,30,99,0.22)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-white/75">Current Points</p>
                  <p className="mt-1 text-3xl font-black">{rewardPoints.toLocaleString()}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18">
                  <Sparkles size={22} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/16 px-4 py-3">
                <span className="text-sm font-semibold text-white/80">Membership Level</span>
                <span className="text-sm font-black">{membershipLevel}</span>
              </div>
            </div>
          </ProfileSection>
        </div>

        <div className="sticky bottom-0 z-20 space-y-3 border-t border-pink-50 bg-white px-4 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.06)]">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex h-14 w-full items-center justify-center rounded-[20px] bg-[#E91E63] text-base font-black text-white shadow-[0_14px_30px_rgba(233,30,99,0.25)] transition active:scale-[0.98] disabled:opacity-70"
          >
            {saveMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-14 w-full rounded-[20px] border border-[#E91E63]/25 bg-white text-base font-black text-[#E91E63] transition active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' })

  const saveMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully')
      onClose()
    },
    onError: (error) => {
      const body = error.response?.data
      const message = body?.old_password?.[0] || body?.new_password?.[0] || body?.detail || 'Failed to change password'
      toast.error(message)
    },
  })

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    saveMutation.mutate({ old_password: form.old_password, new_password: form.new_password })
  }

  return (
    <Modal isOpen onClose={onClose} title="Change Password" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <ProfileField
          label="Current Password"
          type="password"
          value={form.old_password}
          onChange={(v) => set('old_password', v)}
          required
        />
        <ProfileField
          label="New Password"
          type="password"
          value={form.new_password}
          onChange={(v) => set('new_password', v)}
          required
        />
        <ProfileField
          label="Confirm New Password"
          type="password"
          value={form.confirm_password}
          onChange={(v) => set('confirm_password', v)}
          required
        />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="shop-btn-outline flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saveMutation.isPending} className="shop-btn-primary flex-1">
            {saveMutation.isPending ? <Loader2 size={18} className="mx-auto animate-spin" /> : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ProfileSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[20px] border border-pink-50 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-[#E91E63]">
          <Icon size={19} />
        </div>
        <h3 className="text-base font-black text-gray-950">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function ProfileInfoRow({ label, value }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3">
      <span className="text-sm font-semibold text-gray-500">{label}</span>
      <span className="text-right text-sm font-black text-gray-950">{value}</span>
    </div>
  )
}

function ProfileField({ label, value, onChange, type = 'text', readOnly, required, icon: Icon }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-400">{label}</span>
      <div className="relative">
        {Icon && (
          <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
        )}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          required={required}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={cn(
            'h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold text-gray-950 outline-none transition placeholder:text-gray-300 focus:border-[#E91E63] focus:bg-white focus:ring-4 focus:ring-pink-100',
            Icon && 'pl-11',
            readOnly && 'cursor-not-allowed bg-gray-50 text-gray-500'
          )}
        />
      </div>
    </label>
  )
}

function ProfileSidebar({ activeView, onSelect, onLogout, isKhmer, onToggleLang }) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-2 p-4">
        {ACCOUNT_MENU_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.view === activeView
          return (
            <button
              key={item.label}
              onClick={() => onSelect(item)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition',
                isActive ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={20} />
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={16} className={isActive ? 'text-pink-300' : 'text-gray-300'} />
            </button>
          )
        })}
        <button
          onClick={onToggleLang}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <Languages size={20} />
          <span className="flex-1">{isKhmer ? 'English' : 'ភាសាខ្មែរ'}</span>
          <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-600">
            {isKhmer ? 'EN' : 'KM'}
          </span>
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50"
        >
          <LogOut size={18} />
          Logout
        </button>
      </nav>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, fetchMe } = useAuthStore()
  const wishlistItems = useWishlistStore((s) => s.items)
  const [activeModal, setActiveModal] = useState(null)
  const [activeView, setActiveView] = useState('profile')
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const { t, i18n } = useTranslation()
  const isKhmer = i18n.language === 'km'
  const toggleLang = () => i18n.changeLanguage(isKhmer ? 'en' : 'km')
  const currentLanguage = isKhmer
    ? { code: 'km', label: 'Khmer', flag: '🇰🇭' }
    : { code: 'en', label: 'English', flag: '🇺🇸' }

  const selectLanguage = (language) => {
    i18n.changeLanguage(language)
    setIsLanguageMenuOpen(false)
  }

  useEffect(() => {
    if (user) fetchMe()
  }, [user?.id])

  const { data: addresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => authApi.addresses.list().then((r) => r.data.results ?? r.data),
    enabled: Boolean(user),
  })

  const { data: accountOrders = [] } = useQuery({
    queryKey: ['profile-account-orders'],
    queryFn: () => ordersApi.orders.list({ page_size: 30 }).then((r) => r.data.results ?? r.data ?? []),
    enabled: Boolean(user),
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleMenuSelect = (item, fromMobile = false) => {
    if (fromMobile) {
      if (item.path) {
        navigate(item.path)
        return
      }
      if (item.view === 'profile') {
        setActiveModal('personal')
        return
      }
      if (item.view === 'password') {
        setActiveModal('password')
        return
      }
    }
    setActiveView(item.view)
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm pt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-pink-600">
          <User size={36} />
        </div>
        <h2 className="mt-5 text-xl font-black text-gray-950">{t('profile.signIn')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('profile.signInDesc')}</p>
        <button onClick={() => navigate('/login')} className="shop-btn-primary mt-6 px-10">
          {t('auth.login')}
        </button>
      </div>
    )
  }

  const displayName = user.full_name || (user.first_name ? `${user.first_name} ${user.last_name}` : user.username)
  const email = user.email || '—'
  const phone = user.phone || '—'
  const memberSince = user.created_at ? formatDate(user.created_at, 'MMM yyyy') : '—'
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const rewardPoints = 1250
  const nextTierPoints = 3000
  const membershipLevel = rewardPoints >= 5000 ? 'Platinum' : rewardPoints >= 3000 ? 'Gold' : 'Silver'
  const ptsToNext = Math.max(0, nextTierPoints - rewardPoints)
  const progressPct = Math.min(100, Math.round((rewardPoints / nextTierPoints) * 100))

  const orderCounts = useMemo(() => {
    const c = { pending: 0, preparing: 0, packed: 0, shipped: 0, completed: 0 }
    accountOrders.forEach((o) => {
      if (o.status === 'new' || o.status === 'pending') c.pending++
      else if (o.status === 'printed' || o.status === 'preparing') c.preparing++
      else if (o.status === 'packed') c.packed++
      else if (o.status === 'shipped') c.shipped++
      else if (o.status === 'completed') c.completed++
    })
    return c
  }, [accountOrders])

  const mobileMenuItems = [
    { icon: User,        label: t('profile.editProfile'),      desc: t('profile.signInDesc'),    action: () => setActiveModal('personal') },
    { icon: Lock,        label: t('profile.passwordSecurity'), desc: t('profile.passwordSecurity'), action: () => setActiveModal('password') },
    { icon: CreditCard,  label: t('profile.paymentMethods'),   desc: t('profile.paymentMethods'), action: () => {} },
    { icon: Bell,        label: t('profile.notifications'),    desc: t('profile.notifications'),  action: () => {} },
    { icon: HelpCircle,  label: t('profile.helpCenter'),       desc: t('profile.helpCenter'),     action: () => {} },
    { icon: LogOut,      label: t('auth.logout'),              desc: t('auth.logout'),            action: handleLogout, danger: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ═══════════════════════════════════════════
          MOBILE FULL REDESIGN
      ═══════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* ── Mobile Header ─────────────────────── */}
        <div className="flex items-center justify-between bg-white px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-sm">
          <h1 className="text-xl font-black text-gray-950">{t('nav.account')}</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsLanguageMenuOpen((open) => !open)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-gray-100 px-2.5 text-sm font-black text-gray-700 shadow-sm transition active:scale-95"
                aria-expanded={isLanguageMenuOpen}
                aria-label="Choose language"
              >
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white text-base shadow-sm">
                  {currentLanguage.flag}
                </span>
                <span>{currentLanguage.label}</span>
                <ChevronDown
                  size={14}
                  className={cn('text-gray-500 transition-transform', isLanguageMenuOpen && 'rotate-180')}
                />
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  {[
                    { code: 'en', label: 'English', flag: '🇺🇸' },
                    { code: 'km', label: 'Khmer', flag: '🇰🇭' },
                  ].map((language) => {
                    const isActive = i18n.language === language.code
                    return (
                      <button
                        key={language.code}
                        onClick={() => selectLanguage(language.code)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-black transition',
                          isActive ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        <span className="text-lg leading-none">{language.flag}</span>
                        <span className="flex-1">{language.label}</span>
                        <span className="text-xs font-black">{language.code.toUpperCase()}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:scale-90">
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-pink-500 ring-[1.5px] ring-white" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:scale-90">
              <Settings size={17} />
            </button>
          </div>
        </div>

        <div className="space-y-3 px-4 py-3.5 pb-6">

          {/* ── Profile Card ──────────────────────── */}
          <div
            className="overflow-hidden rounded-[20px] p-4 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #fff0f5 0%, #ffd6e8 100%)' }}
          >
            <div className="flex items-start gap-3.5">
              {/* Avatar */}
              <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full border-[3px] border-white shadow-md">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-400 to-purple-500 text-xl font-black text-white">
                    {initials}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-black text-gray-950">{displayName}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{email}</p>
                    <p className="truncate text-xs text-gray-500">{phone}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600">
                        <CheckCircle2 size={10} /> {t('profile.verified')}
                      </span>
                      <span className="text-[10px] text-gray-400">{t('profile.memberSince')} {memberSince}</span>
                    </div>
                  </div>
                  {/* Edit button */}
                  <button
                    onClick={() => setActiveModal('personal')}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-pink-300 bg-white px-3 py-1.5 text-xs font-bold text-pink-600 shadow-sm transition active:scale-95"
                  >
                    <Pencil size={11} /> {t('common.edit')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── My Points Card ────────────────────── */}
          <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="mb-3 flex items-center gap-1.5">
              <Gift size={15} className="text-pink-500" />
              <span className="text-sm font-black text-pink-500">{t('profile.myPoints')}</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-pink-600">{rewardPoints.toLocaleString()}</span>
                <span className="text-sm font-bold text-gray-400">pts</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5">
                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 shadow-sm" />
                <span className="text-xs font-bold text-gray-600">{membershipLevel} Member</span>
              </div>
            </div>
            {ptsToNext > 0 && (
              <p className="mt-2 text-xs text-gray-400">{t('profile.ptsMoreToGold', { count: ptsToNext.toLocaleString() })}</p>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-end">
              <span className="text-[10px] font-semibold text-gray-400">
                {rewardPoints.toLocaleString()} / {nextTierPoints.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* ── My Orders Tracker ─────────────────── */}
          <div className="rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-950">{t('nav.orders')}</h2>
              <button onClick={() => navigate('/my-orders')} className="text-[13px] font-bold text-pink-500">
                {t('common.viewAll')}
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {ORDER_STATUS_ITEMS.map(({ key, label, icon: Icon }) => {
                const count = orderCounts[key]
                return (
                  <button
                    key={key}
                    onClick={() => navigate('/my-orders')}
                    className="flex flex-col items-center gap-1.5 transition active:scale-90"
                  >
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-pink-100 bg-pink-50 text-pink-500">
                      <Icon size={20} />
                      {count > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-[9px] font-black text-white ring-[1.5px] ring-white">
                          {count > 9 ? '9+' : count}
                        </span>
                      )}
                    </div>
                    <span className="text-center text-[10px] font-semibold leading-tight text-gray-600">{t(`orders.status.${key}`)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── My Shortcuts ──────────────────────── */}
          <div>
            <h2 className="mb-2.5 text-sm font-black text-gray-950">{t('profile.myShortcuts')}</h2>
            <div className="grid grid-cols-3 gap-2.5">
              {SHORTCUTS.map(({ tKey, icon: Icon, path }) => (
                <button
                  key={tKey}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-2 rounded-[16px] bg-white py-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition active:scale-[0.96] active:bg-pink-50"
                >
                  <Icon size={22} className="text-pink-500" />
                  <span className="text-[11px] font-bold text-gray-700">{t(tKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Account Menu ──────────────────────── */}
          <div>
            <h2 className="mb-2.5 text-sm font-black text-gray-950">{t('profile.accountMenu')}</h2>
            <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              {mobileMenuItems.map(({ icon: Icon, label, desc, action, danger }, idx) => (
                <button
                  key={label}
                  onClick={action}
                  className={cn(
                    'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition active:bg-gray-50',
                    idx < mobileMenuItems.length - 1 && 'border-b border-gray-50'
                  )}
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                    danger ? 'bg-red-50' : 'bg-pink-50'
                  )}>
                    <Icon size={18} className={danger ? 'text-red-500' : 'text-pink-500'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-black', danger ? 'text-red-500' : 'text-gray-950')}>{label}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
                  </div>
                  <ChevronRight size={14} className={danger ? 'text-red-200' : 'text-gray-300'} />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP LAYOUT
      ═══════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:mx-auto lg:w-full lg:max-w-[1440px]">

        {/* ── Sidebar ──────────────────────────────── */}
        <aside className="w-[240px] shrink-0 border-r border-gray-100 bg-white">
          <nav className="p-3 pt-5">
            {[
              { label: t('profile.accountOverview'), icon: Home,          view: 'profile' },
              { label: t('nav.orders'),              icon: ClipboardList, view: 'orders',    badge: accountOrders.length },
              { label: t('profile.addresses'),       icon: MapPin,        view: 'addresses' },
              { label: t('wishlist.title'),           icon: Heart,         view: 'wishlist' },
              { label: t('profile.rewards'),          icon: Gift,          view: 'rewards' },
              { label: t('profile.coupons'),          icon: Percent,       view: 'coupons' },
              { label: t('profile.reviews'),          icon: Star,          view: 'reviews' },
            ].map(({ label, icon: Icon, view, badge }) => {
              const isActive = activeView === view
              return (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive ? 'bg-pink-50 font-bold text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon size={17} className={isActive ? 'text-pink-600' : ''} />
                  <span className="flex-1 text-left">{label}</span>
                  {badge > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-black text-white">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
          <div className="border-t border-gray-100 p-3 pb-4">
            <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{t('profile.accountMenu')}</p>
            {[
              { label: t('profile.editProfile'),      icon: User,       view: null,            action: () => setActiveModal('personal') },
              { label: t('profile.passwordSecurity'), icon: Lock,       view: null,            action: () => setActiveModal('password') },
              { label: t('profile.paymentMethods'),   icon: CreditCard, view: 'payment',       action: () => setActiveView('payment') },
              { label: t('profile.notifications'),    icon: Bell,       view: 'notifications', action: () => setActiveView('notifications') },
              { label: t('profile.helpCenter'),       icon: HelpCircle, view: 'help',          action: () => setActiveView('help') },
              { label: t('auth.logout'),              icon: LogOut,     view: null,            action: handleLogout, danger: true },
            ].map(({ label, icon: Icon, view, action, danger }) => {
              const isActive = view && activeView === view
              return (
                <button
                  key={label}
                  onClick={action}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    danger ? 'text-red-500 hover:bg-red-50'
                      : isActive ? 'bg-pink-50 font-bold text-pink-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon size={17} className={isActive ? 'text-pink-600' : ''} />
                  {label}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Main Content ────────────────────────── */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-[1100px] space-y-5">

          {/* ══ ACCOUNT OVERVIEW ══ */}
          {activeView === 'profile' && <>

            {/* Row 1 — Profile card + Points card */}
            <div className="flex gap-5">
              <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-5">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-pink-100 shadow-md">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-400 to-purple-500 text-3xl font-black text-white">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-gray-950">{displayName}</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                          <span>{email}</span>
                          <span className="text-gray-300">•</span>
                          <span>{phone}</span>
                        </div>
                        <div className="mt-2.5 flex items-center gap-3">
                          <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600">
                            <CheckCircle2 size={12} /> {t('profile.verified')}
                          </span>
                          <span className="text-xs text-gray-400">{t('profile.memberSince')} {memberSince}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveModal('personal')}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-pink-300 px-4 py-2 text-sm font-bold text-pink-600 transition hover:bg-pink-50"
                      >
                        <Pencil size={13} /> {t('profile.editProfile')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-[280px] shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Gift size={15} className="text-pink-500" />
                  <span className="text-sm font-black text-gray-700">{t('profile.myPoints')}</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-pink-600">{rewardPoints.toLocaleString()}</span>
                      <span className="text-sm font-bold text-gray-400">pts</span>
                    </div>
                    {ptsToNext > 0 && (
                      <p className="mt-0.5 text-xs text-gray-400">{t('profile.ptsMoreToGold', { count: ptsToNext.toLocaleString() })}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-400" />
                      <span className="text-sm font-black text-gray-700">{membershipLevel} Member</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">Enjoy exclusive benefits</p>
                    <button className="mt-1 text-xs font-bold text-pink-500 hover:text-pink-600">{t('profile.viewBenefits')}</button>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mt-1.5 text-right text-[11px] font-semibold text-gray-400">
                  {rewardPoints.toLocaleString()} / {nextTierPoints.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* Row 2 — Orders Status + Shortcuts */}
            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-950">{t('profile.myOrdersStatus')}</h3>
                  <button onClick={() => navigate('/my-orders')} className="flex items-center gap-0.5 text-sm font-bold text-pink-500 hover:text-pink-600">
                    {t('profile.viewAllOrders')} <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  {ORDER_STATUS_ITEMS.map(({ key, label, icon: Icon }, idx) => (
                    <div key={key} className="flex items-center">
                      <button onClick={() => navigate('/my-orders')} className="flex flex-col items-center gap-2 transition active:scale-95">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-pink-100 bg-pink-50 text-pink-500">
                          <Icon size={21} />
                          {orderCounts[key] > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-black text-white ring-[1.5px] ring-white">
                              {orderCounts[key]}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-600">{t(`orders.status.${key}`)}</span>
                      </button>
                      {idx < ORDER_STATUS_ITEMS.length - 1 && (
                        <ChevronRight size={15} className="mx-1 shrink-0 text-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-5 text-base font-black text-gray-950">My Shortcuts</h3>
                <div className="flex items-start gap-5">
                  {SHORTCUTS.map(({ label, icon: Icon, path }) => (
                    <button key={label} onClick={() => navigate(path)} className="flex flex-col items-center gap-2 transition hover:opacity-70 active:scale-95">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-pink-100 bg-pink-50 text-pink-500">
                        <Icon size={19} />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-600">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3 — Account Menu + Recent Orders */}
            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-base font-black text-gray-950">Account Menu</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {[
                    { icon: User,       label: 'Edit Profile',        desc: 'Update your personal info',    action: () => setActiveModal('personal') },
                    { icon: Percent,    label: 'Coupons',              desc: 'Your discount coupons',        action: () => {} },
                    { icon: Lock,       label: 'Password & Security',  desc: 'Change password and security', action: () => setActiveModal('password') },
                    { icon: Star,       label: 'Reviews',              desc: 'Your product reviews',         action: () => {} },
                    { icon: CreditCard, label: 'Payment Methods',      desc: 'Manage your payment cards',    action: () => {} },
                    { icon: HelpCircle, label: 'Help Center',          desc: 'FAQs and Support',             action: () => {} },
                    { icon: Bell,       label: 'Notifications',        desc: 'Manage notification settings', action: () => {} },
                    { icon: LogOut,     label: 'Logout',               desc: 'Sign out from your account',   action: handleLogout, danger: true },
                  ].map(({ icon: Icon, label, desc, action, danger }) => (
                    <button
                      key={label}
                      onClick={action}
                      className="flex items-center gap-3 rounded-xl p-3 text-left transition hover:bg-gray-50 active:bg-pink-50"
                    >
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl', danger ? 'bg-red-50' : 'bg-pink-50')}>
                        <Icon size={16} className={danger ? 'text-red-500' : 'text-pink-500'} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-black leading-tight', danger ? 'text-red-500' : 'text-gray-900')}>{label}</p>
                        <p className="mt-0.5 text-[11px] leading-tight text-gray-400">{desc}</p>
                      </div>
                      <ChevronRight size={13} className={cn('shrink-0', danger ? 'text-red-200' : 'text-gray-300')} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-950">Recent Orders</h3>
                  <button onClick={() => navigate('/my-orders')} className="flex items-center gap-0.5 text-[13px] font-bold text-pink-500 hover:text-pink-600">
                    View All <ChevronRight size={13} />
                  </button>
                </div>
                {accountOrders.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">No orders yet.</div>
                ) : (
                  <div className="space-y-1">
                    {accountOrders.slice(0, 4).map((order) => (
                      <button
                        key={order.id}
                        onClick={() => navigate(`/my-orders/${order.id}`)}
                        className="flex w-full items-center gap-3.5 rounded-xl p-2.5 text-left transition hover:bg-gray-50"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-50">
                          <ShoppingBag size={17} className="text-pink-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-gray-950">#{order.order_number}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDate(order.created_at)} • {order.items_count ?? 0} Items</p>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500')}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                        <p className="shrink-0 text-sm font-black text-gray-950">{formatCurrency(order.grand_total)}</p>
                        <ChevronRight size={14} className="shrink-0 text-gray-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 4 — Trust Badges */}
            <div className="grid grid-cols-4 gap-4 pb-2">
              {[
                { icon: Shield,     title: '100% Authentic',   desc: 'All products are 100% authentic' },
                { icon: Truck,      title: 'Fast Delivery',     desc: 'Delivery within 1–3 working days' },
                { icon: Lock,       title: 'Secure Payment',    desc: '100% secure payment' },
                { icon: Headphones, title: 'Customer Support',  desc: '24/7 customer support' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </>}{/* end activeView === 'profile' */}

          {/* ══ MY ORDERS ══ */}
          {activeView === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-950">My Orders</h2>
                <button onClick={() => navigate('/my-orders')} className="flex items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-600">
                  Open Full Page <ChevronRight size={14} />
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {accountOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <ShoppingBag size={40} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-semibold text-gray-400">No orders yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {accountOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => navigate(`/my-orders/${order.id}`)}
                        className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-gray-50"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50">
                          <ShoppingBag size={17} className="text-pink-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-gray-950">#{order.order_number}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDate(order.created_at)} • {order.items_count ?? 0} Items</p>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500')}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                        <p className="shrink-0 text-sm font-black text-gray-950">{formatCurrency(order.grand_total)}</p>
                        <ChevronRight size={14} className="shrink-0 text-gray-300" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ ADDRESSES ══ */}
          {activeView === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-950">My Addresses</h2>
                <button onClick={() => navigate('/address-book')} className="flex items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-600">
                  Manage <ChevronRight size={14} />
                </button>
              </div>
              {addresses.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                  <MapPin size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">No saved addresses yet</p>
                  <button onClick={() => navigate('/address-book')} className="mt-4 rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-black text-white">Add Address</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-500"><MapPin size={18} /></div>
                          <div>
                            <p className="font-black capitalize text-gray-950">{addr.label || 'Home'}</p>
                            {addr.is_default && <span className="text-[11px] font-bold text-pink-500">Default</span>}
                          </div>
                        </div>
                        <button onClick={() => navigate('/address-book')} className="text-xs font-bold text-gray-400 hover:text-pink-500">Edit</button>
                      </div>
                      <div className="mt-3 space-y-0.5 text-sm leading-5 text-gray-500">
                        <p className="font-semibold text-gray-700">{addr.full_name}</p>
                        <p>{addr.address_line1}</p>
                        <p>{[addr.city, addr.state].filter(Boolean).join(', ')}</p>
                        <p>{addr.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ WISHLIST ══ */}
          {activeView === 'wishlist' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-950">My Wishlist</h2>
                <button onClick={() => navigate('/wishlist')} className="flex items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-600">
                  View Full Page <ChevronRight size={14} />
                </button>
              </div>
              {wishlistItems.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                  <Heart size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">Your wishlist is empty</p>
                  <button onClick={() => navigate('/shop')} className="mt-4 rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-black text-white">Browse Products</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
                  {wishlistItems.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => navigate(`/product/${product.slug || product.id}`)}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:border-pink-100 hover:shadow-md"
                    >
                      <div className="aspect-square overflow-hidden bg-gray-50">
                        {product.primary_image
                          ? <img src={product.primary_image} alt={product.name} className="h-full w-full object-contain transition group-hover:scale-[1.04]" />
                          : <div className="flex h-full w-full items-center justify-center"><ShoppingBag size={24} className="text-pink-200" /></div>}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-xs font-black leading-tight text-gray-900">{product.name}</p>
                        <p className="mt-1.5 text-sm font-black text-pink-600">{formatCurrency(product.retail_price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ REWARDS ══ */}
          {activeView === 'rewards' && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-gray-950">Rewards & Points</h2>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-500">Total Points</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-5xl font-black text-pink-600">{rewardPoints.toLocaleString()}</span>
                      <span className="text-base font-bold text-gray-400">pts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gray-300 to-gray-400" />
                      <span className="font-black text-gray-700">{membershipLevel} Member</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">{t('profile.ptsMoreToGold', { count: ptsToNext.toLocaleString() })}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-xs font-semibold text-gray-500">
                    <span>{rewardPoints.toLocaleString()} pts</span>
                    <span>Gold: {nextTierPoints.toLocaleString()} pts</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <p className="font-black text-gray-950">Rewards Catalog</p>
                <div className="py-10 text-center">
                  <Gift size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">Coming Soon</p>
                  <p className="mt-1 text-xs text-gray-400">Redeem your points for exclusive rewards</p>
                </div>
              </div>
            </div>
          )}

          {/* ══ COUPONS ══ */}
          {activeView === 'coupons' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">My Coupons</h2>
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <Percent size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-400">No coupons available</p>
                <p className="mt-1 text-xs text-gray-400">Check back soon for exclusive discounts</p>
              </div>
            </div>
          )}

          {/* ══ REVIEWS ══ */}
          {activeView === 'reviews' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">My Reviews</h2>
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <Star size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-400">No reviews yet</p>
                <p className="mt-1 text-xs text-gray-400">Reviews you write for products will appear here</p>
              </div>
            </div>
          )}

          {/* ══ PAYMENT METHODS ══ */}
          {activeView === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">Payment Methods</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {[
                  { icon: CreditCard, title: 'Visa Debit Card',   desc: '**** **** **** 4242 · Default', cls: 'bg-blue-50 text-blue-500' },
                  { icon: ShoppingBag, title: 'ABA Mobile',        desc: 'Linked account',               cls: 'bg-orange-50 text-orange-500' },
                  { icon: Package,     title: 'Cash on Delivery',  desc: 'Available at checkout',        cls: 'bg-green-50 text-green-500' },
                ].map(({ icon: Icon, title, desc, cls }) => (
                  <div key={title} className="flex items-center gap-4 border-b border-gray-50 p-4 last:border-0">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', cls)}><Icon size={19} /></div>
                    <div className="flex-1">
                      <p className="font-black text-gray-950">{title}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ NOTIFICATIONS ══ */}
          {activeView === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">Notifications</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {[
                  { title: 'Order Updates',       desc: 'Get notified about your order status changes', on: true },
                  { title: 'Promotions & Deals',  desc: 'Receive news about discounts and flash sales', on: true },
                  { title: 'New Arrivals',         desc: 'Be the first to know about new products',     on: false },
                  { title: 'Account Activity',     desc: 'Important alerts about your account',         on: true },
                ].map(({ title, desc, on }) => (
                  <div key={title} className="flex items-center justify-between gap-4 border-b border-gray-50 p-4 last:border-0">
                    <div>
                      <p className="font-black text-gray-950">{title}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                    <div className={cn('relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition', on ? 'bg-pink-500' : 'bg-gray-200')}>
                      <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', on ? 'right-0.5' : 'left-0.5')} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ HELP CENTER ══ */}
          {activeView === 'help' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">Help Center</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {[
                  { q: 'How do I track my order?',           a: 'Go to My Orders and click on your order to see real-time tracking.' },
                  { q: 'How do I return a product?',          a: 'Contact our support team within 7 days of delivery to initiate a return.' },
                  { q: 'What payment methods are accepted?',  a: 'We accept Visa, MasterCard, ABA Mobile, and Cash on Delivery.' },
                  { q: 'How long does delivery take?',        a: 'Standard delivery takes 1–3 business days within Phnom Penh.' },
                  { q: 'How do I earn reward points?',        a: 'You earn 1 point for every $1 spent. Points can be redeemed for discounts.' },
                ].map(({ q, a }, i) => (
                  <div key={i} className="border-b border-gray-50 p-4 last:border-0">
                    <p className="font-black text-gray-950">{q}</p>
                    <p className="mt-1 text-sm text-gray-500">{a}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                <p className="font-black text-gray-950">Still need help?</p>
                <p className="mt-1 text-sm text-gray-400">Our support team is available 24/7</p>
                <button className="mt-3 rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-pink-700">Contact Support</button>
              </div>
            </div>
          )}

          </div>
        </div>
      </div>{/* end hidden lg:flex */}

      {activeModal === 'personal' && (
        <EditProfileModal
          user={user}
          addresses={addresses}
          onEditAddress={() => {
            setActiveModal(null)
            navigate('/address-book')
          }}
          onClose={() => setActiveModal(null)}
          onSaved={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'password' && (
        <ChangePasswordModal onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}

function InfoCard({ title, action, rows, onAction }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-black text-gray-950">{title}</h2>
        {onAction ? (
          <button onClick={onAction} className="text-sm font-bold text-pink-600">{action}</button>
        ) : (
          <span className="text-sm font-bold text-pink-600">{action}</span>
        )}
      </div>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
            <span className="text-sm text-gray-400">{label}</span>
            <span className="text-right text-sm font-semibold text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecurityRow({ icon: Icon, label, value, valueClass = 'text-gray-500' }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500">
          <Icon size={16} />
        </div>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
      </div>
      <span className={cn('text-xs font-bold', valueClass)}>{value}</span>
    </div>
  )
}
