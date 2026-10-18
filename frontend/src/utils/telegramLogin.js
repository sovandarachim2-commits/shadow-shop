const OIDC_ORIGIN = 'https://oauth.telegram.org'
const OIDC_AUTH_URL = `${OIDC_ORIGIN}/auth`

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = payload.length % 4
    const normalized = pad ? `${payload}${'='.repeat(4 - pad)}` : payload
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

function buildAuthResult(data) {
  if (data?.error) return { error: data.error }
  const idToken = data?.result || data?.id_token
  if (!idToken || typeof idToken !== 'string') return { error: 'missing id_token' }
  const user = decodeJwtPayload(idToken)
  if (!user) return { error: 'malformed id_token' }
  return { id_token: idToken, user }
}

/**
 * Opens Telegram OIDC login with explicit origin
 * (official telegram-login.js omits origin → "origin required").
 * Returns { id_token, user } on success.
 */
export async function openTelegramLoginPopup({ clientId, lang = 'en' } = {}) {
  const id = String(clientId || '').trim()
  if (!id) {
    throw new Error('Telegram client id is not configured')
  }

  const origin = window.location.origin
  const redirectUri = `${origin}${window.location.pathname || '/'}`
  const scope = 'openid profile telegram:bot_access'

  let authUrl =
    `${OIDC_AUTH_URL}?response_type=post_message` +
    `&client_id=${encodeURIComponent(id)}` +
    `&origin=${encodeURIComponent(origin)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`

  if (lang) {
    authUrl += `&lang=${encodeURIComponent(lang)}`
  }

  const width = 550
  const height = 650
  const left = Math.max(0, (window.screen.width - width) / 2) + (window.screen.availLeft || 0)
  const top = Math.max(0, (window.screen.height - height) / 2) + (window.screen.availTop || 0)
  const features =
    `width=${width},height=${height},left=${left},top=${top},status=0,location=0,menubar=0,toolbar=0`

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl, 'telegram_oidc_login', features)
    if (!popup) {
      reject(new Error('Telegram login popup was blocked'))
      return
    }

    let finished = false

    const finish = (result) => {
      if (finished) return
      finished = true
      window.removeEventListener('message', onMessage)
      try {
        if (!popup.closed) popup.close()
      } catch {
        /* ignore */
      }
      if (result?.error) {
        reject(new Error(result.error === 'popup_closed' ? 'Telegram login cancelled' : result.error))
        return
      }
      if (!result?.id_token) {
        reject(new Error('Telegram login returned no token'))
        return
      }
      resolve(result)
    }

    const onMessage = (event) => {
      if (event.origin !== OIDC_ORIGIN) return
      if (event.source !== popup) return

      let data = event.data
      try {
        if (typeof data === 'string') data = JSON.parse(data)
      } catch {
        return
      }

      if (data?.event === 'auth_result') {
        finish(buildAuthResult(data))
      }
    }

    window.addEventListener('message', onMessage)
    popup.focus()

    const checkClose = () => {
      if (finished) return
      if (!popup || popup.closed) {
        finish({ error: 'popup_closed' })
        return
      }
      window.setTimeout(checkClose, 200)
    }
    checkClose()
  })
}
