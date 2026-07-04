import { useEffect } from 'react'
import { ScanLine, X } from 'lucide-react'

export function fullscreenQrBox(viewfinderWidth, viewfinderHeight) {
  const size = Math.floor(Math.min(viewfinderWidth * 0.82, viewfinderHeight * 0.52, 360))
  return { width: Math.max(size, 180), height: Math.max(size, 180) }
}

export default function FullscreenQrScanner({
  active,
  scannerId,
  onClose,
  title = 'Scan QR code',
}) {
  useEffect(() => {
    if (!active) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [active])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black text-white">
      <div
        id={scannerId}
        className="absolute inset-0 h-full w-full bg-black [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-black/25" />

      <div
        className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-5 pb-4"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <div className="w-11" />
        <p className="text-center text-base font-black">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
          aria-label="Close scanner"
        >
          <X size={24} />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-8">
        <div className="relative aspect-square w-[82vw] max-w-[360px]">
          <span className="absolute left-0 top-0 h-12 w-12 rounded-tl-lg border-l-[5px] border-t-[5px] border-orange-500" />
          <span className="absolute right-0 top-0 h-12 w-12 rounded-tr-lg border-r-[5px] border-t-[5px] border-orange-500" />
          <span className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-lg border-b-[5px] border-l-[5px] border-orange-500" />
          <span className="absolute bottom-0 right-0 h-12 w-12 rounded-br-lg border-b-[5px] border-r-[5px] border-orange-500" />
          <span className="qr-scanner-line absolute left-5 right-5 h-0.5 bg-orange-500 shadow-[0_0_14px_rgba(249,115,22,1)]" />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center px-6 pt-5"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mb-5 flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-bold backdrop-blur">
          <ScanLine size={18} className="text-orange-400" />
          Hold the QR code inside the frame
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-14 w-full max-w-md rounded-lg bg-orange-600 text-base font-black text-white shadow-lg active:bg-orange-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
