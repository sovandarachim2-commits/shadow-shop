/** Cambodia local phone: 0 + 8–9 digits (9–10 total), e.g. 0978843978 */

const CAMBODIA_PHONE_RE = /^0[1-9]\d{7,8}$/

export function normalizeCambodiaPhone(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('855')) {
    digits = `0${digits.slice(3)}`
  }
  return digits.slice(0, 10)
}

export function isValidCambodiaPhone(value) {
  return CAMBODIA_PHONE_RE.test(normalizeCambodiaPhone(value))
}
