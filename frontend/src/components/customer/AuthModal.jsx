import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  X, UserCircle2, ChevronRight, LogIn, Mail, Lock, Eye, EyeOff, 
  Loader2, User, Send, Sparkles, CheckCircle2, AlertCircle,
  LockKeyhole, MailCheck, ArrowLeft, Camera, UserRound, Phone, UsersRound,
  Globe, MapPin, ChevronDown
} from 'lucide-react'
import { cn } from '@/utils/cn'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useQuery, useMutation } from '@tanstack/react-query'
import { isValidCambodiaPhone, normalizeCambodiaPhone } from '@/utils/phone'
import cambodiaAdmin from '@/data/cambodia_admin.json'

// ─── Location Picker Helpers ──────────────────────────────────────────────────
const KH = cambodiaAdmin?.provinces?.length ? cambodiaAdmin : { provinces: [], districts: {}, communes: {}, villages: {} }
const KHMER_LOCATION_LABELS = KH.labels || {}
const PROVINCE_KHMER_LABELS = {
  'Banteay Meanchey': 'ខេត្តបន្ទាយមានជ័យ',
  Battambang: 'ខេត្តបាត់ដំបង',
  'Kampong Cham': 'ខេត្តកំពង់ចាម',
  'Kampong Chhnang': 'ខេត្តកំពង់ឆ្នាំង',
  'Kampong Speu': 'ខេត្តកំពង់ស្ពឺ',
  'Kampong Thom': 'ខេត្តកំពង់ធំ',
  Kampot: 'ខេត្តកំពត',
  Kandal: 'ខេត្តកណ្ដាល',
  'Koh Kong': 'ខេត្តកោះកុង',
  Kratie: 'ខេត្តក្រចេះ',
  Mondulkiri: 'ខេត្តមណ្ឌលគិរី',
  'Phnom Penh': 'រាជធានីភ្នំពេញ',
  'Preah Vihear': 'ខេត្តព្រះវិហារ',
  'Prey Veng': 'ខេត្តព្រៃវែង',
  Pursat: 'ខេត្តពោធិ៍សាត់',
  Ratanakiri: 'ខេត្តរតនគិរី',
  'Siem Reap': 'ខេត្តសៀមរាប',
  'Preah Sihanouk': 'ខេត្តព្រះសីហនុ',
  'Stung Treng': 'ខេត្តស្ទឹងត្រែង',
  'Svay Rieng': 'ខេត្តស្វាយរៀង',
  Takeo: 'ខេត្តតាកែវ',
  'Oddar Meanchey': 'ខេត្តឧត្ដរមានជ័យ',
  Kep: 'ខេត្តកែប',
  Pailin: 'ខេត្តប៉ៃលិន',
  'Tboung Khmum': 'ខេត្តត្បូងឃ្មុំ',
}

function getLocationLabel(name, pathParts = []) {
  const key = [...pathParts, name].filter(Boolean).join('|')
  if (!pathParts.length && PROVINCE_KHMER_LABELS[name]) return PROVINCE_KHMER_LABELS[name]
  return KHMER_LOCATION_LABELS[key] || KHMER_LOCATION_LABELS[name] || name
}

function KhmerLocationName({ name, pathParts = [], className = '' }) {
  return <span className={className}>{getLocationLabel(name, pathParts)}</span>
}

