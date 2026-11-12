import { useEffect, useState } from 'react'
import { authApi } from '@/api/auth'

/**
 * Debounced live check for a friend referral code.
 * Returns { status: 'idle' | 'checking' | 'valid' | 'invalid', message, checkedCode }.
 */
export function useReferralCodeCheck(rawCode, { enabled = true, delayMs = 450 } = {}) {
  const code = String(rawCode || '').trim().toUpperCase()
  const [state, setState] = useState({
    status: 'idle',
    message: '',
    checkedCode: '',
  })

  useEffect(() => {
    if (!enabled || !code) {
      setState({ status: 'idle', message: '', checkedCode: '' })
      return undefined
    }

    setState({ status: 'checking', message: '', checkedCode: code })
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const { data } = await authApi.checkReferralCode(code, controller.signal)
        if (controller.signal.aborted) return
        setState({
          status: data?.valid ? 'valid' : 'invalid',
          message: data?.message || '',
          checkedCode: code,
        })
      } catch (err) {
        if (controller.signal.aborted || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return
        }
        setState({ status: 'idle', message: '', checkedCode: '' })
      }
    }, delayMs)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [code, enabled, delayMs])

  return state
}

