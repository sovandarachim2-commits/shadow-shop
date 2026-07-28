import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, ChevronDown, ChevronRight, MapPin, X,
} from 'lucide-react'
import { isValidCambodiaPhone, normalizeCambodiaPhone } from '@/utils/phone'
import cambodiaAdmin from '@/data/cambodia_admin.json'

// ─── Cambodia administrative data ───────────────────────────────────────────
const FALLBACK_KH = {
  provinces: [
    'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang',
    'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong',
    'Kratie', 'Mondulkiri', 'Oddar Meanchey', 'Pailin', 'Phnom Penh',
    'Preah Sihanouk', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri',
    'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum',
  ],
  districts: {
    'Phnom Penh': ['Boeng Keng Kang', 'Chamkarmon', 'Chbar Ampov', 'Chroy Changvar', 'Dangkao', 'Daun Penh', 'Kamboul', 'Mean Chey', 'Prek Pnov', 'Pur Senchey', 'Russey Keo', 'Saensokh', 'Sen Sok', 'Toul Kork'],
    'Siem Reap': ['Angkor Chum', 'Angkor Thom', 'Banteay Srei', 'Chi Kraeng', 'Kralanh', 'Prasat Bakong', 'Puok', 'Siem Reap', 'Soutr Nikom', 'Srey Snam', 'Svay Leu', 'Varin'],
    'Battambang': ['Banan', 'Battambang', 'Bavel', 'Ek Phnom', 'Kamrieng', 'Koas Krala', 'Maung Russey', 'Phnom Proek', 'Rotanak Mondol', 'Samlout', 'Sampov Lun', 'Sangkae', 'Thma Koul', 'Tiek Chhou'],
    'Kandal': ['Angk Snuol', 'Kien Svay', 'Khsach Kandal', 'Leuk Dek', 'Lvea Em', 'Mok Kampul', 'Ponhea Leu', 'Rokar Thum', 'Sa-ang', 'Takhmao'],
    'Kampot': ['Angkor Chey', 'Banteay Meas', 'Chhuk', 'Chum Kiri', 'Dang Tong', 'Kampong Trach', 'Kampot', 'Toek Chhou'],
    'Preah Sihanouk': ['Prey Nob', 'Sihanoukville', 'Stueng Hav'],
    'Kampong Cham': ['Batheay', 'Chamkar Leu', 'Cheung Prey', 'Dambae', 'Kampong Cham', 'Kampong Siem', 'Kang Meas', 'Koh Sotin', 'Prey Chhor', 'Srey Santhor', 'Stueng Trang'],
    'Takeo': ['Angkor Borei', 'Bati', 'Borei Cholsar', 'Doun Kaev', 'Kampong Roar', 'Kirivong', 'Prey Kabbas', 'Samraong', 'Tram Kak', 'Treang'],
    'Prey Veng': ['Kampong Trabek', 'Kampong Leaeng', 'Kanhchriech', 'Me Sang', 'Peam Chor', 'Peam Ro', 'Prey Veng', 'Svay Antor', 'Svay Teab'],
    'Kampong Speu': ['Aoral', 'Basedth', 'Kampong Speu', 'Kampong Leaeng', 'Odongk', 'Phnom Sruoch', 'Samraong Tong', 'Thpong'],
    'Kampong Thom': ['Baray', 'Kampong Svay', 'Kampong Thom', 'Prasat Ballangk', 'Prasat Sambour', 'Santuk', 'Stoung'],
    'Kampong Chhnang': ['Baribour', 'Chol Kiri', 'Kampong Chhnang', 'Kampong Leaeng', 'Kampong Tralach', 'Kirivong', 'Roleang Cheung', 'Sameakki Mean Chey', 'Tuek Phos'],
    'Kratie': ['Chhloung', 'Kratie', 'Preaek Prasab', 'Sambour', 'Snuol'],
    'Svay Rieng': ['Chantrea', 'Kampong Rou', 'Romeas Hek', 'Svay Chrum', 'Svay Rieng', 'Svay Teab'],
    'Pursat': ['Bakan', 'Kandieng', 'Krakor', 'Phnom Kravanh', 'Pursat', 'Veal Veaeng'],
    'Stung Treng': ['Sesan', 'Siem Bouk', 'Siem Pang', 'Stung Treng', 'Thala Barivat'],
    'Ratanakiri': ['Andoung Meas', 'Ban Lung', 'Bar Kaev', 'Koun Mom', 'Lumphat', 'O Chum', 'O Ya Dav', 'Voen Sai'],
    'Mondulkiri': ['Kaev Seima', 'Koh Nhek', 'Ou Reang', 'Pech Chreada', 'Sen Monorom'],
    'Preah Vihear': ['Chey Saen', 'Chhaeb', 'Choam Ksan', 'Kulen', 'Rovieng', 'Sangkom Thmei', 'Tbeng Meanchey'],
    'Oddar Meanchey': ['Anlong Veng', 'Banteay Ampil', 'Chong Kal', 'Samraong', 'Trapeang Prasat'],
    'Koh Kong': ['Botum Sakor', 'Kiri Sakor', 'Koh Kong', 'Mondol Seima', 'Smach Mean Chey', 'Sre Ambel', 'Thma Bang'],
    'Tboung Khmum': ['Dambae', 'Kroch Chhmar', 'Memot', 'Ou Reang Ov', 'Ponhea Kraek', 'Tboung Khmum'],
    'Banteay Meanchey': ['Mongkol Borei', 'Ou Chrov', 'Paoy Paet', 'Phnum Srok', 'Preah Netr Preah', 'Serey Saophoan', 'Svay Chek', 'Thma Puok'],
    'Kep': ['Damnak Chang Aeur', 'Kep'],
    'Pailin': ['Pailin', 'Sala Krau'],
  },
  communes: {
    // Phnom Penh
    'Russey Keo': ['Chrang Chamreh I', 'Chrang Chamreh II', 'Kilometre Lekh Prammuoy', 'Russei Keo', 'Svay Pak', 'Tuol Sangkae I', 'Tuol Sangkae II'],
    'Chamkarmon': ['Boeung Keng Kang I', 'Boeung Keng Kang II', 'Boeung Keng Kang III', 'Tonle Basak', 'Tumnob Tuek', 'Veal Vong'],
    'Toul Kork': ['Boeung Kak I', 'Boeung Kak II', 'Phnom Penh Thmei', 'Tuk Laak I', 'Tuk Laak II', 'Tuk Laak III'],
    'Daun Penh': ['Chakto Mukh', 'Chey Chumneah', 'Phsar Chas', 'Phsar Kandal I', 'Phsar Kandal II', 'Srah Chak', 'Wat Phnom'],
    'Boeng Keng Kang': ['Boeung Keng Kang I', 'Boeung Keng Kang II', 'Boeung Keng Kang III'],
    'Mean Chey': ['Boeng Tumpun', 'Chak Angrae Kraom', 'Chak Angrae Leu', 'Kakab', 'Nirouth', 'Preaek Pra', 'Steung Meanchey I', 'Steung Meanchey II'],
    'Sen Sok': ['Kakab', 'Krang Thnong', 'Phnom Penh Thmei', 'Toek Thla'],
    'Chroy Changvar': ['Chroy Changvar', 'Kaoh Dach', 'Preaek Lieb', 'Preaek Ta Sek'],
    'Chbar Ampov': ['Chbar Ampov I', 'Chbar Ampov II', 'Nirouth', 'Preaek Pra', 'Steung Meanchey III'],
    'Pur Senchey': ['Chaom Chau I', 'Chaom Chau II', 'Chaom Chau III', 'Kamboul', 'Kouk Roka', 'Preaek Thmei', 'Spean Thma'],
    'Dangkao': ['Cheung Aek', 'Chhbar Ampov', 'Dangkao', 'Prateah Lang', 'Spean Thma'],
    'Saensokh': ['Khmuonh', 'Krang Thnong', 'Phnom Penh Thmei', 'Roka Thum', 'Toek Thla'],
    'Kamboul': ['Cheung Aek', 'Kamboul'],
    'Prek Pnov': ['Chrouy Changvar', 'Preaek Phnov'],
    // Siem Reap
    'Siem Reap': ['Kouk Chak', 'Mondul I', 'Mondul II', 'Mondul III', 'Nokor Thum', 'Sala Kamraeuk', 'Siem Reap', 'Slor Kram', 'Svay Dangkum'],
    'Angkor Thom': ['Banteay Chhmar', 'Leang Dai', 'Nokor Thum', 'Siem Reap'],
    'Angkor Chum': ['Anlong Run', 'Srae Noy', 'Svay Leu'],
    'Puok': ['Lolok Sar', 'Puok', 'Svay Chek'],
    // Battambang
    'Battambang': ['Kampong Kor', 'Kdol Tahen', 'Noyoan', 'Preaek Moha Tel', 'Rattanak', 'Svay Por', 'Tuol Ta Ek'],
    'Banan': ['Banan', 'Kdol', 'O Char', 'Sdam', 'Sla Kram'],
    // Kandal
    'Takhmao': ['Kampong Samnanh', 'Preaek Ho', 'Samraong Kandal', 'Ta Khmau', 'Takhmao'],
    'Kien Svay': ['Kien Svay', 'Koki', 'Preaek Ambel', 'Svay Ampou'],
    // Preah Sihanouk
    'Sihanoukville': ['Buon', 'Ekreach', 'Mit Pheap', 'Pir', 'Prey Nob', 'Stueng Hav'],
    // Kampot
    'Kampot': ['Andoung Khmer', 'Kampot', 'Preaek Thmei', 'Tuk Chhu'],
    // Kratie
    'Kratie': ['Kratie', 'Preaek Prasab', 'Sambok'],
    // Svay Rieng
    'Svay Rieng': ['Prey Krong', 'Svay Rieng', 'Svay Teab'],
  },
  villages: {
    // Add complete village lists here as either:
    // 'Province|District|Commune': ['Village 1', 'Village 2']
    // or 'Commune': ['Village 1', 'Village 2'] when the commune name is unique.
  },
}

