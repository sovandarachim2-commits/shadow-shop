import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Search, Store } from 'lucide-react'
import { storesApi } from '@/api/stores'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import StoreCard, { StoreCardSkeleton } from '@/components/customer/StoreCard'

export default function Stores() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(search.trim()); setPage(1) }, 250)
    return () => window.clearTimeout(timer)
  }, [search])
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-stores', 'directory', page, query],
    queryFn: () => storesApi.getPublicStores({ page, page_size: 12, search: query || undefined }).then((response) => response.data),
    ...STOREFRONT_LIVE_QUERY,
  })
  const stores = (Array.isArray(data) ? data : data?.results || []).filter((store) => store.slug)
  const pages = data?.total_pages || 1
  return <div className="mx-auto w-full max-w-[1500px] px-4 py-3 md:px-6 md:py-5">
    <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-pink-600"><ArrowLeft size={16} />{t('nav.home')}</Link>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <h1 className="text-2xl font-black text-gray-950 md:text-3xl">{t('storesPage.title')}</h1>
      <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100 sm:w-72"><Search size={18} className="shrink-0 text-gray-400" /><span className="sr-only">{t('storesPage.search')}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('storesPage.search')} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-800 outline-none" /></label>
    </div>
    {isError ? <div role="status" className="rounded-2xl bg-pink-50 p-8 text-center"><p className="text-sm text-gray-600">{t('storesPage.loadError')}</p><button type="button" onClick={() => refetch()} className="mt-3 font-semibold text-pink-600 underline">{t('storesPage.retry')}</button></div>
      : !isLoading && stores.length === 0 ? <div className="rounded-2xl border border-gray-100 bg-white px-5 py-16 text-center text-gray-500"><Store size={36} className="mx-auto mb-3 text-pink-300" /><p>{query ? t('storesPage.noResults') : t('storesPage.empty')}</p></div>
        : <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 6 }, (_, index) => <StoreCardSkeleton key={index} />) : stores.map((store) => <StoreCard key={store.id} store={store} />)}</div>}
    {pages > 1 && !isError && <nav aria-label={t('storesPage.pagination')} className="mt-7 flex items-center justify-center gap-4"><button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-pink-600 hover:border-pink-200 hover:bg-pink-50 disabled:opacity-40">{t('storesPage.previous')}</button><span className="text-sm text-gray-500">{page} / {pages}</span><button type="button" disabled={page >= pages || isLoading} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-pink-600 hover:border-pink-200 hover:bg-pink-50 disabled:opacity-40">{t('storesPage.next')}</button></nav>}
  </div>
}
