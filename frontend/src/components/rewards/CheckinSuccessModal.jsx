import { useEffect, useState } from 'react'
import { Check, Star, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KHMER_FONT_FAMILY } from '@/utils/constants'
import { cn } from '@/utils/helpers'

export default function CheckinSuccessModal({ isOpen, onClose, points }) {
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          showContent ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Card */}
      <div 
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white p-8 text-center shadow-2xl transition-all duration-500 ease-out transform",
          showContent ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-8"
        )}
        style={{ fontFamily: KHMER_FONT_FAMILY }}
      >
        {/* Floating stars animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 animate-bounce delay-75 opacity-20">
            <Star size={24} className="text-yellow-400 fill-current" />
          </div>
          <div className="absolute top-20 right-12 animate-bounce delay-300 opacity-20">
            <Star size={16} className="text-yellow-400 fill-current" />
          </div>
          <div className="absolute bottom-20 left-16 animate-bounce delay-150 opacity-20">
            <Star size={20} className="text-yellow-400 fill-current" />
          </div>
        </div>

        {/* Success Icon */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className={cn(
            "absolute inset-0 rounded-full bg-pink-100 transition-transform duration-700 delay-100 ease-out",
            showContent ? "scale-100" : "scale-0"
          )} />
          <div className={cn(
            "absolute inset-2 rounded-full bg-pink-500 transition-transform duration-700 delay-300 ease-out flex items-center justify-center text-white",
            showContent ? "scale-100" : "scale-0"
          )}>
            <Check size={48} strokeWidth={3} />
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          "transition-all duration-500 delay-500 ease-out",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <h2 className="text-2xl font-black text-gray-950 mb-2">
            {t('rewardsPage.checkin.successTitle', 'Check-in Successful!')}
          </h2>
          <p className="text-gray-500 font-semibold mb-6">
            {t('rewardsPage.checkin.successDesc', 'You have earned points for today.')}
          </p>

          <div className="inline-flex items-center gap-3 rounded-2xl bg-pink-50 px-6 py-4 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg shadow-amber-200">
              <Star size={20} fill="currentColor" />
            </div>
            <div className="text-left">
              <div className="text-[24px] font-black text-pink-600 leading-none">
                +{points}
              </div>
              <div className="text-[10px] font-black text-pink-400 uppercase tracking-wider">
                {t('rewardsPage.pts', 'Points')}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-gray-950 py-4 text-sm font-black text-white transition-all hover:bg-gray-800 active:scale-95 shadow-xl shadow-gray-200"
          >
            {t('common.great', 'Great!')}
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  )
}
