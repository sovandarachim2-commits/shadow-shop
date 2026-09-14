import cambodiaAdmin from '@/data/cambodia_admin.json'

/**
 * Enhanced phone utilities for international support and UX optimization
 */

export const COUNTRY_DATA = [
  { code: 'KH', name: 'Cambodia', dialCode: '+855', mask: '000 000 000', flag: '🇰🇭' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', mask: '00 000 0000', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', mask: '000 000 000', flag: '🇻🇳' },
  { code: 'US', name: 'United States', dialCode: '+1', mask: '000-000-0000', flag: '🇺🇸' },
  { code: 'CN', name: 'China', dialCode: '+86', mask: '000 0000 0000', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', dialCode: '+81', mask: '00-0000-0000', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', mask: '00-0000-0000', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', mask: '0000 0000', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', mask: '00-0000 0000', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', mask: '000-000-0000', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', mask: '000 000 0000', flag: '🇵🇭' },
  { code: 'FR', name: 'France', dialCode: '+33', mask: '0 00 00 00 00', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', dialCode: '+49', mask: '000 0000000', flag: '🇩🇪' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', mask: '0000 000000', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialCode: '+1', mask: '000-000-0000', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', mask: '000 000 000', flag: '🇦🇺' },
]

/**
 * Auto-detect country based on browser locale or IP (fallback to KH)
 */
export async function detectUserCountry() {
  try {
    // Try browser language first
    const lang = navigator.language || 'en-KH'
    const countryCode = lang.split('-')[1]?.toUpperCase()
    const match = COUNTRY_DATA.find(c => c.code === countryCode)
    if (match) return match

    // Optional: Use a free IP geolocation API if needed
    // const res = await fetch('https://ipapi.co/json/')
    // const data = await res.json()
    // return COUNTRY_DATA.find(c => c.code === data.country_code) || COUNTRY_DATA[0]
  } catch (e) {}
  
  return COUNTRY_DATA[0] // Default to Cambodia
}

/**
 * Format phone number in real-time
 */
export function formatPhoneNumber(value, country) {
  const digits = value.replace(/\D/g, '')
  if (!country) return digits

  let formatted = ''
  let digitIndex = 0
  const mask = country.mask

  for (let i = 0; i < mask.length && digitIndex < digits.length; i++) {
    if (mask[i] === '0') {
      formatted += digits[digitIndex]
      digitIndex++
    } else {
      formatted += mask[i]
    }
  }

  return formatted
}

/**
 * Normalize to E.164 format for API
 */
export function toE164(phone, country) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  
  // If already has dial code, just return with +
  if (phone.startsWith('+')) return `+${digits}`
  
  // Otherwise add country dial code
  const dial = country.dialCode.replace('+', '')
  if (digits.startsWith(dial)) return `+${digits}`
  
  // Handle Cambodia special case (strip leading 0)
  if (country.code === 'KH' && digits.startsWith('0')) {
    return `+855${digits.slice(1)}`
  }
  
  return `${country.dialCode}${digits}`
}

/**
 * Validate phone number based on length/mask
 */
export function validatePhone(phone, country) {
  const digits = phone.replace(/\D/g, '')
  const requiredDigits = country.mask.replace(/[^0]/g, '').length
  return digits.length >= requiredDigits - 1 && digits.length <= requiredDigits + 1
}
