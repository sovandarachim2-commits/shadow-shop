import {
  Bell,
  Clock,
  Flame,
  Gift,
  Heart,
  Megaphone,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Truck,
  Zap,
} from 'lucide-react'

export const ANNOUNCEMENT_ICON_OPTIONS = [
  { key: '', label: 'None', Icon: null },
  { key: 'megaphone', label: 'Megaphone', Icon: Megaphone },
  { key: 'sparkles', label: 'Sparkles', Icon: Sparkles },
  { key: 'tag', label: 'Tag', Icon: Tag },
  { key: 'truck', label: 'Delivery', Icon: Truck },
  { key: 'gift', label: 'Gift', Icon: Gift },
  { key: 'flame', label: 'Hot Deal', Icon: Flame },
  { key: 'bell', label: 'Alert', Icon: Bell },
  { key: 'percent', label: 'Discount', Icon: Percent },
  { key: 'star', label: 'Featured', Icon: Star },
  { key: 'zap', label: 'Flash', Icon: Zap },
  { key: 'clock', label: 'Limited Time', Icon: Clock },
  { key: 'shield-check', label: 'Trusted', Icon: ShieldCheck },
  { key: 'heart', label: 'Favorite', Icon: Heart },
  { key: 'shopping-bag', label: 'Shop', Icon: ShoppingBag },
]

export const ANNOUNCEMENT_ICON_MAP = Object.fromEntries(
  ANNOUNCEMENT_ICON_OPTIONS.filter((item) => item.key && item.Icon).map((item) => [item.key, item.Icon])
)

export const ANNOUNCEMENT_PAGE_OPTIONS = [
  { key: 'home', label: 'Home (/)' },
  { key: 'shop', label: 'Shop (/shop)' },
  { key: 'product_detail', label: 'Product Details (/product/*)' },
  { key: 'cart', label: 'Cart (/cart)' },
  { key: 'checkout', label: 'Checkout (/checkout)' },
  { key: 'rewards', label: 'Rewards (/profile/rewards*)' },
  { key: 'orders', label: 'My Orders (/my-orders*)' },
  { key: 'wishlist', label: 'Wishlist (/wishlist)' },
  { key: 'profile', label: 'Profile (/profile*)' },
  { key: 'search', label: 'Search (/search)' },
]

export const ANNOUNCEMENT_COLOR_PRESETS = [
  { name: 'Midnight Ink', bg: '#111827', text: '#FFFFFF', icon: '#F472B6' },
  { name: 'Shadow Pink', bg: '#DB2777', text: '#FFFFFF', icon: '#FDE68A' },
  { name: 'Royal Plum', bg: '#6D28D9', text: '#FFFFFF', icon: '#FBCFE8' },
  { name: 'Soft Rose', bg: '#FDF2F8', text: '#831843', icon: '#DB2777' },
  { name: 'Emerald', bg: '#065F46', text: '#FFFFFF', icon: '#6EE7B7' },
  { name: 'Amber Gold', bg: '#FEF3C7', text: '#78350F', icon: '#D97706' },
]

export const ANNOUNCEMENT_GRADIENT_PRESETS = [
  {
    name: 'Pink Berry',
    css: 'linear-gradient(90deg, #db2777 0%, #9333ea 100%)',
    text: '#FFFFFF',
  },
  {
    name: 'Sunset Coral',
    css: 'linear-gradient(90deg, #f43f5e 0%, #f97316 100%)',
    text: '#FFFFFF',
  },
  {
    name: 'Midnight Velvet',
    css: 'linear-gradient(90deg, #0f172a 0%, #4c1d95 55%, #be185d 100%)',
    text: '#FFFFFF',
  },
  {
    name: 'Blush Silk',
    css: 'linear-gradient(90deg, #fce7f3 0%, #ede9fe 100%)',
    text: '#1F2937',
  },
]

