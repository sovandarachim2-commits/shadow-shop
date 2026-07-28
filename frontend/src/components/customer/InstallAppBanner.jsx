import { useEffect, useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

const DISMISSED_KEY = 'shadow-shop-install-banner-dismissed-at'
const DISMISS_HIDE_MS = 24 * 60 * 60 * 1000

function isAppInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export default function InstallAppBanner({ bottomOffset = false }) {
  const { t } = useTranslation()
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isAppInstalled()) return undefined

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0)
    const isRecentlyDismissed = dismissedAt && Date.now() - dismissedAt < DISMISS_HIDE_MS
    if (isRecentlyDismissed) return undefined
    setIsVisible(true)

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setIsVisible(true)
    }

    const handleInstalled = () => {
      setIsVisible(false)
      setInstallPrompt(null)
      localStorage.removeItem(DISMISSED_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setIsVisible(false)
  }

  const installApp = async () => {
    if (!installPrompt) {
      toast(t('installApp.browserHelp'))
      return
    }

    installPrompt.prompt()
    const choice = await installPrompt.userChoice.catch(() => null)
    setInstallPrompt(null)

    if (choice?.outcome === 'accepted') {
      setIsVisible(false)
      localStorage.removeItem(DISMISSED_KEY)
      return
    }

    dismiss()
  }

  if (!isVisible) return null

  return (
    <div
      className={[
        'fixed inset-x-3 z-[60] mx-auto max-w-md rounded-2xl border border-pink-100 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] md:bottom-5 md:right-5 md:left-auto md:mx-0',
        bottomOffset ? 'bottom-[calc(112px+env(safe-area-inset-bottom))]' : 'bottom-[calc(18px+env(safe-area-inset-bottom))]',
      ].join(' ')}
      role="region"
      aria-label={t('installApp.title')}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <Smartphone size={23} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-gray-950">{t('installApp.title')}</p>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-gray-500">{t('installApp.text')}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label={t('installApp.dismiss')}
          title={t('installApp.dismiss')}
        >
          <X size={18} />
        </button>
      </div>
      <button
        type="button"
        onClick={installApp}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 text-sm font-black text-white shadow-lg shadow-pink-100 transition hover:bg-pink-700 active:scale-[0.99]"
      >
        <Download size={17} />
        {t('installApp.button')}
      </button>
    </div>
  )
}
