import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Heart, ShoppingCart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import { cn, formatCurrency } from '@/utils/helpers'
import { ProductThumb } from '@/components/customer/CustomerUi'
import { useTranslation } from 'react-i18next'

function getProductPrice(product) {
  return Number(product?.retail_price || product?.price || 0)
}

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
    <div className="-mx-4 -mt-4 min-h-[calc(100svh-5rem)] bg-slate-100 px-4 pb-8 pt-4 md:mx-0 md:mt-0 md:min-h-0 md:rounded-[2rem] md:bg-white md:p-0">
      <div className="sticky top-0 z-30 -mx-4 mb-4 grid min-h-[60px] grid-cols-[44px_1fr_44px] items-center bg-slate-100/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur md:static md:mx-0 md:mb-6 md:block md:min-h-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm active:scale-95 md:hidden"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="hidden md:block">
            <h1 className="text-3xl font-black tracking-tight text-gray-950">{t('wishlist.title')}</h1>
            <p className="mt-1 text-sm font-bold text-gray-400">
              {items.length} {items.length === 1 ? 'item' : t('cart.items')}
            </p>
          </div>
        </div>
        <h1 className="min-w-0 truncate text-center text-lg font-black tracking-tight text-gray-950 md:hidden">
          {t('wishlist.title')}
        </h1>
        <span aria-hidden="true" className="h-11 w-11 md:hidden" />
      </div>

      <div className="mx-auto w-full max-w-6xl">
        {items.length === 0 ? (
          <div className="flex min-h-[calc(100svh-11rem)] items-center justify-center md:min-h-[520px]">
            <div className="w-full max-w-md rounded-[2rem] bg-white px-6 py-14 text-center shadow-sm md:border md:border-gray-100 md:shadow-none">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                <Heart size={38} />
              </div>
              <h2 className="mt-5 text-xl font-black text-gray-950">{t('wishlist.empty')}</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-6 text-gray-400">
                Save your favorite products here and come back to buy them anytime.
              </p>
              <button onClick={() => navigate('/shop')} className="shop-btn-primary mt-6 px-8">
                {t('common.browseProducts')}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {items.map((product) => {
              const price = getProductPrice(product)
              const productPath = product.item_type === 'set' ? `/product-set/${product.id}` : `/product/${product.id}`
              const inStock = product.stock_quantity > 0 || product.is_in_stock !== false

              return (
                <article
                  key={product.id}
                  className="relative rounded-[1.6rem] border border-pink-50 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft md:p-4"
                >
                  <button
                    onClick={() => handleRemove(product)}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-400 transition hover:bg-red-100 hover:text-red-500"
                    aria-label={`Remove ${product.name}`}
                  >
                    <Trash2 size={15} />
                  </button>

                  <div className="grid grid-cols-[84px_1fr] gap-3 pr-7 md:grid-cols-[96px_1fr] md:gap-4">
                    <button type="button" onClick={() => navigate(productPath)} className="text-left">
                      <ProductThumb product={product} size="lg" className="h-20 w-20 shrink-0 rounded-xl md:h-24 md:w-24" />
                    </button>

                    <div className="min-w-0">
                      <button type="button" onClick={() => navigate(productPath)} className="block w-full text-left">
                        <p className="line-clamp-2 text-sm font-black leading-tight text-gray-950 md:text-base">{product.name}</p>
                        <p className="mt-1 text-xs font-semibold text-gray-400">
                          {product.item_type === 'set' ? 'Product Set' : product.category_name || t('product.cosmetics')}
                        </p>
                      </button>

                      <div className="mt-3 flex items-end justify-between gap-3 md:mt-5">
                        <div>
                          <p className="text-lg font-black text-pink-600 md:text-xl">{formatCurrency(price)}</p>
                          <p className={cn('text-xs font-bold', inStock ? 'text-emerald-500' : 'text-gray-400')}>
                            {inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={!inStock}
                          className="flex h-11 items-center gap-2 rounded-full bg-pink-600 px-4 text-sm font-black text-white shadow-sm shadow-pink-100 transition hover:bg-pink-700 disabled:bg-gray-200 disabled:text-gray-400"
                        >
                          <ShoppingCart size={16} />
                          <span className="hidden sm:inline">{t('common.addToCart')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
