import toast from 'react-hot-toast'
import { Check, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers'
import i18n from '@/i18n'

function getProductImage(product) {
  return product?.primary_image || product?.image_url || product?.image || product?.images?.[0]?.image || null
}

export function showCartAddedToast(product, navigate, quantity = 1) {
  const imageUrl = getProductImage(product)
  const price = Number(product?.display_price || product?.retail_price || product?.price || 0)

  toast.custom((toastInstance) => (
    <div
      className={`pointer-events-auto flex w-[min(92vw,390px)] items-center gap-3 rounded-2xl border border-pink-100 bg-white p-3 shadow-[0_16px_45px_rgba(15,23,42,0.18)] transition ${
        toastInstance.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-50">
        {imageUrl ? (
          <img src={imageUrl} alt={product?.name || ''} className="h-full w-full object-cover" />
        ) : (
          <ShoppingBag size={20} className="text-pink-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-pink-600">
          <Check size={14} /> {i18n.t('common.addedToCart')}
        </div>
        <p className="mt-0.5 truncate text-sm font-black text-gray-950">{product?.name || 'Product'}</p>
        <p className="text-xs font-semibold text-gray-400">
          {i18n.t('common.qty')} {quantity} {price > 0 ? `• ${formatCurrency(price)}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          toast.dismiss(toastInstance.id)
          navigate('/cart')
        }}
        className="shrink-0 rounded-xl bg-pink-600 px-3.5 py-2 text-xs font-black text-white shadow-sm shadow-pink-100 transition active:scale-95 hover:bg-pink-700"
      >
        {i18n.t('common.viewCart')}
      </button>
    </div>
  ), { duration: 2600, position: 'top-center' })
}
