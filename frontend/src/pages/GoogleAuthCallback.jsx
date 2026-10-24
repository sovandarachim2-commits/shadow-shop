import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import { decodeState } from '@/utils/pkce'
import { GOOGLE_CALLBACK_PATH } from '@/utils/googleRedirect'
import { isSocialProfileIncomplete } from '@/utils/profileCompletion'
import { showWelcomeToast } from '@/components/customer/WelcomeToast'

function safeReturnPath(path) {
  const value = String(path || '')
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith(GOOGLE_CALLBACK_PATH)) return '/'
  return value
}

export default function GoogleAuthCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const googleLogin = useAuthStore((s) => s.googleLogin)
  const [message, setMessage] = useState(t('auth.googleRedirectWorking'))

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const code = params.get('code')
    const state = decodeState(params.get('state'))
    window.history.replaceState({}, '', GOOGLE_CALLBACK_PATH)

    if (error || !code || !state?.v) {
      setMessage(t('auth.googleLoginFailed'))
      return undefined
    }

    const redirectUri = `${window.location.origin}${GOOGLE_CALLBACK_PATH}`
    googleLogin({
      code,
      code_verifier: state.v,
      redirect_uri: redirectUri,
      referral_code: state.f || '',
    })
      .then((user) => {
        if (cancelled) return
        showWelcomeToast()
        if (isSocialProfileIncomplete(user)) {
          useUiStore.getState().openAuthModal('complete')
        }
        navigate(safeReturnPath(state.r), { replace: true })
      })
      .catch(() => {
        if (!cancelled) setMessage(t('auth.googleLoginFailed'))
      })

    return () => {
      cancelled = true
    }
  }, [googleLogin, navigate, t])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-semibold text-gray-500">{message}</p>
    </div>
  )
}
