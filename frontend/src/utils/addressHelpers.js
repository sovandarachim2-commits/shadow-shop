import cambodiaAdmin from '@/data/cambodia_admin.json'

const KH = cambodiaAdmin?.provinces?.length ? cambodiaAdmin : { provinces: [], districts: {}, communes: {}, labels: {} }

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

export const KHMER_FONT_FAMILY = "'Khmer OS Siemreap', 'Khmer OS', 'Noto Sans Khmer', 'Battambang', sans-serif"

const ORDER_PROVINCE_KEYS = {
  phnom_penh: 'Phnom Penh',
  banteay_meanchey: 'Banteay Meanchey',
  battambang: 'Battambang',
  kampong_cham: 'Kampong Cham',
  kampong_chhnang: 'Kampong Chhnang',
  kampong_speu: 'Kampong Speu',
  kampong_thom: 'Kampong Thom',
  kampot: 'Kampot',
  kandal: 'Kandal',
  kep: 'Kep',
  koh_kong: 'Koh Kong',
  kratie: 'Kratie',
  mondulkiri: 'Mondulkiri',
  oddar_meanchey: 'Oddar Meanchey',
  pailin: 'Pailin',
  preah_sihanouk: 'Preah Sihanouk',
  preah_vihear: 'Preah Vihear',
  prey_veng: 'Prey Veng',
  pursat: 'Pursat',
  ratanakiri: 'Ratanakiri',
  siem_reap: 'Siem Reap',
  stung_treng: 'Stung Treng',
  svay_rieng: 'Svay Rieng',
  takeo: 'Takeo',
  tboung_khmum: 'Tboung Khmum',
}

const LOCATION_ALIASES = {
  'Sen Sok': 'Saensokh',
  'Siem Reap': 'Siemreap',
}

function normalizeLocationName(name) {
  return LOCATION_ALIASES[name] || name
}

function getLocationLabel(name, pathParts = []) {
  const normalized = normalizeLocationName(name)
  if (!pathParts.length && PROVINCE_SET.has(normalized) && PROVINCE_KHMER_LABELS[normalized]) {
    return PROVINCE_KHMER_LABELS[normalized]
  }
  const key = [...pathParts.map(normalizeLocationName), normalized].filter(Boolean).join('|')
  if (KHMER_LOCATION_LABELS[key]) {
    return KHMER_LOCATION_LABELS[key]
  }
  return KHMER_LOCATION_LABELS[normalized] || KHMER_LOCATION_LABELS[name] || name
}

function resolveProvinceName(customer) {
  const fromKey = ORDER_PROVINCE_KEYS[customer?.province]
  if (fromKey) return fromKey
  if (customer?.province && PROVINCE_SET.has(customer.province)) return customer.province
  return null
}

function splitAddressSegments(address) {
  return (address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function isLikelyLocationName(name, provinceName) {
  const normalized = normalizeLocationName(name)
  if (provinceName && (name === provinceName || normalized === provinceName)) return true
  if (PROVINCE_SET.has(normalized)) return true
  if (KHMER_LOCATION_LABELS[normalized] || KHMER_LOCATION_LABELS[name]) return true

  const districts = provinceName ? (KH.districts[provinceName] || []) : []
  if (districts.includes(normalized) || districts.includes(name)) return true

  for (const district of districts) {
    const communes = KH.communes[district] || []
    if (communes.includes(normalized) || communes.includes(name)) return true
  }

  return false
}

export function formatAddressLocationKhmer({ state, city, address_line2, postal_code }) {
  const province = state || ''
  const parts = []

  if (address_line2) {
    const line2Parts = address_line2
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    line2Parts.forEach((part, index) => {
      const path = [province, city, ...line2Parts.slice(0, index)].filter(Boolean)
      parts.push(getLocationLabel(part, path))
    })
  }

  if (postal_code && isLikelyLocationName(postal_code, province)) {
    parts.push(getLocationLabel(postal_code, [province, city].filter(Boolean)))
  }

  if (city) {
    parts.push(getLocationLabel(city, province ? [province] : []))
  }

  if (province) {
    parts.push(getLocationLabel(province))
  }

  return parts.filter(Boolean).join(', ')
}

function formatLocationSegmentsKhmer(segments, provinceName) {
  if (!segments.length) return ''

  const districts = provinceName ? (KH.districts[provinceName] || []) : []
  const district = segments.find((segment) => {
    const normalized = normalizeLocationName(segment)
    return districts.includes(normalized) || districts.includes(segment)
  }) || null

  const communeSegments = segments.filter((segment) => segment !== district)
  const khmerParts = []

  communeSegments.forEach((segment) => {
    const path = district
      ? [provinceName, district].filter(Boolean)
      : [provinceName].filter(Boolean)
    khmerParts.push(getLocationLabel(segment, path))
  })

  if (district) {
    khmerParts.push(getLocationLabel(district, provinceName ? [provinceName] : []))
  }

  if (provinceName && !segments.includes(provinceName)) {
    khmerParts.push(getLocationLabel(provinceName))
  }

  return khmerParts.join(', ')
}

export function formatStoredAddressKhmer(customer) {
  const raw = (customer?.address || '').trim()
  if (!raw) return customer?.province || '-'

  if (/[\u1780-\u17FF]/.test(raw)) return raw

  const provinceName = resolveProvinceName(customer)
  const segments = splitAddressSegments(raw)
  const note = getReceiptAddressNote(customer)

  let locationSegments = segments
  if (!note && segments.length > 1 && !isLikelyLocationName(segments[0], provinceName)) {
    locationSegments = segments.slice(1)
  } else if (note) {
    locationSegments = segments.filter((segment) => segment !== note)
  }

  const khmer = formatLocationSegmentsKhmer(locationSegments, provinceName)
  return khmer || raw
}

export function formatAddressRecordKhmer(addr) {
  if (!addr) return ''

  const location = formatAddressLocationKhmer({
    state: addr.state,
    city: addr.city,
    address_line2: addr.address_line2,
    postal_code: addr.postal_code,
  })

  return [addr.address_line1, location].filter(Boolean).join(', ')
}

export function formatFullAddressKhmer(customer) {
  if (!customer) return '-'

  const note = getReceiptAddressNote(customer)
  const location = formatStoredAddressKhmer(customer)

  if (note && location && location !== '-') {
    return `${note}, ${location}`
  }

  return note || location || '-'
}

export function getReceiptAddressNote(customer) {
  if (customer?.notes?.trim()) return customer.notes.trim()

  const raw = (customer?.address || '').trim()
  if (!raw) return null

  const provinceName = resolveProvinceName(customer)
  const segments = splitAddressSegments(raw)
  if (segments.length > 1 && !isLikelyLocationName(segments[0], provinceName)) {
    return segments[0]
  }

  return null
}
