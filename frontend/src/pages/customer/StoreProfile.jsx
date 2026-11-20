import { useState, useEffect, memo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Store, ShieldCheck, MapPin,
  Share2, ArrowLeft, ShoppingBag, Package, Eye, X, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import telegramLogo from '@/assets/telegram.svg'
import { storesApi } from '@/api/stores'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import { ProductImageAddButton } from '@/components/customer/CustomerUi'
import { handleCartAdd } from '@/components/customer/CartAddedToast'

function isAvailableForSale(product) {
  return product?.is_available_for_sale ?? Number(product?.current_stock || 0) > 0
}

function getStoreTelegramUrl(store) {
  const username = store.telegram_username?.trim().replace(/^@/, '')
  if (username && /^[a-z][a-z0-9_]{1,31}$/i.test(username)) return `https://t.me/${username}`

  const phone = store.phone?.trim().replace(/[\s().-]/g, '') || ''
  if (/^0[1-9]\d{7,8}$/.test(phone)) return `https://t.me/+855${phone.slice(1)}`
  if (/^855[1-9]\d{7,8}$/.test(phone)) return `https://t.me/+${phone}`
  if (/^\+[1-9]\d{6,14}$/.test(phone)) return `https://t.me/${phone}`
  return ''
}

const StoreProductCard = memo(function StoreProductCard({ product }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const qty = useCartStore((s) => {
    const item = s.items.find((i) => (i.product?.cart_key || i.product?.id) === (product.cart_key || product.id))
    return item?.quantity || 0
  })
  const loggedIn = useAuthStore((s) => s.isAuthenticated)
  const openAuthModal = useUiStore((s) => s.openAuthModal)

  const coverImage = (typeof product.primary_image === 'string' ? product.primary_image : product.primary_image?.image)
    || product.images?.[0]?.image
    || product.image
  const isComingSoon = product?.availability_status === 'coming_soon'
  const currentPrice = Number(product.display_price ?? product.retail_price ?? product.price ?? 0)
  const oldPrice = Number(product.old_price ?? product.compare_at_price ?? 0)
  const saleProduct = product.display_price ? { ...product, retail_price: product.display_price } : product
  const available = !isComingSoon && isAvailableForSale(product)

  const handleAdd = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (isComingSoon) return
    if (product.variants_enabled) return navigate(`/product/${product.id}`)
    if (!loggedIn) {
      openAuthModal('cart')
      return
    }
    handleCartAdd(addItem, saleProduct, navigate, 1)
  }

  const handleIncrease = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (product.variants_enabled) return navigate(`/product/${product.id}`)
    if (!loggedIn) {
      openAuthModal('cart')
      return
    }
    handleCartAdd(addItem, saleProduct, navigate, 1)
  }

  const handleDecrease = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!loggedIn) {
      openAuthModal('cart')
      return
    }
    updateQuantity(product.id, qty - 1)
  }

  return (
    <article
      className="group relative cursor-pointer flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 p-2.5 shadow-sm transition hover:shadow-md hover:border-pink-200 active:scale-[0.99]"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50 mb-2.5">
        {isComingSoon && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-pink-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Coming Soon
          </span>
        )}
        {coverImage ? (
          <img
            src={coverImage}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-pink-50/50 text-pink-300">
            <Package size={28} />
          </div>
        )}
        <ProductImageAddButton
          available={available}
          qty={qty}
          onAdd={handleAdd}
          onIncrease={handleIncrease}
          onDecrease={handleDecrease}
          soldOutLabel={t('common.soldOut', 'Sold Out')}
          comingSoon={isComingSoon}
        />
      </div>

      <div className="flex flex-1 flex-col">
        {product.brand_name && (
          <span className="truncate text-[11px] font-semibold text-gray-400 mb-0.5">
            {product.brand_name}
          </span>
        )}
        <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-gray-800 group-hover:text-pink-600 transition">
          {product.name}
        </h3>
        <div className="mt-auto pt-2 flex items-baseline gap-1.5">
          {isComingSoon ? (
            <span className="text-xs sm:text-sm font-bold text-pink-600 font-sans">{t('product.comingSoon', 'Coming Soon')}</span>
          ) : (
            <>
              <span className="text-sm sm:text-base font-black text-pink-600 font-mono">
                {formatCurrency(currentPrice)}
              </span>
              {oldPrice > currentPrice && (
                <span className="text-xs text-gray-400 line-through font-mono">
                  {formatCurrency(oldPrice)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  )
})

export default function StoreProfile() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const isKhmer = i18n.language === 'km'

  // Fetch Store Details
  const { data: store, isLoading: isStoreLoading, error } = useQuery({
    queryKey: ['public-store-detail', slug],
    queryFn: () => storesApi.getPublicStoreDetail(slug).then((r) => r.data),
    retry: 1,
  })

  // Fetch Products for this specific store only
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ['public-store-products', slug, store?.id],
    queryFn: () => productsApi.products.list({ store: slug, limit: 100 }).then((r) => r.data),
    enabled: Boolean(slug),
  })

  const products = Array.isArray(productsData) ? productsData : productsData?.results || []

  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && imagePreview) {
        setImagePreview(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imagePreview])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: store?.name || 'Shadow Shop Store',
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success(isKhmer ? 'បានចម្លងតំណភ្ជាប់ហាង!' : 'Store link copied to clipboard!')
    }
  }

  if (isStoreLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Store className="h-10 w-10 animate-bounce text-pink-600" />
          <p className="text-sm font-medium text-gray-500">
            {isKhmer ? 'កំពុងផ្ទុកព័ត៌មានហាង...' : 'Loading store profile...'}
          </p>
        </div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Store size={48} className="text-gray-300 mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {isKhmer ? 'រកមិនឃើញហាងនេះទេ' : 'Store Not Found'}
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          {isKhmer ? 'ហាងនេះប្រហែលជាត្រូវបានបិទ ឬផុតកិច្ចសន្យា។' : 'This store may be temporarily inactive or has an expired contract.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-pink-200"
        >
          <ArrowLeft size={16} />
          <span>{isKhmer ? 'ត្រឡប់ទៅទំព័រដើម' : 'Back to Home'}</span>
        </Link>
      </div>
    )
  }

  const telegramUrl = getStoreTelegramUrl(store)
  const bio = store.bio?.trim()
  const description = store.description?.trim()
  const location = [store.district, store.province].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50 pb-28 sm:pb-20">
      {/* Store Banner Container */}
      <div className="w-full md:max-w-[1500px] md:mx-auto md:px-6 md:pt-4">
        <div
          onClick={() => {
            if (store.banner) {
              setImagePreview({ src: store.banner, title: `${store.name} - Cover Banner` })
            }
          }}
          className={`relative h-48 sm:h-64 md:h-80 lg:h-[360px] w-full bg-gradient-to-r from-[#08172f] via-slate-900 to-pink-900 overflow-hidden transition md:rounded-3xl md:shadow-md ${
            store.banner ? 'cursor-pointer group' : ''
          }`}
          title={store.banner ? 'Click to preview full banner' : ''}
        >
          {store.banner ? (
            <>
              <img src={store.banner} alt={store.name} className="w-full h-full object-cover group-hover:scale-101 transition duration-300" />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[1px]">
                <Eye size={16} />
                <span>{isKhmer ? 'ចុចដើម្បីមើលរូបភាពធំ' : 'Click for Full Preview'}</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          )}

          {/* Back button */}
          <Link
            to="/"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition active:scale-95"
          >
            <ArrowLeft size={18} />
          </Link>

          {/* Share button */}
          <button
            type="button"
            aria-label="Share Store"
            onClick={(e) => {
              e.stopPropagation()
              handleShare()
            }}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition active:scale-95"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Store Header Card */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 relative z-10 -mt-16 sm:-mt-20">
        <section aria-labelledby="store-profile-name" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Store Avatar */}
            <div
              onClick={() => {
                if (store.logo) {
                  setImagePreview({ src: store.logo, title: `${store.name} - Logo` })
                }
              }}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 transition sm:h-20 sm:w-20 ${
                store.logo ? 'cursor-pointer group relative hover:ring-2 hover:ring-pink-500' : ''
              }`}
              title={store.logo ? 'Click to preview logo' : ''}
            >
              {store.logo ? (
                <>
                  <img src={store.logo} alt={store.name} className="h-full w-full object-contain rounded-xl" />
                  <div className="absolute inset-1 bg-black/30 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white">
                    <Eye size={16} />
                  </div>
                </>
              ) : (
                <div className="h-full w-full rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black">
                  {store.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Store Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 id="store-profile-name" className="text-lg font-bold leading-tight text-gray-950 [overflow-wrap:anywhere] sm:text-2xl">{store.name}</h1>
                {store.is_verified && (
                  <ShieldCheck size={18} className="shrink-0 text-blue-500" role="img" aria-label="Verified Store Partner" />
                )}
              </div>
              {location && (
                <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-gray-500 sm:text-sm">
                  <MapPin size={14} className="shrink-0" aria-hidden="true" />
                  <span className="[overflow-wrap:anywhere]">{location}</span>
                </p>
              )}
            </div>
            {telegramUrl && (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.chatTelegram')}
                title={t('footer.chatTelegram')}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 text-sm font-semibold text-sky-800 transition hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:w-auto sm:px-3"
              >
                <img src={telegramLogo} alt="" width={24} height={24} className="h-6 w-6" />
                <span className="hidden sm:inline">Telegram</span>
              </a>
            )}
          </div>

          {(bio || description) && (
            <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 sm:mt-5">
              {bio && <p className="max-w-[70ch] whitespace-pre-line text-sm font-semibold leading-6 text-gray-900 [overflow-wrap:anywhere]">{bio}</p>}
              {description && description !== bio && (
                <p className="max-w-[70ch] whitespace-pre-line text-sm leading-6 text-gray-600 [overflow-wrap:anywhere]">{description}</p>
              )}
            </div>
          )}
        </section>

        {/* Store Catalog Section */}
        <div className="mt-8 sm:mt-10">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <ShoppingBag size={20} className="text-pink-600" />
                <span>{isKhmer ? 'ផលិតផលរបស់ហាង' : 'Store Products'}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isKhmer ? 'ទំនិញទាំងអស់ដែលដាក់លក់ដោយហាងនេះ' : 'All authentic items offered by this store'}
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200">
              {products.length} {isKhmer ? 'មុខទំនិញ' : 'items'}
            </span>
          </div>

          {isProductsLoading ? (
            <div className="py-12 text-center text-gray-400">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-10 sm:p-14 text-center text-gray-500">
              <Package size={36} className="mx-auto text-gray-300 mb-2" />
              <p>{isKhmer ? 'មិនទាន់មានផលិតផលទេ' : 'No products listed yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => (
                <StoreProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {imagePreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setImagePreview(null)}
          />
          <div className="relative max-w-4xl w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-950/80">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-pink-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">{imagePreview.title || 'Image Preview'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={imagePreview.src}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition text-xs font-semibold flex items-center gap-1"
                  title="Open full size in new tab"
                >
                  <ExternalLink size={13} />
                  <span>Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
                  title="Close (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-black/50">
              <img
                src={imagePreview.src}
                alt={imagePreview.title || 'Preview'}
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-gray-800/60"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
