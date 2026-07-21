import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  BarChart3,
  Camera,
  ChevronDown,
  ClipboardList,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Mail,
  PackageCheck,
  Phone,
  ShieldCheck,
  Sparkles,
  Zap,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import { cn } from '@/utils/helpers'

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export default function CompleteProfile() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar_url || user?.google_picture_url || user?.telegram_photo_url || ''
  )
  const needsPassword = user?.has_usable_password === false
  const [step, setStep] = useState('profile')
  const [form, setForm] = useState({
    full_name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    phone: user?.phone || '',
    gender: user?.gender || '',
    email: user?.email || '',
    password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const initials = useMemo(() => {
    const source = form.full_name || user?.username || 'User'
    return source.trim().slice(0, 1).toUpperCase()
  }, [form.full_name, user?.username])

  const nextPath = location.state?.from && location.state.from !== '/profile/complete'
    ? location.state.from
    : '/'
  const isPasswordStep = step === 'password'
  const stepNumber = isPasswordStep ? 3 : 2
  const progress = isPasswordStep ? 100 : 66

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error('Photo is too large. Please choose an image under 6MB.')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const saveMutation = useMutation({
    mutationFn: (data) => authApi.updateMe(data),
    onSuccess: ({ data }) => {
      updateUser(data)
      if (needsPassword) {
        setStep('password')
        toast.success('Profile saved.')
        return
      }
      toast.success('Profile completed.')
      navigate(nextPath, { replace: true })
    },
    onError: (error) => {
      const body = error.response?.data
      const message = body?.phone?.[0] || body?.first_name?.[0] || body?.gender?.[0] || body?.detail || 'Could not complete profile.'
      toast.error(message)
    },
  })

  const passwordMutation = useMutation({
    mutationFn: (data) => authApi.setInitialPassword(data),
    onSuccess: ({ data }) => {
      updateUser(data)
      toast.success('Password created.')
      navigate(nextPath, { replace: true })
    },
    onError: (error) => {
      const body = error.response?.data
      const message = body?.password?.[0] || body?.confirm_password?.[0] || body?.detail || 'Could not create password.'
      toast.error(message)
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()
    const cleanName = form.full_name.trim()
    const cleanPhone = form.phone.trim()
    const nextErrors = {}

    if (!cleanName || ['google', 'telegram'].includes(cleanName.toLowerCase())) {
      nextErrors.full_name = 'Please enter your name.'
    }
    if (!cleanPhone) nextErrors.phone = 'Please enter your phone number.'
    if (!form.gender) nextErrors.gender = 'Please select gender.'

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    const [firstName, ...lastParts] = cleanName.split(/\s+/)
    const payload = {
      first_name: firstName || '',
      last_name: lastParts.join(' '),
      phone: cleanPhone,
      gender: form.gender,
    }

    if (avatarFile) {
      const fd = new FormData()
      Object.entries(payload).forEach(([key, value]) => fd.append(key, value))
      fd.append('avatar', avatarFile)
      saveMutation.mutate(fd)
      return
    }

    saveMutation.mutate(payload)
  }

  const handlePasswordSubmit = (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (!form.password || form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirm_password) nextErrors.confirm_password = 'Passwords do not match.'

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    passwordMutation.mutate({
      password: form.password,
      confirm_password: form.confirm_password,
    })
  }

  if (!user) return null

  return (
    <div className="relative min-h-screen overflow-hidden bg-white font-sans text-[#1A1A1A] lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col bg-white lg:min-h-[820px] lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:overflow-hidden lg:rounded-[32px] lg:border lg:border-gray-200 lg:shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
        <ProfileVisualPanel />

        <form
          onSubmit={isPasswordStep ? handlePasswordSubmit : handleSubmit}
          className="relative mx-auto flex w-full max-w-[620px] flex-1 flex-col bg-white px-5 py-6 sm:px-8 lg:max-w-none lg:px-16 lg:py-10 xl:px-20"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => isPasswordStep ? setStep('profile') : navigate('/')}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#F2DCE7] bg-white text-[#1A1A1A] shadow-sm transition hover:-translate-y-0.5 hover:border-[#EC4D97]/35 hover:text-[#EC4D97] active:scale-95 focus:outline-none focus:ring-4 focus:ring-[rgba(236,77,151,.10)]"
              aria-label="Back"
            >
              <ArrowLeft size={20} strokeWidth={2.4} />
            </button>

            <StepProgress step={stepNumber} progress={progress} />
          </div>

          <div className="mt-8 text-center lg:hidden">
            <h1 className="text-3xl font-black tracking-tight text-[#1A1A1A]">
              {isPasswordStep ? 'Create Your Password' : 'Complete Your Profile'}
            </h1>
            <p className="mx-auto mt-3 max-w-[330px] text-sm font-semibold leading-6 text-[#6B7280]">
              {isPasswordStep
                ? 'Secure your account so you can sign in easily next time.'
                : 'Add your details to personalize your account and get your orders delivered smoothly.'}
            </p>
          </div>

          {isPasswordStep ? (
            <PasswordStep
              form={form}
              errors={errors}
              set={set}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              setShowPassword={setShowPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isPending={passwordMutation.isPending}
            />
          ) : (
            <ProfileStep
              form={form}
              errors={errors}
              set={set}
              avatarPreview={avatarPreview}
              initials={initials}
              fileInputRef={fileInputRef}
              onAvatarChange={handleAvatarChange}
              isPending={saveMutation.isPending}
              needsPassword={needsPassword}
            />
          )}
        </form>
      </div>
    </div>
  )
}

function ProfileVisualPanel() {
  const featureCards = [
    { icon: ClipboardList, title: 'Orders', text: 'Track every sale and delivery in real time.' },
    { icon: BarChart3, title: 'Reports', text: 'Keep your beauty business insights ready.' },
    { icon: PackageCheck, title: 'Inventory', text: 'Manage stock and checkout smoothly.' },
  ]
  const trustItems = [
    { icon: ShieldCheck, label: 'Secure & Reliable', sub: 'Your data is always safe' },
    { icon: Zap, label: 'Fast & Efficient', sub: 'Built for performance' },
    { icon: Globe, label: 'Access Anywhere', sub: 'Cloud powered platform' },
  ]

  return (
    <aside className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#FFF5FA_0%,#FFE6F2_54%,#FFD8EA_100%)] p-10 text-[#1A1A1A] lg:flex lg:min-h-[820px] lg:flex-col lg:justify-between xl:p-12">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#FFD6E8]/80 blur-2xl" />
      <div className="absolute right-10 top-24 h-44 w-44 rounded-full bg-white/65 blur-2xl" />
      <div className="absolute bottom-28 left-1/2 h-72 w-72 rounded-full bg-[#FFF4F8]/80 blur-2xl" />
      <div className="absolute left-20 top-20 grid grid-cols-6 gap-2 opacity-50">
        {Array.from({ length: 36 }).map((_, index) => (
          <span key={index} className="h-1.5 w-1.5 rounded-full bg-white" />
        ))}
      </div>
      <div className="absolute left-[55%] top-32 h-6 w-10 rotate-[-18deg] rounded-[80%_20%_80%_20%] bg-[#F8A9D0]/65" />
      <div className="absolute left-[47%] top-52 h-8 w-12 rotate-[28deg] rounded-[80%_20%_80%_20%] bg-[#F8A9D0]/55" />
      <ProfileIllustration />

      <div className="relative z-10 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="grid h-20 w-20 place-items-center rounded-[24px] border border-[#F0D9E6] bg-gradient-to-br from-[#FF6CAB] to-[#EC4D97] text-3xl font-black text-white shadow-[0_18px_36px_rgba(236,77,151,0.22)]">
            S
          </div>
          <div className="mt-3 text-center">
            <p className="text-2xl font-black uppercase tracking-[0.12em] text-[#1A1A1A]">Shadow</p>
            <p className="text-xs font-black uppercase tracking-[0.42em] text-[#EC4D97]">Shop</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[470px]">
        <p className="inline-flex rounded-full border border-white/80 bg-white/75 px-5 py-2 text-sm font-black uppercase text-[#EC4D97] shadow-[0_12px_28px_rgba(236,77,151,0.10)] backdrop-blur">
          <Sparkles size={15} className="mr-2" />
          Almost there
        </p>
        <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight text-[#1A1A1A] xl:text-[3.35rem]">
          Complete Your <span className="text-[#EC4D97]">Profile</span> Beautifully.
        </h1>
        <p className="mt-6 max-w-sm text-base font-semibold leading-8 text-[#6B7280]">
          Add your details to personalize your account and keep checkout smooth for every order.
        </p>
      </div>

      <div className="relative z-10 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {featureCards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[24px] border border-white/75 bg-white/78 p-5 shadow-[0_20px_40px_rgba(236,77,151,0.10)] backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(236,77,151,0.12)]">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF4F8] text-[#EC4D97] shadow-[inset_0_0_0_1px_rgba(236,77,151,0.08)]">
                <Icon size={27} />
              </div>
              <p className="mt-4 text-lg font-black text-[#1A1A1A]">{title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#6B7280]">{text}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-5 rounded-[24px] border border-white/70 bg-white/55 px-6 py-5 backdrop-blur">
          {trustItems.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-4">
              <Icon size={27} className="shrink-0 text-[#EC4D97]" />
              <div>
                <p className="text-sm font-black text-[#1A1A1A]">{label}</p>
                <p className="mt-1 text-xs font-semibold text-[#6B7280]">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

function StepProgress({ step, progress }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:gap-4">
      <span className="shrink-0 text-xs font-black text-[#EC4D97] sm:text-sm">Step {step} of 3</span>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-[#FFD6E8] sm:w-40">
        <div
          className="h-full rounded-full bg-[linear-gradient(135deg,#FF6CAB,#EC4D97)] shadow-[0_0_16px_rgba(236,77,151,0.24)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-black text-[#EC4D97] sm:text-sm">{progress}%</span>
    </div>
  )
}

function ProfileStep({ form, errors, set, avatarPreview, initials, fileInputRef, onAvatarChange, isPending, needsPassword }) {
  return (
    <div className="mt-6 lg:mt-12">
      <div className="hidden lg:block">
        <h2 className="text-4xl font-black tracking-tight text-[#1A1A1A]">Complete Your Profile</h2>
        <p className="mt-3 text-base font-semibold text-[#6B7280]">
          Add your delivery details and keep your account ready for checkout.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 border-b border-[#F2DCE7] pb-7 sm:flex-row sm:justify-center lg:justify-start">
        <AvatarPicker
          avatarPreview={avatarPreview}
          initials={initials}
          fileInputRef={fileInputRef}
          onAvatarChange={onAvatarChange}
        />
        <div className="text-center sm:text-left">
          <p className="text-base font-black text-[#1A1A1A]">Profile Photo</p>
          <p className="mt-1 text-xs font-semibold text-[#6B7280]">JPG, PNG or WEBP. Max size 6MB.</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 hidden h-10 items-center gap-2 rounded-full border border-[#F2DCE7] bg-white px-4 text-xs font-black text-[#EC4D97] shadow-sm transition hover:-translate-y-0.5 hover:border-[#EC4D97]/35 sm:inline-flex"
          >
            <Camera size={15} />
            Change Photo
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <CompleteProfileField
          label="Full Name"
          required
          icon={UserRound}
          placeholder="Ex. Tha Seyha"
          value={form.full_name}
          onChange={(value) => set('full_name', value)}
          error={errors.full_name}
          autoComplete="name"
        />

        <CompleteProfileField
          label="Phone Number"
          required
          icon={Phone}
          placeholder="077322921"
          value={form.phone}
          onChange={(value) => set('phone', value)}
          error={errors.phone}
          autoComplete="tel"
          prefix="+855"
        />

        <GenderField value={form.gender} onChange={(value) => set('gender', value)} error={errors.gender} />

        <CompleteProfileField
          label="Email"
          optional
          icon={Mail}
          placeholder="example@email.com"
          value={form.email}
          onChange={(value) => set('email', value)}
          autoComplete="email"
          disabled
        />
      </div>

      <SubmitButton isPending={isPending}>
        {needsPassword ? 'Continue' : 'Complete Profile'}
      </SubmitButton>

      <SecureNote />
    </div>
  )
}

function PasswordStep({ form, errors, set, showPassword, showConfirmPassword, setShowPassword, setShowConfirmPassword, isPending }) {
  return (
    <div className="mt-8 lg:mt-20">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] bg-[#FFF4F8] text-[#EC4D97] shadow-[inset_0_0_0_1px_rgba(236,77,151,0.10)] lg:mx-0">
        <Lock size={34} />
      </div>

      <div className="mt-5 text-center lg:text-left">
        <h2 className="text-4xl font-black tracking-tight text-[#1A1A1A]">Create New Password</h2>
        <p className="mx-auto mt-3 max-w-md text-base font-semibold leading-7 text-[#6B7280] lg:mx-0">
          Add a password so you can also sign in with your phone or email next time.
        </p>
      </div>

      <div className="mt-7 space-y-4">
        <PasswordField
          label="Password"
          value={form.password}
          onChange={(value) => set('password', value)}
          error={errors.password}
          show={showPassword}
          onToggle={() => setShowPassword((value) => !value)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm Password"
          value={form.confirm_password}
          onChange={(value) => set('confirm_password', value)}
          error={errors.confirm_password}
          show={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((value) => !value)}
          autoComplete="new-password"
        />
      </div>

      <SubmitButton isPending={isPending}>Create Password</SubmitButton>
      <SecureNote />
    </div>
  )
}

function AvatarPicker({ avatarPreview, initials, fileInputRef, onAvatarChange }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="grid h-28 w-28 place-items-center overflow-hidden rounded-full border-[6px] border-white bg-[radial-gradient(circle_at_35%_20%,#fff_0%,#FFF4F8_48%,#FFD6E8_100%)] text-[#EC4D97] shadow-[0_16px_35px_rgba(236,77,151,0.16)] transition active:scale-95 sm:h-32 sm:w-32"
        aria-label="Upload profile photo"
      >
        {avatarPreview ? (
          <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
        ) : initials ? (
          <span className="text-5xl font-black sm:text-6xl">{initials}</span>
        ) : (
          <UserRound size={54} strokeWidth={1.8} />
        )}
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="absolute bottom-2 right-0 grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-[#EC4D97] text-white shadow-[0_12px_24px_rgba(236,77,151,0.25)] transition hover:bg-[#E53888] active:scale-95"
        aria-label="Change profile photo"
      >
        <Camera size={17} fill="currentColor" />
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
    </div>
  )
}

function CompleteProfileField({ label, required, optional, icon: Icon, placeholder, value, onChange, error, autoComplete, prefix, disabled }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#1A1A1A]">
        {label} {required && <span className="text-[#EC4D97]">*</span>}
        {optional && <span className="font-bold text-[#6B7280]"> (Optional)</span>}
      </span>
      <div className={cn(
        'flex min-h-[56px] items-center overflow-hidden rounded-2xl border border-[#F2DCE7] bg-white transition-all focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[rgba(236,77,151,.10)]',
        error && 'border-[#EF4444] focus-within:border-[#EF4444] focus-within:ring-red-500/10',
        disabled && 'bg-gray-50 text-[#6B7280]'
      )}>
        <span className="grid h-[56px] w-[56px] shrink-0 place-items-center text-[#EC4D97]">
          <Icon size={20} strokeWidth={2.1} />
        </span>
        {prefix && (
          <span className="flex h-[56px] shrink-0 items-center gap-1 border-r border-[#F2DCE7] px-4 text-sm font-black text-[#1A1A1A]">
            {prefix}
            <ChevronDown size={15} className="text-[#6B7280]" />
          </span>
        )}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold text-[#1A1A1A] outline-none placeholder:text-slate-400 disabled:text-slate-400"
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-bold text-[#EF4444]">{error}</p>}
    </label>
  )
}

function GenderField({ value, onChange, error }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#1A1A1A]">
        Gender <span className="text-[#EC4D97]">*</span>
      </span>
      <div className={cn(
        'relative flex min-h-[56px] items-center overflow-hidden rounded-2xl border border-[#F2DCE7] bg-white transition-all focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[rgba(236,77,151,.10)]',
        error && 'border-[#EF4444] focus-within:border-[#EF4444] focus-within:ring-red-500/10'
      )}>
        <span className="grid h-[56px] w-[56px] shrink-0 place-items-center text-[#EC4D97]">
          <UsersRound size={20} strokeWidth={2.1} />
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-[56px] min-w-0 flex-1 appearance-none bg-transparent px-4 pr-12 text-sm font-bold outline-none',
            value ? 'text-[#1A1A1A]' : 'text-slate-400'
          )}
        >
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-4 text-[#6B7280]" />
      </div>
      {error && <p className="mt-1.5 text-xs font-bold text-[#EF4444]">{error}</p>}
    </label>
  )
}

function PasswordField({ label, value, onChange, error, show, onToggle, autoComplete }) {
  const Icon = show ? EyeOff : Eye
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#1A1A1A]">
        {label} <span className="text-[#EC4D97]">*</span>
      </span>
      <div className={cn(
        'flex min-h-[56px] items-center overflow-hidden rounded-2xl border border-[#F2DCE7] bg-white transition-all focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[rgba(236,77,151,.10)]',
        error && 'border-[#EF4444] focus-within:border-[#EF4444] focus-within:ring-red-500/10'
      )}>
        <span className="grid h-[56px] w-[56px] shrink-0 place-items-center text-[#EC4D97]">
          <Lock size={20} strokeWidth={2.1} />
        </span>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder="********"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold text-[#1A1A1A] outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={onToggle}
          className="grid h-[56px] w-12 place-items-center text-slate-400 transition hover:text-[#EC4D97]"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          <Icon size={20} strokeWidth={2.1} />
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-bold text-[#EF4444]">{error}</p>}
    </label>
  )
}

function SubmitButton({ isPending, children }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#FF6CAB,#EC4D97)] text-base font-black text-white shadow-[0_15px_35px_rgba(236,77,151,0.25)] transition hover:scale-[1.02] hover:bg-[#E53888] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? <Loader2 size={22} className="animate-spin" /> : children}
    </button>
  )
}

function SecureNote() {
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-bold leading-5 text-[#6B7280]">
      <ShieldCheck size={15} />
      <span>Your information is secure and will never be shared.</span>
    </div>
  )
}

function ProfileIllustration() {
  return (
    <div className="pointer-events-none absolute right-6 top-[300px] hidden h-[250px] w-[390px] xl:block">
      <div className="absolute bottom-2 right-4 h-20 w-[330px] rounded-[50%] bg-[#F8A9D0]/28 shadow-[0_30px_70px_rgba(236,77,151,0.12)]" />

      <div className="absolute right-4 top-0 h-32 w-60 rounded-[28px] border border-white/90 bg-white/82 p-5 shadow-[0_22px_48px_rgba(236,77,151,0.12)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="h-2 w-24 rounded-full bg-[#FFD6E8]" />
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F8A9D0]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#7ED7FF]" />
          </div>
        </div>
        <svg className="mt-4 h-16 w-full" viewBox="0 0 190 70" fill="none" aria-hidden="true">
          <path d="M6 56 C28 28 48 50 68 31 C91 10 106 38 129 19 C149 3 164 15 184 5" stroke="#EC4D97" strokeWidth="5" strokeLinecap="round" />
          <path d="M10 61 H184" stroke="#F0D9E6" strokeWidth="2" strokeLinecap="round" />
          <circle cx="151" cy="29" r="15" fill="#7ED7FF" opacity=".45" />
        </svg>
      </div>

      <div className="absolute bottom-12 right-10 h-32 w-52 rounded-[28px] border border-white/90 bg-white/78 p-5 shadow-[0_24px_48px_rgba(236,77,151,0.13)] backdrop-blur">
        <div className="flex items-end gap-3">
          <span className="h-9 w-5 rounded-full bg-[#FFD6E8]" />
          <span className="h-16 w-5 rounded-full bg-[#EC4D97]" />
          <span className="h-12 w-5 rounded-full bg-[#F8A9D0]" />
          <span className="h-20 w-5 rounded-full bg-[#7ED7FF]" />
        </div>
        <div className="mt-5 h-2 w-32 rounded-full bg-[#FFD6E8]" />
        <div className="mt-3 h-2 w-24 rounded-full bg-[#F0D9E6]" />
      </div>

      <div className="absolute bottom-[92px] left-14 grid h-14 w-14 place-items-center rounded-2xl border border-white/90 bg-white text-[#EC4D97] shadow-[0_18px_36px_rgba(236,77,151,0.13)]">
        <UserRound size={26} strokeWidth={1.8} />
      </div>
      <div className="absolute bottom-9 left-28 grid h-14 w-14 place-items-center rounded-2xl border border-white/90 bg-white text-[#7ED7FF] shadow-[0_18px_36px_rgba(126,215,255,0.16)]">
        <ShieldCheck size={26} strokeWidth={1.8} />
      </div>
      <div className="absolute left-20 top-16 h-8 w-12 rotate-[24deg] rounded-[80%_20%_80%_20%] bg-[#F8A9D0]/45" />
      <div className="absolute bottom-24 right-0 h-7 w-11 rotate-[-18deg] rounded-[80%_20%_80%_20%] bg-[#FFD6E8]/75" />
    </div>
  )
}
