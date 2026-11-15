import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Store } from 'lucide-react'
import { storesApi } from '@/api/stores'
import { STOREFRONT_LIVE_QUERY } from '@/utils/constants'
import StoreCard, { StoreCardSkeleton } from './StoreCard'

export default function DiscoverStoresSection() {
  const { t } = useTranslation()
  const trackRef = useRef(null)
  const drag = useRef({ active: false, moved: false })
  const resetTimer = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-stores', 'home'],
    queryFn: () => storesApi.getPublicStores({ homepage: 1, page_size: 12 }).then((response) => response.data),
    ...STOREFRONT_LIVE_QUERY,
  })
  const stores = (Array.isArray(data) ? data : data?.results || []).filter((store) => store.slug)
  const updateEdges = () => {
    const track = trackRef.current
    if (track) setEdges({ start: track.scrollLeft <= 2, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 2 })
  }

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    updateEdges()
    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)
    return () => observer.disconnect()
  }, [data, isLoading])
  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  const scroll = (direction) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({ left: direction * track.clientWidth * 0.9,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const finishDrag = (event) => {
    const track = trackRef.current
    drag.current.active = false
    if (track) track.style.scrollSnapType = ''
    if (track?.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId)
    resetTimer.current = window.setTimeout(() => { drag.current.moved = false }, 0)
  }

  if (!isLoading && stores.length === 0 && !isError) {
    return null
  }

  return (
    <div className="bg-white px-2.5 pb-4 pt-4 sm:px-4 md:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm shadow-pink-100">
            <Store size={14} strokeWidth={2.5} />
          </span>
          <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">{t('storesPage.title')}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              aria-label={t('storesPage.previous')}
              disabled={edges.start || isLoading}
              onClick={() => scroll(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-pink-300 hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label={t('storesPage.next')}
              disabled={edges.end || isLoading}
              onClick={() => scroll(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-pink-300 hover:text-pink-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-500 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Link to="/stores" className="flex shrink-0 items-center gap-0.5 text-[13px] font-black text-pink-600 transition active:scale-95">
            {t('common.seeAll') || t('common.viewAll')} <ChevronRight size={13} strokeWidth={3} />
          </Link>
        </div>
      </div>
      {isError ? (
        <div role="status" className="rounded-2xl bg-pink-50 px-5 py-8 text-center text-sm text-gray-600">
          <p>{t('storesPage.loadError')}</p>
          <button type="button" onClick={() => refetch()} className="mt-3 font-bold text-pink-600 underline">
            {t('storesPage.retry')}
          </button>
        </div>
      ) : (
        <div
          ref={trackRef}
          role="region"
          aria-label={t('storesPage.title')}
          tabIndex={0}
          onScroll={updateEdges}
          onPointerDown={(event) => {
            if (event.pointerType !== 'mouse' || event.button !== 0) return
            window.clearTimeout(resetTimer.current)
            event.currentTarget.style.scrollSnapType = 'none'
            drag.current = { active: true, moved: false, x: event.clientX, left: event.currentTarget.scrollLeft }
          }}
          onPointerMove={(event) => {
            if (!drag.current.active) return
            const dx = event.clientX - drag.current.x
            if (Math.abs(dx) > 6) {
              drag.current.moved = true
              event.currentTarget.setPointerCapture(event.pointerId)
            }
            if (drag.current.moved) {
              event.preventDefault()
              event.currentTarget.scrollLeft = drag.current.left - dx
            }
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onPointerLeave={(event) => { if (!drag.current.moved) finishDrag(event) }}
          onClickCapture={(event) => { if (drag.current.moved) { event.preventDefault(); event.stopPropagation() } }}
          className="-mx-2.5 flex snap-x snap-mandatory scroll-px-2.5 gap-3 overflow-x-auto px-2.5 pb-2.5 scroll-smooth [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400 sm:-mx-4 sm:scroll-px-4 sm:gap-4 sm:px-4 md:-mx-6 md:gap-4 md:px-6"
        >
          {isLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="w-[82%] shrink-0 snap-start sm:w-[48%] md:w-[350px] lg:w-[370px]">
                <StoreCardSkeleton />
              </div>
            ))
          ) : (
            stores.map((store) => (
              <div key={store.id} className="w-[82%] shrink-0 snap-start sm:w-[48%] md:w-[350px] lg:w-[370px]">
                <StoreCard store={store} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
