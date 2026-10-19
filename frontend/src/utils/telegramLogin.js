const OIDC_ORIGIN = 'https://oauth.telegram.org'
const OIDC_AUTH_URL = `${OIDC_ORIGIN}/auth`
const RESULT_MESSAGE = 'shadow-shop:telegram-auth'
const STATE_KEY = 'shadow-shop-telegram-oauth-state'

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

/**
 * MUST be called synchronously inside the click handler (before await/setState),
 * otherwise the browser opens Telegram auth in the current tab.
 * No size features: Chrome then uses a full browser tab, not a small popup.
 */
export function openBlankTelegramAuthWindow() {
  const popup = window.open('about:blank', '_blank')
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

function randomUrlSafe(size = 32) {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function widgetUserFromParams(params) {
  const id = params.get('id')
  const hash = params.get('hash')
  if (!id || !hash) return null
  return {
    id,
    first_name: params.get('first_name') || '',
    last_name: params.get('last_name') || '',
    username: params.get('username') || '',
    photo_url: params.get('photo_url') || '',
    auth_date: params.get('auth_date') || '',
    hash,
    state: params.get('state') || '',
  }
}

function widgetUserFromObject(result) {
  if (!result || typeof result !== 'object') return null
  const source = result.id ? result : (result.user?.id ? result.user : null)
  if (!source?.id) return null
  const hash = result.hash || source.hash
  if (!hash) return null
  return {
    id: source.id,
    first_name: source.first_name || '',
    last_name: source.last_name || '',
    username: source.username || '',
    photo_url: source.photo_url || '',
    auth_date: source.auth_date || '',
    hash,
    state: result.state || source.state || '',
  }
}

function isJwt(value) {
  return typeof value === 'string' && value.split('.').length === 3 && value.split('.').every(Boolean)
}

function normalizeTelegramMessage(data) {
  if (!data || data.event !== 'auth_result') return null
  if (data.error) return { error: data.error }

  const result = data.result
  if (typeof result === 'string' && result) {
    if (isJwt(result)) {
      return { id_token: result, user: decodeJwtPayload(result) }
    }
    if (result.trim().startsWith('{')) {
      try {
        return widgetUserFromObject(JSON.parse(result))
      } catch {
        return null
      }
    }
    try {
      const decoded = JSON.parse(atob(result.replace(/-/g, '+').replace(/_/g, '/')))
      return widgetUserFromObject(decoded) || (decoded?.id_token ? { id_token: decoded.id_token, user: decodeJwtPayload(decoded.id_token) } : null)
    } catch {
      return null
    }
  }

  if (result && typeof result === 'object') {
    if (typeof result.id_token === 'string' && result.id_token) {
      return { id_token: result.id_token, user: decodeJwtPayload(result.id_token), state: result.state }
    }
    const widgetUser = widgetUserFromObject(result)
    if (widgetUser) return widgetUser
  }

  return widgetUserFromObject(data)
}

function parseCallbackPayload() {
  const search = new URLSearchParams(window.location.search)
  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hash = new URLSearchParams(hashRaw)

  const error = search.get('error') || hash.get('error')
  if (error) return { error }

  const code = search.get('code') || hash.get('code')
  if (code) {
    return { code, state: search.get('state') || hash.get('state') }
  }

  const idToken = search.get('id_token') || hash.get('id_token')
  if (idToken) {
    return { id_token: idToken, user: decodeJwtPayload(idToken), state: search.get('state') || hash.get('state') }
  }

  const widgetUser = widgetUserFromParams(search) || widgetUserFromParams(hash)
  if (widgetUser) return widgetUser

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
  // Same shape as Telegram's own login script: the token is posted straight
  // back to this tab. No code exchange, so the shop does not wait on another
  // round trip after the user confirms.
  const redirectUri = `${window.location.origin}/auth/telegram/callback`
  const nonce = randomUrlSafe(24)
  let authUrl =
    `${OIDC_AUTH_URL}?response_type=post_message` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&origin=${encodeURIComponent(window.location.origin)}` +
    `&scope=${encodeURIComponent('openid profile')}` +
    `&nonce=${encodeURIComponent(nonce)}`
  if (lang) authUrl += `&lang=${encodeURIComponent(lang)}`
  return { authUrl, redirectUri, nonce }
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

  const { authUrl, redirectUri, nonce } = buildAuthUrl({ clientId: id, lang })
  sessionStorage.setItem(STATE_KEY, JSON.stringify({ nonce, redirectUri }))

  try {
    popup.location.href = authUrl
  } catch {
    window.open(authUrl, '_blank')
  }

  return new Promise((resolve, reject) => {
    let finished = false

    const finish = (result) => {
      if (finished) return
      finished = true
      window.removeEventListener('message', onMessage)
      let saved = {}
      try {
        saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}')
      } catch {
        saved = {}
      }
      sessionStorage.removeItem(STATE_KEY)
      try {
        if (popup && !popup.closed) popup.close()
      } catch {
        /* ignore */
      }
      if (result?.error) {
        const code = String(result.error)
        const msg = code === 'popup_closed' || code === 'access_denied'
          ? 'Telegram login cancelled'
          : code
        reject(new Error(msg))
        return
      }
      if (result?.code) {
        resolve({
          code: result.code,
          code_verifier: saved.codeVerifier || '',
          redirect_uri: saved.redirectUri || '',
        })
        return
      }
      if (!result?.id_token && !(result?.hash && result?.id)) {
        reject(new Error('Telegram login returned no token'))
        return
      }
      resolve(result)
    }

    const onMessage = (event) => {
      // Telegram posts { event: 'auth_result', result: id_token } from oauth.telegram.org.
      // The sender may be the popup or a frame inside it, so do not wait for a redirect.
      if (event.origin === OIDC_ORIGIN) {
        let data = event.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            return
          }
        }
        const normalized = normalizeTelegramMessage(data)
        if (!normalized) return
        finish(normalized)
        return
      }

      // Fallback if a callback tab posts back to this page.
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || data.type !== RESULT_MESSAGE) return
      finish(data.payload || { error: 'empty_callback' })
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
