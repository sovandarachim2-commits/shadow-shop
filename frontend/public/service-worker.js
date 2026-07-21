const CACHE_VERSION = 'shadow-shop-v6'
const APP_SHELL = [
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/app-icon-180.png',
  '/app-icon-192.png',
  '/app-icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached
    return fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy))
      }
      return response
    })
  })
}

function networkFirst(request, fallbackUrl) {
  return fetch(request, { cache: 'no-store' })
    .then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_VERSION).then((cache) => cache.put(fallbackUrl || request, copy))
      }
      return response
    })
    .catch(() => caches.match(fallbackUrl || request))
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return
  }

  // Hashed Vite assets: serve from cache immediately after first download
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/index.html'))
    return
  }

  if (['script', 'style'].includes(event.request.destination)) {
    event.respondWith(cacheFirst(event.request))
    return
  }

  if (['image', 'font'].includes(event.request.destination)) {
    event.respondWith(cacheFirst(event.request))
  }
})
