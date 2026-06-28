import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Flame, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { productsApi } from '@/api/products'
import { getListResults } from '@/utils/apiData'
import { formatCurrency } from '@/utils/helpers'

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function FlashSaleForm({ items, saleProduct, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    product: saleProduct ? `${saleProduct._saleType}:${saleProduct.id}` : '',
    flash_sale_price: saleProduct?.flash_sale_price || '',
    flash_sale_max_order_qty: saleProduct?.flash_sale_max_order_qty || '',
    flash_sale_starts_at: toDatetimeLocal(saleProduct?.flash_sale_starts_at),
    flash_sale_ends_at: toDatetimeLocal(saleProduct?.flash_sale_ends_at),
  })

  const selectedProduct = items.find((item) => `${item._saleType}:${item.id}` === form.product)

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!selectedProduct) return toast.error('Please select product')
    if (!form.flash_sale_price || Number(form.flash_sale_price) <= 0) {
      return toast.error('Enter flash sale price')
    }
    if (Number(form.flash_sale_price) >= Number(selectedProduct.retail_price)) {
      return toast.error('Flash sale price must be lower than retail price')
    }
    if (form.flash_sale_max_order_qty && Number(form.flash_sale_max_order_qty) < 1) {
      return toast.error('Max order qty must be at least 1')
    }
    if (
      form.flash_sale_starts_at &&
      form.flash_sale_ends_at &&
      new Date(form.flash_sale_starts_at) >= new Date(form.flash_sale_ends_at)
    ) {
      return toast.error('End time must be after start time')
    }
    onSave(selectedProduct, form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5">
      <div>
        <label className="label">Product *</label>
        <select
          value={form.product}
          onChange={(event) => set('product', event.target.value)}
          disabled={!!saleProduct || saving}
          className="select-field"
        >
          <option value="">- Select product or set -</option>
          {items.map((product) => (
            <option key={`${product._saleType}-${product.id}`} value={`${product._saleType}:${product.id}`}>
              {product._saleType === 'set' ? '[SET] ' : ''}{product.name} {product.code ? `(${product.code})` : ''} - {formatCurrency(product.retail_price)}
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <div className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-pink-50 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            {selectedProduct.primary_image ? (
              <img src={selectedProduct.primary_image} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              <Flame size={20} className="text-pink-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-gray-900">{selectedProduct.name}</p>
            <p className="text-xs font-semibold text-gray-500">
              Retail: {formatCurrency(selectedProduct.retail_price)}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="label">Flash Sale Price *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.flash_sale_price}
            onChange={(event) => set('flash_sale_price', event.target.value)}
            className="input-field"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="label">Max Order Qty</label>
          <input
            type="number"
            min="1"
            step="1"
            value={form.flash_sale_max_order_qty}
            onChange={(event) => set('flash_sale_max_order_qty', event.target.value)}
            className="input-field"
            placeholder="No limit"
          />
        </div>
        <div>
          <label className="label">Start Time</label>
          <input
            type="datetime-local"
            value={form.flash_sale_starts_at}
            onChange={(event) => set('flash_sale_starts_at', event.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">End Time</label>
          <input
            type="datetime-local"
            value={form.flash_sale_ends_at}
            onChange={(event) => set('flash_sale_ends_at', event.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div className="flex gap-3 border-t border-gray-100 pt-4">
        <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-60">
          {saving ? 'Saving...' : saleProduct ? 'Update Flash Sale' : 'Create Flash Sale'}
        </button>
        <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1 justify-center">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function FlashSales() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['flash-sale-products'],
    queryFn: () => productsApi.products.list({ page_size: 200, is_active: true }).then((r) => getListResults(r.data)),
    staleTime: 60000,
  })

  const { data: allSets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['flash-sale-product-sets'],
    queryFn: () => productsApi.sets.list({ page_size: 200, is_active: true }).then((r) => getListResults(r.data)),
    staleTime: 60000,
  })

  const saleItems = useMemo(() => [
    ...allProducts.map((product) => ({ ...product, _saleType: 'product' })),
    ...allSets.map((productSet) => ({
      ...productSet,
      _saleType: 'set',
      code: `SET-${productSet.id}`,
      retail_price: productSet.price,
      primary_image: productSet.image_url || productSet.image,
      category_name: 'Product Set',
    })),
  ], [allProducts, allSets])

  const flashProducts = useMemo(() => {
    const value = search.trim().toLowerCase()
    return saleItems
      .filter((product) => product.is_featured || product.flash_sale_price)
      .filter((product) => {
        if (!value) return true
        return `${product.name} ${product.code} ${product.category_name || ''} ${product.brand_name || ''}`.toLowerCase().includes(value)
      })
  }, [saleItems, search])

  const saveMutation = useMutation({
    mutationFn: ({ product, form }) => productsApi[product._saleType === 'set' ? 'sets' : 'products'].update(product.id, {
      is_featured: true,
      flash_sale_price: Number(form.flash_sale_price),
      flash_sale_max_order_qty: form.flash_sale_max_order_qty ? Number(form.flash_sale_max_order_qty) : null,
      flash_sale_starts_at: form.flash_sale_starts_at || null,
      flash_sale_ends_at: form.flash_sale_ends_at || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sale-products'] })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-product-sets'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setShowModal(false)
      setEditProduct(null)
      toast.success('Flash sale saved')
    },
    onError: () => toast.error('Failed to save flash sale'),
  })

  const removeMutation = useMutation({
    mutationFn: (product) => productsApi[product._saleType === 'set' ? 'sets' : 'products'].update(product.id, {
      is_featured: false,
      flash_sale_price: null,
      flash_sale_max_order_qty: null,
      flash_sale_starts_at: null,
      flash_sale_ends_at: null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sale-products'] })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-product-sets'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Flash sale removed')
    },
    onError: () => toast.error('Failed to remove flash sale'),
  })

  const openCreate = () => {
    setEditProduct(null)
    setShowModal(true)
  }

  const openEdit = (product) => {
    setEditProduct(product)
    setShowModal(true)
  }

  const handleRemove = (product) => {
    if (!window.confirm(`Remove flash sale from "${product.name}"?`)) return
    removeMutation.mutate(product)
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Flash Sale"
        subtitle={`${flashProducts.length} products and sets`}
        breadcrumbs={[{ label: 'Products' }, { label: 'Flash Sale' }]}
        actions={
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Add Flash Sale
          </button>
        }
      />

      <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search flash sale products or sets..."
              className="input-field pl-9"
            />
          </div>
          <p className="text-xs font-semibold text-gray-400">Select product, set sale price, max order qty, and choose start/end time.</p>
        </div>

        {isLoading || setsLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="grid gap-4 px-5 py-4 md:grid-cols-[60px_minmax(240px,1.4fr)_100px_110px_100px_100px_minmax(220px,1fr)_120px_150px]">
                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
              </div>
            ))}
          </div>
        ) : flashProducts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Flame size={42} className="mx-auto mb-3 text-pink-200" />
            <p className="font-black text-gray-700">No flash sale products or sets</p>
            <p className="mt-1 text-sm">Create a flash sale by selecting a product or product set.</p>
            <button onClick={openCreate} className="btn-primary mx-auto mt-4">
              <Plus size={15} /> Create Flash Sale
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="hidden border-b border-gray-100 bg-gray-50 px-5 py-3 text-[11px] font-black uppercase tracking-wide text-gray-500 md:grid md:grid-cols-[60px_minmax(240px,1.4fr)_100px_110px_100px_100px_minmax(220px,1fr)_120px_150px] md:items-center md:gap-4">
              <div>No</div>
              <div>Product</div>
              <div>Retail</div>
              <div>Flash Price</div>
              <div>Max Qty</div>
              <div>Orders</div>
              <div>Schedule</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            {flashProducts.map((product, index) => (
              <div
                key={`${product._saleType}-${product.id}`}
                className="grid gap-3 border-b border-gray-100 px-5 py-4 last:border-b-0 hover:bg-gray-50/70 md:grid-cols-[60px_minmax(240px,1.4fr)_100px_110px_100px_100px_minmax(220px,1fr)_120px_150px] md:items-center md:gap-4"
              >
                <div className="hidden text-sm font-black text-gray-500 md:block">{index + 1}</div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100">
                    {product.primary_image ? (
                      <img src={product.primary_image} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <Flame size={20} className="text-pink-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900">{product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-400">
                      <span>{product.code}</span>
                      {product._saleType === 'set' && <Badge variant="info">Product Set</Badge>}
                      {product.brand_name && <span>{product.brand_name}</span>}
                      {product.category_name && <span>{product.category_name}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0">
                  <span className="text-xs font-bold uppercase text-gray-400 md:hidden">Retail</span>
                  <span className="text-sm font-black text-gray-600 line-through">{formatCurrency(product.retail_price)}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-pink-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0">
                  <span className="text-xs font-bold uppercase text-pink-500 md:hidden">Flash</span>
                  <span className="text-sm font-black text-pink-600">{formatCurrency(product.flash_sale_price)}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0">
                  <span className="text-xs font-bold uppercase text-orange-500 md:hidden">Max Qty</span>
                  <span className="text-sm font-black text-orange-600">{product.flash_sale_max_order_qty || 'No limit'}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2 md:block md:bg-transparent md:px-0 md:py-0">
                  <span className="text-xs font-bold uppercase text-purple-500 md:hidden">Orders</span>
                  <div>
                    <p className="text-sm font-black text-purple-700">{product._saleType === 'set' ? '—' : product.flash_sale_order_count || 0}</p>
                    <p className="text-[11px] font-semibold text-gray-400">{product._saleType === 'set' ? 'Set' : `${product.flash_sale_quantity_sold || 0} qty`}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 md:bg-transparent md:px-0 md:py-0">
                  <p>
                    <span className="font-black text-gray-400">Start:</span>{' '}
                    {product.flash_sale_starts_at ? new Date(product.flash_sale_starts_at).toLocaleString() : 'Now'}
                  </p>
                  <p className="mt-1">
                    <span className="font-black text-gray-400">End:</span>{' '}
                    {product.flash_sale_ends_at ? new Date(product.flash_sale_ends_at).toLocaleString() : 'No end date'}
                  </p>
                </div>

                <div>
                  <Badge variant={product.is_flash_sale_active ? 'danger' : 'default'}>
                    {product.is_flash_sale_active ? 'Live' : 'Scheduled / Inactive'}
                  </Badge>
                </div>

                <div className="flex gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 md:flex-none"
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(product)}
                    disabled={removeMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-100 disabled:opacity-60 md:flex-none"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => !saveMutation.isPending && setShowModal(false)}
        title={editProduct ? 'Edit Flash Sale' : 'Create Flash Sale'}
        size="lg"
      >
        <FlashSaleForm
          items={saleItems}
          saleProduct={editProduct}
          onClose={() => setShowModal(false)}
          onSave={(product, form) => saveMutation.mutate({ product, form })}
          saving={saveMutation.isPending}
        />
      </Modal>
    </div>
  )
}
