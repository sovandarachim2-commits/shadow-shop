import { isValidCambodiaPhone, normalizeCambodiaPhone } from '@/utils/phone'

function isSocialAccount(user) {
  return Boolean(user?.google_id || user?.telegram_id)
}

function socialDisplayName(user) {
  const name = String(
    [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.full_name
    || ''
  ).trim()
  if (!name || ['google', 'telegram'].includes(name.toLowerCase())) return ''
  return name
}

/** Profile form first, then address, after Google or Telegram sign-in. */
export function socialProfileStep(user) {
  if (!user || (user.role && user.role !== 'customer')) return null
  if (!isSocialAccount(user)) return null
  const phone = normalizeCambodiaPhone(user.phone)
  const needsProfile = !socialDisplayName(user) || !phone || !isValidCambodiaPhone(phone) || !String(user.gender || '').trim()
  if (needsProfile) return 'profile'
  if (user.has_address === false) return 'address'
  return null
}

export function isSocialProfileIncomplete(user) {
  return socialProfileStep(user) != null
}
