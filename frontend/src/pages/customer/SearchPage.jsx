import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Flame, History, Search, TrendingUp, X } from 'lucide-react'
import { productsApi } from '@/api/products'
import { cn } from '@/utils/helpers'
import { useTranslation } from 'react-i18next'

const HISTORY_KEY = 'shadow-shop-search-history'

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 8) : []
  } catch {
    return []
  }
}

function BrandLogo({ brand }) {
  const logo = brand?.logo_url || brand?.logo || brand?.image_url || brand?.image
  const initials = (brand?.name || '?').trim().slice(0, 2).toUpperCase()

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white shadow-sm sm:h-16 sm:w-16">
      {logo ? (
        <img src={logo} alt={brand.name} className="h-full w-full object-contain p-1.5" />
      ) : (
        <span className="text-base font-black text-pink-600 sm:text-xl">{initials}</span>
      )}
    </div>
  )
}

export default function SearchPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState(() => readHistory())

  const { data: brandData = [] } = useQuery({
    queryKey: ['search-brands'],
    queryFn: () => productsApi.brands.list({ is_active: true, page_size: 12 }).then((r) => r.data.results || r.data || []),
    staleTime: 60_000,
  })

  const { data: categoryData = [] } = useQuery({
    queryKey: ['search-categories'],
    queryFn: () => productsApi.categories.list({ is_active: true, page_size: 12 }).then((r) => r.data.results || r.data || []),
    staleTime: 60_000,
  })

  const { data: popularProducts = [] } = useQuery({
    queryKey: ['search-popular-products'],
    queryFn: () => productsApi.products.list({ is_active: true, ordering: '-created_at', page_size: 10 }).then((r) => r.data.results || r.data || []),
    staleTime: 60_000,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [])

  const trending = useMemo(() => {
    const categoryNames = categoryData.map((category) => category.name).filter(Boolean)
    const productWords = popularProducts
      .map((product) => product.name)
      .filter(Boolean)
      .flatMap((name) => name.split(/\s+/).filter((word) => word.length > 3))
    return [...new Set([...categoryNames, ...productWords])].slice(0, 10)
  }, [categoryData, popularProducts])

  const saveHistory = (value) => {
    const clean = value.trim()
    if (!clean) return
    const next = [clean, ...history.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }

  const submitSearch = (value = query) => {
    const clean = value.trim()
    if (!clean) return
    saveHistory(clean)
    navigate(`/shop?search=${encodeURIComponent(clean)}`)
  }

  const removeHistoryItem = (item) => {
    const next = history.filter((value) => value !== item)
    setHistory(next)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }

  return (
    <div className="-mx-4 -mt-4 min-h-screen bg-white pb-8 md:mx-auto md:mt-0 md:max-w-5xl">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitSearch()
        }}
        className="sticky top-0 z-20 grid grid-cols-[44px_1fr] items-center gap-3 border-b border-gray-100 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur md:static md:border-0 md:px-0 md:pt-0"
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm active:scale-95"
          aria-label={t('common.back')}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-950" />
          <input
            ref={inputRef}
            autoFocus
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for products"
            className="h-11 w-full rounded-full border border-gray-300 bg-white pl-11 pr-11 text-base font-semibold text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-500 active:scale-95"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </form>

      <div className="px-4 md:px-0">
      <section className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-gray-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <History size={16} />
            </span>
            Search history
          </h2>
          {history.length > 0 && (
            <button type="button" onClick={clearHistory} className="text-sm font-black text-sky-600">
              Clear
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {history.length === 0 ? (
            <p className="text-sm font-semibold text-gray-400">Your recent searches will appear here.</p>
          ) : history.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => submitSearch(item)}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold text-gray-950 shadow-sm"
            >
              <span>{item}</span>
              <span
                onClick={(event) => {
                  event.stopPropagation()
                  removeHistoryItem(item)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 text-white"
                aria-label={`Remove ${item}`}
              >
                <X size={16} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {brandData.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-black text-gray-950">
            <Flame size={22} className="fill-sky-500 text-sky-500" />
            Popular brands
          </h2>
          <div className="-mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-8 md:overflow-visible md:px-0">
            {brandData.slice(0, 16).map((brand) => (
              <Link key={brand.id} to={`/shop?brand=${brand.id}`} className="group flex w-16 shrink-0 flex-col items-center gap-2 md:w-auto">
                <BrandLogo brand={brand} />
                <span className="max-w-[64px] truncate text-center text-xs font-bold text-gray-500 group-hover:text-pink-600">{brand.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-black text-gray-950">
          <TrendingUp size={21} className="text-sky-500" />
          Trending now
        </h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {trending.map((item, index) => (
            <button
              key={`${item}-${index}`}
              type="button"
              onClick={() => submitSearch(item)}
              className={cn(
                'rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-950 shadow-sm transition active:scale-95',
                'hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600'
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      </div>
    </div>
  )
}
