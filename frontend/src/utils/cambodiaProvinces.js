/** All 25 Cambodia provinces/municipalities (capital + 24 provinces). */
export const CAMBODIA_PROVINCES = [
  { key: 'phnom_penh', label: 'Phnom Penh' },
  { key: 'banteay_meanchey', label: 'Banteay Meanchey' },
  { key: 'battambang', label: 'Battambang' },
  { key: 'kampong_cham', label: 'Kampong Cham' },
  { key: 'kampong_chhnang', label: 'Kampong Chhnang' },
  { key: 'kampong_speu', label: 'Kampong Speu' },
  { key: 'kampong_thom', label: 'Kampong Thom' },
  { key: 'kampot', label: 'Kampot' },
  { key: 'kandal', label: 'Kandal' },
  { key: 'kep', label: 'Kep' },
  { key: 'koh_kong', label: 'Koh Kong' },
  { key: 'kratie', label: 'Kratie' },
  { key: 'mondulkiri', label: 'Mondulkiri' },
  { key: 'oddar_meanchey', label: 'Oddar Meanchey' },
  { key: 'pailin', label: 'Pailin' },
  { key: 'preah_sihanouk', label: 'Preah Sihanouk' },
  { key: 'preah_vihear', label: 'Preah Vihear' },
  { key: 'prey_veng', label: 'Prey Veng' },
  { key: 'pursat', label: 'Pursat' },
  { key: 'ratanakiri', label: 'Ratanakiri' },
  { key: 'siem_reap', label: 'Siem Reap' },
  { key: 'stung_treng', label: 'Stung Treng' },
  { key: 'svay_rieng', label: 'Svay Rieng' },
  { key: 'takeo', label: 'Takeo' },
  { key: 'tboung_khmum', label: 'Tboung Khmum' },
]

export const CAMBODIA_PROVINCE_LABELS = Object.fromEntries(
  CAMBODIA_PROVINCES.map((p) => [p.key, p.label])
)

const NAME_TO_KEY = Object.fromEntries(
  CAMBODIA_PROVINCES.flatMap((p) => {
    const aliases = [p.label, p.label.replace(/\s+/g, '')]
    if (p.key === 'mondulkiri') aliases.push('Mondul Kiri', 'Mondulkiri')
    if (p.key === 'ratanakiri') aliases.push('Ratanak Kiri', 'Ratanakiri')
    if (p.key === 'siem_reap') aliases.push('Siemreap', 'Siem Reap')
    if (p.key === 'preah_sihanouk') aliases.push('Sihanoukville', 'Preah Sihanouk')
    if (p.key === 'kratie') aliases.push('Kratié', 'Kratie')
    if (p.key === 'takeo') aliases.push('Takéo', 'Takeo')
    return aliases.map((name) => [name.toLowerCase(), p.key])
  })
)

/** Map free-text / address province name to delivery zone key. */
export function toProvinceKey(text, fallback = 'phnom_penh') {
  const raw = String(text || '').trim()
  if (!raw) return fallback
  if (CAMBODIA_PROVINCE_LABELS[raw]) return raw

  const lower = raw.toLowerCase().replace(/\s+province$/i, '').trim()
  if (NAME_TO_KEY[lower]) return NAME_TO_KEY[lower]
  if (NAME_TO_KEY[lower.replace(/\s+/g, '')]) return NAME_TO_KEY[lower.replace(/\s+/g, '')]

  for (const province of CAMBODIA_PROVINCES) {
    const label = province.label.toLowerCase()
    if (lower.includes(label) || label.includes(lower)) return province.key
  }
  return fallback
}