const KH = cambodiaAdmin?.provinces?.length ? cambodiaAdmin : FALLBACK_KH

const KHMER_LOCATION_LABELS = KH.labels || {}

// Province names also appear as districts/communes in labels — use explicit province names at top level.
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
  'Mondul Kiri': 'ខេត្តមណ្ឌលគិរី',
  Mondulkiri: 'ខេត្តមណ្ឌលគិរី',
  'Phnom Penh': 'រាជធានីភ្នំពេញ',
  'Preah Vihear': 'ខេត្តព្រះវិហារ',
  'Prey Veng': 'ខេត្តព្រៃវែង',
  Pursat: 'ខេត្តពោធិ៍សាត់',
  'Ratanak Kiri': 'ខេត្តរតនគិរី',
  Ratanakiri: 'ខេត្តរតនគិរី',
  Siemreap: 'ខេត្តសៀមរាប',
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

const PROVINCE_SET = new Set([...KH.provinces, ...Object.keys(PROVINCE_KHMER_LABELS)])

const KHMER_FONT_FAMILY = "'Khmer OS Siemreap', 'Khmer OS', 'Noto Sans Khmer', 'Battambang', sans-serif"

const COUNTRY_OPTIONS = [
  { value: 'Cambodia', key: 'cambodia' },
  { value: 'Thailand', key: 'thailand' },
  { value: 'Vietnam', key: 'vietnam' },
  { value: 'Laos', key: 'laos' },
  { value: 'Myanmar', key: 'myanmar' },
  { value: 'Other', key: 'other' },
]

