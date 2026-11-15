import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Store, ShieldCheck, MapPin, Phone, MessageCircle,
  Share2, ArrowLeft, Star, ShoppingBag, Package, Eye, X, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { storesApi } from '@/api/stores'
import { productsApi } from '@/api/products'
import { formatCurrency } from '@/utils/helpers'

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
    queryFn: () => productsApi.list({ store: slug, limit: 100 }).then((r) => r.data),
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
        <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Store Avatar */}
            <div
              onClick={() => {
                if (store.logo) {
                  setImagePreview({ src: store.logo, title: `${store.name} - Logo` })
                }
              }}
              className={`h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white p-1.5 shadow-lg border border-gray-200 shrink-0 overflow-hidden transition ${
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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-950 truncate">{store.name}</h1>
                {store.is_verified && (
                  <ShieldCheck size={20} className="text-blue-500 shrink-0" title="Verified Store Partner" />
                )}
              </div>

              {store.bio && (
                <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-lg leading-relaxed">{store.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 mt-2.5">
                {store.province && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-gray-400" />
                    <span>{store.province}</span>
                  </span>
                )}
                {store.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone size={13} className="text-gray-400" />
                    <span>{store.phone}</span>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold border border-green-200 text-[11px]">
                  Official Partner
                </span>
              </div>
            </div>
          </div>

          {/* Contact / Action buttons */}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center shrink-0 w-full md:w-auto mt-1 md:mt-0">
            {store.phone && (
              <a
                href={`tel:${store.phone}`}
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 text-center"
              >
                <Phone size={14} />
                <span>Call Store</span>
              </a>
            )}
            <button
              onClick={handleShare}
              className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-pink-200 hover:bg-pink-700 transition active:scale-95 text-center"
            >
              <Share2 size={14} />
              <span>Share Store</span>
            </button>
          </div>
        </div>

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
              {products.map((product) => {
                const coverImage = product.primary_image?.image || product.images?.[0]?.image || product.image
                return (
                  <Link
                    key={product.id}
                    to={`/product/${product.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-gray-100 p-2.5 shadow-sm transition hover:shadow-md hover:border-pink-200"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 mb-2.5">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Package size={24} />
                        </div>
                      )}
                    </div>
                    <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-gray-800 group-hover:text-pink-600 transition">
                      {product.name}
                    </h3>
                    <div className="mt-auto pt-2 flex items-baseline gap-1.5">
                      <span className="text-sm sm:text-base font-black text-pink-600 font-mono">
                        {formatCurrency(product.price)}
                      </span>
                      {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                        <span className="text-xs text-gray-400 line-through font-mono">
                          {formatCurrency(product.compare_at_price)}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
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
