import { Link } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'

export default function HeaderActionIcons({ size = 'sm' }) {
  const cartItems = useCartStore((s) => s.items)
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const dimension = size === 'md' ? 'h-10 w-10' : 'h-9 w-9'

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        to="/wishlist"
        aria-label="Wishlist"
        className={`relative flex ${dimension} shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition active:scale-90`}
      >
        <Heart size={size === 'md' ? 20 : 19} />
        {wishlistCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-0.5 text-[9px] font-black text-white ring-[1.5px] ring-white">
            {wishlistCount > 9 ? '9+' : wishlistCount}
          </span>
        )}
      </Link>
      <Link
        to="/cart"
        aria-label="Cart"
        className={`relative flex ${dimension} shrink-0 items-center justify-center rounded-full bg-pink-600 text-white shadow-sm shadow-pink-200 transition active:scale-90`}
      >
        <ShoppingCart size={size === 'md' ? 19 : 18} />
        {totalItems > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-0.5 text-[9px] font-black text-white ring-[1.5px] ring-white">
            {totalItems > 9 ? '9+' : totalItems}
          </span>
        )}
      </Link>
    </div>
  )
}
