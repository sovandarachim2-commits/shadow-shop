import { Heart, X } from 'lucide-react'
import toast from 'react-hot-toast'

export function showWishlistToast(message, added) {
  toast.custom((toastItem) => (
    <div
      role="status"
      className={`flex w-fit min-w-[220px] max-w-[min(92vw,380px)] items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-slate-800 shadow-[0_12px_32px_rgba(15,23,42,0.12)] ${added ? 'border-pink-100' : 'border-gray-200'}`}
      style={{ opacity: toastItem.visible ? 1 : 0, transform: toastItem.visible ? 'translateY(0)' : 'translateY(-8px)', transition: 'all 180ms ease' }}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${added ? 'bg-pink-50 text-pink-600' : 'bg-gray-100 text-gray-500'}`}>
        <Heart size={19} className={added ? 'fill-pink-500' : ''} />
      </span>
      <p className="min-w-0 flex-1 text-[15px] font-semibold leading-7 text-slate-800">{message}</p>
      <button type="button" onClick={() => toast.dismiss(toastItem.id)} aria-label="Dismiss message" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <X size={16} />
      </button>
    </div>
  ), { duration: 3500 })
}
