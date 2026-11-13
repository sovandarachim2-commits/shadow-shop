import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Play, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import VideoHighlightModal from './VideoHighlightModal'
import { parseVideoEmbed } from '@/utils/videoEmbed'

export function VideoHighlightCard({ video, onPlay, onShopNow, isPreview = false }) {
  const { i18n, t } = useTranslation()
  const isKm = (i18n.language || '').startsWith('km')
  const label = isKm ? (video.product_label_km || video.product_label) : (video.product_label || video.product_label_km)
  const caption = isKm ? (video.caption_km || video.caption) : (video.caption || video.caption_km)
  const customButtonText = isKm ? (video.button_label_km || video.button_label) : (video.button_label || video.button_label_km)
  const buttonText = customButtonText || t('home.shopNow')
  const hasCustomButtonUrl = Boolean((video.button_url || '').trim())
  const canLinkedProductShop = Boolean(video.product && (isPreview ? true : video.product_is_available !== false))
  const canShop = hasCustomButtonUrl || canLinkedProductShop
  const embedInfo = !video.cover_image_url && video.original_video_url ? parseVideoEmbed(video.original_video_url) : null
  const coverSrc = video.cover_image_url || embedInfo?.thumbnailUrl || ''

  return (
    <div
      className="group relative aspect-[9/16] w-full shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-900 shadow-sm ring-1 ring-black/5"
    >
      <button
        type="button"
        onClick={(event) => onPlay?.(video, event.currentTarget)}
        aria-label={`Play ${video.title || label || 'video'}`}
        className="relative block h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={video.title || label || 'Video cover'}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : video.video_url ? (
          <video
            src={`${video.video_url}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-pink-950/80 px-4 text-center">
            {embedInfo?.label && (
              <span className="mb-14 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
                {embedInfo.label}
              </span>
            )}
          </div>
        )}

        {/* Top product label */}
        {label && (
          <span className="absolute left-2.5 top-2.5 z-10 max-w-[85%] truncate rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            {label}
          </span>
        )}

        {/* Centered play icon */}
        <span className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-pink-600/90">
          <Play size={20} className="ml-0.5 fill-current" />
        </span>

        {/* Subtle bottom gradient */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
      </button>

      {/* Bottom caption + Shop Now */}
      {(caption || canShop) && (
        <div className="absolute inset-x-0 bottom-0 z-10 space-y-2 p-3">
          {caption && (
            <p className="line-clamp-2 text-xs font-semibold leading-snug text-white drop-shadow-sm">
              {caption}
            </p>
          )}
          {canShop && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onShopNow?.(video)
              }}
              className="inline-flex h-8 items-center justify-center rounded-full bg-[#EC197A] px-3.5 text-xs font-extrabold text-white shadow-md shadow-pink-600/30 transition hover:bg-[#d8146e] active:scale-95"
            >
              {buttonText}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function VideoHighlightsSection({ videos = [] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const railRef = useRef(null)
  const scrollRaf = useRef(0)
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)
  const [activeVideo, setActiveVideo] = useState(null)
  const [returnFocusEl, setReturnFocusEl] = useState(null)

  if (!videos || videos.length === 0) return null

  const handleRailScroll = () => {
    const el = railRef.current
    if (!el || videos.length <= 1) return
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current)
    scrollRaf.current = requestAnimationFrame(() => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) {
        setActiveVideoIndex(0)
        return
      }
      const progress = Math.min(1, Math.max(0, el.scrollLeft / maxScroll))
      const index = Math.round(progress * (videos.length - 1))
      setActiveVideoIndex((current) => (current === index ? current : index))
    })
  }

  const scrollToVideo = (index) => {
    const el = railRef.current
    if (!el || videos.length <= 1) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) return
    const targetScroll = (index / (videos.length - 1)) * maxScroll
    el.scrollTo({ left: targetScroll, behavior: 'smooth' })
    setActiveVideoIndex(index)
  }

  const scrollRail = (direction) => {
    const el = railRef.current
    if (!el) return
    const step = Math.max(240, el.clientWidth * 0.75)
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <>
      <div className="bg-white px-4 pb-5 pt-4 md:px-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 shadow-sm shadow-pink-100">
              <Sparkles size={14} strokeWidth={2.5} />
            </span>
            <h2 className="min-w-0 text-xl font-black leading-snug text-gray-950 md:text-2xl">
              {t('home.videoHighlights')}
            </h2>
          </div>

          {videos.length > 1 && (
            <div className="hidden items-center gap-1.5 md:flex">
              <button
                type="button"
                onClick={() => scrollRail(-1)}
                aria-label="Scroll video highlights left"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(1)}
                aria-label="Scroll video highlights right"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div
          ref={railRef}
          onScroll={handleRailScroll}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 md:gap-4"
        >
          {videos.map((video) => (
            <div
              key={video.id}
              className="w-[70vw] max-w-[240px] shrink-0 snap-start sm:w-[44vw] md:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] lg:max-w-none"
            >
              <VideoHighlightCard
                video={video}
                onPlay={(item, triggerEl) => {
                  setReturnFocusEl(triggerEl || null)
                  setActiveVideo(item)
                }}
                onShopNow={(item) => {
                  const target = item.resolved_button_url || item.button_url || (item.product ? `/product/${item.product}` : '')
                  if (!target) return
                  if (/^https?:\/\//i.test(target)) {
                    window.open(target, '_blank', 'noopener,noreferrer')
                  } else {
                    navigate(target)
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* Active Indicator Dots */}
        {videos.length > 1 && (
          <div className="mt-3.5 flex justify-center gap-1.5">
            {videos.map((video, i) => (
              <button
                key={video.id || i}
                type="button"
                onClick={() => scrollToVideo(i)}
                aria-label={`Go to video ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeVideoIndex ? 'w-5 bg-pink-600' : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <VideoHighlightModal
        video={activeVideo}
        returnFocusEl={returnFocusEl}
        onClose={() => setActiveVideo(null)}
      />
    </>
  )
}

