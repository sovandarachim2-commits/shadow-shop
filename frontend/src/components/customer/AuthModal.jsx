import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  X, UserCircle2, ChevronRight, LogIn, Mail, Lock, Eye, EyeOff, 
  Loader2, User, Send, Sparkles, CheckCircle2, AlertCircle,
  LockKeyhole, MailCheck, ArrowLeft, Camera, UserRound, Phone, UsersRound,
  MapPin, ChevronDown, MessageSquare, ExternalLink, Globe
} from 'lucide-react'
import { cn } from '@/utils/cn'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isValidCambodiaPhone, normalizeCambodiaPhone } from '@/utils/phone'
import PhoneInput from '@/components/ui/PhoneInput'
import { COUNTRY_DATA, toE164, validatePhone } from '@/utils/phoneUtils'
import { detectUserProvince } from '@/utils/addressHelpers'
import { AddressForm } from '@/components/address/AddressFormModal'
// ─── Location Picker Helpers ──────────────────────────────────────────────────
const EMPTY_CAMBODIA_ADMIN = {
  provinces: [],
  districts: {},
  communes: {},
  villages: {},
  labels: {},
}

let cambodiaAdminCache = null
let cambodiaAdminPromise = null

async function loadCambodiaAdminData() {
  if (cambodiaAdminCache) return cambodiaAdminCache
  if (!cambodiaAdminPromise) {
    cambodiaAdminPromise = import('@/data/cambodia_admin.json')
      .then((module) => {
        const data = module?.default?.provinces?.length ? module.default : EMPTY_CAMBODIA_ADMIN
        cambodiaAdminCache = data
        return data
      })
      .catch(() => EMPTY_CAMBODIA_ADMIN)
  }
  return cambodiaAdminPromise
}

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

function getLocationLabel(name, pathParts = [], adminData = EMPTY_CAMBODIA_ADMIN) {
  const khmerLabels = adminData.labels || {}
  const key = [...pathParts, name].filter(Boolean).join('|')
  if (!pathParts.length && PROVINCE_KHMER_LABELS[name]) return PROVINCE_KHMER_LABELS[name]
  return khmerLabels[key] || khmerLabels[name] || name
}

function KhmerLocationName({ name, pathParts = [], className = '', adminData = EMPTY_CAMBODIA_ADMIN }) {
  return <span className={className}>{getLocationLabel(name, pathParts, adminData)}</span>
}

