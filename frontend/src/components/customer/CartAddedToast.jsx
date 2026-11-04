import toast from 'react-hot-toast'
import { AlertCircle, Check, ShoppingBag, X } from 'lucide-react'
import { formatCurrency } from '@/utils/helpers'
import i18n from '@/i18n'

function getProductImage(product) {
  return product?.primary_image || product?.image_url || product?.image || product?.images?.[0]?.image || null
}

export function showStockLimitToast(product, maxQuantity) {
  const name = product?.name || 'Product'
  const imageUrl = getProductImage(product)
  const message = i18n.t('common.stockLimitReached', { name, count: maxQuantity }) || `${name} has only ${maxQuantity} in stock.`

  toast.dismiss('cart-added-toast')

  toast.custom((toastInstance) => (
    <div
      role="alert"
      className={`pointer-events-auto flex w-[min(92vw,390px)] items-center gap-3 rounded-2xl border border-red-100 bg-white p-3 shadow-[0_16px_45px_rgba(15,23,42,0.18)] transition ${
        toastInstance.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-red-50">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <AlertCircle size={22} className="text-red-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-red-600">
          <AlertCircle size={14} /> {i18n.t('common.stockLimitTitle', 'Stock Limit')}
        </div>
        <p className="mt-0.5 text-sm font-black text-gray-950 leading-snug">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(toastInstance.id)}
        aria-label={i18n.t('common.closeMessage')}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 active:scale-95"
      >
        <X size={17} />
      </button>
    </div>
  ), { id: 'cart-added-toast', duration: 3200, position: 'top-center' })
}

export function handleCartAdd(addItem, product, navigate, quantity = 1) {
  const result = addItem(product, quantity)
  if (result?.success) {
    showCartAddedToast(product, navigate, result.quantity)
  } else if (result?.reason === 'stock_limit') {
    showStockLimitToast(product, result.maxQuantity)
  }
  return result
}

export function showCartAddedToast(product, navigate, quantity = 1) {
  const imageUrl = getProductImage(product)
  const price = Number(product?.display_price || product?.retail_price || product?.price || 0)

  toast.dismiss('cart-added-toast')

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
      <button
        type="button"
        onClick={() => toast.dismiss(toastInstance.id)}
        aria-label={i18n.t('common.closeMessage')}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 active:scale-95"
      >
        <X size={17} />
      </button>
    </div>
  ), { id: 'cart-added-toast', duration: 2600, position: 'top-center' })
}
