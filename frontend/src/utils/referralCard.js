/**
 * Generates an elegant, high-resolution Shadow Shop invitation card
 * inspired by Khmer24's card design with a unique custom frame,
 * user name, QR code with center logo, clean code pill, and official website domain.
 */
import QRCode from 'qrcode'

function drawRoundRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.arcTo(x + width, y, x + width, y + radius, radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  ctx.lineTo(x + radius, y + height)
  ctx.arcTo(x, y + height, x, y + height - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
  if (fill) ctx.fill()
  if (stroke) ctx.stroke()
}

async function loadImage(src) {
  if (!src) return null

  // 1. If it's already a data URL or blob URL, load directly
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
  }

  // 2. Try fetching as Blob first (converts to blob URL which never taints canvas)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(src, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = blobUrl
      })
    }
  } catch (err) {
    // Fall back to Image loading
  }

  // 3. Fallback: standard Image with anonymous CORS
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    let resolved = false
    img.onload = () => {
      if (!resolved) {
        resolved = true
        resolve(img)
      }
    }
    img.onerror = () => {
      if (!resolved) {
        resolved = true
        resolve(null)
      }
    }
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(null)
      }
    }, 8000)
    img.src = src
  })
}

function drawFinderPattern(ctx, x, y, size) {
  const mod = size / 7
  // Outer black rounded box (7x7)
  ctx.fillStyle = '#000000'
  drawRoundRect(ctx, x, y, size, size, mod * 1.8, true, false)

  // Inner white cutout (5x5)
  ctx.fillStyle = '#ffffff'
  drawRoundRect(ctx, x + mod, y + mod, size - 2 * mod, size - 2 * mod, mod * 1.2, true, false)

  // Core black dot (3x3)
  ctx.fillStyle = '#000000'
  drawRoundRect(ctx, x + 2 * mod, y + 2 * mod, size - 4 * mod, size - 4 * mod, mod * 0.9, true, false)
}

