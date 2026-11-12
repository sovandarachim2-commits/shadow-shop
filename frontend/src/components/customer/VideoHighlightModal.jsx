import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { parseVideoEmbed } from '@/utils/videoEmbed'

export default function VideoHighlightModal({ video, onClose, returnFocusEl }) {
  const { t } = useTranslation()
  const modalRef = useRef(null)
  const videoRef = useRef(null)
  const closeBtnRef = useRef(null)
  const [loadError, setLoadError] = useState(false)

  const videoSrc = video?.video_url || ''
  const embedInfo = !videoSrc ? parseVideoEmbed(video?.original_video_url) : null
  const embedUrl = embedInfo?.embedUrl || ''
  const externalUrl = video?.original_video_url || videoSrc
  const isLandscapeEmbed = Boolean(embedUrl && embedInfo?.aspect === 'landscape')

  const stopAndClose = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      try {
        videoRef.current.currentTime = 0
      } catch {
        // Ignore seek reset errors when media hasn't loaded yet.
      }
    }
    onClose?.()
    if (returnFocusEl && typeof returnFocusEl.focus === 'function') {
      requestAnimationFrame(() => returnFocusEl.focus())
    }
  }

  useEffect(() => {
    if (!video) return undefined
    setLoadError(false)

    // Focus the close button on open and trap Tab focus inside the modal.
    const focusTimer = requestAnimationFrame(() => {
      closeBtnRef.current?.focus()
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        stopAndClose()
        return
      }
      if (event.key !== 'Tab' || !modalRef.current) return
      const focusable = Array.from(
        modalRef.current.querySelectorAll(
          'button:not([disabled]), a[href], video[controls], iframe, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video])

  if (!video) return null

  const handleOpenExternal = (event) => {
    event.stopPropagation()
    if (videoRef.current) {
      videoRef.current.pause()
    }
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={video.title || t('home.videoHighlights')}
      onClick={stopAndClose}
    >
      <div
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
        className={`relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl bg-neutral-950 shadow-[0_24px_64px_rgba(0,0,0,0.35)] ring-1 ring-black/15 ${
          isLandscapeEmbed ? 'max-w-[720px]' : 'max-w-[420px]'
        }`}
      >
        {embedUrl && !videoSrc && !loadError ? (
          <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-neutral-950 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              {externalUrl && (
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white/95 transition hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <span>{t('home.openVideo')}</span>
                  <ExternalLink size={12} strokeWidth={2} className="text-white/80" />
                </button>
              )}
              {video.title && (
                <span className="truncate text-xs font-medium text-white/70">{video.title}</span>
              )}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={stopAndClose}
              aria-label="Close video"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/95 transition hover:bg-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Top-left: View video */}
            {externalUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="absolute left-3 top-3 z-20 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3.5 text-xs font-semibold tracking-tight text-white/95 shadow-sm backdrop-blur-md transition hover:bg-black/65 hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <span>{t('home.openVideo')}</span>
                <ExternalLink size={13} strokeWidth={2} className="text-white/80" />
              </button>
            )}

            {/* Top-right: Close */}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={stopAndClose}
              aria-label="Close video"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/95 shadow-sm backdrop-blur-md transition hover:bg-black/65 hover:text-white active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <X size={17} />
            </button>
          </>
        )}

        {videoSrc && !loadError ? (
          <video
            ref={videoRef}
            key={videoSrc}
            src={videoSrc}
            poster={video.cover_image_url || undefined}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onError={() => setLoadError(true)}
            className="max-h-[calc(100dvh-2rem)] w-full bg-black object-contain"
          />
        ) : embedUrl && !loadError ? (
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={video.title || embedInfo?.label || t('home.videoHighlights')}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onError={() => setLoadError(true)}
            className={`w-full border-0 ${
              embedInfo?.provider === 'telegram' ? 'bg-white' : 'bg-black'
            } ${
              isLandscapeEmbed
                ? 'aspect-video max-h-[calc(100dvh-5.5rem)]'
                : 'aspect-[9/16] max-h-[calc(100dvh-5.5rem)]'
            }`}
          />
        ) : (
          <div className="flex aspect-[9/16] max-h-[calc(100dvh-2rem)] w-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <p className="text-sm font-medium text-white/85">{t('home.videoLoadError')}</p>
            {externalUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-pink-600/25 transition hover:bg-pink-500 active:scale-95"
              >
                <span>{t('home.openVideo')}</span>
                <ExternalLink size={13} strokeWidth={2} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}

