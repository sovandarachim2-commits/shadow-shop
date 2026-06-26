import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Grid,
  ShoppingCart,
  ClipboardList,
  User,
  Heart,
  Gift,
  Search,
  X,
  ShoppingBag,
  ChevronDown,
  Facebook,
  Instagram,
  Youtube,
  LayoutDashboard,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { cn, formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'

const MOBILE_NAV_ITEMS = [
  { path: '/', key: 'nav.home', icon: Home, exact: true },
  { path: '/shop', key: 'nav.shop', icon: Grid },
  { path: '/profile/rewards', key: 'profile.rewards', icon: Gift, center: true },
  { path: '/my-orders', key: 'nav.orders', icon: ClipboardList },
  { path: '/profile', key: 'nav.account', icon: User },
]

const DESKTOP_NAV_KEYS = [
  { path: '/', key: 'nav.home', exact: true },
  { path: '/shop', key: 'nav.shop' },
  { path: '/flash-sale', key: 'home.flashSale' },
  { path: '/shop?filter=new_arrival', key: 'nav.newArrivals' },
]

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸' },
  { code: 'km', label: 'Khmer', short: 'KM', flag: '🇰🇭' },
]

export function Logo({ compact = false, inverse = false, iconOnly = false, logoUrl = null, storeName = 'Shadow Shop' }) {
  return (
    <Link to="/" className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className={cn('object-contain rounded-2xl', compact ? 'h-8 w-8' : 'h-10 w-10')} />
      ) : (
        <div className={cn('flex items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-200', compact ? 'h-8 w-8' : 'h-10 w-10')}>
          <ShoppingBag size={compact ? 17 : 21} />
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
  const [path, query] = item.path.split('?')
  if (query) return location.pathname === path && location.search === `?${query}`
  return location.pathname === path && !location.search
}

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [headerSearch, setHeaderSearch] = useState('')
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const { t, i18n } = useTranslation()
  const { user, isAuthenticated } = useAuthStore()
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

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const logoUrl = siteSettings?.logo_url || null
  const storeName = siteSettings?.store_name || 'Shadow Shop'

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
  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = cartItems.reduce((sum, i) => sum + i.product.retail_price * i.quantity, 0)
  const isHome = location.pathname === '/'
  const hasCheckoutItems = cartItems.some((item) => selectedProductIds.includes(item.product.id))
  const hideMobileHeader =
    location.pathname === '/shop' ||
    (location.pathname === '/cart' && cartItems.length > 0) ||
    (location.pathname === '/checkout' && hasCheckoutItems) ||
    (location.pathname.startsWith('/profile') && location.pathname !== '/profile/rewards') ||
    location.pathname === '/address-book' ||
    location.pathname.startsWith('/product/') ||
    location.pathname.startsWith('/product-set/') ||
    location.pathname.startsWith('/my-orders/')
  const hideMobileBottomNav = location.pathname === '/cart' || location.pathname === '/checkout' || location.pathname === '/address-book' || location.pathname === '/profile/edit' || location.pathname.startsWith('/profile/rewards/') || location.pathname.startsWith('/product/') || location.pathname.startsWith('/product-set/')
  const submitSearch = (e) => {
    e.preventDefault()
    const q = headerSearch.trim()
    if (!q) return
    setShowMobileSearch(false)
    navigate(`/shop?search=${encodeURIComponent(q)}`)
  }

  return (
    <div className={cn('flex min-h-screen flex-col bg-white text-gray-950 md:pb-0', hideMobileBottomNav ? '' : 'pb-[calc(82px+env(safe-area-inset-bottom))]')}>
      <header className={cn(
        'sticky top-0 z-40 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur',
        hideMobileHeader && 'hidden md:block'
      )}>
        <div className="hidden md:block">
          <div className="mx-auto flex max-w-[1500px] items-center gap-8 px-6 py-4">
            <Logo logoUrl={logoUrl} storeName={storeName} />
            <form
              onSubmit={submitSearch}
              className="mx-auto flex w-full max-w-xl items-center rounded-xl border border-gray-200 bg-white shadow-sm transition focus-within:border-pink-300 focus-within:ring-4 focus-within:ring-pink-100"
            >
              <Search size={17} className="ml-4 text-gray-400" />
              <input
                type="search"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder={t('header.searchPlaceholder')}
                className="h-11 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
              />
              <button type="submit" className="shop-btn-primary mr-1.5 h-8 w-10 px-0 py-0">
                <Search size={16} />
              </button>
            </form>
            <div className="flex items-center gap-5 text-sm font-semibold text-gray-700">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLanguageMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-800 shadow-sm transition hover:border-pink-300 hover:text-pink-600"
                  title="Switch Language"
                  aria-haspopup="menu"
                  aria-expanded={isLanguageMenuOpen}
                >
                  <span className="text-lg leading-none">{currentLanguage.flag}</span>
                  <span>{currentLanguage.label}</span>
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
                          <span className="text-xl leading-none">{language.flag}</span>
                          <span className="flex-1">{language.label}</span>
                          <span className="text-sm font-black">{language.short}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <Link to="/wishlist" className="relative flex items-center gap-2 hover:text-pink-600">
                <span className="relative">
                  <Heart size={17} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-0.5 text-[10px] font-bold text-white ring-1 ring-white">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  )}
                </span>
                {t('nav.wishlist')}
              </Link>
              <Link to="/my-orders" className="flex items-center gap-2 hover:text-pink-600">
                <ClipboardList size={17} /> {t('nav.orders')}
              </Link>
              <Link to="/profile" className="flex items-center gap-2 hover:text-pink-600">
                <User size={17} /> {t('nav.account')}
              </Link>
              <Link to="/cart" className="relative flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:border-pink-200 hover:text-pink-600">
                <ShoppingCart size={19} />
                <span>{t('nav.cart')}</span>
                <span className="text-xs text-gray-400">{formatCurrency(subtotal)}</span>
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
          <div className="px-3 pb-2.5 pt-[calc(0.5rem+env(safe-area-inset-top))] md:hidden">
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
                onClick={() => setShowMobileSearch((open) => !open)}
                aria-label={t('common.search')}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90',
                  showMobileSearch ? 'bg-pink-600 text-white shadow-sm shadow-pink-100' : 'bg-gray-100 text-gray-600'
                )}
              >
                {showMobileSearch ? <X size={19} /> : <Search size={19} />}
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
        <Outlet />
      </main>

      <footer className="hidden bg-[#08172f] text-white md:block">
        <div className="mx-auto grid max-w-[1500px] grid-cols-4 gap-10 px-6 py-10">
          <div>
            <Logo inverse logoUrl={logoUrl} storeName={storeName} />
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-300">
              {t('footer.tagline')}
            </p>
            <div className="mt-5 flex gap-3">
              {[Facebook, Instagram, Youtube].map((Icon, index) => (
                <a key={index} href="#" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10">
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-bold">{t('footer.customerService')}</h4>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>{t('footer.contactUs')}</p>
              <p>{t('footer.faqs')}</p>
              <p>{t('footer.shippingPolicy')}</p>
              <p>{t('footer.returnRefund')}</p>
              <p>{t('footer.terms')}</p>
            </div>
          </div>
          <div>
            <h4 className="font-bold">{t('footer.information')}</h4>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>{t('footer.aboutUs')}</p>
              <p>{t('footer.privacyPolicy')}</p>
              <p>{t('footer.careers')}</p>
              <p>{t('footer.blog')}</p>
              <p>{t('footer.sitemap')}</p>
            </div>
          </div>
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
        <Link
          to="/admin"
          className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-2xl bg-navy-800 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-black/20 transition hover:bg-navy-700 active:scale-95 md:bottom-6"
          style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom))' }}
        >
          <LayoutDashboard size={15} />
          Back to Admin
        </Link>
      )}

      {!hideMobileBottomNav && (
        <nav className="mobile-bottom-nav md:hidden">
          {MOBILE_NAV_ITEMS.map((item, index) => {
            const isActive = isItemActive(location, item)
            const isCenter = item.center

            if (isCenter) {
              return (
                <div key={item.key} className="relative flex flex-1 flex-col items-center justify-end pb-2">
                  <Link
                    to={item.path}
                    className={cn(
                      'absolute bottom-full mb-1 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-[0_4px_20px_rgba(236,72,153,0.45)] ring-[3px] ring-white transition',
                      isActive && 'scale-105'
                    )}
                  >
                    <item.icon size={22} />
                  </Link>
                  <span className={cn('text-[10px] font-semibold', isActive ? 'text-pink-600' : 'text-gray-400')}>
                    {t(item.key)}
                  </span>
                </div>
              )
            }

            return (
              <Link
                key={item.key}
                to={item.path}
                className={cn(
                  'relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-1 transition-colors',
                  isActive ? 'text-pink-600' : 'text-gray-400'
                )}
              >
                <item.icon size={21} />
                <span className="text-[10px] font-semibold">{t(item.key)}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-pink-600" />
                )}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
