import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
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

  const isStaffOrAdmin = Boolean(
    user?.role === 'admin' ||
    user?.role === 'staff' ||
    user?.is_staff ||
    user?.is_superuser
  )

  const eligiblePosters = useMemo(() => {
    if (previewMode) return Array.isArray(previewPosters) ? previewPosters : []
    if (isStaffOrAdmin) return fetchedPosters
    // For customers: if any active poster has not been suppressed, show all active posters so the carousel has all slides
    const hasUnseen = fetchedPosters.some((p) => !isPosterSuppressed(p))
    return hasUnseen ? fetchedPosters : []
  }, [previewMode, previewPosters, fetchedPosters, isStaffOrAdmin])

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

  const handlePrev = useCallback((e) => {
    e?.stopPropagation()
    setActiveIndex((prev) => (prev - 1 + posters.length) % posters.length)
  }, [posters.length])

  const handleNext = useCallback((e) => {
    e?.stopPropagation()
    setActiveIndex((prev) => (prev + 1) % posters.length)
  }, [posters.length])

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
    posters.forEach((p) => markPosterSeen(p))
    setIsOpen(false)
  }, [previewMode, onCloseOverride, posters])

  // Keyboard navigation (Arrow keys + Escape)
  useEffect(() => {
    if (!openState || posters.length <= 1) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openState, posters.length, handlePrev, handleNext, handleClose])

  const [touchStartX, setTouchStartX] = useState(null)
  const handleTouchStart = (e) => setTouchStartX(e.targetTouches[0].clientX)
  const handleTouchEnd = (e) => {
    if (touchStartX === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX
    if (diff > 45) handleNext()
    else if (diff < -45) handlePrev()
    setTouchStartX(null)
  }

  const handleActionClick = () => {
    if (!currentPoster) return
    const target = currentPoster.resolved_action_url || currentPoster.action_url || '/shop'
    if (!previewMode) {
      posters.forEach((p) => markPosterSeen(p))
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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={currentPoster.title || 'Special Offer'}
    >
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all sm:rounded-3xl',
          previewMode && previewDevice === 'mobile' ? 'max-w-[360px]' : 'max-w-[480px]',
        )}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top-Right Circular Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close offers popup"
          className="absolute right-3.5 top-3.5 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md transition hover:bg-white hover:text-black hover:scale-105 active:scale-95"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Poster Image (Clickable) */}
        {posterSrc && (
          <div
            onClick={handleActionClick}
            className="group relative flex cursor-pointer items-center justify-center overflow-hidden bg-gray-50"
          >
            <img
              key={currentPoster.id || activeIndex}
              src={posterSrc}
              alt={currentPoster.title}
              className="max-h-[85vh] w-full object-contain transition-all duration-300 animate-fade-in group-hover:scale-[1.01]"
            />

            {/* Slide Indicators: dots on mobile, clean < ▬ · · > controls on desktop */}
            {posters.length > 1 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-3.5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 sm:gap-2 rounded-full bg-black/55 px-2.5 py-1 sm:px-3 sm:py-1.5 shadow-lg backdrop-blur-md"
              >
                {/* Arrow Left (Desktop only - removed on small devices) */}
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous slide"
                  className="hidden sm:flex h-5 w-5 items-center justify-center rounded-full text-white/80 transition hover:text-white hover:scale-110 active:scale-90"
                >
                  <ChevronLeft size={15} strokeWidth={2.5} />
                </button>

                {/* Point / Dots Indicators */}
                <div className="flex items-center gap-1.5 px-0.5">
                  {posters.map((p, idx) => (
                    <button
                      key={p.id || idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Go to offer ${idx + 1}`}
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        idx === activeIndex
                          ? 'w-5 bg-white shadow-sm'
                          : 'w-2 bg-white/45 hover:bg-white/80',
                      )}
                    />
                  ))}
                </div>

                {/* Arrow Right (Desktop only - removed on small devices) */}
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next slide"
                  className="hidden sm:flex h-5 w-5 items-center justify-center rounded-full text-white/80 transition hover:text-white hover:scale-110 active:scale-90"
                >
                  <ChevronRight size={15} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

