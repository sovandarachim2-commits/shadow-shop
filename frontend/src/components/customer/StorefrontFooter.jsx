import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ArrowUpRight, Facebook, Globe, Instagram, Mail, Phone, ShoppingBag, Store, Youtube } from 'lucide-react'
import abaKhqrAcceptedLogo from '@/assets/aba/ABA KHQR We Accept Logo.svg'
import telegramLogo from '@/assets/telegram.svg'
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
      { label: 'About Us', label_km: 'អំពីយើង', labelKey: 'footer.aboutUs', url: '/about', enabled: true },
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

function AppleIcon({ size = 18, className = '' }) {
  return (
    <svg viewBox="0 0 384 512" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  )
}

function GooglePlayIcon({ size = 18, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path fill="#4285F4" d="M3.6 1.4L13.8 12 3.6 22.6c-.4-.4-.6-1-.6-1.8V3.2c0-.8.2-1.4.6-1.8z" />
      <path fill="#FBBC04" d="M17.2 8.6L13.8 12l3.4 3.4 3.9-2.2c1-.6 1-1.7 0-2.3l-3.9-2.3z" />
      <path fill="#EA4335" d="M3.6 1.4l10.2 10.6 3.4-3.4L6.1.4c-.9-.6-1.9-.3-2.5 1z" />
      <path fill="#34A853" d="M3.6 22.6l2.5 1c.6.4 1.6.4 2.5-.2l11.1-6.4-3.4-3.4-12.7 9z" />
    </svg>
  )
}

const APP_STORE_DOWNLOADS = [
  {
    name: 'App Store',
    Icon: AppleIcon,
  },
  {
    name: 'Google Play',
    Icon: GooglePlayIcon,
  },
]

const SOCIAL_ICON_MAP = {
  facebook: Facebook,
  tiktok: TikTokIcon,
  instagram: Instagram,
  youtube: Youtube,
}

function normalizeFooterMenus(value = {}, contactUrl = '/about') {
  return Object.fromEntries(
    Object.entries(DEFAULT_FOOTER_MENUS).map(([sectionKey, section]) => {
      const savedSection = value?.[sectionKey] || {}
      const savedItems = Array.isArray(savedSection.items) ? savedSection.items : []
      const usingSavedItems = Array.isArray(savedSection.items)
      const items = usingSavedItems ? savedItems : section.items

      return [sectionKey, {
        title: savedSection.title || section.title || '',
        title_km: savedSection.title_km || section.title_km || '',
        titleKey: section.titleKey,
        items: items.map((item, index) => ({
          label: item.label || '',
          label_km: item.label_km || section.items[index]?.label_km || '',
          labelKey: item.labelKey || section.items[index]?.labelKey || '',
          url: !usingSavedItems && sectionKey === 'customerService' && index === 0 ? contactUrl : item.url || '',
          enabled: item.enabled !== false,
        })),
      }]
    })
  )
}

