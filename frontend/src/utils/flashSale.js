export function formatFlashSaleCountdown(targetAt, nowMs = Date.now()) {
  if (!targetAt) return ''

  const targetMs = new Date(targetAt).getTime()
  if (!Number.isFinite(targetMs)) return ''

  const diffMs = Math.max(0, targetMs - nowMs)
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (value) => String(value).padStart(2, '0')
  if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function hasFlashSaleTimer(item) {
  return Boolean(getFlashSaleTimerState(item))
}

export function getFlashSaleTimerState(item, nowMs = Date.now()) {
  if (!item?.flash_sale_price) return null

  const startMs = item.flash_sale_starts_at ? new Date(item.flash_sale_starts_at).getTime() : null
  const endMs = item.flash_sale_ends_at ? new Date(item.flash_sale_ends_at).getTime() : null

  if (Number.isFinite(endMs) && endMs < nowMs) return null
  if (Number.isFinite(startMs) && startMs > nowMs) {
    return {
      label: 'Starts in',
      value: formatFlashSaleCountdown(item.flash_sale_starts_at, nowMs),
    }
  }
  if (Number.isFinite(endMs)) {
    return {
      label: 'Ends in',
      value: formatFlashSaleCountdown(item.flash_sale_ends_at, nowMs),
    }
  }

  return null
}

export function isVisibleFlashSaleItem(item, nowMs = Date.now()) {
  if (!item?.flash_sale_price) return false
  const endMs = item.flash_sale_ends_at ? new Date(item.flash_sale_ends_at).getTime() : null
  return !(Number.isFinite(endMs) && endMs < nowMs)
}