function drawUserSilhouette(ctx, cx, cy) {
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.arc(cx, cy, 64, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, 64, 0, Math.PI * 2)
  ctx.clip()

  // Head
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.arc(cx, cy - 14, 23, 0, Math.PI * 2)
  ctx.fill()

  // Torso / Shoulders
  ctx.beginPath()
  ctx.ellipse(cx, cy + 56, 42, 32, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export function getCleanWebsiteDomain(fallbackUrl = '') {
  // 1. Check frontend environment variables if defined (VITE_SITE_URL, VITE_FRONTEND_URL, etc.)
  const envUrl =
    import.meta.env?.VITE_SITE_URL ||
    import.meta.env?.VITE_PUBLIC_URL ||
    import.meta.env?.VITE_FRONTEND_URL ||
    import.meta.env?.VITE_APP_URL

  if (envUrl) {
    try {
      const url = new URL(envUrl.startsWith('http') ? envUrl : `https://${envUrl}`)
      return url.host || url.hostname.replace(/^www\./, '')
    } catch {}
  }

  // 2. Check fallback URL passed in
  if (fallbackUrl) {
    try {
      const url = new URL(fallbackUrl.startsWith('http') ? fallbackUrl : `http://${fallbackUrl}`)
      if (url.host) {
        return url.host
      }
    } catch {}
  }

  // 3. Current window location
  if (typeof window !== 'undefined' && window.location?.host) {
    return window.location.host
  }

  return 'shadow-shop.online'
}

export async function generateReferralPosterDataUrl({
  qrDataUrl,
  referralCode = '',
  referralLink = '',
  websiteDomain = '',
  userName = 'Shadow Shop Member',
  userAvatar = null,
  userAvatarFallback = null,
  storeName = 'Shadow Shop',
}) {
  const finalLink = referralLink || (typeof window !== 'undefined' ? window.location.origin : 'https://shadow-shop.online')
  const displayDomain = websiteDomain || getCleanWebsiteDomain(finalLink)

  // Generate QR matrix with error correction level Q (allows center logo without scan failure)
  let qrMatrix
  try {
    const qr = QRCode.create(finalLink, { errorCorrectionLevel: 'Q' })
    qrMatrix = qr.modules
  } catch (err) {
    console.error('Failed to create QR matrix:', err)
  }

  // Load avatar image: try proxy first, then fallback
  let avatarImg = null
  if (userAvatar) {
    avatarImg = await loadImage(userAvatar)
  }
  if (!avatarImg && userAvatarFallback && userAvatarFallback !== userAvatar) {
    avatarImg = await loadImage(userAvatarFallback)
  }

  const width = 800
  const height = 1060
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  if (!ctx) return qrDataUrl || ''

  try {
    // 1. Overall poster background (soft light neutral gray)
    ctx.fillStyle = '#f2f4f7'
    ctx.fillRect(0, 0, width, height)

    // 2. White Card Container (tightly proportioned with zero dead space)
    const cardW = 660
    const cardH = 760
    const cardX = (width - cardW) / 2 // 70
    const cardY = 125
    const cardR = 36

    // Drop Shadow
    ctx.save()
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)'
    ctx.shadowBlur = 36
    ctx.shadowOffsetY = 14
    ctx.fillStyle = '#ffffff'
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR, true, false)
    ctx.restore()

    // Outer Card Border Frame
    ctx.strokeStyle = '#fbcfe8'
    ctx.lineWidth = 2.5
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR, false, true)

    // Top Card Brand Gradient Accent Bar
    ctx.save()
    ctx.beginPath()
    if (ctx.roundRect) {
      ctx.roundRect(cardX, cardY, cardW, 10, [cardR, cardR, 0, 0])
    } else {
      ctx.rect(cardX, cardY, cardW, 10)
    }
    const barGrad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0)
    barGrad.addColorStop(0, '#ec197a')
    barGrad.addColorStop(0.5, '#f472b6')
    barGrad.addColorStop(1, '#db2777')
    ctx.fillStyle = barGrad
    ctx.fill()
    ctx.restore()

    // 3. User Avatar (overlapping the top edge of the card, exactly like Khmer24)
    const avatarCX = 400
    const avatarCY = cardY // 125
    const avatarRadius = 66

    // Outer white ring
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(avatarCX, avatarCY, avatarRadius + 8, 0, Math.PI * 2)
    ctx.fill()

    // Subtle pink ring around avatar
    ctx.strokeStyle = '#fbcfe8'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(avatarCX, avatarCY, avatarRadius + 8, 0, Math.PI * 2)
    ctx.stroke()

    if (avatarImg) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(avatarCX, avatarCY, avatarRadius, 0, Math.PI * 2)
      ctx.clip()

      // Center-crop / object-fit: cover so user photo is perfectly framed without distortion
      const imgW = avatarImg.naturalWidth || avatarImg.width || (avatarRadius * 2)
      const imgH = avatarImg.naturalHeight || avatarImg.height || (avatarRadius * 2)
      const minDim = Math.min(imgW, imgH)
      const sx = (imgW - minDim) / 2
      const sy = (imgH - minDim) / 2

      ctx.drawImage(
        avatarImg,
        sx,
        sy,
        minDim,
        minDim,
        avatarCX - avatarRadius,
        avatarCY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      )
      ctx.restore()
    } else {
      drawUserSilhouette(ctx, avatarCX, avatarCY)
    }

    // 4. User Name (Clean, single prominent line — no awkward labels)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    const cleanName = userName || 'Shadow Shop Member'
    ctx.fillText(cleanName, 400, cardY + 115)

    // 5. Unique QR Frame Container (Dedicated Viewfinder Frame in Shadow Shop Pink)
    const qrFrameW = 440
    const qrFrameH = 440
    const qrFrameX = 400 - qrFrameW / 2 // 180
    const qrFrameY = cardY + 145 // 270
    const qrFrameR = 24

    // Frame background & border
    ctx.fillStyle = '#fafbfc'
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineWidth = 1.5
    drawRoundRect(ctx, qrFrameX, qrFrameY, qrFrameW, qrFrameH, qrFrameR, true, true)

    // 4 Unique Viewfinder Corner Brackets in Shadow Shop Pink (#ec197a)
    const bLen = 32
    const bOff = 16
    ctx.strokeStyle = '#ec197a'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'

    // Top-Left ┌
    ctx.beginPath()
    ctx.moveTo(qrFrameX + bOff, qrFrameY + bOff + bLen)
    ctx.lineTo(qrFrameX + bOff, qrFrameY + bOff)
    ctx.lineTo(qrFrameX + bOff + bLen, qrFrameY + bOff)
    ctx.stroke()

    // Top-Right ┐
    ctx.beginPath()
    ctx.moveTo(qrFrameX + qrFrameW - bOff - bLen, qrFrameY + bOff)
    ctx.lineTo(qrFrameX + qrFrameW - bOff, qrFrameY + bOff)
    ctx.lineTo(qrFrameX + qrFrameW - bOff, qrFrameY + bOff + bLen)
    ctx.stroke()

    // Bottom-Left └
    ctx.beginPath()
    ctx.moveTo(qrFrameX + bOff, qrFrameY + qrFrameH - bOff - bLen)
    ctx.lineTo(qrFrameX + bOff, qrFrameY + qrFrameH - bOff)
    ctx.lineTo(qrFrameX + bOff + bLen, qrFrameY + qrFrameH - bOff)
    ctx.stroke()

    // Bottom-Right ┘
    ctx.beginPath()
    ctx.moveTo(qrFrameX + qrFrameW - bOff - bLen, qrFrameY + qrFrameH - bOff)
    ctx.lineTo(qrFrameX + qrFrameW - bOff, qrFrameY + qrFrameH - bOff)
    ctx.lineTo(qrFrameX + qrFrameW - bOff, qrFrameY + qrFrameH - bOff - bLen)
    ctx.stroke()

    // Draw QR inside the Frame Container
    const qrTargetSize = 370

    if (qrMatrix && qrMatrix.size) {
      const size = qrMatrix.size
      const modSize = qrTargetSize / size
      const qrActualSize = modSize * size
      const qrX = 400 - qrActualSize / 2
      const qrY = qrFrameY + (qrFrameH - qrActualSize) / 2

      // Draw 3 corner finder patterns
      const finderSize = 7 * modSize
      drawFinderPattern(ctx, qrX, qrY, finderSize) // Top-Left
      drawFinderPattern(ctx, qrX + (size - 7) * modSize, qrY, finderSize) // Top-Right
      drawFinderPattern(ctx, qrX, qrY + (size - 7) * modSize, finderSize) // Bottom-Left

      // Draw all data modules
      ctx.fillStyle = '#000000'
      const modR = modSize * 0.35 // smooth rounded module corners

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          // Skip the 3 finder pattern areas
          const isTopLeft = r < 7 && c < 7
          const isTopRight = r < 7 && c >= size - 7
          const isBottomLeft = r >= size - 7 && c < 7
          if (isTopLeft || isTopRight || isBottomLeft) continue

          if (qrMatrix.get(r, c)) {
            const mx = qrX + c * modSize
            const my = qrY + r * modSize
            drawRoundRect(ctx, mx, my, modSize, modSize, modR, true, false)
          }
        }
      }

      // Center Logo Badge (Khmer24-style clean white badge with Shadow Shop branding)
      const badgeW = 120
      const badgeH = 58
      const badgeX = 400 - badgeW / 2
      const badgeY = qrY + qrActualSize / 2 - badgeH / 2
      const badgeR = 16

      // White badge card
      ctx.fillStyle = '#ffffff'
      drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeR, true, false)

      // Inner text
      // "shadow" top line
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif'
      ctx.fillText('shadow', 400, badgeY + 22)

      // "shop" bottom line in Shadow Shop pink
      ctx.fillStyle = '#ec197a'
      ctx.font = '900 23px system-ui, -apple-system, sans-serif'
      ctx.fillText('shop', 400, badgeY + 45)

      // Pink accent curve underneath "shop"
      ctx.strokeStyle = '#ec197a'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(384, badgeY + 51)
      ctx.quadraticCurveTo(400, badgeY + 55, 418, badgeY + 49)
      ctx.stroke()
    } else if (qrDataUrl) {
      // Fallback to pre-rendered QR image if matrix creation fails
      const qrImg = await loadImage(qrDataUrl)
      if (qrImg) {
        const qrX = 400 - qrTargetSize / 2
        const qrY = qrFrameY + (qrFrameH - qrTargetSize) / 2
        ctx.drawImage(qrImg, qrX, qrY, qrTargetSize, qrTargetSize)
      }
    }

    // 6. Clean, Modern Referral Code Badge (No text label clutter — just the clean code)
    const codeVal = referralCode || '------'
    const codeBoxW = 210
    const codeBoxH = 46
    const codeBoxX = 400 - codeBoxW / 2
    const codeBoxY = qrFrameY + qrFrameH + 24
    const codeBoxR = 14

    ctx.fillStyle = '#fdf2f8'
    ctx.strokeStyle = '#fbcfe8'
    ctx.lineWidth = 1.5
    drawRoundRect(ctx, codeBoxX, codeBoxY, codeBoxW, codeBoxH, codeBoxR, true, true)

    // Code centered with crisp letter spacing
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ec197a'
    ctx.font = '900 22px monospace'
    ctx.fillText(codeVal, 400, codeBoxY + codeBoxH / 2)

    // 7. Footer: Clean Website Domain & "Powered by Shadow Shop" (outside card)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'

    // Real Website Domain
    const domainY = cardY + cardH + 34
    ctx.fillStyle = '#475569'
    ctx.font = 'bold 16px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText(displayDomain, 400, domainY)

    // "Powered by Shadow Shop"
    const footerY = domainY + 28
    ctx.fillStyle = '#64748b'
    ctx.font = '500 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.fillText('Powered by', 400, footerY)

    const brandY = footerY + 28
    ctx.font = '900 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

    const shadowText = 'Shadow '
    const shopText = 'Shop'
    const shadowW = ctx.measureText(shadowText).width
    const shopW = ctx.measureText(shopText).width
    const totalW = shadowW + shopW
    const startX = 400 - totalW / 2

    ctx.textAlign = 'left'
    ctx.fillStyle = '#0f172a'
    ctx.fillText(shadowText, startX, brandY)

    ctx.fillStyle = '#ec197a'
    ctx.fillText(shopText, startX + shadowW, brandY)

    // Tiny pink smile swoosh under "Shop"
    ctx.strokeStyle = '#ec197a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(startX + shadowW + 2, brandY + 6)
    ctx.quadraticCurveTo(startX + shadowW + shopW / 2, brandY + 11, startX + shadowW + shopW - 2, brandY + 5)
    ctx.stroke()

    return canvas.toDataURL('image/png')
  } catch (err) {
    console.error('Failed to render referral card poster:', err)
    return qrDataUrl || ''
  }
}
