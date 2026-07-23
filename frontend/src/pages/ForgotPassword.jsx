import { useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/api/auth'

function getErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (error?.response?.status === 404) return fallback
  if (error?.response?.status === 503) return fallback
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  const firstField = Object.values(data).find(Boolean)
  if (Array.isArray(firstField)) return firstField[0] || fallback
  if (typeof firstField === 'string') return firstField
  return fallback
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState(String(location.state?.email || '').trim().toLowerCase())
  const [digits, setDigits] = useState(['', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  const inputsRef = useRef([])

  const code = digits.join('')
  const isKhmer = i18n.language?.startsWith('km')
  const authFontFamily = isKhmer ? '"Khmer OS Battambang", "Khmer OS", "Noto Sans Khmer", sans-serif' : undefined

  const stepIndex = useMemo(() => {
    if (step === 'email') return 1
    if (step === 'code') return 2
    return 3
  }, [step])

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
    setDigits(pasted.padEnd(4, '').slice(0, 4).split(''))
    inputsRef.current[Math.min(pasted.length, 4) - 1]?.focus()
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const requestCode = async (event) => {
    event.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setNotice({ type: 'error', message: t('forgotPassword.emailRequired') })
      return
    }
    setLoading(true)
    try {
      await authApi.forgotPassword({ email: cleanEmail })
      setEmail(cleanEmail)
      setStep('code')
      setNotice({ type: 'success', message: t('forgotPassword.codeSent', { email: cleanEmail }) })
      setTimeout(() => inputsRef.current[0]?.focus(), 80)
    } catch (error) {
      const fallback = error?.response?.status === 503 ? t('forgotPassword.emailSendFailed') : t('forgotPassword.emailNotFound')
      setNotice({ type: 'error', message: getErrorMessage(error, fallback) })
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (event) => {
    event.preventDefault()
    if (code.length !== 4) {
      setNotice({ type: 'error', message: t('forgotPassword.codeRequired') })
      return
    }
    setLoading(true)
    try {
      await authApi.verifyPasswordResetCode({ email, code })
      setStep('password')
      setNotice({ type: 'success', message: t('forgotPassword.codeVerified') })
    } catch (error) {
      setNotice({ type: 'error', message: getErrorMessage(error, t('forgotPassword.verifyFailed')) })
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (event) => {
    event.preventDefault()
    if (password.length < 8) {
      setNotice({ type: 'error', message: t('auth.validationPasswordLength') })
      return
    }
    if (password !== confirmPassword) {
      setNotice({ type: 'error', message: t('auth.validationPasswordMismatch') })
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({ email, code, password, confirm_password: confirmPassword })
      toast.success(t('forgotPassword.resetSuccess'))
      navigate('/login', { replace: true })
    } catch (error) {
      setNotice({ type: 'error', message: getErrorMessage(error, t('forgotPassword.resetFailed')) })
    } finally {
      setLoading(false)
    }
  }

  const resendCode = async () => {
    if (loading) return
    setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setDigits(['', '', '', ''])
      setNotice({ type: 'success', message: t('forgotPassword.codeSent', { email }) })
      setTimeout(() => inputsRef.current[0]?.focus(), 80)
    } catch (error) {
      const fallback = error?.response?.status === 503 ? t('forgotPassword.emailSendFailed') : t('forgotPassword.emailNotFound')
      setNotice({ type: 'error', message: getErrorMessage(error, fallback) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-4 text-[#1A1A1A] sm:px-6 lg:flex lg:items-center lg:justify-center lg:bg-[#FFF7FB] lg:px-8 lg:py-10" style={{ fontFamily: authFontFamily }}>
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[430px] bg-white lg:min-h-[760px] lg:max-w-[1060px] lg:grid-cols-[0.9fr_1fr] lg:overflow-hidden lg:rounded-[32px] lg:border lg:border-[#F2DCE7] lg:shadow-[0_28px_80px_rgba(236,77,151,0.12)]">
        <aside className="hidden bg-[linear-gradient(180deg,#FFF5FA_0%,#FFE6F2_100%)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#EC4D97] shadow-sm">
            <ShieldCheck size={18} />
            {t('forgotPassword.secureReset')}
          </div>
          <div>
            <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-white text-[#EC4D97] shadow-[0_18px_45px_rgba(236,77,151,0.16)]">
              <Lock size={40} strokeWidth={1.8} />
            </div>
            <h2 className="mt-8 text-4xl font-bold leading-tight">{t('forgotPassword.desktopTitle')}</h2>
            <p className="mt-4 max-w-sm text-base leading-7 text-[#6B7280]">{t('forgotPassword.desktopText')}</p>
          </div>
          <p className="text-sm font-semibold text-[#9CA3AF]">{t('forgotPassword.securityNote')}</p>
        </aside>

        <div className="flex min-h-0 flex-col px-1 pb-5 pt-[calc(0.25rem+env(safe-area-inset-top))] sm:px-4 lg:px-12 lg:py-10">
          <header className="flex h-12 items-center justify-between lg:h-14">
            <button
              type="button"
              onClick={() => (step === 'email' ? navigate('/login') : setStep(step === 'password' ? 'code' : 'email'))}
              className="grid h-11 w-11 place-items-center rounded-full bg-[#F8FAFC] text-[#1A1A1A] transition hover:bg-[#FFF4F8] hover:text-[#EC4D97] focus:outline-none focus:ring-4 focus:ring-[#EC4D97]/10"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={21} strokeWidth={2.2} />
            </button>
            <span className="rounded-full bg-[#FFF4F8] px-4 py-2 text-xs font-bold text-[#EC4D97]">
              {t('forgotPassword.step', { current: stepIndex, total: 3 })}
            </span>
          </header>

          {notice && <Notice notice={notice} />}

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pt-8">
            <div className="mb-8 text-center">
              <h1 className="text-[30px] font-bold leading-tight sm:text-[34px]">
                {step === 'email' && t('forgotPassword.title')}
                {step === 'code' && t('forgotPassword.verifyTitle')}
                {step === 'password' && t('forgotPassword.newPasswordTitle')}
              </h1>
              <p className="mt-3 text-base leading-6 text-[#6B7280]">
                {step === 'email' && t('forgotPassword.subtitle')}
                {step === 'code' && t('forgotPassword.verifySubtitle', { email })}
                {step === 'password' && t('forgotPassword.newPasswordSubtitle')}
              </p>
            </div>

            {step === 'email' && (
              <form onSubmit={requestCode} className="space-y-5">
                <FieldShell label={t('auth.email')}>
                  <Mail size={19} className="text-[#EC4D97]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-[#A7B0C2]"
                  />
                </FieldShell>
                <SubmitButton loading={loading} label={t('forgotPassword.sendCode')} />
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={verifyCode} className="space-y-6">
                <div className="grid grid-cols-4 gap-3" onPaste={handlePaste}>
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
                      className="h-16 rounded-2xl border border-[#F2DCE7] bg-white text-center text-2xl font-bold text-[#1A1A1A] outline-none transition focus:border-[#EC4D97] focus:ring-4 focus:ring-[#EC4D97]/10"
                      placeholder="-"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={loading}
                  className="w-full text-center text-sm font-bold text-[#EC4D97] underline decoration-[#F8A9D0] underline-offset-4 disabled:opacity-60"
                >
                  {t('forgotPassword.resendCode')}
                </button>
                <SubmitButton loading={loading} label={t('forgotPassword.verifyCode')} />
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={resetPassword} className="space-y-5">
                <FieldShell label={t('forgotPassword.newPassword')}>
                  <Lock size={19} className="text-[#EC4D97]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-[#A7B0C2]"
                  />
                  <PasswordToggle
                    show={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                    ariaLabel={t(showPassword ? 'completeProfile.hideField' : 'completeProfile.showField', { label: t('forgotPassword.newPassword') })}
                  />
                </FieldShell>
                <FieldShell label={t('auth.confirmPassword')}>
                  <Lock size={19} className="text-[#EC4D97]" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={t('auth.confirmPassword')}
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-[#A7B0C2]"
                  />
                  <PasswordToggle
                    show={showConfirm}
                    onClick={() => setShowConfirm((value) => !value)}
                    ariaLabel={t(showConfirm ? 'completeProfile.hideField' : 'completeProfile.showField', { label: t('auth.confirmPassword') })}
                  />
                </FieldShell>
                <SubmitButton loading={loading} label={t('forgotPassword.resetPassword')} />
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function FieldShell({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#1A1A1A]">{label}</span>
      <span className="flex h-14 items-center gap-3 rounded-2xl border border-[#F2DCE7] bg-white px-4 transition focus-within:border-[#EC4D97] focus-within:ring-4 focus-within:ring-[#EC4D97]/10">
        {children}
      </span>
    </label>
  )
}

function SubmitButton({ loading, label }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#EC197A] text-base font-bold text-white shadow-[0_15px_35px_rgba(236,25,122,0.28)] transition hover:scale-[1.01] hover:bg-[#D9166F] focus:outline-none focus:ring-4 focus:ring-[#EC197A]/20 active:scale-[0.99] disabled:scale-100 disabled:opacity-60"
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : label}
    </button>
  )
}

function PasswordToggle({ show, onClick, ariaLabel }) {
  const Icon = show ? EyeOff : Eye
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#9CA3AF] transition hover:bg-[#FFF4F8] hover:text-[#EC4D97]"
      aria-label={ariaLabel}
    >
      <Icon size={18} />
    </button>
  )
}

function Notice({ notice }) {
  const isError = notice.type === 'error'
  const Icon = isError ? AlertCircle : CheckCircle2
  return (
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#F2DCE7] bg-white p-4 shadow-[0_14px_32px_rgba(236,77,151,0.10)]">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${isError ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}>
        <Icon size={20} strokeWidth={2.5} />
      </span>
      <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-[#4B5563]">{notice.message}</p>
    </div>
  )
}