function LocationPicker({ onSelect, onClose, adminData, loadingAdminData }) {
  const { t } = useTranslation()
  const [level, setLevel] = useState('province')
  const [sel, setSel] = useState({ province: '', district: '' })
  const [search, setSearch] = useState('')

  const currentList = useMemo(() => {
    if (level === 'province') return adminData.provinces || []
    return adminData.districts[sel.province] || []
  }, [level, sel, adminData])

  const currentPathParts = useMemo(() => {
    if (level === 'district') return [sel.province]
    return []
  }, [level, sel])

  const filtered = useMemo(() => {
    if (!search) return currentList
    const keyword = search.toLowerCase()
    return currentList.filter(item => 
      item.toLowerCase().includes(keyword) || 
      getLocationLabel(item, currentPathParts, adminData).toLowerCase().includes(keyword)
    )
  }, [currentList, currentPathParts, search, adminData])

  const grouped = useMemo(() => 
    filtered.reduce((acc, item) => {
      const l = getLocationLabel(item, currentPathParts, adminData)[0] || item[0].toUpperCase()
      ;(acc[l] = acc[l] || []).push(item)
      return acc
    }, {}),
    [filtered, currentPathParts, adminData]
  )

  const titleMap = {
    province: t('addressBook.locationPicker.province'),
    district: t('addressBook.locationPicker.district'),
  }

  const pick = (item) => {
    onSelect({ state: item, city: '', address_line2: '' })
    onClose()
    setSearch('')
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-slate-900/60 backdrop-blur-sm sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white sm:rounded-[32px] flex flex-col h-full sm:h-[80vh] overflow-hidden shadow-2xl animate-slide-up sm:animate-fade-in">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {level !== 'province' && (
              <button 
                onClick={() => setLevel('province')}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="font-semibold text-slate-800 tracking-normal text-sm">{titleMap[level]}</h3>
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
              className="w-full h-12 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loadingAdminData && (
            <div className="py-20 text-center text-slate-400 font-medium">{t('common.loading')}</div>
          )}
          {!loadingAdminData && Object.keys(grouped).sort().map(letter => (
            <div key={letter} className="space-y-2">
              <span className="text-[10px] font-semibold text-slate-300 tracking-normalst pl-2">{letter}</span>
              <div className="grid grid-cols-1 gap-1">
                {grouped[letter].map(item => (
                  <button 
                    key={item}
                    onClick={() => pick(item)}
                    className="w-full text-left px-4 py-3.5 rounded-[16px] text-[15px] font-medium text-slate-700 hover:bg-pink-50 hover:text-pink-600 transition-all"
                  >
                    <KhmerLocationName name={item} pathParts={currentPathParts} adminData={adminData} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!loadingAdminData && filtered.length === 0 && (
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
  const placeholders = ['google', 'telegram', 'guest', 'user', 'customer']
  const hasRealName = Boolean(cleanName && !placeholders.includes(cleanName.toLowerCase()))
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
        width: 180,
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
  const queryClient = useQueryClient()
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
  const [addressErrors, setAddressErrors] = useState({})
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [adminData, setAdminData] = useState(cambodiaAdminCache || EMPTY_CAMBODIA_ADMIN)
  const [loadingAdminData, setLoadingAdminData] = useState(!cambodiaAdminCache)

  useEffect(() => {
    let active = true
    if (cambodiaAdminCache) {
      setAdminData(cambodiaAdminCache)
      setLoadingAdminData(false)
      return
    }
    loadCambodiaAdminData().then(data => {
      if (active) setAdminData(data)
    }).finally(() => {
      if (active) setLoadingAdminData(false)
    })
    return () => { active = false }
  }, [])

  const telegramWidgetRef = useRef(null)
  const googleFallbackRef = useRef(null)
  const [googleFallback, setGoogleFallback] = useState(false)
  const inputsRef = useRef([])

  // Telegram OTP Flow States
  const [tgPhone, setTgPhone] = useState('')
  const [tgPhoneE164, setTgPhoneE164] = useState('')
  const [tgToken, setTgToken] = useState('')
  const [tgBotLink, setTgBotLink] = useState('')
  const [tgStatus, setTgStatus] = useState({ has_chat: false, verified: false, expired: false })
  const [tgOtp, setTgOtp] = useState(['', '', '', '', '', ''])
  const pollingInterval = useRef(null)
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false)
  const genderDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(event.target)) {
        setIsGenderDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const checkProfileCompletion = useCallback((loggedInUser) => {
    if (loggedInUser?.role && !['customer', 'seller'].includes(loggedInUser.role)) return false
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
      if (user) {
        if (!checkProfileCompletion(user)) onClose()
      } else if (type === 'register') setView('register')
      else if (type === 'login') setView('login')
      else setView('choice')
      
      setGoogleFallback(false)
      setTelegramOpen(false)
      setShowLocationPicker(false)
      setLf({ username: '', password: '' })
      setAvatarFile(null)
      setAvatarPreview(user?.avatar || '')
      setNotice(null)
      setRegisterErrors({})
      setProfileErrors({})
      setAddressErrors({})
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, type])

  // Clear notice when switching views to avoid persistent error messages from previous steps
  useEffect(() => {
    setNotice(null)
    setRegisterErrors({})
    setProfileErrors({})
    setAddressErrors({})

    // Auto-detect location when entering address step
    if (view === 'address' && !addressForm.state) {
      detectUserProvince().then(province => {
        if (province) {
          setAddressForm(f => ({ ...f, state: province }))
        }
      })
    }
  }, [view])

  const addressSummary = useMemo(() => {
    const res = { province: '', district: '' }
    if (!addressForm.state) return res
    
    res.province = getLocationLabel(addressForm.state, [], adminData)
    if (addressForm.city) {
      res.district = getLocationLabel(addressForm.city, [addressForm.state], adminData)
    }
    return res
  }, [addressForm.state, addressForm.city, adminData])

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

  useEffect(() => {
    if (!isOpen || !googleFallback || !googleFallbackRef.current) return
    window.google?.accounts?.id.renderButton(googleFallbackRef.current, {
      type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', width: 180,
    })
  }, [isOpen, googleFallback, view])

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
          setGoogleFallback(true)
          setGoogleLoading(false)
        }
      })
    } catch {
      setGoogleLoading(false)
      setNotice({ type: 'error', message: t('auth.googleLoadFailed') })
    }
  }

  const stopTelegramPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current)
      pollingInterval.current = null
    }
  }, [])

  const pollTelegramStatus = useCallback(async (token) => {
    try {
      const { data } = await authApi.telegramStatus({ token })
      setTgStatus(data)
      if (data.verified) {
        stopTelegramPolling()
        setView('telegram-otp')
      }
      if (data.expired) {
        stopTelegramPolling()
        setNotice({ type: 'error', message: t('auth.telegramSessionExpired') })
      }
    } catch (err) {
      stopTelegramPolling()
    }
  }, [t, stopTelegramPolling])

  const startTelegramAuth = async () => {
    if (!tgPhoneE164) {
      setNotice({ type: 'error', message: t('auth.pleaseEnterPhone') })
      return
    }
    setTelegramLoading(true)
    setNotice(null)
    try {
      const { data } = await authApi.telegramStart({ phone: tgPhoneE164 })
      setTgToken(data.token)
      setTgBotLink(data.bot_link)
      setView('telegram-verify')
      
      // Start parallel polling
      stopTelegramPolling()
      pollingInterval.current = setInterval(() => pollTelegramStatus(data.token), 3000)
    } catch (err) {
      setNotice({ type: 'error', message: translateAuthError(err.response?.data, t, 'auth.telegramStartFailed') })
    } finally {
      setTelegramLoading(false)
    }
  }

  const handleTgOtpSubmit = async (otpString) => {
    setTelegramLoading(true)
    try {
      const loggedInUser = await telegramOtpLogin({
        token: tgToken,
        otp: otpString,
        referral_code: rf.referral_code
      })
      toast.success(t('auth.welcomeUser', { name: loggedInUser.first_name || loggedInUser.username }))
      setTelegramOpen(false)
      if (!checkProfileCompletion(loggedInUser)) {
        onClose()
      }
    } catch (err) {
      setNotice({ type: 'error', message: translateAuthError(err.response?.data, t, 'auth.invalidOtp') })
    } finally {
      setTelegramLoading(false)
    }
  }

  useEffect(() => {
    return () => stopTelegramPolling()
  }, [stopTelegramPolling])

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
      const u = await login({ ...lf, username: lf.username.trim() })
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
      setDigits(['', '', '', ''])
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
    const next = Array.from({ length: 4 }, (_, index) => pasted[index] || '')
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
    const phone = profileForm.phone_e164 || toE164(profileForm.phone, COUNTRY_DATA[0])
    const cleanEmail = profileForm.email.trim().toLowerCase()
    const nextErrors = {}

    if (!cleanName || ['google', 'telegram'].includes(cleanName.toLowerCase())) {
      nextErrors.full_name = t('completeProfile.enterName')
    }
    if (!profileForm.phone) {
      nextErrors.phone = t('completeProfile.enterPhone')
    } else {
      const country = COUNTRY_DATA.find(c => profileForm.phone_e164?.startsWith(c.dialCode)) || COUNTRY_DATA[0]
      if (!validatePhone(profileForm.phone, country)) {
        nextErrors.phone = t('common.invalidPhone')
      }
    }
    if (!profileForm.gender) nextErrors.gender = t('completeProfile.selectGenderError')

    if (Object.keys(nextErrors).length) {
      setProfileErrors(nextErrors)
      setNotice({ type: 'error', message: Object.values(nextErrors)[0] || t('auth.pleaseFillAllFields') })
      return
    }

    setNotice(null)
    setProfileErrors({})
    setLoading(true)
    try {
      const [firstName, ...lastParts] = cleanName.split(/\s+/)
      const payload = {
        first_name: firstName || '',
        last_name: lastParts.join(' '),
        phone: phone,
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
        phone: profileForm.phone,
        phone_e164: phone
      }))
      
      if (data.has_address === true || user?.has_address === true) onClose()
      else setView('address')
    } catch (error) {
      const message = translateAuthError(error.response?.data, t, 'completeProfile.completeFailed')
      setNotice({ type: 'error', message })
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSubmit = async (e, payload) => {
    e.preventDefault()
    const formData = payload || addressForm
    const cleanName = formData.full_name.trim()
    const phone = formData.phone
    const street = (formData.address_line1 || '').trim()
    const nextErrors = {}

    if (!cleanName) nextErrors.full_name = t('completeProfile.enterName')
    if (!formData.phone) {
      nextErrors.phone = t('completeProfile.enterPhone')
    } else if (!isValidCambodiaPhone(phone)) {
      nextErrors.phone = t('common.invalidPhone')
    }
    if (!formData.state) nextErrors.location = t('completeProfile.selectProvince')

    if (Object.keys(nextErrors).length) {
      setAddressErrors(nextErrors)
      setNotice({ type: 'error', message: Object.values(nextErrors)[0] || t('auth.pleaseFillAllFields') })
      return
    }

    setNotice(null)
    setAddressErrors({})
    setLoading(true)
    try {
      const { data } = await authApi.addresses.create({ ...formData, full_name: cleanName, phone, address_line1: street })
      
      const bonus = Number(data.signup_bonus_points || 0)
      if (bonus > 0) {
        setPendingWelcomeBonus(bonus)
      }

      updateUser({ has_address: true })
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      toast.success(t('completeProfile.addressSaved'))
      onClose()
      
      if (location.pathname === '/profile/complete') navigate('/', { replace: true })
    } catch (error) {
      const message = translateAuthError(error.response?.data, t, 'completeProfile.addressFailed')
      setNotice({ type: 'error', message })
      toast.error(message)
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
        "relative w-full bg-white shadow-2xl transition-all duration-300",
        "sm:max-w-[520px]",
        "rounded-t-[32px] sm:rounded-[40px] p-8 sm:p-10",
        "animate-slide-up sm:animate-fade-in",
        "mx-auto overflow-y-auto max-h-[95dvh]"
      )}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          disabled={loading || googleLoading || telegramLoading}
          aria-label={t('common.cancel')}
          className="absolute right-4 top-4 z-10 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
        >
          <X size={22} />
        </button>

        {notice?.type === 'success' && (
          <div className={cn(
            "mb-5 flex items-start gap-3 rounded-2xl border p-3.5 animate-fade-in",
            "border-emerald-100 bg-emerald-50 text-emerald-700"
          )}>
            <CheckCircle2 size={19} className="shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">{notice.message}</p>
          </div>
        )}

        {notice?.type === 'error' && (
          <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-3.5 text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p className="text-sm font-semibold leading-relaxed">{notice.message}</p>
          </div>
        )}

        {view === 'choice' && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-24 h-24 rounded-[30px] bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center text-pink-600 mb-8 shadow-sm">
              <UserCircle2 size={52} strokeWidth={1.2} />
            </div>

            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-slate-800 leading-tight mb-4">
              {title}
            </h2>
            
            <p className="text-[16px] font-medium text-slate-400 leading-relaxed mb-10 px-6">
              {description}
            </p>

            <div className="w-full space-y-4">
              <button
                onClick={() => setView('login')}
                className="w-full h-14 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-[20px] text-[16px] font-semibold tracking-normal transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200"
              >
                <LogIn size={22} />
                {t('auth.login')}
              </button>
              
              <button
                onClick={() => setView('register')}
                className="w-full h-14 flex items-center justify-center gap-2 border-2 border-slate-100 bg-white text-slate-700 rounded-[20px] text-[16px] font-semibold tracking-normal transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                {t('auth.register')}
                <ChevronRight size={20} className="text-slate-400" />
              </button>
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="animate-fade-in py-2">
            <h2 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-slate-800 mb-3">{t('auth.welcome')}</h2>
            <p className="text-[16px] font-medium text-slate-400 mb-8">{t('auth.loginSubtitle')}</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="mb-2.5 block text-xs font-semibold tracking-normal text-slate-600">{t('auth.emailOrUsername')}</label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <Mail size={20} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={lf.username} 
                    onChange={(e) => setLf(f => ({ ...f, username: e.target.value }))}
                    placeholder={t('auth.emailOrUsernamePlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-semibold tracking-normal text-slate-600">{t('auth.password')}</label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-5 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50 transition-all duration-300">
                  <Lock size={20} className="text-slate-400" />
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    value={lf.password} 
                    onChange={(e) => setLf(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-pink-600 transition-colors">
                    {showPass ? <Eye size={19} /> : <EyeOff size={19} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 mt-2 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-xl text-[15px] font-semibold tracking-normal transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('auth.login')} <ChevronRight size={20} strokeWidth={3} /></>}
              </button>
            </form>

            <div className="flex items-center gap-4 my-5">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">{t('common.or')}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {googleFallback ? <div className="flex min-w-0 items-center justify-center overflow-hidden" ref={googleFallbackRef} /> : <button 
                onClick={openGoogleLogin} 
                className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-[15px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
              >
                {googleLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : <GoogleMark size={20} />}
                {t('auth.google')}
              </button>}
              <button 
                onClick={() => {
                  setNotice(null)
                  setTelegramOpen(true)
                  setView('telegram-choice')
                }} 
                className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-[15px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
              >
                <Send size={20} className="text-[#2AABEE]" fill="#2AABEE" />
                {t('auth.telegram')}
              </button>
            </div>

            <p className="text-center text-[15px] font-medium text-slate-500">
              {t('auth.noAccount')}{' '}
              <button onClick={() => setView('register')} className="font-semibold text-[#EC4D97] hover:underline underline-offset-4 transition-all">{t('auth.register')}</button>
            </p>
          </div>
        )}

        {view === 'register' && (
          <div className="animate-fade-in py-2">
            <h2 className="text-[26px] sm:text-[32px] font-bold tracking-tight text-slate-800 mb-3">{t('auth.createAccount')}</h2>
            <p className="text-[16px] font-medium text-slate-400 mb-8">{t('auth.createAccountSubtitle')}</p>

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="mb-2.5 block text-xs font-semibold tracking-normal text-slate-600">{t('auth.fullName')}</label>
                <div className={cn(
                  "flex h-12 items-center gap-3 rounded-xl border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.full_name ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <User size={20} className="text-slate-400" />
                  <input 
                    type="text" 
                    value={rf.full_name} 
                    onChange={(e) => setRf(f => ({ ...f, full_name: e.target.value }))}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
                {registerErrors.full_name && (
                  <p className="mt-1.5 px-1 text-[12px] font-semibold text-red-500 animate-fade-in">
                    {registerErrors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-semibold tracking-normal text-slate-600">{t('auth.email')}</label>
                <div className={cn(
                  "flex h-12 items-center gap-3 rounded-xl border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.email ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <Mail size={20} className="text-slate-400" />
                  <input 
                    type="email" 
                    value={rf.email} 
                    onChange={(e) => setRf(f => ({ ...f, email: e.target.value }))}
                    placeholder={t('auth.emailExample')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                </div>
                {registerErrors.email && (
                  <p className="mt-1.5 px-1 text-[12px] font-semibold text-red-500 animate-fade-in">
                    {registerErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-semibold tracking-normal text-slate-600">{t('auth.password')}</label>
                <div className={cn(
                  "flex h-12 items-center gap-3 rounded-xl border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.password ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <Lock size={20} className="text-slate-400" />
                  <input 
                    type={showPass ? 'text' : 'password'} 
                    value={rf.password} 
                    onChange={(e) => setRf(f => ({ ...f, password: e.target.value }))}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 hover:text-pink-600 transition-colors">
                    {showPass ? <Eye size={19} /> : <EyeOff size={19} />}
                  </button>
                </div>
                {registerErrors.password && (
                  <p className="mt-1.5 px-1 text-[12px] font-semibold text-red-500 animate-fade-in">
                    {registerErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2.5 block text-xs font-semibold tracking-normal text-slate-600">{t('auth.confirmPassword')}</label>
                <div className={cn(
                  "flex h-12 items-center gap-3 rounded-xl border bg-slate-50/50 px-5 transition-all duration-300",
                  registerErrors.confirm_password ? "border-red-200 bg-red-50/30" : "border-slate-200 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                )}>
                  <Lock size={20} className="text-slate-400" />
                  <input 
                    type={showConfirm ? 'text' : 'password'} 
                    value={rf.confirm_password} 
                    onChange={(e) => setRf(f => ({ ...f, confirm_password: e.target.value }))}
                    placeholder={t('auth.confirmPassword')}
                    className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-slate-400 hover:text-pink-600 transition-colors">
                    {showConfirm ? <Eye size={19} /> : <EyeOff size={19} />}
                  </button>
                </div>
                {registerErrors.confirm_password && (
                  <p className="mt-1.5 px-1 text-[12px] font-semibold text-red-500 animate-fade-in">
                    {registerErrors.confirm_password}
                  </p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 mt-2 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-xl text-[15px] font-semibold tracking-normal transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
              >
                {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('auth.createAccount')} <ChevronRight size={20} strokeWidth={3} /></>}
              </button>
            </form>

            <div className="flex items-center gap-4 my-5">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">{t('common.or')}</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {googleFallback ? <div className="flex min-w-0 items-center justify-center overflow-hidden" ref={googleFallbackRef} /> : <button 
                onClick={openGoogleLogin} 
                className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-[15px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
              >
                {googleLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : <GoogleMark size={20} />}
                {t('auth.google')}
              </button>}
              <button 
                onClick={() => {
                  setNotice(null)
                  setTelegramOpen(true)
                  setView('telegram-choice')
                }}
                className="flex h-12 items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-[15px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
              >
                <Send size={20} className="text-[#2AABEE]" fill="#2AABEE" />
                {t('auth.telegram')}
              </button>
            </div>

            <p className="text-center text-[15px] font-medium text-slate-500">
              {t('auth.haveAccount')}{' '}
              <button onClick={() => setView('login')} className="font-semibold text-[#EC4D97] hover:underline underline-offset-4 transition-all">{t('auth.logIn')}</button>
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

              <h2 className="text-[24px] sm:text-[26px] font-semibold tracking-normal text-slate-900 mb-2">
                {t('verifyEmail.title')}
              </h2>
              <p className="text-[15px] font-medium text-slate-500 mb-5 max-w-[320px]">
                {t('verifyEmail.subtitle')}
                <span className="block font-medium text-slate-800 mt-1 truncate">{rf.email}</span>
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
                        "w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 text-center text-xl font-semibold transition-all outline-none",
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
                    className="mt-1 text-sm font-semibold text-[#EC4D97] hover:underline underline-offset-4 disabled:opacity-50"
                  >
                    {resending ? t('verifyEmail.sending') : t('verifyEmail.resendCode')}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || digits.join('').length < 4}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-[#EC197A] text-white rounded-xl text-[15px] font-semibold tracking-normal transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] shadow-lg shadow-pink-200 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={22} className="animate-spin" /> : <>{t('verifyEmail.verify')} <ChevronRight size={20} strokeWidth={3} /></>}
                </button>
              </form>

              <div className="mt-10 flex items-center justify-center gap-2 text-[13px] font-medium text-slate-400">
                <LockKeyhole size={16} />
                {t('verifyEmail.securityNote')}
              </div>
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div className="animate-fade-in">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-pink-50 text-[#EC4D97] shadow-sm">
                <Sparkles size={28} strokeWidth={1.5} />
              </div>
              <h2 className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-slate-800 mb-2">
                {t('completeProfile.title')}
              </h2>
              <p className="text-[14px] font-medium leading-relaxed text-slate-400 max-w-[400px]">
                {t('completeProfile.subtitle')}
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center gap-4 rounded-[24px] border border-slate-100 bg-slate-50/30 p-4 transition-colors hover:bg-slate-50/50">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-md ring-1 ring-slate-100">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-pink-500">
                        {profileForm.full_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-[2px] border-white bg-[#EC197A] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                  >
                    <Camera size={12} fill="currentColor" />
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
                <div className="min-w-0 text-left">
                  <p className="text-[15px] font-bold text-slate-800">{t('completeProfile.profilePhoto')}</p>
                  <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-slate-400">
                    {t('completeProfile.photoHint') || t('completeProfile.chooseImage')}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {t('auth.fullName')} <span className="text-pink-600">*</span>
                  </label>
                  <div className={cn(
                    "flex h-14 items-center gap-4 rounded-[20px] border px-5 transition-all duration-300",
                    profileErrors.full_name ? "border-red-500 bg-red-50/30 ring-4 ring-red-50" : "border-slate-200 bg-slate-50/50 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50"
                  )}>
                    <UserRound size={20} className="text-slate-400" />
                    <input 
                      value={profileForm.full_name}
                      onChange={(e) => {
                        setProfileForm(f => ({ ...f, full_name: e.target.value }))
                        setProfileErrors(errors => ({ ...errors, full_name: '' }))
                      }}
                      placeholder={t('auth.fullNamePlaceholder')}
                      className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  {profileErrors.full_name && (
                    <p className="mt-1.5 px-2 text-[12px] font-semibold text-red-500 animate-fade-in">
                      {profileErrors.full_name}
                    </p>
                  )}
                </div>

                <div>
                  <PhoneInput 
                    required
                    label={t('auth.phoneNumber')}
                    value={profileForm.phone}
                    onChange={(e) => {
                      setProfileForm(f => ({ ...f, phone: e.target.value, phone_e164: e.target.e164 }))
                      setProfileErrors(errors => ({ ...errors, phone: '' }))
                    }}
                    error={profileErrors.phone}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div ref={genderDropdownRef} className="relative">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {t('completeProfile.gender')} <span className="text-pink-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                      className={cn(
                        "flex h-14 w-full items-center justify-between gap-4 rounded-[20px] border px-5 transition-all duration-300",
                        profileErrors.gender ? "border-red-500 bg-red-50/30 ring-4 ring-red-50" : "border-slate-200 bg-slate-50/50 hover:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-50",
                        isGenderDropdownOpen && "border-pink-300 bg-white ring-4 ring-pink-50"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <UsersRound size={20} className="text-slate-400 shrink-0" />
                        <span className={cn("truncate text-[15px] font-semibold", profileForm.gender ? "text-slate-800" : "text-slate-400")}>
                          {profileForm.gender ? t(GENDER_OPTIONS.find(o => o.value === profileForm.gender)?.labelKey) : t('completeProfile.selectGender')}
                        </span>
                      </div>
                      <ChevronDown size={18} className={cn("text-slate-400 transition-transform duration-300", isGenderDropdownOpen && "rotate-180")} />
                    </button>

                    {isGenderDropdownOpen && (
                      <div className="absolute left-0 top-[calc(100%+8px)] z-[60] w-full overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="py-2">
                          {GENDER_OPTIONS.filter(o => o.value !== '').map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setProfileForm(f => ({ ...f, gender: opt.value }))
                                setProfileErrors(errors => ({ ...errors, gender: '' }))
                                setIsGenderDropdownOpen(false)
                              }}
                              className={cn(
                                "flex w-full items-center px-5 py-3 text-left text-[14px] font-semibold transition-colors",
                                profileForm.gender === opt.value ? "bg-pink-50 text-[#EC197A]" : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {t(opt.labelKey)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {profileErrors.gender && (
                      <p className="mt-1.5 px-2 text-[12px] font-semibold text-red-500 animate-fade-in">
                        {profileErrors.gender}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {t('completeProfile.referralCodeOptional')}
                    </label>
                    <div className="flex h-14 items-center gap-4 rounded-[20px] border border-slate-200 bg-slate-50/50 px-5 transition-all duration-300 focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50">
                      <Sparkles size={20} className="text-slate-400" />
                      <input 
                        value={profileForm.friend_referral_code}
                        onChange={(e) => setProfileForm(f => ({ ...f, friend_referral_code: e.target.value.toUpperCase() }))}
                        placeholder="CODE"
                        className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-[20px] bg-[#EC197A] text-[15px] font-bold uppercase tracking-wider text-white shadow-[0_10px_25px_rgba(236,25,122,0.2)] transition-all hover:bg-[#D9166F] hover:shadow-[0_12px_30px_rgba(236,25,122,0.25)] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : <>{t('common.next')} <ChevronRight size={22} strokeWidth={3} /></>}
              </button>
            </form>
          </div>
        )}

        {view === 'address' && (
          <AddressForm
            address={null}
            defaultContact={{
              full_name: addressForm.full_name || profileForm.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' '),
              phone: addressForm.phone || profileForm.phone || user?.phone,
            }}
            isFirstAddress
            isSaving={loading}
            onSave={(payload) => handleAddressSubmit({ preventDefault: () => {} }, payload)}
            onClose={onClose}
          />
        )}

        <div className="mt-5 flex justify-center">
          <button
            onClick={() => {
              if (loading) return
              if (view === 'profile' || view === 'address') onClose()
              else if (view === 'choice') onClose()
              else setView('choice')
            }}
            className="text-[14px] font-semibold text-slate-400 hover:text-slate-600 transition-colors tracking-normalst"
          >
            {view === 'choice' || view === 'profile' || view === 'address' ? t('common.cancel') : t('common.back')}
          </button>
        </div>
      </div>

      {telegramOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-white text-center shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Header with reference-like UI */}
            <div className="relative p-8 pb-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-sky-50 text-sky-500 mb-5 shadow-sm">
                <Send size={32} fill="#2AABEE" className="ml-0.5" />
              </div>
              <h3 className="text-[22px] font-bold tracking-tight text-slate-900">{t('auth.continueWithTelegram')}</h3>
              <p className="mt-3 text-[14px] font-medium leading-relaxed text-slate-500 px-4">
                {t('auth.telegramLoginSubtitle')}
              </p>
            </div>

            <div className="p-6 pt-5">
              {view === 'telegram-verify' ? (
                <div className="space-y-5 animate-fade-in">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-left">
                    <div className="flex items-center gap-3 text-sky-600 mb-2">
                      <Globe size={18} />
                      <span className="text-[13px] font-bold uppercase tracking-wider">{t('auth.verificationInfo')}</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-medium text-slate-600 flex justify-between">
                        <span>{t('auth.targetBot')}</span>
                        <span className="font-bold text-slate-800">@{telegramBotUsername}</span>
                      </p>
                      <p className="text-[13px] font-medium text-slate-600 flex justify-between">
                        <span>{t('auth.status')}</span>
                        <span className={cn(
                          "font-bold",
                          tgStatus.has_chat ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {tgStatus.has_chat ? t('auth.connected') : t('auth.waiting')}
                        </span>
                      </p>
                    </div>
                  </div>

                  <a 
                    href={tgBotLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-[#2AABEE] text-[15px] font-bold text-white shadow-lg shadow-sky-100 transition-all hover:bg-[#229ED9] hover:shadow-sky-200 active:scale-[0.98]"
                  >
                    <ExternalLink size={20} />
                    {t('auth.openTelegramBot')}
                  </a>
                  
                  <div className="flex items-center gap-2 justify-center py-2">
                    <Loader2 size={16} className="animate-spin text-sky-400" />
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                      {t('auth.waitingForHandshake')}
                    </span>
                  </div>
                </div>
              ) : view === 'telegram-otp' ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-slate-500 mb-4">
                      {t('auth.otpSentToTelegram', { phone: tgPhone })}
                    </p>
                    <div className="grid grid-cols-6 gap-2">
                      {tgOtp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => inputsRef.current[i] = el}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(-1)
                            const newOtp = [...tgOtp]
                            newOtp[i] = val
                            setTgOtp(newOtp)
                            if (val && i < 5) inputsRef.current[i + 1]?.focus()
                            if (newOtp.every(d => d !== '')) handleTgOtpSubmit(newOtp.join(''))
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !tgOtp[i] && i > 0) {
                              inputsRef.current[i - 1]?.focus()
                            }
                          }}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 text-center text-[18px] font-bold text-slate-800 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50 transition-all outline-none"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTgOtpSubmit(tgOtp.join(''))}
                    disabled={telegramLoading || tgOtp.some(d => !d)}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-[#EC197A] text-[15px] font-bold text-white shadow-lg shadow-pink-100 transition-all hover:bg-[#D9166F] disabled:opacity-50"
                  >
                    {telegramLoading ? <Loader2 size={22} className="animate-spin" /> : t('auth.verifyAndLogin')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-6 bg-slate-50/50 rounded-[28px] border border-slate-100/80 min-h-[140px]">
                  <div className="min-h-[60px] flex items-center justify-center w-full">
                    {telegramLoginEnabled ? (
                      <div ref={telegramWidgetRef} className="flex justify-center scale-110" />
                    ) : (
                      <p className="text-sm font-medium text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-100">
                        {t('auth.telegramNotConfiguredShort')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setTelegramOpen(false)
                  stopTelegramPolling()
                  if (view.startsWith('telegram-')) setView('login')
                }}
                className="mt-6 w-full py-2 text-[14px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLocationPicker && (
        <LocationPicker 
          adminData={adminData}
          loadingAdminData={loadingAdminData}
          onSelect={(data) => {
            setAddressForm(f => ({ ...f, ...data }))
            setAddressErrors(errors => ({ ...errors, location: '' }))
            setShowLocationPicker(false)
          }}
          onClose={() => setShowLocationPicker(false)} 
        />
      )}
    </div>
  )
}
