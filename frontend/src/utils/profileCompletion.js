export function isSocialProfileIncomplete(user) {
  if (!user || user.role !== 'customer') return false

  const isSocialUser = Boolean(user.google_id || user.telegram_id)
  const phone = String(user.phone || '').trim()
  const gender = String(user.gender || '').trim()
  const firstName = String(user.first_name || '').trim()
  const fullName = String(user.full_name || '').trim()
  const hasRealName = Boolean(firstName && !['google', 'telegram'].includes(firstName.toLowerCase()))
    || Boolean(fullName && !['google', 'telegram'].includes(fullName.toLowerCase()))

  return !phone || !gender || !hasRealName || (isSocialUser && user.has_usable_password === false)
}
