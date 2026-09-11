import { useEffect, useState } from 'react'
import { X, Coins, Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/helpers'

export default function WelcomeBonusModal({ isOpen, points, onClose, onStartShopping, onViewPoints }) {
  const { t } = useTranslation()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 50)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const confetti = [
    'left-[10%] top-[16%] rotate-[-25deg] bg-pink-500',
    'left-[20%] top-[27%] rotate-[35deg] bg-yellow-400',
    'left-[30%] top-[14%] rotate-[20deg] bg-blue-400',
    'right-[18%] top-[18%] rotate-[-35deg] bg-fuchsia-500',
    'right-[10%] top-[31%] rotate-[28deg] bg-sky-500',
    'left-[14%] top-[40%] rotate-[55deg] bg-violet-500',
    'right-[23%] top-[40%] rotate-[-15deg] bg-amber-400',
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 py-6">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-gray-950/45 backdrop-blur-sm transition-opacity duration-300",
          showContent ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Card */}
      <div className={cn(
        "relative w-full max-w-[520px] overflow-hidden rounded-[28px] bg-white px-5 pb-7 pt-8 text-center shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:px-9 sm:pb-9 transition-all duration-500 ease-out transform",
        showContent ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-8"
      )}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <X size={21} />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-56">
          {confetti.map((className, index) => (
            <span key={index} className={`absolute h-2 w-5 rounded-full ${className}`} />
          ))}
        </div>

        <div className="relative mx-auto mt-4 flex h-40 w-40 items-center justify-center rounded-full bg-pink-50 sm:h-48 sm:w-48">
          <div className="absolute -left-2 bottom-7 grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-yellow-700 shadow-lg shadow-yellow-100">
            <Coins size={26} fill="currentColor" />
          </div>
          <div className="absolute -right-2 bottom-7 grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-yellow-700 shadow-lg shadow-yellow-100">
            <Coins size={26} fill="currentColor" />
          </div>
          <div className="grid h-28 w-28 place-items-center rounded-[28px] bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-xl shadow-pink-100 sm:h-32 sm:w-32">
            <Gift size={68} strokeWidth={2.4} />
          </div>
        </div>

        <h2 className="mt-5 text-3xl font-black leading-tight text-gray-950 sm:text-4xl">
          {t('auth.welcomeBonusTitle')}
        </h2>
        <p className="mx-auto mt-3 max-w-[360px] text-base font-semibold leading-7 text-gray-500">
          {t('auth.welcomeBonusSubtitle')}
        </p>

        <div className="mx-auto mt-6 max-w-[360px] rounded-2xl bg-pink-50 px-5 py-5">
          <p className="text-sm font-black text-gray-600">{t('auth.bonusPointsEarned')}</p>
          <div className="mt-2 flex items-center justify-center gap-2 text-5xl font-black leading-none text-[#EC3F8F]">
            <span>+{Number(points || 0).toLocaleString()}</span>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-300 text-yellow-700">
              <Coins size={28} fill="currentColor" />
            </span>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-[380px] text-sm font-semibold leading-6 text-gray-500">
          {t('auth.usePointsHint')}
        </p>
        <button
          type="button"
          onClick={onStartShopping}
          className="mt-6 h-12 w-full rounded-2xl bg-[#EC3F8F] px-5 text-base font-black text-white shadow-lg shadow-pink-100 transition hover:bg-pink-600"
        >
          {t('auth.startShopping')}
        </button>
        <button
          type="button"
          onClick={onViewPoints}
          className="mt-4 text-sm font-black text-[#EC3F8F]"
        >
          {t('auth.viewMyPoints')}
        </button>
      </div>
    </div>
  )
}
