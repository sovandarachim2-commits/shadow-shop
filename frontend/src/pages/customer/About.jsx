import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ShieldCheck, Truck, Gift, CreditCard, Sparkles, Store, Globe,
  Users, Phone, Mail, MapPin, Clock, Send, ArrowRight,
  ShoppingBag, Award, UploadCloud, CheckCircle2, ChevronRight,
  Compass, Target, Flame, Star, ExternalLink, Navigation
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import { cn } from '@/utils/helpers'

export default function About() {
  const { t, i18n } = useTranslation()
  const isKhmer = i18n.language === 'km'

  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    ...STOREFRONT_LIVE_QUERY,
  })

  const storeName = siteSettings?.store_name || 'Shadow Shop'
  const storePhone = siteSettings?.store_phone || '+855 12 345 678'
  const storeEmail = siteSettings?.store_email || 'hello@shadowshop.com'
  const storeAddress = siteSettings?.store_address || (isKhmer ? 'រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា' : 'Phnom Penh, Cambodia')

  // Partner inquiry form state
  const [partnerForm, setPartnerForm] = useState({
    businessName: '',
    contactName: '',
    contactInfo: '',
    message: '',
  })

  const handlePartnerSubmit = (e) => {
    e.preventDefault()
    if (!partnerForm.businessName.trim() || !partnerForm.contactInfo.trim()) {
      toast.error(isKhmer ? 'សូមបំពេញឈ្មោះអាជីវកម្ម និងព័ត៌មានទំនាក់ទំនង' : 'Please provide your business name and contact info')
      return
    }

    toast.success(isKhmer ? 'អរគុណសម្រាប់ការទាក់ទង! យើងនឹងឆ្លើយតបឆាប់ៗ។' : 'Thank you for reaching out! Our team will contact you shortly.')

    const encodedBody = encodeURIComponent(
      `Hello Shadow Shop Team,\n\nI would like to partner with Shadow Shop to list/upload our products.\n\nBusiness Name: ${partnerForm.businessName}\nContact Person: ${partnerForm.contactName || 'N/A'}\nContact Info: ${partnerForm.contactInfo}\nMessage: ${partnerForm.message || 'Looking forward to discussing partnership opportunities.'}`
    )
    window.open(`mailto:${storeEmail}?subject=Business%20Partnership%20Inquiry%20-%20${encodeURIComponent(partnerForm.businessName)}&body=${encodedBody}`, '_blank')
  }

  const stats = [
    { value: '10,000+', label: t('aboutPage.statsCustomers'), icon: Users },
    { value: '500+', label: t('aboutPage.statsProducts'), icon: Sparkles },
    { value: '100%', label: t('aboutPage.statsAuthentic'), icon: Award },
    { value: '25', label: t('aboutPage.statsProvinces'), icon: MapPin },
  ]

  // Demo Physical Branches in Cambodia
  const branches = [
    {
      id: 'branch-tk',
      name: t('aboutPage.branch1Title'),
      tag: t('aboutPage.branch1Tag'),
      address: t('aboutPage.branch1Address'),
      phone: '012 345 678',
      hours: isKhmer ? '8:30 ព្រឹក – 9:00 យប់' : '8:30 AM – 9:00 PM',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop',
      features: [isKhmer ? 'បញ្ជរតេស្តផលិតផល' : 'Product Testing Bar', isKhmer ? 'យកទំនិញផ្ទាល់' : 'In-store Pickup', isKhmer ? 'ទូទាត់ ABA KHQR' : 'ABA KHQR Ready'],
      mapQuery: 'Toul Kork Phnom Penh',
    },
    {
      id: 'branch-bkk',
      name: t('aboutPage.branch2Title'),
      tag: t('aboutPage.branch2Tag'),
      address: t('aboutPage.branch2Address'),
      phone: '098 765 432',
      hours: isKhmer ? '9:00 ព្រឹក – 9:30 យប់' : '9:00 AM – 9:30 PM',
      image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=800&auto=format&fit=crop',
      features: [isKhmer ? 'ពិគ្រោះយោបល់ស្បែក' : 'Skincare Consultation', isKhmer ? 'ទំនិញពេញនិយម' : 'Top Trending Items', isKhmer ? 'សេវាកម្មរហ័ស' : 'Express Checkout'],
      mapQuery: 'BKK1 Phnom Penh',
    },
    {
      id: 'branch-dispatch',
      name: t('aboutPage.branch3Title'),
      tag: t('aboutPage.branch3Tag'),
      address: t('aboutPage.branch3Address'),
      phone: '077 888 999',
      hours: isKhmer ? '8:00 ព្រឹក – 8:00 យប់' : '8:00 AM – 8:00 PM',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop',
      features: [isKhmer ? 'ផ្ញើគ្រប់ ២៥ ខេត្ត-ក្រុង' : '25 Provinces Delivery', isKhmer ? 'ខ្ចប់ទំនិញប្រុងប្រយ័ត្ន' : 'Safe Packaging', isKhmer ? 'តាមដានការដឹកជញ្ជូន' : 'Live Tracking'],
      mapQuery: 'Phnom Penh Cambodia',
    },
  ]

  return (
    <div className="w-full min-h-screen bg-white">
      {/* ══════════════════════════════════════════════════════════
          IMPROVED 2-COLUMN HERO BANNER WITH STORE IMAGE
      ══════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-gradient-to-b from-gray-50 via-pink-50/25 to-white px-6 py-14 sm:py-20 lg:px-20 xl:px-32">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
            
            {/* Left Column: Heading, Subtitle & Actions */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-1.5 text-xs font-black uppercase tracking-wider text-pink-600 shadow-sm">
                <Sparkles size={14} className="fill-pink-600" />
                <span>{t('aboutPage.badge')}</span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-gray-950 sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]">
                {isKhmer ? (
                  <>អំពី <span className="text-pink-600">{storeName}</span></>
                ) : (
                  <>About <span className="text-pink-600">{storeName}</span></>
                )}
              </h1>

              <p className="text-base sm:text-lg md:text-xl font-normal leading-relaxed text-gray-600 max-w-2xl">
                {t('aboutPage.subtitle')}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-700 active:scale-95"
                >
                  <ShoppingBag size={18} />
                  <span>{t('aboutPage.shopNow')}</span>
                </Link>
                <a
                  href="#partner-ecosystem"
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-7 py-3.5 text-sm font-black text-gray-800 shadow-sm transition hover:border-pink-300 hover:bg-pink-50/50 hover:text-pink-600 active:scale-95"
                >
                  <Store size={18} />
                  <span>{t('aboutPage.partnerTitle')}</span>
                </a>
              </div>

              {/* 3 Trust Signals */}
              <div className="pt-3 flex flex-wrap items-center gap-5 text-xs font-bold text-gray-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>{isKhmer ? 'ផលិតផលសុទ្ធ ១០០%' : '100% Genuine Guaranteed'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>{isKhmer ? 'ដឹកជញ្ជូន ២៥ ខេត្ត-ក្រុង' : '25 Provinces Delivery'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>{isKhmer ? 'ទូទាត់រហ័ស ABA KHQR' : 'ABA KHQR Instant Checkout'}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Store Showcase Card with Badges */}
            <div className="lg:col-span-5">
              <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[36px] border border-gray-100 bg-white shadow-2xl transition duration-500 hover:shadow-pink-200/50">
                <img
                  src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop"
                  alt="Shadow Shop Store"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Floating Top Badge */}
                <div className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-black text-gray-900 shadow-lg backdrop-blur">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span>4.9 / 5</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{isKhmer ? 'អតិថិជនពេញចិត្ត' : '10k+ Shoppers'}</span>
                </div>

                {/* Floating Bottom Info */}
                <div className="absolute inset-x-5 bottom-5 flex items-end justify-between">
                  <div className="text-white">
                    <span className="inline-flex items-center gap-1 rounded-full bg-pink-600/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider backdrop-blur mb-1.5">
                      <Store size={12} /> {isKhmer ? 'ហាងកែសម្ផស្សទំនើប' : 'Boutique Store'}
                    </span>
                    <h3 className="text-xl font-black">{storeName} Flagship</h3>
                    <p className="text-xs text-white/80">{isKhmer ? 'រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា' : 'Phnom Penh, Cambodia'}</p>
                  </div>
                  <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur border border-white/30">
                    <Award size={22} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          KEY STATS STRIP
      ══════════════════════════════════════════════════════════ */}
      <section className="w-full bg-[#08172f] text-white py-12 px-6 lg:px-20 xl:px-32">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-pink-400 mb-3 border border-white/10">
                  <Icon size={24} strokeWidth={2.2} />
                </div>
                <div className="text-3xl font-black text-white sm:text-4xl">{value}</div>
                <div className="mt-1 text-xs sm:text-sm font-bold text-slate-300">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          OUR PHYSICAL STORES & BRANCHES SECTION
      ══════════════════════════════════════════════════════════ */}
      <section className="w-full px-6 py-20 lg:px-20 xl:px-32 bg-gray-50/60 border-b border-gray-100">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-12 flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-100/80 px-3.5 py-1 text-xs font-black text-pink-700 mb-3">
              <Store size={14} />
              <span>{t('aboutPage.ourStoresTitle')}</span>
            </div>
            <h2 className="text-3xl font-black text-gray-950 sm:text-4xl md:text-5xl">
              {t('aboutPage.ourStoresTitle')}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-500 leading-relaxed">
              {t('aboutPage.ourStoresSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="group flex flex-col overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                {/* Store Demo Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-gray-100">
                  <img
                    src={b.image}
                    alt={b.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white shadow-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      {t('aboutPage.openNow')}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[11px] font-black uppercase tracking-wider text-pink-300">{b.tag}</span>
                    <h3 className="text-lg font-black text-white leading-tight mt-0.5">{b.name}</h3>
                  </div>
                </div>

                {/* Store Details Body */}
                <div className="flex flex-1 flex-col justify-between p-6 sm:p-7 space-y-5">
                  <div className="space-y-3.5 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-start gap-3">
                      <MapPin size={17} className="text-pink-600 shrink-0 mt-0.5" />
                      <span className="font-semibold text-gray-800 leading-snug">{b.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={17} className="text-pink-600 shrink-0" />
                      <span className="font-semibold text-gray-700">{b.hours}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={17} className="text-pink-600 shrink-0" />
                      <a href={`tel:${b.phone.replace(/\s+/g, '')}`} className="font-bold text-gray-900 transition hover:text-pink-600">
                        {b.phone}
                      </a>
                    </div>
                  </div>

                  {/* Feature Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {b.features.map((feat, i) => (
                      <span key={i} className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                        {feat}
                      </span>
                    ))}
                  </div>

                  {/* Direction Button */}
                  <div className="pt-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(b.mapQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-black text-gray-800 shadow-sm transition hover:border-pink-300 hover:bg-pink-50/50 hover:text-pink-600 active:scale-95"
                    >
                      <Navigation size={14} className="text-pink-600" />
                      <span>{t('aboutPage.getDirections')}</span>
                      <ExternalLink size={12} className="text-gray-400" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          ALTERNATING CORE FOCUS ROWS (With Real Images)
      ══════════════════════════════════════════════════════════ */}
      <section className="w-full px-6 py-20 lg:px-20 xl:px-32 space-y-24 lg:space-y-32">
        <div className="mx-auto max-w-[1600px] space-y-24 lg:space-y-32">

          {/* Row 1: Authenticity & Genuine Products (Icon + Left text, Right Demo Image) */}
          <div className="flex flex-col gap-10 md:flex-row md:items-center justify-between md:gap-16">
            <div className="flex flex-col items-start gap-5 max-w-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 shadow-sm border border-pink-100">
                <ShieldCheck size={32} strokeWidth={2.2} />
              </div>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl md:text-5xl leading-tight">
                {isKhmer ? 'ភាពសុទ្ធពិត & គុណភាព' : '100% Guaranteed Authenticity'}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                {t('aboutPage.val1Desc')}
              </p>
              <div className="space-y-2 text-sm font-bold text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>{isKhmer ? 'ត្រួតពិនិត្យប្រភព និងការនាំចូលផ្ទាល់' : 'Verified import & authorized sourcing'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>{isKhmer ? 'គ្មានផលិតផលក្លែងក្លាយជាដាច់ខាត' : 'Zero counterfeit policy guaranteed'}</span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-[48%] aspect-[4/3] shrink-0 overflow-hidden rounded-[32px] border border-gray-100 bg-gray-100 shadow-xl relative group">
              <img
                src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=800&auto=format&fit=crop"
                alt="Authentic Cosmetics"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="rounded-full bg-pink-600/90 px-3.5 py-1 text-xs font-black uppercase tracking-wider backdrop-blur mb-2 inline-block">
                  Certified Origin
                </span>
                <p className="text-xl sm:text-2xl font-black leading-tight">
                  {isKhmer ? 'ស្បែកស្អាតដោយទំនុកចិត្ត' : 'Healthy Skin Begins With Authentic Care'}
                </p>
              </div>
            </div>
          </div>

          {/* Row 2: Express Delivery & Nationwide Reach (Demo Image Left, Text Right) */}
          <div className="flex flex-col gap-10 md:flex-row md:items-center justify-between md:gap-16">
            <div className="order-2 md:order-1 w-full md:w-[48%] aspect-[4/3] shrink-0 overflow-hidden rounded-[32px] border border-gray-100 bg-gray-100 shadow-xl relative group">
              <img
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop"
                alt="Nationwide Delivery Logistics"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="rounded-full bg-blue-500/90 px-3.5 py-1 text-xs font-black uppercase tracking-wider backdrop-blur mb-2 inline-block">
                  Nationwide Dispatch
                </span>
                <p className="text-xl sm:text-2xl font-black leading-tight">
                  {isKhmer ? 'ដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត-ក្រុង' : 'Fast Delivery to All 25 Provinces'}
                </p>
              </div>
            </div>

            <div className="order-1 md:order-2 flex flex-col items-start gap-5 max-w-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
                <Truck size={32} strokeWidth={2.2} />
              </div>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl md:text-5xl leading-tight">
                {isKhmer ? 'ដឹកជញ្ជូនរហ័ស & សុវត្ថិភាព' : 'Fast & Reliable Connectivity'}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                {t('aboutPage.val2Desc')}
              </p>
              <div className="space-y-2 text-sm font-bold text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>{isKhmer ? 'ដឹកជញ្ជូនរហ័សក្នុងថ្ងៃនៅភ្នំពេញ' : 'Same-day delivery across Phnom Penh'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <span>{isKhmer ? 'ទូទាត់ងាយស្រួលតាម ABA KHQR ឬ COD' : 'ABA Mobile KHQR & Cash on Delivery'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Commerce & Partner Ecosystem (Text Left, Form Right) */}
          <div id="partner-ecosystem" className="flex flex-col gap-10 md:flex-row md:items-center justify-between md:gap-16 scroll-mt-24">
            <div className="flex flex-col items-start gap-5 max-w-xl">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shadow-sm border border-purple-100">
                <Store size={32} strokeWidth={2.2} />
              </div>
              <h2 className="text-3xl font-black text-gray-950 sm:text-4xl md:text-5xl leading-tight">
                {isKhmer ? 'សហការដាក់លក់ផលិតផលរបស់អ្នក' : 'Commerce & Partner Ecosystem'}
              </h2>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                {t('aboutPage.partnerSubtitle')}
              </p>
              <div className="space-y-3 pt-2 text-sm font-bold text-gray-800">
                <div className="flex items-start gap-3">
                  <UploadCloud size={20} className="text-pink-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-black">{t('aboutPage.partnerFeature1Title')}</span>
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">{t('aboutPage.partnerFeature1Desc')}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe size={20} className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="block font-black">{t('aboutPage.partnerFeature2Title')}</span>
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">{t('aboutPage.partnerFeature2Desc')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Partner Inquiry Card */}
            <div className="w-full md:w-[48%] rounded-[32px] border border-gray-200 bg-gray-50 p-7 sm:p-10 shadow-lg">
              <div className="mb-5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs font-black text-pink-700 mb-2">
                  <Flame size={14} /> Partner With Us
                </span>
                <h3 className="text-xl font-black text-gray-950 sm:text-2xl">{t('aboutPage.contactBusinessTitle')}</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{t('aboutPage.contactBusinessDesc')}</p>
              </div>

              <form onSubmit={handlePartnerSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">
                    {isKhmer ? 'ឈ្មោះអាជីវកម្ម / ម៉ាកផលិតផល *' : 'Business / Brand Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={partnerForm.businessName}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, businessName: e.target.value }))}
                    placeholder={isKhmer ? 'ឧ. K-Beauty Cambodia' : 'e.g. Acme Cosmetics'}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">
                    {isKhmer ? 'លេខទូរស័ព្ទ ឬ Telegram *' : 'Phone Number or Telegram *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={partnerForm.contactInfo}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, contactInfo: e.target.value }))}
                    placeholder={isKhmer ? '012 345 678 ឬ @username' : '012 345 678 or @username'}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">
                    {isKhmer ? 'សារ ឬព័ត៌មានផលិតផល' : 'Message / Products to Upload'}
                  </label>
                  <textarea
                    rows={2}
                    value={partnerForm.message}
                    onChange={(e) => setPartnerForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder={isKhmer ? 'រៀបរាប់ត្រួសៗអំពីផលិតផលដែលចង់ដាក់លក់...' : 'Briefly describe your products or inquiry...'}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-pink-200 transition hover:bg-pink-700 active:scale-95"
                >
                  <Send size={15} />
                  <span>{isKhmer ? 'ផ្ញើសំណើសហការ' : 'Send Partnership Request'}</span>
                </button>
              </form>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          MISSION & VISION SECTION (Signature CADT/Next-Gen Style)
      ══════════════════════════════════════════════════════════ */}
      <section className="w-full px-6 py-20 lg:px-20 xl:px-32 bg-gray-50 border-t border-b border-gray-100">
        <div className="mx-auto max-w-[1600px]">
          {/* Section Header with Next-Gen Double Underline Design */}
          <div className="border-b-2 border-gray-300 pb-2 mb-16">
            <h2 className="border-b-2 border-pink-600 pb-4 text-3xl font-black text-gray-950 md:text-4xl lg:text-5xl">
              {t('aboutPage.missionVisionTitle')}
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch gap-10 lg:gap-14">
            {/* Mission Card */}
            <div className="w-full lg:flex-1 rounded-[32px] overflow-hidden shadow-xl bg-[#08172f] text-white p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-center text-center gap-6">
              <p className="font-black text-xl lg:text-2xl tracking-widest uppercase text-pink-400">
                {t('aboutPage.ourMission')}
              </p>
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-600 text-white shadow-lg shadow-pink-500/30">
                <Target size={36} strokeWidth={2.2} />
              </div>
              <p className="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed max-w-md">
                {t('aboutPage.ourMissionText')}
              </p>
            </div>

            {/* Vision Card */}
            <div className="w-full lg:flex-1 rounded-[32px] overflow-hidden shadow-xl bg-[#08172f] text-white p-8 sm:p-12 lg:p-16 flex flex-col items-center justify-center text-center gap-6">
              <p className="font-black text-xl lg:text-2xl tracking-widest uppercase text-pink-400">
                {t('aboutPage.ourVision')}
              </p>
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-600 text-white shadow-lg shadow-pink-500/30">
                <Compass size={36} strokeWidth={2.2} />
              </div>
              <p className="text-sm sm:text-base md:text-lg text-slate-200 leading-relaxed max-w-md">
                {t('aboutPage.ourVisionText')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          STORE LOCATION & CONTACT STRIP
      ══════════════════════════════════════════════════════════ */}
      <section className="w-full px-6 py-16 lg:px-20 xl:px-32">
        <div className="mx-auto max-w-[1600px]">
          <div className="rounded-[32px] border border-gray-100 bg-white p-8 sm:p-12 shadow-sm">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-950 sm:text-3xl">{t('aboutPage.storeInfoTitle')}</h3>
                <p className="text-xs sm:text-sm text-gray-500">{isKhmer ? 'ទាក់ទងមកកាន់យើងខ្ញុំគ្រប់ពេលវេលា' : 'Reach out to our customer care team anytime'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50">
                <MapPin size={22} className="text-pink-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">{t('aboutPage.address')}</h4>
                  <p className="mt-1 text-sm font-black text-gray-900 leading-snug">{storeAddress}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50">
                <Clock size={22} className="text-pink-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">{t('aboutPage.operatingHours')}</h4>
                  <p className="mt-1 text-sm font-black text-gray-900 leading-snug">{t('aboutPage.hoursValue')}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 sm:col-span-2 lg:col-span-1">
                <Phone size={22} className="text-pink-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">{t('aboutPage.phone')} & {t('aboutPage.email')}</h4>
                  <p className="mt-1 text-sm font-black text-gray-900">{storePhone}</p>
                  <p className="text-xs font-semibold text-gray-500">{storeEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
