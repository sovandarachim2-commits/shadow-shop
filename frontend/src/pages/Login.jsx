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
      // Script tag already in DOM — load may have already fired.
      if (existing.dataset.loaded === '1' || window.google?.accounts?.id) {
        if (window.google?.accounts?.id) resolve()
        else reject(new Error('Google Identity script loaded without API'))
        return
      }

      let settled = false
      const done = (ok, error) => {
        if (settled) return
        settled = true
        window.clearInterval(poll)
        if (ok) resolve()
        else reject(error || new Error('Google Identity script failed'))
      }

      existing.addEventListener('load', () => {
        existing.dataset.loaded = '1'
        if (window.google?.accounts?.id) done(true)
        else done(false, new Error('Google Identity API unavailable'))
      }, { once: true })
      existing.addEventListener('error', () => done(false, new Error('Google Identity script failed')), { once: true })

      let tries = 0
      const poll = window.setInterval(() => {
        tries += 1
        if (window.google?.accounts?.id) {
          existing.dataset.loaded = '1'
          done(true)
        } else if (tries >= 40) {
          done(false, new Error('Google Identity script timed out'))
        }
      }, 50)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      script.dataset.loaded = '1'
      if (window.google?.accounts?.id) resolve()
      else reject(new Error('Google Identity API unavailable'))
    }
    script.onerror = () => reject(new Error('Google Identity script failed'))
    document.head.appendChild(script)
  })
}

function triggerGoogleButtonFallback() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      reject(new Error('Google Identity API unavailable'))
      return
    }

    const host = document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none'
    document.body.appendChild(host)

    try {
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 280,
      })
    } catch (error) {
      host.remove()
      reject(error)
      return
    }

    window.setTimeout(() => {
      const btn = host.querySelector('div[role="button"]')
      if (!btn) {
        host.remove()
        reject(new Error('Google button failed to render'))
        return
      }
      btn.click()
      window.setTimeout(() => host.remove(), 2500)
      resolve()
    }, 60)
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
  {
    code: 'en',
    label: 'English',
    short: 'US',
    flag: 'https://flagcdn.com/us.svg',
  },
  {
    code: 'km',
    label: 'ខ្មែរ',
    short: 'KH',
    flag: 'https://flagcdn.com/kh.svg',
  },
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
        <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 shadow-sm">
          <img
            src={cur.flag}
            alt={cur.label}
            className="h-full w-full object-cover"
          />
        </div>
        <span className="text-sm font-black">{cur.label}</span>
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
              <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 shadow-sm">
                <img
                  src={l.flag}
                  alt={l.label}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className={`flex-1 text-left text-sm font-black ${l.code === current ? 'text-[#EC4D97]' : 'text-[#1A1A1A]'}`}>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LoginBrand({ storeName, logoUrl }) {
  return (
    <div className="flex flex-col items-start">
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className="h-16 w-16 object-contain" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#FF6CAB] to-[#EC4D97] text-2xl font-black text-white shadow-lg">
          S
        </div>
      )}
      <div className="mt-4 text-left">
        <p className="text-[18px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]">{(storeName || 'Shadow Shop').split(' ')[0]}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#EC4D97]">{(storeName || 'Shadow Shop').split(' ').slice(1).join(' ') || 'SHOP'}</p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────
   MAIN
