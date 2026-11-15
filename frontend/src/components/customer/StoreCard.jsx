import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, BadgeCheck, MapPin, Star, Store } from 'lucide-react'

export function StoreCardSkeleton() {
  return <div aria-hidden="true" className="h-full overflow-hidden rounded-2xl border border-gray-100 bg-white">
    <div className="aspect-[16/7] animate-pulse bg-pink-50" />
    <div className="space-y-4 p-5"><div className="flex gap-3"><div className="h-12 w-12 animate-pulse rounded-xl bg-gray-100" /><div className="flex-1 space-y-2 py-1"><div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" /><div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" /></div></div><div className="h-10 animate-pulse rounded bg-gray-50" /><div className="h-10 animate-pulse rounded-xl bg-pink-50" /></div>
  </div>
}

export default function StoreCard({ store }) {
  const { t } = useTranslation()
  const [failedBanner, setFailedBanner] = useState(null)
  const [failedLogo, setFailedLogo] = useState(null)
  const destination = `/store/${encodeURIComponent(store.slug)}`
  const category = store.category || t(`storesPage.types.${store.store_type}`, { defaultValue: store.store_type?.replaceAll('_', ' ') || t('storesPage.store') })
  const description = store.description || store.bio || t('storesPage.descriptionFallback')
  const location = [store.district, store.province].filter(Boolean).join(', ')

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_3px_18px_rgba(15,23,42,0.05)] transition-all hover:border-pink-200 hover:shadow-md">
      <Link to={destination} draggable={false} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/7] shrink-0 overflow-hidden bg-gradient-to-br from-pink-100 via-rose-50 to-pink-50">
        {store.banner && failedBanner !== store.banner
          ? <img src={store.banner} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailedBanner(store.banner)} className="h-full w-full object-cover" />
          : <div className="flex h-full items-center justify-center"><Store size={46} strokeWidth={1.2} className="text-pink-300" /></div>}
        {store.is_featured && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-pink-700 shadow-sm"><Star size={11} className="fill-pink-500 text-pink-500" />{t('storesPage.featured')}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3.5 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white">
            {store.logo && failedLogo !== store.logo
              ? <img src={store.logo} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailedLogo(store.logo)} className="h-full w-full object-contain p-1" />
              : <span className="text-lg font-black text-pink-600">{store.name?.slice(0, 2).toUpperCase() || <Store size={22} />}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="min-w-0 truncate text-base font-bold text-gray-950"><Link to={destination} draggable={false} className="transition-colors hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500">{store.name}</Link></h3>
              {store.is_verified && <BadgeCheck size={18} role="img" aria-label={t('storesPage.verified')} className="shrink-0 fill-pink-600 text-white" />}
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-pink-600">{category}</p>
          </div>
        </div>
        <p className="my-3 line-clamp-2 min-h-[2.25rem] text-xs leading-relaxed text-gray-500 sm:text-sm">{description}</p>
        {location && <p className="mb-3 flex min-w-0 items-center gap-1 text-xs text-gray-400"><MapPin size={13} className="shrink-0" /><span className="truncate">{location}</span></p>}
        <Link to={destination} draggable={false} className="mt-auto flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-200 transition hover:bg-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-500 active:scale-[0.99] sm:text-sm">{t('storesPage.visitStore')}<ArrowUpRight size={15} /></Link>
      </div>
    </article>
  )
}