function LocationPicker({ onSelect, onClose }) {
  const { t } = useTranslation()
  const [level, setLevel] = useState('province')
  const [sel, setSel] = useState({ province: '', district: '', commune: '', village: '' })
  const [search, setSearch] = useState('')

  const getVillages = (selection = sel) => {
    const fullKey = [selection.province, selection.district, selection.commune].filter(Boolean).join('|')
    return KH.villages[fullKey] || KH.villages[selection.commune] || []
  }

  const currentList = useMemo(() => {
    if (level === 'province') return KH.provinces || []
    if (level === 'district') return KH.districts[sel.province] || []
    if (level === 'commune') return KH.communes[[sel.province, sel.district].filter(Boolean).join('|')] || KH.communes[sel.district] || []
    return getVillages()
  }, [level, sel])

  const currentPathParts = useMemo(() => {
    if (level === 'district') return [sel.province]
    if (level === 'commune') return [sel.province, sel.district]
    if (level === 'village') return [sel.province, sel.district, sel.commune]
    return []
  }, [level, sel])

  const filtered = useMemo(() => {
    if (!search) return currentList
    const keyword = search.toLowerCase()
    return currentList.filter(item => 
      item.toLowerCase().includes(keyword) || 
      getLocationLabel(item, currentPathParts).toLowerCase().includes(keyword)
    )
  }, [currentList, currentPathParts, search])

  const grouped = useMemo(() => 
    filtered.reduce((acc, item) => {
      const l = getLocationLabel(item, currentPathParts)[0] || item[0].toUpperCase()
      ;(acc[l] = acc[l] || []).push(item)
      return acc
    }, {}),
    [filtered, currentPathParts]
  )

  const titleMap = {
    province: t('addressBook.locationPicker.province'),
    district: t('addressBook.locationPicker.district'),
    commune: t('addressBook.locationPicker.commune'),
    village: t('addressBook.locationPicker.village'),
  }

  const pick = (item) => {
    if (level === 'province') {
      const next = { province: item, district: '', commune: '', village: '' }
      setSel(next)
      if ((KH.districts[item] || []).length) setLevel('district')
      else { onSelect({ state: item, city: '', address_line2: '' }); onClose() }
    } else if (level === 'district') {
      const next = { ...sel, district: item, commune: '', village: '' }
      setSel(next)
      if ((KH.communes[[sel.province, item].filter(Boolean).join('|')] || KH.communes[item] || []).length) setLevel('commune')
      else { onSelect({ state: sel.province, city: item, address_line2: '' }); onClose() }
    } else if (level === 'commune') {
      const next = { ...sel, commune: item, village: '' }
      setSel(next)
      if (getVillages(next).length) setLevel('village')
      else { onSelect({ state: sel.province, city: sel.district, address_line2: item }); onClose() }
    } else {
      onSelect({ state: sel.province, city: sel.district, address_line2: [sel.commune, item].filter(Boolean).join(', ') })
      onClose()
    }
    setSearch('')
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/60 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white sm:rounded-[32px] flex flex-col h-full sm:h-[80vh] overflow-hidden shadow-2xl animate-slide-up sm:animate-fade-in">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {level !== 'province' && (
              <button 
                onClick={() => setLevel(level === 'village' ? 'commune' : level === 'commune' ? 'district' : 'province')}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">{titleMap[level]}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-50">
          <div className="relative flex items-center bg-slate-50 rounded-[18px] border border-slate-100 px-4">
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('addressBook.locationPicker.search')}
              className="w-full h-12 bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {Object.keys(grouped).sort().map(letter => (
            <div key={letter} className="space-y-2">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pl-2">{letter}</span>
              <div className="grid grid-cols-1 gap-1">
                {grouped[letter].map(item => (
                  <button 
                    key={item}
                    onClick={() => pick(item)}
                    className="w-full text-left px-4 py-3.5 rounded-[16px] text-[15px] font-bold text-slate-700 hover:bg-pink-50 hover:text-pink-600 transition-all"
                  >
                    <KhmerLocationName name={item} pathParts={currentPathParts} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-medium">{t('addressBook.locationPicker.noResults')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

const GENDER_OPTIONS = [
  { value: '', labelKey: 'completeProfile.selectGender' },
  { value: 'male', labelKey: 'completeProfile.genderMale' },
  { value: 'female', labelKey: 'completeProfile.genderFemale' },
  { value: 'prefer_not_to_say', labelKey: 'completeProfile.genderPreferNot' },
]

function hasProfileBasics(user, form) {
  const cleanName = String(form?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.full_name || '').trim()
  const cleanPhone = normalizeCambodiaPhone(form?.phone || user?.phone)
  const gender = String(form?.gender || user?.gender || '').trim()
  const hasRealName = Boolean(cleanName && !['google', 'telegram'].includes(cleanName.toLowerCase()))
  return Boolean(hasRealName && cleanPhone && isValidCambodiaPhone(cleanPhone) && gender)
}

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
  
  if (normalized.includes('no active account found') || 
      normalized.includes('unable to log in') || 
      normalized.includes('invalid credentials')) {
    return t('auth.noActiveAccount')
  }

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

export default function AuthModal({ isOpen, onClose, type = 'cart' }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, login, register, googleLogin, telegramLogin, verifyEmailCode, setPendingWelcomeBonus, updateUser } = useAuthStore()
  
  const [view, setView] = useState('choice') // 'choice', 'login', 'register', 'verify', 'profile', 'address'
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [telegramOpen, setTelegramOpen] = useState(false)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  
  const [lf, setLf] = useState({ username: '', password: '' })
  const [rf, setRf] = useState({ 
    full_name: '', 
    email: '', 
    password: '', 
    confirm_password: '', 
    terms: true,
    referral_code: new URLSearchParams(location.search).get('ref') || ''
  })
  const [registerErrors, setRegisterErrors] = useState({})
  const [digits, setDigits] = useState(['', '', '', ''])

  // Profile Step States
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '', gender: '', email: '', friend_referral_code: '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const fileInputRef = useRef(null)

  // Address Step States
  const [addressForm, setAddressForm] = useState({ 
    label: 'home', full_name: '', phone: '', address_line1: '', address_line2: '', 
    city: '', state: '', postal_code: '', country: 'Cambodia', is_default: true 
  })
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const telegramWidgetRef = useRef(null)
  const googleIdentityInitRef = useRef(null)
  const inputsRef = useRef([])

  const checkProfileCompletion = useCallback((loggedInUser) => {
    const needsProfile = !hasProfileBasics(loggedInUser)
    const needsAddress = loggedInUser?.has_address !== true

    if (needsProfile) {
      setProfileForm({
        full_name: [loggedInUser.first_name, loggedInUser.last_name].filter(Boolean).join(' ') || loggedInUser.full_name || '',
        email: loggedInUser.email || '',
        phone: normalizeCambodiaPhone(loggedInUser.phone),
        gender: loggedInUser.gender || '',
        friend_referral_code: ''
      })
      setAddressForm(f => ({
        ...f,
        full_name: [loggedInUser.first_name, loggedInUser.last_name].filter(Boolean).join(' ') || loggedInUser.full_name || '',
        phone: normalizeCambodiaPhone(loggedInUser.phone)
      }))
      setView('profile')
      return true
    }

    if (needsAddress) {
      setAddressForm(f => ({
        ...f,
        full_name: [loggedInUser.first_name, loggedInUser.last_name].filter(Boolean).join(' ') || loggedInUser.full_name || '',
        phone: normalizeCambodiaPhone(loggedInUser.phone)
      }))
      setView('address')
      return true
    }

    return false
  }, [onClose])

  const { data: telegramConfig } = useQuery({
    queryKey: ['telegram-login-config'],
    queryFn: () => authApi.telegramConfig().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
  })

  const { data: googleConfig, isLoading: googleConfigLoading, isError: googleConfigError, refetch: refetchGoogleConfig } = useQuery({
    queryKey: ['google-login-config'],
    queryFn: () => authApi.googleConfig().then((r) => r.data),
    staleTime: 10 * 60 * 1000,
    enabled: isOpen,
    retry: 2,
  })

  const googleClientId = googleConfig?.client_id || ''
  const googleLoginEnabled = Boolean(googleConfig?.configured && googleClientId)
  const telegramBotUsername = telegramConfig?.bot_username || ''
  const telegramLoginEnabled = Boolean(telegramConfig?.configured && telegramBotUsername)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      if (type === 'register') setView('register')
      else if (type === 'login') setView('login')
      else setView('choice')
      
      setNotice(null)
      setRegisterErrors({})
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleGoogleCredential = useCallback(async (response) => {
    const credential = typeof response === 'string' ? response : response?.credential
    if (!credential) {
      setNotice({ type: 'error', message: t('auth.googleCredentialMissing') })
      setGoogleLoading(false)
      return
    }

    setGoogleLoading(true)
    try {
      const loggedInUser = await googleLogin({ 
        credential,
        referral_code: rf.referral_code 
      })
      if (loggedInUser) {
        toast.success(t('auth.welcomeUser', { name: loggedInUser.first_name || loggedInUser.username || 'Google' }))
        if (!checkProfileCompletion(loggedInUser)) {
          onClose()
        }
      }
    } catch (err) {
      const message = translateAuthError(err?.response?.data || err?.message, t, 'auth.googleLoginFailed')
      setNotice({ type: 'error', message })
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLogin, t, rf.referral_code, onClose, checkProfileCompletion])

  const initializeGoogleIdentity = useCallback(async () => {
    await loadGoogleIdentityScript()
    if (!window.google?.accounts?.id) return

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredential,
      auto_select: false,
    })
  }, [googleClientId, handleGoogleCredential])

  const openGoogleLogin = async () => {
    setNotice(null)
    if (googleConfigLoading) return
    if (!googleLoginEnabled || !googleClientId) {
      setNotice({ type: 'error', message: t('auth.googleNotConfigured') })
      return
    }

    setGoogleLoading(true)
    try {
      await initializeGoogleIdentity()
      window.google.accounts.id.prompt((notification) => {
        if (notification.isDismissedMoment?.() && notification.getDismissedReason?.() !== 'credential_returned') {
          setGoogleLoading(false)
        }
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          triggerGoogleButtonFallback().catch(() => setGoogleLoading(false))
        }
      })
    } catch {
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    if (!telegramOpen || !telegramLoginEnabled || !telegramWidgetRef.current) return

    const callbackName = 'shadowShopTelegramAuthModal'
    window[callbackName] = async (telegramUser) => {
      setTelegramLoading(true)
      try {
        const loggedInUser = await telegramLogin({
          ...telegramUser,
          referral_code: rf.referral_code
        })
        toast.success(t('auth.welcomeUser', { name: loggedInUser.first_name || loggedInUser.username }))
        setTelegramOpen(false)
        if (!checkProfileCompletion(loggedInUser)) {
          onClose()
        }
      } catch (err) {
        setNotice({ type: 'error', message: translateAuthError(err.response?.data, t, 'auth.telegramLoginFailed') })
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

    return () => { if (window[callbackName]) delete window[callbackName] }
  }, [telegramOpen, telegramLoginEnabled, telegramBotUsername, telegramLogin, t, rf.referral_code, onClose, checkProfileCompletion])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!lf.username || !lf.password) {
      setNotice({ type: 'error', message: t('auth.pleaseFillAllFields') })
      return
    }
    setLoading(true)
    try {
      const u = await login(lf)
      toast.success(t('auth.welcomeBackUser', { name: u.first_name || u.username }))
      if (!checkProfileCompletion(u)) {
        onClose()
      }
    } catch (err) {
      setNotice({ type: 'error', message: translateAuthError(err.response?.data, t, 'auth.invalidCredentials') })
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const { full_name, email, password, confirm_password, terms } = rf
    const errors = {}
    if (!full_name.trim()) errors.full_name = t('auth.validationNameRequired')
    if (!email.trim()) errors.email = t('auth.validationEmailRequired')
    if (!password) errors.password = t('auth.validationPasswordRequired')
    if (password !== confirm_password) errors.confirm_password = t('auth.validationPasswordMismatch')
    
    setRegisterErrors(errors)
    if (Object.keys(errors).length) return

    setLoading(true)
    try {
      const [firstName, ...rest] = full_name.trim().split(/\s+/)
      await register({ 
        email: email.trim().toLowerCase(), 
        first_name: firstName || '', 
        last_name: rest.join(' '), 
        password, 
        confirm_password,
        referral_code: rf.referral_code 
      })
      toast.success(t('auth.verificationCodeSent'))
      setView('verify')
      setNotice(null)
      window.setTimeout(() => inputsRef.current[0]?.focus(), 100)
    } catch (err) {
      setNotice({ type: 'error', message: translateAuthError(err.response?.data, t, 'auth.registrationFailed') })
    } finally { setLoading(false) }
  }

  const setDigit = (index, value) => {
    if (notice?.type === 'error') setNotice(null)
    const clean = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => {
      const next = [...current]
      next[index] = clean
      return next
    })
    if (clean && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return
    event.preventDefault()
    const next = pasted.padEnd(4, '').slice(0, 4).split('')
    setDigits(next)
    inputsRef.current[Math.min(pasted.length, 4) - 1]?.focus()
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const submitVerification = async (e) => {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 4) {
      setNotice({ type: 'error', message: t('verifyEmail.incompleteMessage') })
      return
    }

    setLoading(true)
    try {
      const result = await verifyEmailCode({ email: rf.email.trim().toLowerCase(), code })
      const signupBonusPoints = Number(result.signup_bonus_points || 0)
      
      if (signupBonusPoints > 0) {
        setPendingWelcomeBonus(signupBonusPoints)
      }

      toast.success(t('auth.welcomeUser', { name: result.user.first_name || result.user.username }))
      
      // Initialize profile form with what we know
      setProfileForm({
        full_name: rf.full_name,
        email: rf.email.trim().toLowerCase(),
        phone: '',
        gender: '',
        friend_referral_code: rf.referral_code
      })
      setAddressForm(f => ({ ...f, full_name: rf.full_name }))
      
      setView('profile')
    } catch (error) {
      setNotice({ 
        type: 'error', 
        message: translateAuthError(error.response?.data, t, 'verifyEmail.failureMessage')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    const cleanName = profileForm.full_name.trim()
    const cleanPhone = normalizeCambodiaPhone(profileForm.phone)
    const cleanEmail = profileForm.email.trim().toLowerCase()
    const nextErrors = {}

    if (!cleanName || ['google', 'telegram'].includes(cleanName.toLowerCase())) {
      nextErrors.full_name = t('completeProfile.enterName')
    }
    if (!cleanPhone) nextErrors.phone = t('completeProfile.enterPhone')
    else if (!isValidCambodiaPhone(cleanPhone)) nextErrors.phone = t('common.invalidPhone')
    if (!profileForm.gender) nextErrors.gender = t('completeProfile.selectGenderError')

    if (Object.keys(nextErrors).length) {
      setProfileErrors(nextErrors)
      return
    }

    setLoading(true)
    try {
      const [firstName, ...lastParts] = cleanName.split(/\s+/)
      const payload = {
        first_name: firstName || '',
        last_name: lastParts.join(' '),
        phone: cleanPhone,
        gender: profileForm.gender,
        email: cleanEmail,
        friend_referral_code: profileForm.friend_referral_code.trim(),
      }

      let data
      if (avatarFile) {
        const fd = new FormData()
        Object.entries(payload).forEach(([key, value]) => fd.append(key, value))
        fd.append('avatar', avatarFile)
        const res = await authApi.updateMe(fd)
        data = res.data
      } else {
        const res = await authApi.updateMe(payload)
        data = res.data
      }

      updateUser(data)
      toast.success(t('completeProfile.profileSaved'))
      
      // Update address form with the confirmed name/phone
      setAddressForm(f => ({
        ...f,
        full_name: cleanName,
        phone: cleanPhone
      }))
      
      setView('address')
    } catch (error) {
      toast.error(t('completeProfile.completeFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSubmit = async (e) => {
    e.preventDefault()
    const phone = normalizeCambodiaPhone(addressForm.phone)
    if (!isValidCambodiaPhone(phone)) {
      toast.error(t('common.invalidPhone'))
      return
    }

    setLoading(true)
    try {
      await authApi.addresses.create({ ...addressForm, phone })
      updateUser({ has_address: true })
      toast.success(t('completeProfile.addressSaved'))
      onClose()
      
      const from = location.state?.from || '/'
      if (from !== '/') navigate(from, { replace: true })
    } catch (error) {
      toast.error(t('completeProfile.addressFailed'))
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    if (resending) return
    setResending(true)
    try {
      await authApi.resendEmailCode({ email: rf.email.trim().toLowerCase() })
      setDigits(['', '', '', ''])
      inputsRef.current[0]?.focus()
      setNotice({
        type: 'success',
        message: t('verifyEmail.codeSentMessage', { email: rf.email })
      })
    } catch (err) {
      setNotice({
        type: 'error',
        message: translateAuthError(err.response?.data, t, 'verifyEmail.resendFailureMessage')
      })
    } finally {
      setResending(false)
    }
  }

  if (!isOpen) return null

  const title = t('auth.loginRequired')
  const description = (() => {
    switch (type) {
      case 'checkout': return t('auth.loginToCheckout')
      case 'coupon': return t('auth.loginToUseCoupon')
      case 'buy_now': return t('auth.loginToBuyNow')
      default: return t('auth.loginToAddToCart')
    }
  })()

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" 
      />
      
      {/* Modal Card */}
      <div className={cn(
        "relative w-full sm:max-w-[520px] bg-white shadow-2xl transition-all duration-300",
        "rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-10",
        "animate-slide-up sm:animate-fade-in",
        "mx-auto overflow-y-auto max-h-[95vh] sm:max-h-[none]"
      )}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-10 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
        >
          <X size={22} />
        </button>

        {notice && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-600 animate-fade-in">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-relaxed">{notice.message}</p>
          </div>
        )}

        {view === 'choice' && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center text-pink-600 mb-8 shadow-sm">
              <UserCircle2 size={52} strokeWidth={1.5} />
            </div>

            <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-slate-900 leading-tight mb-4">
              {title}
            </h2>
            
            <p className="text-[16px] font-medium text-slate-500 leading-relaxed mb-10 px-4">
              {description}
            </p>

            <div className="w-full space-y-4">
              <button
                onClick={() => setView('login')}
                className="w-full h-16 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-[22px] text-[16px] font-black uppercase tracking-wide transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200"
              >
                <LogIn size={22} />
                {t('auth.login')}
              </button>
              
              <button
                onClick={() => setView('register')}
                className="w-full h-16 flex items-center justify-center gap-2 border-2 border-slate-100 bg-white text-slate-700 rounded-[22px] text-[16px] font-black uppercase tracking-wide transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                {t('auth.register')}
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="animate-fade-in">
            <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-slate-900 mb-2">{t('auth.welcome')}</h2>
            <p className="text-[15px] font-medium text-slate-500 mb-8">{t('auth.loginSubtitle')}</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-600">{t('auth.emailOrUsername')}</label>
                <div className="flex h-14 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <Mail size={20} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={lf.username} 
                    onChange={(e) => setLf(f => ({ ...f, username: e.target.value }))}
                    placeholder={t('auth.emailOrUsernamePlaceholder')}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-600">{t('auth.password')}</label>
                <div className="flex h-14 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <Lock size={20} className="text-slate-400" />
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    value={lf.password} 
                    onChange={(e) => setLf(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-pink-600 transition-colors">
                    {showPass ? <Eye size={19} /> : <EyeOff size={19} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 mt-2 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-[22px] text-[17px] font-black uppercase tracking-wider transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('auth.login')} <ChevronRight size={20} strokeWidth={3} /></>}
              </button>
            </form>

            <div className="flex items-center gap-4 my-8">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{t('common.or')}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={openGoogleLogin} 
                className="flex h-14 items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white text-[15px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
              >
                {googleLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : <GoogleMark size={20} />}
                {t('auth.google')}
              </button>
              <button 
                onClick={() => setTelegramOpen(true)}
                className="flex h-14 items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white text-[15px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
              >
                <Send size={20} className="text-[#2AABEE]" fill="#2AABEE" />
                {t('auth.telegram')}
              </button>
            </div>

            <p className="text-center text-[15px] font-medium text-slate-500">
              {t('auth.noAccount')}{' '}
              <button onClick={() => setView('register')} className="font-black text-[#EC4D97] hover:underline underline-offset-4 transition-all">{t('auth.register')}</button>
            </p>
          </div>
        )}

        {view === 'register' && (
          <div className="animate-fade-in">
            <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-slate-900 mb-2">{t('auth.createAccount')}</h2>
            <p className="text-[15px] font-medium text-slate-500 mb-8">{t('auth.createAccountSubtitle')}</p>

            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-600">{t('auth.fullName')}</label>
                <div className={cn(
                  "flex h-14 items-center gap-3 rounded-[20px] border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.full_name ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <User size={20} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={rf.full_name} 
                    onChange={(e) => setRf(f => ({ ...f, full_name: e.target.value }))}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-600">{t('auth.email')}</label>
                <div className={cn(
                  "flex h-14 items-center gap-3 rounded-[20px] border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.email ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <Mail size={20} className="text-slate-400" />
                  <input 
                    type="email" 
                    value={rf.email} 
                    onChange={(e) => setRf(f => ({ ...f, email: e.target.value }))}
                    placeholder={t('auth.emailExample')}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-600">{t('auth.password')}</label>
                <div className={cn(
                  "flex h-14 items-center gap-3 rounded-[20px] border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.password ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <Lock size={20} className="text-slate-400" />
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    value={rf.password} 
                    onChange={(e) => setRf(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="flex-1 min-w-0 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-pink-600 transition-colors">
                    {showPass ? <Eye size={19} /> : <EyeOff size={19} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-black uppercase tracking-wider text-slate-600">{t('auth.confirmPassword')}</label>
                <div className={cn(
                  "flex h-14 items-center gap-3 rounded-[20px] border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.confirm_password ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <Lock size={20} className="text-slate-400" />
                  <input 
                    type={showConfirm ? 'text' : 'password'} 
                    value={rf.confirm_password} 
                    onChange={(e) => setRf(f => ({ ...f, confirm_password: e.target.value }))}
                    placeholder={t('auth.confirmPassword')}
                    className="flex-1 min-w-0 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-slate-400 hover:text-pink-600 transition-colors">
                    {showConfirm ? <Eye size={19} /> : <EyeOff size={19} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-16 mt-2 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-[22px] text-[17px] font-black uppercase tracking-wider transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('auth.createAccount')} <ChevronRight size={20} strokeWidth={3} /></>}
              </button>
            </form>

            <div className="flex items-center gap-4 my-8">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{t('common.or')}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <p className="text-center text-[15px] font-medium text-slate-500">
              {t('auth.haveAccount')}{' '}
              <button onClick={() => setView('login')} className="font-black text-[#EC4D97] hover:underline underline-offset-4 transition-all">{t('auth.logIn')}</button>
            </p>
          </div>
        )}

        {view === 'verify' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setView('register')}
              className="absolute left-6 top-6 grid h-10 w-10 place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[24px] bg-pink-50 flex items-center justify-center text-[#EC4D97] mb-6 shadow-sm">
                <MailCheck size={42} strokeWidth={1.8} />
              </div>

              <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-slate-900 mb-2">
                {t('verifyEmail.title')}
              </h2>
              <p className="text-[15px] font-medium text-slate-500 mb-8 max-w-[320px]">
                {t('verifyEmail.subtitle')}
                <span className="block font-bold text-slate-800 mt-1 truncate">{rf.email}</span>
              </p>

              <form onSubmit={submitVerification} className="w-full flex flex-col items-center">
                <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-10" onPaste={handlePaste}>
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputsRef.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => setDigit(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={cn(
                        "w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] border-2 text-center text-xl font-black transition-all outline-none",
                        digit 
                          ? "border-pink-500 bg-pink-50 text-pink-600" 
                          : "border-slate-100 bg-slate-50 text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50"
                      )}
                      placeholder="-"
                    />
                  ))}
                </div>

                <div className="mb-8 text-center">
                  <p className="text-sm font-medium text-slate-500">{t('verifyEmail.dontReceive')}</p>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resending}
                    className="mt-1 text-sm font-black text-[#EC4D97] hover:underline underline-offset-4 disabled:opacity-50"
                  >
                    {resending ? t('verifyEmail.sending') : t('verifyEmail.resendCode')}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || digits.join('').length < 4}
                  className="w-full h-16 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-[22px] text-[17px] font-black uppercase tracking-wider transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('verifyEmail.verify')} <ChevronRight size={20} strokeWidth={3} /></>}
                </button>
              </form>

              <div className="mt-10 flex items-center justify-center gap-2 text-[13px] font-bold text-slate-400">
                <LockKeyhole size={16} />
                {t('verifyEmail.securityNote')}
              </div>
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div className="animate-fade-in">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 rounded-[28px] bg-pink-50 flex items-center justify-center text-[#EC4D97] mb-6 shadow-sm">
                <Sparkles size={42} strokeWidth={1.8} />
              </div>
              <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-slate-900 mb-2">
                {t('completeProfile.title')}
              </h2>
              <p className="text-[15px] font-medium text-slate-500 max-w-[320px]">
                {t('completeProfile.subtitle')}
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center justify-center gap-6 rounded-[24px] bg-slate-50/80 p-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-white bg-pink-50 flex items-center justify-center overflow-hidden shadow-sm">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-pink-600">
                        {profileForm.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-md border-2 border-white"
                  >
                    <Camera size={14} fill="currentColor" />
                  </button>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0]
                      if (file) {
                        setAvatarFile(file)
                        setAvatarPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-black text-slate-800">{t('completeProfile.profilePhoto')}</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{t('completeProfile.photoHint')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600">{t('profile.fullName')} <span className="text-pink-600">*</span></label>
                  <div className={cn(
                    "flex h-14 items-center gap-3 rounded-[20px] border px-5 transition-all duration-300",
                    profileErrors.full_name ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-slate-50/50 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                  )}>
                    <UserRound size={20} className="text-slate-400" />
                    <input 
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder={t('completeProfile.fullNamePlaceholder')}
                      className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600">{t('profile.phoneNumber')} <span className="text-pink-600">*</span></label>
                  <div className={cn(
                    "flex h-14 items-center gap-3 rounded-[20px] border px-5 transition-all duration-300",
                    profileErrors.phone ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-slate-50/50 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                  )}>
                    <Phone size={20} className="text-slate-400" />
                    <input 
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(f => ({ ...f, phone: normalizeCambodiaPhone(e.target.value) }))}
                      placeholder={t('common.phonePlaceholder')}
                      className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600">{t('completeProfile.gender')} <span className="text-pink-600">*</span></label>
                  <div className={cn(
                    "relative flex h-14 items-center gap-3 rounded-[20px] border px-5 transition-all duration-300",
                    profileErrors.gender ? "border-red-200 bg-red-50/30" : "border-slate-200 bg-slate-50/50 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                  )}>
                    <UsersRound size={20} className="text-slate-400" />
                    <select 
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm(f => ({ ...f, gender: e.target.value }))}
                      className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none appearance-none"
                    >
                      {GENDER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="text-slate-400 pointer-events-none absolute right-5" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-[22px] text-[17px] font-black uppercase tracking-wider transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('common.next')} <ChevronRight size={20} strokeWidth={3} /></>}
              </button>
            </form>
          </div>
        )}

        {view === 'address' && (
          <div className="animate-fade-in">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-20 h-20 rounded-[28px] bg-pink-50 flex items-center justify-center text-[#EC4D97] mb-6 shadow-sm">
                <MapPin size={42} strokeWidth={1.8} />
              </div>
              <h2 className="text-[26px] sm:text-[32px] font-black tracking-tight text-slate-900 mb-2">
                {t('addressBook.addTitle')}
              </h2>
              <p className="text-[15px] font-medium text-slate-500 max-w-[320px]">
                {t('addressBook.formSubtitle')}
              </p>
            </div>

            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="flex h-14 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <UserRound size={20} className="text-slate-400" />
                  <input 
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder={t('addressBook.fullNamePlaceholder')}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="flex h-14 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <Phone size={20} className="text-slate-400" />
                  <input 
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm(f => ({ ...f, phone: normalizeCambodiaPhone(e.target.value) }))}
                    placeholder={t('addressBook.phonePlaceholder')}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="relative flex h-14 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <Globe size={20} className="text-slate-400" />
                  <select 
                    value={addressForm.country}
                    onChange={(e) => setAddressForm(f => ({ ...f, country: e.target.value }))}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none appearance-none"
                  >
                    <option value="Cambodia">Cambodia</option>
                    <option value="Thailand">Thailand</option>
                    <option value="Vietnam">Vietnam</option>
                  </select>
                  <ChevronDown size={18} className="text-slate-400 pointer-events-none absolute right-5" />
                </div>

                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="flex h-14 w-full items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 text-left transition-all duration-300 hover:bg-slate-50"
                >
                  <MapPin size={20} className="text-pink-500" />
                  <div className="flex-1 truncate">
                    {addressForm.state ? (
                      <span className="text-[15px] font-bold text-slate-800">
                        {addressForm.state} › {addressForm.city} › {addressForm.address_line2}
                      </span>
                    ) : (
                      <span className="text-[15px] font-bold text-slate-400">{t('addressBook.locationPlaceholder')}</span>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>

                <div className="flex h-14 items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <input 
                    value={addressForm.address_line1}
                    onChange={(e) => setAddressForm(f => ({ ...f, address_line1: e.target.value }))}
                    placeholder={t('addressBook.streetPlaceholder')}
                    className="flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !addressForm.state}
                className="w-full h-16 mt-6 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-[22px] text-[17px] font-black uppercase tracking-wider transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('common.save')} <ChevronRight size={20} strokeWidth={3} /></>}
              </button>
            </form>
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <button
            onClick={() => {
              if (view === 'choice') onClose()
              else setView('choice')
            }}
            className="text-[14px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
          >
            {view === 'choice' ? t('common.cancel') : t('common.back')}
          </button>
        </div>
      </div>

      {telegramOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 mb-4">
              <Send size={24} fill="#2AABEE" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('auth.continueWithTelegram')}</h3>
            <p className="text-sm text-slate-500 mb-6">{t('auth.approveTelegramLogin')}</p>
            <div className="min-h-[60px] flex justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
              <div ref={telegramWidgetRef} />
            </div>
            <button
              onClick={() => setTelegramOpen(false)}
              className="w-full h-12 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {showLocationPicker && (
        <LocationPicker 
          onSelect={(data) => {
            setAddressForm(f => ({ ...f, ...data }))
            setShowLocationPicker(false)
          }}
          onClose={() => setShowLocationPicker(false)} 
        />
      )}
    </div>
  )
}
