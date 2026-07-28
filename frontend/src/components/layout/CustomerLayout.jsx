import { Suspense, useState, useEffect, startTransition } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  ShoppingCart,
  ClipboardList,
  User,
  Heart,
  Gift,
  MapPin,
  Percent,
  Star,
  Lock,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  Search,
  X,
  ShoppingBag,
  ChevronDown,
  Facebook,
  Instagram,
  Youtube,
  LayoutDashboard,
  Menu,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cn, formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import HeaderActionIcons from '@/components/customer/HeaderActionIcons'
import HeaderBrandMark from '@/components/customer/HeaderBrandMark'
import InstallAppBanner from '@/components/customer/InstallAppBanner'
import BottomNavigation from '@/components/BottomNavigation'

const DESKTOP_NAV_KEYS = [
  { path: '/', key: 'nav.home', exact: true },
  { path: '/shop', key: 'nav.shop' },
  { path: '/profile/rewards', key: 'profile.rewards' },
  { path: '/shop?filter=flash_sale', key: 'home.flashSale' },
  { path: '/shop?filter=new_arrival', key: 'nav.newArrivals' },
]

const ACCOUNT_MENU_SECTIONS = [
  [
    { path: '/profile', key: 'profile.accountOverview', icon: Home },
    { path: '/my-orders', key: 'nav.orders', icon: ClipboardList },
    { path: '/address-book', key: 'profile.addresses', icon: MapPin },
    { path: '/wishlist', key: 'wishlist.title', icon: Heart },
    { path: '/profile/rewards', key: 'profile.rewards', icon: Gift },
    { path: '/profile?view=coupons', key: 'profile.coupons', icon: Percent },
    { path: '/profile?view=reviews', key: 'profile.reviews', icon: Star },
  ],
  [
    { path: '/profile/edit', key: 'profile.editProfile', icon: User },
    { path: '/profile?view=password', key: 'profile.passwordSecurity', icon: Lock },
    { path: '/profile?view=payment', key: 'profile.paymentMethods', icon: CreditCard },
    { path: '/profile?view=notifications', key: 'profile.notifications', icon: Bell },
    { path: '/profile?view=help', key: 'profile.helpCenter', icon: HelpCircle },
  ],
]

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸' },
  { code: 'km', label: 'Khmer', short: 'KM', flag: '🇰🇭' },
]

function LanguageFlag({ code, className = '' }) {
  if (code === 'km') {
    return (
      <span className={cn('inline-flex h-7 w-7 overflow-hidden rounded-full shadow-sm ring-1 ring-black/10', className)} aria-hidden="true">
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <clipPath id="khmer-flag-circle-header">
            <circle cx="32" cy="32" r="32" />
          </clipPath>
          <g clipPath="url(#khmer-flag-circle-header)">
            <path fill="#2F46A3" d="M0 0h64v64H0z" />
            <path fill="#E81F2A" d="M0 18h64v28H0z" />
            <g fill="#fff" stroke="#111827" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round">
              <path d="M10 47h44v3H10z" />
              <path d="M13 43h38v4H13z" />
              <path d="M17 39h30v4H17z" />
              <path d="M20 35h24v4H20z" />
              <path d="M23 30h5v9h-5zM36 30h5v9h-5zM29 24h6v15h-6z" />
              <path d="M28 24l4-12 4 12zM21.5 30l4-10 4 10zM34.5 30l4-10 4 10z" />
              <path d="M31 12h2M30.5 15h3M30 18h4M29.5 21h5" />
              <path d="M24 22h3M23.5 25h4M37 22h3M36.5 25h4" />
              <path d="M15 43h34M18 39h28M21 35h22M24 47v-7M30 47V30M34 47V30M40 47v-7" fill="none" />
              <path d="M19 47v-4M45 47v-4M27 39v-9M37 39v-9" fill="none" />
            </g>
          </g>
        </svg>
      </span>
    )
  }

  return (
    <span className={cn('inline-flex h-7 w-7 overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/10', className)} aria-hidden="true">
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <clipPath id="english-flag-circle-header">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <g clipPath="url(#english-flag-circle-header)">
          <path fill="#fff" d="M0 0h64v64H0z" />
          {[0, 2, 4, 6, 8, 10, 12].map((row) => (
            <path key={row} fill="#B22234" d={`M0 ${row * 4.92}h64v4.92H0z`} />
          ))}
          <path fill="#3C3B6E" d="M0 0h34.5v34.5H0z" />
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: row % 2 === 0 ? 6 : 5 }).map((__, col) => (
              <circle
                key={`${row}-${col}`}
                cx={4 + col * 5.4 + (row % 2 ? 2.7 : 0)}
                cy={3.8 + row * 3.2}
                r="0.9"
                fill="#fff"
              />
            ))
          )}
        </g>
      </svg>
    </span>
  )
}