export const DEFAULT_ANNOUNCEMENT_FORM = {
  title: '',
  message_en: '',
  message_km: '',
  mobile_message_en: '',
  mobile_message_km: '',
  icon: 'sparkles',
  link_url: '',
  link_text: '',
  link_text_km: '',
  open_in_new_tab: false,
  background_color: '#111827',
  text_color: '#FFFFFF',
  use_gradient: false,
  gradient_css: 'linear-gradient(90deg, #db2777 0%, #9333ea 100%)',
  font_size: 14,
  font_weight: 'medium',
  alignment: 'center',
  height: 40,
  padding_x: 16,
  border_radius: 0,
  icon_size: 16,
  icon_color: '#F472B6',
  show_close_button: false,
  animation_type: 'static',
  animation_speed: 5,
  animation_direction: 'left',
  transition_duration: 400,
  rotation_delay: 4000,
  reduced_motion: false,
  show_on_desktop: true,
  show_on_tablet: true,
  show_on_mobile: true,
  tablet_font_size: null,
  tablet_height: null,
  tablet_padding_x: null,
  tablet_alignment: '',
  mobile_font_size: null,
  mobile_height: null,
  mobile_padding_x: null,
  mobile_alignment: '',
  start_at: '',
  end_at: '',
  is_active: true,
  priority: 0,
  target_stores: [],
  target_delivery_areas: [],
  language_rule: 'all',
  page_display_mode: 'all',
  target_pages: [],
}

const DISMISS_STORAGE_KEY = 'shadow-shop-dismissed-announcements'
const SAFE_GRADIENT_RE = /^(linear|radial)-gradient\([a-zA-Z0-9#%,.\s()-]+\)$/
const KHMER_CHAR_RE = /[\u1780-\u17FF]/

export function hasKhmerText(text) {
  return KHMER_CHAR_RE.test(String(text || ''))
}

export function isSafeAnnouncementUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return false
  if (/[\r\n\0]/.test(raw)) return false
  const lower = raw.toLowerCase()
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('//')
  ) {
    return false
  }
  if (raw.startsWith('/')) return true
  return /^(https?:\/\/|mailto:|tel:)/i.test(raw)
}

