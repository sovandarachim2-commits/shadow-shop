import { useEffect, useState } from 'react'
import { Coins, Gift, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/helpers'

export default function ReferralBonusModal({
  isOpen,
  points,
  note,
  onClose,
  onClaim,
  onViewNotifications,
}) {
  const { t } = useTranslation()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 50)
      return () => clearTimeout(timer)
    }
    setShowContent(false)
  }, [isOpen])

  if (!isOpen) return null

  const confetti = [
    'left-[10%] top-[16%] rotate-[-25deg] bg-pink-500',
    'left-[20%] top-[27%] rotate-[35deg] bg-yellow-400',
    'left-[30%] top-[14%] rotate-[20deg] bg-emerald-400',
    'right-[18%] top-[18%] rotate-[-35deg] bg-fuchsia-500',
    'right-[10%] top-[31%] rotate-[28deg] bg-sky-500',
    'left-[14%] top-[40%] rotate-[55deg] bg-violet-500',
    'right-[23%] top-[40%] rotate-[-15deg] bg-amber-400',
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 py-6">
      <div
        className={cn(
          'absolute inset-0 bg-gray-950/45 backdrop-blur-sm transition-opacity duration-300',
          showContent ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'relative w-full max-w-[460px] transform overflow-hidden rounded-[28px] bg-white px-5 pb-7 pt-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.24)] transition-all duration-500 ease-out sm:px-8 sm:pb-8',
          showContent ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-90 opacity-0'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <X size={19} />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-52">
          {confetti.map((className, index) => (
            <span key={index} className={`absolute h-2 w-5 rounded-full ${className}`} />
          ))}
        </div>

        <div className="relative mx-auto mt-2 flex h-36 w-36 items-center justify-center rounded-full bg-emerald-50 sm:h-40 sm:w-40">
          <div className="absolute -left-2 bottom-5 grid h-11 w-11 place-items-center rounded-full bg-yellow-300 text-yellow-700 shadow-lg shadow-yellow-100">
            <Coins size={22} fill="currentColor" />
          </div>
          <div className="absolute -right-2 bottom-5 grid h-11 w-11 place-items-center rounded-full bg-pink-100 text-pink-600 shadow-lg shadow-pink-100">
            <Users size={20} />
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-[26px] bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-xl shadow-pink-100 sm:h-28 sm:w-28">
            <Gift size={54} strokeWidth={2.3} />
          </div>
        </div>

        <h2 className="mt-5 text-2xl font-black leading-tight text-gray-950 sm:text-3xl">
          {t('notificationsPage.referralModalTitle')}
        </h2>
        <p className="mx-auto mt-2.5 max-w-[340px] text-sm font-semibold leading-6 text-gray-500">
          {note || t('notificationsPage.referralModalSubtitle')}
        </p>

        <div className="mx-auto mt-5 max-w-[340px] rounded-2xl bg-pink-50 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-wide text-gray-500">
            {t('auth.bonusPointsEarned')}
          </p>
          <div className="mt-1.5 flex items-center justify-center gap-2 text-4xl font-black leading-none text-[#EC3F8F]">
            <span>+{Number(points || 0).toLocaleString()}</span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-yellow-300 text-yellow-700">
              <Coins size={22} fill="currentColor" />
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClaim}
          className="mt-6 h-12 w-full rounded-2xl bg-[#EC3F8F] px-5 text-base font-black text-white shadow-lg shadow-pink-100 transition hover:bg-pink-600 active:scale-[0.99]"
        >
          {t('notificationsPage.referralModalClaimBtn')}
        </button>
        <button
          type="button"
          onClick={onViewNotifications}
          className="mt-3.5 text-sm font-black text-[#EC3F8F] hover:underline"
        >
          {t('notificationsPage.referralModalViewNotifs')}
        </button>
      </div>
    </div>
  )
}

