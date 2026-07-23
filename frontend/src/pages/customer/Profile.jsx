import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  User, MapPin, Shield, LogOut, ChevronRight, ChevronDown, Camera,
  Package, Heart, CheckCircle2, Pencil, Lock, Loader2, Truck, ShoppingBag,
  ArrowLeft, Mail, Phone, IdCard, Languages,
  Bell, PackageCheck, Star, Percent, CreditCard, HelpCircle, ClipboardList, Gift,
  Home, Headphones, Eye, EyeOff,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useWishlistStore from '@/store/wishlistStore'
import { authApi } from '@/api/auth'
import { ordersApi } from '@/api/orders'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn, formatCurrency, formatDate } from '@/utils/helpers'
import { isValidCambodiaPhone, normalizeCambodiaPhone } from '@/utils/phone'

const ACCOUNT_MENU_ITEMS = [
  { icon: User, labelKey: 'profile.menuProfile', descKey: 'profile.menuProfileDesc', view: 'profile' },
  { icon: Package, labelKey: 'profile.myOrders', descKey: 'profile.menuOrdersDesc', view: 'orders', path: '/my-orders' },
  { icon: MapPin, labelKey: 'profile.addresses', descKey: 'profile.menuAddressesDesc', view: 'addresses', path: '/address-book' },
  { icon: Gift, labelKey: 'profile.exchangeRewards', descKey: 'profile.menuRewardsDesc', view: 'rewards', path: '/profile/rewards' },
  { icon: Percent, labelKey: 'profile.coupons', descKey: 'profile.menuCouponsDesc', view: 'coupons' },
  { icon: Bell, labelKey: 'profile.notifications', descKey: 'profile.menuNotificationsDesc', view: 'notifications' },
  { icon: Heart, labelKey: 'profile.wishlist', descKey: 'profile.menuWishlistDesc', view: 'wishlist', path: '/wishlist' },
  { icon: Shield, labelKey: 'profile.password', descKey: 'profile.menuPasswordDesc', view: 'password' },
]

const ORDER_STATUS_ITEMS = [
  { key: 'pending', icon: ClipboardList },
  { key: 'preparing', icon: Package },
  { key: 'packed', icon: PackageCheck },
  { key: 'shipped', icon: Truck },
  { key: 'completed', icon: CheckCircle2 },
]

function orderStatusLabel(t, status) {
  const STATUS_KEY = {
    new: 'pending',
    pending: 'pending',
    printed: 'preparing',
    preparing: 'preparing',
    packed: 'packed',
    shipped: 'shipped',
    completed: 'delivered',
    cancelled: 'cancelled',
  }
  const key = STATUS_KEY[status]
  return key ? t(`orders.status.${key}`) : status
}

const SHORTCUTS = [
  { tKey: 'nav.orders',       icon: ShoppingBag, path: '/my-orders' },
  { tKey: 'profile.address',  icon: MapPin,      path: '/address-book' },
  { tKey: 'wishlist.title',   icon: Heart,       path: '/wishlist' },
  { tKey: 'profile.rewards',  icon: Gift,        path: '/profile/rewards' },
  { tKey: 'profile.coupons',  icon: Percent,     path: '/profile' },
  { tKey: 'profile.reviews',  icon: Star,        path: '/my-orders' },
]

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

const GENDER_OPTIONS = [
  { value: '', labelKey: 'completeProfile.selectGender' },
  { value: 'male', labelKey: 'completeProfile.genderMale' },
  { value: 'female', labelKey: 'completeProfile.genderFemale' },
  { value: 'other', labelKey: 'completeProfile.genderOther' },
  { value: 'prefer_not_to_say', labelKey: 'completeProfile.genderPreferNot' },
]

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

