import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle, CheckCircle2,
  Eye, EyeOff, Loader2, Lock, Send, Phone, Mail,
  ChevronLeft, ChevronRight, Globe, Headphones,
  Sparkles, ShieldCheck, User,
  ClipboardList, BarChart3, PackageCheck,
  ShoppingBag, Box, Zap, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { isSocialProfileIncomplete } from '@/utils/profileCompletion'
import { cn } from '@/utils/cn'

function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.7H.94v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.96 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.94H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.06l3.02-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .94 4.94l3.02 2.34C4.67 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

/* ──────────────────────────────────────────────────
   SHOP LOGO  (mountain icon + SHADOW / SHOP)
────────────────────────────────────────────────── */
function ShopLogo({ storeName = 'Shadow Shop', scale = 1 }) {
  const words = (storeName || 'Shadow Shop').split(' ')
  const main = words[0].toUpperCase()
  const sub = words.slice(1).join(' ').toUpperCase() || 'SHOP'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(5 * scale) }}>
      <svg width={Math.round(54 * scale)} height={Math.round(44 * scale)} viewBox="0 0 54 44" fill="none">
        <path d="M0 44 C2 44,6 24,14 16 C20 10,22 22,24 28 C26 22,32 8,38 8 C44 8,50 26,54 44 Z" fill="#E91E63" />
        <circle cx="38" cy="5" r="3.5" fill="#E91E63" />
      </svg>
      <p style={{ fontFamily: 'Georgia,serif', fontWeight: 900, letterSpacing: '0.18em', color: '#0f172a', fontSize: Math.round(26 * scale), lineHeight: 1, margin: 0 }}>{main}</p>
      <p style={{ fontWeight: 800, letterSpacing: '0.42em', color: '#E91E63', fontSize: Math.round(10 * scale), lineHeight: 1, margin: 0 }}>{sub}</p>
    </div>
  )
}

/* ──────────────────────────────────────────────────
   LANGUAGE PICKER
────────────────────────────────────────────────── */
const LANGS = [
  { code: 'en', label: 'English', short: 'US', flag: '🇺🇸' },
  { code: 'km', label: 'ខ្មែរ',   short: 'KH', flag: '🇰🇭' },
]