────────────────────────────────────────────────── */
function AuthVisualPanel({ storeName, logoUrl, t }) {
  const featureCards = [
    { icon: ClipboardList, title: t('auth.featureOrders'), text: t('auth.featureOrdersText') },
    { icon: BarChart3, title: t('auth.featureReports'), text: t('auth.featureReportsText') },
    { icon: PackageCheck, title: t('auth.featureInventory'), text: t('auth.featureInventoryText') },
  ]

  return (
    <aside className="relative hidden overflow-hidden bg-[#FFF5FA] p-10 text-[#1A1A1A] lg:flex lg:min-h-[760px] lg:flex-col lg:justify-between xl:min-h-[820px] xl:p-14">
      {/* Decorative backgrounds */}
      <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#FFE6F2] blur-[100px]" />
      
      <div className="relative z-10 flex justify-start">
        <LoginBrand storeName={storeName} logoUrl={logoUrl} />
      </div>

      <div className="relative z-10 max-w-[480px] mt-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-[#EC4D97] shadow-sm border border-[#F0D9E6]/50">
          <Sparkles size={12} />
          {t('auth.welcomeTo', { storeName })}
        </div>
        <h1 className="mt-8 text-[3.5rem] font-black leading-[1.05] tracking-tight text-[#1A1A1A]">
          {t('auth.heroTitleBefore')} <span className="relative z-20 text-[#EC4D97]">{t('auth.heroTitleHighlight')}</span> {t('auth.heroTitleAfter')}
        </h1>
        <p className="mt-8 max-w-[360px] text-[18px] font-medium leading-relaxed text-[#64748B]">
          {t('auth.heroDescription')}
        </p>
      </div>

      <div className="relative z-10 space-y-4">
        <div className="grid grid-cols-1 gap-4 max-w-[440px]">
          {featureCards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="group flex items-center gap-5 rounded-[28px] border border-white/80 bg-white/60 p-5 shadow-[0_10px_40px_rgba(236,77,151,0.04)] backdrop-blur-md transition-all duration-300 hover:bg-white hover:shadow-[0_20px_50px_rgba(236,77,151,0.08)]">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-[#FFF4F8] text-[#EC4D97] shadow-sm transition-transform group-hover:scale-110">
                <Icon size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[16px] font-black text-[#1A1A1A]">{title}</p>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-[#94A3B8]">{text}</p>
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
  
  // Login failures
  if (normalized.includes('no active account found') || 
      normalized.includes('unable to log in') || 
      normalized.includes('invalid credentials')) {
    return t('auth.noActiveAccount')
  }

  // Registration specific errors
  if (normalized.includes('email') && (normalized.includes('already') || normalized.includes('exists') || normalized.includes('taken'))) {
    return t('auth.emailAlreadyExists')
  }
  if (normalized.includes('username') && (normalized.includes('already') || normalized.includes('exists') || normalized.includes('taken'))) {
    return t('auth.accountAlreadyExists')
  }

  if (normalized.includes('password') && normalized.includes('too common')) return t('auth.passwordTooCommon')
  if (normalized.includes('password') && normalized.includes('too similar')) return t('auth.passwordTooSimilar')
  if (normalized.includes('password') && normalized.includes('entirely numeric')) return t('auth.passwordEntirelyNumeric')
  if (normalized.includes('password') && normalized.includes('too short')) return t('auth.validationPasswordLength')

  return raw
}

function NoticePopup({ notice, t, onClose }) {
  const isError = notice.type === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2
  const messages = Array.isArray(notice.message) ? notice.message : [notice.message]

  return (
    <div className="absolute left-6 right-6 top-24 z-30 lg:left-14 lg:right-14" role="alert" aria-live="assertive">
      <div
        className={cn(
          'flex items-start gap-3 rounded-[20px] border bg-white p-4 shadow-[0_15px_40px_rgba(0,0,0,0.06)]',
          isError ? 'border-red-50' : 'border-emerald-50'
        )}
      >
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5',
            isError ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'
          )}
        >
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1 pt-1.5">
          {messages.length === 1 ? (
            <p className="text-[13px] font-bold text-[#1A1A1A]">
              {messages[0]}
            </p>
          ) : (
            <ul className="space-y-1">
              {messages.map((m, i) => (
                <li key={i} className="text-[13px] font-bold text-[#1A1A1A] flex items-start gap-2">
                  <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", isError ? "bg-red-400" : "bg-emerald-400")} />
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#94A3B8] transition hover:bg-gray-50 hover:text-[#EC4D97]"
          aria-label={t('verifyEmail.closeMessage')}
        >
          <X size={16} />
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
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('mode') === 'register') return 'register'
    return location.state?.mode === 'register' ? 'register' : 'login'
  })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [telegramOpen, setTelegramOpen] = useState(false)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [lf, setLf] = useState({ username: '', password: '' })
  const [rf, setRf] = useState({ 
    full_name: '', 
    phone: '', 
    email: '', 
    password: '', 
    confirm_password: '', 
    terms: true,
    referral_code: new URLSearchParams(location.search).get('ref') || ''
  })
  const [registerErrors, setRegisterErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const telegramWidgetRef = useRef(null)
  const googleIdentityInitRef = useRef(null)
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

  const { data: googleConfig, isLoading: googleConfigLoading, isError: googleConfigError, refetch: refetchGoogleConfig } = useQuery({
    queryKey: ['google-login-config'],
    queryFn: () => authApi.googleConfig().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    retry: 2,
  })

  const storeName = siteSettings?.store_name || 'Shadow Shop'
  const loginLogoUrl = siteSettings?.login_logo_url || siteSettings?.logo_url || ''
  const telegramBotUsername = telegramConfig?.bot_username || ''
  const telegramLoginEnabled = Boolean(telegramConfig?.configured && telegramBotUsername)
  const googleClientId = googleConfig?.client_id || ''
  const googleLoginEnabled = Boolean(googleConfig?.configured && googleClientId)
  const isKhmer = i18n.language?.startsWith('km')
  const authFontFamily = isKhmer ? '"Noto Sans Khmer", "Khmer OS Battambang", "Khmer OS", sans-serif' : undefined
  const authTitleClass = cn(
    'text-[2.15rem] font-bold text-[#1A1A1A]',
    isKhmer ? 'leading-[1.55] tracking-normal' : 'leading-tight tracking-tight'
  )

  const handleGoogleCredential = useCallback(async (response) => {
    const credential = typeof response === 'string' ? response : response?.credential
    if (!credential) {
      showError(t('auth.googleCredentialMissing'))
      setGoogleLoading(false)
      return
    }

    setGoogleLoading(true)
    try {
      const loggedInUser = await googleLogin({ 
        credential,
        referral_code: rf.referral_code 
      })
      if (!loggedInUser) {
        showError(t('auth.googleLoginFailed'))
        return
      }
      toast.success(t('auth.welcomeUser', { name: loggedInUser.first_name || loggedInUser.username || 'Google' }))
    } catch (err) {
      const message = translateAuthError(err?.response?.data || err?.message, t, 'auth.googleLoginFailed')
      showError(message || t('auth.googleLoginFailed'))
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLogin, t])

  const initializeGoogleIdentity = useCallback(async () => {
    await loadGoogleIdentityScript()
    if (!window.google?.accounts?.id) {
      throw new Error('Google Identity API unavailable')
    }

    const currentInit = googleIdentityInitRef.current
    if (currentInit?.clientId === googleClientId && currentInit?.callback === handleGoogleCredential) {
      return
    }

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
    })
    googleIdentityInitRef.current = { clientId: googleClientId, callback: handleGoogleCredential }
  }, [googleClientId, handleGoogleCredential])

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
        if (cancelled) return
        await initializeGoogleIdentity()
      } catch {
        // Soft fail — button click will retry / show a clear error
      }
    }

    initGoogle()
    return () => {
      cancelled = true
    }
  }, [googleLoginEnabled, googleClientId, initializeGoogleIdentity])

  useEffect(() => {
    setNotice(null)
    setRegisterErrors({})
  }, [mode])

  useEffect(() => {
    if (location.state?.mode) {
      setMode(location.state.mode)
    }
  }, [location.state?.mode])

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
        const loggedInUser = await telegramLogin({
          ...telegramUser,
          referral_code: rf.referral_code
        })
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
    setNotice(null)
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
    setNotice(null)
    const { full_name, email, password, confirm_password, terms } = rf
    const cleanEmail = email.trim().toLowerCase()
    const errors = validateRegisterForm(rf, t)
    setRegisterErrors(errors)
    if (Object.keys(errors).length) {
      showError(Object.values(errors))
      return
    }
    const [firstName, ...rest] = full_name.trim().split(/\s+/)
    setLoading(true)
    try {
      await register({ 
        email: cleanEmail, 
        phone: '', 
        first_name: firstName || '', 
        last_name: rest.join(' '), 
        password, 
        confirm_password,
        referral_code: rf.referral_code 
      })
      toast.success(t('auth.verificationCodeSent'))
      navigate('/verify-email', { state: { email: cleanEmail, from: location.state?.from || '/' } })
    } catch (err) {
      const d = err.response?.data
      showError(translateAuthError(d, t, 'auth.registrationFailed'))
    } finally { setLoading(false) }
  }

  const openGoogleLogin = async () => {
    setNotice(null)
    if (googleConfigLoading) {
      showError(t('checkout.pleaseWait'))
      return
    }
    if (googleConfigError) {
      try {
        await refetchGoogleConfig()
      } catch {
        showError(t('auth.googleLoadFailed'))
        return
      }
    }
    if (!googleLoginEnabled || !googleClientId) {
      showError(t('auth.googleNotConfigured'))
      return
    }

    setGoogleLoading(true)
    try {
      await initializeGoogleIdentity()

      let settled = false
      const finishIfIdle = () => {
        if (settled) return
        settled = true
        setGoogleLoading(false)
      }

      window.google.accounts.id.prompt(async (notification) => {
        const dismissedReason = notification.getDismissedReason?.() || ''
        if (notification.isDismissedMoment?.() && dismissedReason === 'credential_returned') {
          // Credential is delivered via callback — keep loading until login finishes
          return
        }

        if (notification.isDismissedMoment?.()) {
          // User closed One Tap — no error
          finishIfIdle()
          return
        }

        const blocked = notification.isNotDisplayed?.() || notification.isSkippedMoment?.()
        if (!blocked) return

        try {
          await triggerGoogleButtonFallback()
          // Keep spinner briefly; callback or user cancel will clear it
          window.setTimeout(() => {
            if (!settled) finishIfIdle()
          }, 8000)
        } catch {
          finishIfIdle()
          showError(t('auth.googleLoadFailed'))
        }
      })
    } catch {
      setGoogleLoading(false)
      showError(t('auth.googleLoadFailed'))
    }
  }

  const openTelegramLogin = () => {
    setNotice(null)
    if (!telegramLoginEnabled) {
      showError(t('auth.telegramNotConfigured'))
      return
    }
    setTelegramOpen(true)
  }

  const EyeToggle = ({ show, toggle }) => (
    <button type="button" onClick={toggle} className="shrink-0 text-[#94A3B8] hover:text-[#EC4D97] transition">
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
                  <div className="mb-6 flex flex-col items-center lg:hidden">
                    {loginLogoUrl ? (
                      <img src={loginLogoUrl} alt={storeName} className="h-14 w-14 object-contain" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#FF6CAB] to-[#EC4D97] text-2xl font-black text-white shadow-md">
                        S
                      </div>
                    )}
                    <div className="mt-3 text-center">
                      <p className="text-[16px] font-black uppercase tracking-[0.2em] text-[#1A1A1A]">{(storeName || 'Shadow Shop').split(' ')[0]}</p>
                      <p className="text-[9px] font-black uppercase tracking-[0.5em] text-[#EC4D97]">{(storeName || 'Shadow Shop').split(' ').slice(1).join(' ') || 'SHOP'}</p>
                    </div>
                  </div>

                  <div className="mb-7 text-center lg:text-left">
                    <h2 className={authTitleClass}>{t('auth.welcome')}</h2>
                    <p className="mt-2 text-base font-normal text-[#6B7280]">{t('auth.loginSubtitle')}</p>
                  </div>

                    <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-wider text-[#475569]">{t('auth.emailOrUsername')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-[20px] border border-gray-200 bg-gray-50/30 px-5 transition-all duration-300 focus-within:border-[#EC4D97]/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EC4D97]/5">
                        <Mail size={18} className="shrink-0 text-[#64748B]" strokeWidth={2} />
                        <input type="text" value={lf.username} onChange={(e) => sl('username', e.target.value)}
                          placeholder={t('auth.emailOrUsernamePlaceholder')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#334155] outline-none placeholder:font-medium placeholder:text-[#94A3B8]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-[#475569]">{t('auth.password')}</label>
                        <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-bold text-[#EC4D97] transition hover:text-[#E53888]">
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                      <div className="flex h-14 items-center gap-3 rounded-[20px] border border-gray-200 bg-gray-50/30 px-5 transition-all duration-300 focus-within:border-[#EC4D97]/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EC4D97]/5">
                        <Lock size={18} className="shrink-0 text-[#64748B]" strokeWidth={2} />
                        <input type={showPass ? 'text' : 'password'} value={lf.password}
                          onChange={(e) => sl('password', e.target.value)}
                          placeholder={t('auth.passwordPlaceholder')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#334155] outline-none placeholder:font-medium placeholder:text-[#94A3B8]" />
                        <EyeToggle show={showPass} toggle={() => setShowPass((s) => !s)} />
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#EC197A] text-[15px] font-black uppercase tracking-wide text-white shadow-[0_12px_30px_rgba(236,25,122,0.25)] transition-all duration-300 hover:scale-[1.01] hover:bg-[#D9166F] hover:shadow-[0_15px_35px_rgba(236,25,122,0.3)] active:scale-[0.98] disabled:scale-100 disabled:opacity-60">
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>{t('auth.login')} <ChevronRight size={17} strokeWidth={3} /></>}
                    </button>

                    <div className="flex items-center gap-4 py-1">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#CBD5E1]">{t('common.or')}</span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={openGoogleLogin}
                        disabled={googleLoading || googleConfigLoading || (Boolean(googleConfig) && !googleLoginEnabled)}
                        className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-gray-100 bg-white text-sm font-bold text-[#1A1A1A] transition-all duration-300 hover:bg-gray-50 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-60"
                      >
                        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <GoogleMark size={18} />}
                        {t('auth.google')}
                      </button>

                      <button type="button"
                        onClick={openTelegramLogin}
                        disabled={telegramLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-gray-100 bg-white text-sm font-bold text-[#1A1A1A] transition-all duration-300 hover:bg-sky-50/30 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-60">
                        {telegramLoading ? <Loader2 size={18} className="animate-spin text-sky-500" /> : <Send size={18} className="text-[#2AABEE]" fill="#2AABEE" />}
                        {t('auth.telegram')}
                      </button>
                    </div>

                    <p className="pt-2 text-center text-sm font-medium text-[#94A3B8]">
                      {t('auth.noAccount')}{' '}
                      <button type="button" onClick={() => { setNotice(null); setMode('register') }}
                        className="font-black text-[#EC4D97] transition-all hover:text-[#E53888] hover:underline underline-offset-4">
                        {t('auth.register')}
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} noValidate>
                  <div className="mb-6 text-center lg:text-left">
                    <h2 className={authTitleClass}>{t('auth.createAccount')}</h2>
                    <p className="mt-2 text-base font-normal text-[#6B7280]">{t('auth.createAccountSubtitle')}</p>
                  </div>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label htmlFor="register-name" className="mb-2 block text-xs font-black uppercase tracking-wider text-[#475569]">{t('auth.fullName')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-[20px] border border-gray-200 bg-gray-50/30 px-5 transition-all duration-300 focus-within:border-[#EC4D97]/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EC4D97]/5">
                        <User size={18} className="shrink-0 text-[#64748B]" strokeWidth={2} />
                        <input id="register-name" type="text" value={rf.full_name} onChange={(e) => sr('full_name', e.target.value)}
                          autoComplete="name"
                          aria-invalid={Boolean(registerErrors.full_name)}
                          aria-describedby={registerErrors.full_name ? 'register-name-error' : undefined}
                          placeholder={t('auth.fullNamePlaceholder')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#334155] outline-none placeholder:font-medium placeholder:text-[#94A3B8]" />
                      </div>
                      {registerErrors.full_name && <p id="register-name-error" className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.full_name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="register-email" className="mb-2 block text-xs font-black uppercase tracking-wider text-[#475569]">{t('auth.email')}</label>
                      <div className="flex h-14 items-center gap-3 rounded-[20px] border border-gray-200 bg-gray-50/30 px-5 transition-all duration-300 focus-within:border-[#EC4D97]/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EC4D97]/5">
                        <Mail size={18} className="shrink-0 text-[#64748B]" strokeWidth={2} />
                        <input id="register-email" type="email" value={rf.email} onChange={(e) => sr('email', e.target.value)}
                          autoComplete="email"
                          aria-invalid={Boolean(registerErrors.email)}
                          aria-describedby={registerErrors.email ? 'register-email-error' : undefined}
                          placeholder={t('auth.emailExample')}
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#334155] outline-none placeholder:font-medium placeholder:text-[#94A3B8]" />
                      </div>
                      {registerErrors.email && <p id="register-email-error" className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.email}</p>}
                    </div>

                    {/* Password Fields */}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="register-password" className="mb-2 block text-xs font-black uppercase tracking-wider text-[#475569]">{t('auth.password')}</label>
                        <div className="flex h-14 items-center gap-3 rounded-[20px] border border-gray-200 bg-gray-50/30 px-5 transition-all duration-300 focus-within:border-[#EC4D97]/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EC4D97]/5">
                          <Lock size={18} className="shrink-0 text-[#64748B]" strokeWidth={2} />
                          <input id="register-password" type={showPass ? 'text' : 'password'} value={rf.password}
                            autoComplete="new-password"
                            onChange={(e) => sr('password', e.target.value)} placeholder={t('auth.passwordPlaceholder')}
                            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#334155] outline-none placeholder:font-medium placeholder:text-[#94A3B8]" />
                          <EyeToggle show={showPass} toggle={() => setShowPass((s) => !s)} />
                        </div>
                        {registerErrors.password && <p className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.password}</p>}
                      </div>

                      <div>
                        <label htmlFor="register-confirm-password" className="mb-2 block text-xs font-black uppercase tracking-wider text-[#475569]">{t('auth.confirmPassword')}</label>
                        <div className="flex h-14 items-center gap-3 rounded-[20px] border border-gray-200 bg-gray-50/30 px-5 transition-all duration-300 focus-within:border-[#EC4D97]/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EC4D97]/5">
                          <Lock size={18} className="shrink-0 text-[#64748B]" strokeWidth={2} />
                          <input id="register-confirm-password" type={showConfirm ? 'text' : 'password'} value={rf.confirm_password}
                            autoComplete="new-password"
                            onChange={(e) => sr('confirm_password', e.target.value)} placeholder={t('auth.confirmPassword')}
                            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#334155] outline-none placeholder:font-medium placeholder:text-[#94A3B8]" />
                          <EyeToggle show={showConfirm} toggle={() => setShowConfirm((s) => !s)} />
                        </div>
                        {registerErrors.confirm_password && <p className="mt-1.5 text-xs font-bold text-red-500">{registerErrors.confirm_password}</p>}
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={rf.terms}
                        onChange={(e) => sr('terms', e.target.checked)}
                        className="h-5 w-5 rounded-[6px] accent-[#EC197A] shrink-0 cursor-pointer border-gray-300"
                      />
                      <span className="text-[13px] font-medium leading-relaxed text-[#64748B]">
                        {t('auth.agreeWith')} <span className="font-bold text-[#1A1A1A] underline decoration-[#EC4D97]/30 underline-offset-4">{t('auth.termsCondition')}</span>
                      </span>
                    </label>

                    <button type="submit" disabled={loading}
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-[#EC197A] text-[15px] font-black uppercase tracking-wide text-white shadow-[0_12px_30px_rgba(236,25,122,0.25)] transition-all duration-300 hover:scale-[1.01] hover:bg-[#D9166F] hover:shadow-[0_15px_35px_rgba(236,25,122,0.3)] active:scale-[0.98] disabled:scale-100 disabled:opacity-60">
                      {loading ? <Loader2 size={18} className="animate-spin" /> : <>{t('auth.createAccount')} <ChevronRight size={17} strokeWidth={3} /></>}
                    </button>

                    <div className="flex items-center gap-4 py-1">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">{t('common.or')}</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={openGoogleLogin}
                        disabled={googleLoading || googleConfigLoading || (Boolean(googleConfig) && !googleLoginEnabled)}
                        className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-gray-200 bg-white text-sm font-bold text-[#1A1A1A] transition-all duration-300 hover:bg-gray-50 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-60"
                      >
                        {googleLoading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : <GoogleMark size={18} />}
                        {t('auth.google')}
                      </button>

                      <button type="button"
                        onClick={openTelegramLogin}
                        disabled={telegramLoading}
                        className="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-gray-200 bg-white text-sm font-bold text-[#1A1A1A] transition-all duration-300 hover:bg-sky-50/30 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:opacity-60">
                        {telegramLoading ? <Loader2 size={18} className="animate-spin text-sky-500" /> : <Send size={18} className="text-[#2AABEE]" fill="#2AABEE" />}
                        {t('auth.telegram')}
                      </button>
                    </div>

                    <p className="pt-2 text-center text-sm font-medium text-[#64748B]">
                      {t('auth.haveAccount')}{' '}
                      <button type="button" onClick={() => { setNotice(null); setMode('login') }}
                        className="font-black text-[#EC4D97] transition-all hover:text-[#E53888] hover:underline underline-offset-4">{t('auth.logIn')}</button>
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
