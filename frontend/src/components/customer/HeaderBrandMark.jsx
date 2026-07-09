import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'
import { authApi } from '@/api/auth'
import { cn } from '@/utils/helpers'

export default function HeaderBrandMark({ className = 'h-9 w-9', imageClassName = 'rounded-xl' }) {
  const { data: siteSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => authApi.siteSettings.get().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const logoUrl = siteSettings?.logo_url || null
  const storeName = siteSettings?.store_name || 'Shadow Shop'

  return (
    <Link to="/" className="shrink-0" aria-label={storeName}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={storeName}
          className={cn('object-contain', className, imageClassName)}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-sm',
            className,
            imageClassName,
          )}
        >
          <ShoppingBag size={17} />
        </div>
      )}
    </Link>
  )
}
