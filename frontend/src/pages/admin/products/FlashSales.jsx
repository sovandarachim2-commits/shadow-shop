import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Flame, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Table, Thead, Th, Tbody, Tr, Td, LoadingRows, EmptyState } from '@/components/ui/Table'
import { productsApi } from '@/api/products'
import { getListResults } from '@/utils/apiData'
import { formatCurrency, formatDateTime } from '@/utils/helpers'

function toDatetimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function flashSaleScheduleLabel(product) {
  if (!product.is_featured) return { label: 'Inactive', variant: 'default' }
  if (product.is_flash_sale_active) return { label: 'Live', variant: 'danger' }
  const endMs = product.flash_sale_ends_at ? new Date(product.flash_sale_ends_at).getTime() : null
  if (Number.isFinite(endMs) && endMs < Date.now()) return { label: 'Ended', variant: 'warning' }
  return { label: 'Scheduled', variant: 'info' }
}

function FlashSaleForm({ items, saleProduct, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    product: saleProduct ? `${saleProduct._saleType}:${saleProduct.id}` : '',
    flash_sale_price: saleProduct?.flash_sale_price || '',
    flash_sale_max_order_qty: saleProduct?.flash_sale_max_order_qty || '',
    flash_sale_starts_at: toDatetimeLocal(saleProduct?.flash_sale_starts_at),
    flash_sale_ends_at: toDatetimeLocal(saleProduct?.flash_sale_ends_at),
    status: saleProduct?.is_featured === false ? 'inactive' : 'active',
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

      <div>
        <label className="label">Status</label>
        <select
          value={form.status}
          onChange={(event) => set('status', event.target.value)}
          disabled={saving}
          className="select-field"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <p className="mt-1 text-xs font-semibold text-gray-400">
          Inactive keeps the price and schedule, and hides this sale from customers.
        </p>
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
  })

  const { data: allSets = [], isLoading: setsLoading } = useQuery({
    queryKey: ['flash-sale-product-sets'],
    queryFn: () => productsApi.sets.list({ page_size: 200, is_active: true }).then((r) => getListResults(r.data)),
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

  const updateSaleListImmediately = (saleType, id, changes) => {
    const queryKey = saleType === 'set' ? ['flash-sale-product-sets'] : ['flash-sale-products']
    queryClient.setQueryData(queryKey, (current = []) =>
      current.map((item) => item.id === id ? { ...item, ...changes } : item),
    )
  }

  const saveMutation = useMutation({
    mutationFn: ({ product, form }) => productsApi[product._saleType === 'set' ? 'sets' : 'products'].update(product.id, {
      is_featured: form.status !== 'inactive',
      flash_sale_price: Number(form.flash_sale_price),
      flash_sale_max_order_qty: form.flash_sale_max_order_qty ? Number(form.flash_sale_max_order_qty) : null,
      flash_sale_starts_at: form.flash_sale_starts_at || null,
      flash_sale_ends_at: form.flash_sale_ends_at || null,
    }),
    onSuccess: (response, { product, form }) => {
      updateSaleListImmediately(product._saleType, product.id, {
        ...response.data,
        is_featured: form.status !== 'inactive',
        flash_sale_price: Number(form.flash_sale_price),
        flash_sale_max_order_qty: form.flash_sale_max_order_qty ? Number(form.flash_sale_max_order_qty) : null,
        flash_sale_starts_at: form.flash_sale_starts_at || null,
        flash_sale_ends_at: form.flash_sale_ends_at || null,
      })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-products'] })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-product-sets'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['home-feed'] })
      queryClient.invalidateQueries({ queryKey: ['home-flash-sale-fallback'] })
      setShowModal(false)
      setEditProduct(null)
      toast.success('Flash sale saved')
    },
    onError: () => toast.error('Failed to save flash sale'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ product, status }) => productsApi[product._saleType === 'set' ? 'sets' : 'products'].update(product.id, {
      is_featured: status === 'active',
    }),
    onSuccess: (_, { product, status }) => {
      updateSaleListImmediately(product._saleType, product.id, { is_featured: status === 'active' })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-products'] })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-product-sets'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['home-feed'] })
      queryClient.invalidateQueries({ queryKey: ['home-flash-sale-fallback'] })
      toast.success('Flash sale status updated')
    },
    onError: () => toast.error('Failed to update flash sale status'),
  })

  const removeMutation = useMutation({
    mutationFn: (product) => productsApi[product._saleType === 'set' ? 'sets' : 'products'].update(product.id, {
      is_featured: false,
      flash_sale_price: null,
      flash_sale_max_order_qty: null,
      flash_sale_starts_at: null,
      flash_sale_ends_at: null,
    }),
    onSuccess: (_, product) => {
      updateSaleListImmediately(product._saleType, product.id, {
        is_featured: false,
        flash_sale_price: null,
        flash_sale_max_order_qty: null,
        flash_sale_starts_at: null,
        flash_sale_ends_at: null,
      })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-products'] })
      queryClient.invalidateQueries({ queryKey: ['flash-sale-product-sets'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['home-feed'] })
      queryClient.invalidateQueries({ queryKey: ['home-flash-sale-fallback'] })
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

        <Table>
          <Thead>
            <tr>
              <Th>No</Th>
              <Th>Product</Th>
              <Th>Retail</Th>
              <Th>Flash Price</Th>
              <Th>Max Qty</Th>
              <Th>Orders</Th>
              <Th>Schedule</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {(isLoading || setsLoading) && <LoadingRows cols={9} />}
            {!isLoading && !setsLoading && flashProducts.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <EmptyState message="No flash sale products or sets" icon={Flame} />
                  <div className="pb-8 text-center">
                    <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
                      <Plus size={15} /> Create Flash Sale
                    </button>
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && !setsLoading && flashProducts.map((product, index) => {
              const schedule = flashSaleScheduleLabel(product)
              return (
                <Tr key={`${product._saleType}-${product.id}`}>
                  <Td><span className="text-sm font-semibold text-gray-500">{index + 1}</span></Td>
                  <Td>
                    <div className="flex min-w-[220px] items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100">
                        {product.primary_image ? (
                          <img src={product.primary_image} alt="" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Flame size={18} className="text-pink-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                          <span>{product.code}</span>
                          {product._saleType === 'set' && <Badge variant="info">Set</Badge>}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td><span className="text-sm text-gray-400 line-through">{formatCurrency(product.retail_price)}</span></Td>
                  <Td><span className="text-sm font-semibold text-pink-600">{formatCurrency(product.flash_sale_price)}</span></Td>
                  <Td><span className="text-sm font-semibold text-gray-800">{product.flash_sale_max_order_qty || 'No limit'}</span></Td>
                  <Td>
                    <p className="text-sm font-semibold text-gray-900">{product._saleType === 'set' ? '—' : product.flash_sale_order_count || 0}</p>
                    <p className="text-[11px] text-gray-400">{product._saleType === 'set' ? 'Set' : `${product.flash_sale_quantity_sold || 0} qty`}</p>
                  </Td>
                  <Td>
                    <p className="whitespace-nowrap text-xs text-gray-600">{product.flash_sale_starts_at ? formatDateTime(product.flash_sale_starts_at) : 'Starts now'}</p>
                    <p className="mt-0.5 whitespace-nowrap text-xs text-gray-400">{product.flash_sale_ends_at ? formatDateTime(product.flash_sale_ends_at) : 'No end date'}</p>
                  </Td>
                  <Td>
                    <div className="flex min-w-[140px] flex-col items-start gap-1.5">
                      <select
                        value={product.is_featured ? 'active' : 'inactive'}
                        disabled={statusMutation.isPending}
                        onChange={(event) => statusMutation.mutate({ product, status: event.target.value })}
                        className="h-9 w-full rounded-xl border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 outline-none focus:border-pink-300 disabled:opacity-60"
                        aria-label={`Status for ${product.name}`}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <Badge variant={schedule.variant}>{schedule.label}</Badge>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(product)} title="Edit" className="rounded-lg p-1.5 text-blue-500 transition-colors hover:bg-blue-50">
                        <Edit size={14} />
                      </button>
                      <button type="button" onClick={() => handleRemove(product)} disabled={removeMutation.isPending} title="Remove" className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-60">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
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
