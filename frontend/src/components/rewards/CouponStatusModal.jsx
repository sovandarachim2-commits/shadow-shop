import { useEffect, useState } from 'react'
import { Check, X, Ticket, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { KHMER_FONT_FAMILY } from '@/utils/constants'
import { cn } from '@/utils/helpers'

export default function CouponStatusModal({ isOpen, onClose, type = 'success', message, couponName }) {
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

  const isSuccess = type === 'success'

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
        {/* Status Icon */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className={cn(
            "absolute inset-0 rounded-full transition-transform duration-700 delay-100 ease-out",
            isSuccess ? "bg-emerald-100" : "bg-rose-100",
            showContent ? "scale-100" : "scale-0"
          )} />
          <div className={cn(
            "absolute inset-2 rounded-full transition-transform duration-700 delay-300 ease-out flex items-center justify-center text-white",
            isSuccess ? "bg-emerald-500" : "bg-rose-500",
            showContent ? "scale-100" : "scale-0"
          )}>
            {isSuccess ? (
              <Check size={48} strokeWidth={3} className="animate-in zoom-in duration-500 delay-500" />
            ) : (
              <AlertCircle size={48} strokeWidth={3} className="animate-in zoom-in duration-500 delay-500" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          "transition-all duration-500 delay-500 ease-out",
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <h2 className={cn(
            "text-2xl font-black mb-2",
            isSuccess ? "text-emerald-600" : "text-rose-600"
          )}>
            {isSuccess ? t('cart.couponAppliedSuccess', 'Coupon Applied!') : t('cart.couponApplyFailed', 'Apply Failed')}
          </h2>
          
          <p className="text-gray-500 font-semibold mb-6">
            {message || (isSuccess ? t('cart.couponAppliedDesc', 'Your discount has been applied to the cart.') : t('cart.couponInvalidDesc', 'The promo code you entered is invalid or expired.'))}
          </p>

          {isSuccess && couponName && (
            <div className="inline-flex w-full items-center gap-3 rounded-2xl bg-emerald-50 px-6 py-4 mb-8 border border-emerald-100 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-700">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <Ticket size={20} strokeWidth={2.5} />
              </div>
              <div className="text-left min-w-0">
                <div className="text-sm font-black text-emerald-950 truncate uppercase tracking-tight">
                  {couponName}
                </div>
                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                  {t('cart.activeVoucher', 'Active Voucher')}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className={cn(
              "w-full rounded-2xl py-4 text-sm font-black text-white transition-all active:scale-95 shadow-xl",
              isSuccess 
                ? "bg-gray-950 hover:bg-gray-800 shadow-gray-200" 
                : "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
            )}
          >
            {isSuccess ? t('common.great', 'Great!') : t('common.tryAgain', 'Try Again')}
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
