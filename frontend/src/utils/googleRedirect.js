import { createPkcePair, encodeState } from '@/utils/pkce'
import { openExternalUrl } from '@/utils/inAppBrowser'

export const GOOGLE_CALLBACK_PATH = '/auth/google/callback'

function safeReturnPath(path) {
  const value = String(path || '')
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith(GOOGLE_CALLBACK_PATH)) return '/'
  return value.slice(0, 300)
}

export async function startGoogleLoginRedirect({ clientId, referralCode = '', returnPath = '/' } = {}) {
  const id = String(clientId || '').trim()
  if (!id) throw new Error('Google client id is not configured')

  const { verifier, challenge } = await createPkcePair()
  const redirectUri = `${window.location.origin}${GOOGLE_CALLBACK_PATH}`
  const state = encodeState({
    v: verifier,
    r: safeReturnPath(returnPath),
    f: String(referralCode || '').slice(0, 64),
  })
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', id)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid email profile')
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('prompt', 'select_account')
  openExternalUrl(authUrl.toString())
}
