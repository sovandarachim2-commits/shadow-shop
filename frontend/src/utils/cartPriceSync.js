import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { productsApi } from '@/api/products'
import useCartStore from '@/store/cartStore'
import { formatCurrency } from '@/utils/helpers'

export function useCartPriceSync() {
  const { t } = useTranslation()
  const items = useCartStore((state) => state.items)
  const syncPrices = useCartStore((state) => state.syncPrices)
  const notified = useRef(new Set())
  const productIds = useMemo(
    () => [...new Set(items
      .filter((item) => item.product?.item_type !== 'set' && item.product?.id)
      .map((item) => item.product.id))]
      .sort((a, b) => String(a).localeCompare(String(b))),
    [items],
  )
  const setIds = useMemo(
    () => [...new Set(items
      .filter((item) => item.product?.item_type === 'set' && item.product?.product_set_id)
      .map((item) => item.product.product_set_id))]
      .sort((a, b) => Number(a) - Number(b)),
    [items],
  )

  const { data: revision } = useQuery({
    queryKey: ['storefront-revision'],
    queryFn: () => productsApi.revision().then((response) => response.data?.revision ?? 0),
    staleTime: 0,
    refetchInterval: 1000,
    retry: false,
  })

  const { data } = useQuery({
    queryKey: ['cart-live-prices', productIds.join(','), setIds.join(','), revision ?? 'pending'],
    enabled: productIds.length + setIds.length > 0 && revision != null,
    staleTime: 0,
    queryFn: async () => {
      const [products, sets] = await Promise.all([
        Promise.all(productIds.map((id) => productsApi.products.get(id).then((response) => response.data))),
        Promise.all(setIds.map((id) => productsApi.sets.get(id).then((response) => response.data))),
      ])
      return { products, sets }
    },
  })

  useEffect(() => {
    if (!data) return
    const raised = syncPrices(data) || []
    raised.forEach((item) => {
      const key = `${item.id}:${item.price}`
      if (notified.current.has(key)) return
      notified.current.add(key)
      toast(t('cart.flashSaleEnded', { name: item.name, price: formatCurrency(item.price) }))
    })
  }, [data, syncPrices, t])
}