function getLocationLabel(name, pathParts = []) {
  if (!pathParts.length && PROVINCE_SET.has(name) && PROVINCE_KHMER_LABELS[name]) {
    return PROVINCE_KHMER_LABELS[name]
  }
  const key = [...pathParts, name].filter(Boolean).join('|')
  if (KHMER_LOCATION_LABELS[key]) {
    return KHMER_LOCATION_LABELS[key]
  }
  return KHMER_LOCATION_LABELS[name] || name
}

function KhmerLocationName({ name, pathParts = [], className = '' }) {
  const khmerName = getLocationLabel(name, pathParts)

  return (
    <span className={className} style={{ fontFamily: KHMER_FONT_FAMILY }}>
      {khmerName}
    </span>
  )
}

const emptyForm = {
  label: 'home',
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Cambodia',
  is_default: false,
}

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 overflow-hidden rounded-full p-0.5 transition-colors duration-200 ${checked ? 'bg-pink-600' : 'bg-gray-200'}`}
    >
      <span
        className={`block h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

// ─── FlatInput ───────────────────────────────────────────────────────────────
function FlatInput({ required, value, onChange, placeholder, type = 'text', prefix, suffix }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      {prefix && <span className="shrink-0 text-sm text-gray-700">{prefix}</span>}
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {required && <span className="mr-0.5 shrink-0 text-sm text-pink-600">*</span>}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </div>
      {suffix}
    </div>
  )
}

