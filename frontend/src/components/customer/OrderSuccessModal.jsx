import { Check, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function OrderSuccessModal({
  open,
  onTrack,
  onBack,
  title,
  description,
  trackLabel,
  variant = 'success',
}) {
  const { t } = useTranslation()

  if (!open) return null

  const isPending = variant === 'pending'
  const Icon = isPending ? Clock : Check

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/45 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[320px] rounded-[1.75rem] bg-white px-8 py-10 text-center shadow-2xl">
        <div className={`mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border-[5px] ${
          isPending ? 'border-yellow-500 bg-yellow-50' : 'border-green-600 bg-green-50'
        }`}>
          <Icon className={isPending ? 'text-yellow-600' : 'text-green-600'} size={34} strokeWidth={3} />
        </div>

        <h2 className="mt-6 text-[1.65rem] font-black leading-tight text-gray-950">
          {title || t('orders.congratulations')}
        </h2>
        <p className="mt-2 text-sm font-semibold text-gray-500">
          {description || t('orders.orderPlaced')}
        </p>

        <button
          type="button"
          onClick={onTrack}
          className="mt-8 w-full rounded-full bg-gray-950 py-4 text-sm font-bold text-white transition active:scale-[0.98]"
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
