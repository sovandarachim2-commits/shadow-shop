import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Sparkles,
  Store,
  X,
} from 'lucide-react'
import { productsApi } from '@/api/products'
import useAuthStore from '@/store/authStore'
import { cn } from '@/utils/helpers'

const SESSION_KEY_PREFIX = 'ss_offer_session_'
const DAY_KEY_PREFIX = 'ss_offer_day_'
const CAMPAIGN_KEY_PREFIX = 'ss_offer_campaign_'

function todayStr() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isPosterSuppressed(poster) {
  if (!poster?.id) return true
  try {
    if (localStorage.getItem(`${CAMPAIGN_KEY_PREFIX}${poster.id}`) === '1') {
      return true
    }
    const freq = poster.display_frequency || 'once_per_session'
    if (freq === 'once_per_session') {
      return sessionStorage.getItem(`${SESSION_KEY_PREFIX}${poster.id}`) === '1'
    }
    if (freq === 'once_per_day') {
      return localStorage.getItem(`${DAY_KEY_PREFIX}${poster.id}`) === todayStr()
    }
    if (freq === 'once_per_campaign') {
      return localStorage.getItem(`${CAMPAIGN_KEY_PREFIX}${poster.id}`) === '1'
    }
  } catch {
    return false
  }
  return false
}

function markPosterSeen(poster, permanently = false) {
  if (!poster?.id) return
  try {
    if (permanently || poster.display_frequency === 'once_per_campaign') {
      localStorage.setItem(`${CAMPAIGN_KEY_PREFIX}${poster.id}`, '1')
    } else if (poster.display_frequency === 'once_per_day') {
      localStorage.setItem(`${DAY_KEY_PREFIX}${poster.id}`, todayStr())
    }
    sessionStorage.setItem(`${SESSION_KEY_PREFIX}${poster.id}`, '1')
  } catch {
    // Ignore storage quota errors
  }
}

function formatCountdown(endAt) {
  if (!endAt) return null
  const diff = new Date(endAt).getTime() - Date.now()
  if (!Number.isFinite(diff) || diff <= 0) return null
  const totalSec = Math.floor(diff / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
  return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`
}

export default function OffersForYouModal({
  previewMode = false,
  previewPosters = null,
  previewDevice = 'desktop',
  isOpenOverride = false,
  onCloseOverride = null,
}) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  const [, setTick] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleResize = () => setIsMobileViewport(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { data: fetchedPosters = [] } = useQuery({
    queryKey: ['public-offer-posters', user?.id || 'guest'],
    queryFn: () => productsApi.offerPosters.public().then((r) => (Array.isArray(r.data) ? r.data : [])),
    enabled: !previewMode,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const eligiblePosters = useMemo(() => {
    if (previewMode) return Array.isArray(previewPosters) ? previewPosters : []
    return fetchedPosters.filter((p) => !isPosterSuppressed(p))
  }, [previewMode, previewPosters, fetchedPosters])

  // Open automatically when eligible posters exist in storefront mode
  useEffect(() => {
    if (previewMode) {
      setIsOpen(Boolean(isOpenOverride))
      setActiveIndex(0)
      return
    }
    if (eligiblePosters.length > 0) {
      setIsOpen(true)
      setActiveIndex(0)
    }
  }, [previewMode, isOpenOverride, eligiblePosters.length])

  const openState = previewMode ? Boolean(isOpenOverride) : isOpen
  const posters = eligiblePosters
  const currentPoster = posters[activeIndex] || posters[0] || null

  // Countdown tick every second when modal is open and active poster has end_at
  useEffect(() => {
    if (!openState || !currentPoster?.end_at) return undefined
    const timer = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [openState, currentPoster?.end_at])

  // Auto-slide every 5.5 seconds when open, > 1 poster, and not hovered
  useEffect(() => {
    if (!openState || posters.length <= 1 || isHovered) return undefined
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % posters.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [openState, posters.length, isHovered])

  const handleClose = useCallback(() => {
    if (previewMode) {
      onCloseOverride?.()
      return
    }
    posters.forEach((p) => markPosterSeen(p, dontShowAgain))
    setIsOpen(false)
    setDontShowAgain(false)
  }, [previewMode, onCloseOverride, posters, dontShowAgain])

  const handleActionClick = () => {
    if (!currentPoster) return
    const target = currentPoster.resolved_action_url || currentPoster.action_url || '/shop'
    if (!previewMode) {
      posters.forEach((p) => markPosterSeen(p, dontShowAgain))
      setIsOpen(false)
    } else {
      onCloseOverride?.()
    }
    if (/^https?:\/\//i.test(target)) {
      window.open(target, '_blank', 'noopener,noreferrer')
    } else {
      navigate(target)
    }
  }

  if (!openState || !currentPoster) return null

  const useMobileImage = previewMode ? previewDevice === 'mobile' : isMobileViewport
  const posterSrc = useMobileImage
    ? currentPoster.mobile_image_url || currentPoster.image_url
    : currentPoster.image_url || currentPoster.mobile_image_url
  const countdown = formatCountdown(currentPoster.end_at)
  const isExternal = /^https?:\/\//i.test(currentPoster.resolved_action_url || currentPoster.action_url || '')

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Offers for You"
    >
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/80 transition-all',
          previewMode && previewDevice === 'mobile' ? 'max-w-[380px]' : 'max-w-[540px]',
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#7C3AED]/10 via-white to-[#EC4899]/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white shadow-sm">
              <Sparkles size={14} />
            </span>
            <h2 className="text-base font-black tracking-tight text-slate-900">
              Offers for You
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close offers popup"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto">
          {/* Poster Image Container (preserves original aspect ratio without stretching) */}
          {posterSrc && (
            <div className="relative flex items-center justify-center bg-slate-50">
              <img
                src={posterSrc}
                alt={currentPoster.title}
                className="max-h-[46vh] w-full object-contain"
              />

              {posters.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((prev) => (prev - 1 + posters.length) % posters.length)}
                    aria-label="Previous offer"
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIndex((prev) => (prev + 1) % posters.length)}
                    aria-label="Next offer"
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:bg-white"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              {currentPoster.store_name && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED]/10 px-2.5 py-1 text-[11px] font-bold text-[#7C3AED]">
                  <Store size={12} />
                  {currentPoster.store_name}
                </span>
              )}
              {countdown && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EC4899]/10 px-2.5 py-1 text-[11px] font-bold text-[#EC4899]">
                  <Clock size={12} />
                  Ends in {countdown}
                </span>
              )}
            </div>

            <div>
              <h3 className="text-lg font-extrabold leading-snug text-slate-900">
                {currentPoster.title}
              </h3>
              {currentPoster.description && (
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {currentPoster.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleActionClick}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#EC4899] px-5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95 active:scale-[0.99]"
            >
              <span>{currentPoster.button_label || 'Shop Now'}</span>
              {isExternal && <ExternalLink size={15} />}
            </button>

            {/* Pagination Dots + Don't show again */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {!previewMode ? (
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 select-none">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#EC4899] focus:ring-[#EC4899]"
                  />
                  <span>Don&apos;t show this offer again</span>
                </label>
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Preview ({previewDevice})
                </span>
              )}

              {posters.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {posters.map((p, idx) => (
                    <button
                      key={p.id || idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Go to offer ${idx + 1}`}
                      className={cn(
                        'h-2 rounded-full transition-all',
                        idx === activeIndex ? 'w-5 bg-[#EC4899]' : 'w-2 bg-slate-200 hover:bg-slate-300',
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

