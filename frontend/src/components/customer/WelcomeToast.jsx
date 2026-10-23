import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import i18n from '@/i18n'
import { authApi } from '@/api/auth'

function WelcomeToastCard({ item, message }) {
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((response) => response.data),
    staleTime: 15_000,
  })
  const logoUrl = siteSettings?.logo_url || siteSettings?.favicon_url || ''
  const storeName = siteSettings?.store_name || 'Shadow Shop'

  return (
    <div
      role="status"
      className={`pointer-events-auto flex max-w-[min(92vw,360px)] items-center gap-2.5 rounded-full border border-pink-100 bg-white py-2 pl-2 pr-2 shadow-[0_12px_32px_rgba(236,25,122,0.16)] transition ${
        item.visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={storeName} className="h-9 w-9 shrink-0 rounded-2xl object-contain" />
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-full bg-pink-100" />
      )}
      <p className="min-w-0 flex-1 text-[14px] font-bold leading-6 text-slate-800">{message}</p>
      <button
        type="button"
        onClick={() => toast.dismiss(item.id)}
        aria-label="Close"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-pink-50 hover:text-slate-700"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export function showWelcomeToast({ returning = false } = {}) {
  const message = i18n.t(returning ? 'auth.welcomeBackUser' : 'auth.welcomeUser')

  toast.custom((item) => (
    <WelcomeToastCard item={item} message={message} />
  ), { duration: 2400, position: 'top-right' })
}
