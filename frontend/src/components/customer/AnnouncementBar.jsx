import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import useAuthStore from '@/store/authStore'
import { toProvinceKey } from '@/utils/cambodiaProvinces'
import {
  ANNOUNCEMENT_ICON_MAP,
  isAnnouncementWithinSchedule,
  resolveAnnouncementPresentation,
  resolvePageKey,
} from '@/utils/announcementUtils'
import { cn } from '@/utils/helpers'

function useDeviceBreakpoint() {
  const getDevice = () => {
    if (typeof window === 'undefined') return 'desktop'
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  const [device, setDevice] = useState(getDevice)

  useEffect(() => {
    const onResize = () => setDevice(getDevice())
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return device
}

function useSystemReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event) => setPrefersReduced(Boolean(event.matches))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}

function AnnouncementLink({ url, openInNewTab, textColor, isPreview, className, children }) {
  if (!url) return <>{children}</>

  const handlePreviewClick = (e) => {
    if (isPreview) e.preventDefault()
  }

  if (!openInNewTab && url.startsWith('/')) {
    return (
      <Link
        to={isPreview ? '#' : url}
        onClick={handlePreviewClick}
        className={className}
        style={{ color: textColor }}
      >
        {children}
      </Link>
    )
  }

  return (
    <a
      href={isPreview ? '#preview-link' : url}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
      onClick={handlePreviewClick}
      className={className}
      style={{ color: textColor }}
    >
      {children}
    </a>
  )
}

function AnnouncementItemContent({ presentation, isPreview }) {
  const IconComponent = ANNOUNCEMENT_ICON_MAP[presentation.icon] || null

  const iconEl = IconComponent ? (
    <IconComponent
      size={presentation.iconSize}
      className="shrink-0"
      style={{ color: presentation.iconColor }}
      aria-hidden="true"
    />
  ) : null

  const textNode = (
    <span className={cn('leading-snug', presentation.isKhmerText && 'khmer-font')}>
      {presentation.message}
    </span>
  )

  const ctaBadge = presentation.linkUrl && presentation.linkText ? (
    <AnnouncementLink
      url={presentation.linkUrl}
      openInNewTab={presentation.openInNewTab}
      textColor={presentation.textColor}
      isPreview={isPreview}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-current/25 bg-white/15 px-2.5 py-0.5 text-[0.82em] font-bold underline-offset-2 backdrop-blur-xs transition hover:bg-white/25 hover:underline"
    >
      <span className={cn(presentation.isKhmerText && 'khmer-font')}>{presentation.linkText}</span>
      <ArrowRight size={12} aria-hidden="true" />
    </AnnouncementLink>
  ) : null

  const content = (
    <span className="inline-flex items-center gap-2">
      {iconEl}
      {textNode}
      {ctaBadge}
    </span>
  )

  if (presentation.linkUrl && !presentation.linkText) {
    return (
      <AnnouncementLink
        url={presentation.linkUrl}
        openInNewTab={presentation.openInNewTab}
        textColor={presentation.textColor}
        isPreview={isPreview}
        className="inline-flex items-center gap-2 transition hover:opacity-85 hover:underline"
      >
        {iconEl}
        {textNode}
      </AnnouncementLink>
    )
  }

  return content
}

/**
 * Repeats marquee copies per half so wide viewports never expose empty trailing space.
 */
function AnnouncementMarquee({ presentation, isPreview, barKey }) {
  const viewportRef = useRef(null)
  const sampleRef = useRef(null)
  const [metrics, setMetrics] = useState({ repeatCount: 4, halfWidth: 1200 })

  useEffect(() => {
    const measure = () => {
      const viewportWidth = viewportRef.current?.offsetWidth || 0
      const unitWidth = sampleRef.current?.offsetWidth || 0
      if (!viewportWidth || !unitWidth) return
      const repeatCount = Math.max(2, Math.min(16, Math.ceil(viewportWidth / unitWidth) + 1))
      const halfWidth = Math.round(unitWidth * repeatCount)
      setMetrics((prev) =>
        prev.repeatCount === repeatCount && Math.abs(prev.halfWidth - halfWidth) < 8
          ? prev
          : { repeatCount, halfWidth }
      )
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    if (viewportRef.current) observer.observe(viewportRef.current)
    if (sampleRef.current) observer.observe(sampleRef.current)
    return () => observer.disconnect()
  }, [
    presentation.message,
    presentation.linkText,
    presentation.linkUrl,
    presentation.fontSize,
    presentation.fontWeight,
    presentation.icon,
    presentation.iconSize,
  ])

  const pxPerSec = 24 + presentation.animationSpeed * 10
  const durationSeconds = Math.max(6, Number((metrics.halfWidth / pxPerSec).toFixed(1)))
  const items = Array.from({ length: metrics.repeatCount })

  return (
    <div ref={viewportRef} className="w-full overflow-hidden whitespace-nowrap">
      <div
        key={`${barKey}-${metrics.repeatCount}`}
        className="announcement-marquee-track"
        style={{
          animationName: presentation.animationDirection === 'right' ? 'announcementMarqueeRight' : 'announcementMarqueeLeft',
          animationDuration: `${durationSeconds}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        {items.map((_, idx) => (
          <span
            key={`a-${idx}`}
            ref={idx === 0 ? sampleRef : undefined}
            className="inline-flex items-center gap-8 pr-8"
          >
            <AnnouncementItemContent presentation={presentation} isPreview={isPreview} />
            <span className="opacity-40" aria-hidden="true">•</span>
          </span>
        ))}
        {items.map((_, idx) => (
          <span
            key={`b-${idx}`}
            className="inline-flex items-center gap-8 pr-8"
            aria-hidden="true"
          >
            <AnnouncementItemContent presentation={presentation} isPreview={isPreview} />
            <span className="opacity-40">•</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Shared announcement bar renderer used by both the customer storefront and the Admin Live Design Preview.
 */
export function AnnouncementBarStage({
  announcements = [],
  activeIndex = 0,
  onSelectIndex,
  device = 'desktop',
  language = 'en',
  isPreview = false,
  className = '',
}) {
  const systemReducedMotion = useSystemReducedMotion()

  const entries = useMemo(() => {
    return announcements
      .map((item) => ({
        raw: item,
        presentation: resolveAnnouncementPresentation(item, { device, language }),
      }))
      .filter((entry) => entry.presentation.visible)
  }, [announcements, device, language])

  if (entries.length === 0) return null

  const safeIndex = activeIndex % entries.length
  const current = entries[safeIndex]
  const p = current.presentation
  const hasMultiple = entries.length > 1
  const reduceMotion = p.reducedMotion || systemReducedMotion

  const justifyClass =
    p.alignment === 'left'
      ? 'justify-start text-left'
      : p.alignment === 'right'
        ? 'justify-end text-right'
        : 'justify-center text-center'

  const isMarquee = p.animationType === 'marquee' && !reduceMotion

  let motionClass = ''
  if (!reduceMotion && !isMarquee) {
    if (p.animationType === 'slide') {
      motionClass = p.animationDirection === 'right' ? 'announcement-slide-right' : 'announcement-slide-left'
    } else if (p.animationType === 'fade') {
      motionClass = 'announcement-fade-in'
    } else if (p.animationType === 'rotate') {
      motionClass = 'announcement-rotate-in'
    }
  }

  const barKey = `${current.raw.id || 'preview'}-${safeIndex}-${p.animationType}-${p.animationDirection}`

  const stepPrev = () => {
    if (!onSelectIndex || !hasMultiple) return
    onSelectIndex((safeIndex - 1 + entries.length) % entries.length)
  }

  const stepNext = () => {
    if (!onSelectIndex || !hasMultiple) return
    onSelectIndex((safeIndex + 1) % entries.length)
  }

  return (
    <div
      role="region"
      aria-label="Store announcements"
      className={cn('relative w-full overflow-hidden select-none', className)}
      style={{
        ...p.backgroundStyle,
        color: p.textColor,
        minHeight: `${p.height}px`,
        borderRadius: p.borderRadius ? `${p.borderRadius}px` : undefined,
        fontSize: `${p.fontSize}px`,
        fontWeight: p.fontWeight,
        '--ann-duration': `${p.transitionDuration}ms`,
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[1500px] items-center gap-2"
        style={{
          minHeight: `${p.height}px`,
          paddingLeft: `${p.paddingX}px`,
          paddingRight: `${p.paddingX}px`,
        }}
      >
        {hasMultiple && !isMarquee && (
          <button
            type="button"
            onClick={stepPrev}
            aria-label="Previous announcement"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-75 transition hover:bg-white/15 hover:opacity-100"
            style={{ color: p.textColor }}
          >
            <ChevronLeft size={14} />
          </button>
        )}

        <div className={cn('min-w-0 flex-1 overflow-hidden py-1', !isMarquee && 'flex items-center', !isMarquee && justifyClass)}>
          {isMarquee ? (
            <AnnouncementMarquee presentation={p} isPreview={isPreview} barKey={barKey} />
          ) : (
            <div key={barKey} className={cn('min-w-0 truncate-none', motionClass)}>
              <AnnouncementItemContent presentation={p} isPreview={isPreview} />
            </div>
          )}
        </div>

        {hasMultiple && !isMarquee && (
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
              {entries.map((entry, idx) => (
                <button
                  key={entry.raw.id || idx}
                  type="button"
                  onClick={() => onSelectIndex?.(idx)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    idx === safeIndex ? 'w-4 opacity-100' : 'w-1.5 opacity-40 hover:opacity-75'
                  )}
                  style={{ backgroundColor: p.textColor }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={stepNext}
              aria-label="Next announcement"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-75 transition hover:bg-white/15 hover:opacity-100"
              style={{ color: p.textColor }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AnnouncementBar() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const device = useDeviceBreakpoint()
  const language = i18n.language?.startsWith('km') ? 'km' : 'en'
  const currentPageKey = resolvePageKey(location.pathname)

  const [nowMs, setNowMs] = useState(() => Date.now())
  const [activeIndex, setActiveIndex] = useState(0)

  const { data: announcements = [] } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => productsApi.announcements.public().then((r) => (Array.isArray(r.data) ? r.data : [])),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const needsDeliveryAreaMatch = useMemo(
    () => announcements.some((item) => Array.isArray(item.target_delivery_areas) && item.target_delivery_areas.length > 0),
    [announcements]
  )

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => authApi.addresses.list().then((r) => r.data.results ?? r.data ?? []),
    enabled: Boolean(isAuthenticated && needsDeliveryAreaMatch),
    staleTime: 5 * 60 * 1000,
  })

  const activeDeliveryArea = useMemo(() => {
    try {
      const saved = localStorage.getItem('shadow-shop-delivery-area')
      if (saved) return toProvinceKey(saved, '')
    } catch {
      // Ignore storage access failures.
    }
    if (Array.isArray(addresses) && addresses.length > 0) {
      const def = addresses.find((a) => a.is_default) || addresses[0]
      if (def?.city || def?.state) {
        return toProvinceKey(def.state || def.city, '')
      }
    }
    return ''
  }, [addresses])

  const activeStoreId = useMemo(() => {
    try {
      return localStorage.getItem('shadow-shop-store-id') || ''
    } catch {
      return ''
    }
  }, [])

  // Tick every 30s so scheduled/expired announcements show/hide automatically in memory without extra requests
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const visibleAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (!isAnnouncementWithinSchedule(item, nowMs)) return false

      if (item.page_display_mode === 'selected') {
        const pages = Array.isArray(item.target_pages) ? item.target_pages : []
        if (!pages.includes(currentPageKey)) return false
      }

      const stores = Array.isArray(item.target_stores) ? item.target_stores.filter(Boolean) : []
      if (stores.length > 0 && activeStoreId && !stores.includes(String(activeStoreId))) {
        return false
      }

      const areas = Array.isArray(item.target_delivery_areas) ? item.target_delivery_areas.filter(Boolean) : []
      if (areas.length > 0) {
        if (!activeDeliveryArea || !areas.includes(activeDeliveryArea)) return false
      }

      const presentation = resolveAnnouncementPresentation(item, { device, language })
      return presentation.visible
    })
  }, [announcements, nowMs, currentPageKey, activeStoreId, activeDeliveryArea, device, language])

  useEffect(() => {
    if (activeIndex >= visibleAnnouncements.length && visibleAnnouncements.length > 0) {
      setActiveIndex(0)
    }
  }, [activeIndex, visibleAnnouncements.length])

  useEffect(() => {
    if (visibleAnnouncements.length <= 1) return undefined
    const activeItem = visibleAnnouncements[activeIndex % visibleAnnouncements.length]
    const delay = Math.max(1500, Math.min(30000, Number(activeItem?.rotation_delay || 4000)))
    const timer = window.setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % visibleAnnouncements.length)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [visibleAnnouncements, activeIndex])

  if (visibleAnnouncements.length === 0) return null

  return (
    <AnnouncementBarStage
      announcements={visibleAnnouncements}
      activeIndex={activeIndex}
      onSelectIndex={setActiveIndex}
      device={device}
      language={language}
      className="z-50"
    />
  )
}

