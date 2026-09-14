import { isValidCambodiaPhone } from './phone.js'

export function isSocialProfileIncomplete(user) {
  if (!user || user.role !== 'customer') return false

  const phone = String(user.phone || '').trim()
  const gender = String(user.gender || '').trim()
  const firstName = String(user.first_name || '').trim()
  const fullName = String(user.full_name || '').trim()
  const hasRealName = Boolean(firstName && !['google', 'telegram'].includes(firstName.toLowerCase()))
    || Boolean(fullName && !['google', 'telegram'].includes(fullName.toLowerCase()))
  const hasAddress = user.has_address === true

  return (
    !isValidCambodiaPhone(phone)
    || !gender
    || !hasRealName
    || !hasAddress
  )
}