function normalizeSocialLinks(value = {}) {
  const saved = Array.isArray(value?.social_links) ? value.social_links : []
  const source = Array.isArray(value?.social_links) ? saved : DEFAULT_SOCIAL_LINKS
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

const footerLinkClass = 'inline-flex min-h-9 max-w-full items-center rounded py-1 text-sm leading-6 text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-400'

function FooterMenuItem({ item, children }) {
  if (item.url) {
    if (item.url.startsWith('/') && !item.url.startsWith('//')) {
      return (
        <Link to={item.url} className={footerLinkClass}>
          {children}
        </Link>
      )
    }
    return (
      <a
        href={item.url}
        target={item.url.startsWith('http') ? '_blank' : undefined}
        rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={footerLinkClass}
      >
        {children}
      </a>
    )
  }

  return <p className="py-1 text-sm leading-6 text-slate-300">{children}</p>
}

function telegramContactUrl(value) {
  const contact = String(value || '').trim()
  const url = contact.startsWith('@') ? `https://t.me/${contact.slice(1)}`
    : /^(?:t\.me|telegram\.me)\//i.test(contact) ? `https://${contact}` : contact
  return /^https:\/\/(?:t\.me|telegram\.me)\/\S+$/i.test(url) ? url : ''
}

export default function StorefrontFooter({ siteSettings, mobileVisible = true }) {
  const { t, i18n } = useTranslation()
  const isKhmer = i18n.language.split('-')[0] === 'km'
  const storeName = siteSettings?.store_name || 'Shadow Shop'
  const storePhone = siteSettings?.store_phone || ''
  const storeEmail = siteSettings?.store_email || ''
  const logoUrl = siteSettings?.logo_url
  const config = siteSettings?.footer_menus || {}
  const socialLinks = normalizeSocialLinks(config)
  const configuredTelegram = Array.isArray(config.social_links)
    ? config.social_links.find((item) => item?.platform === 'telegram') : null
  const telegramUrl = configuredTelegram
    ? (configuredTelegram.enabled === false ? '' : telegramContactUrl(configuredTelegram.url))
    : telegramContactUrl(siteSettings?.payment_methods?.contact_sales_url)
  const contactUrl = storeEmail ? `mailto:${storeEmail}` : telegramUrl || '/about'
  const menus = normalizeFooterMenus(config, contactUrl)
  const description = resolveFooterText({
    en: config.brand?.description, km: config.brand?.description_km, fallbackKey: 'footer.tagline',
  }, isKhmer, t)
  const focusClass = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-400'
  const nameParts = storeName.trim().split(/\s+/)
  const showPartnerInvite = siteSettings?.about_page?.sections?.partners !== false

  return (
    <>
      {mobileVisible && (
        <footer className="border-t border-gray-100 bg-white px-5 pb-5 pt-7 md:hidden">
          <div className="grid grid-cols-[1.15fr_0.85fr] items-start gap-6">
            <div className="min-w-0">
              <Link to="/" aria-label={storeName} className="flex items-center gap-2.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">
                {logoUrl ? (
                  <img src={logoUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-contain" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-600 text-white"><ShoppingBag size={18} aria-hidden="true" /></span>
                )}
                <span className="truncate text-base font-black uppercase tracking-tight text-gray-950">{storeName}</span>
              </Link>
              <p className="mt-2.5 line-clamp-4 text-[13px] leading-relaxed text-gray-500">{description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500">{t('footer.acceptPayments')}</span>
                <img src={abaKhqrAcceptedLogo} alt="ABA KHQR accepted" className="h-5 w-auto" />
              </div>
              <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold text-gray-500">
                <Link to="/about" className="rounded hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">{t('footer.aboutUs')}</Link>
                <span aria-hidden="true">•</span>
                <Link to="/shop" className="rounded hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">{t('footer.sitemap')}</Link>
              </div>
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-black uppercase tracking-wide text-gray-950">{t('footer.contactUs')}</h3>
              <div className="mt-3 space-y-2.5 text-[13px] text-gray-600">
                {storePhone && (
                  <a href={`tel:${storePhone.replace(/\s+/g, '')}`} aria-label={storePhone} className="flex items-center gap-2 rounded hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">
                    <Phone size={15} className="shrink-0 text-pink-600" aria-hidden="true" /><span className="truncate">{storePhone}</span>
                  </a>
                )}
                {storeEmail && (
                  <a href={`mailto:${storeEmail}`} aria-label={storeEmail} className="flex items-center gap-2 rounded hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">
                    <Mail size={15} className="shrink-0 text-pink-600" aria-hidden="true" /><span>{t('aboutPage.email')}</span>
                  </a>
                )}
                {telegramUrl && (
                  <a href={telegramUrl} target="_blank" rel="noopener noreferrer" aria-label={t('footer.chatTelegram')} className="flex items-center gap-2 rounded hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">
                    <img src={configuredTelegram?.icon_url || telegramLogo} alt="" width={16} height={16} className="h-4 w-4 shrink-0 object-contain" /><span>Telegram</span>
                  </a>
                )}
                {socialLinks.filter((item) => item.platform !== 'telegram').map((item, index) => {
                  const Icon = SOCIAL_ICON_MAP[item.platform] || Globe
                  return <a key={`${item.platform}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-600">
                    {item.icon_url ? <img src={item.icon_url} alt="" className="h-4 w-4 shrink-0 object-contain" /> : <Icon size={15} className="shrink-0 text-pink-600" aria-hidden="true" />}
                    <span className="truncate">{item.label}</span>
                  </a>
                })}
              </div>
            </div>
          </div>
          <p className="mt-6 border-t border-gray-100 pt-4 text-center text-xs leading-5 text-gray-400">© {new Date().getFullYear()} {storeName}. {t('footer.rights')}.</p>
        </footer>
      )}
    <footer className="hidden border-t border-white/10 bg-[#08172f] text-white md:block">
      <div className="mx-auto w-full max-w-[1500px] px-5 pt-9 md:px-6 md:pt-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1fr)] xl:gap-x-12">
          <div className="col-span-2 min-w-0 xl:col-span-1">
            <Link to="/" aria-label={storeName} className={`inline-flex max-w-full items-center gap-3 rounded ${focusClass}`}>
              {logoUrl ? (
                <img src={logoUrl} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full bg-white/5 object-contain" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-600"><ShoppingBag size={23} aria-hidden="true" /></span>
              )}
              <span className="min-w-0">
                <span className="block break-words text-xl font-semibold leading-7 tracking-tight">
                  {nameParts.length > 1 ? <>{nameParts[0]} <span className="text-pink-400">{nameParts.slice(1).join(' ')}</span></> : storeName}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-400">{t('footer.brandSubtitle')}</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">{description}</p>
            <div className="mt-3 space-y-0.5">
              {storePhone && <a href={`tel:${storePhone.replace(/\s+/g, '')}`} className={`flex min-h-9 w-fit max-w-full items-center gap-2 rounded text-sm leading-6 text-slate-300 hover:text-white ${focusClass}`}><Phone size={15} className="shrink-0 text-slate-400" aria-hidden="true" /><span className="break-all">{storePhone}</span></a>}
              {storeEmail && <a href={`mailto:${storeEmail}`} className={`flex min-h-9 w-fit max-w-full items-center gap-2 rounded text-sm leading-6 text-slate-300 hover:text-white ${focusClass}`}><Mail size={15} className="shrink-0 text-slate-400" aria-hidden="true" /><span className="break-all">{storeEmail}</span></a>}
              {telegramUrl && <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-9 items-center gap-2 rounded text-sm font-medium text-sky-300 hover:text-sky-200 ${focusClass}`}><img src={configuredTelegram?.icon_url || telegramLogo} width={18} height={18} alt="" className="h-[18px] w-[18px] shrink-0 object-contain" />{t('footer.chatTelegram')}<ArrowUpRight size={14} aria-hidden="true" /></a>}
            </div>
            {socialLinks.some((item) => item.platform !== 'telegram') && (
              <nav aria-label={t('footer.followUs')} className="mt-4 flex flex-wrap gap-2">
                {socialLinks.filter((item) => item.platform !== 'telegram').map((item, index) => {
                  const Icon = SOCIAL_ICON_MAP[item.platform] || Globe
                  return <a key={`${item.platform}-${index}`} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.label} className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 text-slate-200 transition-colors hover:border-pink-400/60 hover:bg-white/5 hover:text-white ${focusClass}`}>
                    {item.icon_url ? <img src={item.icon_url} alt="" className="h-5 w-5 object-contain" /> : <Icon size={17} aria-hidden="true" />}
                  </a>
                })}
              </nav>
            )}
          </div>
          {Object.entries(menus).map(([key, section]) => {
            const title = resolveFooterText({ en: section.title, km: section.title_km, fallbackKey: section.titleKey }, isKhmer, t)
            return <nav key={key} aria-label={title} className="min-w-0">
              <h3 className="text-sm font-semibold leading-6 text-white">{title}</h3>
              <ul className="mt-3 space-y-0.5">
                {section.items.filter((item) => item.enabled !== false).map((item, index) => <li key={`${key}-${index}`}>
                  <FooterMenuItem item={item}>{resolveFooterText({ en: item.label, km: item.label_km, fallbackKey: item.labelKey }, isKhmer, t)}</FooterMenuItem>
                </li>)}
              </ul>
            </nav>
          })}
          <div className={`col-span-2 min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-4 xl:col-span-1 ${showPartnerInvite ? 'md:grid md:grid-cols-2 md:items-center md:gap-6 xl:block' : ''}`}>
            {showPartnerInvite && <div>
              <h3 className="flex items-center gap-2 text-base font-semibold leading-6"><Store size={18} className="shrink-0 text-pink-400" aria-hidden="true" />{t('footer.businessTitle')}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t('footer.businessDescription')}</p>
              <Link to="/about" className={`mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-500 ${focusClass}`}>
                {t('footer.openStore')}<ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>}
            <div className={showPartnerInvite ? 'mt-4 border-t border-white/10 pt-4 md:mt-0 md:border-l md:border-t-0 md:pl-6 md:pt-0 xl:mt-4 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-4' : ''}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs leading-5"><span className="font-medium text-slate-200">{t('footer.downloadApp')}</span><span className="text-slate-400">{t('footer.comingSoon')}</span></div>
              <div className="grid grid-cols-2 gap-2">
                {APP_STORE_DOWNLOADS.map(({ name, Icon }) => <div key={name} aria-label={`${name}: ${t('footer.comingSoon')}`} className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2"><Icon size={19} className="shrink-0" /><span className="text-[11px] font-medium leading-4 text-slate-200">{name}</span></div>)}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-5 text-center sm:flex-row sm:text-left">
          <p className="text-xs leading-6 text-slate-400">© {new Date().getFullYear()} {storeName}. {t('footer.rights')}.</p>
          <div className="flex flex-wrap items-center justify-center gap-3"><span className="text-xs text-slate-400">{t('footer.acceptPayments')}</span><img src={abaKhqrAcceptedLogo} alt="ABA KHQR accepted" className="h-6 w-auto" /></div>
        </div>
      </div>
    </footer>
    </>
  )
}

