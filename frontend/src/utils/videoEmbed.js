/**
 * Parse external video URLs (YouTube, TikTok, Facebook, Telegram) into safe iframe embed configs.
 */

function normalizeHttpsUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return parsed
  } catch {
    return null
  }
}

export function parseVideoEmbed(rawUrl) {
  const parsed = normalizeHttpsUrl(rawUrl)
  if (!parsed) return null

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
  const path = parsed.pathname || '/'

  // YouTube: watch?v=..., youtu.be/..., /shorts/..., /embed/..., /live/...
  if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
    let videoId = ''
    let isShorts = false

    if (host === 'youtu.be') {
      videoId = path.replace(/^\/+/, '').split('/')[0] || ''
    } else if (path.startsWith('/shorts/')) {
      videoId = path.slice('/shorts/'.length).split('/')[0] || ''
      isShorts = true
    } else if (path.startsWith('/embed/')) {
      videoId = path.slice('/embed/'.length).split('/')[0] || ''
    } else if (path.startsWith('/live/')) {
      videoId = path.slice('/live/'.length).split('/')[0] || ''
    } else {
      videoId = parsed.searchParams.get('v') || ''
    }

    if (/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      return {
        provider: 'youtube',
        label: 'YouTube',
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`,
        aspect: isShorts ? 'portrait' : 'landscape',
        externalUrl: parsed.toString(),
      }
    }
  }

  // TikTok: tiktok.com/@user/video/<id> or tiktok.com/embed/v2/<id>
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    const match = path.match(/\/(?:video|embed(?:\/v2)?)\/(\d+)/)
    if (match) {
      return {
        provider: 'tiktok',
        label: 'TikTok',
        embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}`,
        aspect: 'portrait',
        externalUrl: parsed.toString(),
      }
    }
    return {
      provider: 'tiktok',
      label: 'TikTok',
      embedUrl: '',
      aspect: 'portrait',
      externalUrl: parsed.toString(),
      reason: 'Short TikTok links open externally; paste the full tiktok.com/@user/video/... URL for inline iframe.',
    }
  }

  // Facebook: facebook.com/.../videos/..., /reel/..., /watch?v=..., fb.watch/...
  if (host === 'facebook.com' || host === 'fb.watch' || host === 'web.facebook.com') {
    const isReel = path.includes('/reel/')
    const isVideoPath =
      isReel ||
      path.includes('/videos/') ||
      path.startsWith('/watch') ||
      Boolean(parsed.searchParams.get('v')) ||
      host === 'fb.watch'

    if (isVideoPath) {
      return {
        provider: 'facebook',
        label: 'Facebook',
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(parsed.toString())}&show_text=false`,
        aspect: isReel ? 'portrait' : 'landscape',
        externalUrl: parsed.toString(),
      }
    }
  }

  // Telegram: t.me/<channel>/<post_id> or t.me/s/<channel>/<post_id>
  if (host === 't.me' || host === 'telegram.me') {
    const match = path.match(/^\/(?:s\/)?([A-Za-z0-9_]{3,})\/(\d+)\/?$/)
    if (match) {
      return {
        provider: 'telegram',
        label: 'Telegram',
        embedUrl: `https://t.me/${match[1]}/${match[2]}?embed=1`,
        aspect: 'portrait',
        externalUrl: parsed.toString(),
      }
    }
    return {
      provider: 'telegram',
      label: 'Telegram',
      embedUrl: '',
      aspect: 'portrait',
      externalUrl: parsed.toString(),
      reason: 'Only public channel post links (https://t.me/channel/123) can play inside an iframe.',
    }
  }

  return {
    provider: 'external',
    label: 'External Link',
    embedUrl: '',
    aspect: 'portrait',
    externalUrl: parsed.toString(),
    reason: 'This link will open in a new tab.',
  }
}