function EditProfileModal({ user, addresses = [], onEditAddress, onClose, onSaved, asPage = false }) {
  const { t } = useTranslation()
  const updateUser = useAuthStore((s) => s.updateUser)
  const fileInputRef = useRef(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    full_name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    email: user.email || '',
    phone: normalizeCambodiaPhone(user.phone),
    gender: user.gender || '',
  })

  const initials = [user.first_name, user.last_name].filter(Boolean).map((n) => n[0]).join('').toUpperCase() || user.username?.[0]?.toUpperCase() || '?'
  const usernameDisplay = user.username ? `@${user.username}` : `#SS${String(user.id || 0).padStart(6, '0')}`
  const memberSince = user.created_at ? formatDate(user.created_at, 'MMMM yyyy') : t('profile.newMember')
  const defaultAddress = addresses.find((addr) => addr.is_default) || addresses[0]

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.chooseImage'))
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error(t('profile.photoTooLarge'))
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    const compressed = await compressImage(file)
    setAvatarFile(compressed)
  }

  const saveMutation = useMutation({
    mutationFn: (data) => authApi.updateMe(data),
    onSuccess: ({ data }) => {
      updateUser(data)
      toast.success(t('profile.profileUpdated'))
      onSaved()
    },
    onError: (error) => {
      const body = error.response?.data
      const message = body?.email?.[0] || body?.phone?.[0] || body?.gender?.[0] || body?.detail || t('profile.updateProfileFailed')
      toast.error(message)
    },
  })

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const nextErrors = {}
    const cleanName = form.full_name.trim()
    const cleanEmail = form.email.trim()
    const cleanPhone = normalizeCambodiaPhone(form.phone)

    if (!cleanName) nextErrors.full_name = t('profile.enterFullName')
    if (!cleanEmail) nextErrors.email = t('profile.enterEmail')
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = t('profile.enterValidEmail')
    }
    if (cleanPhone && !isValidCambodiaPhone(cleanPhone)) {
      nextErrors.phone = t('common.invalidPhone')
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const [firstName, ...lastParts] = form.full_name.trim().split(/\s+/)
    const payload = {
      email: cleanEmail,
      phone: cleanPhone,
      gender: form.gender,
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

  const content = (
      <form
        onSubmit={handleSubmit}
        className={cn('flex flex-col bg-white', asPage ? 'min-h-screen' : 'max-h-[94vh]')}
      >
        <div className={cn(
          'sticky top-0 z-20 grid grid-cols-[44px_1fr_64px] items-center gap-3 border-b border-gray-100 bg-white/95 px-4 pb-3 backdrop-blur',
          asPage ? 'pt-[calc(0.45rem+env(safe-area-inset-top))]' : 'pt-3'
        )}>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-50 active:scale-95"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="truncate text-center text-lg font-black text-gray-950">{t('profile.editProfile')}</h2>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex h-10 items-center justify-center rounded-full px-2 text-sm font-black text-[#E91E63] transition hover:bg-pink-50 active:scale-95 disabled:opacity-60"
          >
            {saveMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : t('common.save')}
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 px-4 pb-5 pt-4">
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <div className="px-4 py-5">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-[#E91E63] to-pink-300 text-3xl font-black text-white shadow-[0_14px_30px_rgba(233,30,99,0.22)]">
                    {avatarPreview
                      ? <img src={avatarPreview} alt="Profile avatar" className="h-full w-full object-cover" />
                      : initials}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-[#E91E63] text-white shadow-lg transition hover:bg-pink-600 active:scale-95"
                    aria-label={t('profile.changePhoto')}
                  >
                    <Camera size={17} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-black text-gray-950">{form.full_name || user.username || t('profile.yourProfile')}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-500">@{user.username || t('profile.yourProfile')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {avatarPreview && avatarPreview !== user.avatar_url && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null)
                          setAvatarPreview(user.avatar_url || null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-600 transition hover:bg-gray-50 active:scale-[0.98]"
                      >
                        {t('profile.reset')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </section>

          <ProfileSection title={t('profile.personalInfo')} icon={User}>
            <ProfileField label={t('profile.fullName')} value={form.full_name} onChange={(v) => set('full_name', v)} required icon={User} error={errors.full_name} autoComplete="name" />
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileField label={t('profile.phoneNumber')} value={form.phone} onChange={(v) => set('phone', normalizeCambodiaPhone(v))} icon={Phone} error={errors.phone} autoComplete="tel" placeholder={t('common.phonePlaceholder')} />
              <ProfileField label={t('profile.emailAddress')} type="email" value={form.email} onChange={(v) => set('email', v)} required icon={Mail} error={errors.email} autoComplete="email" />
            </div>
            <ProfileSelect label={t('completeProfile.gender')} value={form.gender} onChange={(v) => set('gender', v)} icon={User} options={GENDER_OPTIONS} t={t} />
          </ProfileSection>

          <ProfileSection title={t('profile.address')} icon={MapPin}>
            <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#E91E63] shadow-sm">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-400">{t('profile.defaultAddress')}</p>
                  <p className="mt-1 text-sm font-black leading-5 text-gray-950">
                    {defaultAddress ? defaultAddress.address_line1 : t('profile.noDefaultAddress')}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">
                    {defaultAddress
                      ? [defaultAddress.address_line2, defaultAddress.city, defaultAddress.state, defaultAddress.postal_code].filter(Boolean).join(', ')
                      : t('profile.addDeliveryAddressHint')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onEditAddress}
                className="mt-4 h-11 w-full rounded-xl border border-[#E91E63]/20 bg-white text-sm font-black text-[#E91E63] shadow-sm transition hover:bg-white/80 active:scale-[0.98]"
              >
                {defaultAddress ? t('profile.editDefaultAddress') : t('profile.addDeliveryAddress')}
              </button>
            </div>
          </ProfileSection>

          <ProfileSection title={t('profile.accountInfo')} icon={IdCard}>
            <ProfileInfoRow label={t('auth.username')} value={usernameDisplay} />
            <ProfileInfoRow label={t('profile.memberSince')} value={memberSince} />
            <ProfileInfoRow
              label={t('profile.verificationStatus')}
              value={<span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-600"><CheckCircle2 size={13} /> {t('profile.verified')}</span>}
            />
          </ProfileSection>
        </div>
      </form>
  )

  if (asPage) {
    return (
      <div className="min-h-screen bg-white">
        {content}
      </div>
    )
  }

  return (
    <Modal isOpen onClose={onClose} size="md" className="max-h-[94vh] overflow-hidden p-0 md:max-w-[520px]">
      {content}
    </Modal>
  )
}

function ChangePasswordModal({ user, onClose }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [visible, setVisible] = useState({ old_password: false, new_password: false, confirm_password: false })

  const saveMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success(t('profile.passwordChanged'))
      onClose()
    },
    onError: (error) => {
      const body = error.response?.data
      const message = body?.old_password?.[0] || body?.new_password?.[0] || body?.detail || t('profile.passwordChangeFailed')
      toast.error(message)
    },
  })

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const toggleVisible = (key) => setVisible((current) => ({ ...current, [key]: !current[key] }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.new_password.length < 8) {
      toast.error(t('auth.validationPasswordLength'))
      return
    }
    if (form.new_password !== form.confirm_password) {
      toast.error(t('profile.passwordsNoMatch'))
      return
    }
    saveMutation.mutate({ old_password: form.old_password, new_password: form.new_password })
  }

  return (
    <Modal isOpen onClose={onClose} size="md" className="overflow-hidden p-0 md:max-w-[460px]">
      <form onSubmit={handleSubmit} className="bg-white">
        <div className="border-b border-gray-100 px-5 pb-4 pt-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-[#E91E63]">
            <Lock size={22} />
          </div>
          <h2 className="text-xl font-black text-gray-950">{t('profile.changePassword')}</h2>
          <p className="mt-1 text-sm font-semibold text-gray-400">{t('profile.changePasswordHint')}</p>
        </div>

        <div className="space-y-5 px-5 py-5">
          <CleanPasswordField
            label={t('profile.currentPassword')}
            value={form.old_password}
            onChange={(value) => set('old_password', value)}
            show={visible.old_password}
            onToggle={() => toggleVisible('old_password')}
            autoComplete="current-password"
            t={t}
          />
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate('/forgot-password', { state: { email: user?.email || '' } })
            }}
            className="-mt-2 text-sm font-black text-[#E91E63] transition hover:text-[#D9166F]"
          >
            {t('profile.forgotPassword')}
          </button>
          <CleanPasswordField
            label={t('profile.newPassword')}
            value={form.new_password}
            onChange={(value) => set('new_password', value)}
            show={visible.new_password}
            onToggle={() => toggleVisible('new_password')}
            autoComplete="new-password"
            t={t}
          />
          <CleanPasswordField
            label={t('profile.confirmNewPassword')}
            value={form.confirm_password}
            onChange={(value) => set('confirm_password', value)}
            show={visible.confirm_password}
            onToggle={() => toggleVisible('confirm_password')}
            autoComplete="new-password"
            t={t}
          />
        </div>

        <div className="flex gap-3 border-t border-gray-100 bg-white px-5 pb-5 pt-4">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-full border border-gray-200 bg-white text-sm font-black text-gray-600 transition hover:bg-gray-50 active:scale-[0.99]">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saveMutation.isPending} className="h-12 flex-1 rounded-full bg-[#EC197A] text-sm font-black text-white shadow-[0_12px_28px_rgba(236,25,122,0.24)] transition hover:bg-[#D9166F] active:scale-[0.99] disabled:opacity-60">
            {saveMutation.isPending ? <Loader2 size={18} className="mx-auto animate-spin" /> : t('profile.updatePassword')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CleanPasswordField({ label, value, onChange, show, onToggle, autoComplete, t }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-gray-400">{label}</span>
      <div className="mt-1 flex h-12 items-center gap-3 border-b border-gray-200 transition focus-within:border-[#E91E63]">
        <Lock size={18} className="shrink-0 text-gray-300" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm font-black text-gray-950 outline-none placeholder:text-gray-300"
        />
        <button
          type="button"
          onClick={onToggle}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-gray-400 transition hover:bg-pink-50 hover:text-[#E91E63]"
          aria-label={t(show ? 'completeProfile.hideField' : 'completeProfile.showField', { label })}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  )
}

function ProfileSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-[#E91E63]">
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
    <div className="flex min-h-12 items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm font-semibold text-gray-500">{label}</span>
      <span className="text-right text-sm font-black text-gray-950">{value}</span>
    </div>
  )
}

function ProfileField({ label, value, onChange, type = 'text', readOnly, required, icon: Icon, error, autoComplete, placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-wide text-gray-400">
        {label}
        {required && <span className="text-[#E91E63]">*</span>}
      </span>
      <div className="relative">
        {Icon && (
          <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
        )}
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className={cn(
            'h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-950 outline-none transition placeholder:text-gray-300 focus:border-[#E91E63] focus:bg-white focus:ring-4 focus:ring-pink-100',
            Icon && 'pl-11',
            error && 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100',
            readOnly && 'cursor-not-allowed bg-gray-50 text-gray-500'
          )}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
    </label>
  )
}

function ProfileSelect({ label, value, onChange, required, icon: Icon, options = [], error, t }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1 text-xs font-black uppercase tracking-wide text-gray-400">
        {label}
        {required && <span className="text-[#E91E63]">*</span>}
      </span>
      <div className="relative">
        {Icon && (
          <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
        )}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? 'true' : 'false'}
          className={cn(
            'h-12 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 pr-10 text-sm font-bold outline-none transition focus:border-[#E91E63] focus:bg-white focus:ring-4 focus:ring-pink-100',
            Icon && 'pl-11',
            value ? 'text-gray-950' : 'text-gray-400',
            error && 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100'
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.labelKey && t ? t(option.labelKey) : option.label}</option>
          ))}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
    </label>
  )
}

function MobileSettingsGroup({ title, children }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 text-[13px] font-black text-[#202A44]">{title}</h2>
      <div className="space-y-0.5">{children}</div>
    </section>
  )
}

function MobileSettingsRow({ icon: Icon, label, action, danger }) {
  return (
    <button
      type="button"
      onClick={action}
      className="flex h-11 w-full items-center gap-3 rounded-lg text-left transition active:bg-slate-50"
    >
      <Icon
        size={16}
        strokeWidth={1.9}
        className={cn('shrink-0', danger ? 'text-red-500' : 'text-slate-500')}
      />
      <span className={cn('min-w-0 flex-1 text-[12px] font-black', danger ? 'text-red-500' : 'text-[#202A44]')}>
        {label}
      </span>
      <ChevronRight size={15} strokeWidth={2.2} className={danger ? 'text-red-200' : 'text-slate-400'} />
    </button>
  )
}

function ProfileSidebar({ activeView, onSelect, onLogout, isKhmer, onToggleLang }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-2 p-4">
        {ACCOUNT_MENU_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.view === activeView
          return (
            <button
              key={item.labelKey}
              onClick={() => onSelect(item)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold transition',
                isActive ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={20} />
              <span className="flex-1">{t(item.labelKey)}</span>
              <ChevronRight size={16} className={isActive ? 'text-pink-300' : 'text-gray-300'} />
            </button>
          )
        })}
        <button
          onClick={onToggleLang}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <Languages size={20} />
          <span className="flex-1">{isKhmer ? t('profile.englishLang') : t('profile.khmerLang')}</span>
          <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-bold text-pink-600">
            {isKhmer ? 'EN' : 'KM'}
          </span>
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50"
        >
          <LogOut size={18} />
          {t('profile.logout')}
        </button>
      </nav>
    </div>
  )
}