// ─── LocationPicker ──────────────────────────────────────────────────────────
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
    if (level === 'province') return KH.provinces
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

    return currentList.filter((item) =>
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

  const goBack = () => {
    setSearch('')
    if (level === 'village') {
      setLevel('commune')
      setSel((s) => ({ ...s, village: '' }))
      return
    }
    if (level === 'commune') {
      setLevel('district')
      setSel((s) => ({ ...s, commune: '', village: '' }))
      return
    }
    if (level === 'district') {
      setLevel('province')
      setSel({ province: '', district: '', commune: '', village: '' })
    }
  }

  const pick = (item) => {
    setSearch('')
    if (level === 'province') {
      const next = { province: item, district: '', commune: '', village: '' }
      setSel(next)
      const districts = KH.districts[item] || []
      if (districts.length) { setLevel('district'); return }
      onSelect({ state: item, city: '', address_line2: '' })
      onClose()
    } else if (level === 'district') {
      const next = { ...sel, district: item, commune: '', village: '' }
      setSel(next)
      const communes = KH.communes[[sel.province, item].filter(Boolean).join('|')] || KH.communes[item] || []
      if (communes.length) { setLevel('commune'); return }
      onSelect({ state: sel.province, city: item, address_line2: '' })
      onClose()
    } else if (level === 'commune') {
      const next = { ...sel, commune: item, village: '' }
      setSel(next)
      const villages = getVillages(next)
      if (villages.length) { setLevel('village'); return }
      onSelect({ state: sel.province, city: sel.district, address_line2: item })
      onClose()
    } else {
      onSelect({ state: sel.province, city: sel.district, address_line2: [sel.commune, item].filter(Boolean).join(', ') })
      onClose()
    }
  }

  const navTo = (toLevel) => {
    setSearch('')
    setLevel(toLevel)
    if (toLevel === 'province') setSel({ province: '', district: '', commune: '', village: '' })
    else if (toLevel === 'district') setSel((s) => ({ ...s, district: '', commune: '', village: '' }))
    else if (toLevel === 'commune') setSel((s) => ({ ...s, commune: '', village: '' }))
    else setSel((s) => ({ ...s, village: '' }))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white pt-[env(safe-area-inset-top)] md:items-center md:justify-center md:bg-black/45 md:p-4 md:pt-4 md:backdrop-blur-[2px]">
      <div className="flex min-h-0 flex-1 flex-col bg-white md:h-[78vh] md:w-full md:max-w-lg md:flex-none md:overflow-hidden md:rounded-[28px] md:shadow-2xl">
      {/* Header */}
      <div className="flex items-center border-b border-gray-100 bg-gradient-to-r from-pink-50 via-white to-white px-5 py-4">
        {level === 'province' ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
            <MapPin size={20} />
          </div>
        ) : (
          <button
            type="button"
            onClick={goBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 transition hover:bg-pink-200 active:scale-95"
            aria-label={level === 'district' ? t('addressBook.locationPicker.backToProvinces') : t('addressBook.locationPicker.backToDistricts')}
            title={level === 'district' ? t('addressBook.locationPicker.backToProvinces') : t('addressBook.locationPicker.backToDistricts')}
          >
            <ChevronLeft size={21} />
          </button>
        )}
        <h3 className="flex-1 text-center text-base font-black text-gray-900">{titleMap[level]}</h3>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition hover:text-pink-600">
          <X size={20} />
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 h-[calc(100%-12px)] w-0.5 bg-pink-100" />

          <button type="button" onClick={() => navTo('province')} className="relative mb-4 flex items-center rounded-lg pr-2 text-sm font-semibold text-gray-600 transition hover:text-pink-600 last:mb-0">
            <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
            <KhmerLocationName name="Cambodia" />
          </button>

          {sel.province && (
            <button type="button" onClick={() => navTo('district')} className={`relative mb-4 flex items-center rounded-lg pr-2 text-sm font-semibold transition hover:text-pink-600 last:mb-0 ${level === 'province' ? 'text-pink-600' : 'text-gray-800'}`}>
              <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
              <KhmerLocationName name={sel.province} />
            </button>
          )}

          {sel.district && (
            <button type="button" onClick={() => navTo('commune')} className={`relative mb-4 flex items-center rounded-lg pr-2 text-sm font-semibold transition hover:text-pink-600 last:mb-0 ${level === 'district' ? 'text-pink-600' : 'text-gray-800'}`}>
              <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
              <KhmerLocationName name={sel.district} pathParts={[sel.province]} />
            </button>
          )}

          {sel.commune && (
            <button type="button" onClick={() => navTo('village')} className={`relative mb-4 flex items-center rounded-lg pr-2 text-sm font-semibold transition hover:text-pink-600 last:mb-0 ${level === 'commune' ? 'text-pink-600' : 'text-gray-800'}`}>
              <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
              <KhmerLocationName name={sel.commune} pathParts={[sel.province, sel.district]} />
            </button>
          )}

          {sel.village && (
            <div className="relative flex items-center text-sm font-semibold text-pink-600">
              <span className="absolute -left-6 top-0.5 h-3 w-3 rounded-full bg-pink-600 ring-2 ring-white" />
              <KhmerLocationName name={sel.village} pathParts={[sel.province, sel.district, sel.commune]} />
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('addressBook.locationPicker.search')}
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              style={{ fontFamily: KHMER_FONT_FAMILY }}
            />
          </div>
          <button type="button" className="rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold text-white">
            {t('addressBook.locationPicker.searchButton')}
          </button>
        </div>
      </div>

      {/* Alphabetical list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400" style={{ fontFamily: KHMER_FONT_FAMILY }}>{t('addressBook.locationPicker.noResults')}</p>
        ) : (
          Object.keys(grouped).sort().map((letter) => (
            <div key={letter} className="flex items-start gap-4 border-b border-gray-50 px-5 py-2">
              <span className="mt-3.5 w-4 shrink-0 text-xs font-bold text-gray-400">{letter}</span>
              <div className="flex-1 divide-y divide-gray-50">
                {grouped[letter].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => pick(item)}
                    className="flex w-full items-center justify-between py-3 text-left text-sm text-gray-800 hover:text-pink-600"
                  >
                    <KhmerLocationName name={item} pathParts={currentPathParts} className="min-w-0 flex-1" />
                    <ChevronRight size={15} className="shrink-0 text-gray-300" />
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}

// ─── AddressForm ─────────────────────────────────────────────────────────────
export function AddressForm({ address, defaultContact, isFirstAddress, onSave, onClose, isSaving, forceDefault = false }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(() =>
    address
      ? {
          label: address.label,
          full_name: address.full_name,
          phone: normalizeCambodiaPhone(address.phone),
          address_line1: address.address_line1,
          address_line2: address.address_line2 || '',
          city: address.city,
          state: address.state || '',
          postal_code: address.postal_code || '',
          country: address.country,
          is_default: address.is_default,
        }
      : {
          ...emptyForm,
          full_name: defaultContact?.full_name || '',
          phone: normalizeCambodiaPhone(defaultContact?.phone),
          is_default: forceDefault || isFirstAddress,
        }
  )
  const [showPicker, setShowPicker] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleLocationSelect = ({ state, city, address_line2 }) => {
    setForm((f) => ({ ...f, state, city, address_line2 }))
  }

  const locationSummary = useMemo(() => {
    const parts = []
    if (form.state) parts.push(getLocationLabel(form.state))
    if (form.city) parts.push(getLocationLabel(form.city, [form.state]))

    const line2Parts = form.address_line2
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    line2Parts.forEach((part, index) => {
      parts.push(getLocationLabel(part, [form.state, form.city, ...line2Parts.slice(0, index)]))
    })

    return parts.join(' › ')
  }, [form.address_line2, form.city, form.state])

  const handleSubmit = (e) => {
    e.preventDefault()
    const phone = normalizeCambodiaPhone(form.phone)
    if (!isValidCambodiaPhone(phone)) {
      setPhoneError(t('common.invalidPhone'))
      return
    }
    setPhoneError('')
    onSave({ ...form, phone })
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-0 backdrop-blur-[2px] md:items-center md:px-4">
        <div className="flex h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:h-auto md:max-h-[86vh] md:max-w-xl md:rounded-[28px]">
          {/* Header */}
          <div className="border-b border-pink-50 bg-gradient-to-r from-pink-50 via-white to-white px-5 py-4 md:px-6 md:py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
                <MapPin size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-gray-950 md:text-lg">
                  {address ? t('addressBook.editTitle') : t('addressBook.addTitle')}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-gray-500">{t('addressBook.formSubtitle')}</p>
              </div>
              <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm transition hover:text-pink-600">
                <X size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 px-5 py-4 md:px-6 md:py-5">

              {/* Full name */}
              <FlatInput
                required
                value={form.full_name}
                onChange={(v) => set('full_name', v)}
                placeholder={t('addressBook.fullNamePlaceholder')}
              />

              {/* Phone */}
              <div>
                <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className="shrink-0 text-sm text-pink-600">*</span>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => {
                      setPhoneError('')
                      set('phone', normalizeCambodiaPhone(e.target.value))
                    }}
                    placeholder={t('addressBook.phonePlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                  />
                </div>
                {phoneError && <p className="mt-1.5 px-1 text-xs font-semibold text-red-500">{phoneError}</p>}
              </div>

              {/* Country */}
              <div className="flex items-center gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <span className="mr-0.5 text-sm text-pink-600">*</span>
                <select
                  value={form.country}
                  onChange={(e) => { set('country', e.target.value); set('state', ''); set('city', ''); set('address_line2', '') }}
                  className="flex-1 appearance-none bg-transparent text-sm text-gray-800 outline-none"
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.value} value={country.value}>{t(`addressBook.countries.${country.key}`)}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="shrink-0 text-gray-400" />
              </div>

              {/* Location — cascading picker for Cambodia, free text otherwise */}
              {form.country === 'Cambodia' ? (
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex w-full items-center gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left shadow-sm"
                >
                  <span className="mr-0.5 text-sm text-pink-600">*</span>
                  {locationSummary ? (
                    <span className="flex-1 text-sm text-gray-800" style={{ fontFamily: KHMER_FONT_FAMILY }}>{locationSummary}</span>
                  ) : (
                    <span className="flex-1 text-sm text-gray-400" style={{ fontFamily: KHMER_FONT_FAMILY }}>{t('addressBook.locationPlaceholder')}</span>
                  )}
                  <ChevronRight size={15} className="shrink-0 text-gray-400" />
                </button>
              ) : (
                <>
                  <FlatInput required value={form.state} onChange={(v) => set('state', v)} placeholder={t('addressBook.provinceState')} />
                  <FlatInput required value={form.city} onChange={(v) => set('city', v)} placeholder={t('addressBook.cityDistrict')} />
                </>
              )}

              {/* Street address (optional) */}
              <FlatInput
                value={form.address_line1}
                onChange={(v) => set('address_line1', v)}
                placeholder={t('addressBook.streetPlaceholder')}
              />

            </div>

            {/* Sticky bottom */}
            <div className="border-t border-gray-100 bg-white px-5 pb-8 pt-4 md:px-6 md:pb-5">
              {!forceDefault && (
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-gray-800">{t('addressBook.setDefault')}</span>
                  <Toggle checked={form.is_default} onChange={(v) => set('is_default', v)} />
                </div>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-full bg-pink-600 py-4 text-sm font-semibold text-white transition hover:bg-pink-700 disabled:opacity-70"
              >
                {isSaving ? t('addressBook.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPicker && (
        <LocationPicker
          onSelect={handleLocationSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