const DEFAULT_FOOTER_MENUS = {
  customerService: {
    titleKey: 'footer.customerService',
    title: 'Customer Service',
    title_km: 'សេវាកម្មអតិថិជន',
    items: [
      { label: 'Contact Us', label_km: 'ទំនាក់ទំនងយើង', labelKey: 'footer.contactUs', url: 'mailto:hello@shadowshop.com', enabled: true },
      { label: 'FAQs', label_km: 'សំណួរញឹកញាប់', labelKey: 'footer.faqs', url: '/profile?view=help', enabled: true },
      { label: 'Shipping Policy', label_km: 'គោលការណ៍ដឹកជញ្ជូន', labelKey: 'footer.shippingPolicy', url: 'https://shadowshop.com/shipping-policy', enabled: true },
      { label: 'Return & Refund', label_km: 'ការត្រឡប់ & សំណង', labelKey: 'footer.returnRefund', url: 'https://shadowshop.com/return-refund', enabled: true },
      { label: 'Terms & Conditions', label_km: 'លក្ខខណ្ឌ', labelKey: 'footer.terms', url: 'https://shadowshop.com/terms', enabled: true },
    ],
  },
  information: {
    titleKey: 'footer.information',
    title: 'Information',
    title_km: 'ព័ត៌មាន',
    items: [
      { label: 'About Us', label_km: 'អំពីយើង', labelKey: 'footer.aboutUs', url: 'https://shadowshop.com/about', enabled: true },
      { label: 'Privacy Policy', label_km: 'គោលការណ៍ឯកជនភាព', labelKey: 'footer.privacyPolicy', url: 'https://shadowshop.com/privacy', enabled: true },
      { label: 'Careers', label_km: 'ការងារ', labelKey: 'footer.careers', url: 'https://shadowshop.com/careers', enabled: true },
      { label: 'Blog', label_km: 'ប្លក់', labelKey: 'footer.blog', url: 'https://shadowshop.com/blog', enabled: true },
      { label: 'Shop All Products', label_km: 'ទិញផលិតផលទាំងអស់', labelKey: 'footer.sitemap', url: '/shop', enabled: true },
    ],
  },
}

