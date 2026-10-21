import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'

const isTelegramCallback = window.location.pathname.replace(/\/+$/, '') === '/auth/telegram/callback'

if (!window.__shadowTelegramCallbackDone) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

if (!isTelegramCallback && 'serviceWorker' in navigator) {
  // First visit has no controller. Claiming that tab would reload a page
  // that already loaded from the network. Reload only when a new worker
  // replaces one that was already running.
  const hadController = Boolean(navigator.serviceWorker.controller)

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        registration.update().catch(() => {})
      })
      .catch(() => {})
  })

  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return
    refreshing = true
    window.location.reload()
  })
}
