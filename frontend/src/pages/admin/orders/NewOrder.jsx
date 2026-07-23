import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, Plus, Minus, Trash2, Save, Send, Package, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { productsApi } from '@/api/products'
import { ordersApi } from '@/api/orders'
import { formatCurrency } from '@/utils/helpers'
import { isValidCambodiaPhone, normalizeCambodiaPhone } from '@/utils/phone'
import { CAMBODIA_PROVINCES } from '@/utils/cambodiaProvinces'

export default function NewOrder({ embedded = false, onCreated }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [cartItems, setCartItems] = useState([])
  const [customerInfo, setCustomerInfo] = useState({
    name: '', phone: '', address: '', province: 'phnom_penh', notes: ''
  })
  const [delivery_fee, setDeliveryFee] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [payment_status, setPaymentStatus] = useState('unpaid')
  const [payment_method, setPaymentMethod] = useState('cod')
  const [stockAlert, setStockAlert] = useState(null)

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-search', searchQuery],
    queryFn: () => productsApi.products.list({
      search: searchQuery,
      page_size: 20,
      is_active: true,
    }).then((r) => r.data.results),
    enabled: true,
  })

  const { data: existingCustomers } = useQuery({
    queryKey: ['customers-search', customerInfo.phone],
    queryFn: () => ordersApi.customers.list({ search: customerInfo.phone, page_size: 5 }).then((r) => r.data.results),
    enabled: customerInfo.phone.length >= 6,
  })

  const createOrderMutation = useMutation({
    mutationFn: ordersApi.orders.create,
    onSuccess: (data) => {
      toast.success('Order created successfully!')
      if (onCreated) {
        onCreated(data.data)
      } else {
        navigate(`/admin/orders/${data.data.id}`)
      }
    },
    onError: () => toast.error('Failed to create order'),
  })

  const addToCart = (product) => {
    setCartItems((prev) => {
      const exists = prev.find((i) => i.product.id === product.id)
      if (exists) {
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1, unit_price: product.wholesale_price, discount: 0 }]
    })
  }

  const selectProductFromSearch = (product) => {
    addToCart(product)
    setSearchQuery('')
    setShowProductSearch(false)
  }

  const updateQty = (productId, qty) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.product.id !== productId))
      return
    }
    setCartItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i))
  }

  const updatePrice = (productId, price) => {
    setCartItems((prev) => prev.map((i) => i.product.id === productId ? { ...i, unit_price: parseFloat(price) || 0 } : i))
  }

  const removeItem = (productId) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  const subtotal = cartItems.reduce((sum, i) => sum + (i.unit_price * i.quantity) - (i.discount || 0), 0)
  const grandTotal = subtotal + parseFloat(delivery_fee || 0) - parseFloat(discount || 0)

  const handleSelectCustomer = (customer) => {
    setCustomerInfo({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      province: customer.province,
      notes: customer.notes || '',
    })
  }

  const handleSubmit = (isDraft = false) => {
    if (!customerInfo.name || !customerInfo.phone) {
      toast.error('Customer name and phone are required')
      return
    }
    const phone = normalizeCambodiaPhone(customerInfo.phone)
    if (!isValidCambodiaPhone(phone)) {
      toast.error('Enter a Cambodia phone number starting with 0 (9–10 digits)')
      return
    }
    if (cartItems.length === 0) {
      toast.error('Add at least one product')
      return
    }
    const overStockItem = cartItems.find((i) => Number(i.quantity || 0) > Number(i.product.current_stock || 0))
    if (overStockItem) {
      setStockAlert({
        name: overStockItem.product.name,
        available: Number(overStockItem.product.current_stock || 0),
        requested: Number(overStockItem.quantity || 0),
      })
      return
    }

    const customerPayload = { ...customerInfo, phone }

    const payload = {
      customer: null,
      payment_status,
      payment_method,
      delivery_fee: parseFloat(delivery_fee || 0),
      discount: parseFloat(discount || 0),
      notes: customerInfo.notes,
      is_draft: isDraft,
      items: cartItems.map((i) => ({
        product: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        cost_price: i.product.cost_price,
        discount: i.discount || 0,
      })),
      customer_info: customerPayload,
    }

    ordersApi.customers.create(customerPayload).then((res) => {
      createOrderMutation.mutate({ ...payload, customer: res.data.id })
    }).catch(() => {
      toast.error('Failed to save customer info')
    })
  }

  const PROVINCES = CAMBODIA_PROVINCES.map((p) => ({ value: p.key, label: p.label }))

  return (
    <div className={embedded ? '' : 'animate-fade-in'}>
      {stockAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[1px]">
          <div className="relative w-full max-w-xl rounded-xl bg-white px-6 py-9 text-center shadow-2xl sm:px-10">
            <button
              type="button"
              onClick={() => setStockAlert(null)}
              className="absolute right-4 top-4 text-gray-300 transition-colors hover:text-gray-500"
              aria-label="Close stock alert"
            >
              <X size={28} />
            </button>

            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-orange-200 text-5xl font-black text-orange-300">
              !!
            </div>
            <h2 className="mt-8 text-3xl font-bold text-gray-600">Stock Alert <span className="text-2xl">⚠️</span></h2>
            <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-gray-600">
              {stockAlert.name} has only {stockAlert.available} in stock. Requested quantity is {stockAlert.requested}.
            </p>
          </div>
        </div>
      )}

      {!embedded && (
        <PageHeader
          title="Create New Order"
          breadcrumbs={[{ label: 'Sales', path: '/admin/orders' }, { label: 'New Order' }]}
        />
      )}

      <div className={`grid gap-6 ${embedded ? 'p-5 lg:grid-cols-5' : 'lg:grid-cols-5'}`}>
        {/* Left: Customer + Products */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Info */}
          <div className="form-card">
            <h2 className="section-title mb-4">Customer Information</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="label">Customer Name *</label>
                <input className="input-field" placeholder="Enter name" value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input
                  className="input-field"
                  placeholder="077322921"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: normalizeCambodiaPhone(e.target.value) })}
                />
                {existingCustomers?.length > 0 && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-soft divide-y">
                    {existingCustomers.map((c) => (
                      <button key={c.id} onClick={() => handleSelectCustomer({
                        ...c,
                        phone: normalizeCambodiaPhone(c.phone),
                      })}
                        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-50 text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400">{normalizeCambodiaPhone(c.phone)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="label">Address</label>
                <textarea className="input-field resize-none" rows={2} placeholder="Delivery address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} />
              </div>
              <div>
                <label className="label">Province</label>
                <select className="select-field" value={customerInfo.province}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, province: e.target.value })}>
                  {PROVINCES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input-field" placeholder="Special instructions" value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div className="form-card overflow-hidden">
            <div className="mb-4 space-y-3">
              <div>
                <h2 className="section-title">Select Products</h2>
                <p className="mt-1 text-sm text-gray-500">Search product name or code, then choose from the list.</p>
              </div>
              <div className="relative w-full">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base font-medium text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                  placeholder="Search or select product..."
                  value={searchQuery}
                  onFocus={() => setShowProductSearch(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowProductSearch(true)
                  }}
                />
                {showProductSearch && searchQuery.trim() && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-20 cursor-default"
                      onClick={() => setShowProductSearch(false)}
                      aria-label="Close product search"
                    />
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-emerald-200 bg-emerald-500 p-3 shadow-xl">
                      {loadingProducts && (
                        <div className="rounded-xl bg-white px-3 py-5 text-center text-sm font-medium text-gray-400">Searching products...</div>
                      )}
                      {!loadingProducts && (products || []).length === 0 && (
                        <div className="rounded-xl bg-white px-3 py-5 text-center text-sm font-medium text-gray-400">No products found</div>
                      )}
                      {!loadingProducts && (products || []).map((product) => {
                        const stock = Number(product.current_stock || 0)
                        const isOutOfStock = stock <= 0

                        return (
                          <button
                            key={product.id}
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => selectProductFromSearch(product)}
                            className="flex w-full items-center gap-4 rounded-xl bg-white px-4 py-4 text-left transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-purple-100 bg-gray-100">
                              {product.primary_image ? (
                                <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package size={24} className="text-gray-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-gray-800">{product.name}</p>
                              <p className="mt-1 hidden truncate text-sm text-gray-400 sm:block">{product.code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-purple-600">{formatCurrency(product.wholesale_price)}</p>
                              <p className={`hidden text-xs font-semibold sm:block ${isOutOfStock ? 'text-red-500' : 'text-gray-400'}`}>
                                {isOutOfStock ? 'Out' : `Stock ${stock}`}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="max-h-[30rem] overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/60 p-2">
              <div className="space-y-2">
                {(products || []).map((product) => {
                  const selectedQty = cartItems.find((i) => i.product.id === product.id)?.quantity || 0
                  const stock = Number(product.current_stock || 0)
                  const isOutOfStock = stock <= 0

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => !isOutOfStock && addToCart(product)}
                      disabled={isOutOfStock}
                      className={`group flex w-full items-center gap-3 rounded-2xl border bg-white p-2 text-left shadow-sm transition-all ${
                        selectedQty
                          ? 'border-purple-300 ring-2 ring-purple-100'
                          : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                      } ${isOutOfStock ? 'cursor-not-allowed opacity-60' : 'active:scale-[0.99]'}`}
                    >
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 sm:h-20 sm:w-20">
                        {product.primary_image ? (
                          <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package size={24} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-950 sm:text-base">{product.name}</p>
                            <p className="mt-0.5 hidden truncate text-xs font-medium text-gray-400 sm:block">{product.code}</p>
                          </div>
                          {selectedQty > 0 && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-purple-600 px-2.5 py-1 text-xs font-bold text-white">
                              <Check size={12} />
                              {selectedQty}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_auto_auto]">
                          <p className="text-sm font-black text-purple-600">{formatCurrency(product.wholesale_price)}</p>
                          <p className={`hidden text-xs font-semibold sm:block sm:text-right ${isOutOfStock ? 'text-red-500' : 'text-gray-400'}`}>
                            {isOutOfStock ? 'Out of stock' : `Stock: ${stock}`}
                          </p>
                          <span className={`ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                            selectedQty ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                          }`}>
                            <Plus size={17} />
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {loadingProducts && (
                <div className="py-10 text-center text-sm font-medium text-gray-400">Loading products...</div>
              )}
              {!loadingProducts && (products || []).length === 0 && (
                <div className="py-10 text-center">
                  <Package size={28} className="mx-auto text-gray-300" />
                  <p className="mt-2 text-sm font-semibold text-gray-500">No products found</p>
                  <p className="text-xs text-gray-400">Try another name, SKU, or product code.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right: Order Items + Summary */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.length > 0 && (
            <div className="form-card">
              <h2 className="section-title mb-4">Order Items ({cartItems.length})</h2>
              <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        {item.product.primary_image ? (
                          <img src={item.product.primary_image} alt={item.product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package size={16} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{item.product.name}</p>
                        <p className="hidden text-xs text-gray-400 sm:block">{item.product.code}</p>
                      </div>
                      <button onClick={() => removeItem(item.product.id)} className="shrink-0 p-1 text-red-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100">
                          <Minus size={12} />
                        </button>
                        <input type="number" value={item.quantity} min={1}
                          onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                          className="w-14 rounded-lg border border-gray-200 bg-white py-1.5 text-center text-sm font-semibold" />
                        <button onClick={() => updateQty(item.product.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100">
                          <Plus size={12} />
                        </button>
                      </div>
                      <div className="text-right">
                        <input type="number" value={item.unit_price} step="0.01"
                          onChange={(e) => updatePrice(item.product.id, e.target.value)}
                          className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-sm font-semibold" />
                        <p className="mt-0.5 text-xs text-gray-400">{formatCurrency(item.unit_price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-card sticky top-20">
            <h2 className="section-title mb-4">Order Summary</h2>

            <div className="space-y-3 pb-4 border-b border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal ({cartItems.length} items)</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Delivery Fee</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={delivery_fee} onChange={(e) => setDeliveryFee(e.target.value)}
                    className="w-24 text-right pl-5 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Discount</span>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 text-right pl-5 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50" />
                </div>
              </div>
            </div>

            <div className="flex justify-between py-4 font-bold text-lg border-b border-gray-100">
              <span>Grand Total</span>
              <span className="text-purple-600">{formatCurrency(grandTotal)}</span>
            </div>

            {/* Payment */}
            <div className="py-4 space-y-3 border-b border-gray-100">
              <div>
                <label className="label">Payment Status</label>
                <div className="flex gap-2">
                  {['paid', 'unpaid'].map((s) => (
                    <button key={s} onClick={() => setPaymentStatus(s)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize ${
                        payment_status === s
                          ? s === 'paid' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {payment_status === 'paid' && (
                <div>
                  <label className="label">Payment Method</label>
                  <select className="select-field" value={payment_method} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="aba">ABA Bank</option>
                    <option value="bakong">Bakong KHQR</option>
                    <option value="acleda">ACLEDA Bank</option>
                    <option value="wing">Wing</option>
                    <option value="cod">Cash on Delivery</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 space-y-2">
              <button onClick={() => handleSubmit(false)}
                disabled={createOrderMutation.isPending}
                className="btn-primary w-full justify-center py-3">
                <Send size={16} />
                {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
              </button>
              <button onClick={() => handleSubmit(true)}
                disabled={createOrderMutation.isPending}
                className="btn-secondary w-full justify-center py-3">
                <Save size={16} /> Save as Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
