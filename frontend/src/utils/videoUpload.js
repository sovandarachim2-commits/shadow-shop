export const MAX_SERVER_VIDEO_BYTES = 500 * 1024 * 1024
export const MAX_RAW_VIDEO_BYTES = 500 * 1024 * 1024
export const AUTO_COMPRESS_ABOVE_BYTES = 18 * 1024 * 1024
export const SAFE_DIRECT_UPLOAD_BYTES = 45 * 1024 * 1024

export function formatFileSize(bytes) {
  const size = Number(bytes || 0)
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

function pickSupportedVideoMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null
  }
  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', ext: '.mp4', baseType: 'video/mp4' },
    { mimeType: 'video/mp4;codecs=avc1', ext: '.mp4', baseType: 'video/mp4' },
    { mimeType: 'video/mp4', ext: '.mp4', baseType: 'video/mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', ext: '.webm', baseType: 'video/webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', ext: '.webm', baseType: 'video/webm' },
    { mimeType: 'video/webm', ext: '.webm', baseType: 'video/webm' },
  ]
  return candidates.find((item) => MediaRecorder.isTypeSupported(item.mimeType)) || null
}

function makeEven(value) {
  const rounded = Math.max(2, Math.round(value))
  return rounded % 2 === 0 ? rounded : rounded - 1
}

export async function compressVideoForUpload(file, options = {}) {
  const {
    maxDimension = 1280,
    targetMaxBytes = 24 * 1024 * 1024,
    compressAboveBytes = AUTO_COMPRESS_ABOVE_BYTES,
    force = false,
    onProgress,
  } = options

  if (!file) {
    return { file, compressed: false, originalSize: 0, finalSize: 0 }
  }

  if (!force && file.size <= compressAboveBytes) {
    return { file, compressed: false, originalSize: file.size, finalSize: file.size }
  }

  const format = pickSupportedVideoMimeType()
  if (!format || typeof document === 'undefined') {
    return { file, compressed: false, originalSize: file.size, finalSize: file.size }
  }

  const objectUrl = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.playsInline = true
  video.preload = 'auto'
  video.src = objectUrl

  let audioCtx = null
  let canvasStream = null
  let rafId = null

  const cleanup = () => {
    if (rafId) cancelAnimationFrame(rafId)
    if (canvasStream) {
      canvasStream.getTracks().forEach((track) => track.stop())
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {})
    }
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }

  try {
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Video metadata timed out')), 15000)
      video.onloadedmetadata = () => {
        window.clearTimeout(timer)
        resolve()
      }
      video.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('Could not read video file'))
      }
    })

    const srcWidth = video.videoWidth || 720
    const srcHeight = video.videoHeight || 1280
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 30
    const scale = Math.min(1, maxDimension / Math.max(srcWidth, srcHeight))
    const width = makeEven(srcWidth * scale)
    const height = makeEven(srcHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      cleanup()
      return { file, compressed: false, originalSize: file.size, finalSize: file.size }
    }

    canvasStream = canvas.captureStream(30)
    const combinedTracks = [...canvasStream.getVideoTracks()]

    // Capture audio without playing it out loud through speakers.
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
        const source = audioCtx.createMediaElementSource(video)
        const dest = audioCtx.createMediaStreamDestination()
        source.connect(dest)
        dest.stream.getAudioTracks().forEach((track) => combinedTracks.push(track))
      } else {
        video.muted = true
      }
    } catch {
      video.muted = true
    }

    const stream = new MediaStream(combinedTracks)
    const audioBitsPerSecond = 96_000
    const budgetBitsPerSec = (targetMaxBytes * 8 * 0.85) / Math.max(duration, 1)
    const videoBitsPerSecond = Math.max(450_000, Math.min(2_000_000, Math.floor(budgetBitsPerSec - audioBitsPerSecond)))

    const chunks = []
    const recorder = new MediaRecorder(stream, {
      mimeType: format.mimeType,
      videoBitsPerSecond,
      audioBitsPerSecond,
    })

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data)
    }

    const recordingDone = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve()
      recorder.onerror = (event) => reject(event?.error || new Error('Video compression failed'))
    })

    const drawFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, width, height)
        if (onProgress && duration > 0) {
          const pct = Math.min(99, Math.max(1, Math.round((video.currentTime / duration) * 100)))
          onProgress(pct)
        }
        rafId = requestAnimationFrame(drawFrame)
      }
    }

    video.currentTime = 0
    recorder.start(500)
    await video.play()
    drawFrame()

    await new Promise((resolve, reject) => {
      video.onended = () => {
        ctx.drawImage(video, 0, 0, width, height)
        if (onProgress) onProgress(100)
        resolve()
      }
      video.onerror = () => reject(new Error('Playback interrupted during compression'))
    })

    if (recorder.state !== 'inactive') {
      recorder.stop()
    }
    await recordingDone

    const blob = new Blob(chunks, { type: format.baseType })
    if (!blob.size || blob.size >= file.size) {
      return { file, compressed: false, originalSize: file.size, finalSize: file.size }
    }

    const baseName = (file.name || 'video').replace(/\.[^.]+$/, '')
    const compressedFile = new File([blob], `${baseName}${format.ext}`, {
      type: format.baseType,
      lastModified: Date.now(),
    })

    return {
      file: compressedFile,
      compressed: true,
      originalSize: file.size,
      finalSize: compressedFile.size,
    }
  } catch {
    return { file, compressed: false, originalSize: file.size, finalSize: file.size }
  } finally {
    cleanup()
  }
}
