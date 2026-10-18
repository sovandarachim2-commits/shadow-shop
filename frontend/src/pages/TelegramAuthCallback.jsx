import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { completeTelegramLoginCallback } from '@/utils/telegramLogin'

/**
 * return_to target for Telegram OIDC — runs in the NEW tab/popup.
 * Posts the result to the shop tab (opener) and closes when possible.
 */
export default function TelegramAuthCallback() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Completing Telegram login…')

  useEffect(() => {
    const { mode, payload } = completeTelegramLoginCallback()
    if (mode === 'opener') {
      setMessage('You can close this tab.')
      return
    }
    if (payload?.error) {
      setMessage('Telegram login failed. You can close this tab.')
      return
    }
    // No opener (opened as a normal tab) — send user back to the shop.
    setMessage('Login received. Returning to shop…')
    const timer = window.setTimeout(() => navigate('/', { replace: true }), 600)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-semibold text-gray-500">{message}</p>
    </div>
  )
}
