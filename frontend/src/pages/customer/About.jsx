import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck, Truck, Gift, CreditCard, Store, Globe,
  Phone, Mail, MapPin, Clock, Send, ArrowRight, ArrowUpRight,
  ShoppingBag, UploadCloud, Compass, Target, Share2, Headphones,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { storesApi } from '@/api/stores'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import telegramLogo from '@/assets/telegram.svg'
import { aboutPageText, DEFAULT_ABOUT_IMAGE } from '@/utils/aboutPage'

function normalizeTelegramContactUrl(value) {
  const contact = String(value || '').trim()
  const url = contact.startsWith('@')
    ? `https://t.me/${contact.slice(1)}`
    : /^(?:t\.me|telegram\.me)\//i.test(contact) ? `https://${contact}` : contact

  return /^https:\/\/(?:t\.me|telegram\.me)\/\S+$/i.test(url) ? url : ''
}

export default function About() {
  const { t: translate, i18n } = useTranslation()
  const isKhmer = i18n.language === 'km'

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    ...STOREFRONT_LIVE_QUERY,
  })
  const aboutConfig = siteSettings?.about_page || {}
  const t = (key, options) => aboutPageText(aboutConfig, i18n.language, key, options, translate)
  const showSection = (key) => aboutConfig.sections?.[key] !== false

  const {
    data: partnerStoresData,
    isLoading: isLoadingPartnerStores,
    isError: isPartnerStoresError,
    refetch: refetchPartnerStores,
  } = useQuery({
    queryKey: ['public-stores'],
    queryFn: () => storesApi.getPublicStores().then((r) => r.data),
    ...STOREFRONT_LIVE_QUERY,
  })

  const partnerStores = Array.isArray(partnerStoresData)
    ? partnerStoresData
    : partnerStoresData?.results || []

  const storeName = aboutConfig.contact?.name || siteSettings?.store_name || 'Shadow Shop'
  const storePhone = aboutConfig.contact?.phone || siteSettings?.store_phone || '+855 12 345 678'
  const storeEmail = aboutConfig.contact?.email || siteSettings?.store_email || 'hello@shadowshop.com'
  const storeAddress = aboutConfig.contact?.address || siteSettings?.store_address || (isKhmer ? 'រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា' : 'Phnom Penh, Cambodia')
  const footerSocialLinks = siteSettings?.footer_menus?.social_links
  const telegramSocialLink = Array.isArray(footerSocialLinks)
    ? footerSocialLinks.find((item) => item?.platform === 'telegram' && item.enabled !== false && item.url)
    : null
  const telegramContactUrl = normalizeTelegramContactUrl(aboutConfig.contact?.telegram_url)
    || normalizeTelegramContactUrl(telegramSocialLink?.url)
    || normalizeTelegramContactUrl(siteSettings?.payment_methods?.contact_sales_url)

  // Partner inquiry form state
  const [partnerForm, setPartnerForm] = useState({
    businessName: '',
    contactName: '',
    contactInfo: '',
    message: '',
  })

  const [isSubmittingPartner, setIsSubmittingPartner] = useState(false)

  const handlePartnerSubmit = async (e) => {
    e.preventDefault()
    if (isSubmittingPartner) return
    if (!partnerForm.businessName.trim() || !partnerForm.contactInfo.trim()) {
      toast.error(isKhmer ? 'សូមបំពេញឈ្មោះអាជីវកម្ម និងព័ត៌មានទំនាក់ទំនង' : 'Please provide your business name and contact info')
      return
    }

    try {
      setIsSubmittingPartner(true)
      await storesApi.submitInquiry({
        business_name: partnerForm.businessName.trim(),
        contact_person: partnerForm.contactName.trim() || 'N/A',
        phone: partnerForm.contactInfo.trim(),
        telegram: partnerForm.contactInfo.includes('@') ? partnerForm.contactInfo.trim() : '',
        category: 'General Retail',
        notes: partnerForm.message.trim(),
      })

      toast.success(isKhmer ? 'អរគុណសម្រាប់ការទាក់ទង! យើងនឹងឆ្លើយតបឆាប់ៗ។' : 'Thank you for reaching out! Our team will contact you shortly.')
      setPartnerForm({
        businessName: '',
        contactName: '',
        contactInfo: '',
        message: '',
      })
    } catch {
      toast.error(isKhmer ? 'មិនអាចផ្ញើសំណើបានទេ។ សូមព្យាយាមម្តងទៀត។' : 'We couldn’t send your request. Please try again.')
    } finally {
      setIsSubmittingPartner(false)
    }
  }

  const highlights = [
    { title: t('aboutPage.highlightShopTitle'), description: t('aboutPage.highlightShopDesc'), icon: ShoppingBag },
    { title: t('aboutPage.highlightRewardsTitle'), description: t('aboutPage.highlightRewardsDesc'), icon: Gift },
    { title: t('aboutPage.highlightDeliveryTitle'), description: t('aboutPage.highlightDeliveryDesc'), icon: Truck },
    { title: t('aboutPage.partnerTitle'), description: t('aboutPage.highlightStoreDesc'), icon: Store },
  ]

  const services = [
    { icon: ShoppingBag, title: t('aboutPage.serviceShopTitle'), description: t('aboutPage.serviceShopDesc') },
    { icon: Store, title: t('aboutPage.serviceStoreTitle'), description: t('aboutPage.serviceStoreDesc') },
    { icon: UploadCloud, title: t('aboutPage.serviceProductsTitle'), description: t('aboutPage.serviceProductsDesc') },
    { icon: Truck, title: t('aboutPage.serviceDeliveryTitle'), description: t('aboutPage.serviceDeliveryDesc') },
    { icon: CreditCard, title: t('aboutPage.servicePaymentsTitle'), description: t('aboutPage.servicePaymentsDesc') },
    { icon: Gift, title: t('aboutPage.serviceRewardsTitle'), description: t('aboutPage.serviceRewardsDesc') },
  ]

  const sectionClass = 'mx-auto w-full max-w-[1500px] px-5 md:px-6'
  const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-4'
  const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 sm:text-sm'

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <section className="border-b border-gray-100 bg-[#fcfafb]" aria-labelledby="about-title">
        <div className={`${sectionClass} grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-16 xl:gap-16`}>
          <div className="min-w-0 lg:col-span-7">
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">
              <span className="h-px w-7 bg-pink-600" aria-hidden="true" />
              {t('aboutPage.badge')}
            </p>
            <h1 id="about-title" className="break-words text-4xl font-semibold leading-[1.25] tracking-tight sm:text-5xl lg:text-6xl">
              {t('aboutPage.welcome')}{' '}
              <span className="mt-1 block text-pink-600">{storeName}</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg sm:leading-8">
              {t('aboutPage.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/shop"
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-700 ${focusClass}`}
              >
                <ShoppingBag size={17} aria-hidden="true" />
                {t('aboutPage.shopNow')}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              {showSection('partners') && <a
                href="#partner-ecosystem"
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-pink-300 hover:text-pink-700 ${focusClass}`}
              >
                {t('aboutPage.partnerTitle')}
              </a>}
            </div>
          </div>
          <figure className="min-w-0 overflow-hidden rounded-3xl border border-gray-200/70 bg-white lg:col-span-5">
            <img
              src={siteSettings?.about_hero_image_url || DEFAULT_ABOUT_IMAGE}
              alt={isKhmer ? 'ផលិតផលសម្រស់ និងគ្រឿងសម្អាង' : 'A curated collection of beauty and cosmetics essentials'}
              width={1200}
              height={900}
              className="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
              loading="eager"
              fetchPriority="high"
            />
            <figcaption className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold">{storeName}</p>
                <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-gray-500">
                  <MapPin size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {storeAddress}
                </p>
              </div>
              <ShieldCheck size={24} className="shrink-0 text-pink-600" aria-hidden="true" />
            </figcaption>
          </figure>
        </div>
      </section>

      {showSection('highlights') && <section className="border-b border-gray-100" aria-label={t('aboutPage.highlightsLabel')}>
        <ul className={`${sectionClass} grid grid-cols-2 gap-x-6 gap-y-7 py-7 sm:grid-cols-4 sm:gap-8 sm:py-9`}>
          {highlights.map(({ title, description, icon: Icon }) => (
            <li key={title} className="min-w-0">
              <Icon size={21} className="mb-3 text-pink-600" strokeWidth={1.7} aria-hidden="true" />
              <p className="text-sm font-semibold leading-6 text-gray-900 sm:text-base">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">{description}</p>
            </li>
          ))}
        </ul>
      </section>}

      {showSection('services') && <section id="our-services" className={`${sectionClass} scroll-mt-32 py-12 sm:py-16`} aria-labelledby="about-services-title">
        <h2 id="about-services-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('aboutPage.servicesTitle')}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">{t('aboutPage.servicesSubtitle')}</p>
        <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-6">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>}

      {showSection('story') && <section className="border-y border-gray-100 bg-gray-50/70" aria-labelledby="about-story-title">
        <div className={`${sectionClass} grid gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16`}>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">{storeName}</p>
            <h2 id="about-story-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('aboutPage.ourStoryTitle')}</h2>
            <p className="mt-5 text-sm leading-7 text-gray-600 sm:text-base sm:leading-8">{t('aboutPage.ourStoryText')}</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-[#08172f] p-6 text-white sm:p-8">
            <h2 className="sr-only">{t('aboutPage.missionVisionTitle')}</h2>
            {[
              { icon: Target, title: t('aboutPage.ourMission'), text: t('aboutPage.ourMissionText') },
              { icon: Compass, title: t('aboutPage.ourVision'), text: t('aboutPage.ourVisionText') },
            ].map(({ icon: Icon, title, text }, index) => (
              <div key={title} className={index === 0 ? '' : 'mt-6 border-t border-white/15 pt-6'}>
                <h3 className="flex items-center gap-2.5 text-base font-semibold">
                  <Icon size={19} className="shrink-0 text-pink-300" strokeWidth={1.7} aria-hidden="true" />
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {showSection('stores') && <section className={`${sectionClass} py-12 sm:py-16`} aria-labelledby="about-stores-title">
        <div className="mb-7 max-w-2xl">
          <h2 id="about-stores-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('aboutPage.ourStoresTitle')}</h2>
          <p className="mt-3 text-sm leading-7 text-gray-500 sm:text-base">{t('aboutPage.ourStoresSubtitle')}</p>
        </div>
        {isLoadingPartnerStores ? (
          <p role="status" className="rounded-2xl border border-gray-100 bg-gray-50 px-6 py-8 text-sm text-gray-500">{t('aboutPage.partnerStoresLoading')}</p>
        ) : isPartnerStoresError && partnerStores.length === 0 ? (
          <div role="alert" className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8">
            <p className="text-sm text-gray-600">{t('aboutPage.partnerStoresError')}</p>
            <button type="button" onClick={() => refetchPartnerStores()} className={`mt-3 rounded text-sm font-semibold text-pink-700 hover:text-pink-800 ${focusClass}`}>{t('common.tryAgain')}</button>
          </div>
        ) : partnerStores.length === 0 ? (
          <p className="rounded-2xl border border-gray-100 bg-gray-50 px-6 py-8 text-sm text-gray-500">{t('aboutPage.partnerStoresEmpty')}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {partnerStores.map((partnerStore) => {
              const location = (partnerStore.address || [partnerStore.district, partnerStore.province].filter(Boolean).join(', ')).replace(/\s+/g, ' ').trim()
              const storeUrl = `/store/${encodeURIComponent(partnerStore.slug)}`

              return (
                <Link
                  key={partnerStore.id}
                  to={storeUrl}
                  aria-label={`${t('aboutPage.shopStore')}: ${partnerStore.name}`}
                  className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-pink-300 hover:shadow-sm ${focusClass}`}
                >
                  {partnerStore.banner && (
                    <div className="h-24 overflow-hidden border-b border-gray-100 bg-gray-50 sm:h-28">
                      <img src={partnerStore.banner} alt="" width={800} height={320} className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-gray-50">
                        {partnerStore.logo ? (
                          <img src={partnerStore.logo} alt="" width={48} height={48} className="h-full w-full object-contain" loading="lazy" />
                        ) : (
                          <Store size={22} className="text-pink-500" strokeWidth={1.7} aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 break-words text-base font-semibold leading-6 tracking-tight text-gray-900 group-hover:text-pink-700">
                          {partnerStore.name}
                        </h3>
                        {partnerStore.is_verified && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium leading-5 text-pink-700">
                            <ShieldCheck size={12} className="shrink-0" aria-hidden="true" />
                            {t('aboutPage.verifiedPartner')}
                          </p>
                        )}
                      </div>
                    </div>
                    {location && (
                      <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-500">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                        <span className="line-clamp-2 min-w-0 break-words">{location}</span>
                      </p>
                    )}
                    <span className="mt-auto block pt-4">
                      <span className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-pink-50 px-4 py-2.5 text-sm font-semibold text-pink-700 transition-colors group-hover:bg-pink-600 group-hover:text-white group-focus-visible:bg-pink-600 group-focus-visible:text-white">
                        {t('aboutPage.shopStore')}
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>}

      {showSection('partners') && <section id="partner-ecosystem" className="scroll-mt-32 border-y border-pink-100/70 bg-[#fcf7fa]" aria-labelledby="about-partner-title">
        <div className={`${sectionClass} grid items-start gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16`}>
          <div className="min-w-0 lg:py-4">
            <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-pink-600">
              <Store size={22} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <h2 id="about-partner-title" className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">{t('aboutPage.partnerTitle')}</h2>
            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">{t('aboutPage.partnerSubtitle', { storeName })}</p>
            <ul className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {[
                { icon: Globe, title: t('aboutPage.partnerFeature1Title'), text: t('aboutPage.partnerFeature1Desc') },
                { icon: UploadCloud, title: t('aboutPage.partnerFeature2Title'), text: t('aboutPage.partnerFeature2Desc') },
                { icon: CreditCard, title: t('aboutPage.partnerFeature3Title'), text: t('aboutPage.partnerFeature3Desc') },
                { icon: Share2, title: t('aboutPage.partnerFeature4Title'), text: t('aboutPage.partnerFeature4Desc') },
                { icon: Store, title: t('aboutPage.partnerFeature5Title'), text: t('aboutPage.partnerFeature5Desc', { storeName }) },
                { icon: Headphones, title: t('aboutPage.partnerFeature6Title'), text: t('aboutPage.partnerFeature6Desc') },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <Icon size={19} className="mt-1 shrink-0 text-pink-600" strokeWidth={1.7} aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-6">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
            <h3 id="partner-form-title" className="text-xl font-semibold tracking-tight">{t('aboutPage.contactBusinessTitle')}</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">{t('aboutPage.contactBusinessDesc')}</p>
            <form onSubmit={handlePartnerSubmit} aria-labelledby="partner-form-title" aria-busy={isSubmittingPartner} className="mt-6 space-y-4">
              <div>
                <label htmlFor="partner-business" className="mb-2 block text-sm font-medium text-gray-700">
                  {t('aboutPage.storeNameLabel')}
                </label>
                <input
                  id="partner-business"
                  name="businessName"
                  type="text"
                  autoComplete="organization"
                  required
                  value={partnerForm.businessName}
                  onChange={(e) => setPartnerForm((prev) => ({ ...prev, businessName: e.target.value }))}
                  placeholder={isKhmer ? 'ឧ. K-Beauty Cambodia' : 'e.g. Acme Cosmetics'}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="partner-contact" className="mb-2 block text-sm font-medium text-gray-700">
                  {isKhmer ? 'លេខទូរស័ព្ទ ឬ Telegram *' : 'Phone Number or Telegram *'}
                </label>
                <input
                  id="partner-contact"
                  name="contactInfo"
                  type="text"
                  required
                  value={partnerForm.contactInfo}
                  onChange={(e) => setPartnerForm((prev) => ({ ...prev, contactInfo: e.target.value }))}
                  placeholder={isKhmer ? '012 345 678 ឬ @username' : '012 345 678 or @username'}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="partner-message" className="mb-2 block text-sm font-medium text-gray-700">
                  {t('aboutPage.storeProductsLabel')}
                </label>
                <textarea
                  id="partner-message"
                  name="message"
                  rows={3}
                  value={partnerForm.message}
                  onChange={(e) => setPartnerForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder={isKhmer ? 'រៀបរាប់ត្រួសៗអំពីផលិតផលដែលចង់ដាក់លក់...' : 'Briefly describe your products or inquiry...'}
                  className={`${inputClass} min-h-28 resize-y`}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingPartner}
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-700 disabled:cursor-wait disabled:opacity-60 ${focusClass}`}
              >
                <Send size={16} aria-hidden="true" />
                {isSubmittingPartner ? (isKhmer ? 'កំពុងផ្ញើ...' : 'Submitting...') : t('aboutPage.sendStoreRequest')}
              </button>
            </form>
          </div>
        </div>
      </section>}

      {showSection('contact') && <section className={`${sectionClass} py-12 sm:py-16`} aria-labelledby="about-contact-title">
        <h2 id="about-contact-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('aboutPage.storeInfoTitle')}</h2>
        <p className="mt-3 text-sm leading-7 text-gray-500">{t('aboutPage.contactSubtitle')}</p>
        <div className={`mt-7 grid gap-x-8 gap-y-6 sm:grid-cols-2 ${showSection('telegram') && telegramContactUrl ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
          <div className="flex min-w-0 items-start gap-3">
            <MapPin size={19} className="mt-0.5 shrink-0 text-pink-600" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-xs font-medium text-gray-500">{t('aboutPage.address')}</h3>
              <p className="mt-2 break-words text-sm leading-6 text-gray-800">{storeAddress}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-3">
            <Clock size={19} className="mt-0.5 shrink-0 text-pink-600" aria-hidden="true" />
            <div>
              <h3 className="text-xs font-medium text-gray-500">{t('aboutPage.operatingHours')}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-800">{t('aboutPage.hoursValue')}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-3">
            <Phone size={19} className="mt-0.5 shrink-0 text-pink-600" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-xs font-medium text-gray-500">{t('aboutPage.phone')} &amp; {t('aboutPage.email')}</h3>
              <a href={`tel:${storePhone.replace(/\s+/g, '')}`} className={`mt-2 block w-fit rounded text-sm leading-6 text-gray-800 hover:text-pink-700 ${focusClass}`}>{storePhone}</a>
              <a href={`mailto:${storeEmail}`} className={`mt-1 inline-flex max-w-full items-start gap-1.5 rounded text-sm leading-6 text-gray-600 hover:text-pink-700 ${focusClass}`}>
                <Mail size={14} className="mt-1 shrink-0" aria-hidden="true" />
                <span className="break-all">{storeEmail}</span>
              </a>
            </div>
          </div>
          {showSection('telegram') && telegramContactUrl && (
            <div className="flex min-w-0 items-start gap-3">
              <img src={telegramLogo} alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs font-medium text-gray-500">Telegram</h3>
                <a
                  href={telegramContactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100 ${focusClass}`}
                >
                  {t('aboutPage.contactViaTelegram')}
                  <ArrowUpRight size={15} className="shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>}
    </div>
  )
}
