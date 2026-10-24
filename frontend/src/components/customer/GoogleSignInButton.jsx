import { useEffect, useRef } from 'react'
import { isTelegramInAppBrowser } from '@/utils/inAppBrowser'

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const finish = () => {
      if (window.google?.accounts?.id) resolve()
      else reject(new Error('Google Identity API unavailable'))
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      if (existing.dataset.loaded === '1' || window.google?.accounts?.id) {
        finish()
        return
      }
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Identity script failed')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      script.dataset.loaded = '1'
      finish()
    }
    script.onerror = () => reject(new Error('Google Identity script failed'))
    document.head.appendChild(script)
  })
}

function stretchGoogleButton(host) {
  const frame = host.querySelector('iframe')
  const button = host.querySelector('div[role="button"]')
  const ready = Boolean(frame || button)
  host.style.pointerEvents = ready ? 'auto' : 'none'
  if (!ready) return

  host.querySelectorAll('div, iframe').forEach((el) => {
    el.style.setProperty('position', 'absolute', 'important')
    el.style.setProperty('inset', '0', 'important')
    el.style.setProperty('width', '100%', 'important')
    el.style.setProperty('height', '100%', 'important')
    el.style.setProperty('max-width', 'none', 'important')
    el.style.setProperty('min-height', '100%', 'important')
    el.style.setProperty('margin', '0', 'important')
    el.style.setProperty('padding', '0', 'important')
    el.style.setProperty('transform', 'none', 'important')
  })
  if (button) {
    button.style.setProperty('z-index', '2', 'important')
    button.style.setProperty('cursor', 'pointer', 'important')
  }
}

export default function GoogleSignInButton({ clientId, onCredential, onClick, disabled = false, className = '', children }) {
  const hostRef = useRef(null)
  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential
  const inTelegramBrowser = isTelegramInAppBrowser()

  useEffect(() => {
    if (inTelegramBrowser || !clientId || disabled) return undefined
    let cancelled = false

    const mount = async () => {
      await loadGoogleIdentityScript()
      if (cancelled || !hostRef.current || !window.google?.accounts?.id) return

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredentialRef.current?.(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: false,
      })

      const host = hostRef.current
      host.innerHTML = ''
      const width = Math.max(Math.round(host.getBoundingClientRect().width) || 240, 240)
      window.google.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width,
        logo_alignment: 'left',
      })
      const restretch = () => {
        if (!cancelled && hostRef.current) stretchGoogleButton(hostRef.current)
      }
      window.requestAnimationFrame(restretch)
      window.setTimeout(restretch, 50)
      window.setTimeout(restretch, 300)
    }

    mount().catch(() => {
      if (hostRef.current) hostRef.current.style.pointerEvents = 'none'
    })

    return () => {
      cancelled = true
    }
  }, [clientId, disabled, inTelegramBrowser])

  return (
    <div className={`relative min-w-0 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
      {clientId && !disabled && !inTelegramBrowser && (
        <div
          ref={hostRef}
          aria-hidden="true"
          className="absolute inset-0 z-10 cursor-pointer overflow-hidden opacity-[0.01]"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </div>
  )
}
