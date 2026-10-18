const OIDC_ORIGIN = 'https://oauth.telegram.org'
const OIDC_AUTH_URL = `${OIDC_ORIGIN}/auth`
const CALLBACK_PATH = '/auth/telegram/callback'
const RESULT_MESSAGE = 'shadow-shop:telegram-auth'
const STATE_KEY = 'shadow-shop-telegram-oauth-state'

function randomState() {
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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

function popupFeatures() {
  const width = 550
  const height = 650
  const left = Math.max(0, (window.screen.width - width) / 2) + (window.screen.availLeft || 0)
  const top = Math.max(0, (window.screen.height - height) / 2) + (window.screen.availTop || 0)
  return `popup=yes,width=${width},height=${height},left=${left},top=${top},status=0,location=1,menubar=0,toolbar=0`
}

/**
 * MUST be called synchronously inside the click handler (before await/setState),
 * otherwise the browser opens Telegram auth in the current tab.
 */
export function openBlankTelegramAuthWindow() {
  const popup = window.open('about:blank', '_blank', popupFeatures())
  if (popup) {
    try {
      popup.document.write('<!doctype html><title>Telegram</title><body style="font-family:sans-serif;padding:24px;color:#64748b">Opening Telegram…</body>')
      popup.document.close()
      popup.focus()
    } catch {
      /* cross-origin write may fail later; ignore */
    }
  }
  return popup
}

function parseCallbackPayload() {
  const search = new URLSearchParams(window.location.search)
  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hash = new URLSearchParams(hashRaw)

  const error = search.get('error') || hash.get('error')
  if (error) return { error }

  const idToken = search.get('id_token') || hash.get('id_token')
  if (idToken) {
    return { id_token: idToken, user: decodeJwtPayload(idToken), state: search.get('state') || hash.get('state') }
  }

  const tgAuthResult = hash.get('tgAuthResult') || search.get('tgAuthResult')
  if (tgAuthResult) {
    try {
      const decoded = JSON.parse(atob(tgAuthResult.replace(/-/g, '+').replace(/_/g, '/')))
      if (decoded?.error) return { error: decoded.error }
      if (decoded?.id_token) {
        return { id_token: decoded.id_token, user: decodeJwtPayload(decoded.id_token), state: decoded.state }
      }
      if (decoded?.hash && decoded?.id) {
        return { ...decoded, state: decoded.state || search.get('state') || hash.get('state') }
      }
      if (decoded?.result) {
        return { id_token: decoded.result, user: decodeJwtPayload(decoded.result), state: decoded.state }
      }
    } catch {
      return { error: 'invalid_tg_auth_result' }
    }
  }

  return null
}

/**
 * Called from /auth/telegram/callback (new tab/popup).
 * Posts result to opener and closes when possible.
 */
export function completeTelegramLoginCallback() {
  const payload = parseCallbackPayload()
  const target = window.opener
  if (target && !target.closed) {
    try {
      target.postMessage({ type: RESULT_MESSAGE, payload }, window.location.origin)
    } catch {
      /* ignore */
    }
    window.close()
    return { mode: 'opener', payload }
  }
  // Opened as a full tab with no opener — stash for the shop tab to read
  if (payload && !payload.error) {
    sessionStorage.setItem('shadow-shop-telegram-auth-result', JSON.stringify(payload))
  }
  return { mode: 'storage', payload }
}

function buildAuthUrl({ clientId, lang = 'en' }) {
  const origin = window.location.origin
  const returnTo = `${origin}${CALLBACK_PATH}`
  const state = randomState()
  sessionStorage.setItem(STATE_KEY, state)

  let authUrl =
    `${OIDC_AUTH_URL}?client_id=${encodeURIComponent(clientId)}` +
    `&origin=${encodeURIComponent(origin)}` +
    `&return_to=${encodeURIComponent(returnTo)}` +
    `&scope=${encodeURIComponent('openid profile')}` +
    `&state=${encodeURIComponent(state)}`

  if (lang) {
    authUrl += `&lang=${encodeURIComponent(lang)}`
  }

  return { authUrl, state, origin }
}

/**
 * Opens Telegram login in a NEW tab/window (keeps cart/checkout in the current tab).
 * Pass a popup from openBlankTelegramAuthWindow() opened in the same click.
 */
export async function openTelegramLoginPopup({
  clientId,
  lang = 'en',
  popup: existingPopup = null,
} = {}) {
  const id = String(clientId || '').trim()
  if (!id) {
    throw new Error('Telegram client id is not configured')
  }

  // Prefer pre-opened window from the click handler so Chrome/Edge use a new tab.
  const popup = existingPopup || openBlankTelegramAuthWindow()
  if (!popup) {
    throw new Error('Telegram login popup was blocked. Allow popups for this site.')
  }

  const { authUrl, state, origin } = buildAuthUrl({ clientId: id, lang })

  try {
    popup.location.href = authUrl
  } catch {
    // If we can't navigate the blank window, fall back to assigning via open again
    window.open(authUrl, popup.name || '_blank', popupFeatures())
  }

  return new Promise((resolve, reject) => {
    let finished = false
    const expectedState = state

    const finish = (result) => {
      if (finished) return
      finished = true
      window.removeEventListener('message', onMessage)
      sessionStorage.removeItem(STATE_KEY)
      try {
        if (popup && !popup.closed) popup.close()
      } catch {
        /* ignore */
      }
      if (result?.error) {
        const msg = result.error === 'popup_closed' || result.error === 'access_denied'
          ? 'Telegram login cancelled'
          : result.error
        reject(new Error(msg))
        return
      }
      if (!result?.id_token && !(result?.hash && result?.id)) {
        reject(new Error('Telegram login returned no token'))
        return
      }
      resolve(result)
    }

    const onMessage = (event) => {
      if (event.origin !== origin) return
      const data = event.data
      if (!data || data.type !== RESULT_MESSAGE) return

      const payload = data.payload
      if (!payload) {
        finish({ error: 'empty_callback' })
        return
      }
      if (payload.state && payload.state !== expectedState) {
        finish({ error: 'invalid_state' })
        return
      }
      finish(payload)
    }

    window.addEventListener('message', onMessage)
    try {
      popup.focus()
    } catch {
      /* ignore */
    }

    const checkClose = () => {
      if (finished) return
      // Also accept result left in sessionStorage if callback ran as a normal tab
      try {
        const raw = sessionStorage.getItem('shadow-shop-telegram-auth-result')
        if (raw) {
          sessionStorage.removeItem('shadow-shop-telegram-auth-result')
          finish(JSON.parse(raw))
          return
        }
      } catch {
        /* ignore */
      }
      if (!popup || popup.closed) {
        finish({ error: 'popup_closed' })
        return
      }
      window.setTimeout(checkClose, 200)
    }
    checkClose()
  })
}
