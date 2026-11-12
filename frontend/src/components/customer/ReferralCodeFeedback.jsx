import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

export default function ReferralCodeFeedback({ status, message, serverError }) {
  const errorText = serverError || (status === 'invalid' ? message : '')

  if (errorText) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-red-500">
        <XCircle size={14} className="shrink-0" />
        <span>{errorText}</span>
      </p>
    )
  }

  if (status === 'checking') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-slate-500">
        <Loader2 size={14} className="shrink-0 animate-spin text-[#EC197A]" />
        <span>Checking referral code...</span>
      </p>
    )
  }

  if (status === 'valid') {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-emerald-600">
        <CheckCircle2 size={14} className="shrink-0" />
        <span>{message || 'Referral code is valid!'}</span>
      </p>
    )
  }

  return null
}

