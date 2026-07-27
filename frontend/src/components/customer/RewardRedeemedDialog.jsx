import { Copy, Gift, ShoppingCart, Ticket, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'

export default function RewardRedeemedDialog({ redemption, onClose }) {
  const navigate = useNavigate()
  const applyCoupon = useCartStore((state) => state.applyCoupon)

  if (!redemption?.coupon_code) return null

  const applyAndGo = () => {
    applyCoupon({
      coupon_code: redemption.coupon_code,
      name: redemption.reward_name,
      reward_type: redemption.reward_type,
      discount_type: redemption.coupon_discount_type,
      coupon_value: redemption.coupon_value,
      minimum_order_amount: redemption.minimum_order_amount,
    })
    toast.success(`Coupon ${redemption.coupon_code} applied`)
    navigate('/cart')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(redemption.coupon_code)
      toast.success('Coupon copied')
    } catch {
      toast.error('Could not copy coupon')
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/45 px-4 backdrop-blur-[2px]">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close reward result" />
      <section className="relative w-full max-w-[360px] overflow-hidden rounded-3xl bg-white p-5 text-center shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-500">
          <X size={18} />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <Gift size={30} />
        </div>
        <h2 className="mt-4 text-xl font-black text-gray-950">Redeemed!</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-gray-500">
          Your coupon is ready. Use it now or save it in My Coupons.
        </p>

        <div className="mt-5 rounded-2xl border border-pink-100 bg-pink-50/60 p-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-pink-500">Coupon code</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-3 shadow-sm">
            <Ticket size={18} className="shrink-0 text-pink-500" />
            <span className="min-w-0 flex-1 truncate font-mono text-base font-black text-gray-950">{redemption.coupon_code}</span>
            <button type="button" onClick={copyCode} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
              <Copy size={15} />
            </button>
          </div>
        </div>

        <button type="button" onClick={applyAndGo} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-pink-600 text-sm font-black text-white shadow-lg shadow-pink-100 active:scale-[0.98]">
          <ShoppingCart size={18} /> Use Now
        </button>
        <button type="button" onClick={() => navigate('/profile/rewards/coupons')} className="mt-3 h-11 w-full rounded-xl bg-gray-50 text-sm font-black text-gray-600">
          My Coupons
        </button>
      </section>
    </div>
  )
}
