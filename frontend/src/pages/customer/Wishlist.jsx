import { useNavigate } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { formatCurrency } from '@/utils/helpers'
import { ProductThumb } from '@/components/customer/CustomerUi'
import { useTranslation } from 'react-i18next'

export default function Wishlist() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const { items, toggle } = useWishlistStore()

  const handleAddToCart = (product) => {
    addItem(product, 1)
    toast.success(t('product.addedToCart'))
  }

  const handleRemove = (product) => {
    toggle(product)
    toast.success(t('product.removedFromWishlist'))
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-950">{t('wishlist.title')}</h1>
        <span className="text-sm font-semibold text-gray-400">{items.length} {t('cart.items')}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-gray-100 py-20 text-center">
          <Heart size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-bold text-gray-500">{t('wishlist.empty')}</p>
          <button onClick={() => navigate('/shop')} className="mt-4 text-sm font-black text-pink-600">
            {t('common.browseProducts')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((product) => (
            <article key={product.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
              <ProductThumb product={product} size="lg" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-black text-gray-950">{product.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-gray-400">{product.category_name || t('product.cosmetics')}</p>
                <p className="mt-2 text-base font-black text-pink-600">{formatCurrency(product.retail_price)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => handleRemove(product)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-400 hover:bg-red-100"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="shop-btn-primary px-3 py-2 text-xs"
                >
                  <ShoppingCart size={14} /> {t('common.addToCart')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