const DEFAULT_SOCIAL_LINKS = [
  { platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/shadowshop', enabled: true },
  { platform: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@shadowshop', enabled: true },
  { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/shadowshop', enabled: true },
  { platform: 'youtube', label: 'YouTube', url: 'https://youtube.com/@shadowshop', enabled: true },
]

function TikTokIcon({ size = 17, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .56.04.83.1v-3.5a6.37 6.37 0 0 0-.83-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.2 8.2 0 0 0 4.76 1.52V6.8a4.84 4.84 0 0 1-1-.11z" />
    </svg>
  )
}

const SOCIAL_ICON_MAP = {
  facebook: Facebook,
  tiktok: TikTokIcon,
  instagram: Instagram,
  youtube: Youtube,
}

function normalizeFooterMenus(value = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_FOOTER_MENUS).map(([sectionKey, section]) => {
      const savedSection = value?.[sectionKey] || {}
      const savedItems = Array.isArray(savedSection.items) ? savedSection.items : []
      const items = savedItems.length > 0 ? savedItems : section.items

      return [sectionKey, {
        title: savedSection.title || section.title || '',
        title_km: savedSection.title_km || section.title_km || '',
        titleKey: section.titleKey,
        items: items.map((item, index) => ({
          label: item.label || '',
          label_km: item.label_km || section.items[index]?.label_km || '',
          labelKey: item.labelKey || section.items[index]?.labelKey || '',
          url: item.url || section.items[index]?.url || '',
          enabled: item.enabled !== false,
        })),
      }]
    })
  )
}

function normalizeSocialLinks(value = {}) {
  const saved = Array.isArray(value?.social_links) ? value.social_links : []
  const source = saved.length > 0 ? saved : DEFAULT_SOCIAL_LINKS
  return source.map((item, index) => {
    const defaults = DEFAULT_SOCIAL_LINKS.find((entry) => entry.platform === item.platform) || {}
    return {
      platform: item.platform || defaults.platform || `custom_${index + 1}`,
      label: item.label || defaults.label || 'Social',
      url: item.url || defaults.url || '',
      icon_url: item.icon_url || '',
      enabled: item.enabled !== false,
    }
  }).filter((item) => item.enabled !== false && item.url)
}

function resolveFooterText({ km, en, fallbackKey }, isKhmer, t) {
  if (isKhmer) return km || en || (fallbackKey ? t(fallbackKey) : '')
  return en || km || (fallbackKey ? t(fallbackKey) : '')
}

function FooterMenuItem({ item, children }) {
  if (item.url) {
    return (
      <a href={item.url} className="block transition hover:text-white">
        {children}
      </a>
    )
  }

  return <p>{children}</p>
}

export function Logo({ compact = false, inverse = false, iconOnly = false, logoUrl = null, storeName = 'Shadow Shop' }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className={cn('object-contain rounded-2xl', compact ? 'h-11 w-11' : 'h-10 w-10')} />
      ) : (
        <div className={cn('flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200', compact ? 'h-11 w-11' : 'h-10 w-10')}>
          <ShoppingBag size={compact ? 19 : 21} />
        </div>
      )}
      {!iconOnly && (
        <div>
          <div className={cn('font-black tracking-tight', inverse ? 'text-white' : 'text-gray-950', compact ? 'text-base' : 'text-xl')}>
            {storeName.includes(' ') ? (
              <>{storeName.split(' ')[0]} <span className="text-pink-600">{storeName.split(' ').slice(1).join(' ')}</span></>
            ) : (
              <span className="text-pink-600">{storeName}</span>
            )}
          </div>
          {!compact && <div className={cn('text-xs font-medium', inverse ? 'text-slate-300' : 'text-gray-400')}>Wholesale Cosmetics</div>}
        </div>
      )}
    </Link>
  )
}

