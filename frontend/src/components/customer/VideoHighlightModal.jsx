import { useEffect, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function VideoHighlightModal({ video, onClose, returnFocusEl }) {
  const { t } = useTranslation()
  const modalRef = useRef(null)
  const videoRef = useRef(null)
  const closeBtnRef = useRef(null)
  const [loadError, setLoadError] = useState(false)

  const videoSrc = video?.video_url || ''
  const externalUrl = video?.original_video_url || videoSrc

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
          'button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])',
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

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={video.title || t('home.videoHighlights')}
      onClick={stopAndClose}
    >
      <div
        ref={modalRef}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/15"
      >
        {/* Top-left: Open video */}
        {externalUrl && (
          <button
            type="button"
            onClick={handleOpenExternal}
            className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            <span>{t('home.openVideo')}</span>
            <ExternalLink size={13} />
          </button>
        )}

        {/* Top-right: Close */}
        <button
          ref={closeBtnRef}
          type="button"
          onClick={stopAndClose}
          aria-label="Close video"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-md transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          <X size={18} />
        </button>

        {loadError || !videoSrc ? (
          <div className="flex aspect-[9/16] max-h-[calc(100dvh-2rem)] w-full flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <p className="text-sm font-medium text-white/85">{t('home.videoLoadError')}</p>
            {externalUrl && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-pink-700"
              >
                <span>{t('home.openVideo')}</span>
                <ExternalLink size={14} />
              </button>
            )}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}

