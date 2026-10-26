import { Check, Clock, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function OrderSuccessModal({
  open,
  onTrack,
  onBack,
  title,
  description,
  trackLabel,
  variant = 'success',
  secondaryLabel,
  onSecondary,
}) {
  const { t } = useTranslation()

  if (!open) return null

  const isPending = variant === 'pending'
  const isFailed = variant === 'failed'
  const Icon = isPending ? Clock : isFailed ? X : Check
  const toneClass = isPending
    ? 'border-yellow-500 bg-yellow-50 text-yellow-600'
    : isFailed
      ? 'border-red-500 bg-red-50 text-red-600'
      : 'border-green-600 bg-green-50 text-green-600'

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/45 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[360px] rounded-[1.75rem] bg-white px-8 py-10 text-center shadow-2xl">
        <div className={`mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] ${toneClass}`}>
          <Icon size={34} strokeWidth={3} />
        </div>

        {isFailed && <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-red-600">Payment status</p>}
        <h2 className={`${isFailed ? 'mt-2' : 'mt-6'} text-2xl font-black leading-tight text-gray-950`}>
          {title || t('orders.congratulations')}
        </h2>
        <p className="mt-2 text-sm font-semibold text-gray-500">
          {description || t('orders.orderPlaced')}
        </p>

        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="mt-8 w-full rounded-full bg-[#229ED9] py-4 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            {secondaryLabel}
          </button>
        )}

        <button
          type="button"
          onClick={onTrack}
          className={`${secondaryLabel && onSecondary ? 'mt-3' : 'mt-8'} shop-btn-primary h-12 w-full rounded-xl px-5 py-0 text-sm shadow-lg shadow-pink-100 active:scale-[0.98]`}
        >
          {trackLabel || t('orders.trackYourOrder')}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full py-2 text-sm font-semibold text-gray-500 transition hover:text-gray-800"
        >
          {t('orders.backToShop')}
        </button>
      </div>
    </div>
  )
}