function isItemActive(location, item) {
  if (item.exact) return location.pathname === item.path
  if (item.path === '/profile/rewards') return location.pathname.startsWith('/profile/rewards')
  const [path, query] = item.path.split('?')
  if (query) return location.pathname === path && location.search === `?${query}`
  return location.pathname === path && !location.search
}

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [headerSearch, setHeaderSearch] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const isStaff = isAuthenticated && user?.role && user.role !== 'customer'
  const cartItems = useCartStore((s) => s.items)
  const selectedProductIds = useCartStore((s) => s.selectedProductIds)
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const isKhmer = i18n.language === 'km'
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const currentLanguage = LANGUAGE_OPTIONS.find((language) => language.code === (isKhmer ? 'km' : 'en')) || LANGUAGE_OPTIONS[0]
  const selectLanguage = (code) => {
    i18n.changeLanguage(code)
    setIsLanguageMenuOpen(false)
  }
  const handleLogout = async () => {
    setIsAccountMenuOpen(false)
    await logout()
    navigate('/login')
  }

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const logoUrl = siteSettings?.logo_url || null
  const storeName = siteSettings?.store_name || 'Shadow Shop'
  const storePhone = siteSettings?.store_phone || ''
  const storeEmail = siteSettings?.store_email || ''
  const footerMenus = normalizeFooterMenus(siteSettings?.footer_menus)
  const socialLinks = normalizeSocialLinks(siteSettings?.footer_menus)

  useEffect(() => {
    if (siteSettings?.favicon_url) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = siteSettings.favicon_url
    }
  }, [siteSettings?.favicon_url])

  useEffect(() => {
    setIsAccountMenuOpen(false)
  }, [location.pathname, location.search])

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = cartItems.reduce((sum, i) => sum + i.product.retail_price * i.quantity, 0)
  const isHome = location.pathname === '/'
  const hasCheckoutItems = cartItems.some((item) => selectedProductIds.includes(item.product.id))
  const isMyOrdersPage = location.pathname === '/my-orders'
  const myOrdersTab = new URLSearchParams(location.search).get('tab') === 'completed' ? 'completed' : 'ongoing'
  const hideMobileHeader =
    location.pathname === '/shop' ||
    location.pathname === '/search' ||
    location.pathname === '/wishlist' ||
    (location.pathname === '/cart' && cartItems.length > 0) ||
    (location.pathname === '/checkout' && hasCheckoutItems) ||
    location.pathname.startsWith('/profile') ||
    location.pathname === '/address-book' ||
    location.pathname.startsWith('/product/') ||
    location.pathname.startsWith('/product-set/') ||
    location.pathname.startsWith('/my-orders/')
  const hideMobileBottomNav = location.pathname === '/cart' || location.pathname === '/search' || location.pathname === '/wishlist' || location.pathname === '/checkout' || location.pathname === '/address-book' || location.pathname === '/profile/edit' || location.pathname === '/profile/complete' || location.pathname.startsWith('/product/') || location.pathname.startsWith('/product-set/')
  const mobileActiveTab = location.pathname === '/shop'
    ? 'products'
    : location.pathname.startsWith('/profile/rewards')
      ? 'rewards'
      : location.pathname.startsWith('/my-orders')
        ? 'orders'
        : location.pathname.startsWith('/profile')
          ? 'account'
          : 'home'
  const handleMobileNavChange = (tab) => {
    const routes = {
      home: '/',
      products: '/shop',
      rewards: '/profile/rewards',
      orders: '/my-orders',
      account: '/profile',
    }
    startTransition(() => navigate(routes[tab] || '/'))
  }
  const submitSearch = (e) => {
    e.preventDefault()
    const q = headerSearch.trim()
    if (!q) return
    setShowMobileSearch(false)
    navigate(`/shop?search=${encodeURIComponent(q)}`)
  }

  return (
    <div className={cn('flex min-h-screen flex-col bg-white text-gray-950 md:pb-0', hideMobileBottomNav ? '' : 'pb-[calc(104px+max(16px,env(safe-area-inset-bottom)))]')}>
      <header className={cn(
        'sticky top-0 z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur',
        hideMobileHeader && 'hidden md:block'
      )}>
        <div className="hidden md:block">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-5 py-3 xl:gap-4 xl:px-6">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsAccountMenuOpen((open) => !open)}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-2xl border text-gray-600 shadow-sm transition hover:border-pink-200 hover:text-pink-600',
                  isAccountMenuOpen ? 'border-pink-100 bg-pink-50 text-pink-600' : 'border-gray-200 bg-white'
                )}
                aria-label={isAccountMenuOpen ? 'Close account menu' : 'Open account menu'}
                aria-expanded={isAccountMenuOpen}
                title={isAccountMenuOpen ? 'Close account menu' : 'Open account menu'}
              >
                <Menu size={21} strokeWidth={2.5} />
              </button>

              {isAccountMenuOpen && (
                <div className="absolute left-0 top-full z-50 mt-3 w-[330px] overflow-hidden rounded-[24px] border border-gray-100 bg-white py-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                  {ACCOUNT_MENU_SECTIONS.map((section, sectionIndex) => (
                    <div key={sectionIndex} className={cn('px-3', sectionIndex > 0 && 'mt-3 border-t border-gray-100 pt-3')}>
                      {sectionIndex > 0 && (
                        <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                          {t('profile.accountMenu')}
                        </p>
                      )}
                      {section.map((item) => {
                        const Icon = item.icon
                        const active = location.pathname + location.search === item.path

                        return (
                          <Link
                            key={item.key}
                            to={item.path}
                            className={cn(
                              'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition',
                              active ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50 hover:text-pink-600'
                            )}
                          >
                            <Icon size={20} />
                            <span className="flex-1">{t(item.key)}</span>
                          </Link>
                        )
                      })}
                    </div>
                  ))}
                  {isAuthenticated && (
                    <div className="mt-3 border-t border-gray-100 px-3 pt-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-red-500 transition hover:bg-red-50"
                      >
                        <LogOut size={20} />
                        <span>{t('auth.logout')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="w-[174px] shrink-0 xl:w-[205px]">
              <Logo logoUrl={logoUrl} storeName={storeName} />
            </div>
            <form
              onSubmit={submitSearch}
              className="mx-auto flex h-11 min-w-[240px] flex-1 items-center rounded-xl border border-gray-200 bg-white shadow-sm transition focus-within:border-pink-300 focus-within:ring-4 focus-within:ring-pink-100 xl:max-w-xl"
            >
              <Search size={17} className="ml-4 text-gray-400" />
              <input
                type="search"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={t('header.searchPlaceholder')}
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
              />
              <button type="submit" className="shop-btn-primary mr-1.5 h-8 w-10 px-0 py-0">
                <Search size={16} />
              </button>
            </form>
            <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-gray-700 xl:gap-2.5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLanguageMenuOpen((open) => !open)}
                  className="flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 text-sm font-black text-gray-800 shadow-sm transition hover:border-pink-300 hover:text-pink-600"
                  title="Switch Language"
                  aria-haspopup="menu"
                  aria-expanded={isLanguageMenuOpen}
                >
                  <LanguageFlag code={currentLanguage.code} />
                  <span className="hidden xl:inline">{currentLanguage.label}</span>
                  <span className="xl:hidden">{currentLanguage.short}</span>
                  <ChevronDown size={15} className={cn('text-gray-500 transition-transform', isLanguageMenuOpen && 'rotate-180')} />
                </button>

                {isLanguageMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[22px] border border-gray-100 bg-white p-2 shadow-[0_12px_35px_rgba(15,23,42,0.14)]">
                    {LANGUAGE_OPTIONS.map((language) => {
                      const isActive = language.code === currentLanguage.code

                      return (
                        <button
                          key={language.code}
                          type="button"
                          onClick={() => selectLanguage(language.code)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-base font-black transition',
                            isActive ? 'bg-pink-50 text-pink-600' : 'text-gray-800 hover:bg-gray-50 hover:text-pink-600'
                          )}
                          role="menuitem"
                        >
                          <LanguageFlag code={language.code} />
                          <span className="flex-1">{language.label}</span>
                          <span className="text-sm font-black">{language.short}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <Link
                to="/wishlist"
                className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-gray-700 transition hover:border-pink-100 hover:bg-pink-50 hover:text-pink-600 2xl:w-auto 2xl:px-3"
                title={t('nav.wishlist')}
              >
                <span className="relative">
                  <Heart size={17} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-0.5 text-[10px] font-bold text-white ring-1 ring-white">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </span>
                <span className="hidden whitespace-nowrap 2xl:inline">{t('nav.wishlist')}</span>
              </Link>
              <Link
                to="/my-orders"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-gray-700 transition hover:border-pink-100 hover:bg-pink-50 hover:text-pink-600 2xl:w-auto 2xl:px-3"
                title={t('nav.orders')}
              >
                <ClipboardList size={17} />
                <span className="hidden whitespace-nowrap 2xl:inline">{t('nav.orders')}</span>
              </Link>
              <Link
                to="/profile"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-gray-700 transition hover:border-pink-100 hover:bg-pink-50 hover:text-pink-600 2xl:w-auto 2xl:px-3"
                title={t('nav.account')}
              >
                <User size={17} />
                <span className="hidden whitespace-nowrap 2xl:inline">{t('nav.account')}</span>
              </Link>
              <Link
                to="/cart"
                className="relative flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 shadow-sm transition hover:border-pink-200 hover:text-pink-600"
                title={t('nav.cart')}
              >
                <ShoppingCart size={19} className="shrink-0" />
                <span className="hidden 2xl:inline">{t('nav.cart')}</span>
                <span className="text-xs font-black text-gray-400">{formatCurrency(subtotal)}</span>
                {totalItems > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-600 px-1.5 text-xs font-bold text-white">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>
          <nav className="border-t border-gray-100">
            <div className="mx-auto flex max-w-[1500px] items-center gap-9 px-6">
              {DESKTOP_NAV_KEYS.map((item) => {
                const active = isItemActive(location, item)
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={cn(
                      'relative flex h-12 items-center gap-1 text-sm font-bold transition',
                      active ? 'text-pink-600' : 'text-gray-700 hover:text-pink-600'
                    )}
                  >
                    {t(item.key)}
                    {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-pink-600" />}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>

        {!hideMobileHeader && (
          <div className={cn('px-3 pb-2.5 pt-[calc(0.5rem+env(safe-area-inset-top))] md:hidden', isMyOrdersPage && 'px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]')}>
            {isMyOrdersPage ? (
              <div className="space-y-3">
                <div className="flex min-h-[48px] items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <HeaderBrandMark />
                    <h1 className="min-w-0 truncate text-left text-xl font-black text-gray-950">{t('orders.title')}</h1>
                  </div>
                  <HeaderActionIcons size="md" />
                </div>
                <div className="grid grid-cols-2 rounded-lg bg-gray-200 p-1">
                  {[
                    { key: 'ongoing', label: 'Ongoing' },
                    { key: 'completed', label: 'Completed' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => navigate(tab.key === 'completed' ? '/my-orders?tab=completed' : '/my-orders')}
                      className={cn(
                        'rounded-md py-2.5 text-sm font-black transition',
                        myOrdersTab === tab.key ? 'bg-pink-600 text-white shadow-lg shadow-pink-100' : 'text-gray-500'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5">
                  {logoUrl ? (
                    <img src={logoUrl} alt={storeName} className="h-11 w-11 shrink-0 rounded-2xl object-contain shadow-sm" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200">
                      <ShoppingBag size={19} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-black leading-tight text-gray-950">{storeName}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-wide text-pink-500">{t('header.limitedOffer')}</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  aria-label={t('common.search')}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90',
                    'bg-gray-100 text-gray-600'
                  )}
                >
                  <Search size={19} />
                </button>
                <Link to="/wishlist" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:scale-90">
                  <Heart size={19} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-0.5 text-[9px] font-black text-white ring-[1.5px] ring-white">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </Link>
                <Link to="/cart" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-600 text-white shadow-sm shadow-pink-200 transition active:scale-90">
                  <ShoppingCart size={18} />
                  {totalItems > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-0.5 text-[9px] font-black text-white ring-[1.5px] ring-white">
                      {totalItems > 9 ? '9+' : totalItems}
                    </span>
                  )}
                </Link>
              </div>
            )}
            {showMobileSearch && (
              <form onSubmit={submitSearch} className="mt-2 flex items-center gap-2 rounded-2xl bg-gray-100 px-3 py-2.5 shadow-inner">
                <Search size={16} className="shrink-0 text-gray-400" />
                <input
                  type="search"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder={t('header.searchPlaceholder')}
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                />
                <button type="submit" className="rounded-full bg-pink-600 px-4 py-1.5 text-xs font-black text-white">
                  {t('common.search')}
                </button>
              </form>
            )}
          </div>
        )}
      </header>

      <main className={cn('flex-1', isHome || location.pathname === '/address-book' || location.pathname.startsWith('/profile') ? '' : 'mx-auto w-full max-w-[1500px] px-4 py-4 md:px-6 md:py-6')}>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="hidden bg-[#08172f] text-white md:block">
        <div className="mx-auto grid max-w-[1500px] grid-cols-4 gap-10 px-6 py-10">
          <div>
            <Logo inverse logoUrl={logoUrl} storeName={storeName} />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-300">
              {t('footer.tagline')}
            </p>
            {(storePhone || storeEmail) && (
              <div className="mt-4 space-y-1.5 text-sm text-slate-300">
                {storePhone ? <p>{storePhone}</p> : null}
                {storeEmail ? (
                  <a href={`mailto:${storeEmail}`} className="block transition hover:text-white">
                    {storeEmail}
                  </a>
                ) : null}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              {socialLinks.map((item) => {
                const Icon = SOCIAL_ICON_MAP[item.platform] || Facebook
                return (
                  <a
                    key={item.platform}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                  >
                    {item.icon_url ? (
                      <img src={item.icon_url} alt={item.label} className="h-6 w-6 object-contain" />
                    ) : (
                      <Icon size={18} />
                    )}
                  </a>
                )
              })}
            </div>
          </div>
          {Object.entries(footerMenus).map(([sectionKey, section]) => (
            <div key={sectionKey}>
              <h4 className="font-bold">
                {resolveFooterText(
                  { km: section.title_km, en: section.title, fallbackKey: section.titleKey },
                  isKhmer,
                  t,
                )}
              </h4>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                {section.items.filter((item) => item.enabled !== false).map((item, index) => (
                  <FooterMenuItem key={`${sectionKey}-${index}`} item={item}>
                    {resolveFooterText(
                      { km: item.label_km, en: item.label, fallbackKey: item.labelKey },
                      isKhmer,
                      t,
                    )}
                  </FooterMenuItem>
                ))}
              </div>
            </div>
          ))}
          <div>
            <h4 className="font-bold">{t('footer.downloadApp')}</h4>
            <p className="mt-4 text-sm text-slate-300">{t('footer.downloadAppText')}</p>
            <div className="mt-5 flex gap-3">
              <div className="rounded-xl border border-white/10 bg-white px-4 py-2 text-xs font-bold text-gray-950">App Store</div>
              <div className="rounded-xl border border-white/10 bg-white px-4 py-2 text-xs font-bold text-gray-950">Google Play</div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
          © 2026 Shadow Shop. {t('footer.rights')}.
        </div>
      </footer>

      {/* Back to Admin button — visible only to staff browsing the storefront */}
      {isStaff && (
        <button
          type="button"
          onClick={() => startTransition(() => navigate('/admin'))}
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-2xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-black/20 transition hover:bg-navy-700 active:scale-95 md:bottom-6"
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
        >
          <LayoutDashboard size={15} />
          Back to Admin
        </button>
      )}

      {!hideMobileBottomNav && (
        <BottomNavigation
          activeTab={mobileActiveTab}
          onChange={handleMobileNavChange}
          onHomeReselect={() => window.location.reload()}
          labels={{
            home: t('nav.home'),
            products: t('nav.shop'),
            rewards: t('profile.rewards'),
            orders: t('nav.orders'),
            account: t('nav.account'),
          }}
          ariaLabels={{
            home: t('nav.home'),
            products: t('nav.shop'),
            rewards: t('profile.rewards'),
            orders: t('nav.orders'),
            account: t('nav.account'),
          }}
        />
      )}

      <InstallAppBanner bottomOffset={!hideMobileBottomNav} />
    </div>
  )
}
