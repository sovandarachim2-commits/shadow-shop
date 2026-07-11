import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode)
  const [digits, setDigits] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputsRef = useRef([])

  const email = useMemo(() => {
    const paramsEmail = new URLSearchParams(location.search).get('email')
    return String(location.state?.email || paramsEmail || '').trim().toLowerCase()
  }, [location.search, location.state?.email])

  const code = digits.join('')
  const isComplete = code.length === 4

  useEffect(() => {
    if (!email) {
      toast.error('Please create your account first.')
      navigate('/login', { replace: true, state: { mode: 'register' } })
      return
    }
    inputsRef.current[0]?.focus()
  }, [email, navigate])

  const setDigit = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => {
      const next = [...current]
      next[index] = clean
      return next
    })
    if (clean && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return
    event.preventDefault()
    const next = pasted.padEnd(4, '').slice(0, 4).split('')
    setDigits(next)
    inputsRef.current[Math.min(pasted.length, 4) - 1]?.focus()
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!isComplete) return toast.error('Enter the 4 digit code')
    setLoading(true)
    try {
      const user = await verifyEmailCode({ email, code })
      toast.success(`Welcome, ${user.first_name || user.username}!`)
      navigate('/profile/complete', { replace: true, state: { from: location.state?.from || '/' } })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setResending(true)
    try {
      await authApi.resendEmailCode({ email })
      setDigits(['', '', '', ''])
      inputsRef.current[0]?.focus()
      toast.success('New code sent to your email')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f2f5] px-4 py-6 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[444px] flex-col rounded-[28px] bg-white px-6 py-8 shadow-[0_16px_40px_rgba(17,24,39,0.06)] sm:px-8">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>

        <form onSubmit={submit} className="mt-16 flex flex-col items-center">
          <h1 className="text-center text-[28px] font-black tracking-tight text-gray-900">Verify Code</h1>
          <p className="mt-2 max-w-[280px] text-center text-sm font-semibold leading-5 text-gray-400">
            Please enter the code we just sent to email
            <span className="block truncate text-gray-500">{email}</span>
          </p>

          <div className="mt-10 grid grid-cols-4 gap-3" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => { inputsRef.current[index] = node }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                value={digit}
                onChange={(event) => setDigit(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="h-14 w-16 rounded-2xl border-0 bg-gray-100 text-center text-lg font-black text-gray-700 outline-none transition placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-[#E91E63]/30"
                placeholder="-"
              />
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold text-gray-400">Didn&apos;t receive OTP?</p>
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="mt-1 text-sm font-black text-gray-700 underline decoration-gray-400 underline-offset-2 transition hover:text-[#E91E63] disabled:opacity-60"
            >
              {resending ? 'Sending...' : 'Resend code'}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !isComplete}
            className="mt-10 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#E91E63] text-lg font-black text-white shadow-[0_14px_30px_rgba(233,30,99,0.22)] transition hover:opacity-90 disabled:bg-gray-400 disabled:shadow-none"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify'}
          </button>
        </form>
      </section>
    </main>
  )
}
