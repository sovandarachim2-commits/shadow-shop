import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  X,
  Search,
  Star,
  Loader2,
  Package,
  ChevronLeft,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { productsApi } from '@/api/products'
import useCartStore from '@/store/cartStore'
import { formatCurrency } from '@/utils/helpers'

function cleanText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/[ \t]+\)/g, ')').trim()
}

/**
 * Clean & dedicated Free Gift Detail view
 * Shows product images, benefits, how to use, description & stock
 * WITHOUT "Add to Cart", "Buy Now", or "Recommended products"
 */
function FreeGiftProductDetailView({
  productSummary,
  promo,
  isKhmer,
  onBack,
  onSelectGift,
  onClose,
  stockInfo,
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Fetch full details (images, benefits, ingredients, how_to_use)
  const { data: fullProduct, isLoading } = useQuery({
    queryKey: ['free-gift-full-detail', productSummary?.id],
    queryFn: async () => {
      if (!productSummary?.id) return null
      const res = await productsApi.products.get(productSummary.id)
      return res.data
    },
    enabled: Boolean(productSummary?.id),
    staleTime: 60000,
  })

  const product = fullProduct || productSummary
  const rawImages = product?.images?.length
    ? product.images.map((img) => (typeof img === 'string' ? img : img.image))
    : [product?.primary_image || product?.image || '/placeholder.png']

  const images = rawImages.filter(Boolean)
  const currentImage = images[activeImageIndex] || images[0] || '/placeholder.png'

  const retailPrice = Number(product?.retail_price || 0)
  const description = cleanText(product?.description)
  const benefits = cleanText(product?.benefits)
  const howToUse = cleanText(product?.how_to_use)
  const ingredients = cleanText(product?.ingredients)

  const defaultBadge = isKhmer
    ? `ទិញ ${promo?.buy_quantity || 2} ថែម ${promo?.get_quantity || 1} ឥតគិតថ្លៃ`
    : `Buy ${promo?.buy_quantity || 2} Get ${promo?.get_quantity || 1} Free`

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Detail Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3.5 bg-white shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95"
        >
          <ChevronLeft size={16} className="text-pink-600" />
          <span>{isKhmer ? 'ត្រឡប់ទៅបញ្ជីកាដូ' : 'Back to Gift List'}</span>
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs font-bold text-gray-800">
            {isKhmer ? 'ព័ត៌មានលម្អិតកាដូឥតគិតថ្លៃ' : 'Free Gift Details'}
          </span>
          <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-[11px] font-bold text-pink-600 border border-pink-100">
            {promo?.badge_text || defaultBadge}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* Detail Content (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Gallery Column */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center p-3">
              <span className="absolute left-3 top-3 z-10 rounded-lg bg-pink-600 px-2.5 py-1 text-xs font-black text-white shadow-xs flex items-center gap-1">
                <Sparkles size={13} />
                {isKhmer ? 'កាដូឥតគិតថ្លៃ 100%' : '100% FREE GIFT'}
              </span>

              <img
                src={currentImage}
                alt={product?.name}
                className="h-full w-full object-contain transition duration-200"
              />
            </div>

            {/* Thumbnail selector if multiple images exist */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 p-1 bg-white transition ${
                      activeImageIndex === idx
                        ? 'border-pink-600 ring-2 ring-pink-100'
                        : 'border-gray-100 hover:border-gray-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Column */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-pink-600">
                  {product?.brand_name || promo?.brand_name || 'Brand'}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-gray-600">
                  <Star size={13} className="fill-yellow-400 text-yellow-400" />
                  {product?.rating > 0 ? product.rating : '4.8'}
                </span>
              </div>

              <h2 className="khmer-title mt-1 text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                {product?.name}
              </h2>

              {product?.code && (
                <p className="mt-0.5 text-xs text-gray-400 font-mono">
                  SKU: {product.code}
                </p>
              )}
            </div>

            {/* Free Price Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-pink-50 to-pink-50/40 border border-pink-100 p-4">
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl font-black text-pink-600">$0.00</span>
                {retailPrice > 0 && (
                  <span className="text-sm font-medium text-gray-400 line-through">
                    {formatCurrency(retailPrice)}
                  </span>
                )}
                <span className="ml-auto rounded-full bg-pink-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                  {isKhmer ? 'កាដូថែម' : 'Free Gift'}
                </span>
              </div>
              <p className="mt-1 text-xs text-pink-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={13} className="shrink-0 text-pink-600" />
                {isKhmer
                  ? 'ផលិតផលនេះត្រូវបានអនុវត្តឥតគិតថ្លៃ ក្នុងយុទ្ធនាការទិញថែមរបស់អ្នក'
                  : 'This item will be added to your cart at zero cost with your promotion.'}
              </p>
            </div>

            {/* Stock Availability */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-500">{isKhmer ? 'ស្ថានភាពស្តុក:' : 'Stock Status:'}</span>
              {stockInfo.isOutOfStock ? (
                <span className="font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                  {stockInfo.cartQty > 0
                    ? (isKhmer ? 'អស់ស្តុក (បានដាក់ក្នុងកន្ត្រក)' : 'Max in cart')
                    : (isKhmer ? 'អស់ពីស្តុក' : 'Out of Stock')}
                </span>
              ) : stockInfo.isAuto ? (
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {isKhmer ? `ស្តុកនៅសល់: ${stockInfo.remainingStock}` : `${stockInfo.remainingStock} in stock`}
                </span>
              ) : (
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {isKhmer ? 'មានក្នុងស្តុក' : 'In Stock'}
                </span>
              )}
            </div>

            {/* Product Details & Specifications */}
            <div className="space-y-3 pt-2 border-t border-gray-100 text-xs text-gray-600">
              {description && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    <Info size={13} className="text-pink-600" />
                    {isKhmer ? 'ការពិពណ៌នា' : 'Description'}
                  </h4>
                  <p className="leading-relaxed whitespace-pre-line text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                    {description}
                  </p>
                </div>
              )}

              {benefits && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-pink-600" />
                    {isKhmer ? 'អត្ថប្រយោជន៍' : 'Benefits'}
                  </h4>
                  <p className="leading-relaxed whitespace-pre-line text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                    {benefits}
                  </p>
                </div>
              )}

              {howToUse && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">
                    {isKhmer ? 'របៀបប្រើប្រាស់' : 'How to Use'}
                  </h4>
                  <p className="leading-relaxed whitespace-pre-line text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                    {howToUse}
                  </p>
                </div>
              )}

              {ingredients && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">
                    {isKhmer ? 'គ្រឿងផ្សំ' : 'Ingredients'}
                  </h4>
                  <p className="leading-relaxed whitespace-pre-line text-gray-600 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                    {ingredients}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95"
        >
          {isKhmer ? 'ត្រឡប់ក្រោយ' : 'Back to gifts'}
        </button>

        <button
          type="button"
          disabled={stockInfo.isOutOfStock}
          onClick={() => {
            onSelectGift(productSummary)
          }}
          className={`rounded-xl px-6 py-2.5 text-xs sm:text-sm font-bold transition shadow-sm active:scale-95 ${
            stockInfo.isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              : 'bg-pink-600 text-white hover:bg-pink-700 shadow-pink-100'
          }`}
        >
          {stockInfo.isOutOfStock
            ? (isKhmer ? 'អស់ពីស្តុក' : 'Out of Stock')
            : (isKhmer ? 'ជ្រើសរើសជាកាដូឥតគិតថ្លៃ ($0.00)' : 'Pick This Free Gift ($0.00)')}
        </button>
      </div>
    </div>
  )
}

export default function FreeGiftSelectorModal({
  isOpen,
  onClose,
  promo,
  remainingGiftsCount = 1,
  onSelectGift,
}) {
  const { t, i18n } = useTranslation()
  const isKhmer = i18n.language === 'km'
  const [searchTerm, setSearchTerm] = useState('')
  const [previewProductId, setPreviewProductId] = useState(null)
  const cartItems = useCartStore((state) => state.items)

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow
      }
    } else {
      setPreviewProductId(null)
    }
  }, [isOpen])

  const brandId = promo?.brand
  const brandName = promo?.brand_name || 'Brand'

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['brand-free-gifts', brandId],
    queryFn: async () => {
      if (!brandId) return []
      const res = await productsApi.products.list({
        brand: brandId,
        is_active: true,
        page_size: 100,
      })
      const data = res.data
      return Array.isArray(data) ? data : (data?.results || [])
    },
    enabled: Boolean(isOpen && brandId),
  })

  // Helper to calculate available stock taking into account items already in cart
  const getProductStockInfo = (product) => {
    const isAuto = product.availability_status === 'auto'
    const isAlwaysAvail = product.availability_status === 'available'
    const isExplicitOut = product.availability_status === 'out_of_stock' || product.is_available_for_sale === false

    const cartQty = (cartItems || [])
      .filter((i) => {
        const iProdId = i.product?.product_id || i.product?.id
        return String(iProdId) === String(product.id)
      })
      .reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)

    if (isAlwaysAvail) {
      return { isOutOfStock: false, remainingStock: Infinity, isAuto: false, cartQty }
    }
    if (isExplicitOut) {
      return { isOutOfStock: true, remainingStock: 0, isAuto, cartQty }
    }

    const currentStock = typeof product.current_stock === 'number' ? product.current_stock : 0
    const remainingStock = Math.max(0, currentStock - cartQty)
    const isOutOfStock = remainingStock <= 0

    return { isOutOfStock, remainingStock, isAuto, cartQty, currentStock }
  }

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    const list = productsData || []
    if (!searchTerm.trim()) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q)
    )
  }, [productsData, searchTerm])

  const previewProduct = useMemo(() => {
    if (!previewProductId || !productsData?.length) return null
    return productsData.find((p) => p.id === previewProductId) || null
  }, [previewProductId, productsData])

  if (!isOpen) return null

  const defaultBadgeText = isKhmer
    ? `ទិញ ${promo?.buy_quantity || 2} ថែម ${promo?.get_quantity || 1} ឥតគិតថ្លៃ`
    : `Buy ${promo?.buy_quantity || 2} Get ${promo?.get_quantity || 1} Free`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" />

      {/* Modal Dialog */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in border border-gray-100">
        {previewProduct ? (
          /* Dedicated Free Gift Detail Screen (No Add to Cart, No Recommendations) */
          <FreeGiftProductDetailView
            productSummary={previewProduct}
            promo={promo}
            isKhmer={isKhmer}
            onBack={() => setPreviewProductId(null)}
            onSelectGift={(prod) => {
              onSelectGift(prod)
              setPreviewProductId(null)
            }}
            onClose={() => {
              setPreviewProductId(null)
              onClose()
            }}
            stockInfo={getProductStockInfo(previewProduct)}
          />
        ) : (
          /* Free Gift Grid Selection List */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white">
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    {isKhmer ? 'ជ្រើសរើសកាដូឥតគិតថ្លៃ' : 'Choose Free Gift'}
                  </h3>
                  <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-bold text-pink-600 border border-pink-100">
                    {promo?.badge_text || defaultBadgeText}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {isKhmer ? (
                    <>
                      ជ្រើសរើសកាដូឥតគិតថ្លៃចំនួន{' '}
                      <span className="font-bold text-pink-600">{remainingGiftsCount}</span> មុខ ពី{' '}
                      <span className="font-semibold text-gray-700">{brandName}</span>
                    </>
                  ) : (
                    <>
                      Select <span className="font-bold text-pink-600">{remainingGiftsCount}</span> free
                      item(s) from <span className="font-semibold text-gray-700">{brandName}</span>
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search & Meta Bar */}
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-6 py-2.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isKhmer ? `ស្វែងរកផលិតផល ${brandName}...` : `Search ${brandName} products...`}
                  className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <span className="text-xs font-semibold text-gray-500 shrink-0">
                {isKhmer
                  ? `មាន ${filteredProducts.length} មុខ`
                  : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'item' : 'items'} available`}
              </span>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {isLoading ? (
                <div className="flex h-56 flex-col items-center justify-center gap-2 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
                  <p className="text-xs font-semibold text-gray-500">
                    {isKhmer ? 'កំពុងទាញយកទិន្នន័យ...' : 'Loading products...'}
                  </p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center gap-2 text-center text-gray-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                    <Package className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {isKhmer
                      ? searchTerm
                        ? `មិនមានផលិតផលត្រូវនឹង "${searchTerm}" ទេ`
                        : `មិនមានផលិតផលសម្រាប់ ${brandName} ទេ`
                      : searchTerm
                        ? `No products matching "${searchTerm}"`
                        : `No available products in ${brandName}.`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isKhmer
                      ? searchTerm
                        ? 'សូមសាកល្បងពាក្យស្វែងរកផ្សេងទៀត'
                        : 'សូមទាក់ទងផ្នែកបម្រើអតិថិជន'
                      : searchTerm
                        ? 'Try a different search keyword.'
                        : 'Please contact store support.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 sm:gap-4">
                  {filteredProducts.map((product) => {
                    const img = product.primary_image || product.image || '/placeholder.png'
                    const retailPrice = Number(product.retail_price || 0)
                    const { isOutOfStock, remainingStock, isAuto, cartQty } = getProductStockInfo(product)

                    return (
                      <article
                        key={product.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-2.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft ${
                          isOutOfStock
                            ? 'border-gray-200 opacity-75'
                            : 'border-gray-100 hover:border-pink-200'
                        }`}
                      >
                        {/* Image — Click to open Free Gift Detail */}
                        <div
                          onClick={() => setPreviewProductId(product.id)}
                          title={isKhmer ? `មើលព័ត៌មានលម្អិត ${product.name}` : `View details for ${product.name}`}
                          className="group/img relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50 block cursor-pointer"
                        >
                          {isOutOfStock ? (
                            <span className="absolute left-2 top-2 z-10 rounded-md bg-gray-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              {isKhmer ? 'អស់ស្តុក' : 'OUT'}
                            </span>
                          ) : (
                            <span className="absolute left-2 top-2 z-10 rounded-md bg-pink-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                              {isKhmer ? 'ឥតគិតថ្លៃ' : 'FREE'}
                            </span>
                          )}
                          <img
                            src={img}
                            alt={product.name}
                            className={`h-full w-full object-contain p-1 transition duration-300 ${
                              isOutOfStock ? 'grayscale-50' : 'group-hover/img:scale-105'
                            }`}
                            loading="lazy"
                          />
                          {/* Hover overlay indicator to view product details */}
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/15 transition-colors flex items-center justify-center pointer-events-none">
                            <span className="opacity-0 group-hover/img:opacity-100 transition-opacity rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-gray-800 shadow-md flex items-center gap-1 backdrop-blur-xs">
                              <Info size={12} className="text-pink-600" />
                              {isKhmer ? 'មើលលម្អិត' : 'View'}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-1 flex-col justify-between pt-2.5">
                          <div>
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span className="truncate font-semibold text-gray-400">
                                {product.brand_name || brandName}
                              </span>
                              <span className="flex shrink-0 items-center gap-0.5 text-gray-500 font-semibold">
                                <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                {product.rating > 0 ? product.rating : '4.8'}
                              </span>
                            </div>

                            {/* Title — Click to open Free Gift Detail */}
                            <h4
                              onClick={() => setPreviewProductId(product.id)}
                              className="khmer-title mt-1 line-clamp-2 text-xs sm:text-sm font-semibold text-gray-900 transition-colors cursor-pointer hover:text-pink-600"
                            >
                              {product.name}
                            </h4>

                            {/* Stock status indicator */}
                            <div className="mt-1 flex items-center gap-1.5">
                              {isAuto && (
                                <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-500' : 'text-emerald-600'}`}>
                                  {isOutOfStock
                                    ? (cartQty > 0 ? (isKhmer ? 'អស់ស្តុក (ក្នុងកន្ត្រក)' : 'Max in cart') : (isKhmer ? 'អស់ពីស្តុក' : 'Out of stock'))
                                    : (isKhmer ? `ស្តុកនៅសល់: ${remainingStock}` : `Stock: ${remainingStock}`)}
                                </span>
                              )}
                              {!isAuto && !isOutOfStock && (
                                <span className="text-[10px] font-bold text-emerald-600">
                                  {isKhmer ? 'មានក្នុងស្តុក' : 'In Stock'}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pricing and Action */}
                          <div className="mt-3 pt-2 border-t border-gray-50">
                            <div className="flex items-baseline gap-1.5 mb-2">
                              <span className="text-sm font-black text-pink-600">
                                $0.00
                              </span>
                              {retailPrice > 0 && (
                                <span className="text-[11px] font-medium text-gray-400 line-through">
                                  {formatCurrency(retailPrice)}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => onSelectGift(product)}
                              className={`w-full rounded-xl py-2 text-xs font-bold transition ${
                                isOutOfStock
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                  : 'bg-pink-600 text-white hover:bg-pink-700 active:scale-95 shadow-xs'
                              }`}
                            >
                              {isOutOfStock
                                ? (isKhmer ? 'អស់ពីស្តុក' : 'Out of Stock')
                                : (isKhmer ? 'ជ្រើសរើស' : 'Pick Free')}
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-3">
              <p className="text-xs text-gray-500">
                {isKhmer ? (
                  <>
                    ផលិតផលដែលបានជ្រើសរើស នឹងត្រូវបានបន្ថែមទៅកន្ត្រកក្នុងតម្លៃ{' '}
                    <span className="font-semibold text-pink-600">$0.00</span>
                  </>
                ) : (
                  <>
                    Selected product will be added to your cart at{' '}
                    <span className="font-semibold text-pink-600">$0.00</span>.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition active:scale-95"
              >
                {isKhmer ? 'បោះបង់' : 'Cancel'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
