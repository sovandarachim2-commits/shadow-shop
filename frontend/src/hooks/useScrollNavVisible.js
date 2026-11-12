import { useEffect, useRef, useState } from 'react'

/**
 * Tracks whether mobile navigation bars should be visible based on scroll direction.
 * Returns true near the top of the page or when scrolling up, and false when scrolling down.
 */
export default function useScrollNavVisible({
  enabled = true,
  topThreshold = 80,
  resetKey,
} = {}) {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    setVisible(true)
    lastScrollY.current = typeof window !== 'undefined' ? Math.max(0, window.scrollY) : 0
  }, [resetKey])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setVisible(true)
      return undefined
    }

    lastScrollY.current = Math.max(0, window.scrollY)
    let rafId = 0

    const update = () => {
      rafId = 0
      const currentY = Math.max(0, window.scrollY)
      const delta = currentY - lastScrollY.current
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      const isBottomBounce = maxScroll > 0 && currentY >= maxScroll - 16

      if (currentY <= topThreshold) {
        setVisible((prev) => (prev ? prev : true))
        lastScrollY.current = currentY
        return
      }

      if (delta > 8) {
        setVisible((prev) => (prev ? false : prev))
        lastScrollY.current = currentY
      } else if (delta < -6 && !isBottomBounce) {
        setVisible((prev) => (prev ? prev : true))
        lastScrollY.current = currentY
      }
    }

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(update)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [enabled, topThreshold])

  return visible
}

