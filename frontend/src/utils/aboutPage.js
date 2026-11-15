import english from '@/i18n/locales/en.json'
import khmer from '@/i18n/locales/km.json'

export const DEFAULT_ABOUT_IMAGE = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop'
const field = (key, label, multiline = false) => ({ key, label, multiline })

export const ABOUT_GROUPS = [
  { id: 'hero', label: 'Welcome', fields: [
    field('badge', 'Small heading'), field('welcome', 'Main heading'),
    field('subtitle', 'Introduction', true), field('shopNow', 'Shop button'),
  ] },
  { id: 'highlights', label: 'Highlights', fields: [
    field('highlightShopTitle', 'Shopping title'), field('highlightShopDesc', 'Shopping description', true),
    field('highlightRewardsTitle', 'Rewards title'), field('highlightRewardsDesc', 'Rewards description', true),
    field('highlightDeliveryTitle', 'Delivery title'), field('highlightDeliveryDesc', 'Delivery description', true),
    field('highlightStoreDesc', 'Open a store description', true),
  ] },
  { id: 'services', label: 'Our Services', fields: [
    field('servicesTitle', 'Section heading'), field('servicesSubtitle', 'Introduction', true),
    ...['Shop', 'Store', 'Products', 'Delivery', 'Payments', 'Rewards'].flatMap((name) => [
      field(`service${name}Title`, `${name} service title`),
      field(`service${name}Desc`, `${name} service description`, true),
    ]),
  ] },
  { id: 'story', label: 'Story & Mission', fields: [
    field('ourStoryTitle', 'Story heading'), field('ourStoryText', 'Our story', true),
    field('ourMission', 'Mission heading'), field('ourMissionText', 'Our mission', true),
    field('ourVision', 'Vision heading'), field('ourVisionText', 'Our vision', true),
  ] },
  { id: 'stores', label: 'Partner Stores', fields: [
    field('ourStoresTitle', 'Section heading'), field('ourStoresSubtitle', 'Introduction', true),
    field('shopStore', 'Store button'), field('verifiedPartner', 'Verified store label'),
  ] },
  { id: 'partners', label: 'Open Your Store', fields: [
    field('partnerTitle', 'Section heading / open store button'), field('partnerSubtitle', 'Business invitation', true),
    ...Array.from({ length: 6 }, (_, index) => index + 1).flatMap((number) => [
      field(`partnerFeature${number}Title`, `Benefit ${number} title`),
      field(`partnerFeature${number}Desc`, `Benefit ${number} description`, true),
    ]),
    field('contactBusinessTitle', 'Application form heading'), field('contactBusinessDesc', 'Application form introduction', true),
    field('storeNameLabel', 'Business name label'), field('storeProductsLabel', 'Products label'),
    field('sendStoreRequest', 'Application button'),
  ] },
  { id: 'contact', label: 'Contact Us', fields: [
    field('storeInfoTitle', 'Section heading'), field('contactSubtitle', 'Introduction', true),
    field('operatingHours', 'Opening hours label'), field('hoursValue', 'Opening hours'),
    field('contactViaTelegram', 'Telegram button'),
  ] },
]

const DEFAULTS = { en: english.aboutPage, km: khmer.aboutPage }
export const ABOUT_SECTION_IDS = [...ABOUT_GROUPS.filter((group) => group.id !== 'hero').map((group) => group.id), 'telegram']

export function buildAboutPageForm(config = {}) {
  const content = {}
  for (const language of ['en', 'km']) {
    content[language] = { ...config.content?.[language] }
    for (const { key } of ABOUT_GROUPS.flatMap((group) => group.fields)) {
      if (typeof content[language][key] !== 'string' || !content[language][key].trim()) {
        content[language][key] = DEFAULTS[language][key] || ''
      }
    }
  }
  return {
    content,
    sections: Object.fromEntries(ABOUT_SECTION_IDS.map((key) => [key, config.sections?.[key] !== false])),
    contact: Object.fromEntries(['name', 'phone', 'email', 'address', 'telegram_url'].map((key) => [key, config.contact?.[key] || ''])),
  }
}

export function aboutPageText(config, language, key, options, fallback) {
  const fieldKey = key.startsWith('aboutPage.') ? key.slice('aboutPage.'.length) : null
  const locale = language?.split('-')[0] === 'km' ? 'km' : 'en'
  const text = fieldKey ? config?.content?.[locale]?.[fieldKey] : null
  if (typeof text !== 'string' || !text.trim()) return fallback(key, options)
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) => (
    options?.[name] == null ? match : String(options[name])
  ))
}
