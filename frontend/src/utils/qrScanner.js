import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

async function waitForScanElement(elementId) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (document.getElementById(elementId)) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('Scanner screen did not open.')
}

export function cameraErrorMessage(error) {
  const name = String(error?.name || '')
  const message = String(error?.message || error || '')

  if (!window.isSecureContext) {
    return 'Open https://localhost:5175 and allow the camera. An http network address cannot use the camera.'
  }
  if (name === 'NotAllowedError' || /permission|notallowed|denied/i.test(message)) {
    return 'Click Allow when Chrome asks for the camera. If it was blocked, click the lock icon in the address bar and set Camera to Allow.'
  }
  if (name === 'NotFoundError' || /not found|overconstrained|device/i.test(message)) {
    return 'No camera was found. In Windows Settings, open Privacy and security, then Camera, and turn on camera access.'
  }
  return message || 'Could not open the camera.'
}

export async function startQrScanner(elementId, { fps = 12, qrbox, onScan }) {
  if (!window.isSecureContext) {
    throw new Error('Open https://localhost:5175 and allow the camera.')
  }
  await waitForScanElement(elementId)
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser cannot use the camera.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  stream.getTracks().forEach((track) => track.stop())
  await new Promise((resolve) => setTimeout(resolve, 150))

  const qr = new Html5Qrcode(elementId, {
    verbose: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    // Phone Chrome has a camera decoder that shows video but does not read the QR.
    experimentalFeatures: { useBarCodeDetectorIfSupported: false },
  })
  const cameras = await Html5Qrcode.getCameras().catch(() => [])
  const backCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label || ''))
  const cameraConfig = (backCamera || cameras[0])?.id || { facingMode: 'environment' }

  await qr.start(cameraConfig, { fps, qrbox, disableFlip: false }, onScan, () => {})
  return qr
}

export function stopQrScanner(scanner) {
  if (!scanner || typeof scanner.stop !== 'function') return Promise.resolve()

  try {
    const stopped = scanner.stop()
    if (stopped && typeof stopped.then === 'function') {
      return stopped.catch(() => {})
    }
  } catch {
    // html5-qrcode throws this when stop is called before the camera is running.
  }

  return Promise.resolve()
}