export function EditProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, fetchMe } = useAuthStore()

  useEffect(() => {
    if (user) fetchMe()
  }, [user?.id])

  const { data: addresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => authApi.addresses.list().then((r) => r.data.results ?? r.data),
    enabled: Boolean(user),
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-5 pt-12 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-pink-600">
          <User size={36} />
        </div>
        <h2 className="mt-5 text-xl font-black text-gray-950">{t('profile.signInEditProfile')}</h2>
        <button onClick={() => navigate('/login')} className="shop-btn-primary mt-6 px-10">
          {t('auth.login')}
        </button>
      </div>
    )
  }

  return (
    <EditProfileModal
      asPage
      user={user}
      addresses={addresses}
      onEditAddress={() => navigate('/address-book')}
      onClose={() => navigate('/profile')}
      onSaved={() => navigate('/profile')}
    />
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, fetchMe } = useAuthStore()
  const wishlistItems = useWishlistStore((s) => s.items)
  const [confirm, ConfirmDialog] = useConfirm()
  const [activeModal, setActiveModal] = useState(null)
  const [activeView, setActiveView] = useState('profile')
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const { t, i18n } = useTranslation()
  const isKhmer = i18n.language === 'km'
  const toggleLang = () => i18n.changeLanguage(isKhmer ? 'en' : 'km')
  const currentLanguage = isKhmer
    ? { code: 'km', label: t('profile.khmer'), flag: '🇰🇭' }
    : { code: 'en', label: t('profile.english'), flag: '🇺🇸' }

  const selectLanguage = (language) => {
    i18n.changeLanguage(language)
    setIsLanguageMenuOpen(false)
  }

  useEffect(() => {
    if (user) fetchMe()
  }, [user?.id])

  useEffect(() => {
    const requestedView = new URLSearchParams(location.search).get('view')
    const profileViews = ['profile', 'orders', 'addresses', 'wishlist', 'rewards', 'coupons', 'reviews', 'payment', 'notifications', 'help']

    if (!requestedView) return
    if (requestedView === 'password') {
      setActiveView('profile')
      setActiveModal('password')
      return
    }
    if (profileViews.includes(requestedView)) {
      setActiveView(requestedView)
    }
  }, [location.search])

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

  const { data: rewardsSummary } = useQuery({
    queryKey: ['customer-rewards-summary'],
    queryFn: () => ordersApi.rewards.summary().then((r) => r.data),
    enabled: Boolean(user),
  })

  const handleLogout = async () => {
    const ok = await confirm(t('profile.logoutTitle'), t('profile.logoutConfirm'), {
      confirmText: t('profile.logout'),
      icon: 'logout',
    })
    if (!ok) return
    await logout()
  }

  const handleMenuSelect = (item, fromMobile = false) => {
    if (fromMobile) {
      if (item.path) {
        navigate(item.path)
        return
      }
      if (item.view === 'profile') {
        navigate('/profile/edit')
        return
      }
      if (item.view === 'password') {
        setActiveModal('password')
        return
      }
    }
    setActiveView(item.view)
  }

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
  const usernameDisplay = user.username ? `@${user.username}` : email
  const phone = user.phone || '—'
  const memberSince = user.created_at ? formatDate(user.created_at, 'MMM yyyy') : '—'
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const rewardPoints = rewardsSummary?.current_points ?? 0
  const nextTierPoints = rewardsSummary?.next_tier_points ?? 3000
  const membershipLevel = rewardsSummary?.member_level || 'Silver'
  const ptsToNext = rewardsSummary?.points_to_next_level ?? Math.max(0, nextTierPoints - rewardPoints)
  const progressPct = rewardsSummary?.progress_pct ?? Math.min(100, Math.round((rewardPoints / nextTierPoints) * 100))
  const rewardRedemptions = rewardsSummary?.redemptions ?? []

  const mobileQuickActions = [
    { icon: ClipboardList, labelKey: 'profile.myOrders', action: () => navigate('/my-orders'), color: 'text-emerald-500' },
    { icon: Percent, labelKey: 'profile.coupons', action: () => setActiveView('coupons'), color: 'text-rose-400' },
    { icon: Heart, labelKey: 'profile.following', action: () => navigate('/wishlist'), color: 'text-amber-400' },
  ]

  const mobileGeneralSettings = [
    { icon: User, labelKey: 'profile.myAccount', action: () => navigate('/profile/edit') },
    { icon: ClipboardList, labelKey: 'profile.myOrders', action: () => navigate('/my-orders') },
    { icon: MapPin, labelKey: 'profile.myAddress', action: () => navigate('/address-book') },
    { icon: Gift, labelKey: 'profile.exchangeRewards', action: () => navigate('/profile/rewards') },
    { icon: Percent, labelKey: 'profile.coupons', action: () => setActiveView('coupons') },
    { icon: Bell, labelKey: 'profile.notifications', action: () => setActiveView('notifications') },
  ]

  const mobileOtherSettings = [
    { icon: Headphones, labelKey: 'profile.contactPreferences', action: () => setActiveView('help') },
    { icon: ClipboardList, labelKey: 'profile.termsConditions', action: () => setActiveView('help') },
    { icon: Shield, labelKey: 'profile.privacyPolicy', action: () => setActiveView('help') },
    { icon: Lock, labelKey: 'profile.passwordSecurity', action: () => setActiveModal('password') },
    { icon: LogOut, labelKey: 'profile.logout', action: handleLogout, danger: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ═══════════════════════════════════════════
          MOBILE FULL REDESIGN
      ═══════════════════════════════════════════ */}
      <div className="min-h-screen bg-white px-5 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))] lg:hidden">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-[#202A44]">{t('profile.title')}</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setIsLanguageMenuOpen((open) => !open)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-white px-2 text-sm font-black text-gray-700 transition active:scale-95"
                aria-expanded={isLanguageMenuOpen}
                aria-label={t('profile.chooseLanguage')}
              >
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gray-50 text-base">
                  {currentLanguage.flag}
                </span>
                <ChevronDown
                  size={14}
                  className={cn('text-gray-500 transition-transform', isLanguageMenuOpen && 'rotate-180')}
                />
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl">
                  {[
                    { code: 'en', label: t('profile.english'), flag: '🇺🇸' },
                    { code: 'km', label: t('profile.khmer'), flag: '🇰🇭' },
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
            <button
              type="button"
              onClick={() => navigate('/my-orders')}
              aria-label="Messages"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 transition active:scale-90"
            >
              <Mail size={18} />
            </button>
            <button
              type="button"
              onClick={() => setActiveView('notifications')}
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 transition active:scale-90"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          </div>
        </div>

        <div className="mt-7">
          <button
            type="button"
            onClick={() => navigate('/profile/edit')}
            className="flex w-full items-center gap-4 text-left transition active:scale-[0.99]"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-300 to-rose-400 text-lg font-black text-white">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-[#202A44]">{displayName}</p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-400">{usernameDisplay}</p>
            </div>
          </button>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl bg-slate-50">
          <div className="grid grid-cols-3">
            {mobileQuickActions.map(({ icon: Icon, labelKey, action, color }, index) => (
              <button
                key={labelKey}
                type="button"
                onClick={action}
                className={cn(
                  'flex h-[74px] flex-col items-center justify-center gap-2 transition active:bg-slate-100',
                  index > 0 && 'border-l border-slate-200'
                )}
              >
                <Icon size={20} strokeWidth={1.8} className={color} />
                <span className="text-[10px] font-black text-slate-500">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <MobileSettingsGroup title={t('profile.generalSetting')}>
          {mobileGeneralSettings.map((item) => (
            <MobileSettingsRow key={item.labelKey} icon={item.icon} label={t(item.labelKey)} action={item.action} />
          ))}
        </MobileSettingsGroup>

        <MobileSettingsGroup title={t('profile.other')}>
          {mobileOtherSettings.map((item) => (
            <MobileSettingsRow key={item.labelKey} icon={item.icon} label={t(item.labelKey)} action={item.action} danger={item.danger} />
          ))}
        </MobileSettingsGroup>

        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-slate-500">{t('profile.memberLabel')}</span>
            <span className="font-black text-[#202A44]">{memberSince}</span>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════
          DESKTOP LAYOUT
      ═══════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:mx-auto lg:w-full lg:max-w-[1440px]">

        {/* ── Sidebar ──────────────────────────────── */}
        {/* ── Main Content ────────────────────────── */}
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-white to-pink-50/40 p-6">
          <div className="mx-auto max-w-[1340px] space-y-5">

          {/* ══ ACCOUNT OVERVIEW ══ */}
          {activeView === 'profile' && <>

            {/* Row 1 — Profile card + Points card */}
            <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
              <div className="relative overflow-hidden rounded-3xl border border-pink-100 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-pink-100/60" />
                <div className="absolute right-24 bottom-0 h-28 w-28 rounded-full bg-purple-100/50" />
                <div className="relative flex items-center gap-5">
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
                          <span>{usernameDisplay}</span>
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
                        onClick={() => navigate('/profile/edit')}
                        className="flex shrink-0 items-center gap-1.5 rounded-full border border-pink-200 bg-white/80 px-4 py-2 text-sm font-bold text-pink-600 shadow-sm transition hover:bg-pink-50"
                      >
                        <Pencil size={13} /> {t('profile.editProfile')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 rounded-3xl border border-pink-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-2">
                  <Gift size={15} className="text-pink-500" />
                  <span className="text-sm font-black text-gray-700">{t('profile.myPoints')}</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-pink-600">{rewardPoints.toLocaleString()}</span>
                      <span className="text-sm font-bold text-gray-400">{t('profile.ptsLabel')}</span>
                    </div>
                    {ptsToNext > 0 && (
                      <p className="mt-0.5 text-xs text-gray-400">{t('profile.ptsMoreToGold', { count: ptsToNext.toLocaleString() })}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="h-4 w-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-400" />
                      <span className="text-sm font-black text-gray-700">{t('profile.memberLevel', { level: membershipLevel })}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">{t('profile.enjoyBenefits')}</p>
                    <button className="mt-1 text-xs font-bold text-pink-500 hover:text-pink-600">{t('profile.viewBenefits')}</button>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mt-1.5 text-right text-[11px] font-semibold text-gray-400">
                  {rewardPoints.toLocaleString()} / {nextTierPoints.toLocaleString()} {t('profile.ptsLabel')}
                </p>
              </div>
            </div>

            {/* Row 2 — Orders Status + Shortcuts */}
            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-950">{t('profile.myOrdersStatus')}</h3>
                  <button onClick={() => navigate('/my-orders')} className="flex items-center gap-0.5 text-sm font-bold text-pink-500 hover:text-pink-600">
                    {t('profile.viewAllOrders')} <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  {ORDER_STATUS_ITEMS.map(({ key, icon: Icon }, idx) => (
                    <div key={key} className="flex items-center">
                      <button onClick={() => navigate('/my-orders')} className="flex flex-col items-center gap-2 transition active:scale-95">
                        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-500 ring-1 ring-pink-100">
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

              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
                <h3 className="mb-5 text-base font-black text-gray-950">{t('profile.myShortcuts')}</h3>
                <div className="flex items-start gap-5">
                  {SHORTCUTS.map(({ tKey, icon: Icon, path }) => (
                    <button key={tKey} onClick={() => navigate(path)} className="flex flex-col items-center gap-2 transition hover:opacity-70 active:scale-95">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-500 ring-1 ring-pink-100">
                        <Icon size={19} />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-600">{t(tKey)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3 — Recent Orders */}
            <div className="grid grid-cols-1 gap-5">
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.045)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-black text-gray-950">{t('profile.recentOrders')}</h3>
                  <button onClick={() => navigate('/my-orders')} className="flex items-center gap-0.5 text-[13px] font-bold text-pink-500 hover:text-pink-600">
                    {t('profile.viewAll')} <ChevronRight size={13} />
                  </button>
                </div>
                {accountOrders.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">{t('profile.noOrdersYet')}</div>
                ) : (
                  <div className="grid gap-1 xl:grid-cols-2">
                    {accountOrders.slice(0, 4).map((order) => (
                      <button
                        key={order.id}
                        onClick={() => navigate(`/my-orders/${order.id}`)}
                        className="flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition hover:bg-pink-50/50"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-50">
                          <ShoppingBag size={17} className="text-pink-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-gray-950">#{order.order_number}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{formatDate(order.created_at)} • {t('profile.itemsCount', { count: order.items_count ?? 0 })}</p>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500')}>
                          {orderStatusLabel(t, order.status)}
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
                { icon: Shield, titleKey: 'profile.authenticTitle', descKey: 'profile.authenticDesc' },
                { icon: Truck, titleKey: 'profile.fastDeliveryTitle', descKey: 'profile.fastDeliveryDesc' },
                { icon: Lock, titleKey: 'profile.securePaymentTitle', descKey: 'profile.securePaymentDesc' },
                { icon: Headphones, titleKey: 'profile.supportTitle', descKey: 'profile.supportDesc' },
              ].map(({ icon: Icon, titleKey, descKey }) => (
                <div key={titleKey} className="flex items-center gap-3.5 rounded-3xl border border-gray-100 bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{t(titleKey)}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{t(descKey)}</p>
                  </div>
                </div>
              ))}
            </div>

          </>}{/* end activeView === 'profile' */}

          {/* ══ MY ORDERS ══ */}
          {activeView === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-950">{t('profile.myOrders')}</h2>
                <button onClick={() => navigate('/my-orders')} className="flex items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-600">
                  {t('profile.openFullPage')} <ChevronRight size={14} />
                </button>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {accountOrders.length === 0 ? (
                  <div className="py-16 text-center">
                    <ShoppingBag size={40} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-semibold text-gray-400">{t('profile.noOrdersYet')}</p>
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
                          <p className="mt-0.5 text-xs text-gray-400">{formatDate(order.created_at)} • {t('profile.itemsCount', { count: order.items_count ?? 0 })}</p>
                        </div>
                        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500')}>
                          {orderStatusLabel(t, order.status)}
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
                <h2 className="text-xl font-black text-gray-950">{t('profile.myAddresses')}</h2>
                <button onClick={() => navigate('/address-book')} className="flex items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-600">
                  {t('profile.manage')} <ChevronRight size={14} />
                </button>
              </div>
              {addresses.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                  <MapPin size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">{t('profile.noSavedAddresses')}</p>
                  <button onClick={() => navigate('/address-book')} className="mt-4 rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-black text-white">{t('profile.addAddress')}</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-500"><MapPin size={18} /></div>
                          <div>
                            <p className="font-black capitalize text-gray-950">{addr.label || t('profile.home')}</p>
                            {addr.is_default && <span className="text-[11px] font-bold text-pink-500">{t('profile.default')}</span>}
                          </div>
                        </div>
                        <button onClick={() => navigate('/address-book')} className="text-xs font-bold text-gray-400 hover:text-pink-500">{t('common.edit')}</button>
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
                <h2 className="text-xl font-black text-gray-950">{t('profile.myWishlist')}</h2>
                <button onClick={() => navigate('/wishlist')} className="flex items-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-600">
                  {t('profile.viewFullPage')} <ChevronRight size={14} />
                </button>
              </div>
              {wishlistItems.length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                  <Heart size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">{t('wishlist.empty')}</p>
                  <button onClick={() => navigate('/shop')} className="mt-4 rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-black text-white">{t('common.browseProducts')}</button>
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
              <h2 className="text-xl font-black text-gray-950">{t('profile.rewardsAndPoints')}</h2>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-500">{t('profile.totalPoints')}</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-5xl font-black text-pink-600">{rewardPoints.toLocaleString()}</span>
                      <span className="text-base font-bold text-gray-400">{t('profile.ptsLabel')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-gray-300 to-gray-400" />
                      <span className="font-black text-gray-700">{t('profile.memberLevel', { level: membershipLevel })}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">{t('profile.ptsMoreToGold', { count: ptsToNext.toLocaleString() })}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-xs font-semibold text-gray-500">
                    <span>{rewardPoints.toLocaleString()} {t('profile.ptsLabel')}</span>
                    <span>{t('profile.goldTarget', { count: nextTierPoints.toLocaleString() })}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-gray-950">{t('profile.rewardsCatalog')}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/profile/rewards')}
                    className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-black text-white transition hover:bg-pink-700"
                  >
                    {t('profile.openExchange')}
                  </button>
                </div>
                <div className="py-10 text-center">
                  <Gift size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">{t('profile.exchangeCoupons')}</p>
                  <p className="mt-1 text-xs text-gray-400">{t('profile.exchangeCouponsHint')}</p>
                </div>
              </div>
            </div>
          )}

          {/* ══ COUPONS ══ */}
          {activeView === 'coupons' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">{t('profile.myCoupons')}</h2>
              {rewardRedemptions.filter((item) => item.coupon_code).length === 0 ? (
                <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                  <Percent size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-400">{t('profile.noCoupons')}</p>
                  <p className="mt-1 text-xs text-gray-400">{t('profile.couponExchangeHint')}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/profile/rewards')}
                    className="mt-4 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-black text-white"
                  >
                    {t('profile.exchangeRewards')}
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {rewardRedemptions.filter((item) => item.coupon_code).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-gray-950">{item.reward_name}</p>
                          <p className="mt-1 text-xs font-semibold text-gray-400">{formatDate(item.created_at)}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black capitalize text-emerald-600">
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                        <span className="text-xs font-black uppercase text-gray-400">{t('profile.code')}</span>
                        <span className="font-mono text-sm font-black text-gray-950">{item.coupon_code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ REVIEWS ══ */}
          {activeView === 'reviews' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">{t('profile.myReviews')}</h2>
              <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <Star size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-400">{t('profile.noReviews')}</p>
                <p className="mt-1 text-xs text-gray-400">{t('profile.reviewsHint')}</p>
              </div>
            </div>
          )}

          {/* ══ PAYMENT METHODS ══ */}
          {activeView === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-950">{t('profile.paymentMethods')}</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {[
                  { icon: CreditCard, titleKey: 'profile.visaCard', descKey: 'profile.visaCardDesc', cls: 'bg-blue-50 text-blue-500' },
                  { icon: ShoppingBag, titleKey: 'profile.abaMobile', descKey: 'profile.abaMobileDesc', cls: 'bg-orange-50 text-orange-500' },
                  { icon: Package, titleKey: 'profile.cod', descKey: 'profile.codDesc', cls: 'bg-green-50 text-green-500' },
                ].map(({ icon: Icon, titleKey, descKey, cls }) => (
                  <div key={titleKey} className="flex items-center gap-4 border-b border-gray-50 p-4 last:border-0">
                    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', cls)}><Icon size={19} /></div>
                    <div className="flex-1">
                      <p className="font-black text-gray-950">{t(titleKey)}</p>
                      <p className="text-xs text-gray-400">{t(descKey)}</p>
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
              <h2 className="text-xl font-black text-gray-950">{t('profile.notifications')}</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {[
                  { titleKey: 'profile.orderUpdates', descKey: 'profile.orderUpdatesDesc', on: true },
                  { titleKey: 'profile.promotionsDeals', descKey: 'profile.promotionsDealsDesc', on: true },
                  { titleKey: 'profile.newArrivalsNotif', descKey: 'profile.newArrivalsNotifDesc', on: false },
                  { titleKey: 'profile.accountActivity', descKey: 'profile.accountActivityDesc', on: true },
                ].map(({ titleKey, descKey, on }) => (
                  <div key={titleKey} className="flex items-center justify-between gap-4 border-b border-gray-50 p-4 last:border-0">
                    <div>
                      <p className="font-black text-gray-950">{t(titleKey)}</p>
                      <p className="text-xs text-gray-400">{t(descKey)}</p>
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
              <h2 className="text-xl font-black text-gray-950">{t('profile.helpCenter')}</h2>
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {[
                  { qKey: 'profile.faqTrackOrder', aKey: 'profile.faqTrackOrderA' },
                  { qKey: 'profile.faqReturn', aKey: 'profile.faqReturnA' },
                  { qKey: 'profile.faqPayment', aKey: 'profile.faqPaymentA' },
                  { qKey: 'profile.faqDelivery', aKey: 'profile.faqDeliveryA' },
                  { qKey: 'profile.faqPoints', aKey: 'profile.faqPointsA' },
                ].map(({ qKey, aKey }, i) => (
                  <div key={i} className="border-b border-gray-50 p-4 last:border-0">
                    <p className="font-black text-gray-950">{t(qKey)}</p>
                    <p className="mt-1 text-sm text-gray-500">{t(aKey)}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                <p className="font-black text-gray-950">{t('profile.stillNeedHelp')}</p>
                <p className="mt-1 text-sm text-gray-400">{t('profile.supportAvailable')}</p>
                <button className="mt-3 rounded-xl bg-pink-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-pink-700">{t('profile.contactSupport')}</button>
              </div>
            </div>
          )}

          </div>
        </div>
      </div>{/* end hidden lg:flex */}

      {activeModal === 'password' && (
        <ChangePasswordModal user={user} onClose={() => setActiveModal(null)} />
      )}
      {ConfirmDialog}
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
