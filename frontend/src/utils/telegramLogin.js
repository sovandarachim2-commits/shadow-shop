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
  // Match oauth.telegram.org/js/telegram-login.js:
  // response_type=post_message, redirect_uri = this page (must be an Allowed URL in BotFather).
  const redirectUri = `${window.location.origin}${window.location.pathname}`
  let authUrl =
    `${OIDC_AUTH_URL}?response_type=post_message` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent('openid profile')}`

  if (lang) {
    authUrl += `&lang=${encodeURIComponent(lang)}`
  }

  return { authUrl, redirectUri }
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

  const { authUrl } = buildAuthUrl({ clientId: id, lang })

  try {
    popup.location.href = authUrl
  } catch {
    window.open(authUrl, 'telegram_oidc_login', popupFeatures())
  }

  return new Promise((resolve, reject) => {
    let finished = false

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
        const code = String(result.error)
        const msg = code === 'popup_closed' || code === 'access_denied'
          ? 'Telegram login cancelled'
          : code
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
      // Official popup posts { event: 'auth_result', result: id_token } from oauth.telegram.org.
      if (event.origin === OIDC_ORIGIN && event.source === popup) {
        let data = event.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            return
          }
        }
        if (!data || data.event !== 'auth_result') return
        if (data.error) {
          finish({ error: data.error })
          return
        }
        const idToken = typeof data.result === 'string' ? data.result : ''
        if (!idToken) {
          finish({ error: 'missing id_token' })
          return
        }
        finish({ id_token: idToken, user: decodeJwtPayload(idToken) })
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
