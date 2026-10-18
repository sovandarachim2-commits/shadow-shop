const TELEGRAM_LOGIN_SCRIPT = 'https://telegram.org/js/telegram-login.js'

function loadTelegramLoginScript() {
  return new Promise((resolve, reject) => {
    if (window.Telegram?.Login?.auth) {
      resolve()
      return
    }

    const existing = document.querySelector(`script[src="${TELEGRAM_LOGIN_SCRIPT}"]`)
    if (existing) {
      if (existing.dataset.loaded === '1' || window.Telegram?.Login?.auth) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Telegram Login')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = TELEGRAM_LOGIN_SCRIPT
    script.async = true
    script.onload = () => {
      script.dataset.loaded = '1'
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Telegram Login'))
    document.head.appendChild(script)
  })
}

/**
 * Opens Telegram's OIDC login popup ("Open Telegram to confirm").
 * Returns { id_token, user } on success.
 */
export async function openTelegramLoginPopup({ clientId, lang = 'en' } = {}) {
  const id = Number(clientId)
  if (!id) {
    throw new Error('Telegram client id is not configured')
  }

  await loadTelegramLoginScript()
  if (!window.Telegram?.Login?.auth) {
    throw new Error('Telegram Login is unavailable')
  }

  return new Promise((resolve, reject) => {
    window.Telegram.Login.auth(
      {
        client_id: id,
        scope: ['profile', 'write'],
        lang,
      },
      (data) => {
        if (!data || data.error) {
          reject(new Error(data?.error || 'Telegram login cancelled'))
          return
        }
        if (!data.id_token) {
          reject(new Error('Telegram login returned no token'))
          return
        }
        resolve(data)
      },
    )
  })
}