export function getSafeGradientCss(css) {
  const raw = String(css || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (
    lower.includes('url(') ||
    lower.includes('expression(') ||
    /[;{}<>]/.test(raw) ||
    !SAFE_GRADIENT_RE.test(raw)
  ) {
    return ''
  }
  return raw
}

export function resolvePageKey(pathname = '/') {
  const path = String(pathname || '/').toLowerCase()
  if (path === '/' || path === '') return 'home'
  if (path.startsWith('/shop')) return 'shop'
  if (path.startsWith('/product/') || path.startsWith('/product-set/')) return 'product_detail'
  if (path.startsWith('/cart')) return 'cart'
  if (path.startsWith('/checkout') || path.startsWith('/order-success')) return 'checkout'
  if (path.startsWith('/profile/rewards') || path.startsWith('/lucky-box')) return 'rewards'
  if (path.startsWith('/my-orders')) return 'orders'
  if (path.startsWith('/wishlist')) return 'wishlist'
  if (path.startsWith('/profile') || path.startsWith('/address-book')) return 'profile'
  if (path.startsWith('/search')) return 'search'
  return 'other'
}

export function readDismissedAnnouncements() {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function dismissAnnouncementInStorage(announcement) {
  if (!announcement?.id) return {}
  const version = announcement.version || announcement.published_at || announcement.updated_at || '1'
  const current = readDismissedAnnouncements()
  const next = { ...current, [String(announcement.id)]: String(version) }
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota / private mode failures.
  }
  return next
}

export function isAnnouncementDismissed(announcement, dismissedMap = {}) {
  if (!announcement?.id) return false
  const storedVersion = dismissedMap[String(announcement.id)]
  if (!storedVersion) return false
  const currentVersion = String(
    announcement.version || announcement.published_at || announcement.updated_at || '1'
  )
  return storedVersion === currentVersion
}

export function isAnnouncementWithinSchedule(announcement, nowMs = Date.now()) {
  if (!announcement) return false
  if (announcement.start_at) {
    const startMs = Date.parse(announcement.start_at)
    if (!Number.isNaN(startMs) && startMs > nowMs) return false
  }
  if (announcement.end_at) {
    const endMs = Date.parse(announcement.end_at)
    if (!Number.isNaN(endMs) && endMs < nowMs) return false
  }
  return true
}

export function resolveAnnouncementPresentation(announcement, { device = 'desktop', language = 'en' } = {}) {
  if (!announcement) {
    return { visible: false, hiddenReason: 'No announcement data' }
  }

  const lang = language === 'km' ? 'km' : 'en'
  const langRule = (announcement.language_rule || 'all').toLowerCase()
  if (langRule === 'en' && lang !== 'en') {
    return { visible: false, hiddenReason: 'Hidden in Khmer mode (English Only rule)' }
  }
  if (langRule === 'km' && lang !== 'km') {
    return { visible: false, hiddenReason: 'Hidden in English mode (Khmer Only rule)' }
  }

  if (device === 'desktop' && announcement.show_on_desktop === false) {
    return { visible: false, hiddenReason: 'Hidden on Desktop by responsive settings' }
  }
  if (device === 'tablet' && announcement.show_on_tablet === false) {
    return { visible: false, hiddenReason: 'Hidden on Tablet by responsive settings' }
  }
  if (device === 'mobile' && announcement.show_on_mobile === false) {
    return { visible: false, hiddenReason: 'Hidden on Mobile by responsive settings' }
  }

  const enMsg = String(announcement.message_en || '').trim()
  const kmMsg = String(announcement.message_km || '').trim()
  const mobEnMsg = String(announcement.mobile_message_en || '').trim()
  const mobKmMsg = String(announcement.mobile_message_km || '').trim()

  let message = ''
  if (device === 'mobile') {
    if (lang === 'km') {
      message = mobKmMsg || kmMsg || mobEnMsg || enMsg
    } else {
      message = mobEnMsg || enMsg || mobKmMsg || kmMsg
    }
  } else if (lang === 'km') {
    message = kmMsg || enMsg
  } else {
    message = enMsg || kmMsg
  }

  const linkText =
    lang === 'km'
      ? String(announcement.link_text_km || announcement.link_text || '').trim()
      : String(announcement.link_text || announcement.link_text_km || '').trim()

  const toOptionalNum = (val) => (val === null || val === undefined || val === '' ? null : Number(val))

  const baseFontSize = Number(announcement.font_size || 14)
  const baseHeight = Number(announcement.height || 40)
  const basePaddingX = Number(announcement.padding_x ?? 16)
  const baseAlignment = announcement.alignment || 'center'

  let fontSize = baseFontSize
  let height = baseHeight
  let paddingX = basePaddingX
  let alignment = baseAlignment

  if (device === 'tablet') {
    fontSize = toOptionalNum(announcement.tablet_font_size) ?? baseFontSize
    height = toOptionalNum(announcement.tablet_height) ?? baseHeight
    paddingX = toOptionalNum(announcement.tablet_padding_x) ?? basePaddingX
    alignment = announcement.tablet_alignment || baseAlignment
  } else if (device === 'mobile') {
    fontSize = toOptionalNum(announcement.mobile_font_size) ?? baseFontSize
    height = toOptionalNum(announcement.mobile_height) ?? baseHeight
    paddingX = toOptionalNum(announcement.mobile_padding_x) ?? basePaddingX
    alignment = announcement.mobile_alignment || baseAlignment
  }

  const fontWeightMap = { normal: 400, medium: 500, bold: 700 }
  const fontWeight = fontWeightMap[announcement.font_weight] || 500

  const safeGradient = announcement.use_gradient ? getSafeGradientCss(announcement.gradient_css) : ''
  const backgroundStyle = safeGradient
    ? { backgroundImage: safeGradient, backgroundColor: announcement.background_color || '#111827' }
    : { backgroundColor: announcement.background_color || '#111827' }

  const safeUrl = isSafeAnnouncementUrl(announcement.link_url) ? String(announcement.link_url).trim() : ''

  return {
    visible: Boolean(message),
    hiddenReason: message ? '' : 'Message is empty',
    message,
    isKhmerText: lang === 'km' || hasKhmerText(message) || hasKhmerText(linkText),
    linkText,
    linkUrl: safeUrl,
    openInNewTab: Boolean(announcement.open_in_new_tab),
    fontSize,
    fontWeight,
    alignment,
    height,
    paddingX,
    borderRadius: Number(announcement.border_radius || 0),
    textColor: announcement.text_color || '#FFFFFF',
    icon: announcement.icon || '',
    iconSize: Number(announcement.icon_size || 16),
    iconColor: announcement.icon_color || announcement.text_color || '#FFFFFF',
    showCloseButton: announcement.show_close_button !== false,
    animationType: announcement.animation_type || 'static',
    animationSpeed: Math.max(1, Math.min(10, Number(announcement.animation_speed || 5))),
    animationDirection: announcement.animation_direction === 'right' ? 'right' : 'left',
    transitionDuration: Math.max(100, Math.min(5000, Number(announcement.transition_duration || 400))),
    rotationDelay: Math.max(1000, Math.min(30000, Number(announcement.rotation_delay || 4000))),
    reducedMotion: Boolean(announcement.reduced_motion),
    backgroundStyle,
  }
}

export function formatAnnouncementDate(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

