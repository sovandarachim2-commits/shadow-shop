import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { Search, Plus, Minus, Trash2, ShoppingCart, Save, Send, X, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '@/components/shared/PageHeader'
import { productsApi } from '@/api/products'
import { ordersApi } from '@/api/orders'
import { formatCurrency, debounce } from '@/utils/helpers'

export default function NewOrder({ embedded = false, onCreated }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [cartItems, setCartItems] = useState([])
  const [customerInfo, setCustomerInfo] = useState({
    name: '', phone: '', address: '', province: 'phnom_penh', notes: ''
  })
  const [delivery_fee, setDeliveryFee] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [payment_status, setPaymentStatus] = useState('unpaid')
  const [payment_method, setPaymentMethod] = useState('cod')

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
    if (cartItems.length === 0) {
      toast.error('Add at least one product')
      return
    }

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
      customer_info: customerInfo,
    }

    ordersApi.customers.create(customerInfo).then((res) => {
      createOrderMutation.mutate({ ...payload, customer: res.data.id })
    }).catch(() => {
      toast.error('Failed to save customer info')
    })
  }

  const PROVINCES = [
    { value: 'phnom_penh', label: 'Phnom Penh' },
    { value: 'siem_reap', label: 'Siem Reap' },
    { value: 'battambang', label: 'Battambang' },
    { value: 'kampong_cham', label: 'Kampong Cham' },
    { value: 'kandal', label: 'Kandal' },
    { value: 'takeo', label: 'Takeo' },
    { value: 'prey_veng', label: 'Prey Veng' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className={embedded ? '' : 'animate-fade-in'}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Customer Name *</label>
                <input className="input-field" placeholder="Enter name" value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input className="input-field" placeholder="e.g. 085xxxxxxx" value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
                {existingCustomers?.length > 0 && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-xl shadow-soft divide-y">
                    {existingCustomers.map((c) => (
                      <button key={c.id} onClick={() => handleSelectCustomer(c)}
                        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-50 text-sm">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-400">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2">
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
          <div className="form-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Select Products</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-8 py-1.5 text-sm w-56" placeholder="Search products..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
              {(products || []).map((product) => (
                <button key={product.id} onClick={() => addToCart(product)}
                  className="text-left bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl p-3 transition-all group">
                  <div className="aspect-square bg-gray-200 rounded-lg mb-2 overflow-hidden">
                    {product.primary_image ? (
                      <img src={product.primary_image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={20} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.code}</p>
                  <p className="text-xs font-bold text-purple-600 mt-1">{formatCurrency(product.wholesale_price)}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">Stock: {product.current_stock}</span>
                    <Plus size={14} className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
              {loadingProducts && (
                <div className="col-span-3 py-8 text-center text-gray-400 text-sm">Loading products...</div>
              )}
            </div>
          </div>

          {/* Cart Items */}
          {cartItems.length > 0 && (
            <div className="form-card">
              <h2 className="section-title mb-4">Order Items ({cartItems.length})</h2>
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 overflow-hidden shrink-0">
                      {item.product.primary_image ? (
                        <img src={item.product.primary_image} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={16} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{item.product.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100">
                        <Minus size={12} />
                      </button>
                      <input type="number" value={item.quantity} min={1}
                        onChange={(e) => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-12 text-center text-sm font-semibold bg-white border border-gray-200 rounded-lg py-1" />
                      <button onClick={() => updateQty(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="text-right">
                      <input type="number" value={item.unit_price} step="0.01"
                        onChange={(e) => updatePrice(item.product.id, e.target.value)}
                        className="w-24 text-right text-sm font-semibold bg-white border border-gray-200 rounded-lg px-2 py-1" />
                      <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.unit_price * item.quantity)}</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2 space-y-4">
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
