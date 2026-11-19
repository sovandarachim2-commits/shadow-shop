export const COLOR_HEX_MAP = {
  beige: '#E8D8C8',
  pink: '#EC197A',
  black: '#18181B',
  white: '#FFFFFF',
  blue: '#2563EB',
  red: '#DC2626',
  green: '#16A34A',
  gray: '#9CA3AF',
  grey: '#9CA3AF',
  brown: '#8B5A2B',
  navy: '#1E3A8A',
  yellow: '#FACC15',
  orange: '#F97316',
  purple: '#9333EA',
  gold: '#D4AF37',
  silver: '#C0C0C0',
  cream: '#FFFDD0',
  maroon: '#800000',
  olive: '#808000',
  teal: '#0D9488',
  cyan: '#06B6D4',
  khaki: '#C3B091',
  rose: '#F43F5E',
  coral: '#FF7F50',
  burgundy: '#800020',
  charcoal: '#374151',
  tan: '#D2B48C',
  lavender: '#E6E6FA',
  ivory: '#FFFFF0',
  peach: '#FFDAB9',
  mint: '#98FF98',
  wine: '#722F37',
  violet: '#7C3AED',
  khmer_ខ្មៅ: '#18181B',
  khmer_ស: '#FFFFFF',
  khmer_ខៀវ: '#2563EB',
  khmer_ក្រហម: '#DC2626',
  khmer_បៃតង: '#16A34A',
  khmer_ប្រផេះ: '#9CA3AF',
  khmer_ផ្កាឈូក: '#EC197A',
  khmer_បន៍ត្នោតខ្ចី: '#E8D8C8',
  khmer_ត្នោត: '#8B5A2B',
  khmer_ទឹកប៊ិច: '#1E3A8A',
  khmer_លឿង: '#FACC15',
  khmer_ទឹកក្រូច: '#F97316',
  khmer_ស្វាយ: '#9333EA',
  khmer_មាស: '#D4AF37',
  khmer_ប្រាក់: '#C0C0C0',
}

export function getColorHex(colorName) {
  if (!colorName || typeof colorName !== 'string') return null
  const trimmed = colorName.trim()
  if (trimmed.startsWith('#') || trimmed.startsWith('rgb') || trimmed.startsWith('hsl')) {
    return trimmed
  }

  // Handle bilingual e.g. "Pink / ផ្កាឈូក" or "Beige / បន៍ត្នោតខ្ចី"
  const parts = trimmed.split(/[\/\-,]/).map((p) => p.trim().toLowerCase()).filter(Boolean)
  for (const part of parts) {
    if (COLOR_HEX_MAP[part]) return COLOR_HEX_MAP[part]
    if (COLOR_HEX_MAP[`khmer_${part}`]) return COLOR_HEX_MAP[`khmer_${part}`]
  }

  // Substring check
  const lower = trimmed.toLowerCase()
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (!key.startsWith('khmer_') && lower.includes(key)) {
      return hex
    }
  }

  return null
}
