import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeft, Camera, ChevronDown, Eye, EyeOff, Loader2, UserRound } from 'lucide-react'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import { cn } from '@/utils/helpers'

const GENDER_OPTIONS = [
  { value: '', label: 'Select' },
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 px-4 py-5 sm:px-6">
      <form onSubmit={step === 'password' ? handlePasswordSubmit : handleSubmit} className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-[460px] flex-col rounded-[30px] bg-white px-6 pb-8 pt-5 shadow-[0_22px_60px_rgba(219,39,119,0.12)] sm:px-7">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => step === 'password' ? setStep('profile') : navigate('/')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-pink-100 bg-white text-gray-700 shadow-sm transition hover:bg-pink-50 active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft size={20} strokeWidth={2.4} />
          </button>
        </div>

        {step === 'password' ? (
          <>
            <div className="mt-24 text-center">
              <h1 className="text-[30px] font-black leading-tight text-gray-950">New Password</h1>
              <p className="mx-auto mt-2 max-w-[300px] text-sm font-semibold leading-5 text-gray-400">
                Create a password so you can also sign in with phone or email next time.
              </p>
            </div>

            <div className="mt-12 space-y-5">
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

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="mt-9 flex h-[58px] w-full items-center justify-center rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-base font-black text-white shadow-[0_16px_32px_rgba(233,30,99,0.28)] transition hover:from-pink-700 hover:to-purple-700 active:scale-[0.98] disabled:opacity-60"
            >
              {passwordMutation.isPending ? <Loader2 size={22} className="animate-spin" /> : 'Create New Password'}
            </button>
          </>
        ) : (
          <>
            <div className="mt-7 text-center">
              <h1 className="text-[28px] font-black leading-tight text-gray-950">Complete Your Profile</h1>
              <p className="mx-auto mt-2 max-w-[330px] text-sm font-semibold leading-5 text-gray-400">
                Your details stay private and help us deliver your orders correctly.
              </p>
            </div>

            <div className="mt-9 flex justify-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-50 to-purple-50 text-pink-300 ring-1 ring-pink-100 transition active:scale-95"
                  aria-label="Upload profile photo"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                  ) : initials ? (
                    <span className="text-5xl font-black">{initials}</span>
                  ) : (
                    <UserRound size={64} strokeWidth={1.9} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-1 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-[#E91E63] text-white shadow-lg transition hover:bg-pink-600 active:scale-95"
                  aria-label="Change profile photo"
                >
                  <Camera size={18} fill="currentColor" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>

            <div className="mt-10 space-y-5">
              <CompleteProfileField
                label="Name"
                placeholder="Ex. John Doe"
                value={form.full_name}
                onChange={(value) => set('full_name', value)}
                error={errors.full_name}
                autoComplete="name"
              />

              <CompleteProfileField
                label="Phone Number"
                placeholder="Enter Phone Number"
                value={form.phone}
                onChange={(value) => set('phone', value)}
                error={errors.phone}
                autoComplete="tel"
                prefix="+855"
              />

              <label className="block">
                <span className="mb-2 block text-sm font-black text-gray-600">Gender</span>
                <div className={cn(
                  'relative flex h-[54px] items-center rounded-xl bg-gray-50 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-pink-200',
                  errors.gender && 'ring-red-200'
                )}>
                  <select
                    value={form.gender}
                    onChange={(event) => set('gender', event.target.value)}
                    className={cn(
                      'h-full w-full appearance-none rounded-xl bg-transparent px-4 pr-11 text-sm font-bold outline-none',
                      form.gender ? 'text-gray-950' : 'text-gray-400'
                    )}
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="pointer-events-none absolute right-4 text-gray-400" />
                </div>
                {errors.gender && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.gender}</p>}
              </label>
            </div>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="mt-9 flex h-[58px] w-full items-center justify-center rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-base font-black text-white shadow-[0_16px_32px_rgba(233,30,99,0.28)] transition hover:from-pink-700 hover:to-purple-700 active:scale-[0.98] disabled:opacity-60"
            >
              {saveMutation.isPending ? <Loader2 size={22} className="animate-spin" /> : needsPassword ? 'Continue' : 'Complete Profile'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

function PasswordField({ label, value, onChange, error, show, onToggle, autoComplete }) {
  const Icon = show ? EyeOff : Eye
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-gray-600">{label}</span>
      <div className={cn(
        'flex h-[54px] items-center rounded-xl bg-gray-50 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-pink-200',
        error && 'ring-red-200'
      )}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder="********"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold text-gray-950 outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={onToggle}
          className="flex h-full w-14 items-center justify-center text-gray-500 transition hover:text-pink-600"
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          <Icon size={23} strokeWidth={2.1} />
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
    </label>
  )
}

function CompleteProfileField({ label, placeholder, value, onChange, error, autoComplete, prefix }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-gray-600">{label}</span>
      <div className={cn(
        'flex h-[54px] items-center rounded-xl bg-gray-50 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-pink-200',
        error && 'ring-red-200'
      )}>
        {prefix && (
          <span className="flex h-6 items-center border-r border-gray-200 px-4 text-sm font-bold text-gray-700">
            {prefix}
          </span>
        )}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            'min-w-0 flex-1 bg-transparent px-4 text-sm font-bold text-gray-950 outline-none placeholder:text-gray-400',
            prefix && 'pl-3'
          )}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-500">{error}</p>}
    </label>
  )
}
