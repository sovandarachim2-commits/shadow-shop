import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/api/products'

const STOREFRONT_CHANNEL = 'shadow-shop-storefront'

const STOREFRONT_QUERY_ROOTS = [
  ['home-feed'],
  ['home-flash-sale-fallback'],
  ['products-list'],
  ['shop-product-sets'],
  ['categories'],
  ['brands-shop'],
  ['brands-home'],
  ['product'],
  ['related-products'],
  ['recommended-products'],
  ['product-set-detail'],
  ['product-set-related-sets'],
  ['product-set-recommended-products'],
  ['search-brands'],
  ['search-categories'],
  ['search-popular-products'],
  ['site-settings'],
  ['home-banners'],
  ['categories-home'],
]

function refreshStorefrontQueries(queryClient) {
  STOREFRONT_QUERY_ROOTS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey })
  })
}

export function useLiveStorefront() {
  const queryClient = useQueryClient()
  const seenRevision = useRef(undefined)
  const refreshLock = useRef(false)

  const refresh = () => {
    if (refreshLock.current) return
    refreshLock.current = true
    refreshStorefrontQueries(queryClient)
    window.setTimeout(() => {
      refreshLock.current = false
    }, 400)
  }

  useEffect(() => {
    let channel
    try {
      channel = new BroadcastChannel(STOREFRONT_CHANNEL)
      channel.onmessage = () => refresh()
    } catch {
      channel = null
    }
    return () => channel?.close()
  }, [queryClient])

  const { data: revision } = useQuery({
    queryKey: ['storefront-revision'],
    queryFn: () => productsApi.revision().then((response) => response.data?.revision ?? 0),
    staleTime: 0,
    refetchInterval: 1000,
    retry: false,
  })

  useEffect(() => {
    if (revision == null) return
    if (seenRevision.current === undefined) {
      seenRevision.current = revision
      return
    }
    if (seenRevision.current !== revision) {
      seenRevision.current = revision
      refresh()
    }
  }, [revision])
}
