import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  MailCheck,
  ShieldCheck,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import { cn } from '@/utils/helpers'

function getErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  const firstField = Object.values(data).find(Boolean)
  if (Array.isArray(firstField)) return firstField[0] || fallback
  if (typeof firstField === 'string') return firstField
  return fallback
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const verifyEmailCode = useAuthStore((s) => s.verifyEmailCode)
  const [digits, setDigits] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [notice, setNotice] = useState(null)
  const inputsRef = useRef([])

  const email = useMemo(() => {
    const paramsEmail = new URLSearchParams(location.search).get('email')
    return String(location.state?.email || paramsEmail || '').trim().toLowerCase()
  }, [location.search, location.state?.email])

  const code = digits.join('')
  const isComplete = code.length === 4
  const isKhmer = i18n.language?.startsWith('km')
  const authFontFamily = isKhmer ? '"Khmer OS Battambang", "Khmer OS", "Noto Sans Khmer", sans-serif' : undefined

  useEffect(() => {
    if (!email) {
      toast.error(t('verifyEmail.createFirst'))
      navigate('/login', { replace: true, state: { mode: 'register' } })
      return
    }
    inputsRef.current[0]?.focus()
  }, [email, navigate, t])

  const setDigit = (index, value) => {
    if (notice?.type === 'error') setNotice(null)
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
    if (loading) return
    if (!isComplete) {
      setNotice({
        type: 'error',
        title: t('verifyEmail.incompleteTitle'),
        message: t('verifyEmail.incompleteMessage'),
      })
      return
    }
    setLoading(true)
    try {
      const user = await verifyEmailCode({ email, code })
      setNotice({
        type: 'success',
        title: t('verifyEmail.successTitle'),
        message: t('auth.welcomeUser', { name: user.first_name || user.username }),
      })
      toast.success(t('auth.welcomeUser', { name: user.first_name || user.username }))
      navigate('/profile/complete', { replace: true, state: { from: location.state?.from || '/' } })
    } catch (err) {
      setNotice({
        type: 'error',
        title: t('verifyEmail.failureTitle'),
        message: getErrorMessage(err, t('verifyEmail.failureMessage')),
      })
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (resending) return
    setResending(true)
    try {
      await authApi.resendEmailCode({ email })
      setDigits(['', '', '', ''])
      inputsRef.current[0]?.focus()
      setNotice({
        type: 'success',
        title: t('verifyEmail.codeSentTitle'),
        message: t('verifyEmail.codeSentMessage', { email }),
      })
    } catch (err) {
      setNotice({
        type: 'error',
        title: t('verifyEmail.resendFailureTitle'),
        message: getErrorMessage(err, t('verifyEmail.resendFailureMessage')),
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-white px-4 py-4 text-[#1A1A1A] sm:px-6 lg:flex lg:items-center lg:justify-center lg:px-8 lg:py-10" style={{ fontFamily: authFontFamily }}>
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[430px] items-start sm:items-center lg:min-h-[820px] lg:max-w-[1400px]">
        <section className="relative grid min-h-[calc(100vh-2rem)] w-full bg-white pb-7 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:min-h-[760px] sm:px-6 sm:py-6 lg:min-h-[820px] lg:grid-cols-[1.05fr_0.95fr] lg:overflow-hidden lg:rounded-[32px] lg:border lg:border-gray-200 lg:p-0 lg:shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
          <DesktopInfo email={email} t={t} />

          <div className="relative flex min-h-0 flex-col lg:px-12 lg:py-10">
          <header className="flex h-12 items-center lg:h-14">
            <button
              type="button"
              onClick={() => navigate('/login', { state: { mode: 'register' } })}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#F0D9E6] bg-white text-[#1A1A1A] shadow-sm transition hover:bg-[#FFF4F8] hover:text-[#EC4D97] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10 lg:h-12 lg:w-12"
              aria-label="Back"
            >
              <ArrowLeft size={21} strokeWidth={2.2} />
            </button>
          </header>

          {notice && (
            <NoticePopup
              notice={notice}
              t={t}
              onClose={() => setNotice(null)}
            />
          )}

          <form onSubmit={submit} className="mx-auto flex w-full flex-1 flex-col items-center px-1 pt-16 sm:pt-20 lg:max-w-lg lg:justify-center lg:pt-0">
            <h1 className="text-center text-[30px] font-bold leading-tight text-[#1A1A1A] sm:text-[34px] lg:text-[40px]">
              {t('verifyEmail.title')}
            </h1>
            <p className="mt-5 max-w-[330px] text-center text-base font-normal leading-6 text-[#6B7280] lg:mt-6 lg:max-w-[430px] lg:text-lg lg:leading-7">
              {t('verifyEmail.subtitle')}
              <span className="block truncate">{email}</span>
            </p>

            <OtpInputs
              digits={digits}
              inputsRef={inputsRef}
              setDigit={setDigit}
              handleKeyDown={handleKeyDown}
              handlePaste={handlePaste}
            />

            <div className="mt-8 text-center lg:mt-10">
              <p className="text-base font-normal text-[#6B7280] lg:text-lg">{t('verifyEmail.dontReceive')}</p>
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="mt-1 text-base font-bold text-[#EC4D97] underline decoration-[#F8A9D0] underline-offset-4 transition hover:text-[#E53888] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10 disabled:opacity-60 lg:text-lg"
              >
                {resending ? t('verifyEmail.sending') : t('verifyEmail.resendCode')}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !isComplete}
              className="mt-8 flex h-14 w-full max-w-md items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FF6CAB,#EC4D97)] text-base font-bold text-white shadow-[0_15px_35px_rgba(236,77,151,0.25)] transition hover:scale-[1.02] hover:bg-[linear-gradient(135deg,#FF62A5,#E53888)] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/20 active:scale-[0.99] disabled:scale-100 disabled:bg-pink-300 disabled:shadow-none lg:mt-10 lg:h-16 lg:text-lg"
            >
              {loading ? <Loader2 size={22} className="animate-spin" /> : t('verifyEmail.verify')}
            </button>
          </form>

          <div className="mt-auto flex items-center justify-center gap-2 border-t border-[#F0D9E6]/70 pt-5 text-sm font-normal text-[#6B7280] lg:text-base">
            <LockKeyhole size={20} />
            {t('verifyEmail.securityNote')}
          </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function DesktopInfo({ email, t }) {
  return (
    <aside className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#FFF5FA_0%,#FFE6F2_54%,#FFD8EA_100%)] p-12 lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#FFD6E8]/80 blur-2xl" />
      <div className="absolute right-10 top-24 h-44 w-44 rounded-full bg-white/65 blur-2xl" />
      <div className="absolute bottom-24 left-1/2 h-72 w-72 rounded-full bg-[#FFF4F8]/80 blur-2xl" />
      <div className="absolute left-20 top-20 grid grid-cols-6 gap-2 opacity-50">
        {Array.from({ length: 36 }).map((_, index) => (
          <span key={index} className="h-1.5 w-1.5 rounded-full bg-white" />
        ))}
      </div>
      <button
        type="button"
        className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/75 px-5 py-2 text-sm font-bold text-[#EC4D97] shadow-[0_12px_28px_rgba(236,77,151,0.10)] backdrop-blur"
        tabIndex={-1}
      >
        <MailCheck size={18} />
        {t('verifyEmail.emailVerification')}
      </button>

      <div className="relative z-10 max-w-md">
        <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-white text-[#EC4D97] shadow-[0_18px_45px_rgba(236,77,151,0.18)]">
          <MailCheck size={42} strokeWidth={1.9} />
        </div>
        <h2 className="mt-8 text-4xl font-bold leading-tight text-[#1A1A1A]">
          {t('verifyEmail.desktopTitle')}
        </h2>
        <p className="mt-5 text-base font-normal leading-7 text-[#6B7280]">
          {t('verifyEmail.desktopDescriptionBefore')} <span className="font-bold text-[#EC4D97]">{email}</span> {t('verifyEmail.desktopDescriptionAfter')}
        </p>
      </div>

      <div className="relative z-10 rounded-[24px] border border-white/70 bg-white/65 p-5 shadow-[0_20px_40px_rgba(236,77,151,0.10)] backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FFF4F8] text-[#EC4D97]">
            <ShieldCheck size={21} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">{t('verifyEmail.whyVerify')}</p>
            <p className="mt-1 text-sm font-normal leading-6 text-[#6B7280]">
              {t('verifyEmail.whyVerifyText')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function NoticePopup({ notice, t, onClose }) {
  const isError = notice.type === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2

  return (
    <div className="absolute left-4 right-4 top-20 z-20 sm:left-8 sm:right-8" role="alert" aria-live="assertive">
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_20px_42px_rgba(236,77,151,0.14)]',
          isError ? 'border-red-100' : 'border-emerald-100'
        )}
      >
        <span
          className={cn(
            'mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white',
            isError ? 'bg-[#EF4444]' : 'bg-[#22C55E]'
          )}
        >
          <Icon size={21} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-bold', isError ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
            {notice.title}
          </p>
          <p className="mt-1 text-sm font-normal leading-5 text-[#6B7280]">
            {notice.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#6B7280] transition hover:bg-[#FFF4F8] hover:text-[#EC4D97] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10"
          aria-label={t('verifyEmail.closeMessage')}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

function OtpInputs({ digits, inputsRef, setDigit, handleKeyDown, handlePaste }) {
  return (
    <div className="mt-7 grid grid-cols-4 gap-4 lg:mt-9 lg:gap-6" onPaste={handlePaste}>
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
          className={cn(
            'h-14 w-14 rounded-2xl border border-[#F2DCE7] bg-white text-center text-xl font-bold text-[#1A1A1A] outline-none transition placeholder:text-[#A7B0C2] focus:border-[#EC4D97] focus:bg-white focus:ring-4 focus:ring-[#EC4D97]/10 lg:h-20 lg:w-20 lg:rounded-[24px] lg:text-2xl',
            digit && 'border-[#EC4D97] bg-[#FFF4F8] text-[#EC4D97]'
          )}
          placeholder="-"
        />
      ))}
    </div>
  )
}