function LanguagePicker() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = i18n.language?.startsWith('km') ? 'km' : 'en'
  const cur = LANGS.find((l) => l.code === current) || LANGS[0]

  const select = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative z-50 flex h-12 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-sm font-bold text-[#1A1A1A] shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100"
      >
        <span className="text-base leading-none">{cur.flag}</span>
        <span>{cur.label}</span>
        <ChevronRight size={13} className={`transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[170px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_36px_rgba(17,24,39,0.10)]">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition hover:bg-gray-50 ${l.code === current ? 'bg-gray-50' : ''}`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span className="text-xs font-black text-[#6B7280]">{l.short}</span>
              <span className={`flex-1 text-left font-bold ${l.code === current ? 'text-[#EC4D97]' : 'text-[#1A1A1A]'}`}>{l.label}</span>
              <span className={`text-xs font-bold ${l.code === current ? 'text-[#EC4D97]' : 'text-[#6B7280]'}`}>{l.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LoginBrand({ storeName, logoUrl }) {
  return (
    <div className="flex flex-col items-center">
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className="h-24 w-24 object-contain drop-shadow-[0_16px_28px_rgba(236,77,151,0.18)]" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#F0D9E6] bg-gradient-to-br from-[#FF6CAB] to-[#EC4D97] text-4xl font-black text-white shadow-[0_18px_36px_rgba(236,77,151,0.22)]">
          S
        </div>
      )}
      <div className="mt-2 text-center">
        <p className="text-2xl font-black uppercase tracking-[0.12em] text-[#1A1A1A]">{(storeName || 'Shadow Shop').split(' ')[0]}</p>
        <p className="text-xs font-black uppercase tracking-[0.42em] text-[#EC4D97]">{(storeName || 'Shadow Shop').split(' ').slice(1).join(' ') || 'SHOP'}</p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────
   MAIN
────────────────────────────────────────────────── */
function BusinessShowpiece() {
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
        <ShoppingBag size={26} strokeWidth={1.8} />
      </div>
      <div className="absolute bottom-9 left-28 grid h-14 w-14 place-items-center rounded-2xl border border-white/90 bg-white text-[#7ED7FF] shadow-[0_18px_36px_rgba(126,215,255,0.16)]">
        <Box size={26} strokeWidth={1.8} />
      </div>
      <div className="absolute left-20 top-16 h-8 w-12 rotate-[24deg] rounded-[80%_20%_80%_20%] bg-[#F8A9D0]/45" />
      <div className="absolute bottom-24 right-0 h-7 w-11 rotate-[-18deg] rounded-[80%_20%_80%_20%] bg-[#FFD6E8]/75" />
    </div>
  )
}

function AuthVisualPanel({ storeName, logoUrl, t }) {
  const featureCards = [
    { icon: ClipboardList, title: t('auth.featureOrders'), text: t('auth.featureOrdersText') },
    { icon: BarChart3, title: t('auth.featureReports'), text: t('auth.featureReportsText') },
    { icon: PackageCheck, title: t('auth.featureInventory'), text: t('auth.featureInventoryText') },
  ]
  const trustItems = [
    { icon: ShieldCheck, label: t('auth.trustSecure'), sub: t('auth.trustSecureText') },
    { icon: Zap, label: t('auth.trustFast'), sub: t('auth.trustFastText') },
    { icon: Globe, label: t('auth.trustAccess'), sub: t('auth.trustAccessText') },
  ]

  return (
    <aside className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#FFF5FA_0%,#FFE6F2_54%,#FFD8EA_100%)] p-10 text-[#1A1A1A] lg:flex lg:min-h-[760px] lg:flex-col lg:justify-between xl:min-h-[820px] xl:p-12">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#FFD6E8]/80 blur-2xl" />
      <div className="absolute right-10 top-24 h-44 w-44 rounded-full bg-white/65 blur-2xl" />
      <div className="absolute bottom-28 left-1/2 h-72 w-72 rounded-full bg-[#FFF4F8]/80 blur-2xl" />
      <div className="absolute left-20 top-20 grid grid-cols-6 gap-2 opacity-50">
        {Array.from({ length: 36 }).map((_, index) => (
          <span key={index} className="h-1.5 w-1.5 rounded-full bg-white" />
        ))}
      </div>
      <div className="absolute left-[52%] top-32 h-6 w-10 rotate-[-18deg] rounded-[80%_20%_80%_20%] bg-[#F8A9D0]/65" />
      <div className="absolute left-[47%] top-52 h-8 w-12 rotate-[28deg] rounded-[80%_20%_80%_20%] bg-[#F8A9D0]/55" />
      <div className="absolute left-[39%] top-[46%] h-5 w-8 rotate-[18deg] rounded-[80%_20%_80%_20%] bg-[#EC4D97]/20" />
      <BusinessShowpiece />

      <div className="relative z-10 flex justify-center">
        <LoginBrand storeName={storeName} logoUrl={logoUrl} />
      </div>

      <div className="relative z-10 max-w-[470px]">
        <p className="inline-flex rounded-full border border-white/80 bg-white/75 px-5 py-2 text-sm font-black uppercase text-[#EC4D97] shadow-[0_12px_28px_rgba(236,77,151,0.10)] backdrop-blur">
          <Sparkles size={15} className="mr-2" />
          {t('auth.welcomeTo', { storeName })}
        </p>
        <h1 className="mt-7 text-5xl font-black leading-[1.08] tracking-tight text-[#1A1A1A] xl:text-[3.35rem]">
          {t('auth.heroTitleBefore')} <span className="text-[#EC4D97]">{t('auth.heroTitleHighlight')}</span> {t('auth.heroTitleAfter')}
        </h1>
        <p className="mt-6 max-w-sm text-base font-semibold leading-8 text-[#6B7280]">
          {t('auth.heroDescription')}
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

function validateRegisterForm(form, t) {
  const errors = {}
  const email = form.email.trim().toLowerCase()
  if (!form.full_name.trim()) errors.full_name = t('auth.validationNameRequired')
  if (!email) errors.email = t('auth.validationEmailRequired')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t('auth.validationEmailInvalid')
  if (!form.password) errors.password = t('auth.validationPasswordRequired')
  else if (form.password.length < 8) errors.password = t('auth.validationPasswordLength')
  else if (!/[A-Z]/.test(form.password)) errors.password = t('auth.validationPasswordUpper')
  else if (!/[a-z]/.test(form.password)) errors.password = t('auth.validationPasswordLower')
  else if (!/\d/.test(form.password)) errors.password = t('auth.validationPasswordNumber')
  if (!form.confirm_password) errors.confirm_password = t('auth.validationConfirmRequired')
  else if (form.password !== form.confirm_password) errors.confirm_password = t('auth.validationPasswordMismatch')
  if (!form.terms) errors.terms = t('auth.validationTermsRequired')
  return errors
}

function flattenApiError(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flattenApiError).filter(Boolean).join(' ')
  if (typeof value === 'object') return Object.values(value).map(flattenApiError).filter(Boolean).join(' ')
  return String(value)
}

function translateAuthError(message, t, fallbackKey = 'auth.errorMessage') {
  const raw = flattenApiError(message).trim()
  const normalized = raw.toLowerCase()

  if (!raw) return t(fallbackKey)
  if (normalized.includes('no active account found')) return t('auth.noActiveAccount')
  if (normalized.includes('unable to log in with provided credentials')) return t('auth.noActiveAccount')
  if (normalized.includes('invalid credentials')) return t('auth.invalidCredentials')
  if (normalized.includes('email') && (normalized.includes('already') || normalized.includes('exists'))) return t('auth.emailAlreadyExists')
  if (normalized.includes('username') && (normalized.includes('already') || normalized.includes('exists'))) return t('auth.accountAlreadyExists')
  if (normalized.includes('password') && normalized.includes('too common')) return t('auth.passwordTooCommon')
  if (normalized.includes('password') && normalized.includes('too similar')) return t('auth.passwordTooSimilar')
  if (normalized.includes('password') && normalized.includes('entirely numeric')) return t('auth.passwordEntirelyNumeric')
  if (normalized.includes('password') && normalized.includes('too short')) return t('auth.validationPasswordLength')

  return raw
}

function NoticePopup({ notice, t, onClose }) {
  const isError = notice.type === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2

  return (
    <div className="absolute left-5 right-5 top-20 z-30 lg:left-12 lg:right-12" role="alert" aria-live="assertive">
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_20px_42px_rgba(17,24,39,0.12)]',
          isError ? 'border-red-100' : 'border-emerald-100'
        )}
      >
        <span
          className={cn(
            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white',
            isError ? 'bg-[#EF4444]' : 'bg-[#22C55E]'
          )}
        >
          <Icon size={21} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-bold', isError ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
            {notice.title}
          </p>
          <p className="mt-1 text-sm font-normal leading-5 text-[#6B7280]">
            {notice.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#6B7280] transition hover:bg-gray-50 hover:text-[#EC4D97] focus:outline-none focus:ring-4 focus:ring-gray-100"
          aria-label={t('verifyEmail.closeMessage')}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, googleLogin, telegramLogin, isAuthenticated, user } = useAuthStore()
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState(location.state?.mode === 'register' ? 'register' : 'login')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [telegramOpen, setTelegramOpen] = useState(false)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [lf, setLf] = useState({ username: '', password: '' })
  const [rf, setRf] = useState({ full_name: '', phone: '', email: '', password: '', confirm_password: '', terms: true })
  const [registerErrors, setRegisterErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const telegramWidgetRef = useRef(null)
  const showError = (message, title = t('auth.errorTitle')) => setNotice({ type: 'error', title, message })
  const sl = (k, v) => {
    setLf((f) => ({ ...f, [k]: v }))
    setNotice(null)
  }
  const sr = (k, v) => {
    setRf((f) => ({ ...f, [k]: v }))
    setRegisterErrors((errors) => ({ ...errors, [k]: '' }))
    setNotice(null)
  }

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: telegramConfig } = useQuery({
    queryKey: ['telegram-login-config'],
    queryFn: () => authApi.telegramConfig().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })

  const { data: googleConfig } = useQuery({
    queryKey: ['google-login-config'],
    queryFn: () => authApi.googleConfig().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  })

  const storeName = siteSettings?.store_name || 'Shadow Shop'
  const loginLogoUrl = siteSettings?.login_logo_url || siteSettings?.logo_url || ''
  const telegramBotUsername = telegramConfig?.bot_username || ''
  const telegramLoginEnabled = Boolean(telegramConfig?.configured && telegramBotUsername)
  const googleClientId = googleConfig?.client_id || ''
  const googleLoginEnabled = Boolean(googleConfig?.configured && googleClientId)
  const isKhmer = i18n.language?.startsWith('km')
  const authFontFamily = isKhmer ? '"Khmer OS Battambang", "Khmer OS", "Noto Sans Khmer", sans-serif' : undefined

  const handleGoogleCredential = useCallback(async ({ credential }) => {
    if (!credential) {
      showError(t('auth.googleCredentialMissing'))
      setGoogleLoading(false)
      return
    }

    setGoogleLoading(true)
    try {
      const loggedInUser = await googleLogin({ credential })
      toast.success(t('auth.welcomeUser', { name: loggedInUser.first_name || loggedInUser.username }))
    } catch (err) {
      showError(translateAuthError(err.response?.data, t, 'auth.googleLoginFailed'))
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLogin, t])

  useEffect(() => {
    const preconnectHosts = ['https://accounts.google.com', 'https://telegram.org']
    preconnectHosts.forEach((href) => {
      if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = href
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  }, [])

  useEffect(() => {
    if (!googleLoginEnabled) return
    loadGoogleIdentityScript().catch(() => {})
  }, [googleLoginEnabled])

  useEffect(() => {
    if (!googleLoginEnabled || !googleClientId) return undefined

    let cancelled = false
    const initGoogle = async () => {
      try {
        await loadGoogleIdentityScript()
        if (cancelled || !window.google?.accounts?.id) return
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
        })
      } catch {
        if (!cancelled) showError(t('auth.googleLoadFailed'))
      }
    }

    initGoogle()
    return () => {
      cancelled = true
    }
  }, [googleLoginEnabled, googleClientId, handleGoogleCredential, t])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('signout') === '1') {
      toast.success(t('auth.signedOut'))
      window.history.replaceState({}, '', `${window.location.pathname}`)
    }
  }, [t])

  useEffect(() => {
    if (!isAuthenticated) return
    const from = location.state?.from
    if (user?.role === 'customer') {
      navigate(isSocialProfileIncomplete(user) ? '/profile/complete' : (from || '/'), { replace: true })
    }
    else navigate(from?.startsWith('/admin') ? from : '/admin', { replace: true })
  }, [isAuthenticated, user, navigate, location.state?.from])

  useEffect(() => {
    if (!telegramOpen || !telegramLoginEnabled || !telegramWidgetRef.current) return

    const callbackName = 'shadowShopTelegramAuth'
    window[callbackName] = async (telegramUser) => {
      setTelegramLoading(true)
      try {
        const loggedInUser = await telegramLogin(telegramUser)
        toast.success(t('auth.welcomeUser', { name: loggedInUser.first_name || loggedInUser.username }))
        setTelegramOpen(false)
      } catch (err) {
        showError(translateAuthError(err.response?.data, t, 'auth.telegramLoginFailed'))
      } finally {
        setTelegramLoading(false)
      }
    }

    telegramWidgetRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', telegramBotUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', `${callbackName}(user)`)
    telegramWidgetRef.current.appendChild(script)

    return () => {
      if (window[callbackName]) delete window[callbackName]
    }
  }, [telegramOpen, telegramLoginEnabled, telegramBotUsername, telegramLogin, t])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!lf.username || !lf.password) return showError(t('auth.pleaseFillAllFields'))
    setLoading(true)
    try {
      const u = await login(lf)
      toast.success(t('auth.welcomeBackUser', { name: u.first_name || u.username }))
    } catch (err) {
      showError(translateAuthError(err.response?.data, t, 'auth.invalidCredentials'))
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const { full_name, email, password, confirm_password, terms } = rf
    const cleanEmail = email.trim().toLowerCase()
    const errors = validateRegisterForm(rf, t)
    setRegisterErrors(errors)
    if (Object.keys(errors).length) {
      showError(Object.values(errors)[0])
      return
    }
    const [firstName, ...rest] = full_name.trim().split(/\s+/)
    setLoading(true)
    try {
      await register({ username: cleanEmail, email: cleanEmail, phone: '', first_name: firstName || '', last_name: rest.join(' '), password, confirm_password })
      toast.success(t('auth.verificationCodeSent'))
      navigate('/verify-email', { state: { email: cleanEmail, from: location.state?.from || '/' } })
    } catch (err) {
      const d = err.response?.data
      showError(translateAuthError(d, t, 'auth.registrationFailed'))
    } finally { setLoading(false) }
  }

  const openGoogleLogin = async () => {
    if (!googleLoginEnabled) {
      showError(t('auth.googleNotConfigured'))
      return
    }

    setGoogleLoading(true)
    try {
      await loadGoogleIdentityScript()
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.prompt((notification) => {
        const skipped = notification.isNotDisplayed?.()
          || notification.isSkippedMoment?.()
          || notification.isDismissedMoment?.()
        if (!skipped) return
        setGoogleLoading(false)
        if (notification.isNotDisplayed?.()) {
          showError(t('auth.googleLoadFailed'))
        }
      })
    } catch {
      setGoogleLoading(false)
      showError(t('auth.googleLoadFailed'))
    }
  }

  const openTelegramLogin = () => {
    if (!telegramLoginEnabled) {
      showError(t('auth.telegramNotConfigured'))
      return
    }
    setTelegramOpen(true)
  }

  const EyeToggle = ({ show, toggle }) => (
    <button type="button" onClick={toggle} className="shrink-0 text-gray-300 hover:text-gray-500 transition">
      {show ? <Eye size={17} /> : <EyeOff size={17} />}
    </button>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-white font-sans text-[#1A1A1A] lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10" style={{ fontFamily: authFontFamily }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col bg-white lg:min-h-[820px] lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:overflow-hidden lg:rounded-[32px] lg:border lg:border-gray-200 lg:shadow-[0_24px_70px_rgba(17,24,39,0.08)]">

      {/* ── Left ── */}
      <AuthVisualPanel storeName={storeName} logoUrl={loginLogoUrl} t={t} />

      {/* ── Right ── */}
      <div className="relative flex flex-col bg-white lg:min-h-[820px]">

        {/* Top bar — all screens */}
        <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] sm:px-5 lg:justify-end lg:px-12 lg:py-8">
          <button onClick={() => navigate('/')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#FFF4F8] hover:text-[#EC4D97] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10 lg:hidden">
            <ChevronLeft size={24} strokeWidth={2.4} />
          </button>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hidden h-12 shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-6 text-sm font-bold text-[#1A1A1A] shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 lg:flex"
            >
              {t('auth.continueAsGuest')}
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
            <LanguagePicker />
            <button className="hidden h-12 items-center gap-2 rounded-full border border-[#F8A9D0] px-5 text-sm font-bold text-[#EC4D97] shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 sm:flex">
              <Headphones size={14} /> {t('auth.contactUs')}
            </button>
          </div>
        </div>

        {notice && (
          <NoticePopup
            notice={notice}
            t={t}
            onClose={() => setNotice(null)}
          />
        )}

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-5 py-6 lg:px-14 lg:pb-14 lg:pt-4 xl:px-16">
          <div className="w-full max-w-[470px]">
            {/* Card */}
            <div className="bg-white px-0 py-5 shadow-none lg:border-0 lg:px-0 lg:py-0 lg:shadow-none">
              {mode === 'login' ? (
                <form onSubmit={handleLogin}>
                  <div className="mb-5 flex flex-col items-center lg:hidden">
                    {loginLogoUrl ? (
                      <img src={loginLogoUrl} alt={storeName} className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
                    ) : (
                      <ShopLogo storeName={storeName} scale={0.9} />
                    )}
                  </div>

                  <div className="mb-7 text-center lg:text-left">
                    <h2 className="text-[2.15rem] font-bold leading-tight tracking-tight text-[#1A1A1A]">{t('auth.welcome')}</h2>
                    <p className="mt-2 text-base font-normal text-[#6B7280]">{t('auth.loginSubtitle')}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-[#1A1A1A]">{t('auth.email')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2DCE7] bg-white px-4 transition focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[#EC4D97]/10">
                        <Mail size={18} color="#EC4D97" strokeWidth={1.9} className="shrink-0" />
                        <input type="text" value={lf.username} onChange={(e) => sl('username', e.target.value)}
                          placeholder={t('auth.emailPlaceholder')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#1A1A1A] outline-none placeholder:text-[#A7B0C2]" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-[#1A1A1A]">{t('auth.password')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2DCE7] bg-white px-4 transition focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[#EC4D97]/10">
                        <Lock size={18} color="#EC4D97" strokeWidth={1.9} className="shrink-0" />
                        <input type={showPass ? 'text' : 'password'} value={lf.password}
                          onChange={(e) => sl('password', e.target.value)}
                          placeholder={t('auth.passwordPlaceholder')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#1A1A1A] outline-none placeholder:text-[#A7B0C2]" />
                        <EyeToggle show={showPass} toggle={() => setShowPass((s) => !s)} />
                      </div>
                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-bold text-[#EC4D97] transition hover:text-[#E53888] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10">
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#EC197A] text-base font-bold text-white shadow-[0_15px_35px_rgba(236,25,122,0.28)] transition hover:scale-[1.02] hover:bg-[#D9166F] focus:outline-none focus:ring-4 focus:ring-[#EC197A]/20 active:scale-[0.99] disabled:scale-100 disabled:opacity-60">
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>{t('auth.login')} <ChevronRight size={17} strokeWidth={2.5} /></>}
                    </button>

                    <div className="flex items-center gap-3 py-0.5">
                      <div className="h-px flex-1 bg-[#E2E7F0]" />
                      <span className="text-sm font-black uppercase text-[#B2BAC9]">{t('common.or')}</span>
                      <div className="h-px flex-1 bg-[#E2E7F0]" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={openGoogleLogin}
                        disabled={googleLoading || !googleLoginEnabled}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#F2DCE7] bg-white text-sm font-bold text-[#1A1A1A] transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-60"
                      >
                        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <GoogleMark size={18} />}
                        {t('auth.google')}
                      </button>

                      <button type="button"
                        onClick={openTelegramLogin}
                        disabled={telegramLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#F2DCE7] bg-white text-sm font-bold text-[#1A1A1A] transition hover:-translate-y-0.5 hover:border-[#7ED7FF] hover:bg-sky-50/40 focus:outline-none focus:ring-4 focus:ring-[#7ED7FF]/20 disabled:opacity-60">
                        {telegramLoading ? <Loader2 size={18} className="animate-spin text-sky-500" /> : <Send size={18} color="#2AABEE" fill="#2AABEE" />}
                        {t('auth.telegram')}
                      </button>
                    </div>

                    <p className="pt-2 text-center text-sm font-normal text-[#6B7280]">
                      {t('auth.noAccount')}{' '}
                      <button type="button" onClick={() => { setNotice(null); setMode('register') }}
                        className="font-bold text-[#EC4D97] transition hover:text-[#E53888] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10">
                        {t('auth.signUp')}
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} noValidate>
                  <div className="mb-6 text-center lg:text-left">
                    <h2 className="text-[2.15rem] font-bold leading-tight tracking-tight text-[#1A1A1A]">{t('auth.createAccount')}</h2>
                    <p className="mt-2 text-base font-normal text-[#6B7280]">{t('auth.createAccountSubtitle')}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label htmlFor="register-name" className="mb-2 block text-sm font-bold text-[#1A1A1A]">{t('auth.fullName')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2DCE7] bg-white px-4 transition focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[#EC4D97]/10">
                        <User size={18} color="#EC4D97" strokeWidth={1.9} className="shrink-0" />
                        <input id="register-name" type="text" value={rf.full_name} onChange={(e) => sr('full_name', e.target.value)}
                          autoComplete="name"
                          aria-invalid={Boolean(registerErrors.full_name)}
                          aria-describedby={registerErrors.full_name ? 'register-name-error' : undefined}
                          placeholder={t('auth.fullNamePlaceholder')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#1A1A1A] outline-none placeholder:text-[#A7B0C2]" />
                      </div>
                      {registerErrors.full_name && <p id="register-name-error" className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.full_name}</p>}
                    </div>

                    {/* Phone */}
                    <div className="hidden">
                      <label className="block text-sm font-semibold text-gray-800 mb-1.5">{t('auth.phoneNumber')}</label>
                      <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden transition focus-within:border-[#E91E63]/50 focus-within:ring-2 focus-within:ring-[#E91E63]/10"
                        style={{ height: 52 }}>
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <Phone size={16} color="#E91E63" strokeWidth={1.8} className="shrink-0" />
                          <input
                            type="tel"
                            inputMode="numeric"
                            value={rf.phone}
                            onChange={(e) => sr('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder={t('common.phonePlaceholder')}
                            className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="register-email" className="mb-2 block text-sm font-bold text-[#1A1A1A]">{t('auth.email')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2DCE7] bg-white px-4 transition focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[#EC4D97]/10">
                        <Mail size={18} color="#EC4D97" strokeWidth={1.9} className="shrink-0" />
                        <input id="register-email" type="email" value={rf.email} onChange={(e) => sr('email', e.target.value)}
                          autoComplete="email"
                          aria-invalid={Boolean(registerErrors.email)}
                          aria-describedby={registerErrors.email ? 'register-email-error' : undefined}
                          placeholder={t('auth.emailExample')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#1A1A1A] outline-none placeholder:text-[#A7B0C2]" />
                      </div>
                      {registerErrors.email && <p id="register-email-error" className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.email}</p>}
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="register-password" className="mb-2 block text-sm font-bold text-[#1A1A1A]">{t('auth.password')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2DCE7] bg-white px-4 transition focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[#EC4D97]/10">
                        <Lock size={18} color="#EC4D97" strokeWidth={1.9} className="shrink-0" />
                        <input id="register-password" type={showPass ? 'text' : 'password'} value={rf.password}
                          autoComplete="new-password"
                          aria-invalid={Boolean(registerErrors.password)}
                          aria-describedby={registerErrors.password ? 'register-password-error' : 'register-password-help'}
                          onChange={(e) => sr('password', e.target.value)} placeholder={t('auth.passwordPlaceholder')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#1A1A1A] outline-none placeholder:text-[#A7B0C2]" />
                        <EyeToggle show={showPass} toggle={() => setShowPass((s) => !s)} />
                      </div>
                      {registerErrors.password ? (
                        <p id="register-password-error" className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.password}</p>
                      ) : (
                        <p id="register-password-help" className="mt-1.5 text-xs font-medium text-[#6B7280]">{t('auth.passwordHelp')}</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="register-confirm-password" className="mb-2 block text-sm font-bold text-[#1A1A1A]">{t('auth.confirmPassword')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2DCE7] bg-white px-4 transition focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[#EC4D97]/10">
                        <Lock size={18} color="#EC4D97" strokeWidth={1.9} className="shrink-0" />
                        <input id="register-confirm-password" type={showConfirm ? 'text' : 'password'} value={rf.confirm_password}
                          autoComplete="new-password"
                          aria-invalid={Boolean(registerErrors.confirm_password)}
                          aria-describedby={registerErrors.confirm_password ? 'register-confirm-password-error' : undefined}
                          onChange={(e) => sr('confirm_password', e.target.value)} placeholder={t('auth.confirmPassword')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[#1A1A1A] outline-none placeholder:text-[#A7B0C2]" />
                        <EyeToggle show={showConfirm} toggle={() => setShowConfirm((s) => !s)} />
                      </div>
                      {registerErrors.confirm_password && <p id="register-confirm-password-error" className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.confirm_password}</p>}
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={rf.terms}
                        onChange={(e) => sr('terms', e.target.checked)}
                        className="h-5 w-5 rounded accent-[#E91E63] shrink-0 cursor-pointer"
                      />
                      <span className="text-sm font-normal leading-relaxed text-[#6B7280]">
                        {t('auth.agreeWith')} <span className="font-bold text-[#1A1A1A] underline decoration-[#EC4D97]/35 underline-offset-2">{t('auth.termsCondition')}</span>
                      </span>
                    </label>
                    {registerErrors.terms && <p className="-mt-2 text-xs font-bold text-red-500">{registerErrors.terms}</p>}

                    <button type="submit" disabled={loading}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#EC197A] text-base font-bold text-white shadow-[0_15px_35px_rgba(236,25,122,0.28)] transition hover:scale-[1.02] hover:bg-[#D9166F] focus:outline-none focus:ring-4 focus:ring-[#EC197A]/20 active:scale-[0.99] disabled:cursor-wait disabled:scale-100 disabled:opacity-75">
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>{t('auth.createAccount')} <ChevronRight size={17} strokeWidth={2.5} /></>}
                    </button>

                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-[#E2E7F0]" />
                      <span className="text-sm font-black uppercase text-[#B2BAC9]">{t('common.or')}</span>
                      <div className="h-px flex-1 bg-[#E2E7F0]" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={openGoogleLogin}
                        disabled={googleLoading || !googleLoginEnabled}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#F2DCE7] bg-white text-sm font-bold text-[#1A1A1A] transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-60"
                      >
                        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <GoogleMark size={18} />}
                        {t('auth.google')}
                      </button>

                      <button type="button"
                        onClick={openTelegramLogin}
                        disabled={telegramLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#F2DCE7] bg-white text-sm font-bold text-[#1A1A1A] transition hover:-translate-y-0.5 hover:border-[#7ED7FF] hover:bg-sky-50/40 focus:outline-none focus:ring-4 focus:ring-[#7ED7FF]/20 disabled:opacity-60">
                        {telegramLoading ? <Loader2 size={18} className="animate-spin text-sky-500" /> : <Send size={18} color="#2AABEE" fill="#2AABEE" />}
                        {t('auth.telegram')}
                      </button>
                    </div>

                    <p className="pt-2 text-center text-sm font-normal text-[#6B7280]">
                      {t('auth.haveAccount')}{' '}
                      <button type="button" onClick={() => { setNotice(null); setMode('login') }}
                        className="font-bold text-[#EC4D97] transition hover:text-[#E53888] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10">{t('auth.logIn')}</button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {telegramOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FFF4F8]/80 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[28px] border border-[#F0D9E6] bg-white p-6 text-center shadow-[0_30px_80px_rgba(236,77,151,0.16)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
              <Send size={24} fill="#2AABEE" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-[#1A1A1A]">{t('auth.continueWithTelegram')}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              {t('auth.approveTelegramLogin')}
            </p>
            <div className="mt-5 flex min-h-[48px] items-center justify-center rounded-2xl border border-[#F0D9E6] bg-[#FFF9FC] px-3 py-4">
              {telegramLoginEnabled ? (
                <div ref={telegramWidgetRef} className="flex justify-center" />
              ) : (
                <p className="text-sm font-bold text-red-500">{t('auth.telegramNotConfiguredShort')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTelegramOpen(false)}
              className="mt-4 h-11 w-full rounded-2xl border border-[#F0D9E6] bg-white text-sm font-bold text-[#6B7280] transition hover:bg-[#FFF4F8] hover:text-[#EC4D97] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
