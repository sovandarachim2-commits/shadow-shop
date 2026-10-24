export function isTelegramInAppBrowser() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return (
    /Telegram/i.test(ua) ||
    typeof window.TelegramWebviewProxy !== 'undefined' ||
    typeof window.TelegramWebviewProxyProto !== 'undefined' ||
    typeof window.TelegramWebview !== 'undefined'
  )
}

function postTelegramEvent(eventType, eventData) {
  try {
    if (window.Telegram?.WebApp?.openLink && eventType === 'web_app_open_link') {
      window.Telegram.WebApp.openLink(eventData.url)
      return true
    }
  } catch {
    /* try the raw bridge */
  }
  try {
    if (window.TelegramWebviewProxy?.postEvent) {
      window.TelegramWebviewProxy.postEvent(eventType, JSON.stringify(eventData))
      return true
    }
  } catch {
    /* try the desktop bridge */
  }
  try {
    if (window.external && typeof window.external.notify === 'function') {
      window.external.notify(JSON.stringify({ eventType, eventData }))
      return true
    }
  } catch {
    /* fall through to a normal navigation */
  }
  return false
}

export function openExternalUrl(url) {
  if (postTelegramEvent('web_app_open_link', { url })) return

  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) {
    const stripped = url.replace(/^https?:\/\//, '')
    window.location.href = `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`
    return
  }
  if (/iPhone|iPad|iPod/i.test(ua)) {
    window.location.href = url.replace(/^https:\/\//, 'x-safari-https://').replace(/^http:\/\//, 'x-safari-http://')
    return
  }
  window.location.assign(url)
}
